import type { Player } from '@snakes-and-ladders/shared';
import { useRef, useCallback } from 'react';

interface PlayerGridProps {
  players: Player[];
  currentPlayerId: string | null;
  maxPlayers?: number;
}

export function PlayerGrid({ players, currentPlayerId, maxPlayers = 200 }: PlayerGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const currentPlayerRef = useRef<HTMLDivElement>(null);

  // Find current player and their index (1-based player number)
  const currentPlayerIndex = players.findIndex((p) => p.id === currentPlayerId);
  const currentPlayer = currentPlayerIndex >= 0 ? players[currentPlayerIndex] : null;
  const playerNumber = currentPlayerIndex >= 0 ? currentPlayerIndex + 1 : null;

  const scrollToMe = useCallback(() => {
    if (currentPlayerRef.current && gridRef.current) {
      currentPlayerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Hero section - Your player info */}
      {currentPlayer && playerNumber && (
        <div className="rounded-xl bg-gradient-to-r from-slate-700/50 to-slate-600/50 p-4">
          <div className="flex items-center gap-4">
            <div
              className="h-12 w-12 rounded-lg shadow-lg ring-2 ring-white/20"
              style={{ backgroundColor: currentPlayer.color }}
            />
            <div className="flex-1">
              <p className="text-sm text-slate-400">You are</p>
              <p className="text-2xl font-bold text-white">Player #{playerNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">
                {players.length} of {maxPlayers}
              </p>
              <p className="text-xs text-slate-500">players joined</p>
            </div>
          </div>
        </div>
      )}

      {/* Player grid header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Players ({players.length})</h2>
        {currentPlayer && (
          <button
            onClick={scrollToMe}
            className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-600 hover:text-white"
          >
            Find Me
          </button>
        )}
      </div>

      {/* Scrollable player grid */}
      <div ref={gridRef} className="max-h-64 overflow-y-auto rounded-xl bg-slate-700/30 p-3">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(36px,1fr))] gap-1.5">
          {players.map((player, index) => {
            const isCurrentPlayer = player.id === currentPlayerId;
            const num = index + 1;

            return (
              <div
                key={player.id}
                ref={isCurrentPlayer ? currentPlayerRef : undefined}
                className={`relative flex aspect-square items-center justify-center rounded-md text-xs font-medium transition-transform ${
                  isCurrentPlayer
                    ? 'z-10 scale-110 ring-2 ring-white ring-offset-1 ring-offset-slate-800'
                    : 'hover:scale-105'
                } ${!player.isConnected ? 'opacity-50' : ''}`}
                style={{ backgroundColor: player.color }}
                title={`${player.name}${isCurrentPlayer ? ' (you)' : ''}${!player.isConnected ? ' - disconnected' : ''}`}
              >
                <span
                  className="font-semibold drop-shadow-md"
                  style={{
                    color: getContrastColor(player.color),
                  }}
                >
                  {num}
                </span>
                {isCurrentPlayer && (
                  <span className="absolute inset-0 animate-ping rounded-md bg-white/30" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-slate-500" />
          <span>Player</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-slate-500 ring-1 ring-white" />
          <span>You</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-slate-500 opacity-50" />
          <span>Disconnected</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Returns black or white text color based on background color brightness.
 * Uses relative luminance formula for better contrast decisions.
 */
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light backgrounds, white for dark
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
