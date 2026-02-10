package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/snakes-and-ladders/go-backend/internal/game"
	"github.com/snakes-and-ladders/go-backend/internal/hub"
	"github.com/snakes-and-ladders/go-backend/internal/message"
)

// PollConnection represents a long-polling client connection.
type PollConnection struct {
	ID           string
	GameCode     string
	PlayerID     string
	LastPollTime time.Time
	CreatedAt    time.Time
}

// PollStore provides thread-safe in-memory storage for poll connections.
type PollStore struct {
	mu    sync.RWMutex
	conns map[string]*PollConnection
}

// NewPollStore creates a new PollStore.
func NewPollStore() *PollStore {
	return &PollStore{
		conns: make(map[string]*PollConnection),
	}
}

// Add adds a connection to the store.
func (s *PollStore) Add(conn *PollConnection) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.conns[conn.ID] = conn
}

// Get retrieves a connection by ID.
func (s *PollStore) Get(id string) *PollConnection {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.conns[id]
}

// Delete removes a connection from the store.
func (s *PollStore) Delete(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.conns, id)
}

// UpdateLastPoll refreshes the last poll time for a connection.
func (s *PollStore) UpdateLastPoll(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if conn, ok := s.conns[id]; ok {
		conn.LastPollTime = time.Now()
	}
}

// UpdateGame links a connection to a game and player.
func (s *PollStore) UpdateGame(id, gameCode, playerID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if conn, ok := s.conns[id]; ok {
		conn.GameCode = gameCode
		conn.PlayerID = playerID
	}
}

// CleanupStale removes connections inactive longer than maxInactivity and returns them.
func (s *PollStore) CleanupStale(maxInactivity time.Duration) []*PollConnection {
	s.mu.Lock()
	defer s.mu.Unlock()

	cutoff := time.Now().Add(-maxInactivity)
	var removed []*PollConnection

	for id, conn := range s.conns {
		if conn.LastPollTime.Before(cutoff) {
			removed = append(removed, conn)
			delete(s.conns, id)
		}
	}

	return removed
}

// PollHandler handles long-polling HTTP endpoints.
type PollHandler struct {
	store     *game.Store
	hub       *hub.Hub
	pollStore *PollStore
}

// NewPollHandler creates a new PollHandler.
func NewPollHandler(store *game.Store, h *hub.Hub) *PollHandler {
	return &PollHandler{
		store:     store,
		hub:       h,
		pollStore: NewPollStore(),
	}
}

// HandleConnect handles POST /poll/connect — creates a new poll connection.
func (h *PollHandler) HandleConnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := generatePollID()
	now := time.Now()
	conn := &PollConnection{
		ID:           id,
		LastPollTime: now,
		CreatedAt:    now,
	}
	h.pollStore.Add(conn)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"connectionId": id})
}

// HandleMessages handles GET /poll/messages — returns current game state snapshot.
func (h *PollHandler) HandleMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	connID := r.Header.Get("X-Connection-Id")
	if connID == "" {
		h.writeError(w, http.StatusBadRequest, message.ErrInvalidMessage, "X-Connection-Id header is required")
		return
	}

	conn := h.pollStore.Get(connID)
	if conn == nil {
		h.writeError(w, http.StatusNotFound, message.ErrInvalidMessage, "Connection not found")
		return
	}

	h.pollStore.UpdateLastPoll(connID)

	if conn.GameCode == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"messages": []interface{}{}})
		return
	}

	g := h.store.Get(conn.GameCode)
	if g == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"messages": []interface{}{}})
		return
	}

	players := g.GetPlayers()
	playerInfos := make([]message.PlayerInfo, len(players))
	for i, p := range players {
		playerInfos[i] = playerToInfo(p, conn.GameCode)
	}

	gameState := message.GameStateMessage{
		Type:          message.TypeGameState,
		Game:          gameToInfo(g),
		Players:       playerInfos,
		CurrentTurnID: g.GetCurrentTurnPlayerID(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"messages": []interface{}{gameState}})
}

// HandleSend handles POST /poll/send — processes a client message.
func (h *PollHandler) HandleSend(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	connID := r.Header.Get("X-Connection-Id")
	if connID == "" {
		h.writeError(w, http.StatusBadRequest, message.ErrInvalidMessage, "X-Connection-Id header is required")
		return
	}

	conn := h.pollStore.Get(connID)
	if conn == nil {
		h.writeError(w, http.StatusNotFound, message.ErrInvalidMessage, "Connection not found")
		return
	}

	h.pollStore.UpdateLastPoll(connID)

	var msg message.ClientMessage
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		h.writeError(w, http.StatusBadRequest, message.ErrInvalidMessage, "Invalid message format")
		return
	}

	switch msg.Action {
	case message.ActionJoinGame:
		h.handlePollJoinGame(w, conn, msg)
	case message.ActionRejoinGame:
		h.handlePollRejoinGame(w, conn, msg)
	case message.ActionRollDice:
		h.handlePollRollDice(w, conn)
	case message.ActionStartGame:
		h.handlePollStartGame(w, conn)
	case message.ActionPing:
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"type": "pong"})
	default:
		h.writeError(w, http.StatusBadRequest, message.ErrInvalidMessage, "Unknown action: "+msg.Action)
	}
}

// HandleDisconnect handles POST /poll/disconnect — cleans up a poll connection.
func (h *PollHandler) HandleDisconnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	connID := r.Header.Get("X-Connection-Id")
	if connID != "" {
		conn := h.pollStore.Get(connID)
		if conn != nil && conn.GameCode != "" && conn.PlayerID != "" {
			h.disconnectPlayer(conn)
		}
		h.pollStore.Delete(connID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// StartCleanup runs a periodic cleanup goroutine for stale poll connections.
func (h *PollHandler) StartCleanup(interval, maxInactivity time.Duration, stop <-chan struct{}) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			removed := h.pollStore.CleanupStale(maxInactivity)
			for _, conn := range removed {
				if conn.GameCode != "" && conn.PlayerID != "" {
					h.disconnectPlayer(conn)
				}
			}
			if len(removed) > 0 {
				log.Printf("Cleaned up %d stale poll connections", len(removed))
			}
		case <-stop:
			return
		}
	}
}

func (h *PollHandler) handlePollJoinGame(w http.ResponseWriter, conn *PollConnection, msg message.ClientMessage) {
	code := strings.ToUpper(msg.GameCode)
	g := h.store.Get(code)
	if g == nil {
		h.writeError(w, http.StatusOK, message.ErrGameNotFound, "Game not found")
		return
	}

	player, err := g.AddPlayer(msg.Name)
	if err != nil {
		switch err {
		case game.ErrGameFull:
			h.writeError(w, http.StatusOK, message.ErrGameFull, "Game is full")
		case game.ErrGameAlreadyStarted:
			h.writeError(w, http.StatusOK, message.ErrGameAlreadyStarted, "Game has already started")
		case game.ErrInvalidName:
			h.writeError(w, http.StatusOK, message.ErrInvalidMessage, "Player name is required")
		default:
			h.writeError(w, http.StatusOK, message.ErrInternalError, "Failed to join game")
		}
		return
	}

	h.pollStore.UpdateGame(conn.ID, code, player.ID)

	// Broadcast playerJoined to WebSocket clients
	playerJoinedMsg := message.PlayerJoinedMessage{
		Type:   message.TypePlayerJoined,
		Player: playerToInfo(player, code),
	}
	h.hub.BroadcastToGame(code, playerJoinedMsg)

	// Send joinedGame response to the poll client
	players := g.GetPlayers()
	playerInfos := make([]message.PlayerInfo, len(players))
	for i, p := range players {
		playerInfos[i] = playerToInfo(p, code)
	}

	joinedMsg := message.JoinedGameMessage{
		Type:     message.TypeJoinedGame,
		PlayerID: player.ID,
		Game:     gameToInfo(g),
		Players:  playerInfos,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(joinedMsg)
}

func (h *PollHandler) handlePollRejoinGame(w http.ResponseWriter, conn *PollConnection, msg message.ClientMessage) {
	code := strings.ToUpper(msg.GameCode)
	g := h.store.Get(code)
	if g == nil {
		h.writeError(w, http.StatusOK, message.ErrGameNotFound, "Game not found")
		return
	}

	player := g.GetPlayer(msg.PlayerID)
	if player == nil {
		h.writeError(w, http.StatusOK, message.ErrPlayerNotFound, "Player not found in game")
		return
	}

	g.SetPlayerConnected(msg.PlayerID, true)
	h.pollStore.UpdateGame(conn.ID, code, msg.PlayerID)

	players := g.GetPlayers()
	playerInfos := make([]message.PlayerInfo, len(players))
	for i, p := range players {
		playerInfos[i] = playerToInfo(p, code)
	}

	joinedMsg := message.JoinedGameMessage{
		Type:     message.TypeJoinedGame,
		PlayerID: msg.PlayerID,
		Game:     gameToInfo(g),
		Players:  playerInfos,
	}

	// Notify WebSocket clients that this player reconnected
	playerJoinedMsg := message.PlayerJoinedMessage{
		Type:   message.TypePlayerJoined,
		Player: playerToInfo(player, code),
	}
	h.hub.BroadcastToGame(code, playerJoinedMsg)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(joinedMsg)
}

func (h *PollHandler) handlePollRollDice(w http.ResponseWriter, conn *PollConnection) {
	if conn.GameCode == "" || conn.PlayerID == "" {
		h.writeError(w, http.StatusOK, message.ErrGameNotFound, "Not in a game")
		return
	}

	g := h.store.Get(conn.GameCode)
	if g == nil {
		h.writeError(w, http.StatusOK, message.ErrGameNotFound, "Game not found")
		return
	}

	player := g.GetPlayer(conn.PlayerID)
	if player == nil {
		h.writeError(w, http.StatusOK, message.ErrPlayerNotFound, "Player not found")
		return
	}

	diceRoll, prevPos, newPos, effect, isWinner, err := g.RollDice(conn.PlayerID)
	if err != nil {
		switch err {
		case game.ErrGameNotStarted:
			h.writeError(w, http.StatusOK, message.ErrGameNotStarted, "Game has not started")
		default:
			h.writeError(w, http.StatusOK, message.ErrInternalError, "Failed to roll dice")
		}
		return
	}

	var moveEffect *message.MoveEffect
	if effect != nil {
		moveEffect = &message.MoveEffect{
			Type: effect.Type,
			From: effect.From,
			To:   effect.To,
		}
	}

	moveMsg := message.PlayerMovedMessage{
		Type:             message.TypePlayerMoved,
		PlayerID:         conn.PlayerID,
		PlayerName:       player.Name,
		DiceRoll:         diceRoll,
		PreviousPosition: prevPos,
		NewPosition:      newPos,
		Effect:           moveEffect,
	}

	// Broadcast to WebSocket clients
	h.hub.BroadcastToGame(conn.GameCode, moveMsg)

	if isWinner {
		endMsg := message.GameEndedMessage{
			Type:       message.TypeGameEnded,
			WinnerID:   conn.PlayerID,
			WinnerName: player.Name,
		}
		h.hub.BroadcastToGame(conn.GameCode, endMsg)
	}

	// Send response to poll client
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(moveMsg)
}

func (h *PollHandler) handlePollStartGame(w http.ResponseWriter, conn *PollConnection) {
	if conn.GameCode == "" || conn.PlayerID == "" {
		h.writeError(w, http.StatusOK, message.ErrGameNotFound, "Not in a game")
		return
	}

	g := h.store.Get(conn.GameCode)
	if g == nil {
		h.writeError(w, http.StatusOK, message.ErrGameNotFound, "Game not found")
		return
	}

	err := g.Start(conn.PlayerID)
	if err != nil {
		switch err {
		case game.ErrGameAlreadyStarted:
			h.writeError(w, http.StatusOK, message.ErrGameAlreadyStarted, "Game has already started")
		case game.ErrNotGameCreator:
			h.writeError(w, http.StatusOK, message.ErrNotGameCreator, "Only the game creator can start the game")
		default:
			h.writeError(w, http.StatusOK, message.ErrInternalError, "Failed to start game")
		}
		return
	}

	startMsg := message.GameStartedMessage{
		Type:          message.TypeGameStarted,
		Game:          gameToInfo(g),
		FirstPlayerID: g.GetCurrentTurnPlayerID(),
	}

	// Broadcast to WebSocket clients
	h.hub.BroadcastToGame(conn.GameCode, startMsg)

	// Send response to poll client
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(startMsg)
}

// disconnectPlayer marks a player as disconnected and broadcasts PlayerLeft.
func (h *PollHandler) disconnectPlayer(conn *PollConnection) {
	g := h.store.Get(conn.GameCode)
	if g == nil {
		return
	}

	player := g.GetPlayer(conn.PlayerID)
	if player == nil {
		return
	}

	g.SetPlayerConnected(conn.PlayerID, false)

	leftMsg := message.PlayerLeftMessage{
		Type:       message.TypePlayerLeft,
		PlayerID:   conn.PlayerID,
		PlayerName: player.Name,
	}
	h.hub.BroadcastToGame(conn.GameCode, leftMsg)
}

func (h *PollHandler) writeError(w http.ResponseWriter, status int, code, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{Type: "error", Code: code, Message: msg})
}

// generatePollID creates a unique poll connection ID.
func generatePollID() string {
	bytes := make([]byte, 12)
	rand.Read(bytes)
	return "poll_" + hex.EncodeToString(bytes)
}
