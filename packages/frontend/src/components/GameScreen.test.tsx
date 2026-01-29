import type { Game, Player, BoardConfig } from '@snakes-and-ladders/shared';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { useGame } from '../contexts/GameContext';

import { GameScreen } from './GameScreen';

// Mock the GameContext
vi.mock('../contexts/GameContext', () => ({
  useGame: vi.fn(),
}));

// Mock child components to simplify testing
vi.mock('./Lobby', () => ({
  Lobby: () => <div data-testid="lobby">Lobby Component</div>,
}));

vi.mock('./GameBoard', () => ({
  GameBoard: () => <div data-testid="game-board">GameBoard Component</div>,
}));

const mockBoardConfig: BoardConfig = {
  size: 100,
  snakesAndLadders: [],
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

const mockUseGame = useGame as Mock;

describe('GameScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Lobby when game is null', () => {
    mockUseGame.mockReturnValue({
      game: null,
      players: [],
      currentPlayerId: null,
    });

    render(<GameScreen />);
    expect(screen.getByTestId('lobby')).toBeInTheDocument();
    expect(screen.queryByTestId('game-board')).not.toBeInTheDocument();
  });

  it('renders Lobby when game status is waiting', () => {
    mockUseGame.mockReturnValue({
      game: createMockGame({ status: 'waiting' }),
      players: [createMockPlayer()],
      currentPlayerId: 'player-1',
    });

    render(<GameScreen />);
    expect(screen.getByTestId('lobby')).toBeInTheDocument();
    expect(screen.queryByTestId('game-board')).not.toBeInTheDocument();
  });

  it('renders GameBoard when game status is playing', () => {
    mockUseGame.mockReturnValue({
      game: createMockGame({ status: 'playing' }),
      players: [createMockPlayer()],
      currentPlayerId: 'player-1',
    });

    render(<GameScreen />);
    expect(screen.getByTestId('game-board')).toBeInTheDocument();
    expect(screen.queryByTestId('lobby')).not.toBeInTheDocument();
  });

  it('renders GameBoard when game status is finished', () => {
    mockUseGame.mockReturnValue({
      game: createMockGame({ status: 'finished', winnerId: 'player-1' }),
      players: [createMockPlayer()],
      currentPlayerId: 'player-1',
    });

    render(<GameScreen />);
    expect(screen.getByTestId('game-board')).toBeInTheDocument();
    expect(screen.queryByTestId('lobby')).not.toBeInTheDocument();
  });
});
