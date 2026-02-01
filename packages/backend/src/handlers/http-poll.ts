import { DEFAULT_BOARD_CONFIG, PLAYER_COLORS } from '@snakes-and-ladders/shared';
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { nanoid } from 'nanoid';

import { Repository, GameService } from '../lib/index.js';

interface PollMessageBody {
  action?: string;
  gameCode?: string;
  playerName?: string;
  playerId?: string;
}

const tableName = process.env.TABLE_NAME!;
const repository = new Repository({ tableName });
const gameService = new GameService({
  repository,
  defaultBoardConfig: DEFAULT_BOARD_CONFIG,
  playerColors: PLAYER_COLORS,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Connection-Id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// TTL: 5 minutes from now (in seconds for DynamoDB)
const getConnectionTTL = () => Math.floor(Date.now() / 1000) + 5 * 60;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const path = event.rawPath || event.requestContext.http?.path || '';
  const method = event.requestContext.http?.method || 'GET';

  try {
    // OPTIONS - CORS preflight
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      };
    }

    // POST /poll/connect - Create a new polling connection
    if (path.endsWith('/connect') && method === 'POST') {
      const connectionId = `poll_${nanoid()}`;

      await repository.putConnection({
        PK: `CONNECTION#${connectionId}`,
        SK: 'METADATA',
        connectionId,
        connectedAt: new Date().toISOString(),
        TTL: getConnectionTTL(),
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ connectionId }),
      };
    }

    // GET /poll/messages - Long-poll for messages (returns current game state)
    if (path.endsWith('/messages') && method === 'GET') {
      const connectionId = event.headers['x-connection-id'];
      if (!connectionId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Missing X-Connection-Id header' }),
        };
      }

      const connection = await repository.getConnection(connectionId);
      if (!connection) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Connection not found or expired' }),
        };
      }

      // Refresh TTL on each poll to keep connection alive
      await repository.putConnection({
        ...connection,
        TTL: getConnectionTTL(),
      });

      if (!connection.gameCode) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ messages: [] }),
        };
      }

      // Get current game state
      const result = await gameService.getGame(connection.gameCode);
      if (!result.success) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ messages: [] }),
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          messages: [
            {
              type: 'gameState',
              game: result.data.game,
              players: result.data.players,
            },
          ],
        }),
      };
    }

    // POST /poll/send - Send a message via polling
    if (path.endsWith('/send') && method === 'POST') {
      const connectionId = event.headers['x-connection-id'];
      if (!connectionId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Missing X-Connection-Id header' }),
        };
      }

      const connection = await repository.getConnection(connectionId);
      if (!connection) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Connection not found or expired' }),
        };
      }

      // Refresh TTL
      await repository.putConnection({
        ...connection,
        TTL: getConnectionTTL(),
      });

      const body = JSON.parse(event.body || '{}') as PollMessageBody;

      // Handle different actions
      if (body.action === 'joinGame' && body.gameCode && body.playerName) {
        const result = await gameService.joinGame(body.gameCode, body.playerName);
        if (result.success) {
          // Update connection with game info
          await repository.updateConnectionGame(connectionId, body.gameCode, result.data.player.id);

          // Also update player with connection ID
          await repository.updatePlayerConnection(
            body.gameCode,
            result.data.player.id,
            connectionId,
            true
          );

          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              type: 'joinedGame',
              playerId: result.data.player.id,
              game: result.data.game,
              players: result.data.players,
            }),
          };
        } else {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ type: 'error', message: result.error.message }),
          };
        }
      }

      if (body.action === 'rollDice' && connection.gameCode && connection.playerId) {
        const result = await gameService.rollDice(connection.gameCode, connection.playerId);
        if (result.success) {
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              type: 'playerMoved',
              playerId: connection.playerId,
              diceRoll: result.data.diceRoll,
              previousPosition: result.data.previousPosition,
              newPosition: result.data.newPosition,
              effect: result.data.effect,
            }),
          };
        } else {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ type: 'error', message: result.error.message }),
          };
        }
      }

      if (body.action === 'startGame' && connection.gameCode && connection.playerId) {
        const result = await gameService.startGame(connection.gameCode, connection.playerId);
        if (result.success) {
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              type: 'gameStarted',
              game: result.data,
            }),
          };
        } else {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ type: 'error', message: result.error.message }),
          };
        }
      }

      if (body.action === 'ping') {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ type: 'pong' }),
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true }),
      };
    }

    // DELETE /poll/disconnect - Clean disconnect
    if (path.endsWith('/disconnect') && method === 'POST') {
      const connectionId = event.headers['x-connection-id'];
      if (connectionId) {
        const connection = await repository.getConnection(connectionId);
        if (connection?.gameCode && connection?.playerId) {
          // Mark player as disconnected
          await repository.updatePlayerConnection(
            connection.gameCode,
            connection.playerId,
            undefined,
            false
          );
        }
        await repository.deleteConnection(connectionId);
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Polling handler error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
