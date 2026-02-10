package game

import (
	"fmt"
	"math"
	"time"
)

// MaxPlayers is the maximum number of players per game.
const MaxPlayers = 300

// Golden ratio for color distribution
const goldenRatio = 0.618033988749895

// Player represents a player in the game.
type Player struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Color       string    `json:"color"`
	Position    int       `json:"position"`
	IsConnected bool      `json:"isConnected"`
	JoinedAt    time.Time `json:"joinedAt"`
}

// hslToHex converts HSL color values to a hex color string.
// h: Hue (0-360), s: Saturation (0-100), l: Lightness (0-100)
func hslToHex(h, s, l float64) string {
	sNorm := s / 100
	lNorm := l / 100

	c := (1 - math.Abs(2*lNorm-1)) * sNorm
	x := c * (1 - math.Abs(math.Mod(h/60, 2)-1))
	m := lNorm - c/2

	var r, g, b float64

	switch {
	case h >= 0 && h < 60:
		r, g, b = c, x, 0
	case h >= 60 && h < 120:
		r, g, b = x, c, 0
	case h >= 120 && h < 180:
		r, g, b = 0, c, x
	case h >= 180 && h < 240:
		r, g, b = 0, x, c
	case h >= 240 && h < 300:
		r, g, b = x, 0, c
	default:
		r, g, b = c, 0, x
	}

	toHex := func(n float64) int {
		return int(math.Round((n + m) * 255))
	}

	return fmt.Sprintf("#%02X%02X%02X", toHex(r), toHex(g), toHex(b))
}

// GeneratePlayerColor generates a unique player color for a given index using
// golden ratio distribution. The golden ratio ensures maximum hue separation
// between consecutive players.
func GeneratePlayerColor(index int) string {
	// Golden ratio ensures maximum hue separation between consecutive players
	hue := math.Mod(float64(index)*goldenRatio*360, 360)

	// Vary saturation/lightness to create more distinction between similar hues
	saturation := 70 + float64(index%3)*10 // 70%, 80%, 90%
	lightness := 50 + float64(index%4)*8   // 50%, 58%, 66%, 74%

	return hslToHex(hue, saturation, lightness)
}

// GetPlayerColor gets the player color for a given 1-indexed player number.
func GetPlayerColor(playerNumber int) string {
	return GeneratePlayerColor(playerNumber - 1)
}

// NewPlayer creates a new player with the given ID, name, and color index.
func NewPlayer(id, name string, colorIndex int) *Player {
	color := GeneratePlayerColor(colorIndex)
	return &Player{
		ID:          id,
		Name:        name,
		Color:       color,
		Position:    0,
		IsConnected: true,
		JoinedAt:    time.Now(),
	}
}
