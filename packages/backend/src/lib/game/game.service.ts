import type {
  Game,
  Player,
  GameEntity,
  PlayerEntity,
  DEFAULT_BOARD_CONFIG,
  ErrorCode,
} from '@snakes-and-ladders/shared';
import { ErrorCodes } from '@snakes-and-ladders/shared';
import { nanoid } from 'nanoid';

import { processMove, rollDice } from '../board/board.service.js';
import { Repository } from '../db/repository.js';

export interface GameServiceConfig {
  repository: Repository;
  defaultBoardConfig: typeof DEFAULT_BOARD_CONFIG;
  playerColors: readonly string[];
}

export interface CreateGameResult {
  game: Game;
  player: Player;
}

export interface JoinGameResult {
  game: Game;
  player: Player;
  players: Player[];
}

export interface RollDiceResult {
  diceRoll: number;
  previousPosition: number;
  newPosition: number;
  effect?: { type: 'snake' | 'ladder'; from: number; to: number };
  isWinner: boolean;
}

export interface GameServiceError {
  code: ErrorCode;
  message: string;
}

export type GameServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: GameServiceError };

export class GameService {
  private repository: Repository;
  private defaultBoardConfig: typeof DEFAULT_BOARD_CONFIG;
  private playerColors: readonly string[];

  constructor(config: GameServiceConfig) {
    this.repository = config.repository;
    this.defaultBoardConfig = config.defaultBoardConfig;
    this.playerColors = config.playerColors;
  }

  async createGame(creatorName: string): Promise<GameServiceResult<CreateGameResult>> {
    const gameCode = this.generateGameCode();
    const playerId = nanoid();
    const now = new Date().toISOString();

    const gameEntity: GameEntity = {
      PK: `GAME#${gameCode}`,
      SK: 'METADATA',
      code: gameCode,
      status: 'waiting',
      creatorId: playerId,
      board: this.defaultBoardConfig,
      createdAt: now,
      updatedAt: now,
      GSI1PK: 'GAMES',
      GSI1SK: now,
    };

    const playerEntity: PlayerEntity = {
      PK: `GAME#${gameCode}`,
      SK: `PLAYER#${playerId}`,
      id: playerId,
      gameCode,
      name: creatorName,
      color: this.playerColors[0],
      position: 0,
      isConnected: false,
      joinedAt: now,
      GSI1PK: `PLAYER#${playerId}`,
      GSI1SK: now,
    };

    await this.repository.putGame(gameEntity);
    await this.repository.putPlayer(playerEntity);

    return {
      success: true,
      data: {
        game: this.entityToGame(gameEntity),
        player: this.entityToPlayer(playerEntity),
      },
    };
  }

  async joinGame(gameCode: string, playerName: string): Promise<GameServiceResult<JoinGameResult>> {
    const gameEntity = await this.repository.getGame(gameCode);

    if (!gameEntity) {
      return {
        success: false,
        error: { code: ErrorCodes.GAME_NOT_FOUND, message: 'Game not found' },
      };
    }

    if (gameEntity.status !== 'waiting') {
      return {
        success: false,
        error: { code: ErrorCodes.GAME_ALREADY_STARTED, message: 'Game has already started' },
      };
    }

    const existingPlayers = await this.repository.getGamePlayers(gameCode);

    // Check if player with same name already exists (e.g., creator reconnecting)
    const existingPlayer = existingPlayers.find(
      (p) => p.name?.toLowerCase() === playerName.toLowerCase()
    );
    if (existingPlayer) {
      return {
        success: true,
        data: {
          game: this.entityToGame(gameEntity),
          player: this.entityToPlayer(existingPlayer),
          players: existingPlayers.map((e) => this.entityToPlayer(e)),
        },
      };
    }

    if (existingPlayers.length >= this.playerColors.length) {
      return {
        success: false,
        error: { code: ErrorCodes.GAME_FULL, message: 'Game is full' },
      };
    }

    const playerId = nanoid();
    const now = new Date().toISOString();
    const colorIndex = existingPlayers.length;

    const playerEntity: PlayerEntity = {
      PK: `GAME#${gameCode}`,
      SK: `PLAYER#${playerId}`,
      id: playerId,
      gameCode,
      name: playerName,
      color: this.playerColors[colorIndex],
      position: 0,
      isConnected: false,
      joinedAt: now,
      GSI1PK: `PLAYER#${playerId}`,
      GSI1SK: now,
    };

    await this.repository.putPlayer(playerEntity);

    const allPlayers = [...existingPlayers, playerEntity].map((e) => this.entityToPlayer(e));

    return {
      success: true,
      data: {
        game: this.entityToGame(gameEntity),
        player: this.entityToPlayer(playerEntity),
        players: allPlayers,
      },
    };
  }

  async getGame(gameCode: string): Promise<GameServiceResult<{ game: Game; players: Player[] }>> {
    const gameEntity = await this.repository.getGame(gameCode);

    if (!gameEntity) {
      return {
        success: false,
        error: { code: ErrorCodes.GAME_NOT_FOUND, message: 'Game not found' },
      };
    }

    const playerEntities = await this.repository.getGamePlayers(gameCode);

    return {
      success: true,
      data: {
        game: this.entityToGame(gameEntity),
        players: playerEntities.map((e) => this.entityToPlayer(e)),
      },
    };
  }

  async startGame(gameCode: string, playerId: string): Promise<GameServiceResult<Game>> {
    const gameEntity = await this.repository.getGame(gameCode);

    if (!gameEntity) {
      return {
        success: false,
        error: { code: ErrorCodes.GAME_NOT_FOUND, message: 'Game not found' },
      };
    }

    if (gameEntity.creatorId !== playerId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_GAME_CREATOR,
          message: 'Only the creator can start the game',
        },
      };
    }

    if (gameEntity.status !== 'waiting') {
      return {
        success: false,
        error: { code: ErrorCodes.GAME_ALREADY_STARTED, message: 'Game has already started' },
      };
    }

    await this.repository.updateGameStatus(gameCode, 'playing');

    return {
      success: true,
      data: { ...this.entityToGame(gameEntity), status: 'playing' },
    };
  }

  async rollDice(gameCode: string, playerId: string): Promise<GameServiceResult<RollDiceResult>> {
    const gameEntity = await this.repository.getGame(gameCode);

    if (!gameEntity) {
      return {
        success: false,
        error: { code: ErrorCodes.GAME_NOT_FOUND, message: 'Game not found' },
      };
    }

    if (gameEntity.status !== 'playing') {
      return {
        success: false,
        error: { code: ErrorCodes.GAME_NOT_STARTED, message: 'Game has not started' },
      };
    }

    const playerEntity = await this.repository.getPlayer(gameCode, playerId);

    if (!playerEntity) {
      return {
        success: false,
        error: { code: ErrorCodes.PLAYER_NOT_FOUND, message: 'Player not found' },
      };
    }

    const diceRoll = rollDice();
    const previousPosition = playerEntity.position;
    const moveResult = processMove(previousPosition, diceRoll, gameEntity.board);

    await this.repository.updatePlayerPosition(gameCode, playerId, moveResult.newPosition);

    if (moveResult.isWinner) {
      await this.repository.updateGameStatus(gameCode, 'finished', playerId);
    }

    return {
      success: true,
      data: {
        diceRoll,
        previousPosition,
        newPosition: moveResult.newPosition,
        effect: moveResult.effect,
        isWinner: moveResult.isWinner,
      },
    };
  }

  private generateGameCode(): string {
    // Generate a 6-character alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private entityToGame(entity: GameEntity): Game {
    return {
      code: entity.code,
      status: entity.status,
      creatorId: entity.creatorId,
      board: entity.board,
      winnerId: entity.winnerId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private entityToPlayer(entity: PlayerEntity): Player {
    return {
      id: entity.id,
      gameCode: entity.gameCode,
      name: entity.name,
      color: entity.color,
      position: entity.position,
      isConnected: entity.isConnected,
      joinedAt: entity.joinedAt,
    };
  }
}
