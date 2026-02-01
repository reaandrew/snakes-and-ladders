import { DEFAULT_BOARD_CONFIG, PLAYER_COLORS, ErrorCodes } from '@snakes-and-ladders/shared';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Repository } from '../db/repository.js';

import { GameService } from './game.service.js';

// Mock repository
vi.mock('../db/repository.js');

describe('GameService', () => {
  let gameService: GameService;
  let mockRepository: {
    getGame: ReturnType<typeof vi.fn>;
    putGame: ReturnType<typeof vi.fn>;
    updateGameStatus: ReturnType<typeof vi.fn>;
    getPlayer: ReturnType<typeof vi.fn>;
    putPlayer: ReturnType<typeof vi.fn>;
    updatePlayerPosition: ReturnType<typeof vi.fn>;
    getGamePlayers: ReturnType<typeof vi.fn>;
    putMove: ReturnType<typeof vi.fn>;
    getGameMoves: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      getGame: vi.fn(),
      putGame: vi.fn(),
      updateGameStatus: vi.fn(),
      getPlayer: vi.fn(),
      putPlayer: vi.fn(),
      updatePlayerPosition: vi.fn(),
      getGamePlayers: vi.fn(),
      putMove: vi.fn(),
      getGameMoves: vi.fn(),
    };

    gameService = new GameService({
      repository: mockRepository as unknown as Repository,
      defaultBoardConfig: DEFAULT_BOARD_CONFIG,
      playerColors: PLAYER_COLORS,
    });
  });

  describe('createGame', () => {
    it('should create a new game and player', async () => {
      mockRepository.putGame.mockResolvedValue(undefined);
      mockRepository.putPlayer.mockResolvedValue(undefined);

      const result = await gameService.createGame('TestPlayer');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.game.code).toHaveLength(6);
        expect(result.data.game.status).toBe('waiting');
        expect(result.data.player.name).toBe('TestPlayer');
        expect(result.data.player.position).toBe(0);
        expect(result.data.player.color).toBe(PLAYER_COLORS[0]);
      }
      expect(mockRepository.putGame).toHaveBeenCalledTimes(1);
      expect(mockRepository.putPlayer).toHaveBeenCalledTimes(1);
    });
  });

  describe('joinGame', () => {
    it('should allow joining an existing waiting game', async () => {
      mockRepository.getGame.mockResolvedValue({
        PK: 'GAME#ABC123',
        SK: 'METADATA',
        code: 'ABC123',
        status: 'waiting',
        creatorId: 'creator-1',
        board: DEFAULT_BOARD_CONFIG,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
      mockRepository.getGamePlayers.mockResolvedValue([
        {
          id: 'creator-1',
          name: 'Creator',
          color: PLAYER_COLORS[0],
          position: 0,
        },
      ]);
      mockRepository.putPlayer.mockResolvedValue(undefined);

      const result = await gameService.joinGame('ABC123', 'NewPlayer');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.player.name).toBe('NewPlayer');
        expect(result.data.player.color).toBe(PLAYER_COLORS[1]);
        expect(result.data.players).toHaveLength(2);
      }
    });

    it('should return error for non-existent game', async () => {
      mockRepository.getGame.mockResolvedValue(null);

      const result = await gameService.joinGame('INVALID', 'Player');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.GAME_NOT_FOUND);
      }
    });

    it('should return error for already started game', async () => {
      mockRepository.getGame.mockResolvedValue({
        code: 'ABC123',
        status: 'playing',
      });

      const result = await gameService.joinGame('ABC123', 'Player');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.GAME_ALREADY_STARTED);
      }
    });

    it('should return error when game is full', async () => {
      mockRepository.getGame.mockResolvedValue({
        code: 'ABC123',
        status: 'waiting',
      });
      mockRepository.getGamePlayers.mockResolvedValue(
        PLAYER_COLORS.map((_, i) => ({ id: `player-${i}` }))
      );

      const result = await gameService.joinGame('ABC123', 'Player');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.GAME_FULL);
      }
    });
  });

  describe('startGame', () => {
    it('should allow creator to start game', async () => {
      mockRepository.getGame.mockResolvedValue({
        code: 'ABC123',
        status: 'waiting',
        creatorId: 'creator-1',
        board: DEFAULT_BOARD_CONFIG,
      });
      mockRepository.updateGameStatus.mockResolvedValue(undefined);

      const result = await gameService.startGame('ABC123', 'creator-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('playing');
      }
    });

    it('should not allow non-creator to start game', async () => {
      mockRepository.getGame.mockResolvedValue({
        code: 'ABC123',
        status: 'waiting',
        creatorId: 'creator-1',
      });

      const result = await gameService.startGame('ABC123', 'other-player');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.NOT_GAME_CREATOR);
      }
    });
  });

  describe('rollDice', () => {
    it('should process dice roll and update position', async () => {
      mockRepository.getGame.mockResolvedValue({
        code: 'ABC123',
        status: 'playing',
        board: { size: 100, snakesAndLadders: [] },
      });
      mockRepository.getPlayer.mockResolvedValue({
        id: 'player-1',
        position: 1,
      });
      mockRepository.updatePlayerPosition.mockResolvedValue(undefined);

      const result = await gameService.rollDice('ABC123', 'player-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.diceRoll).toBeGreaterThanOrEqual(1);
        expect(result.data.diceRoll).toBeLessThanOrEqual(6);
        expect(result.data.previousPosition).toBe(1);
      }
    });

    it('should not allow roll when game not started', async () => {
      mockRepository.getGame.mockResolvedValue({
        code: 'ABC123',
        status: 'waiting',
      });

      const result = await gameService.rollDice('ABC123', 'player-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.GAME_NOT_STARTED);
      }
    });
  });

  describe('getGame', () => {
    it('should return game and players', async () => {
      mockRepository.getGame.mockResolvedValue({
        code: 'ABC123',
        status: 'waiting',
        board: DEFAULT_BOARD_CONFIG,
        creatorId: 'creator-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
      mockRepository.getGamePlayers.mockResolvedValue([
        {
          id: 'player-1',
          gameCode: 'ABC123',
          name: 'Player 1',
          color: PLAYER_COLORS[0],
          position: 0,
          isConnected: true,
          joinedAt: '2024-01-01T00:00:00Z',
        },
      ]);

      const result = await gameService.getGame('ABC123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.game.code).toBe('ABC123');
        expect(result.data.players).toHaveLength(1);
      }
    });

    it('should return error for non-existent game', async () => {
      mockRepository.getGame.mockResolvedValue(null);

      const result = await gameService.getGame('INVALID');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.GAME_NOT_FOUND);
      }
    });
  });
});
