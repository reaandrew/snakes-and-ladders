import type { CreateGameRequest, CreateGameResponse } from '@snakes-and-ladders/shared';
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  try {
    const body = JSON.parse(event.body || '{}') as CreateGameRequest;

    if (!body.creatorName?.trim()) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Creator name is required' }),
      };
    }

    const result = await gameService.createGame(body.creatorName.trim());

    if (!result.success) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: result.error.message }),
      };
    }

    const response: CreateGameResponse = {
      game: result.data.game,
      playerId: result.data.player.id,
    };

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Create game error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to create game' }),
    };
  }
};
