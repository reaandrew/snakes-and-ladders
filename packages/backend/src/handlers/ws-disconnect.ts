import type { PlayerLeftMessage } from '@snakes-and-ladders/shared';
import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import { Repository, ConnectionService, BroadcastService } from '../lib/index.js';

const tableName = process.env.TABLE_NAME!;
const wsEndpoint = process.env.WEBSOCKET_ENDPOINT!;

const repository = new Repository({ tableName });
const connectionService = new ConnectionService({ repository });
const broadcastService = new BroadcastService({ repository, endpoint: wsEndpoint });

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    const { gameCode, playerId } = await connectionService.handleDisconnect(connectionId);

    // Notify other players if this connection was in a game
    if (gameCode && playerId) {
      const player = await repository.getPlayer(gameCode, playerId);
      if (player) {
        const message: PlayerLeftMessage = {
          type: 'playerLeft',
          playerId,
          playerName: player.name,
        };
        await broadcastService.broadcastToGame(gameCode, message);
      }
    }

    return {
      statusCode: 200,
      body: 'Disconnected',
    };
  } catch (error) {
    console.error('Disconnect error:', error);
    return {
      statusCode: 500,
      body: 'Failed to disconnect',
    };
  }
};
