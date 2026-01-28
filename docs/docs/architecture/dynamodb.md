# DynamoDB Single Table Design

## Overview

All entities (games, players, connections) are stored in a single DynamoDB table using composite keys.

## Table Schema

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | String | Partition key |
| SK | String | Sort key |
| GSI1PK | String | Global secondary index partition key |
| GSI1SK | String | Global secondary index sort key |
| TTL | Number | Time-to-live timestamp |

## Entity Types

### Game

Stores game state and configuration.

```json
{
  "PK": "GAME#ABC123",
  "SK": "METADATA",
  "code": "ABC123",
  "status": "playing",
  "creatorId": "player-uuid",
  "board": { "size": 100, "snakesAndLadders": [...] },
  "winnerId": null,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "GSI1PK": "GAMES",
  "GSI1SK": "2024-01-01T00:00:00Z"
}
```

### Player

Stores player state within a game.

```json
{
  "PK": "GAME#ABC123",
  "SK": "PLAYER#player-uuid",
  "id": "player-uuid",
  "gameCode": "ABC123",
  "name": "Alice",
  "color": "#3B82F6",
  "position": 42,
  "connectionId": "abc123",
  "isConnected": true,
  "joinedAt": "2024-01-01T00:00:00Z",
  "GSI1PK": "PLAYER#player-uuid",
  "GSI1SK": "2024-01-01T00:00:00Z"
}
```

### Connection

Maps WebSocket connections to players.

```json
{
  "PK": "CONNECTION#abc123",
  "SK": "METADATA",
  "connectionId": "abc123",
  "playerId": "player-uuid",
  "gameCode": "ABC123",
  "connectedAt": "2024-01-01T00:00:00Z",
  "GSI1PK": "GAME#ABC123",
  "GSI1SK": "CONNECTION#abc123"
}
```

## Access Patterns

### Get Game

```
PK = "GAME#{code}"
SK = "METADATA"
```

### Get All Players in Game

```
PK = "GAME#{code}"
SK begins_with "PLAYER#"
```

### Get Player by ID

```
GSI1PK = "PLAYER#{playerId}"
```

### Get Connection

```
PK = "CONNECTION#{connectionId}"
SK = "METADATA"
```

### Get All Connections for Game (for broadcasting)

```
GSI1PK = "GAME#{code}"
GSI1SK begins_with "CONNECTION#"
```

## Key Benefits

1. **Single Round Trip**: Get game + all players with one Query
2. **Atomic Updates**: Conditional writes for race conditions
3. **Efficient Broadcasting**: Quick connection lookups via GSI
4. **Cost Effective**: On-demand billing scales to zero

## TTL Strategy

Games and related entities expire after 24 hours:

```typescript
TTL: Math.floor(Date.now() / 1000) + 24 * 60 * 60
```

This ensures abandoned games are automatically cleaned up.
