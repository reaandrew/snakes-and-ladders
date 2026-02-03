package game

import (
	"testing"
)

func TestDefaultBoard(t *testing.T) {
	board := DefaultBoard()

	if board.Size != 100 {
		t.Errorf("Board size should be 100, got %d", board.Size)
	}
	if len(board.SnakesAndLadders) != 20 {
		t.Errorf("Board should have 20 snakes and ladders, got %d", len(board.SnakesAndLadders))
	}
}

func TestProcessMoveSimple(t *testing.T) {
	board := DefaultBoard()

	result := board.ProcessMove(0, 3)

	if result.NewPosition != 3 {
		t.Errorf("New position should be 3, got %d", result.NewPosition)
	}
	if result.Effect != nil {
		t.Error("No effect expected for position 3")
	}
	if result.IsWinner {
		t.Error("Should not be winner")
	}
}

func TestProcessMoveLadder(t *testing.T) {
	board := DefaultBoard()

	// Position 2 has a ladder to 38
	result := board.ProcessMove(0, 2)

	if result.NewPosition != 38 {
		t.Errorf("New position should be 38 (ladder), got %d", result.NewPosition)
	}
	if result.Effect == nil {
		t.Error("Ladder effect expected")
	}
	if result.Effect != nil && result.Effect.Type != "ladder" {
		t.Errorf("Effect type should be ladder, got %s", result.Effect.Type)
	}
	if result.Effect != nil && result.Effect.From != 2 {
		t.Errorf("Effect from should be 2, got %d", result.Effect.From)
	}
	if result.Effect != nil && result.Effect.To != 38 {
		t.Errorf("Effect to should be 38, got %d", result.Effect.To)
	}
}

func TestProcessMoveSnake(t *testing.T) {
	board := DefaultBoard()

	// Position 16 has a snake to 6
	result := board.ProcessMove(15, 1)

	if result.NewPosition != 6 {
		t.Errorf("New position should be 6 (snake), got %d", result.NewPosition)
	}
	if result.Effect == nil {
		t.Error("Snake effect expected")
	}
	if result.Effect != nil && result.Effect.Type != "snake" {
		t.Errorf("Effect type should be snake, got %s", result.Effect.Type)
	}
}

func TestProcessMoveExactWin(t *testing.T) {
	board := DefaultBoard()

	result := board.ProcessMove(95, 5)

	if result.NewPosition != 100 {
		t.Errorf("New position should be 100, got %d", result.NewPosition)
	}
	if !result.IsWinner {
		t.Error("Should be winner")
	}
}

func TestProcessMoveOvershoot(t *testing.T) {
	board := DefaultBoard()

	result := board.ProcessMove(98, 6)

	if result.NewPosition != 98 {
		t.Errorf("New position should remain 98 (overshoot), got %d", result.NewPosition)
	}
	if result.IsWinner {
		t.Error("Should not be winner (overshot)")
	}
}

func TestProcessMoveAtBoundary(t *testing.T) {
	board := DefaultBoard()

	// Exact landing on 100
	result := board.ProcessMove(94, 6)

	if result.NewPosition != 100 {
		t.Errorf("New position should be 100, got %d", result.NewPosition)
	}
	if !result.IsWinner {
		t.Error("Should be winner")
	}
}
