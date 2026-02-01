import type { Player } from '@snakes-and-ladders/shared';

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

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function formatOrdinal(n: number): string {
  return `${n}${getOrdinalSuffix(n)}`;
}

export function MobileStatsSheet({
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

      {/* Sheet */}
      <div
        className={`
          fixed inset-x-0 bottom-24 z-50 rounded-t-2xl bg-slate-900/95 backdrop-blur
          transition-transform duration-300 ease-out
          lg:hidden
          ${isExpanded ? 'translate-y-0' : 'translate-y-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Game statistics"
      >
        {/* Drag handle */}
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center py-3"
          aria-label="Close stats panel"
        >
          <div className="h-1 w-12 rounded-full bg-slate-600" />
        </button>

        {/* Content */}
        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-4 pb-4">
          <PositionIndicator players={players} currentPlayerId={currentPlayerId} compact={false} />
          <PlayerList players={players} currentPlayerId={currentPlayerId} />
          <MoveHistory moves={moves} maxHeight="150px" />
        </div>
      </div>

      {/* Collapsed tap target in header - rendered by parent component */}
    </>
  );
}

interface MobileStatsHeaderProps {
  players: Player[];
  currentPlayerId: string | null;
  onTap: () => void;
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
