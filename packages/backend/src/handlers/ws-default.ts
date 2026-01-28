import type {
  ClientMessage,
  JoinedGameMessage,
  PlayerJoinedMessage,
  PlayerMovedMessage,
  GameStartedMessage,
  GameEndedMessage,
  ErrorMessage,
  PongMessage,
} from '@snakes-and-ladders/shared';
import { DEFAULT_BOARD_CONFIG, PLAYER_COLORS, ErrorCodes } from '@snakes-and-ladders/shared';
import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import { Repository, GameService, ConnectionService, BroadcastService } from '../lib/index.js';

const tableName = process.env.TABLE_NAME!;
const wsEndpoint = process.env.WEBSOCKET_ENDPOINT!;

const repository = new Repository({ tableName });
const gameService = new GameService({
  repository,
  defaultBoardConfig: DEFAULT_BOARD_CONFIG,
  playerColors: PLAYER_COLORS,
});
const connectionService = new ConnectionService({ repository });
const broadcastService = new BroadcastService({ repository, endpoint: wsEndpoint });

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    const message = JSON.parse(event.body || '{}') as ClientMessage;

    switch (message.action) {
      case 'ping':
        await handlePing(connectionId);
        break;

      case 'joinGame':
        await handleJoinGame(connectionId, message.gameCode, message.playerName);
        break;

      case 'rollDice':
        await handleRollDice(connectionId, message.gameCode, message.playerId);
        break;

      case 'startGame':
        await handleStartGame(connectionId, message.gameCode, message.playerId);
        break;

      default:
        await sendError(connectionId, ErrorCodes.INVALID_MESSAGE, 'Unknown action');
    }

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('WebSocket handler error:', error);
    await sendError(connectionId, ErrorCodes.INTERNAL_ERROR, 'Internal server error');
    return { statusCode: 500, body: 'Error' };
  }
};

async function handlePing(connectionId: string): Promise<void> {
  const message: PongMessage = { type: 'pong' };
  await broadcastService.sendToConnection(connectionId, message);
}

async function handleJoinGame(
  connectionId: string,
  gameCode: string,
  playerName: string
): Promise<void> {
  const result = await gameService.joinGame(gameCode, playerName);

  if (!result.success) {
    await sendError(connectionId, result.error.code, result.error.message);
    return;
  }

  const { game, player, players } = result.data;

  // Link connection to game
  await connectionService.linkToGame(connectionId, gameCode, player.id);

  // Send joined confirmation to the new player
  const joinedMessage: JoinedGameMessage = {
    type: 'joinedGame',
    playerId: player.id,
    game,
    players,
  };
  await broadcastService.sendToConnection(connectionId, joinedMessage);

  // Notify other players
  const playerJoinedMessage: PlayerJoinedMessage = {
    type: 'playerJoined',
    player,
  };
  await broadcastService.broadcastToGame(gameCode, playerJoinedMessage, connectionId);
}

async function handleRollDice(
  connectionId: string,
  gameCode: string,
  playerId: string
): Promise<void> {
  const result = await gameService.rollDice(gameCode, playerId);

  if (!result.success) {
    await sendError(connectionId, result.error.code, result.error.message);
    return;
  }

  const player = await repository.getPlayer(gameCode, playerId);
  if (!player) {
    await sendError(connectionId, ErrorCodes.PLAYER_NOT_FOUND, 'Player not found');
    return;
  }

  const { diceRoll, previousPosition, newPosition, effect, isWinner } = result.data;

  // Broadcast move to all players
  const moveMessage: PlayerMovedMessage = {
    type: 'playerMoved',
    playerId,
    playerName: player.name,
    diceRoll,
    previousPosition,
    newPosition,
    effect,
  };
  await broadcastService.broadcastToGame(gameCode, moveMessage);

  // If there's a winner, broadcast game ended
  if (isWinner) {
    const endMessage: GameEndedMessage = {
      type: 'gameEnded',
      winnerId: playerId,
      winnerName: player.name,
    };
    await broadcastService.broadcastToGame(gameCode, endMessage);
  }
}

async function handleStartGame(
  connectionId: string,
  gameCode: string,
  playerId: string
): Promise<void> {
  const result = await gameService.startGame(gameCode, playerId);

  if (!result.success) {
    await sendError(connectionId, result.error.code, result.error.message);
    return;
  }

  const startMessage: GameStartedMessage = {
    type: 'gameStarted',
    game: result.data,
  };
  await broadcastService.broadcastToGame(gameCode, startMessage);
}

async function sendError(connectionId: string, code: string, message: string): Promise<void> {
  const errorMessage: ErrorMessage = {
    type: 'error',
    code,
    message,
  };
  await broadcastService.sendToConnection(connectionId, errorMessage);
}
