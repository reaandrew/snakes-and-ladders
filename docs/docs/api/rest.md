# REST API

## Base URL

```
https://{api-id}.execute-api.{region}.amazonaws.com/prod
```

## Endpoints

### Create Game

Create a new game and become the first player.

**Request**

```http
POST /games
Content-Type: application/json

{
  "creatorName": "Alice"
}
```

**Response**

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "game": {
    "code": "ABC123",
    "status": "waiting",
    "creatorId": "player-uuid",
    "board": {
      "size": 100,
      "snakesAndLadders": [...]
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "playerId": "player-uuid"
}
```

**Errors**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Creator name is required | Missing or empty name |
| 500 | Failed to create game | Server error |

### Get Game

Retrieve game state and player list.

**Request**

```http
GET /games/{code}
```

**Response**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "game": {
    "code": "ABC123",
    "status": "playing",
    "creatorId": "player-uuid",
    "board": {...},
    "winnerId": null,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "players": [
    {
      "id": "player-uuid",
      "gameCode": "ABC123",
      "name": "Alice",
      "color": "#3B82F6",
      "position": 42,
      "isConnected": true,
      "joinedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Errors**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Game code is required | Missing code parameter |
| 404 | Game not found | Invalid game code |
| 500 | Failed to get game | Server error |

## Game Status

| Status | Description |
|--------|-------------|
| `waiting` | Game created, waiting for players and start |
| `playing` | Game in progress |
| `finished` | Game ended, winner determined |

## CORS

All endpoints include CORS headers:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Methods: GET, POST, OPTIONS
```
