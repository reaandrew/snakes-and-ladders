import type { AdminGameSummary, AdminGamesResponse } from '@snakes-and-ladders/shared';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAdminAuth } from '../../contexts/AdminAuthContext';

type StatusFilter = 'all' | 'waiting' | 'playing' | 'finished';

export function AdminDashboard() {
  const [games, setGames] = useState<AdminGameSummary[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { authFetch, logout } = useAdminAuth();
  const navigate = useNavigate();

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const fetchGames = useCallback(() => {
    authFetch(`${apiUrl}/admin/games`)
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 401) {
            logout();
            void navigate('/admin');
            return;
          }
          throw new Error('Failed to fetch games');
        }
        const data = (await response.json()) as AdminGamesResponse;
        setGames(data.games);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'An error occurred');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [authFetch, apiUrl, logout, navigate]);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 5000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  const filteredGames = filter === 'all' ? games : games.filter((game) => game.status === filter);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'playing':
        return 'bg-green-500/20 text-green-400';
      case 'finished':
        return 'bg-slate-500/20 text-slate-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const handleLogout = () => {
    logout();
    void navigate('/admin');
  };

  const handleGameClick = (code: string) => {
    void navigate(`/admin/games/${code}`);
  };

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600"
          >
            Logout
          </button>
        </div>

        {/* Filter tabs */}
        <div className="mb-6 flex gap-2">
          {(['all', 'waiting', 'playing', 'finished'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                filter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 px-4 py-3 text-red-400">{error}</div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="rounded-xl bg-slate-800/50 p-8 text-center text-slate-400">
            No games found
          </div>
        ) : (
          /* Games table */
          <div className="overflow-hidden rounded-xl bg-slate-800/50">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                    Players
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Leader</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredGames.map((game) => (
                  <tr
                    key={game.code}
                    onClick={() => handleGameClick(game.code)}
                    className="cursor-pointer border-b border-slate-700/50 transition-colors hover:bg-slate-700/30"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-indigo-400">{game.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(game.status)}`}
                      >
                        {game.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white">{game.playerCount}</td>
                    <td className="px-4 py-3">
                      {game.leaderName ? (
                        <span className="text-white">
                          {game.leaderName}{' '}
                          <span className="text-slate-400">({game.leaderPosition})</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {formatDate(game.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
