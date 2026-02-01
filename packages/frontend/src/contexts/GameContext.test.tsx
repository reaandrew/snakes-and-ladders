import type { Game, Player, BoardConfig, ServerMessage } from '@snakes-and-ladders/shared';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GameProvider, useGame } from './GameContext';

// Mock the useWebSocket hook
const mockSendMessage = vi.fn();
let mockLastMessage: ServerMessage | null = null;
let mockIsConnected = true;

vi.mock('./WebSocketContext', () => ({
  useWebSocket: () => ({
    sendMessage: mockSendMessage,
    lastMessage: mockLastMessage,
    isConnected: mockIsConnected,
  }),
}));

const mockBoardConfig: BoardConfig = {
  size: 100,
  snakesAndLadders: [
    { start: 2, end: 38, type: 'ladder' },
    { start: 16, end: 6, type: 'snake' },
  ],
};

const createMockGame = (overrides: Partial<Game> = {}): Game => ({
  code: 'ABC123',
  status: 'waiting',
  creatorId: 'player-1',
  board: mockBoardConfig,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'player-1',
  gameCode: 'ABC123',
  name: 'Test Player',
  color: '#EF4444',
  position: 1,
  isConnected: true,
  joinedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Helper to trigger message handling via useEffect
const triggerMessage = (rerender: () => void, message: ServerMessage | null) => {
  mockLastMessage = message;
  act(() => {
    rerender();
  });
};

describe('GameContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <GameProvider>{children}</GameProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMessage.mockClear();
    mockLastMessage = null;
    mockIsConnected = true;
  });

  describe('useGame hook', () => {
    it('throws error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useGame());
      }).toThrow('useGame must be used within a GameProvider');

      consoleError.mockRestore();
    });
  });

  describe('GameProvider', () => {
    it('provides initial state', () => {
      const { result } = renderHook(() => useGame(), { wrapper });

      expect(result.current.game).toBeNull();
      expect(result.current.players).toEqual([]);
      expect(result.current.currentPlayerId).toBeNull();
      expect(result.current.lastMove).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    describe('joinGame', () => {
      it('sends join game message when connected', () => {
        mockIsConnected = true;
        const { result } = renderHook(() => useGame(), { wrapper });

        act(() => {
          result.current.joinGame('ABC123', 'TestPlayer');
        });

        expect(mockSendMessage).toHaveBeenCalledWith({
          action: 'joinGame',
          gameCode: 'ABC123',
          playerName: 'TestPlayer',
        });
      });

      it('sets error when not connected', () => {
        mockIsConnected = false;
        const { result } = renderHook(() => useGame(), { wrapper });

        act(() => {
          result.current.joinGame('ABC123', 'TestPlayer');
        });

        expect(mockSendMessage).not.toHaveBeenCalled();
        expect(result.current.error).toBe('Not connected to server');
      });

      it('sets loading state when joining', () => {
        mockIsConnected = true;
        const { result } = renderHook(() => useGame(), { wrapper });

        act(() => {
          result.current.joinGame('ABC123', 'TestPlayer');
        });

        expect(result.current.isLoading).toBe(true);
      });
    });

    describe('startGame', () => {
      it('sends start game message when game exists', () => {
        mockLastMessage = {
          type: 'joinedGame',
          playerId: 'player-1',
          game: createMockGame(),
          players: [createMockPlayer()],
        };
        const { result } = renderHook(() => useGame(), { wrapper });

        // Initial render should process the message
        expect(result.current.game).not.toBeNull();

        act(() => {
          result.current.startGame();
        });

        expect(mockSendMessage).toHaveBeenCalledWith({
          action: 'startGame',
          gameCode: 'ABC123',
          playerId: 'player-1',
        });
      });

      it('does nothing when no game exists', () => {
        const { result } = renderHook(() => useGame(), { wrapper });

        act(() => {
          result.current.startGame();
        });

        expect(mockSendMessage).not.toHaveBeenCalled();
      });
    });

    describe('rollDice', () => {
      it('sends roll dice message when game is active', () => {
        mockLastMessage = {
          type: 'joinedGame',
          playerId: 'player-1',
          game: createMockGame({ status: 'playing' }),
          players: [createMockPlayer()],
        };
        const { result } = renderHook(() => useGame(), { wrapper });

        expect(result.current.game).not.toBeNull();

        act(() => {
          result.current.rollDice();
        });

        expect(mockSendMessage).toHaveBeenCalledWith({
          action: 'rollDice',
          gameCode: 'ABC123',
          playerId: 'player-1',
        });
      });

      it('does nothing when no game exists', () => {
        const { result } = renderHook(() => useGame(), { wrapper });

        act(() => {
          result.current.rollDice();
        });

        expect(mockSendMessage).not.toHaveBeenCalled();
      });
    });

    describe('resetGame', () => {
      it('resets state to initial values', () => {
        mockLastMessage = {
          type: 'joinedGame',
          playerId: 'player-1',
          game: createMockGame(),
          players: [createMockPlayer()],
        };
        const { result } = renderHook(() => useGame(), { wrapper });

        expect(result.current.game).not.toBeNull();
        expect(result.current.players.length).toBe(1);

        act(() => {
          result.current.resetGame();
        });

        expect(result.current.game).toBeNull();
        expect(result.current.players).toEqual([]);
      });
    });

    describe('message handling', () => {
      it('handles joinedGame message', () => {
        const game = createMockGame();
        const players = [
          createMockPlayer(),
          createMockPlayer({ id: 'player-2', name: 'Player 2' }),
        ];

        mockLastMessage = {
          type: 'joinedGame',
          playerId: 'player-1',
          game,
          players,
        };
        const { result } = renderHook(() => useGame(), { wrapper });

        expect(result.current.game?.code).toBe('ABC123');
        expect(result.current.players.length).toBe(2);
        expect(result.current.currentPlayerId).toBe('player-1');
        expect(result.current.error).toBeNull();
        expect(result.current.isLoading).toBe(false);
      });

      it('handles playerJoined message', () => {
        mockLastMessage = {
          type: 'joinedGame',
          playerId: 'player-1',
          game: createMockGame(),
          players: [createMockPlayer()],
        };
        const { result, rerender } = renderHook(() => useGame(), { wrapper });

        expect(result.current.players.length).toBe(1);

        // Trigger playerJoined message
        triggerMessage(rerender, {
          type: 'playerJoined',
          player: createMockPlayer({ id: 'player-2', name: 'New Player' }),
        });

        expect(result.current.players.length).toBe(2);
        expect(result.current.players[1].name).toBe('New Player');
      });

      it('handles playerLeft message', () => {
        mockLastMessage = {
          type: 'joinedGame',
          playerId: 'player-1',
          game: createMockGame(),
          players: [createMockPlayer(), createMockPlayer({ id: 'player-2', name: 'Player 2' })],
        };
        const { result, rerender } = renderHook(() => useGame(), { wrapper });

        expect(result.current.players.length).toBe(2);

        triggerMessage(rerender, {
          type: 'playerLeft',
          playerId: 'player-2',
          playerName: 'Player 2',
        });

        expect(result.current.players.length).toBe(1);
        expect(result.current.players[0].id).toBe('player-1');
      });

      it('handles playerMoved message', () => {
        mockLastMessage = {
          type: 'joinedGame',
          playerId: 'player-1',
          game: createMockGame({ status: 'playing' }),
          players: [createMockPlayer({ position: 5 })],
        };
        const { result, rerender } = renderHook(() => useGame(), { wrapper });

        expect(result.current.players[0].position).toBe(5);

        triggerMessage(rerender, {
          type: 'playerMoved',
          playerId: 'player-1',
          playerName: 'Test Player',
          diceRoll: 4,
          previousPosition: 5,
          newPosition: 9,
        });

        expect(result.current.players[0].position).toBe(9);
        expect(result.current.lastMove?.diceRoll).toBe(4);
        expect(result.current.lastMove?.previousPosition).toBe(5);
        expect(result.current.lastMove?.newPosition).toBe(9);
      });

      it('handles playerMoved message with snake effect', () => {
        mockLastMessage = {
          type: 'joinedGame',
          playerId: 'player-1',
          game: createMockGame({ status: 'playing' }),
          players: [createMockPlayer({ position: 14 })],
        };
        const { result, rerender } = renderHook(() => useGame(), { wrapper });

        triggerMessage(rerender, {
          type: 'playerMoved',
          playerId: 'player-1',
          playerName: 'Test Player',
          diceRoll: 2,
          previousPosition: 14,
          newPosition: 6,
          effect: { type: 'snake', from: 16, to: 6 },
        });

        expect(result.current.players[0].position).toBe(6);
        expect(result.current.lastMove?.effect?.type).toBe('snake');
      });

      it('handles playerMoved message with ladder effect', () => {
        mockLastMessage = {
          type: 'joinedGame',
          playerId: 'player-1',
          game: createMockGame({ status: 'playing' }),
          players: [createMockPlayer({ position: 1 })],
        };
        const { result, rerender } = renderHook(() => useGame(), { wrapper });

        triggerMessage(rerender, {
          type: 'playerMoved',
          playerId: 'player-1',
          playerName: 'Test Player',
          diceRoll: 1,
          previousPosition: 1,
          newPosition: 38,
          effect: { type: 'ladder', from: 2, to: 38 },
        });

        expect(result.current.players[0].position).toBe(38);
        expect(result.current.lastMove?.effect?.type).toBe('ladder');
      });

      it('handles gameStarted message', () => {
        mockLastMessage = {
          type: 'joinedGame',
          playerId: 'player-1',
          game: createMockGame(),
          players: [createMockPlayer({ position: 5 })],
        };
        const { result, rerender } = renderHook(() => useGame(), { wrapper });

        expect(result.current.game?.status).toBe('waiting');

        triggerMessage(rerender, {
          type: 'gameStarted',
          game: createMockGame({ status: 'playing' }),
        });

        expect(result.current.game?.status).toBe('playing');
        // Players reset to position 1 when game starts
        expect(result.current.players[0].position).toBe(1);
      });

      it('handles gameEnded message', () => {
        mockLastMessage = {
          type: 'joinedGame',
          playerId: 'player-1',
          game: createMockGame({ status: 'playing' }),
          players: [createMockPlayer()],
        };
        const { result, rerender } = renderHook(() => useGame(), { wrapper });

        triggerMessage(rerender, {
          type: 'gameEnded',
          winnerId: 'player-1',
          winnerName: 'Test Player',
        });

        expect(result.current.game?.status).toBe('finished');
        expect(result.current.game?.winnerId).toBe('player-1');
      });

      it('handles error message', () => {
        const { result, rerender } = renderHook(() => useGame(), { wrapper });

        triggerMessage(rerender, {
          type: 'error',
          code: 'GAME_NOT_FOUND',
          message: 'Game not found',
        });

        expect(result.current.error).toBe('Game not found');
      });

      it('ignores null lastMessage', () => {
        mockLastMessage = {
          type: 'joinedGame',
          playerId: 'player-1',
          game: createMockGame(),
          players: [createMockPlayer()],
        };
        const { result, rerender } = renderHook(() => useGame(), { wrapper });

        const gameBeforeNull = result.current.game;

        // Setting to null should not change state
        triggerMessage(rerender, null);

        expect(result.current.game).toBe(gameBeforeNull);
      });

      it('handles unknown message type gracefully', () => {
        const { result, rerender } = renderHook(() => useGame(), { wrapper });

        triggerMessage(rerender, {
          type: 'unknownType' as ServerMessage['type'],
        } as ServerMessage);

        // State should remain initial
        expect(result.current.game).toBeNull();
      });
    });

    describe('visibility change and reconnection', () => {
      it('sends rejoinGame message when visibility changes to visible while in a game', () => {
        mockIsConnected = true;
        mockLastMessage = {
          type: 'joinedGame',
          playerId: 'player-1',
          game: createMockGame(),
          players: [createMockPlayer()],
        };
        renderHook(() => useGame(), { wrapper });

        mockSendMessage.mockClear();

        // Simulate visibility change
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true,
        });
        act(() => {
          document.dispatchEvent(new Event('visibilitychange'));
        });

        expect(mockSendMessage).toHaveBeenCalledWith({
          action: 'rejoinGame',
          gameCode: 'ABC123',
          playerId: 'player-1',
        });
      });

      it('does not send rejoinGame when no game is active', () => {
        mockIsConnected = true;
        renderHook(() => useGame(), { wrapper });

        // Simulate visibility change
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true,
        });
        act(() => {
          document.dispatchEvent(new Event('visibilitychange'));
        });

        expect(mockSendMessage).not.toHaveBeenCalled();
      });

      it('sends rejoinGame when reconnected after being disconnected', () => {
        // Start connected with a game
        mockIsConnected = true;
        mockLastMessage = {
          type: 'joinedGame',
          playerId: 'player-1',
          game: createMockGame(),
          players: [createMockPlayer()],
        };
        const { rerender } = renderHook(() => useGame(), { wrapper });

        mockSendMessage.mockClear();

        // Simulate disconnect
        mockIsConnected = false;
        act(() => {
          rerender();
        });

        // Now reconnect
        mockIsConnected = true;
        act(() => {
          rerender();
        });

        expect(mockSendMessage).toHaveBeenCalledWith({
          action: 'rejoinGame',
          gameCode: 'ABC123',
          playerId: 'player-1',
        });
      });
    });
  });
});
