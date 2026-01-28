import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from '@aws-sdk/client-apigatewaymanagementapi';
import type { ServerMessage } from '@snakes-and-ladders/shared';

import { Repository } from '../db/repository.js';

export interface BroadcastServiceConfig {
  repository: Repository;
  endpoint: string;
}

export class BroadcastService {
  private repository: Repository;
  private apiClient: ApiGatewayManagementApiClient;

  constructor(config: BroadcastServiceConfig) {
    this.repository = config.repository;
    this.apiClient = new ApiGatewayManagementApiClient({
      endpoint: config.endpoint,
    });
  }

  async sendToConnection(connectionId: string, message: ServerMessage): Promise<boolean> {
    try {
      await this.apiClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(JSON.stringify(message)),
        })
      );
      return true;
    } catch (error) {
      if (error instanceof GoneException) {
        // Connection is stale, clean it up
        await this.repository.deleteConnection(connectionId);
        return false;
      }
      throw error;
    }
  }

  async broadcastToGame(
    gameCode: string,
    message: ServerMessage,
    excludeConnectionId?: string
  ): Promise<void> {
    const connections = await this.repository.getGameConnections(gameCode);

    const sendPromises = connections
      .filter((conn) => conn.connectionId !== excludeConnectionId)
      .map((conn) => this.sendToConnection(conn.connectionId, message));

    await Promise.all(sendPromises);
  }

  async broadcastToAll(
    connectionIds: string[],
    message: ServerMessage
  ): Promise<{ successful: string[]; failed: string[] }> {
    const results = await Promise.all(
      connectionIds.map(async (connectionId) => ({
        connectionId,
        success: await this.sendToConnection(connectionId, message),
      }))
    );

    return {
      successful: results.filter((r) => r.success).map((r) => r.connectionId),
      failed: results.filter((r) => !r.success).map((r) => r.connectionId),
    };
  }
}
