import type { Player } from '@snakes-and-ladders/shared';
import React from 'react';

import { MoveHistory } from './MoveHistory';
import { PlayerList } from './PlayerList';
import { PositionIndicator } from './PositionIndicator';

interface MoveHistoryEntry {
  id: string;
  playerColor: string;
  playerName: string;
  diceRoll: number;
  previousPosition: number;
  newPosition: number;
  effect?: { type: 'snake' | 'ladder'; from: number; to: number };
}

interface MobileStatsSheetProps {
  isExpanded: boolean;
  onToggle: () => void;
  players: Player[];
  currentPlayerId: string | null;
  moves: MoveHistoryEntry[];
}

export const MobileStatsSheet = React.memo(function MobileStatsSheet({
  isExpanded,
  onToggle,
  players,
  currentPlayerId,
  moves,
}: MobileStatsSheetProps) {
  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Dropdown Sheet from top */}
      <div
        className={`
          fixed inset-x-0 top-0 z-50 rounded-b-2xl bg-slate-900/95 shadow-2xl backdrop-blur
          transition-transform duration-300 ease-out
          lg:hidden
          ${isExpanded ? 'translate-y-0' : '-translate-y-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Game statistics"
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
          <h2 className="text-lg font-bold text-white">Game Stats</h2>
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700/50 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Close menu"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          <PositionIndicator players={players} currentPlayerId={currentPlayerId} compact={false} />
          <PlayerList players={players} currentPlayerId={currentPlayerId} />
          <MoveHistory moves={moves} maxHeight="200px" />
        </div>

        {/* Bottom drag handle */}
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center py-2"
          aria-label="Close stats panel"
        >
          <div className="h-1 w-12 rounded-full bg-slate-600" />
        </button>
      </div>
    </>
  );
});

// Keep for backwards compatibility but no longer used
interface MobileStatsHeaderProps {
  players: Player[];
  currentPlayerId: string | null;
  onTap: () => void;
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function formatOrdinal(n: number): string {
  return `${n}${getOrdinalSuffix(n)}`;
}

export function MobileStatsHeader({ players, currentPlayerId, onTap }: MobileStatsHeaderProps) {
  const sortedPlayers = [...players].sort((a, b) => b.position - a.position);
  const myRank = sortedPlayers.findIndex((p) => p.id === currentPlayerId) + 1;

  if (myRank === 0) {
    return null;
  }

  return (
    <button
      onClick={onTap}
      className="flex items-center gap-2 rounded-lg bg-slate-700/50 px-3 py-1.5 transition-colors hover:bg-slate-700"
      aria-label="Open game statistics"
    >
      <span className="text-lg font-bold text-game-primary">{formatOrdinal(myRank)}</span>
      <span className="text-xs text-slate-400">Tap for details</span>
    </button>
  );
}
