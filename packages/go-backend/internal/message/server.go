package message

// ServerMessage is the base interface for all server messages.
// Each message type has its own struct with a Type field.

// MessageType constants for server messages
const (
	TypeJoinedGame   = "joinedGame"
	TypePlayerJoined = "playerJoined"
	TypePlayerLeft   = "playerLeft"
	TypePlayerMoved  = "playerMoved"
	TypeGameStarted  = "gameStarted"
	TypeGameEnded    = "gameEnded"
	TypeGameState    = "gameState"
	TypeError        = "error"
	TypePong         = "pong"
)

// Error codes
const (
	ErrGameNotFound       = "GAME_NOT_FOUND"
	ErrGameFull           = "GAME_FULL"
	ErrGameAlreadyStarted = "GAME_ALREADY_STARTED"
	ErrGameNotStarted     = "GAME_NOT_STARTED"
	ErrNotGameCreator     = "NOT_GAME_CREATOR"
	ErrPlayerNotFound     = "PLAYER_NOT_FOUND"
	ErrInvalidMessage     = "INVALID_MESSAGE"
	ErrInternalError      = "INTERNAL_ERROR"
	ErrNotYourTurn        = "NOT_YOUR_TURN"
)

// JoinedGameMessage is sent to a player when they successfully join a game.
type JoinedGameMessage struct {
	Type     string        `json:"type"`
	PlayerID string        `json:"playerId"`
	Game     GameInfo      `json:"game"`
	Players  []PlayerInfo  `json:"players"`
}

// PlayerJoinedMessage is broadcast when a new player joins.
type PlayerJoinedMessage struct {
	Type   string     `json:"type"`
	Player PlayerInfo `json:"player"`
}

// PlayerLeftMessage is broadcast when a player disconnects.
type PlayerLeftMessage struct {
	Type       string `json:"type"`
	PlayerID   string `json:"playerId"`
	PlayerName string `json:"playerName"`
}

// PlayerMovedMessage is broadcast when a player moves.
type PlayerMovedMessage struct {
	Type             string      `json:"type"`
	PlayerID         string      `json:"playerId"`
	PlayerName       string      `json:"playerName"`
	DiceRoll         int         `json:"diceRoll"`
	PreviousPosition int         `json:"previousPosition"`
	NewPosition      int         `json:"newPosition"`
	Effect           *MoveEffect `json:"effect"`
	NextPlayerID     string      `json:"nextPlayerId,omitempty"`
}

// MoveEffect represents a snake or ladder effect.
type MoveEffect struct {
	Type string `json:"type"` // "snake" or "ladder"
	From int    `json:"from"`
	To   int    `json:"to"`
}

// GameStartedMessage is broadcast when the game starts.
type GameStartedMessage struct {
	Type         string `json:"type"`
	Game         GameInfo `json:"game"`
	FirstPlayerID string `json:"firstPlayerId"`
}

// GameEndedMessage is broadcast when the game ends.
type GameEndedMessage struct {
	Type       string `json:"type"`
	WinnerID   string `json:"winnerId"`
	WinnerName string `json:"winnerName"`
}

// GameStateMessage is sent when a player rejoins to sync state.
type GameStateMessage struct {
	Type          string       `json:"type"`
	Game          GameInfo     `json:"game"`
	Players       []PlayerInfo `json:"players"`
	CurrentTurnID string       `json:"currentTurnId,omitempty"`
}

// ErrorMessage is sent when an error occurs.
type ErrorMessage struct {
	Type    string `json:"type"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// PongMessage is sent in response to a ping.
type PongMessage struct {
	Type string `json:"type"`
}

// GameInfo represents game state sent to clients.
type GameInfo struct {
	Code      string    `json:"code"`
	Status    string    `json:"status"`
	CreatorID string    `json:"creatorId"`
	Board     BoardInfo `json:"board"`
	CreatedAt string    `json:"createdAt"`
	UpdatedAt string    `json:"updatedAt"`
}

// BoardInfo represents the board configuration.
type BoardInfo struct {
	Size             int                `json:"size"`
	SnakesAndLadders []SnakeLadderInfo  `json:"snakesAndLadders"`
}

// SnakeLadderInfo represents a snake or ladder on the board.
type SnakeLadderInfo struct {
	Start int    `json:"start"`
	End   int    `json:"end"`
	Type  string `json:"type"`
}

// PlayerInfo represents a player's state sent to clients.
type PlayerInfo struct {
	ID          string `json:"id"`
	GameCode    string `json:"gameCode"`
	Name        string `json:"name"`
	Color       string `json:"color"`
	Position    int    `json:"position"`
	IsConnected bool   `json:"isConnected"`
	JoinedAt    string `json:"joinedAt"`
}

// NewErrorMessage creates a new error message.
func NewErrorMessage(code, message string) ErrorMessage {
	return ErrorMessage{
		Type:    TypeError,
		Code:    code,
		Message: message,
	}
}

// NewPongMessage creates a new pong message.
func NewPongMessage() PongMessage {
	return PongMessage{Type: TypePong}
}
