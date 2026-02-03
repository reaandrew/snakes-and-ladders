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
	if prevPos != 0 {
		t.Errorf("Previous position should be 0, got %d", prevPos)
	}
	// New position could be higher than 6 if landing on a ladder
	if effect == nil {
		if newPos < 1 || newPos > 6 {
			t.Errorf("New position without effect should be 1-6, got %d", newPos)
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

func TestRollDiceNotYourTurn(t *testing.T) {
	game, _ := NewGame("Alice")
	bob, _ := game.AddPlayer("Bob")
	game.Start(game.CreatorID)

	// Alice's turn first, Bob can't roll
	_, _, _, _, _, err := game.RollDice(bob.ID)
	if err != ErrNotYourTurn {
		t.Errorf("Expected ErrNotYourTurn, got %v", err)
	}
}

func TestTurnRotation(t *testing.T) {
	game, alice := NewGame("Alice")
	bob, _ := game.AddPlayer("Bob")
	game.Start(alice.ID)

	// Alice's turn
	if game.GetCurrentTurnPlayerID() != alice.ID {
		t.Error("Should be Alice's turn first")
	}

	game.RollDice(alice.ID)

	// Now Bob's turn
	if game.GetCurrentTurnPlayerID() != bob.ID {
		t.Error("Should be Bob's turn after Alice rolls")
	}

	game.RollDice(bob.ID)

	// Back to Alice
	if game.GetCurrentTurnPlayerID() != alice.ID {
		t.Error("Should be Alice's turn after Bob rolls")
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
