import type { AdminGameDetailResponse, Move } from '@snakes-and-ladders/shared';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAdminAuth } from '../../contexts/AdminAuthContext';

import { PlayerRaceChart } from './PlayerRaceChart';

export function AdminGameView() {
  const { code } = useParams<{ code: string }>();
  const [gameData, setGameData] = useState<AdminGameDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { authFetch, logout } = useAdminAuth();
  const navigate = useNavigate();

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const fetchGameDetail = useCallback(() => {
    if (!code) return;

    authFetch(`${apiUrl}/admin/games/${code}`)
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 401) {
            logout();
            void navigate('/admin');
            return;
          }
          if (response.status === 404) {
            setError('Game not found');
            return;
          }
          throw new Error('Failed to fetch game');
        }
        const data = (await response.json()) as AdminGameDetailResponse;
        setGameData(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'An error occurred');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [authFetch, apiUrl, code, logout, navigate]);

  useEffect(() => {
    fetchGameDetail();
    const interval = setInterval(fetchGameDetail, 2000);
    return () => clearInterval(interval);
  }, [fetchGameDetail]);

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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const handleBack = () => {
    void navigate('/admin/dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="rounded-lg bg-red-500/20 px-4 py-3 text-red-400">{error}</div>
        <button
          onClick={handleBack}
          className="rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!gameData) return null;

  const { game, players, moves } = gameData;

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={handleBack}
            className="rounded-lg bg-slate-700 px-3 py-2 text-white transition-colors hover:bg-slate-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">
                Game <span className="font-mono text-indigo-400">{game.code}</span>
              </h1>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(game.status)}`}
              >
                {game.status}
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Created {new Date(game.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Player Race Chart */}
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-bold text-white">Player Progress</h2>
          <PlayerRaceChart players={players} boardSize={game.board.size} />
        </div>

        {/* Recent Moves */}
        <div>
          <h2 className="mb-3 text-lg font-bold text-white">Recent Moves</h2>
          {moves.length === 0 ? (
            <div className="rounded-xl bg-slate-800/50 p-4 text-center text-slate-400">
              No moves yet
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-xl bg-slate-800/50">
              <div className="space-y-1 p-2">
                {moves.map((move: Move) => (
                  <div
                    key={move.id}
                    className="flex items-center gap-3 rounded-lg bg-slate-700/30 px-3 py-2"
                  >
                    {/* Player color indicator */}
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: move.playerColor }}
                    />

                    {/* Move info */}
                    <div className="flex-1">
                      <span className="font-medium text-white">{move.playerName}</span>
                      <span className="text-slate-400"> rolled </span>
                      <span className="font-bold text-indigo-400">{move.diceRoll}</span>
                      <span className="text-slate-400">
                        {' '}
                        ({move.previousPosition} → {move.newPosition})
                      </span>
                      {move.effect && (
                        <span
                          className={`ml-2 text-sm font-medium ${
                            move.effect.type === 'ladder' ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {move.effect.type === 'ladder' ? '↑ Ladder!' : '↓ Snake!'}
                        </span>
                      )}
                    </div>

                    {/* Timestamp */}
                    <span className="text-xs text-slate-500">{formatTime(move.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
