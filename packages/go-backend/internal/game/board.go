package game

// SnakeLadder represents a snake or ladder on the board.
type SnakeLadder struct {
	Start int    `json:"start"`
	End   int    `json:"end"`
	Type  string `json:"type"` // "snake" or "ladder"
}

// Board represents the game board configuration.
type Board struct {
	Size            int           `json:"size"`
	SnakesAndLadders []SnakeLadder `json:"snakesAndLadders"`
}

// MoveResult represents the result of processing a move.
type MoveResult struct {
	NewPosition int
	Effect      *MoveEffect
	IsWinner    bool
}

// MoveEffect represents a snake or ladder effect during a move.
type MoveEffect struct {
	Type string `json:"type"`
	From int    `json:"from"`
	To   int    `json:"to"`
}

// DefaultBoard returns the default 100-square board with snakes and ladders.
func DefaultBoard() *Board {
	return &Board{
		Size: 100,
		SnakesAndLadders: []SnakeLadder{
			// Ladders (10 total)
			{Start: 2, End: 38, Type: "ladder"},
			{Start: 7, End: 14, Type: "ladder"},
			{Start: 8, End: 31, Type: "ladder"},
			{Start: 15, End: 26, Type: "ladder"},
			{Start: 21, End: 42, Type: "ladder"},
			{Start: 28, End: 84, Type: "ladder"},
			{Start: 36, End: 44, Type: "ladder"},
			{Start: 51, End: 67, Type: "ladder"},
			{Start: 71, End: 91, Type: "ladder"},
			{Start: 78, End: 98, Type: "ladder"},
			// Snakes (10 total)
			{Start: 16, End: 6, Type: "snake"},
			{Start: 46, End: 25, Type: "snake"},
			{Start: 49, End: 11, Type: "snake"},
			{Start: 62, End: 19, Type: "snake"},
			{Start: 64, End: 60, Type: "snake"},
			{Start: 74, End: 53, Type: "snake"},
			{Start: 89, End: 68, Type: "snake"},
			{Start: 92, End: 88, Type: "snake"},
			{Start: 95, End: 75, Type: "snake"},
			{Start: 99, End: 80, Type: "snake"},
		},
	}
}

// ProcessMove calculates the new position after a dice roll.
func (b *Board) ProcessMove(currentPosition, diceRoll int) MoveResult {
	targetPosition := currentPosition + diceRoll

	// If exceeds board size, player doesn't move
	if targetPosition > b.Size {
		return MoveResult{
			NewPosition: currentPosition,
			IsWinner:    false,
		}
	}

	// Check for win condition
	if targetPosition == b.Size {
		return MoveResult{
			NewPosition: targetPosition,
			IsWinner:    true,
		}
	}

	// Check for snake or ladder
	for _, sl := range b.SnakesAndLadders {
		if sl.Start == targetPosition {
			return MoveResult{
				NewPosition: sl.End,
				Effect: &MoveEffect{
					Type: sl.Type,
					From: targetPosition,
					To:   sl.End,
				},
				IsWinner: sl.End == b.Size,
			}
		}
	}

	return MoveResult{
		NewPosition: targetPosition,
		IsWinner:    false,
	}
}
