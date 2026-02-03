package game

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"math/big"
	"strings"
	"sync"
	"time"
)

// Game status constants
const (
	StatusWaiting  = "waiting"
	StatusPlaying  = "playing"
	StatusFinished = "finished"
)

// Error definitions
var (
	ErrGameFull           = errors.New("game is full")
	ErrGameAlreadyStarted = errors.New("game has already started")
	ErrGameNotStarted     = errors.New("game has not started")
	ErrNotGameCreator     = errors.New("only the game creator can start the game")
	ErrPlayerNotFound     = errors.New("player not found")
	ErrInvalidDiceRoll    = errors.New("invalid dice roll")
)

// Game represents a game instance with thread-safe operations.
type Game struct {
	mu sync.RWMutex

	Code           string
	Status         string
	CreatorID      string
	Board          *Board
	Players        []*Player
	CurrentTurnIdx int
	WinnerID       string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// NewGame creates a new game with a random code and the creator as the first player.
func NewGame(creatorName string) (*Game, *Player) {
	code := generateGameCode()
	playerID := generatePlayerID()
	now := time.Now()

	player := NewPlayer(playerID, creatorName, 0)

	game := &Game{
		Code:           code,
		Status:         StatusWaiting,
		CreatorID:      playerID,
		Board:          DefaultBoard(),
		Players:        []*Player{player},
		CurrentTurnIdx: 0,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	return game, player
}

// ErrInvalidName is returned when a player name is invalid.
var ErrInvalidName = errors.New("invalid player name")

// AddPlayer adds a new player to the game.
func (g *Game) AddPlayer(name string) (*Player, error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	// Validate name
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, ErrInvalidName
	}

	if g.Status != StatusWaiting {
		return nil, ErrGameAlreadyStarted
	}

	if len(g.Players) >= MaxPlayers {
		return nil, ErrGameFull
	}

	playerID := generatePlayerID()
	player := NewPlayer(playerID, name, len(g.Players))
	g.Players = append(g.Players, player)
	g.UpdatedAt = time.Now()

	return player, nil
}

// GetPlayer returns a player by ID.
func (g *Game) GetPlayer(playerID string) *Player {
	g.mu.RLock()
	defer g.mu.RUnlock()

	for _, p := range g.Players {
		if p.ID == playerID {
			return p
		}
	}
	return nil
}

// SetPlayerConnected updates a player's connection status.
func (g *Game) SetPlayerConnected(playerID string, connected bool) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	for _, p := range g.Players {
		if p.ID == playerID {
			p.IsConnected = connected
			g.UpdatedAt = time.Now()
			return nil
		}
	}
	return ErrPlayerNotFound
}

// Start begins the game.
func (g *Game) Start(playerID string) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.Status != StatusWaiting {
		return ErrGameAlreadyStarted
	}

	if g.CreatorID != playerID {
		return ErrNotGameCreator
	}

	g.Status = StatusPlaying
	g.CurrentTurnIdx = 0
	g.UpdatedAt = time.Now()
	return nil
}

// RollDice processes a dice roll for a player.
// This is a RACE game - any player can roll at any time!
func (g *Game) RollDice(playerID string) (diceRoll, prevPos, newPos int, effect *MoveEffect, isWinner bool, err error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.Status != StatusPlaying {
		err = ErrGameNotStarted
		return
	}

	// Find player - no turn check, this is a race!
	var player *Player
	for _, p := range g.Players {
		if p.ID == playerID {
			player = p
			break
		}
	}

	if player == nil {
		err = ErrPlayerNotFound
		return
	}

	prevPos = player.Position

	// Roll dice (1-6)
	diceRoll = rollDice()

	// Process move
	result := g.Board.ProcessMove(player.Position, diceRoll)
	player.Position = result.NewPosition
	newPos = result.NewPosition
	effect = result.Effect
	isWinner = result.IsWinner

	if isWinner {
		g.Status = StatusFinished
		g.WinnerID = playerID
	}
	// No turn advancement - everyone races independently!

	g.UpdatedAt = time.Now()
	return
}

// GetCurrentTurnPlayerID returns the ID of the player whose turn it is.
func (g *Game) GetCurrentTurnPlayerID() string {
	g.mu.RLock()
	defer g.mu.RUnlock()

	if g.Status != StatusPlaying || len(g.Players) == 0 {
		return ""
	}
	return g.Players[g.CurrentTurnIdx].ID
}

// GetPlayers returns a copy of the players slice.
func (g *Game) GetPlayers() []*Player {
	g.mu.RLock()
	defer g.mu.RUnlock()

	players := make([]*Player, len(g.Players))
	for i, p := range g.Players {
		playerCopy := *p
		players[i] = &playerCopy
	}
	return players
}

// GetStatus returns the current game status.
func (g *Game) GetStatus() string {
	g.mu.RLock()
	defer g.mu.RUnlock()
	return g.Status
}

// GetCreatedAt returns when the game was created.
func (g *Game) GetCreatedAt() time.Time {
	g.mu.RLock()
	defer g.mu.RUnlock()
	return g.CreatedAt
}

// GetInfo returns a snapshot of the game state for serialization.
func (g *Game) GetInfo() (code, status, creatorID string, board *Board, createdAt, updatedAt time.Time) {
	g.mu.RLock()
	defer g.mu.RUnlock()
	return g.Code, g.Status, g.CreatorID, g.Board, g.CreatedAt, g.UpdatedAt
}

// generateGameCode creates a 6-character alphanumeric code.
// Excludes confusing characters: I, L, O, 0, 1
func generateGameCode() string {
	const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
	code := make([]byte, 6)
	for i := range code {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		code[i] = chars[n.Int64()]
	}
	return string(code)
}

// generatePlayerID creates a unique player ID.
func generatePlayerID() string {
	bytes := make([]byte, 12)
	rand.Read(bytes)
	return strings.ToLower(hex.EncodeToString(bytes))
}

// GenerateID creates a unique ID for general use (e.g., client connections).
func GenerateID() string {
	return generateGameCode()
}

// rollDice returns a random number between 1 and 6.
func rollDice() int {
	n, _ := rand.Int(rand.Reader, big.NewInt(6))
	return int(n.Int64()) + 1
}
