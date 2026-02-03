package handler

import (
	"encoding/json"
	"net/http"
	"runtime"
	"time"

	"github.com/snakes-and-ladders/go-backend/internal/game"
)

// HealthHandler handles health check requests.
type HealthHandler struct {
	store     *game.Store
	startTime time.Time
}

// NewHealthHandler creates a new health handler.
func NewHealthHandler(store *game.Store) *HealthHandler {
	return &HealthHandler{
		store:     store,
		startTime: time.Now(),
	}
}

// HealthResponse represents the health check response.
type HealthResponse struct {
	Status         string  `json:"status"`
	Uptime         string  `json:"uptime"`
	UptimeSeconds  float64 `json:"uptimeSeconds"`
	Goroutines     int     `json:"goroutines"`
	ActiveGames    int     `json:"activeGames"`
	MemoryMB       float64 `json:"memoryMB"`
}

// ServeHTTP handles GET /health requests.
func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	uptime := time.Since(h.startTime)

	response := HealthResponse{
		Status:        "healthy",
		Uptime:        uptime.String(),
		UptimeSeconds: uptime.Seconds(),
		Goroutines:    runtime.NumGoroutine(),
		ActiveGames:   h.store.Count(),
		MemoryMB:      float64(m.Alloc) / 1024 / 1024,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
