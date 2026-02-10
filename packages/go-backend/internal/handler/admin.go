package handler

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/snakes-and-ladders/go-backend/internal/game"
	"github.com/snakes-and-ladders/go-backend/internal/message"
)

const (
	adminUsername = "Admin"
	adminPassword = "SuperSecure123@"
)

// AdminHandler handles admin API requests.
type AdminHandler struct {
	store *game.Store
}

// NewAdminHandler creates a new admin handler.
func NewAdminHandler(store *game.Store) *AdminHandler {
	return &AdminHandler{store: store}
}

// AdminGameSummary represents a summary of a game for admin view.
type AdminGameSummary struct {
	Code           string `json:"code"`
	Status         string `json:"status"`
	PlayerCount    int    `json:"playerCount"`
	CreatedAt      string `json:"createdAt"`
	LeaderName     *string `json:"leaderName"`
	LeaderPosition int    `json:"leaderPosition"`
}

// AdminGamesResponse represents the response for listing all games.
type AdminGamesResponse struct {
	Games []AdminGameSummary `json:"games"`
}

// AdminPlayerDetail represents detailed player info for admin view.
type AdminPlayerDetail struct {
	message.PlayerInfo
	Rank          int `json:"rank"`
	DistanceToWin int `json:"distanceToWin"`
}

// AdminGameDetailResponse represents detailed game info for admin view.
type AdminGameDetailResponse struct {
	Game    message.GameInfo    `json:"game"`
	Players []AdminPlayerDetail `json:"players"`
	Moves   []interface{}       `json:"moves"`
}

// validateAuth checks if the request has valid admin credentials.
func (h *AdminHandler) validateAuth(r *http.Request) bool {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Basic ") {
		return false
	}

	decoded, err := base64.StdEncoding.DecodeString(auth[6:])
	if err != nil {
		return false
	}

	expected := adminUsername + ":" + adminPassword
	return string(decoded) == expected
}

// HandleListGames handles GET /admin/games requests.
func (h *AdminHandler) HandleListGames(w http.ResponseWriter, r *http.Request) {
	if !h.validateAuth(r) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(ErrorResponse{Type: "error", Code: "UNAUTHORIZED", Message: "Invalid credentials"})
		return
	}

	games := h.store.GetAll()
	summaries := make([]AdminGameSummary, 0, len(games))

	for _, g := range games {
		code, status, _, _, board, createdAt, _ := g.GetInfo()
		players := g.GetPlayers()

		// Find leader (player with highest position)
		var leaderName *string
		leaderPosition := 0
		for _, p := range players {
			if p.Position > leaderPosition {
				leaderPosition = p.Position
				name := p.Name
				leaderName = &name
			}
		}

		summaries = append(summaries, AdminGameSummary{
			Code:           code,
			Status:         status,
			PlayerCount:    len(players),
			CreatedAt:      createdAt.Format(time.RFC3339),
			LeaderName:     leaderName,
			LeaderPosition: leaderPosition,
		})

		_ = board // unused but needed from GetInfo
	}

	// Sort by createdAt descending
	sort.Slice(summaries, func(i, j int) bool {
		ti, _ := time.Parse(time.RFC3339, summaries[i].CreatedAt)
		tj, _ := time.Parse(time.RFC3339, summaries[j].CreatedAt)
		return ti.After(tj)
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AdminGamesResponse{Games: summaries})
}

// HandleGetGameDetail handles GET /admin/games/{code} requests.
func (h *AdminHandler) HandleGetGameDetail(w http.ResponseWriter, r *http.Request) {
	if !h.validateAuth(r) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(ErrorResponse{Type: "error", Code: "UNAUTHORIZED", Message: "Invalid credentials"})
		return
	}

	// Extract game code from path
	path := strings.TrimPrefix(r.URL.Path, "/admin/games/")
	code := strings.ToUpper(strings.TrimSpace(path))

	if code == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Type: "error", Code: "INVALID_REQUEST", Message: "Game code is required"})
		return
	}

	g := h.store.Get(code)
	if g == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(ErrorResponse{Type: "error", Code: "NOT_FOUND", Message: "Game not found"})
		return
	}

	gameCode, status, creatorID, winnerID, board, createdAt, updatedAt := g.GetInfo()
	players := g.GetPlayers()

	// Sort players by position descending
	sort.Slice(players, func(i, j int) bool {
		return players[i].Position > players[j].Position
	})

	// Build player details with rank
	playerDetails := make([]AdminPlayerDetail, len(players))
	for i, p := range players {
		playerDetails[i] = AdminPlayerDetail{
			PlayerInfo: message.PlayerInfo{
				ID:          p.ID,
				GameCode:    gameCode,
				Name:        p.Name,
				Color:       p.Color,
				Position:    p.Position,
				IsConnected: p.IsConnected,
				JoinedAt:    p.JoinedAt.Format(time.RFC3339),
			},
			Rank:          i + 1,
			DistanceToWin: board.Size - p.Position,
		}
	}

	snakesAndLadders := make([]message.SnakeLadderInfo, len(board.SnakesAndLadders))
	for i, sl := range board.SnakesAndLadders {
		snakesAndLadders[i] = message.SnakeLadderInfo{
			Start: sl.Start,
			End:   sl.End,
			Type:  sl.Type,
		}
	}

	response := AdminGameDetailResponse{
		Game: message.GameInfo{
			Code:      gameCode,
			Status:    status,
			CreatorID: creatorID,
			WinnerID:  winnerID,
			Board: message.BoardInfo{
				Size:             board.Size,
				SnakesAndLadders: snakesAndLadders,
			},
			CreatedAt: createdAt.Format(time.RFC3339),
			UpdatedAt: updatedAt.Format(time.RFC3339),
		},
		Players: playerDetails,
		Moves:   []interface{}{}, // Go backend doesn't track moves
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
