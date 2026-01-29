import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from '@aws-sdk/client-apigatewaymanagementapi';
import type { ServerMessage, ConnectionEntity } from '@snakes-and-ladders/shared';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Repository } from '../db/repository.js';

import { BroadcastService } from './broadcast.service.js';

// Mock the API Gateway Management API client
vi.mock('@aws-sdk/client-apigatewaymanagementapi', () => ({
  ApiGatewayManagementApiClient: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  PostToConnectionCommand: vi.fn(),
  GoneException: class GoneException extends Error {
    name = 'GoneException';
    constructor(message?: string) {
      super(message);
    }
  },
}));

// Mock repository
vi.mock('../db/repository.js');

describe('BroadcastService', () => {
  let broadcastService: BroadcastService;
  let mockApiSend: ReturnType<typeof vi.fn>;
  let mockRepository: {
    getGameConnections: ReturnType<typeof vi.fn>;
    deleteConnection: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiSend = vi.fn();
    (ApiGatewayManagementApiClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => ({
        send: mockApiSend,
      })
    );

    mockRepository = {
      getGameConnections: vi.fn(),
      deleteConnection: vi.fn(),
    };

    broadcastService = new BroadcastService({
      repository: mockRepository as unknown as Repository,
      endpoint: 'https://test.execute-api.us-east-1.amazonaws.com/prod',
    });
  });

  describe('constructor', () => {
    it('should create a broadcast service with config', () => {
      const service = new BroadcastService({
        repository: mockRepository as unknown as Repository,
        endpoint: 'https://api.example.com',
      });
      expect(service).toBeInstanceOf(BroadcastService);
    });
  });

  describe('sendToConnection', () => {
    const testMessage: ServerMessage = {
      type: 'gameState',
      game: {
        code: 'ABC123',
        status: 'waiting',
        creatorId: 'player-1',
        board: { size: 100, snakesAndLadders: [] },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      players: [],
    };

    it('should send message to connection successfully', async () => {
      mockApiSend.mockResolvedValue({});

      const result = await broadcastService.sendToConnection('conn-123', testMessage);

      expect(result).toBe(true);
      expect(PostToConnectionCommand).toHaveBeenCalledWith({
        ConnectionId: 'conn-123',
        Data: Buffer.from(JSON.stringify(testMessage)),
      });
    });

    it('should handle GoneException by cleaning up stale connection', async () => {
      const goneError = new GoneException({ message: 'Connection is gone', $metadata: {} });
      mockApiSend.mockRejectedValue(goneError);
      mockRepository.deleteConnection.mockResolvedValue(undefined);

      const result = await broadcastService.sendToConnection('conn-123', testMessage);

      expect(result).toBe(false);
      expect(mockRepository.deleteConnection).toHaveBeenCalledWith('conn-123');
    });

    it('should rethrow non-GoneException errors', async () => {
      const error = new Error('Network error');
      mockApiSend.mockRejectedValue(error);

      await expect(broadcastService.sendToConnection('conn-123', testMessage)).rejects.toThrow(
        'Network error'
      );
      expect(mockRepository.deleteConnection).not.toHaveBeenCalled();
    });

    it('should send different message types', async () => {
      mockApiSend.mockResolvedValue({});

      const playerJoinedMessage: ServerMessage = {
        type: 'playerJoined',
        player: {
          id: 'player-1',
          gameCode: 'ABC123',
          name: 'TestPlayer',
          color: '#FF0000',
          position: 0,
          isConnected: true,
          joinedAt: '2024-01-01T00:00:00Z',
        },
      };

      const result = await broadcastService.sendToConnection('conn-123', playerJoinedMessage);

      expect(result).toBe(true);
      expect(PostToConnectionCommand).toHaveBeenCalledWith({
        ConnectionId: 'conn-123',
        Data: Buffer.from(JSON.stringify(playerJoinedMessage)),
      });
    });
  });

  describe('broadcastToGame', () => {
    const testMessage: ServerMessage = {
      type: 'gameStarted',
      game: {
        code: 'ABC123',
        status: 'playing',
        creatorId: 'player-1',
        board: { size: 100, snakesAndLadders: [] },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };

    it('should broadcast message to all game connections', async () => {
      const connections: ConnectionEntity[] = [
        {
          PK: 'CONNECTION#conn-1',
          SK: 'METADATA',
          connectionId: 'conn-1',
          gameCode: 'ABC123',
          playerId: 'player-1',
          connectedAt: '2024-01-01T00:00:00Z',
          GSI1PK: 'GAME#ABC123',
          GSI1SK: 'CONNECTION#conn-1',
        },
        {
          PK: 'CONNECTION#conn-2',
          SK: 'METADATA',
          connectionId: 'conn-2',
          gameCode: 'ABC123',
          playerId: 'player-2',
          connectedAt: '2024-01-01T00:00:01Z',
          GSI1PK: 'GAME#ABC123',
          GSI1SK: 'CONNECTION#conn-2',
        },
      ];
      mockRepository.getGameConnections.mockResolvedValue(connections);
      mockApiSend.mockResolvedValue({});

      await broadcastService.broadcastToGame('ABC123', testMessage);

      expect(mockRepository.getGameConnections).toHaveBeenCalledWith('ABC123');
      expect(PostToConnectionCommand).toHaveBeenCalledTimes(2);
    });

    it('should exclude specified connection from broadcast', async () => {
      const connections: ConnectionEntity[] = [
        {
          PK: 'CONNECTION#conn-1',
          SK: 'METADATA',
          connectionId: 'conn-1',
          gameCode: 'ABC123',
          playerId: 'player-1',
          connectedAt: '2024-01-01T00:00:00Z',
          GSI1PK: 'GAME#ABC123',
          GSI1SK: 'CONNECTION#conn-1',
        },
        {
          PK: 'CONNECTION#conn-2',
          SK: 'METADATA',
          connectionId: 'conn-2',
          gameCode: 'ABC123',
          playerId: 'player-2',
          connectedAt: '2024-01-01T00:00:01Z',
          GSI1PK: 'GAME#ABC123',
          GSI1SK: 'CONNECTION#conn-2',
        },
      ];
      mockRepository.getGameConnections.mockResolvedValue(connections);
      mockApiSend.mockResolvedValue({});

      await broadcastService.broadcastToGame('ABC123', testMessage, 'conn-1');

      expect(PostToConnectionCommand).toHaveBeenCalledTimes(1);
      expect(PostToConnectionCommand).toHaveBeenCalledWith({
        ConnectionId: 'conn-2',
        Data: Buffer.from(JSON.stringify(testMessage)),
      });
    });

    it('should handle empty connections list', async () => {
      mockRepository.getGameConnections.mockResolvedValue([]);

      await broadcastService.broadcastToGame('ABC123', testMessage);

      expect(mockRepository.getGameConnections).toHaveBeenCalledWith('ABC123');
      expect(PostToConnectionCommand).not.toHaveBeenCalled();
    });

    it('should continue broadcasting even when some connections fail', async () => {
      const connections: ConnectionEntity[] = [
        {
          PK: 'CONNECTION#conn-1',
          SK: 'METADATA',
          connectionId: 'conn-1',
          gameCode: 'ABC123',
          playerId: 'player-1',
          connectedAt: '2024-01-01T00:00:00Z',
          GSI1PK: 'GAME#ABC123',
          GSI1SK: 'CONNECTION#conn-1',
        },
        {
          PK: 'CONNECTION#conn-2',
          SK: 'METADATA',
          connectionId: 'conn-2',
          gameCode: 'ABC123',
          playerId: 'player-2',
          connectedAt: '2024-01-01T00:00:01Z',
          GSI1PK: 'GAME#ABC123',
          GSI1SK: 'CONNECTION#conn-2',
        },
      ];
      mockRepository.getGameConnections.mockResolvedValue(connections);

      // First call succeeds, second fails with GoneException
      mockApiSend
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new GoneException({ message: 'Connection is gone', $metadata: {} }));
      mockRepository.deleteConnection.mockResolvedValue(undefined);

      // Should not throw even though one connection failed
      await broadcastService.broadcastToGame('ABC123', testMessage);

      expect(PostToConnectionCommand).toHaveBeenCalledTimes(2);
      expect(mockRepository.deleteConnection).toHaveBeenCalledWith('conn-2');
    });
  });

  describe('broadcastToAll', () => {
    const testMessage: ServerMessage = {
      type: 'playerMoved',
      playerId: 'player-1',
      playerName: 'TestPlayer',
      diceRoll: 5,
      previousPosition: 10,
      newPosition: 15,
    };

    it('should send message to all specified connections', async () => {
      mockApiSend.mockResolvedValue({});

      const result = await broadcastService.broadcastToAll(
        ['conn-1', 'conn-2', 'conn-3'],
        testMessage
      );

      expect(result.successful).toEqual(['conn-1', 'conn-2', 'conn-3']);
      expect(result.failed).toEqual([]);
      expect(PostToConnectionCommand).toHaveBeenCalledTimes(3);
    });

    it('should track failed connections separately', async () => {
      mockApiSend
        .mockResolvedValueOnce({}) // conn-1 succeeds
        .mockRejectedValueOnce(new GoneException({ message: 'Gone', $metadata: {} })) // conn-2 fails
        .mockResolvedValueOnce({}); // conn-3 succeeds
      mockRepository.deleteConnection.mockResolvedValue(undefined);

      const result = await broadcastService.broadcastToAll(
        ['conn-1', 'conn-2', 'conn-3'],
        testMessage
      );

      expect(result.successful).toEqual(['conn-1', 'conn-3']);
      expect(result.failed).toEqual(['conn-2']);
    });

    it('should handle empty connection list', async () => {
      const result = await broadcastService.broadcastToAll([], testMessage);

      expect(result.successful).toEqual([]);
      expect(result.failed).toEqual([]);
      expect(PostToConnectionCommand).not.toHaveBeenCalled();
    });

    it('should handle all connections failing', async () => {
      mockApiSend.mockRejectedValue(new GoneException({ message: 'Gone', $metadata: {} }));
      mockRepository.deleteConnection.mockResolvedValue(undefined);

      const result = await broadcastService.broadcastToAll(['conn-1', 'conn-2'], testMessage);

      expect(result.successful).toEqual([]);
      expect(result.failed).toEqual(['conn-1', 'conn-2']);
    });

    it('should clean up stale connections when GoneException occurs', async () => {
      mockApiSend.mockRejectedValue(new GoneException({ message: 'Gone', $metadata: {} }));
      mockRepository.deleteConnection.mockResolvedValue(undefined);

      await broadcastService.broadcastToAll(['conn-1', 'conn-2'], testMessage);

      expect(mockRepository.deleteConnection).toHaveBeenCalledWith('conn-1');
      expect(mockRepository.deleteConnection).toHaveBeenCalledWith('conn-2');
    });
  });
});
