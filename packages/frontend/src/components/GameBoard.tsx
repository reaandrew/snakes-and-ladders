import { useRef, useEffect } from 'react';

import { useGame } from '../contexts/GameContext';

import { PlayerList } from './PlayerList';
import { Button } from './ui/Button';

export function GameBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { game, players, currentPlayerId, rollDice, lastMove } = useGame();

  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const winner = game?.winnerId ? players.find((p) => p.id === game.winnerId) : null;

  // Simple canvas-based board rendering (placeholder for WebGL)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = 50;
    const boardSize = 10;
    const width = cellSize * boardSize;
    const height = cellSize * boardSize;

    canvas.width = width;
    canvas.height = height;

    // Draw board
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const isEvenRow = row % 2 === 0;
        const cellNumber = isEvenRow
          ? (boardSize - 1 - row) * boardSize + col + 1
          : (boardSize - 1 - row) * boardSize + (boardSize - col);

        const x = col * cellSize;
        const y = row * cellSize;

        // Alternating colors
        ctx.fillStyle = (row + col) % 2 === 0 ? '#374151' : '#4B5563';
        ctx.fillRect(x, y, cellSize, cellSize);

        // Cell number
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(cellNumber.toString(), x + cellSize / 2, y + 15);
      }
    }

    // Draw players
    players.forEach((player, index) => {
      if (player.position > 0) {
        const pos = player.position;
        const row = Math.floor((pos - 1) / boardSize);
        const col = row % 2 === 0 ? (pos - 1) % boardSize : boardSize - 1 - ((pos - 1) % boardSize);

        const x = col * cellSize + cellSize / 2;
        const y = (boardSize - 1 - row) * cellSize + cellSize / 2 + 10;

        // Offset multiple players on same cell
        const offsetX = (index % 2) * 15 - 7;
        const offsetY = Math.floor(index / 2) * 15 - 7;

        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, 12, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [players]);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Game Board */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="rounded-xl bg-slate-800/50 p-4 backdrop-blur">
          <canvas
            ref={canvasRef}
            className="rounded-lg"
            style={{ width: '500px', height: '500px' }}
          />
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full bg-slate-800/30 p-4 lg:w-80">
        <h2 className="mb-4 text-xl font-bold text-white">{game?.code && `Game: ${game.code}`}</h2>

        <PlayerList players={players} currentPlayerId={currentPlayerId} />

        {/* Last Move Info */}
        {lastMove && (
          <div className="mt-4 rounded-xl bg-slate-700/30 p-4">
            <p className="text-sm text-slate-300">
              {players.find((p) => p.id === lastMove.playerId)?.name} rolled{' '}
              <span className="font-bold text-game-primary">{lastMove.diceRoll}</span>
            </p>
            <p className="text-sm text-slate-400">
              {lastMove.previousPosition} → {lastMove.newPosition}
              {lastMove.effect && (
                <span
                  className={lastMove.effect.type === 'ladder' ? 'text-green-400' : 'text-red-400'}
                >
                  {' '}
                  ({lastMove.effect.type === 'ladder' ? '↑' : '↓'} {lastMove.effect.type}!)
                </span>
              )}
            </p>
          </div>
        )}

        {/* Game Status */}
        {winner ? (
          <div className="mt-4 rounded-xl bg-game-secondary/20 p-4 text-center">
            <p className="text-lg font-bold text-game-secondary">{winner.name} wins!</p>
          </div>
        ) : (
          <div className="mt-4">
            <Button
              onClick={rollDice}
              variant="primary"
              fullWidth
              disabled={game?.status !== 'playing'}
            >
              Roll Dice
            </Button>
            <p className="mt-2 text-center text-xs text-slate-400">
              Your position: {currentPlayer?.position ?? 0}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
