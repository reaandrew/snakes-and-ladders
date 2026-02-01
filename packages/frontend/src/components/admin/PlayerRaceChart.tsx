import type { AdminPlayerDetail } from '@snakes-and-ladders/shared';

interface PlayerRaceChartProps {
  players: AdminPlayerDetail[];
  boardSize: number;
}

export function PlayerRaceChart({ players, boardSize }: PlayerRaceChartProps) {
  if (players.length === 0) {
    return (
      <div className="rounded-xl bg-slate-800/50 p-4 text-center text-slate-400">
        No players in this game
      </div>
    );
  }

  const leader = players[0]; // Already sorted by position descending
  const leaderPercent = (leader.position / boardSize) * 100;

  return (
    <div className="rounded-xl bg-slate-800/50 p-4">
      {/* Leader indicator */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm font-medium text-slate-400">LEADER:</span>
        <span className="font-bold text-white">{leader.name}</span>
        <span className="text-slate-400">({leader.position})</span>
      </div>

      {/* Race chart container */}
      <div className="relative">
        {/* Leader line - vertical indicator */}
        <div
          className="absolute top-0 z-10 h-full w-0.5 bg-red-500"
          style={{ left: `${leaderPercent}%` }}
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
            {leader.position}
          </div>
        </div>

        {/* Player bars */}
        <div className="space-y-3">
          {players.map((player) => {
            const positionPercent = (player.position / boardSize) * 100;

            return (
              <div key={player.id} className="flex items-center gap-3">
                {/* Rank */}
                <span className="w-6 text-right text-sm font-bold text-slate-400">
                  {player.rank}
                </span>

                {/* Name */}
                <span className="w-24 truncate text-sm font-medium text-white">{player.name}</span>

                {/* Progress bar container */}
                <div className="relative h-6 flex-1 overflow-hidden rounded bg-slate-700">
                  {/* Progress bar fill */}
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-500"
                    style={{
                      width: `${positionPercent}%`,
                      backgroundColor: player.color,
                    }}
                  />

                  {/* Remaining distance (unfilled) */}
                  <div
                    className="absolute inset-y-0 right-0 bg-slate-600/50"
                    style={{ width: `${100 - positionPercent}%` }}
                  />
                </div>

                {/* Position number */}
                <span className="w-8 text-right text-sm font-bold text-white">
                  {player.position}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>Start (0)</span>
        <span>Finish ({boardSize})</span>
      </div>
    </div>
  );
}
