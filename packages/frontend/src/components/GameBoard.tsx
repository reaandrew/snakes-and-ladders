import { useRef, useEffect } from 'react';

import { useGame } from '../contexts/GameContext';

import { PlayerList } from './PlayerList';
import { Button } from './ui/Button';

// Helper function to convert cell number to canvas coordinates
function getCellCoordinates(cellNumber: number, cellSize: number, boardSize: number) {
  const row = Math.floor((cellNumber - 1) / boardSize);
  const col =
    row % 2 === 0 ? (cellNumber - 1) % boardSize : boardSize - 1 - ((cellNumber - 1) % boardSize);

  return {
    x: col * cellSize + cellSize / 2,
    y: (boardSize - 1 - row) * cellSize + cellSize / 2,
  };
}

export function GameBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { game, players, currentPlayerId, rollDice, lastMove } = useGame();
  const board = game?.board;

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
        // Convert visual row to logical row for correct cell numbering
        const logicalRow = boardSize - 1 - row;
        const isLogicalRowEven = logicalRow % 2 === 0;
        const cellNumber = isLogicalRowEven
          ? logicalRow * boardSize + col + 1
          : logicalRow * boardSize + (boardSize - col);

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

    // Draw snakes and ladders
    if (board?.snakesAndLadders) {
      board.snakesAndLadders.forEach((item) => {
        const startCoords = getCellCoordinates(item.start, cellSize, boardSize);
        const endCoords = getCellCoordinates(item.end, cellSize, boardSize);

        if (item.type === 'ladder') {
          // Draw ladder as two parallel lines with rungs
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)'; // Green
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';

          // Calculate perpendicular offset for parallel rails
          const dx = endCoords.x - startCoords.x;
          const dy = endCoords.y - startCoords.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const perpX = (-dy / length) * 8;
          const perpY = (dx / length) * 8;

          // Left rail
          ctx.beginPath();
          ctx.moveTo(startCoords.x + perpX, startCoords.y + perpY);
          ctx.lineTo(endCoords.x + perpX, endCoords.y + perpY);
          ctx.stroke();

          // Right rail
          ctx.beginPath();
          ctx.moveTo(startCoords.x - perpX, startCoords.y - perpY);
          ctx.lineTo(endCoords.x - perpX, endCoords.y - perpY);
          ctx.stroke();

          // Draw rungs
          ctx.lineWidth = 2;
          const numRungs = Math.max(3, Math.floor(length / 30));
          for (let i = 1; i < numRungs; i++) {
            const t = i / numRungs;
            const rungX = startCoords.x + dx * t;
            const rungY = startCoords.y + dy * t;
            ctx.beginPath();
            ctx.moveTo(rungX + perpX, rungY + perpY);
            ctx.lineTo(rungX - perpX, rungY - perpY);
            ctx.stroke();
          }

          // Draw end markers (circles)
          ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
          ctx.beginPath();
          ctx.arc(startCoords.x, startCoords.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(endCoords.x, endCoords.y, 6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Draw snake as a curved wavy line
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; // Red
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';

          const dx = endCoords.x - startCoords.x;
          const dy = endCoords.y - startCoords.y;
          const length = Math.sqrt(dx * dx + dy * dy);

          // Draw wavy snake body using quadratic curves
          ctx.beginPath();
          ctx.moveTo(startCoords.x, startCoords.y);

          const segments = 4;
          const waveAmplitude = Math.min(20, length / 8);
          for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const prevT = (i - 0.5) / segments;

            // Control point with wave offset
            const perpX = -dy / length;
            const perpY = dx / length;
            const waveOffset = (i % 2 === 0 ? 1 : -1) * waveAmplitude;

            const cpX = startCoords.x + dx * prevT + perpX * waveOffset;
            const cpY = startCoords.y + dy * prevT + perpY * waveOffset;
            const endX = startCoords.x + dx * t;
            const endY = startCoords.y + dy * t;

            ctx.quadraticCurveTo(cpX, cpY, endX, endY);
          }
          ctx.stroke();

          // Draw snake head (triangle at start - snakes go from high to low)
          ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
          const headSize = 8;
          const angle = Math.atan2(dy, dx);
          ctx.beginPath();
          ctx.moveTo(
            startCoords.x + Math.cos(angle) * headSize,
            startCoords.y + Math.sin(angle) * headSize
          );
          ctx.lineTo(
            startCoords.x + Math.cos(angle + 2.5) * headSize,
            startCoords.y + Math.sin(angle + 2.5) * headSize
          );
          ctx.lineTo(
            startCoords.x + Math.cos(angle - 2.5) * headSize,
            startCoords.y + Math.sin(angle - 2.5) * headSize
          );
          ctx.closePath();
          ctx.fill();

          // Draw snake tail (small circle at end)
          ctx.beginPath();
          ctx.arc(endCoords.x, endCoords.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
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
  }, [players, board]);

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
