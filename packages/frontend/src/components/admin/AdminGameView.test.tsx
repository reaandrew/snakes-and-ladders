import type { AdminGameDetailResponse } from '@snakes-and-ladders/shared';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AdminAuthProvider } from '../../contexts/AdminAuthContext';

import { AdminGameView } from './AdminGameView';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockGameDetail: AdminGameDetailResponse = {
  game: {
    code: 'ABC123',
    status: 'playing',
    creatorId: 'player1',
    board: { size: 100, snakesAndLadders: [] },
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:30:00Z',
  },
  players: [
    {
      id: 'player1',
      gameCode: 'ABC123',
      name: 'Alice',
      color: '#EF4444',
      position: 78,
      isConnected: true,
      joinedAt: '2026-02-01T10:00:00Z',
      rank: 1,
      distanceToWin: 22,
    },
    {
      id: 'player2',
      gameCode: 'ABC123',
      name: 'Bob',
      color: '#3B82F6',
      position: 45,
      isConnected: true,
      joinedAt: '2026-02-01T10:01:00Z',
      rank: 2,
      distanceToWin: 55,
    },
  ],
  moves: [
    {
      id: 'move1',
      gameCode: 'ABC123',
      playerId: 'player1',
      playerName: 'Alice',
      playerColor: '#EF4444',
      diceRoll: 6,
      previousPosition: 72,
      newPosition: 78,
      timestamp: '2026-02-01T10:30:00Z',
    },
    {
      id: 'move2',
      gameCode: 'ABC123',
      playerId: 'player2',
      playerName: 'Bob',
      playerColor: '#3B82F6',
      diceRoll: 3,
      previousPosition: 42,
      newPosition: 45,
      timestamp: '2026-02-01T10:29:00Z',
    },
  ],
};

function renderGameView(code = 'ABC123') {
  localStorage.setItem('admin_auth_token', 'Basic dGVzdDp0ZXN0');
  return render(
    <MemoryRouter initialEntries={[`/admin/games/${code}`]}>
      <AdminAuthProvider>
        <Routes>
          <Route path="/admin/games/:code" element={<AdminGameView />} />
        </Routes>
      </AdminAuthProvider>
    </MemoryRouter>
  );
}

describe('AdminGameView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('displays game code after loading', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGameDetail),
    });

    renderGameView();

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });
  });

  it('displays game status', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGameDetail),
    });

    renderGameView();

    await waitFor(() => {
      expect(screen.getByText('playing')).toBeInTheDocument();
    });
  });

  it('displays player progress section', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGameDetail),
    });

    renderGameView();

    await waitFor(() => {
      expect(screen.getByText('Player Progress')).toBeInTheDocument();
    });
  });

  it('displays recent moves section', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGameDetail),
    });

    renderGameView();

    await waitFor(() => {
      expect(screen.getByText('Recent Moves')).toBeInTheDocument();
    });
  });

  it('displays move details', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGameDetail),
    });

    renderGameView();

    await waitFor(() => {
      // Alice appears in player chart and move history
      expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('6')).toBeInTheDocument();
    });
  });

  it('navigates back on back button click', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGameDetail),
    });

    renderGameView();

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    const backButtons = screen.getAllByRole('button');
    const backButton = backButtons.find((btn) => btn.querySelector('svg'));
    if (backButton) {
      fireEvent.click(backButton);
    }

    expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('shows error for non-existent game', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    renderGameView('NOTFOUND');

    await waitFor(() => {
      expect(screen.getByText('Game not found')).toBeInTheDocument();
    });
  });

  it('redirects on 401 response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    renderGameView();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  it('shows no moves message when empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...mockGameDetail, moves: [] }),
    });

    renderGameView();

    await waitFor(() => {
      expect(screen.getByText('No moves yet')).toBeInTheDocument();
    });
  });

  it('displays snake/ladder effects in moves', async () => {
    const gameWithEffects: AdminGameDetailResponse = {
      ...mockGameDetail,
      moves: [
        {
          id: 'move1',
          gameCode: 'ABC123',
          playerId: 'player1',
          playerName: 'Alice',
          playerColor: '#EF4444',
          diceRoll: 4,
          previousPosition: 24,
          newPosition: 84,
          effect: { type: 'ladder', from: 28, to: 84 },
          timestamp: '2026-02-01T10:30:00Z',
        },
      ],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(gameWithEffects),
    });

    renderGameView();

    await waitFor(() => {
      expect(screen.getByText('↑ Ladder!')).toBeInTheDocument();
    });
  });

  it('fetches game data on mount', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGameDetail),
    });

    renderGameView();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
