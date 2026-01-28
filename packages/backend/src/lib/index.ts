// Database
export { Repository, type RepositoryConfig } from './db/repository.js';

// Board
export {
  rollDice,
  processMove,
  getPositionCoordinates,
  validateBoard,
  type MoveResult,
} from './board/board.service.js';

// Game
export {
  GameService,
  type GameServiceConfig,
  type CreateGameResult,
  type JoinGameResult,
  type RollDiceResult,
  type GameServiceError,
  type GameServiceResult,
} from './game/game.service.js';

// WebSocket
export { BroadcastService, type BroadcastServiceConfig } from './websocket/broadcast.service.js';

export { ConnectionService, type ConnectionServiceConfig } from './websocket/connection.service.js';
