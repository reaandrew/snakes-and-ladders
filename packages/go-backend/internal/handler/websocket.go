package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/snakes-and-ladders/go-backend/internal/config"
	"github.com/snakes-and-ladders/go-backend/internal/game"
	"github.com/snakes-and-ladders/go-backend/internal/hub"
	"github.com/snakes-and-ladders/go-backend/internal/message"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 4096
)

// WebSocketHandler handles WebSocket connections.
type WebSocketHandler struct {
	store    *game.Store
	hub      *hub.Hub
	upgrader websocket.Upgrader
}

// NewWebSocketHandler creates a new WebSocket handler.
func NewWebSocketHandler(store *game.Store, h *hub.Hub, cfg *config.Config) *WebSocketHandler {
	return &WebSocketHandler{
		store: store,
		hub:   h,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				origin := r.Header.Get("Origin")
				return cfg.IsOriginAllowed(origin)
			},
		},
	}
}

// ServeHTTP handles WebSocket upgrade requests.
func (h *WebSocketHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	clientID := generateClientID()
	client := &hub.Client{
		ID:   clientID,
		Conn: conn,
		Send: make(chan []byte, 256),
	}

	h.hub.Register(client)

	go h.writePump(client)
	go h.readPump(client)
}

func (h *WebSocketHandler) readPump(client *hub.Client) {
	defer func() {
		h.handleDisconnect(client)
		h.hub.Unregister(client)
		client.Conn.Close()
	}()

	client.Conn.SetReadLimit(maxMessageSize)
	client.Conn.SetReadDeadline(time.Now().Add(pongWait))
	client.Conn.SetPongHandler(func(string) error {
		client.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, data, err := client.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		h.handleMessage(client, data)
	}
}

func (h *WebSocketHandler) writePump(client *hub.Client) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		client.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.Send:
			client.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := client.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			client.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (h *WebSocketHandler) handleMessage(client *hub.Client, data []byte) {
	var msg message.ClientMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		h.sendError(client, message.ErrInvalidMessage, "Invalid message format")
		return
	}

	switch msg.Action {
	case message.ActionJoinGame:
		h.handleJoinGame(client, msg)
	case message.ActionRejoinGame:
		h.handleRejoinGame(client, msg)
	case message.ActionRollDice:
		h.handleRollDice(client, msg)
	case message.ActionStartGame:
		h.handleStartGame(client, msg)
	case message.ActionPing:
		h.hub.SendToClient(client, message.NewPongMessage())
	default:
		h.sendError(client, message.ErrInvalidMessage, "Unknown action: "+msg.Action)
	}
}

func (h *WebSocketHandler) handleJoinGame(client *hub.Client, msg message.ClientMessage) {
	code := strings.ToUpper(msg.GameCode)
	g := h.store.Get(code)
	if g == nil {
		h.sendError(client, message.ErrGameNotFound, "Game not found")
		return
	}

	player, err := g.AddPlayer(msg.Name)
	if err != nil {
		switch err {
		case game.ErrGameFull:
			h.sendError(client, message.ErrGameFull, "Game is full")
		case game.ErrGameAlreadyStarted:
			h.sendError(client, message.ErrGameAlreadyStarted, "Game has already started")
		case game.ErrInvalidName:
			h.sendError(client, message.ErrInvalidMessage, "Player name is required")
		default:
			h.sendError(client, message.ErrInternalError, "Failed to join game")
		}
		return
	}

	h.hub.JoinGame(client, code, player.ID)

	// Send joinedGame to the new player
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
	h.hub.SendToClient(client, joinedMsg)

	// Broadcast playerJoined to other players
	playerJoinedMsg := message.PlayerJoinedMessage{
		Type:   message.TypePlayerJoined,
		Player: playerToInfo(player, code),
	}
	h.hub.BroadcastToGameExcept(code, client.ID, playerJoinedMsg)
}

func (h *WebSocketHandler) handleRejoinGame(client *hub.Client, msg message.ClientMessage) {
	code := strings.ToUpper(msg.GameCode)
	g := h.store.Get(code)
	if g == nil {
		h.sendError(client, message.ErrGameNotFound, "Game not found")
		return
	}

	player := g.GetPlayer(msg.PlayerID)
	if player == nil {
		h.sendError(client, message.ErrPlayerNotFound, "Player not found in game")
		return
	}

	// Mark player as connected
	g.SetPlayerConnected(msg.PlayerID, true)
	h.hub.JoinGame(client, code, msg.PlayerID)

	// Send joinedGame message (same as join, so frontend handles it consistently)
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
	h.hub.SendToClient(client, joinedMsg)
}

func (h *WebSocketHandler) handleRollDice(client *hub.Client, msg message.ClientMessage) {
	code := strings.ToUpper(msg.GameCode)
	g := h.store.Get(code)
	if g == nil {
		h.sendError(client, message.ErrGameNotFound, "Game not found")
		return
	}

	player := g.GetPlayer(msg.PlayerID)
	if player == nil {
		h.sendError(client, message.ErrPlayerNotFound, "Player not found")
		return
	}

	diceRoll, prevPos, newPos, effect, isWinner, err := g.RollDice(msg.PlayerID)
	if err != nil {
		switch err {
		case game.ErrGameNotStarted:
			h.sendError(client, message.ErrGameNotStarted, "Game has not started")
		default:
			h.sendError(client, message.ErrInternalError, "Failed to roll dice")
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
		PlayerID:         msg.PlayerID,
		PlayerName:       player.Name,
		DiceRoll:         diceRoll,
		PreviousPosition: prevPos,
		NewPosition:      newPos,
		Effect:           moveEffect,
	}
	h.hub.BroadcastToGame(code, moveMsg)

	if isWinner {
		endMsg := message.GameEndedMessage{
			Type:       message.TypeGameEnded,
			WinnerID:   msg.PlayerID,
			WinnerName: player.Name,
		}
		h.hub.BroadcastToGame(code, endMsg)
	}
}

func (h *WebSocketHandler) handleStartGame(client *hub.Client, msg message.ClientMessage) {
	code := strings.ToUpper(msg.GameCode)
	g := h.store.Get(code)
	if g == nil {
		h.sendError(client, message.ErrGameNotFound, "Game not found")
		return
	}

	err := g.Start(msg.PlayerID)
	if err != nil {
		switch err {
		case game.ErrGameAlreadyStarted:
			h.sendError(client, message.ErrGameAlreadyStarted, "Game has already started")
		case game.ErrNotGameCreator:
			h.sendError(client, message.ErrNotGameCreator, "Only the game creator can start the game")
		default:
			h.sendError(client, message.ErrInternalError, "Failed to start game")
		}
		return
	}

	startMsg := message.GameStartedMessage{
		Type:          message.TypeGameStarted,
		Game:          gameToInfo(g),
		FirstPlayerID: g.GetCurrentTurnPlayerID(),
	}
	h.hub.BroadcastToGame(code, startMsg)
}

func (h *WebSocketHandler) handleDisconnect(client *hub.Client) {
	if client.GameCode == "" || client.PlayerID == "" {
		return
	}

	g := h.store.Get(client.GameCode)
	if g == nil {
		return
	}

	player := g.GetPlayer(client.PlayerID)
	if player == nil {
		return
	}

	g.SetPlayerConnected(client.PlayerID, false)

	leftMsg := message.PlayerLeftMessage{
		Type:       message.TypePlayerLeft,
		PlayerID:   client.PlayerID,
		PlayerName: player.Name,
	}
	h.hub.BroadcastToGameExcept(client.GameCode, client.ID, leftMsg)
}

func (h *WebSocketHandler) sendError(client *hub.Client, code, msg string) {
	h.hub.SendToClient(client, message.NewErrorMessage(code, msg))
}

func generateClientID() string {
	return game.GenerateID()
}
