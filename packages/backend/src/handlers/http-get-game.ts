import type { GetGameResponse } from '@snakes-and-ladders/shared';
import { DEFAULT_BOARD_CONFIG, PLAYER_COLORS } from '@snakes-and-ladders/shared';
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

import { Repository, GameService } from '../lib/index.js';

const tableName = process.env.TABLE_NAME!;
const repository = new Repository({ tableName });
const gameService = new GameService({
  repository,
  defaultBoardConfig: DEFAULT_BOARD_CONFIG,
  playerColors: PLAYER_COLORS,
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  try {
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
        body: JSON.stringify({ error: result.error.message }),
      };
    }

    const response: GetGameResponse = {
      game: result.data.game,
      players: result.data.players,
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Get game error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to get game' }),
    };
  }
};
