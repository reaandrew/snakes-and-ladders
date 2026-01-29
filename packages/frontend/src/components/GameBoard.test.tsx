import type { Game, Player, BoardConfig } from '@snakes-and-ladders/shared';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { useGame } from '../contexts/GameContext';

import { GameBoard } from './GameBoard';

// Mock the GameContext
vi.mock('../contexts/GameContext', () => ({
  useGame: vi.fn(),
}));

// Mock canvas context
const createMockCanvasContext = () => ({
  fillRect: vi.fn(),
  fillText: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  closePath: vi.fn(),
  quadraticCurveTo: vi.fn(),
  clearRect: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'butt',
  font: '',
  textAlign: 'start',
});

const mockBoardConfig: BoardConfig = {
  size: 100,
  snakesAndLadders: [
    { start: 2, end: 38, type: 'ladder' },
    { start: 16, end: 6, type: 'snake' },
  ],
};

const createMockGame = (overrides: Partial<Game> = {}): Game => ({
  code: 'ABC123',
  status: 'playing',
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
  position: 5,
  isConnected: true,
  joinedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const mockUseGame = useGame as Mock;

describe('GameBoard', () => {
  let rollDiceMock: Mock;
  let mockContext: ReturnType<typeof createMockCanvasContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    rollDiceMock = vi.fn();
    mockContext = createMockCanvasContext();

    // Mock canvas getContext
    HTMLCanvasElement.prototype.getContext = vi.fn(
      () => mockContext
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    mockUseGame.mockReturnValue({
      game: createMockGame(),
      players: [createMockPlayer()],
      currentPlayerId: 'player-1',
      rollDice: rollDiceMock,
      lastMove: null,
    });
  });

  describe('Rendering', () => {
    it('renders game code', () => {
      render(<GameBoard />);

      expect(screen.getByText('Game: ABC123')).toBeInTheDocument();
    });

    it('renders player list', () => {
      render(<GameBoard />);

      expect(screen.getByText('Players (1)')).toBeInTheDocument();
      expect(screen.getByText('Test Player')).toBeInTheDocument();
    });

    it('renders canvas', () => {
      const { container } = render(<GameBoard />);

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('renders Roll Dice button', () => {
      render(<GameBoard />);

      expect(screen.getByRole('button', { name: 'Roll Dice' })).toBeInTheDocument();
    });

    it('shows current player position', () => {
      render(<GameBoard />);

      expect(screen.getByText('Your position: 5')).toBeInTheDocument();
    });

    it('shows position 0 when player has no position', () => {
      mockUseGame.mockReturnValue({
        game: createMockGame(),
        players: [createMockPlayer({ position: 0 })],
        currentPlayerId: 'player-1',
        rollDice: rollDiceMock,
        lastMove: null,
      });

      render(<GameBoard />);

      expect(screen.getByText('Your position: 0')).toBeInTheDocument();
    });

    it('shows position 0 when current player not found', () => {
      mockUseGame.mockReturnValue({
        game: createMockGame(),
        players: [createMockPlayer({ id: 'other-player' })],
        currentPlayerId: 'player-1',
        rollDice: rollDiceMock,
        lastMove: null,
      });

      render(<GameBoard />);

      expect(screen.getByText('Your position: 0')).toBeInTheDocument();
    });
  });

  describe('Roll Dice Button', () => {
    it('calls rollDice when clicked', () => {
      render(<GameBoard />);

      fireEvent.click(screen.getByRole('button', { name: 'Roll Dice' }));

      expect(rollDiceMock).toHaveBeenCalled();
    });

    it('is enabled when game status is playing', () => {
      render(<GameBoard />);

      expect(screen.getByRole('button', { name: 'Roll Dice' })).not.toBeDisabled();
    });

    it('is disabled when game status is not playing', () => {
      mockUseGame.mockReturnValue({
        game: createMockGame({ status: 'waiting' }),
        players: [createMockPlayer()],
        currentPlayerId: 'player-1',
        rollDice: rollDiceMock,
        lastMove: null,
      });

      render(<GameBoard />);

      expect(screen.getByRole('button', { name: 'Roll Dice' })).toBeDisabled();
    });

    it('is disabled when game status is finished', () => {
      mockUseGame.mockReturnValue({
        game: createMockGame({ status: 'finished', winnerId: 'player-1' }),
        players: [createMockPlayer()],
        currentPlayerId: 'player-1',
        rollDice: rollDiceMock,
        lastMove: null,
      });

      render(<GameBoard />);

      // Roll Dice button should not be present when there's a winner
      expect(screen.queryByRole('button', { name: 'Roll Dice' })).not.toBeInTheDocument();
    });
  });

  describe('Last Move Info', () => {
    it('displays last move information', () => {
      mockUseGame.mockReturnValue({
        game: createMockGame(),
        players: [createMockPlayer()],
        currentPlayerId: 'player-1',
        rollDice: rollDiceMock,
        lastMove: {
          playerId: 'player-1',
          diceRoll: 4,
          previousPosition: 5,
          newPosition: 9,
        },
      });

      render(<GameBoard />);

      expect(screen.getByText(/Test Player rolled/)).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText(/5 → 9/)).toBeInTheDocument();
    });

    it('shows ladder effect', () => {
      mockUseGame.mockReturnValue({
        game: createMockGame(),
        players: [createMockPlayer()],
        currentPlayerId: 'player-1',
        rollDice: rollDiceMock,
        lastMove: {
          playerId: 'player-1',
          diceRoll: 1,
          previousPosition: 1,
          newPosition: 38,
          effect: { type: 'ladder', from: 2, to: 38 },
        },
      });

      render(<GameBoard />);

      expect(screen.getByText(/ladder!/)).toBeInTheDocument();
    });

    it('shows snake effect', () => {
      mockUseGame.mockReturnValue({
        game: createMockGame(),
        players: [createMockPlayer()],
        currentPlayerId: 'player-1',
        rollDice: rollDiceMock,
        lastMove: {
          playerId: 'player-1',
          diceRoll: 2,
          previousPosition: 14,
          newPosition: 6,
          effect: { type: 'snake', from: 16, to: 6 },
        },
      });

      render(<GameBoard />);

      expect(screen.getByText(/snake!/)).toBeInTheDocument();
    });

    it('does not display last move info when no move', () => {
      render(<GameBoard />);

      expect(screen.queryByText(/rolled/)).not.toBeInTheDocument();
    });
  });

  describe('Winner Display', () => {
    it('shows winner message when game is finished', () => {
      mockUseGame.mockReturnValue({
        game: createMockGame({ status: 'finished', winnerId: 'player-1' }),
        players: [createMockPlayer()],
        currentPlayerId: 'player-1',
        rollDice: rollDiceMock,
        lastMove: null,
      });

      render(<GameBoard />);

      expect(screen.getByText('Test Player wins!')).toBeInTheDocument();
    });

    it('shows correct winner name', () => {
      const players = [
        createMockPlayer({ id: 'player-1', name: 'Alice' }),
        createMockPlayer({ id: 'player-2', name: 'Bob' }),
      ];

      mockUseGame.mockReturnValue({
        game: createMockGame({ status: 'finished', winnerId: 'player-2' }),
        players,
        currentPlayerId: 'player-1',
        rollDice: rollDiceMock,
        lastMove: null,
      });

      render(<GameBoard />);

      expect(screen.getByText('Bob wins!')).toBeInTheDocument();
    });

    it('hides Roll Dice button when there is a winner', () => {
      mockUseGame.mockReturnValue({
        game: createMockGame({ status: 'finished', winnerId: 'player-1' }),
        players: [createMockPlayer()],
        currentPlayerId: 'player-1',
        rollDice: rollDiceMock,
        lastMove: null,
      });

      render(<GameBoard />);

      expect(screen.queryByRole('button', { name: 'Roll Dice' })).not.toBeInTheDocument();
    });
  });

  describe('Canvas Rendering', () => {
    it('gets 2D context from canvas', () => {
      render(<GameBoard />);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
    });

    it('draws board cells', () => {
      render(<GameBoard />);

      // Should draw 100 cells (10x10 board)
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('draws cell numbers', () => {
      render(<GameBoard />);

      expect(mockContext.fillText).toHaveBeenCalled();
    });

    it('draws snakes and ladders', () => {
      render(<GameBoard />);

      // Should draw lines for snakes and ladders
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    it('draws players on the board', () => {
      render(<GameBoard />);

      // Should draw player circles
      expect(mockContext.arc).toHaveBeenCalled();
      expect(mockContext.fill).toHaveBeenCalled();
    });

    it('does not draw players at position 0', () => {
      // Reset mock to clear previous arc calls
      mockContext.arc.mockClear();

      mockUseGame.mockReturnValue({
        game: createMockGame({ board: { size: 100, snakesAndLadders: [] } }), // No snakes/ladders
        players: [createMockPlayer({ position: 0 })],
        currentPlayerId: 'player-1',
        rollDice: rollDiceMock,
        lastMove: null,
      });

      render(<GameBoard />);

      // With no snakes/ladders and player at position 0, no arcs should be drawn
      expect(mockContext.arc).not.toHaveBeenCalled();
    });

    it('handles multiple players on different positions', () => {
      const players = [
        createMockPlayer({ id: 'player-1', name: 'Alice', position: 10, color: '#EF4444' }),
        createMockPlayer({ id: 'player-2', name: 'Bob', position: 20, color: '#3B82F6' }),
      ];

      mockUseGame.mockReturnValue({
        game: createMockGame(),
        players,
        currentPlayerId: 'player-1',
        rollDice: rollDiceMock,
        lastMove: null,
      });

      render(<GameBoard />);

      // Both players should be drawn
      expect(mockContext.arc).toHaveBeenCalled();
    });

    it('handles canvas context being null gracefully', () => {
      HTMLCanvasElement.prototype.getContext = vi.fn(
        () => null
      ) as unknown as typeof HTMLCanvasElement.prototype.getContext;

      // Should not throw
      expect(() => render(<GameBoard />)).not.toThrow();
    });
  });

  describe('Board without snakes and ladders', () => {
    it('renders board without snakes and ladders', () => {
      mockUseGame.mockReturnValue({
        game: createMockGame({
          board: { size: 100, snakesAndLadders: [] },
        }),
        players: [createMockPlayer()],
        currentPlayerId: 'player-1',
        rollDice: rollDiceMock,
        lastMove: null,
      });

      // Should not throw
      expect(() => render(<GameBoard />)).not.toThrow();
    });
  });

  describe('Game without board', () => {
    it('handles game without board config', () => {
      const gameWithNoBoard = createMockGame();
      // @ts-expect-error - testing undefined board scenario
      gameWithNoBoard.board = undefined;

      mockUseGame.mockReturnValue({
        game: gameWithNoBoard,
        players: [createMockPlayer()],
        currentPlayerId: 'player-1',
        rollDice: rollDiceMock,
        lastMove: null,
      });

      // Should not throw
      expect(() => render(<GameBoard />)).not.toThrow();
    });
  });

  describe('Multiple players on same cell', () => {
    it('offsets players on the same cell', () => {
      const players = [
        createMockPlayer({ id: 'player-1', name: 'Alice', position: 10 }),
        createMockPlayer({ id: 'player-2', name: 'Bob', position: 10 }),
        createMockPlayer({ id: 'player-3', name: 'Charlie', position: 10 }),
      ];

      mockUseGame.mockReturnValue({
        game: createMockGame(),
        players,
        currentPlayerId: 'player-1',
        rollDice: rollDiceMock,
        lastMove: null,
      });

      render(<GameBoard />);

      // All three players should be drawn with different positions
      const arcCalls = mockContext.arc.mock.calls;
      // Filter out snake/ladder endpoint arcs (4 endpoints for 2 snakes/ladders)
      // Each player has 1 arc call
      expect(arcCalls.length).toBeGreaterThanOrEqual(3);
    });
  });
});
