import type { ConnectionEntity } from '@snakes-and-ladders/shared';

import { Repository } from '../db/repository.js';

export interface ConnectionServiceConfig {
  repository: Repository;
}

export class ConnectionService {
  private repository: Repository;

  constructor(config: ConnectionServiceConfig) {
    this.repository = config.repository;
  }

  async handleConnect(connectionId: string): Promise<void> {
    const now = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours

    const connection: ConnectionEntity = {
      PK: `CONNECTION#${connectionId}`,
      SK: 'METADATA',
      connectionId,
      connectedAt: now,
      TTL: ttl,
    };

    await this.repository.putConnection(connection);
  }

  async handleDisconnect(connectionId: string): Promise<{ gameCode?: string; playerId?: string }> {
    const connection = await this.repository.getConnection(connectionId);

    if (!connection) {
      return {};
    }

    // Update player as disconnected if they were in a game
    if (connection.gameCode && connection.playerId) {
      await this.repository.updatePlayerConnection(
        connection.gameCode,
        connection.playerId,
        undefined,
        false
      );
    }

    await this.repository.deleteConnection(connectionId);

    return {
      gameCode: connection.gameCode,
      playerId: connection.playerId,
    };
  }

  async linkToGame(connectionId: string, gameCode: string, playerId: string): Promise<void> {
    await this.repository.updateConnectionGame(connectionId, gameCode, playerId);
    await this.repository.updatePlayerConnection(gameCode, playerId, connectionId, true);
  }

  async getConnection(connectionId: string): Promise<ConnectionEntity | null> {
    return this.repository.getConnection(connectionId);
  }
}
