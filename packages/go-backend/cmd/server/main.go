package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/snakes-and-ladders/go-backend/internal/config"
	"github.com/snakes-and-ladders/go-backend/internal/game"
	"github.com/snakes-and-ladders/go-backend/internal/handler"
	"github.com/snakes-and-ladders/go-backend/internal/hub"
)

func main() {
	// Log panics before crashing
	defer func() {
		if r := recover(); r != nil {
			log.Fatalf("PANIC: %v", r)
		}
	}()

	cfg := config.Load()

	// Initialize components
	store := game.NewStore()
	h := hub.NewHub()

	// Start cleanup routine for old games
	stopCleanup := make(chan struct{})
	go store.StartCleanupRoutine(30*time.Minute, 2*time.Hour, stopCleanup)

	// Create handlers
	healthHandler := handler.NewHealthHandler(store)
	httpHandler := handler.NewHTTPHandler(store)
	adminHandler := handler.NewAdminHandler(store)
	wsHandler := handler.NewWebSocketHandler(store, h, cfg)
	pollHandler := handler.NewPollHandler(store, h)

	// Start cleanup routine for stale poll connections
	go pollHandler.StartCleanup(1*time.Minute, 5*time.Minute, stopCleanup)

	// Setup routes
	mux := http.NewServeMux()

	// Health check
	mux.Handle("/health", healthHandler)

	// HTTP API
	mux.HandleFunc("/games", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			httpHandler.HandleCreateGame(w, r)
		case http.MethodOptions:
			w.WriteHeader(http.StatusOK)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/games/", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			httpHandler.HandleGetGame(w, r)
		case http.MethodOptions:
			w.WriteHeader(http.StatusOK)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Admin API
	mux.HandleFunc("/admin/games", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			adminHandler.HandleListGames(w, r)
		case http.MethodOptions:
			w.WriteHeader(http.StatusOK)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/admin/games/", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			adminHandler.HandleGetGameDetail(w, r)
		case http.MethodOptions:
			w.WriteHeader(http.StatusOK)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// WebSocket
	mux.Handle("/ws", wsHandler)

	// Long polling
	mux.HandleFunc("/poll/connect", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			pollHandler.HandleConnect(w, r)
		case http.MethodOptions:
			w.WriteHeader(http.StatusOK)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/poll/messages", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			pollHandler.HandleMessages(w, r)
		case http.MethodOptions:
			w.WriteHeader(http.StatusOK)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/poll/send", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			pollHandler.HandleSend(w, r)
		case http.MethodOptions:
			w.WriteHeader(http.StatusOK)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/poll/disconnect", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			pollHandler.HandleDisconnect(w, r)
		case http.MethodOptions:
			w.WriteHeader(http.StatusOK)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Wrap with CORS middleware
	corsHandler := corsMiddleware(cfg)(mux)

	// Create server
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      corsHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Starting server on port %d (pid: %d)", cfg.Port, os.Getpid())
		log.Printf("Allowed origins: %v", cfg.AllowedOrigins)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Stop cleanup routine
	close(stopCleanup)

	// Graceful shutdown with 30s timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server stopped")
}

// corsMiddleware adds CORS headers to responses.
func corsMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if cfg.IsOriginAllowed(origin) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Connection-Id")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
