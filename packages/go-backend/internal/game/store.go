package game

import (
	"sync"
	"time"
)

// Store provides thread-safe in-memory game storage.
type Store struct {
	mu    sync.RWMutex
	games map[string]*Game
}

// NewStore creates a new game store.
func NewStore() *Store {
	return &Store{
		games: make(map[string]*Game),
	}
}

// Create creates a new game and stores it.
func (s *Store) Create(creatorName string) (*Game, *Player) {
	game, player := NewGame(creatorName)

	s.mu.Lock()
	s.games[game.Code] = game
	s.mu.Unlock()

	return game, player
}

// Get retrieves a game by code.
func (s *Store) Get(code string) *Game {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.games[code]
}

// Delete removes a game from the store.
func (s *Store) Delete(code string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.games, code)
}

// Count returns the number of games in the store.
func (s *Store) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.games)
}

// GetAll returns all games in the store.
func (s *Store) GetAll() []*Game {
	s.mu.RLock()
	defer s.mu.RUnlock()

	games := make([]*Game, 0, len(s.games))
	for _, g := range s.games {
		games = append(games, g)
	}
	return games
}

// CleanupOldGames removes games older than the specified duration.
func (s *Store) CleanupOldGames(maxAge time.Duration) int {
	s.mu.Lock()
	defer s.mu.Unlock()

	cutoff := time.Now().Add(-maxAge)
	removed := 0

	for code, game := range s.games {
		if game.GetCreatedAt().Before(cutoff) {
			delete(s.games, code)
			removed++
		}
	}

	return removed
}

// StartCleanupRoutine starts a background goroutine that periodically cleans up old games.
func (s *Store) StartCleanupRoutine(interval, maxAge time.Duration, stop <-chan struct{}) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			s.CleanupOldGames(maxAge)
		case <-stop:
			return
		}
	}
}
