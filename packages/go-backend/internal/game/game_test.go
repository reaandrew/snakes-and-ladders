package game

import (
	"testing"
)

func TestNewGame(t *testing.T) {
	game, player := NewGame("Alice")

	if game.Code == "" {
		t.Error("Game code should not be empty")
	}
	if len(game.Code) != 6 {
		t.Errorf("Game code should be 6 characters, got %d", len(game.Code))
	}
	if game.Status != StatusWaiting {
		t.Errorf("Game status should be waiting, got %s", game.Status)
	}
	if game.CreatorID != player.ID {
		t.Error("Game creator ID should match player ID")
	}
	if len(game.Players) != 1 {
		t.Errorf("Game should have 1 player, got %d", len(game.Players))
	}
	if player.Name != "Alice" {
		t.Errorf("Player name should be Alice, got %s", player.Name)
	}
	if player.Position != 0 {
		t.Errorf("Player position should be 0, got %d", player.Position)
	}
}

func TestAddPlayer(t *testing.T) {
	game, _ := NewGame("Alice")

	player, err := game.AddPlayer("Bob")
	if err != nil {
		t.Errorf("AddPlayer should not error: %v", err)
	}
	if player.Name != "Bob" {
		t.Errorf("Player name should be Bob, got %s", player.Name)
	}
	if len(game.Players) != 2 {
		t.Errorf("Game should have 2 players, got %d", len(game.Players))
	}
	// Players should have different colors
	if game.Players[0].Color == game.Players[1].Color {
		t.Error("Players should have different colors")
	}
}

func TestAddPlayerToFullGame(t *testing.T) {
	game, _ := NewGame("Player0")

	// Add 7 more players (total 8)
	for i := 1; i < MaxPlayers; i++ {
		_, err := game.AddPlayer("Player" + string(rune('0'+i)))
		if err != nil {
			t.Errorf("AddPlayer %d should not error: %v", i, err)
		}
	}

	// Try to add 9th player
	_, err := game.AddPlayer("Player8")
	if err != ErrGameFull {
		t.Errorf("Expected ErrGameFull, got %v", err)
	}
}

func TestAddPlayerToStartedGame(t *testing.T) {
	game, player := NewGame("Alice")
	game.Start(player.ID)

	_, err := game.AddPlayer("Bob")
	if err != ErrGameAlreadyStarted {
		t.Errorf("Expected ErrGameAlreadyStarted, got %v", err)
	}
}

func TestStartGame(t *testing.T) {
	game, player := NewGame("Alice")

	err := game.Start(player.ID)
	if err != nil {
		t.Errorf("Start should not error: %v", err)
	}
	if game.Status != StatusPlaying {
		t.Errorf("Game status should be playing, got %s", game.Status)
	}
}

func TestStartGameNotCreator(t *testing.T) {
	game, _ := NewGame("Alice")
	bob, _ := game.AddPlayer("Bob")

	err := game.Start(bob.ID)
	if err != ErrNotGameCreator {
		t.Errorf("Expected ErrNotGameCreator, got %v", err)
	}
}

func TestStartGameTwice(t *testing.T) {
	game, player := NewGame("Alice")
	game.Start(player.ID)

	err := game.Start(player.ID)
	if err != ErrGameAlreadyStarted {
		t.Errorf("Expected ErrGameAlreadyStarted, got %v", err)
	}
}

func TestRollDice(t *testing.T) {
	game, player := NewGame("Alice")
	game.Start(player.ID)

	diceRoll, prevPos, newPos, effect, _, err := game.RollDice(player.ID)
	if err != nil {
		t.Errorf("RollDice should not error: %v", err)
	}
	if diceRoll < 1 || diceRoll > 6 {
		t.Errorf("Dice roll should be 1-6, got %d", diceRoll)
	}
	if prevPos != 1 {
		t.Errorf("Previous position should be 1, got %d", prevPos)
	}
	// New position could be higher than 7 if landing on a ladder
	if effect == nil {
		if newPos < 2 || newPos > 7 {
			t.Errorf("New position without effect should be 2-7, got %d", newPos)
		}
	} else if effect.Type != "ladder" && effect.Type != "snake" {
		t.Errorf("Effect type should be ladder or snake, got %s", effect.Type)
	}
}

func TestRollDiceNotStarted(t *testing.T) {
	game, player := NewGame("Alice")

	_, _, _, _, _, err := game.RollDice(player.ID)
	if err != ErrGameNotStarted {
		t.Errorf("Expected ErrGameNotStarted, got %v", err)
	}
}

// TestRaceGameplay tests that this is a RACE game where anyone can roll anytime
func TestRaceGameplay(t *testing.T) {
	game, alice := NewGame("Alice")
	bob, _ := game.AddPlayer("Bob")
	game.Start(alice.ID)

	// Both players should be able to roll - this is a RACE, not turn-based!
	_, _, _, _, _, err := game.RollDice(bob.ID)
	if err != nil {
		t.Errorf("Bob should be able to roll in a race game: %v", err)
	}

	_, _, _, _, _, err = game.RollDice(alice.ID)
	if err != nil {
		t.Errorf("Alice should be able to roll in a race game: %v", err)
	}

	// Both can roll multiple times in any order
	_, _, _, _, _, err = game.RollDice(bob.ID)
	if err != nil {
		t.Errorf("Bob should be able to roll again: %v", err)
	}

	_, _, _, _, _, err = game.RollDice(bob.ID)
	if err != nil {
		t.Errorf("Bob should be able to roll multiple times in a row: %v", err)
	}
}

// TestSimultaneousRolling tests that multiple players can roll rapidly
func TestSimultaneousRolling(t *testing.T) {
	game, alice := NewGame("Alice")
	bob, _ := game.AddPlayer("Bob")
	charlie, _ := game.AddPlayer("Charlie")
	game.Start(alice.ID)

	// Simulate rapid rolling from all players
	// Game may finish when a player lands on the final square, so
	// subsequent rolls will return ErrGameNotStarted — that's expected.
	for i := 0; i < 10; i++ {
		_, _, _, _, _, err := game.RollDice(alice.ID)
		if err != nil && err != ErrGameNotStarted {
			t.Errorf("Alice roll %d failed: %v", i, err)
		}
		_, _, _, _, _, err = game.RollDice(bob.ID)
		if err != nil && err != ErrGameNotStarted {
			t.Errorf("Bob roll %d failed: %v", i, err)
		}
		_, _, _, _, _, err = game.RollDice(charlie.ID)
		if err != nil && err != ErrGameNotStarted {
			t.Errorf("Charlie roll %d failed: %v", i, err)
		}
	}
}

func TestGetPlayer(t *testing.T) {
	game, alice := NewGame("Alice")

	found := game.GetPlayer(alice.ID)
	if found == nil {
		t.Error("Should find Alice")
	}
	if found.Name != "Alice" {
		t.Errorf("Found player should be Alice, got %s", found.Name)
	}

	notFound := game.GetPlayer("nonexistent")
	if notFound != nil {
		t.Error("Should not find nonexistent player")
	}
}

func TestSetPlayerConnected(t *testing.T) {
	game, alice := NewGame("Alice")

	err := game.SetPlayerConnected(alice.ID, false)
	if err != nil {
		t.Errorf("SetPlayerConnected should not error: %v", err)
	}

	player := game.GetPlayer(alice.ID)
	if player.IsConnected {
		t.Error("Player should be disconnected")
	}

	err = game.SetPlayerConnected(alice.ID, true)
	if err != nil {
		t.Errorf("SetPlayerConnected should not error: %v", err)
	}

	player = game.GetPlayer(alice.ID)
	if !player.IsConnected {
		t.Error("Player should be connected")
	}
}

func TestSetPlayerConnectedNotFound(t *testing.T) {
	game, _ := NewGame("Alice")

	err := game.SetPlayerConnected("nonexistent", false)
	if err != ErrPlayerNotFound {
		t.Errorf("Expected ErrPlayerNotFound, got %v", err)
	}
}

func TestGenerateID(t *testing.T) {
	id1 := GenerateID()
	id2 := GenerateID()

	if id1 == id2 {
		t.Error("Generated IDs should be unique")
	}
	if len(id1) != 6 {
		t.Errorf("Generated ID should be 6 characters, got %d", len(id1))
	}
}
