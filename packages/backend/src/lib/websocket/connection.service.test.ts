import type { ConnectionEntity } from '@snakes-and-ladders/shared';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Repository } from '../db/repository.js';

import { ConnectionService } from './connection.service.js';

// Mock repository
vi.mock('../db/repository.js');

describe('ConnectionService', () => {
  let connectionService: ConnectionService;
  let mockRepository: {
    getConnection: ReturnType<typeof vi.fn>;
    putConnection: ReturnType<typeof vi.fn>;
    deleteConnection: ReturnType<typeof vi.fn>;
    updateConnectionGame: ReturnType<typeof vi.fn>;
    updatePlayerConnection: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));

    mockRepository = {
      getConnection: vi.fn(),
      putConnection: vi.fn(),
      deleteConnection: vi.fn(),
      updateConnectionGame: vi.fn(),
      updatePlayerConnection: vi.fn(),
    };

    connectionService = new ConnectionService({
      repository: mockRepository as unknown as Repository,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create a connection service', () => {
      const service = new ConnectionService({
        repository: mockRepository as unknown as Repository,
      });
      expect(service).toBeInstanceOf(ConnectionService);
    });
  });

  describe('handleConnect', () => {
    it('should create a new connection entity', async () => {
      mockRepository.putConnection.mockResolvedValue(undefined);

      await connectionService.handleConnect('conn-123');

      expect(mockRepository.putConnection).toHaveBeenCalledTimes(1);
      const savedConnection = mockRepository.putConnection.mock.calls[0][0] as ConnectionEntity;

      expect(savedConnection).toMatchObject({
        PK: 'CONNECTION#conn-123',
        SK: 'METADATA',
        connectionId: 'conn-123',
        connectedAt: '2024-01-01T12:00:00.000Z',
      });
    });

    it('should set TTL to 24 hours from now', async () => {
      mockRepository.putConnection.mockResolvedValue(undefined);

      await connectionService.handleConnect('conn-123');

      const savedConnection = mockRepository.putConnection.mock.calls[0][0] as ConnectionEntity;
      const expectedTTL =
        Math.floor(new Date('2024-01-01T12:00:00Z').getTime() / 1000) + 24 * 60 * 60;

      expect(savedConnection.TTL).toBe(expectedTTL);
    });

    it('should handle different connection IDs', async () => {
      mockRepository.putConnection.mockResolvedValue(undefined);

      await connectionService.handleConnect('unique-conn-abc123');

      const savedConnection = mockRepository.putConnection.mock.calls[0][0] as ConnectionEntity;
      expect(savedConnection.connectionId).toBe('unique-conn-abc123');
      expect(savedConnection.PK).toBe('CONNECTION#unique-conn-abc123');
    });
  });

  describe('handleDisconnect', () => {
    it('should return empty object when connection not found', async () => {
      mockRepository.getConnection.mockResolvedValue(null);

      const result = await connectionService.handleDisconnect('conn-notfound');

      expect(result).toEqual({});
      expect(mockRepository.deleteConnection).not.toHaveBeenCalled();
      expect(mockRepository.updatePlayerConnection).not.toHaveBeenCalled();
    });

    it('should delete connection when found without game association', async () => {
      const connection: ConnectionEntity = {
        PK: 'CONNECTION#conn-123',
        SK: 'METADATA',
        connectionId: 'conn-123',
        connectedAt: '2024-01-01T10:00:00Z',
      };
      mockRepository.getConnection.mockResolvedValue(connection);
      mockRepository.deleteConnection.mockResolvedValue(undefined);

      const result = await connectionService.handleDisconnect('conn-123');

      expect(result).toEqual({});
      expect(mockRepository.deleteConnection).toHaveBeenCalledWith('conn-123');
      expect(mockRepository.updatePlayerConnection).not.toHaveBeenCalled();
    });

    it('should update player connection status when connection has game association', async () => {
      const connection: ConnectionEntity = {
        PK: 'CONNECTION#conn-123',
        SK: 'METADATA',
        connectionId: 'conn-123',
        gameCode: 'ABC123',
        playerId: 'player-1',
        connectedAt: '2024-01-01T10:00:00Z',
        GSI1PK: 'GAME#ABC123',
        GSI1SK: 'CONNECTION#conn-123',
      };
      mockRepository.getConnection.mockResolvedValue(connection);
      mockRepository.updatePlayerConnection.mockResolvedValue(undefined);
      mockRepository.deleteConnection.mockResolvedValue(undefined);

      const result = await connectionService.handleDisconnect('conn-123');

      expect(result).toEqual({
        gameCode: 'ABC123',
        playerId: 'player-1',
      });
      expect(mockRepository.updatePlayerConnection).toHaveBeenCalledWith(
        'ABC123',
        'player-1',
        undefined,
        false
      );
      expect(mockRepository.deleteConnection).toHaveBeenCalledWith('conn-123');
    });

    it('should return gameCode and playerId from connection', async () => {
      const connection: ConnectionEntity = {
        PK: 'CONNECTION#conn-456',
        SK: 'METADATA',
        connectionId: 'conn-456',
        gameCode: 'XYZ789',
        playerId: 'player-99',
        connectedAt: '2024-01-01T10:00:00Z',
        GSI1PK: 'GAME#XYZ789',
        GSI1SK: 'CONNECTION#conn-456',
      };
      mockRepository.getConnection.mockResolvedValue(connection);
      mockRepository.updatePlayerConnection.mockResolvedValue(undefined);
      mockRepository.deleteConnection.mockResolvedValue(undefined);

      const result = await connectionService.handleDisconnect('conn-456');

      expect(result.gameCode).toBe('XYZ789');
      expect(result.playerId).toBe('player-99');
    });

    it('should not update player connection when only gameCode is present (no playerId)', async () => {
      const connection: ConnectionEntity = {
        PK: 'CONNECTION#conn-123',
        SK: 'METADATA',
        connectionId: 'conn-123',
        gameCode: 'ABC123',
        // playerId is undefined
        connectedAt: '2024-01-01T10:00:00Z',
      };
      mockRepository.getConnection.mockResolvedValue(connection);
      mockRepository.deleteConnection.mockResolvedValue(undefined);

      const result = await connectionService.handleDisconnect('conn-123');

      expect(result.gameCode).toBe('ABC123');
      expect(result.playerId).toBeUndefined();
      expect(mockRepository.updatePlayerConnection).not.toHaveBeenCalled();
      expect(mockRepository.deleteConnection).toHaveBeenCalledWith('conn-123');
    });

    it('should not update player connection when only playerId is present (no gameCode)', async () => {
      const connection: ConnectionEntity = {
        PK: 'CONNECTION#conn-123',
        SK: 'METADATA',
        connectionId: 'conn-123',
        // gameCode is undefined
        playerId: 'player-1',
        connectedAt: '2024-01-01T10:00:00Z',
      };
      mockRepository.getConnection.mockResolvedValue(connection);
      mockRepository.deleteConnection.mockResolvedValue(undefined);

      const result = await connectionService.handleDisconnect('conn-123');

      expect(result.gameCode).toBeUndefined();
      expect(result.playerId).toBe('player-1');
      expect(mockRepository.updatePlayerConnection).not.toHaveBeenCalled();
      expect(mockRepository.deleteConnection).toHaveBeenCalledWith('conn-123');
    });
  });

  describe('linkToGame', () => {
    it('should update both connection and player records', async () => {
      mockRepository.updateConnectionGame.mockResolvedValue(undefined);
      mockRepository.updatePlayerConnection.mockResolvedValue(undefined);

      await connectionService.linkToGame('conn-123', 'ABC123', 'player-1');

      expect(mockRepository.updateConnectionGame).toHaveBeenCalledWith(
        'conn-123',
        'ABC123',
        'player-1'
      );
      expect(mockRepository.updatePlayerConnection).toHaveBeenCalledWith(
        'ABC123',
        'player-1',
        'conn-123',
        true
      );
    });

    it('should update connection game first, then player connection', async () => {
      const callOrder: string[] = [];
      mockRepository.updateConnectionGame.mockImplementation(() => {
        callOrder.push('updateConnectionGame');
        return Promise.resolve();
      });
      mockRepository.updatePlayerConnection.mockImplementation(() => {
        callOrder.push('updatePlayerConnection');
        return Promise.resolve();
      });

      await connectionService.linkToGame('conn-123', 'GAME1', 'player-A');

      expect(callOrder).toEqual(['updateConnectionGame', 'updatePlayerConnection']);
    });

    it('should work with different game codes and player IDs', async () => {
      mockRepository.updateConnectionGame.mockResolvedValue(undefined);
      mockRepository.updatePlayerConnection.mockResolvedValue(undefined);

      await connectionService.linkToGame('conn-xyz', 'MYGAME', 'player-42');

      expect(mockRepository.updateConnectionGame).toHaveBeenCalledWith(
        'conn-xyz',
        'MYGAME',
        'player-42'
      );
      expect(mockRepository.updatePlayerConnection).toHaveBeenCalledWith(
        'MYGAME',
        'player-42',
        'conn-xyz',
        true
      );
    });
  });

  describe('getConnection', () => {
    it('should return connection when found', async () => {
      const connection: ConnectionEntity = {
        PK: 'CONNECTION#conn-123',
        SK: 'METADATA',
        connectionId: 'conn-123',
        connectedAt: '2024-01-01T10:00:00Z',
      };
      mockRepository.getConnection.mockResolvedValue(connection);

      const result = await connectionService.getConnection('conn-123');

      expect(result).toEqual(connection);
      expect(mockRepository.getConnection).toHaveBeenCalledWith('conn-123');
    });

    it('should return null when connection not found', async () => {
      mockRepository.getConnection.mockResolvedValue(null);

      const result = await connectionService.getConnection('conn-notfound');

      expect(result).toBeNull();
      expect(mockRepository.getConnection).toHaveBeenCalledWith('conn-notfound');
    });

    it('should return connection with game association', async () => {
      const connection: ConnectionEntity = {
        PK: 'CONNECTION#conn-456',
        SK: 'METADATA',
        connectionId: 'conn-456',
        gameCode: 'ABC123',
        playerId: 'player-1',
        connectedAt: '2024-01-01T10:00:00Z',
        GSI1PK: 'GAME#ABC123',
        GSI1SK: 'CONNECTION#conn-456',
      };
      mockRepository.getConnection.mockResolvedValue(connection);

      const result = await connectionService.getConnection('conn-456');

      expect(result).toEqual(connection);
      expect(result?.gameCode).toBe('ABC123');
      expect(result?.playerId).toBe('player-1');
    });
  });
});
