import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  GameEntity,
  PlayerEntity,
  ConnectionEntity,
  MoveEntity,
} from '@snakes-and-ladders/shared';

export interface RepositoryConfig {
  tableName: string;
  clientConfig?: DynamoDBClientConfig;
}

export class Repository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(config: RepositoryConfig) {
    this.tableName = config.tableName;
    const client = new DynamoDBClient(config.clientConfig ?? {});
    this.docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  // Game operations
  async getGame(code: string): Promise<GameEntity | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `GAME#${code}`, SK: 'METADATA' },
      })
    );
    return (result.Item as GameEntity) ?? null;
  }

  async putGame(game: GameEntity): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: game,
      })
    );
  }

  async updateGameStatus(
    code: string,
    status: GameEntity['status'],
    winnerId?: string
  ): Promise<void> {
    const updateExpression = winnerId
      ? 'SET #status = :status, winnerId = :winnerId, updatedAt = :updatedAt'
      : 'SET #status = :status, updatedAt = :updatedAt';

    const expressionAttributeValues: Record<string, unknown> = {
      ':status': status,
      ':updatedAt': new Date().toISOString(),
    };

    if (winnerId) {
      expressionAttributeValues[':winnerId'] = winnerId;
    }

    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: `GAME#${code}`, SK: 'METADATA' },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );
  }

  // Player operations
  async getPlayer(gameCode: string, playerId: string): Promise<PlayerEntity | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `GAME#${gameCode}`, SK: `PLAYER#${playerId}` },
      })
    );
    return (result.Item as PlayerEntity) ?? null;
  }

  async putPlayer(player: PlayerEntity): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: player,
      })
    );
  }

  async updatePlayerPosition(gameCode: string, playerId: string, position: number): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: `GAME#${gameCode}`, SK: `PLAYER#${playerId}` },
        UpdateExpression: 'SET #position = :position',
        ExpressionAttributeNames: { '#position': 'position' },
        ExpressionAttributeValues: { ':position': position },
      })
    );
  }

  async updatePlayerConnection(
    gameCode: string,
    playerId: string,
    connectionId: string | undefined,
    isConnected: boolean
  ): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: `GAME#${gameCode}`, SK: `PLAYER#${playerId}` },
        UpdateExpression: 'SET connectionId = :connectionId, isConnected = :isConnected',
        ExpressionAttributeValues: {
          ':connectionId': connectionId,
          ':isConnected': isConnected,
        },
      })
    );
  }

  async getGamePlayers(gameCode: string): Promise<PlayerEntity[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `GAME#${gameCode}`,
          ':sk': 'PLAYER#',
        },
      })
    );
    return (result.Items as PlayerEntity[]) ?? [];
  }

  async deletePlayer(gameCode: string, playerId: string): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: `GAME#${gameCode}`, SK: `PLAYER#${playerId}` },
      })
    );
  }

  // Connection operations
  async getConnection(connectionId: string): Promise<ConnectionEntity | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `CONNECTION#${connectionId}`, SK: 'METADATA' },
      })
    );
    return (result.Item as ConnectionEntity) ?? null;
  }

  async putConnection(connection: ConnectionEntity): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: connection,
      })
    );
  }

  async updateConnectionGame(
    connectionId: string,
    gameCode: string,
    playerId: string
  ): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: `CONNECTION#${connectionId}`, SK: 'METADATA' },
        UpdateExpression:
          'SET gameCode = :gameCode, playerId = :playerId, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk',
        ExpressionAttributeValues: {
          ':gameCode': gameCode,
          ':playerId': playerId,
          ':gsi1pk': `GAME#${gameCode}`,
          ':gsi1sk': `CONNECTION#${connectionId}`,
        },
      })
    );
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: `CONNECTION#${connectionId}`, SK: 'METADATA' },
      })
    );
  }

  async getGameConnections(gameCode: string): Promise<ConnectionEntity[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `GAME#${gameCode}`,
          ':sk': 'CONNECTION#',
        },
      })
    );
    return (result.Items as ConnectionEntity[]) ?? [];
  }

  // Move operations
  async putMove(move: MoveEntity): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: move,
      })
    );
  }

  async getGameMoves(gameCode: string, limit = 50): Promise<MoveEntity[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `GAME#${gameCode}`,
          ':sk': 'MOVE#',
        },
        ScanIndexForward: false, // Most recent first
        Limit: limit,
      })
    );
    return (result.Items as MoveEntity[]) ?? [];
  }

  // Admin operations
  async getAllGames(): Promise<GameEntity[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'GAMES' },
        ScanIndexForward: false,
      })
    );
    return (result.Items as GameEntity[]) ?? [];
  }
}
