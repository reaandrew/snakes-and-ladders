import type { AdminGamesResponse } from '@snakes-and-ladders/shared';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AdminAuthProvider } from '../../contexts/AdminAuthContext';

import { AdminDashboard } from './AdminDashboard';

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

const mockGamesResponse: AdminGamesResponse = {
  games: [
    {
      code: 'ABC123',
      status: 'playing',
      playerCount: 3,
      createdAt: '2026-02-01T10:00:00Z',
      leaderName: 'Alice',
      leaderPosition: 45,
    },
    {
      code: 'DEF456',
      status: 'waiting',
      playerCount: 1,
      createdAt: '2026-02-01T09:00:00Z',
      leaderName: null,
      leaderPosition: 0,
    },
    {
      code: 'GHI789',
      status: 'finished',
      playerCount: 2,
      createdAt: '2026-02-01T08:00:00Z',
      leaderName: 'Bob',
      leaderPosition: 100,
    },
  ],
};

function renderDashboard() {
  localStorage.setItem('admin_auth_token', 'Basic dGVzdDp0ZXN0');
  return render(
    <MemoryRouter>
      <AdminAuthProvider>
        <AdminDashboard />
      </AdminAuthProvider>
    </MemoryRouter>
  );
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders dashboard title', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGamesResponse),
    });

    renderDashboard();

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();

    // Wait for fetch to complete
    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });
  });

  it('displays games after loading', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGamesResponse),
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
      expect(screen.getByText('DEF456')).toBeInTheDocument();
      expect(screen.getByText('GHI789')).toBeInTheDocument();
    });
  });

  it('shows leader info for games', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGamesResponse),
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('(45)')).toBeInTheDocument();
    });
  });

  it('filters games by status', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGamesResponse),
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'playing' }));

    expect(screen.getByText('ABC123')).toBeInTheDocument();
    expect(screen.queryByText('DEF456')).not.toBeInTheDocument();
    expect(screen.queryByText('GHI789')).not.toBeInTheDocument();
  });

  it('navigates to game detail on row click', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGamesResponse),
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ABC123').closest('tr')!);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/games/ABC123');
  });

  it('logs out and redirects on logout button click', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGamesResponse),
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  it('redirects to login on 401 response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    renderDashboard();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  it('shows error message on fetch failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch games')).toBeInTheDocument();
    });
  });

  it('shows empty state when no games', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ games: [] }),
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('No games found')).toBeInTheDocument();
    });
  });

  it('fetches games on mount', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGamesResponse),
    });

    renderDashboard();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
