import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import { Repository, ConnectionService } from '../lib/index.js';

const tableName = process.env.TABLE_NAME!;
const repository = new Repository({ tableName });
const connectionService = new ConnectionService({ repository });

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    await connectionService.handleConnect(connectionId);

    return {
      statusCode: 200,
      body: 'Connected',
    };
  } catch (error) {
    console.error('Connection error:', error);
    return {
      statusCode: 500,
      body: 'Failed to connect',
    };
  }
};
