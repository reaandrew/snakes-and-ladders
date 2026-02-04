import type { AdminGameSummary, AdminGamesResponse } from '@snakes-and-ladders/shared';
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

    // Get all games from repository
    const games = await repository.getAllGames();

    // Build response with player info
    const allGames: AdminGameSummary[] = [];

    for (const game of games) {
      const result = await gameService.getGame(game.code);
      if (result.success) {
        const players = result.data.players;
        const sortedPlayers = [...players].sort((a, b) => b.position - a.position);
        const leader = sortedPlayers[0];

        allGames.push({
          code: game.code,
          status: game.status,
          playerCount: players.length,
          createdAt: game.createdAt,
          leaderName: leader?.name ?? null,
          leaderPosition: leader?.position ?? 0,
        });
      }
    }

    // Sort by createdAt descending
    allGames.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const response: AdminGamesResponse = { games: allGames };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Admin games error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to get games' }),
    };
  }
};
