import type { Player } from '@snakes-and-ladders/shared';
import React from 'react';

interface PositionIndicatorProps {
  players: Player[];
  currentPlayerId: string | null;
  compact?: boolean;
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function formatOrdinal(n: number): string {
  return `${n}${getOrdinalSuffix(n)}`;
}

export const PositionIndicator = React.memo(function PositionIndicator({
  players,
  currentPlayerId,
  compact = false,
}: PositionIndicatorProps) {
  if (!currentPlayerId || players.length === 0) {
    return null;
  }

  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  if (!currentPlayer) {
    return null;
  }

  // Sort players by position (descending - higher position = better)
  const sortedPlayers = [...players].sort((a, b) => b.position - a.position);
  const myRank = sortedPlayers.findIndex((p) => p.id === currentPlayerId) + 1;
  const ahead = myRank - 1;
  const behind = players.length - myRank;

  // Calculate distance to leader and from last
  const leader = sortedPlayers[0];
  const lastPlace = sortedPlayers[sortedPlayers.length - 1];
  const distanceToLead = leader.position - currentPlayer.position;
  const distanceFromLast = currentPlayer.position - lastPlace.position;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="font-bold text-game-primary">{formatOrdinal(myRank)}</span>
        {ahead > 0 && <span className="text-red-400">{ahead} ahead</span>}
        {behind > 0 && <span className="text-green-400">{behind} behind</span>}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-700/30 p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-2xl font-bold text-game-primary">{formatOrdinal(myRank)}</span>
          <span className="ml-2 text-slate-400">place</span>
        </div>
        <div className="text-right text-sm">
          <div className="text-slate-300">
            Position: <span className="font-bold text-white">{currentPlayer.position}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-4 text-sm">
        {ahead > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-red-400">{ahead}</span>
            <span className="text-slate-500">ahead</span>
            {distanceToLead > 0 && myRank > 1 && (
              <span className="text-xs text-slate-600">({distanceToLead} squares to lead)</span>
            )}
          </div>
        )}
        {behind > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-green-400">{behind}</span>
            <span className="text-slate-500">behind</span>
            {distanceFromLast > 0 && myRank < players.length && (
              <span className="text-xs text-slate-600">(+{distanceFromLast} from last)</span>
            )}
          </div>
        )}
        {ahead === 0 && behind === 0 && <span className="text-slate-500">Solo game</span>}
        {ahead === 0 && behind > 0 && (
          <span className="text-game-secondary font-medium">Leading!</span>
        )}
      </div>
    </div>
  );
});
