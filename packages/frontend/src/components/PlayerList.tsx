import type { Player } from '@snakes-and-ladders/shared';
import React from 'react';

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string | null;
}

export const PlayerList = React.memo(function PlayerList({
  players,
  currentPlayerId,
}: PlayerListProps) {
  return (
    <div className="rounded-xl bg-slate-700/30 p-4">
      <h2 className="mb-3 text-lg font-semibold text-white">Players ({players.length})</h2>
      <ul className="space-y-2">
        {players.map((player) => (
          <li
            key={player.id}
            data-testid="player-list-item"
            className={`flex items-center gap-3 rounded-lg p-2 ${
              player.id === currentPlayerId ? 'bg-slate-600/50' : ''
            }`}
          >
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: player.color }} />
            <span className="text-white">
              {player.name}
              {player.id === currentPlayerId && (
                <span className="ml-2 text-xs text-slate-400">(you)</span>
              )}
            </span>
            <div
              className={`ml-auto h-2 w-2 rounded-full ${
                player.isConnected ? 'bg-green-500' : 'bg-slate-500'
              }`}
              title={player.isConnected ? 'Connected' : 'Disconnected'}
            />
          </li>
        ))}
      </ul>
    </div>
  );
});
