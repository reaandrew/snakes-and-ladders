import React from 'react';

interface MoveHistoryEntry {
  id: string;
  playerColor: string;
  playerName: string;
  diceRoll: number;
  previousPosition: number;
  newPosition: number;
  effect?: { type: 'snake' | 'ladder'; from: number; to: number };
}

interface MoveHistoryProps {
  moves: MoveHistoryEntry[];
  maxHeight?: string;
}

export const MoveHistory = React.memo(function MoveHistory({
  moves,
  maxHeight = '200px',
}: MoveHistoryProps) {
  if (moves.length === 0) {
    return (
      <div className="rounded-xl bg-slate-700/30 p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-300">Move History</h3>
        <p className="text-xs text-slate-500">No moves yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-700/30 p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-300">Move History</h3>
      <div
        className="space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600"
        style={{ maxHeight }}
      >
        {moves.map((move, index) => (
          <div
            key={move.id || index}
            className="flex items-start gap-2 rounded-lg bg-slate-800/50 p-2 text-xs"
          >
            {/* Player indicator */}
            <div
              className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full"
              style={{ backgroundColor: move.playerColor }}
            />

            {/* Move details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-medium text-white truncate">{move.playerName}</span>
                <span className="text-slate-500">rolled</span>
                <span className="font-bold text-game-primary">{move.diceRoll}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <span>{move.previousPosition}</span>
                <span className="text-slate-600">→</span>
                <span className="text-white">{move.newPosition}</span>
                {move.effect && (
                  <span
                    className={`ml-1 ${
                      move.effect.type === 'ladder' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {move.effect.type === 'ladder' ? '↑' : '↓'}{' '}
                    {move.effect.type === 'ladder' ? 'Ladder' : 'Snake'}!
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
