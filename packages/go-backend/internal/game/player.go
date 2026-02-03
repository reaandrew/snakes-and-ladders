package game

import "time"

// Player colors - 8 available colors assigned in order
var PlayerColors = []string{
	"#EF4444", // red
	"#3B82F6", // blue
	"#22C55E", // green
	"#EAB308", // yellow
	"#A855F7", // purple
	"#F97316", // orange
	"#06B6D4", // cyan
	"#EC4899", // pink
}

// MaxPlayers is the maximum number of players per game.
const MaxPlayers = 8

// Player represents a player in the game.
type Player struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Color       string    `json:"color"`
	Position    int       `json:"position"`
	IsConnected bool      `json:"isConnected"`
	JoinedAt    time.Time `json:"joinedAt"`
}

// NewPlayer creates a new player with the given ID, name, and color index.
func NewPlayer(id, name string, colorIndex int) *Player {
	color := PlayerColors[colorIndex%len(PlayerColors)]
	return &Player{
		ID:          id,
		Name:        name,
		Color:       color,
		Position:    0,
		IsConnected: true,
		JoinedAt:    time.Now(),
	}
}
