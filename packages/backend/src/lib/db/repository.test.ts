import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { GameEntity, PlayerEntity, ConnectionEntity } from '@snakes-and-ladders/shared';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Repository } from './repository.js';

// Mock the DynamoDB client
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn().mockImplementation(() => ({
      send: vi.fn(),
    })),
  },
  GetCommand: vi.fn(),
  PutCommand: vi.fn(),
  DeleteCommand: vi.fn(),
  QueryCommand: vi.fn(),
  UpdateCommand: vi.fn(),
}));

describe('Repository', () => {
  let repository: Repository;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend = vi.fn();
    (DynamoDBDocumentClient.from as ReturnType<typeof vi.fn>).mockReturnValue({
      send: mockSend,
    });
    repository = new Repository({ tableName: 'test-table' });
  });

  describe('constructor', () => {
    it('should create a repository with table name', () => {
      const repo = new Repository({ tableName: 'my-table' });
      expect(repo).toBeInstanceOf(Repository);
    });

    it('should accept custom client config', () => {
      const repo = new Repository({
        tableName: 'my-table',
        clientConfig: { region: 'us-west-2' },
      });
      expect(repo).toBeInstanceOf(Repository);
    });
  });

  describe('Game operations', () => {
    describe('getGame', () => {
      it('should return game when found', async () => {
        const mockGame: GameEntity = {
          PK: 'GAME#ABC123',
          SK: 'METADATA',
          code: 'ABC123',
          status: 'waiting',
          creatorId: 'player-1',
          board: { size: 100, snakesAndLadders: [] },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          GSI1PK: 'GAMES',
          GSI1SK: '2024-01-01T00:00:00Z',
        };
        mockSend.mockResolvedValue({ Item: mockGame });

        const result = await repository.getGame('ABC123');

        expect(result).toEqual(mockGame);
        expect(GetCommand).toHaveBeenCalledWith({
          TableName: 'test-table',
          Key: { PK: 'GAME#ABC123', SK: 'METADATA' },
        });
      });

      it('should return null when game not found', async () => {
        mockSend.mockResolvedValue({});

        const result = await repository.getGame('NOTFOUND');

        expect(result).toBeNull();
      });
    });

    describe('putGame', () => {
      it('should save a game entity', async () => {
        const game: GameEntity = {
          PK: 'GAME#ABC123',
          SK: 'METADATA',
          code: 'ABC123',
          status: 'waiting',
          creatorId: 'player-1',
          board: { size: 100, snakesAndLadders: [] },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          GSI1PK: 'GAMES',
          GSI1SK: '2024-01-01T00:00:00Z',
        };
        mockSend.mockResolvedValue({});

        await repository.putGame(game);

        expect(PutCommand).toHaveBeenCalledWith({
          TableName: 'test-table',
          Item: game,
        });
        expect(mockSend).toHaveBeenCalledTimes(1);
      });
    });

    describe('updateGameStatus', () => {
      it('should update game status without winner', async () => {
        mockSend.mockResolvedValue({});

        await repository.updateGameStatus('ABC123', 'playing');

        expect(UpdateCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            TableName: 'test-table',
            Key: { PK: 'GAME#ABC123', SK: 'METADATA' },
            UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
            ExpressionAttributeNames: { '#status': 'status' },
          })
        );
      });

      it('should update game status with winner', async () => {
        mockSend.mockResolvedValue({});

        await repository.updateGameStatus('ABC123', 'finished', 'player-1');

        expect(UpdateCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            TableName: 'test-table',
            Key: { PK: 'GAME#ABC123', SK: 'METADATA' },
            UpdateExpression: 'SET #status = :status, winnerId = :winnerId, updatedAt = :updatedAt',
            ExpressionAttributeNames: { '#status': 'status' },
          })
        );
      });
    });
  });

  describe('Player operations', () => {
    describe('getPlayer', () => {
      it('should return player when found', async () => {
        const mockPlayer: PlayerEntity = {
          PK: 'GAME#ABC123',
          SK: 'PLAYER#player-1',
          id: 'player-1',
          gameCode: 'ABC123',
          name: 'TestPlayer',
          color: '#FF0000',
          position: 5,
          isConnected: true,
          joinedAt: '2024-01-01T00:00:00Z',
          GSI1PK: 'PLAYER#player-1',
          GSI1SK: 'ABC123',
        };
        mockSend.mockResolvedValue({ Item: mockPlayer });

        const result = await repository.getPlayer('ABC123', 'player-1');

        expect(result).toEqual(mockPlayer);
        expect(GetCommand).toHaveBeenCalledWith({
          TableName: 'test-table',
          Key: { PK: 'GAME#ABC123', SK: 'PLAYER#player-1' },
        });
      });

      it('should return null when player not found', async () => {
        mockSend.mockResolvedValue({});

        const result = await repository.getPlayer('ABC123', 'notfound');

        expect(result).toBeNull();
      });
    });

    describe('putPlayer', () => {
      it('should save a player entity', async () => {
        const player: PlayerEntity = {
          PK: 'GAME#ABC123',
          SK: 'PLAYER#player-1',
          id: 'player-1',
          gameCode: 'ABC123',
          name: 'TestPlayer',
          color: '#FF0000',
          position: 0,
          isConnected: true,
          joinedAt: '2024-01-01T00:00:00Z',
          GSI1PK: 'PLAYER#player-1',
          GSI1SK: 'ABC123',
        };
        mockSend.mockResolvedValue({});

        await repository.putPlayer(player);

        expect(PutCommand).toHaveBeenCalledWith({
          TableName: 'test-table',
          Item: player,
        });
      });
    });

    describe('updatePlayerPosition', () => {
      it('should update player position', async () => {
        mockSend.mockResolvedValue({});

        await repository.updatePlayerPosition('ABC123', 'player-1', 25);

        expect(UpdateCommand).toHaveBeenCalledWith({
          TableName: 'test-table',
          Key: { PK: 'GAME#ABC123', SK: 'PLAYER#player-1' },
          UpdateExpression: 'SET #position = :position',
          ExpressionAttributeNames: { '#position': 'position' },
          ExpressionAttributeValues: { ':position': 25 },
        });
      });
    });

    describe('updatePlayerConnection', () => {
      it('should update player connection when connected', async () => {
        mockSend.mockResolvedValue({});

        await repository.updatePlayerConnection('ABC123', 'player-1', 'conn-123', true);

        expect(UpdateCommand).toHaveBeenCalledWith({
          TableName: 'test-table',
          Key: { PK: 'GAME#ABC123', SK: 'PLAYER#player-1' },
          UpdateExpression: 'SET connectionId = :connectionId, isConnected = :isConnected',
          ExpressionAttributeValues: {
            ':connectionId': 'conn-123',
            ':isConnected': true,
          },
        });
      });

      it('should update player connection when disconnected', async () => {
        mockSend.mockResolvedValue({});

        await repository.updatePlayerConnection('ABC123', 'player-1', undefined, false);

        expect(UpdateCommand).toHaveBeenCalledWith({
          TableName: 'test-table',
          Key: { PK: 'GAME#ABC123', SK: 'PLAYER#player-1' },
          UpdateExpression: 'SET connectionId = :connectionId, isConnected = :isConnected',
          ExpressionAttributeValues: {
            ':connectionId': undefined,
            ':isConnected': false,
          },
        });
      });
    });

    describe('getGamePlayers', () => {
      it('should return all players for a game', async () => {
        const mockPlayers: PlayerEntity[] = [
          {
            PK: 'GAME#ABC123',
            SK: 'PLAYER#player-1',
            id: 'player-1',
            gameCode: 'ABC123',
            name: 'Player1',
            color: '#FF0000',
            position: 0,
            isConnected: true,
            joinedAt: '2024-01-01T00:00:00Z',
            GSI1PK: 'PLAYER#player-1',
            GSI1SK: 'ABC123',
          },
          {
            PK: 'GAME#ABC123',
            SK: 'PLAYER#player-2',
            id: 'player-2',
            gameCode: 'ABC123',
            name: 'Player2',
            color: '#00FF00',
            position: 5,
            isConnected: true,
            joinedAt: '2024-01-01T00:00:01Z',
            GSI1PK: 'PLAYER#player-2',
            GSI1SK: 'ABC123',
          },
        ];
        mockSend.mockResolvedValue({ Items: mockPlayers });

        const result = await repository.getGamePlayers('ABC123');

        expect(result).toEqual(mockPlayers);
        expect(QueryCommand).toHaveBeenCalledWith({
          TableName: 'test-table',
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': 'GAME#ABC123',
            ':sk': 'PLAYER#',
          },
        });
      });

      it('should return empty array when no players found', async () => {
        mockSend.mockResolvedValue({});

        const result = await repository.getGamePlayers('EMPTY');

        expect(result).toEqual([]);
      });
    });

    describe('deletePlayer', () => {
      it('should delete a player', async () => {
        mockSend.mockResolvedValue({});

        await repository.deletePlayer('ABC123', 'player-1');

        expect(DeleteCommand).toHaveBeenCalledWith({
          TableName: 'test-table',
          Key: { PK: 'GAME#ABC123', SK: 'PLAYER#player-1' },
        });
      });
    });
  });

  describe('Connection operations', () => {
    describe('getConnection', () => {
      it('should return connection when found', async () => {
        const mockConnection: ConnectionEntity = {
          PK: 'CONNECTION#conn-123',
          SK: 'METADATA',
          connectionId: 'conn-123',
          connectedAt: '2024-01-01T00:00:00Z',
          TTL: 1704153600,
        };
        mockSend.mockResolvedValue({ Item: mockConnection });

        const result = await repository.getConnection('conn-123');

        expect(result).toEqual(mockConnection);
        expect(GetCommand).toHaveBeenCalledWith({
          TableName: 'test-table',
          Key: { PK: 'CONNECTION#conn-123', SK: 'METADATA' },
        });
      });

      it('should return null when connection not found', async () => {
        mockSend.mockResolvedValue({});

        const result = await repository.getConnection('notfound');

        expect(result).toBeNull();
      });
    });

    describe('putConnection', () => {
      it('should save a connection entity', async () => {
        const connection: ConnectionEntity = {
          PK: 'CONNECTION#conn-123',
          SK: 'METADATA',
          connectionId: 'conn-123',
          connectedAt: '2024-01-01T00:00:00Z',
          TTL: 1704153600,
        };
        mockSend.mockResolvedValue({});

        await repository.putConnection(connection);

        expect(PutCommand).toHaveBeenCalledWith({
          TableName: 'test-table',
          Item: connection,
        });
      });
    });

    describe('updateConnectionGame', () => {
      it('should update connection with game info', async () => {
        mockSend.mockResolvedValue({});

        await repository.updateConnectionGame('conn-123', 'ABC123', 'player-1');

        expect(UpdateCommand).toHaveBeenCalledWith({
          TableName: 'test-table',
          Key: { PK: 'CONNECTION#conn-123', SK: 'METADATA' },
          UpdateExpression:
            'SET gameCode = :gameCode, playerId = :playerId, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk',
          ExpressionAttributeValues: {
            ':gameCode': 'ABC123',
            ':playerId': 'player-1',
            ':gsi1pk': 'GAME#ABC123',
            ':gsi1sk': 'CONNECTION#conn-123',
          },
        });
      });
    });

    describe('deleteConnection', () => {
      it('should delete a connection', async () => {
        mockSend.mockResolvedValue({});

        await repository.deleteConnection('conn-123');

        expect(DeleteCommand).toHaveBeenCalledWith({
          TableName: 'test-table',
          Key: { PK: 'CONNECTION#conn-123', SK: 'METADATA' },
        });
      });
    });

    describe('getGameConnections', () => {
      it('should return all connections for a game', async () => {
        const mockConnections: ConnectionEntity[] = [
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
        mockSend.mockResolvedValue({ Items: mockConnections });

        const result = await repository.getGameConnections('ABC123');

        expect(result).toEqual(mockConnections);
        expect(QueryCommand).toHaveBeenCalledWith({
          TableName: 'test-table',
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': 'GAME#ABC123',
            ':sk': 'CONNECTION#',
          },
        });
      });

      it('should return empty array when no connections found', async () => {
        mockSend.mockResolvedValue({});

        const result = await repository.getGameConnections('EMPTY');

        expect(result).toEqual([]);
      });
    });
  });
});
