package hub

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// Client represents a connected WebSocket client.
type Client struct {
	ID       string
	GameCode string
	PlayerID string
	Conn     *websocket.Conn
	Send     chan []byte
}

// Hub maintains the set of active clients and broadcasts messages.
type Hub struct {
	mu sync.RWMutex

	// Registered clients by connection ID
	clients map[string]*Client

	// Clients grouped by game code
	gameClients map[string]map[string]*Client
}

// NewHub creates a new Hub.
func NewHub() *Hub {
	return &Hub{
		clients:     make(map[string]*Client),
		gameClients: make(map[string]map[string]*Client),
	}
}

// Register adds a client to the hub.
func (h *Hub) Register(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.clients[client.ID] = client
}

// Unregister removes a client from the hub.
func (h *Hub) Unregister(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clients[client.ID]; ok {
		delete(h.clients, client.ID)
		close(client.Send)
	}

	// Remove from game clients
	if client.GameCode != "" {
		if gameClients, ok := h.gameClients[client.GameCode]; ok {
			delete(gameClients, client.ID)
			if len(gameClients) == 0 {
				delete(h.gameClients, client.GameCode)
			}
		}
	}
}

// JoinGame associates a client with a game.
func (h *Hub) JoinGame(client *Client, gameCode, playerID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Remove from previous game if any
	if client.GameCode != "" && client.GameCode != gameCode {
		if gameClients, ok := h.gameClients[client.GameCode]; ok {
			delete(gameClients, client.ID)
			if len(gameClients) == 0 {
				delete(h.gameClients, client.GameCode)
			}
		}
	}

	client.GameCode = gameCode
	client.PlayerID = playerID

	// Add to game clients
	if h.gameClients[gameCode] == nil {
		h.gameClients[gameCode] = make(map[string]*Client)
	}
	h.gameClients[gameCode][client.ID] = client
}

// BroadcastToGame sends a message to all clients in a game.
func (h *Hub) BroadcastToGame(gameCode string, message interface{}) {
	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	h.mu.RLock()
	gameClients := h.gameClients[gameCode]
	h.mu.RUnlock()

	for _, client := range gameClients {
		select {
		case client.Send <- data:
		default:
			// Client buffer full, skip
			log.Printf("Client %s buffer full, skipping message", client.ID)
		}
	}
}

// BroadcastToGameExcept sends a message to all clients in a game except one.
func (h *Hub) BroadcastToGameExcept(gameCode, excludeClientID string, message interface{}) {
	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	h.mu.RLock()
	gameClients := h.gameClients[gameCode]
	h.mu.RUnlock()

	for _, client := range gameClients {
		if client.ID == excludeClientID {
			continue
		}
		select {
		case client.Send <- data:
		default:
			log.Printf("Client %s buffer full, skipping message", client.ID)
		}
	}
}

// SendToClient sends a message to a specific client.
func (h *Hub) SendToClient(client *Client, message interface{}) {
	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	select {
	case client.Send <- data:
	default:
		log.Printf("Client %s buffer full, skipping message", client.ID)
	}
}

// GetGameClientCount returns the number of clients in a game.
func (h *Hub) GetGameClientCount(gameCode string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if gameClients, ok := h.gameClients[gameCode]; ok {
		return len(gameClients)
	}
	return 0
}

// GetClientByPlayerID finds a client by player ID in a game.
func (h *Hub) GetClientByPlayerID(gameCode, playerID string) *Client {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if gameClients, ok := h.gameClients[gameCode]; ok {
		for _, client := range gameClients {
			if client.PlayerID == playerID {
				return client
			}
		}
	}
	return nil
}
