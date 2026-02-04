import type { AdminPlayerDetail, AdminGameDetailResponse, Move } from '@snakes-and-ladders/shared';
import { DEFAULT_BOARD_CONFIG, PLAYER_COLORS } from '@snakes-and-ladders/shared';
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

import { validateAdminAuth } from '../lib/auth/admin-auth.js';
import { Repository, GameService } from '../lib/index.js';

const tableName = process.env.TABLE_NAME!;
const repository = new Repository({ tableName });
const gameService = new GameService({
  repository,
  defaultBoardConfig: DEFAULT_BOARD_CONFIG,
  playerColors: PLAYER_COLORS,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // Handle OPTIONS preflight
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    // Validate admin auth
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!validateAdminAuth(authHeader)) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const gameCode = event.pathParameters?.code;

    if (!gameCode) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Game code is required' }),
      };
    }

    const result = await gameService.getGame(gameCode);

    if (!result.success) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Game not found' }),
      };
    }

    const { game, players } = result.data;

    // Get moves for the game
    const moveEntities = await repository.getGameMoves(gameCode, 50);

    // Transform MoveEntity to Move (strip DynamoDB keys)
    const moves: Move[] = moveEntities.map((entity) => ({
      id: entity.id,
      gameCode: entity.gameCode,
      playerId: entity.playerId,
      playerName: entity.playerName,
      playerColor: entity.playerColor,
      diceRoll: entity.diceRoll,
      previousPosition: entity.previousPosition,
      newPosition: entity.newPosition,
      effect: entity.effect,
      timestamp: entity.timestamp,
    }));

    // Sort players by position descending to calculate rank
    const sortedPlayers = [...players].sort((a, b) => b.position - a.position);

    const playersWithRank: AdminPlayerDetail[] = sortedPlayers.map((player, index) => ({
      ...player,
      rank: index + 1,
      distanceToWin: game.board.size - player.position,
    }));

    const response: AdminGameDetailResponse = {
      game,
      players: playersWithRank,
      moves: moves.reverse(), // Most recent first
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Admin game detail error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to get game' }),
    };
  }
};
