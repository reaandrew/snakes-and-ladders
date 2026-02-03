package message

// ClientMessage represents a message sent from the client to the server.
type ClientMessage struct {
	Action   string `json:"action"`
	GameCode string `json:"gameCode,omitempty"`
	PlayerID string `json:"playerId,omitempty"`
	Name     string `json:"playerName,omitempty"`
}

// Client action types
const (
	ActionJoinGame   = "joinGame"
	ActionRejoinGame = "rejoinGame"
	ActionRollDice   = "rollDice"
	ActionStartGame  = "startGame"
	ActionPing       = "ping"
)
