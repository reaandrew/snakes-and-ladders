package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/snakes-and-ladders/go-backend/internal/game"
	"github.com/snakes-and-ladders/go-backend/internal/message"
)

// HTTPHandler handles HTTP API requests.
type HTTPHandler struct {
	store *game.Store
}

// NewHTTPHandler creates a new HTTP handler.
func NewHTTPHandler(store *game.Store) *HTTPHandler {
	return &HTTPHandler{store: store}
}

// CreateGameRequest represents a request to create a new game.
type CreateGameRequest struct {
	CreatorName string `json:"creatorName"`
}

// CreateGameResponse represents the response after creating a game.
type CreateGameResponse struct {
	Game     message.GameInfo   `json:"game"`
	PlayerID string             `json:"playerId"`
}

// GetGameResponse represents the response for getting game info.
type GetGameResponse struct {
	Game    message.GameInfo     `json:"game"`
	Players []message.PlayerInfo `json:"players"`
}

// ErrorResponse represents an error response.
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// HandleCreateGame handles POST /games requests.
func (h *HTTPHandler) HandleCreateGame(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CreateGameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, message.ErrInvalidMessage, "Invalid request body")
		return
	}

	if req.CreatorName == "" {
		h.writeError(w, http.StatusBadRequest, message.ErrInvalidMessage, "Creator name is required")
		return
	}

	g, player := h.store.Create(req.CreatorName)

	response := CreateGameResponse{
		Game:     gameToInfo(g),
		PlayerID: player.ID,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// HandleGetGame handles GET /games/{code} requests.
func (h *HTTPHandler) HandleGetGame(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract game code from path
	path := strings.TrimPrefix(r.URL.Path, "/games/")
	code := strings.ToUpper(strings.TrimSpace(path))

	if code == "" {
		h.writeError(w, http.StatusBadRequest, message.ErrInvalidMessage, "Game code is required")
		return
	}

	g := h.store.Get(code)
	if g == nil {
		h.writeError(w, http.StatusNotFound, message.ErrGameNotFound, "Game not found")
		return
	}

	players := g.GetPlayers()
	playerInfos := make([]message.PlayerInfo, len(players))
	for i, p := range players {
		playerInfos[i] = playerToInfo(p, code)
	}

	response := GetGameResponse{
		Game:    gameToInfo(g),
		Players: playerInfos,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *HTTPHandler) writeError(w http.ResponseWriter, status int, code, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{Code: code, Message: msg})
}

// Helper functions to convert game types to message types

func gameToInfo(g *game.Game) message.GameInfo {
	code, status, creatorID, winnerID, board, createdAt, updatedAt := g.GetInfo()

	snakesAndLadders := make([]message.SnakeLadderInfo, len(board.SnakesAndLadders))
	for i, sl := range board.SnakesAndLadders {
		snakesAndLadders[i] = message.SnakeLadderInfo{
			Start: sl.Start,
			End:   sl.End,
			Type:  sl.Type,
		}
	}

	return message.GameInfo{
		Code:      code,
		Status:    status,
		CreatorID: creatorID,
		WinnerID:  winnerID,
		Board: message.BoardInfo{
			Size:             board.Size,
			SnakesAndLadders: snakesAndLadders,
		},
		CreatedAt: createdAt.Format(time.RFC3339),
		UpdatedAt: updatedAt.Format(time.RFC3339),
	}
}

func playerToInfo(p *game.Player, gameCode string) message.PlayerInfo {
	return message.PlayerInfo{
		ID:          p.ID,
		GameCode:    gameCode,
		Name:        p.Name,
		Color:       p.Color,
		Position:    p.Position,
		IsConnected: p.IsConnected,
		JoinedAt:    p.JoinedAt.Format(time.RFC3339),
	}
}
