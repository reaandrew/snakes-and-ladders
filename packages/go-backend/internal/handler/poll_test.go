package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/snakes-and-ladders/go-backend/internal/game"
	"github.com/snakes-and-ladders/go-backend/internal/hub"
	"github.com/snakes-and-ladders/go-backend/internal/message"
)

func newTestPollHandler() *PollHandler {
	store := game.NewStore()
	h := hub.NewHub()
	return NewPollHandler(store, h)
}

func connectPoll(t *testing.T, handler *PollHandler) string {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/poll/connect", nil)
	w := httptest.NewRecorder()
	handler.HandleConnect(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("HandleConnect returned status %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	connID := resp["connectionId"]
	if connID == "" {
		t.Fatal("connectionId is empty")
	}
	return connID
}

func sendMessage(t *testing.T, handler *PollHandler, connID string, msg message.ClientMessage) *httptest.ResponseRecorder {
	t.Helper()
	body, _ := json.Marshal(msg)
	req := httptest.NewRequest(http.MethodPost, "/poll/send", bytes.NewReader(body))
	req.Header.Set("X-Connection-Id", connID)
	w := httptest.NewRecorder()
	handler.HandleSend(w, req)
	return w
}

// --- Connect tests ---

func TestPollConnect(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	if !strings.HasPrefix(connID, "poll_") {
		t.Errorf("connectionId should start with 'poll_', got %s", connID)
	}
	if len(connID) != 29 { // "poll_" + 24 hex chars
		t.Errorf("connectionId should be 29 chars, got %d", len(connID))
	}
}

func TestPollConnectMethodNotAllowed(t *testing.T) {
	h := newTestPollHandler()
	req := httptest.NewRequest(http.MethodGet, "/poll/connect", nil)
	w := httptest.NewRecorder()
	h.HandleConnect(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("Expected 405, got %d", w.Code)
	}
}

// --- Messages tests ---

func TestPollMessagesMissingHeader(t *testing.T) {
	h := newTestPollHandler()
	req := httptest.NewRequest(http.MethodGet, "/poll/messages", nil)
	w := httptest.NewRecorder()
	h.HandleMessages(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400, got %d", w.Code)
	}
}

func TestPollMessagesInvalidConnection(t *testing.T) {
	h := newTestPollHandler()
	req := httptest.NewRequest(http.MethodGet, "/poll/messages", nil)
	req.Header.Set("X-Connection-Id", "nonexistent")
	w := httptest.NewRecorder()
	h.HandleMessages(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected 404, got %d", w.Code)
	}
}

func TestPollMessagesEmptyWhenNoGame(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	req := httptest.NewRequest(http.MethodGet, "/poll/messages", nil)
	req.Header.Set("X-Connection-Id", connID)
	w := httptest.NewRecorder()
	h.HandleMessages(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", w.Code)
	}

	var resp map[string][]interface{}
	json.NewDecoder(w.Body).Decode(&resp)
	if len(resp["messages"]) != 0 {
		t.Errorf("Expected 0 messages, got %d", len(resp["messages"]))
	}
}

func TestPollMessagesReturnsGameState(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	// Create a game and join via poll
	g, _ := h.store.Create("Alice")
	code := g.Code

	sendMessage(t, h, connID, message.ClientMessage{
		Action:   message.ActionJoinGame,
		GameCode: code,
		Name:     "Bob",
	})

	// Poll messages
	req := httptest.NewRequest(http.MethodGet, "/poll/messages", nil)
	req.Header.Set("X-Connection-Id", connID)
	w := httptest.NewRecorder()
	h.HandleMessages(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", w.Code)
	}

	var resp map[string][]json.RawMessage
	json.NewDecoder(w.Body).Decode(&resp)

	if len(resp["messages"]) != 1 {
		t.Fatalf("Expected 1 message, got %d", len(resp["messages"]))
	}

	var gameState message.GameStateMessage
	json.Unmarshal(resp["messages"][0], &gameState)

	if gameState.Type != message.TypeGameState {
		t.Errorf("Expected gameState type, got %s", gameState.Type)
	}
	if gameState.Game.Code != code {
		t.Errorf("Expected game code %s, got %s", code, gameState.Game.Code)
	}
	if len(gameState.Players) != 2 { // Alice + Bob
		t.Errorf("Expected 2 players, got %d", len(gameState.Players))
	}
}

func TestPollMessagesRefreshesLastPollTime(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	// Get initial poll time
	conn := h.pollStore.Get(connID)
	initialTime := conn.LastPollTime

	time.Sleep(10 * time.Millisecond)

	// Poll messages
	req := httptest.NewRequest(http.MethodGet, "/poll/messages", nil)
	req.Header.Set("X-Connection-Id", connID)
	w := httptest.NewRecorder()
	h.HandleMessages(w, req)

	conn = h.pollStore.Get(connID)
	if !conn.LastPollTime.After(initialTime) {
		t.Error("LastPollTime should have been updated")
	}
}

// --- Send - joinGame tests ---

func TestPollJoinGameSuccess(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	g, _ := h.store.Create("Alice")
	code := g.Code

	w := sendMessage(t, h, connID, message.ClientMessage{
		Action:   message.ActionJoinGame,
		GameCode: code,
		Name:     "Bob",
	})

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", w.Code)
	}

	var resp message.JoinedGameMessage
	json.NewDecoder(w.Body).Decode(&resp)

	if resp.Type != message.TypeJoinedGame {
		t.Errorf("Expected joinedGame type, got %s", resp.Type)
	}
	if resp.PlayerID == "" {
		t.Error("PlayerID should not be empty")
	}
	if resp.Game.Code != code {
		t.Errorf("Expected game code %s, got %s", code, resp.Game.Code)
	}
	if len(resp.Players) != 2 {
		t.Errorf("Expected 2 players, got %d", len(resp.Players))
	}

	// Verify connection state was updated
	conn := h.pollStore.Get(connID)
	if conn.GameCode != code {
		t.Errorf("Expected connection gameCode %s, got %s", code, conn.GameCode)
	}
	if conn.PlayerID != resp.PlayerID {
		t.Errorf("Expected connection playerID %s, got %s", resp.PlayerID, conn.PlayerID)
	}
}

func TestPollJoinGameNotFound(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	w := sendMessage(t, h, connID, message.ClientMessage{
		Action:   message.ActionJoinGame,
		GameCode: "XXXXXX",
		Name:     "Bob",
	})

	var resp ErrorResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Code != message.ErrGameNotFound {
		t.Errorf("Expected GAME_NOT_FOUND, got %s", resp.Code)
	}
}

func TestPollJoinGameAlreadyStarted(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	g, creator := h.store.Create("Alice")
	g.Start(creator.ID)

	w := sendMessage(t, h, connID, message.ClientMessage{
		Action:   message.ActionJoinGame,
		GameCode: g.Code,
		Name:     "Bob",
	})

	var resp ErrorResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Code != message.ErrGameAlreadyStarted {
		t.Errorf("Expected GAME_ALREADY_STARTED, got %s", resp.Code)
	}
}

// --- Send - rejoinGame tests ---

func TestPollRejoinGameSuccess(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	g, creator := h.store.Create("Alice")
	code := g.Code

	// Mark creator as disconnected
	g.SetPlayerConnected(creator.ID, false)

	w := sendMessage(t, h, connID, message.ClientMessage{
		Action:   message.ActionRejoinGame,
		GameCode: code,
		PlayerID: creator.ID,
	})

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", w.Code)
	}

	var resp message.JoinedGameMessage
	json.NewDecoder(w.Body).Decode(&resp)

	if resp.Type != message.TypeJoinedGame {
		t.Errorf("Expected joinedGame type, got %s", resp.Type)
	}
	if resp.PlayerID != creator.ID {
		t.Errorf("Expected playerID %s, got %s", creator.ID, resp.PlayerID)
	}

	// Verify player is reconnected
	player := g.GetPlayer(creator.ID)
	if !player.IsConnected {
		t.Error("Player should be connected after rejoin")
	}

	// Verify connection state
	conn := h.pollStore.Get(connID)
	if conn.GameCode != code {
		t.Errorf("Expected connection gameCode %s, got %s", code, conn.GameCode)
	}
}

func TestPollRejoinGamePlayerNotFound(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	g, _ := h.store.Create("Alice")

	w := sendMessage(t, h, connID, message.ClientMessage{
		Action:   message.ActionRejoinGame,
		GameCode: g.Code,
		PlayerID: "nonexistent",
	})

	var resp ErrorResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Code != message.ErrPlayerNotFound {
		t.Errorf("Expected PLAYER_NOT_FOUND, got %s", resp.Code)
	}
}

// --- Send - rollDice tests ---

func TestPollRollDiceSuccess(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	// Create game, join, start
	g, creator := h.store.Create("Alice")
	code := g.Code

	// Join via poll to set connection state
	joinW := sendMessage(t, h, connID, message.ClientMessage{
		Action:   message.ActionJoinGame,
		GameCode: code,
		Name:     "Bob",
	})
	var joinResp message.JoinedGameMessage
	json.NewDecoder(joinW.Body).Decode(&joinResp)

	// Start game as creator
	g.Start(creator.ID)

	// Roll dice
	w := sendMessage(t, h, connID, message.ClientMessage{
		Action: message.ActionRollDice,
	})

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", w.Code)
	}

	var resp message.PlayerMovedMessage
	json.NewDecoder(w.Body).Decode(&resp)

	if resp.Type != message.TypePlayerMoved {
		t.Errorf("Expected playerMoved type, got %s", resp.Type)
	}
	if resp.PlayerID != joinResp.PlayerID {
		t.Errorf("Expected playerID %s, got %s", joinResp.PlayerID, resp.PlayerID)
	}
	if resp.DiceRoll < 1 || resp.DiceRoll > 6 {
		t.Errorf("DiceRoll should be 1-6, got %d", resp.DiceRoll)
	}
	if resp.PreviousPosition != 1 {
		t.Errorf("PreviousPosition should be 1, got %d", resp.PreviousPosition)
	}
}

func TestPollRollDiceGameNotStarted(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	g, _ := h.store.Create("Alice")

	// Join game
	sendMessage(t, h, connID, message.ClientMessage{
		Action:   message.ActionJoinGame,
		GameCode: g.Code,
		Name:     "Bob",
	})

	// Try to roll without starting
	w := sendMessage(t, h, connID, message.ClientMessage{
		Action: message.ActionRollDice,
	})

	var resp ErrorResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Code != message.ErrGameNotStarted {
		t.Errorf("Expected GAME_NOT_STARTED, got %s", resp.Code)
	}
}

func TestPollRollDiceNotInGame(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	w := sendMessage(t, h, connID, message.ClientMessage{
		Action: message.ActionRollDice,
	})

	var resp ErrorResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Code != message.ErrGameNotFound {
		t.Errorf("Expected GAME_NOT_FOUND, got %s", resp.Code)
	}
}

// --- Send - startGame tests ---

func TestPollStartGameSuccess(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	// Create game via store, then rejoin as the creator via poll
	g, creator := h.store.Create("Alice")
	code := g.Code

	// Rejoin as creator to set connection state
	sendMessage(t, h, connID, message.ClientMessage{
		Action:   message.ActionRejoinGame,
		GameCode: code,
		PlayerID: creator.ID,
	})

	// Start game
	w := sendMessage(t, h, connID, message.ClientMessage{
		Action: message.ActionStartGame,
	})

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", w.Code)
	}

	var resp message.GameStartedMessage
	json.NewDecoder(w.Body).Decode(&resp)

	if resp.Type != message.TypeGameStarted {
		t.Errorf("Expected gameStarted type, got %s", resp.Type)
	}
	if resp.Game.Status != game.StatusPlaying {
		t.Errorf("Expected game status 'playing', got %s", resp.Game.Status)
	}
}

func TestPollStartGameNotCreator(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	g, _ := h.store.Create("Alice")

	// Join as different player
	sendMessage(t, h, connID, message.ClientMessage{
		Action:   message.ActionJoinGame,
		GameCode: g.Code,
		Name:     "Bob",
	})

	// Try to start as non-creator
	w := sendMessage(t, h, connID, message.ClientMessage{
		Action: message.ActionStartGame,
	})

	var resp ErrorResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Code != message.ErrNotGameCreator {
		t.Errorf("Expected NOT_GAME_CREATOR, got %s", resp.Code)
	}
}

// --- Send - ping tests ---

func TestPollPing(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	w := sendMessage(t, h, connID, message.ClientMessage{
		Action: message.ActionPing,
	})

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["type"] != "pong" {
		t.Errorf("Expected pong type, got %s", resp["type"])
	}
}

// --- Send - missing header tests ---

func TestPollSendMissingHeader(t *testing.T) {
	h := newTestPollHandler()
	body, _ := json.Marshal(message.ClientMessage{Action: message.ActionPing})
	req := httptest.NewRequest(http.MethodPost, "/poll/send", bytes.NewReader(body))
	w := httptest.NewRecorder()
	h.HandleSend(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400, got %d", w.Code)
	}
}

func TestPollSendInvalidConnection(t *testing.T) {
	h := newTestPollHandler()
	body, _ := json.Marshal(message.ClientMessage{Action: message.ActionPing})
	req := httptest.NewRequest(http.MethodPost, "/poll/send", bytes.NewReader(body))
	req.Header.Set("X-Connection-Id", "nonexistent")
	w := httptest.NewRecorder()
	h.HandleSend(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected 404, got %d", w.Code)
	}
}

// --- Disconnect tests ---

func TestPollDisconnect(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	g, _ := h.store.Create("Alice")
	code := g.Code

	// Join game
	joinW := sendMessage(t, h, connID, message.ClientMessage{
		Action:   message.ActionJoinGame,
		GameCode: code,
		Name:     "Bob",
	})
	var joinResp message.JoinedGameMessage
	json.NewDecoder(joinW.Body).Decode(&joinResp)

	// Disconnect
	req := httptest.NewRequest(http.MethodPost, "/poll/disconnect", nil)
	req.Header.Set("X-Connection-Id", connID)
	w := httptest.NewRecorder()
	h.HandleDisconnect(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", w.Code)
	}

	var resp map[string]bool
	json.NewDecoder(w.Body).Decode(&resp)
	if !resp["success"] {
		t.Error("Expected success: true")
	}

	// Verify player is disconnected
	player := g.GetPlayer(joinResp.PlayerID)
	if player.IsConnected {
		t.Error("Player should be disconnected after poll disconnect")
	}

	// Verify connection is removed
	if h.pollStore.Get(connID) != nil {
		t.Error("Connection should be removed from store")
	}
}

func TestPollDisconnectIdempotent(t *testing.T) {
	h := newTestPollHandler()

	// Disconnect with no header - should succeed
	req := httptest.NewRequest(http.MethodPost, "/poll/disconnect", nil)
	w := httptest.NewRecorder()
	h.HandleDisconnect(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", w.Code)
	}

	// Disconnect with unknown connection - should succeed
	req = httptest.NewRequest(http.MethodPost, "/poll/disconnect", nil)
	req.Header.Set("X-Connection-Id", "nonexistent")
	w = httptest.NewRecorder()
	h.HandleDisconnect(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", w.Code)
	}
}

// --- Cleanup tests ---

func TestPollCleanupRemovesStaleConnections(t *testing.T) {
	h := newTestPollHandler()

	// Create a connection with old LastPollTime
	conn := &PollConnection{
		ID:           "poll_stale",
		LastPollTime: time.Now().Add(-10 * time.Minute),
		CreatedAt:    time.Now().Add(-10 * time.Minute),
	}
	h.pollStore.Add(conn)

	// Create a fresh connection
	freshConn := &PollConnection{
		ID:           "poll_fresh",
		LastPollTime: time.Now(),
		CreatedAt:    time.Now(),
	}
	h.pollStore.Add(freshConn)

	removed := h.pollStore.CleanupStale(5 * time.Minute)

	if len(removed) != 1 {
		t.Fatalf("Expected 1 removed, got %d", len(removed))
	}
	if removed[0].ID != "poll_stale" {
		t.Errorf("Expected stale connection to be removed, got %s", removed[0].ID)
	}

	// Fresh should still exist
	if h.pollStore.Get("poll_fresh") == nil {
		t.Error("Fresh connection should still exist")
	}
	// Stale should be gone
	if h.pollStore.Get("poll_stale") != nil {
		t.Error("Stale connection should be removed")
	}
}

func TestPollCleanupDisconnectsPlayers(t *testing.T) {
	h := newTestPollHandler()

	g, _ := h.store.Create("Alice")
	code := g.Code
	bob, _ := g.AddPlayer("Bob")

	// Create a stale connection linked to Bob
	conn := &PollConnection{
		ID:           "poll_stale_bob",
		GameCode:     code,
		PlayerID:     bob.ID,
		LastPollTime: time.Now().Add(-10 * time.Minute),
		CreatedAt:    time.Now().Add(-10 * time.Minute),
	}
	h.pollStore.Add(conn)

	removed := h.pollStore.CleanupStale(5 * time.Minute)

	// Simulate the cleanup handler logic
	for _, rc := range removed {
		if rc.GameCode != "" && rc.PlayerID != "" {
			h.disconnectPlayer(rc)
		}
	}

	// Verify Bob is disconnected
	player := g.GetPlayer(bob.ID)
	if player.IsConnected {
		t.Error("Bob should be disconnected after cleanup")
	}
}

// --- Send - unknown action test ---

func TestPollSendUnknownAction(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	w := sendMessage(t, h, connID, message.ClientMessage{
		Action: "unknownAction",
	})

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400, got %d", w.Code)
	}
}

// --- Send - invalid JSON test ---

func TestPollSendInvalidJSON(t *testing.T) {
	h := newTestPollHandler()
	connID := connectPoll(t, h)

	req := httptest.NewRequest(http.MethodPost, "/poll/send", strings.NewReader("not json"))
	req.Header.Set("X-Connection-Id", connID)
	w := httptest.NewRecorder()
	h.HandleSend(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400, got %d", w.Code)
	}
}
