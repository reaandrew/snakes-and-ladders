package game

import (
	"testing"
	"time"
)

func TestStore(t *testing.T) {
	store := NewStore()

	// Create a game
	game, player := store.Create("Alice")

	if game == nil {
		t.Fatal("Game should not be nil")
	}
	if player == nil {
		t.Fatal("Player should not be nil")
	}

	// Get the game
	found := store.Get(game.Code)
	if found == nil {
		t.Fatal("Should find the game")
	}
	if found.Code != game.Code {
		t.Errorf("Found game code should match")
	}

	// Count
	if store.Count() != 1 {
		t.Errorf("Store should have 1 game, got %d", store.Count())
	}

	// Delete
	store.Delete(game.Code)
	if store.Count() != 0 {
		t.Errorf("Store should have 0 games, got %d", store.Count())
	}

	// Get after delete
	notFound := store.Get(game.Code)
	if notFound != nil {
		t.Error("Should not find deleted game")
	}
}

func TestStoreCleanup(t *testing.T) {
	store := NewStore()

	// Create a game
	game, _ := store.Create("Alice")

	// Set game creation time to 3 hours ago
	game.mu.Lock()
	game.CreatedAt = time.Now().Add(-3 * time.Hour)
	game.mu.Unlock()

	// Cleanup games older than 2 hours
	removed := store.CleanupOldGames(2 * time.Hour)

	if removed != 1 {
		t.Errorf("Should remove 1 game, removed %d", removed)
	}
	if store.Count() != 0 {
		t.Errorf("Store should have 0 games, got %d", store.Count())
	}
}

func TestStoreCleanupKeepsRecent(t *testing.T) {
	store := NewStore()

	// Create a game (recent)
	store.Create("Alice")

	// Cleanup games older than 2 hours
	removed := store.CleanupOldGames(2 * time.Hour)

	if removed != 0 {
		t.Errorf("Should remove 0 games, removed %d", removed)
	}
	if store.Count() != 1 {
		t.Errorf("Store should have 1 game, got %d", store.Count())
	}
}
