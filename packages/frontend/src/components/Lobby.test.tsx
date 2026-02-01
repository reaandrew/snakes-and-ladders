import type { Game, Player, BoardConfig } from '@snakes-and-ladders/shared';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { useGame } from '../contexts/GameContext';
import { useWebSocket } from '../contexts/WebSocketContext';

import { Lobby } from './Lobby';

// Mock the contexts
vi.mock('../contexts/GameContext', () => ({
  useGame: vi.fn(),
}));

vi.mock('../contexts/WebSocketContext', () => ({
  useWebSocket: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

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
  position: 0,
  isConnected: true,
  joinedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const mockUseGame = useGame as Mock;
const mockUseWebSocket = useWebSocket as Mock;

describe('Lobby', () => {
  let joinGameMock: Mock;
  let startGameMock: Mock;
  let resetGameMock: Mock;
  let connectMock: Mock;

  const setupDefaultMocks = () => {
    joinGameMock = vi.fn();
    startGameMock = vi.fn();
    resetGameMock = vi.fn();
    connectMock = vi.fn();

    mockUseGame.mockReturnValue({
      game: null,
      players: [],
      currentPlayerId: null,
      joinGame: joinGameMock,
      startGame: startGameMock,
      error: null,
      isLoading: false,
      resetGame: resetGameMock,
    });

    mockUseWebSocket.mockReturnValue({
      connect: connectMock,
      isConnected: false,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    setupDefaultMocks();
  });

  describe('Home View', () => {
    it('renders home view with title', () => {
      render(<Lobby />);

      expect(screen.getByText('Snakes & Ladders')).toBeInTheDocument();
      expect(screen.getByText('Real-time multiplayer')).toBeInTheDocument();
    });

    it('shows Create Game and Join Game buttons', () => {
      render(<Lobby />);

      expect(screen.getByRole('button', { name: 'Create Game' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Join Game' })).toBeInTheDocument();
    });

    it('navigates to create view when Create Game is clicked', () => {
      render(<Lobby />);

      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));

      expect(screen.getByRole('heading', { name: 'Create Game' })).toBeInTheDocument();
      expect(screen.getByLabelText('Your Name')).toBeInTheDocument();
    });

    it('navigates to join view when Join Game is clicked', () => {
      render(<Lobby />);

      fireEvent.click(screen.getByRole('button', { name: 'Join Game' }));

      expect(screen.getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
      expect(screen.getByLabelText('Your Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Game Code')).toBeInTheDocument();
    });
  });

  describe('Create Game View', () => {
    it('renders create game form', () => {
      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));

      expect(screen.getByLabelText('Your Name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Game' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    });

    it('disables Create Game button when name is empty', () => {
      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));

      expect(screen.getByRole('button', { name: 'Create Game' })).toBeDisabled();
    });

    it('enables Create Game button when name is entered', () => {
      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));

      fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'TestPlayer' } });

      expect(screen.getByRole('button', { name: 'Create Game' })).not.toBeDisabled();
    });

    it('creates game and connects to WebSocket on submit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => ({
          game: { code: 'XYZ789' },
          playerId: 'player-1',
        }),
      });

      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));
      fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'TestPlayer' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/games'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creatorName: 'TestPlayer' }),
          })
        );
      });

      await waitFor(() => {
        expect(connectMock).toHaveBeenCalled();
      });
    });

    it('handles API error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));
      fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'TestPlayer' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to create game:', expect.any(Error));
      });

      consoleError.mockRestore();
    });

    it('handles fetch error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));
      fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'TestPlayer' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to create game:', expect.any(Error));
      });

      consoleError.mockRestore();
    });

    it('shows immediate loading state on create click', async () => {
      // Use a promise that doesn't resolve immediately to verify immediate state change
      let resolvePromise: () => void = () => {};
      const fetchPromise = new Promise<Response>((resolve) => {
        resolvePromise = () =>
          resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                game: { code: 'XYZ789' },
                playerId: 'player-1',
              }),
          } as Response);
      });
      mockFetch.mockReturnValueOnce(fetchPromise);

      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));
      fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'TestPlayer' } });

      // Click and immediately check for Creating... state
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));

      // Should show Creating... immediately before fetch resolves
      expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();

      // Resolve the promise to clean up
      resolvePromise();
      await waitFor(() => {
        expect(connectMock).toHaveBeenCalled();
      });
    });

    it('resets creating state on API error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));
      fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'TestPlayer' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to create game:', expect.any(Error));
      });

      // Button should be enabled again after error
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create Game' })).not.toBeDisabled();
      });

      consoleError.mockRestore();
    });

    it('navigates back to home view', () => {
      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));

      expect(screen.getByText('Snakes & Ladders')).toBeInTheDocument();
    });

    it('shows loading state during creation', () => {
      mockUseGame.mockReturnValue({
        game: null,
        players: [],
        currentPlayerId: null,
        joinGame: joinGameMock,
        startGame: startGameMock,
        error: null,
        isLoading: true,
        resetGame: resetGameMock,
      });

      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));

      expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
    });

    it('does not submit when name is whitespace only', () => {
      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));
      fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: '   ' } });

      expect(screen.getByRole('button', { name: 'Create Game' })).toBeDisabled();
    });
  });

  describe('Join Game View', () => {
    it('renders join game form', () => {
      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Join Game' }));

      expect(screen.getByLabelText('Your Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Game Code')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Join Game' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    });

    it('disables Join Game button when name or code is empty', () => {
      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Join Game' }));

      expect(screen.getByRole('button', { name: 'Join Game' })).toBeDisabled();

      fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'TestPlayer' } });
      expect(screen.getByRole('button', { name: 'Join Game' })).toBeDisabled();
    });

    it('enables Join Game button when name and code are entered', () => {
      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Join Game' }));

      fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'TestPlayer' } });
      fireEvent.change(screen.getByLabelText('Game Code'), { target: { value: 'ABC123' } });

      expect(screen.getByRole('button', { name: 'Join Game' })).not.toBeDisabled();
    });

    it('converts game code to uppercase', () => {
      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Join Game' }));

      const input = screen.getByLabelText('Game Code');
      fireEvent.change(input, { target: { value: 'abc123' } });

      expect(input).toHaveValue('ABC123');
    });

    it('connects to WebSocket on join', () => {
      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Join Game' }));

      fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'TestPlayer' } });
      fireEvent.change(screen.getByLabelText('Game Code'), { target: { value: 'ABC123' } });
      fireEvent.click(screen.getByRole('button', { name: 'Join Game' }));

      expect(connectMock).toHaveBeenCalled();
    });

    it('displays error message', () => {
      mockUseGame.mockReturnValue({
        game: null,
        players: [],
        currentPlayerId: null,
        joinGame: joinGameMock,
        startGame: startGameMock,
        error: 'Game not found',
        isLoading: false,
        resetGame: resetGameMock,
      });

      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Join Game' }));

      expect(screen.getByText('Game not found')).toBeInTheDocument();
    });

    it('shows loading state during join', () => {
      mockUseGame.mockReturnValue({
        game: null,
        players: [],
        currentPlayerId: null,
        joinGame: joinGameMock,
        startGame: startGameMock,
        error: null,
        isLoading: true,
        resetGame: resetGameMock,
      });

      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Join Game' }));

      expect(screen.getByRole('button', { name: 'Joining...' })).toBeDisabled();
    });

    it('navigates back to home view and resets state', () => {
      render(<Lobby />);
      fireEvent.click(screen.getByRole('button', { name: 'Join Game' }));

      fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'TestPlayer' } });
      fireEvent.change(screen.getByLabelText('Game Code'), { target: { value: 'ABC123' } });
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));

      expect(screen.getByText('Snakes & Ladders')).toBeInTheDocument();
      expect(resetGameMock).toHaveBeenCalled();
    });
  });

  describe('Waiting Room View', () => {
    it('renders waiting room when game exists', () => {
      mockUseGame.mockReturnValue({
        game: createMockGame(),
        players: [createMockPlayer()],
        currentPlayerId: 'player-1',
        joinGame: joinGameMock,
        startGame: startGameMock,
        error: null,
        isLoading: false,
        resetGame: resetGameMock,
      });

      render(<Lobby />);

      expect(screen.getByText('Waiting Room')).toBeInTheDocument();
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    it('shows player list', () => {
      mockUseGame.mockReturnValue({
        game: createMockGame(),
        players: [createMockPlayer()],
        currentPlayerId: 'player-1',
        joinGame: joinGameMock,
        startGame: startGameMock,
        error: null,
        isLoading: false,
        resetGame: resetGameMock,
      });

      render(<Lobby />);

      expect(screen.getByText('Players (1)')).toBeInTheDocument();
      expect(screen.getByText('Test Player')).toBeInTheDocument();
    });

    it('shows waiting message for non-creators', () => {
      mockUseGame.mockReturnValue({
        game: createMockGame({ creatorId: 'different-player' }),
        players: [createMockPlayer()],
        currentPlayerId: 'player-1',
        joinGame: joinGameMock,
        startGame: startGameMock,
        error: null,
        isLoading: false,
        resetGame: resetGameMock,
      });

      render(<Lobby />);

      expect(screen.getByText('Waiting for host to start the game...')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Start Game/ })).not.toBeInTheDocument();
    });

    it('shows Leave Game button', () => {
      mockUseGame.mockReturnValue({
        game: createMockGame(),
        players: [createMockPlayer()],
        currentPlayerId: 'player-1',
        joinGame: joinGameMock,
        startGame: startGameMock,
        error: null,
        isLoading: false,
        resetGame: resetGameMock,
      });

      render(<Lobby />);

      expect(screen.getByRole('button', { name: 'Leave Game' })).toBeInTheDocument();
    });

    it('handles Leave Game click', () => {
      mockUseGame.mockReturnValue({
        game: createMockGame(),
        players: [createMockPlayer()],
        currentPlayerId: 'player-1',
        joinGame: joinGameMock,
        startGame: startGameMock,
        error: null,
        isLoading: false,
        resetGame: resetGameMock,
      });

      render(<Lobby />);

      fireEvent.click(screen.getByRole('button', { name: 'Leave Game' }));

      expect(resetGameMock).toHaveBeenCalled();
    });

    it('displays error in waiting room', () => {
      mockUseGame.mockReturnValue({
        game: createMockGame(),
        players: [createMockPlayer()],
        currentPlayerId: 'player-1',
        joinGame: joinGameMock,
        startGame: startGameMock,
        error: 'Connection lost',
        isLoading: false,
        resetGame: resetGameMock,
      });

      render(<Lobby />);

      expect(screen.getByText('Connection lost')).toBeInTheDocument();
    });
  });

  describe('Auto-join after WebSocket connection', () => {
    it('joins game after WebSocket connects (creator flow)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => ({
          game: { code: 'XYZ789' },
          playerId: 'player-1',
        }),
      });

      const { rerender } = render(<Lobby />);

      // Go to create view and submit
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));
      fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'TestPlayer' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Game' }));

      await waitFor(() => {
        expect(connectMock).toHaveBeenCalled();
      });

      // Simulate WebSocket connected
      mockUseWebSocket.mockReturnValue({
        connect: connectMock,
        isConnected: true,
      });

      rerender(<Lobby />);

      await waitFor(() => {
        expect(joinGameMock).toHaveBeenCalledWith('XYZ789', 'TestPlayer');
      });
    });

    it('joins game after WebSocket connects (joiner flow)', async () => {
      const { rerender } = render(<Lobby />);

      // Go to join view and submit
      fireEvent.click(screen.getByRole('button', { name: 'Join Game' }));
      fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'JoiningPlayer' } });
      fireEvent.change(screen.getByLabelText('Game Code'), { target: { value: 'abc123' } });
      fireEvent.click(screen.getByRole('button', { name: 'Join Game' }));

      expect(connectMock).toHaveBeenCalled();

      // Simulate WebSocket connected
      mockUseWebSocket.mockReturnValue({
        connect: connectMock,
        isConnected: true,
      });

      rerender(<Lobby />);

      await waitFor(() => {
        expect(joinGameMock).toHaveBeenCalledWith('ABC123', 'JoiningPlayer');
      });
    });
  });

  describe('Auto-transition to waiting room', () => {
    it('transitions to waiting room when game is set', () => {
      const { rerender } = render(<Lobby />);

      expect(screen.getByText('Snakes & Ladders')).toBeInTheDocument();

      // Simulate game being set
      mockUseGame.mockReturnValue({
        game: createMockGame(),
        players: [createMockPlayer()],
        currentPlayerId: 'player-1',
        joinGame: joinGameMock,
        startGame: startGameMock,
        error: null,
        isLoading: false,
        resetGame: resetGameMock,
      });

      rerender(<Lobby />);

      expect(screen.getByText('Waiting Room')).toBeInTheDocument();
    });
  });
});
