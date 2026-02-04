import { useRef, useEffect, useState, useCallback, lazy, Suspense } from 'react';

import { useGame } from '../contexts/GameContext';

import { Dice3D } from './Dice3D';
import { MobileStatsSheet } from './MobileStatsSheet';
import { MoveHistory } from './MoveHistory';
import { PlayerList } from './PlayerList';
import { PositionIndicator } from './PositionIndicator';
import { WinnerModal } from './WinnerModal';

// Lazy load ThreeDice for bundle optimization
const ThreeDice = lazy(() => import('./ThreeDice'));

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
  const containerRef = useRef<HTMLDivElement>(null);
  const { game, players, currentPlayerId, rollDice, lastMove, moves, resetGame } = useGame();
  const board = game?.board;
  const [canvasSize, setCanvasSize] = useState(500);

  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const winner = game?.winnerId ? players.find((p) => p.id === game.winnerId) : null;

  // Mobile stats sheet state
  const [isMobileStatsExpanded, setIsMobileStatsExpanded] = useState(false);

  // Determine if dice should animate (only for the player who rolled)
  const shouldAnimateDice = lastMove?.playerId === currentPlayerId;

  // Responsive canvas sizing
  const updateCanvasSize = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 32; // padding
      const containerHeight = window.innerHeight - 200; // Account for header/footer
      const maxSize = Math.min(containerWidth, containerHeight, 800); // Increased from 500
      setCanvasSize(Math.max(280, maxSize)); // minimum 280px for playability
    }
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // Simple canvas-based board rendering (placeholder for WebGL)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const boardSize = 10;
    const cellSize = canvasSize / boardSize;
    const width = canvasSize;
    const height = canvasSize;

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

        // Cell number (responsive font size)
        ctx.fillStyle = '#9CA3AF';
        const fontSize = Math.max(10, cellSize * 0.24);
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(cellNumber.toString(), x + cellSize / 2, y + fontSize + 2);
      }
    }

    // Draw snakes and ladders
    if (board?.snakesAndLadders) {
      board.snakesAndLadders.forEach((item) => {
        const startCoords = getCellCoordinates(item.start, cellSize, boardSize);
        const endCoords = getCellCoordinates(item.end, cellSize, boardSize);

        // Scale factors for responsive drawing
        const lineScale = cellSize / 50;

        if (item.type === 'ladder') {
          // Draw ladder as two parallel lines with rungs
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)'; // Green
          ctx.lineWidth = Math.max(2, 3 * lineScale);
          ctx.lineCap = 'round';

          // Calculate perpendicular offset for parallel rails
          const dx = endCoords.x - startCoords.x;
          const dy = endCoords.y - startCoords.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const railOffset = 8 * lineScale;
          const perpX = (-dy / length) * railOffset;
          const perpY = (dx / length) * railOffset;

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
          ctx.lineWidth = Math.max(1, 2 * lineScale);
          const numRungs = Math.max(3, Math.floor(length / (30 * lineScale)));
          for (let i = 1; i < numRungs; i++) {
            const t = i / numRungs;
            const rungX = startCoords.x + dx * t;
            const rungY = startCoords.y + dy * t;
            ctx.beginPath();
            ctx.moveTo(rungX + perpX, rungY + perpY);
            ctx.lineTo(rungX - perpX, rungY - perpY);
            ctx.stroke();
          }
        } else {
          // Draw snake as a curved wavy line
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; // Red
          ctx.lineWidth = Math.max(3, 6 * lineScale);
          ctx.lineCap = 'round';

          const dx = endCoords.x - startCoords.x;
          const dy = endCoords.y - startCoords.y;
          const length = Math.sqrt(dx * dx + dy * dy);

          // Draw wavy snake body using quadratic curves
          ctx.beginPath();
          ctx.moveTo(startCoords.x, startCoords.y);

          const segments = 4;
          const waveAmplitude = Math.min(20 * lineScale, length / 8);
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
          const headSize = Math.max(5, 8 * lineScale);
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
          ctx.arc(endCoords.x, endCoords.y, Math.max(2, 4 * lineScale), 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw players with numbers
    const playerRadius = Math.max(10, cellSize * 0.28);
    const playerOffset = Math.max(12, cellSize * 0.35);
    players.forEach((player, index) => {
      if (player.position > 0) {
        const pos = player.position;
        const row = Math.floor((pos - 1) / boardSize);
        const col = row % 2 === 0 ? (pos - 1) % boardSize : boardSize - 1 - ((pos - 1) % boardSize);

        const x = col * cellSize + cellSize / 2;
        const y = (boardSize - 1 - row) * cellSize + cellSize / 2;

        // Offset multiple players on same cell
        const offsetX = (index % 2) * playerOffset - playerOffset / 2;
        const offsetY = Math.floor(index / 2) * playerOffset - playerOffset / 2;

        const playerX = x + offsetX;
        const playerY = y + offsetY;

        // Draw player circle
        ctx.beginPath();
        ctx.arc(playerX, playerY, playerRadius, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = Math.max(2, 3 * (cellSize / 50));
        ctx.stroke();

        // Draw player number
        const playerNumber = index + 1;
        const numberFontSize = Math.max(10, playerRadius * 1.2);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${numberFontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(playerNumber.toString(), playerX, playerY);
      }
    });
  }, [players, board, canvasSize]);

  return (
    <div data-testid="game-board" className="flex min-h-[100dvh] flex-col lg:flex-row">
      {/* Mobile header with game info and menu */}
      <div className="flex items-center justify-between bg-slate-800/50 px-4 py-2 lg:hidden">
        <span className="font-mono text-lg font-bold text-game-primary">{game?.code}</span>

        {/* Center: Position/rank info */}
        {game?.status === 'playing' && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Pos:</span>
            <span className="font-bold text-white">{currentPlayer?.position ?? 0}</span>
          </div>
        )}

        {/* Menu button for stats */}
        <button
          onClick={() => setIsMobileStatsExpanded(true)}
          className="flex items-center gap-1 rounded-lg bg-slate-700/50 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-700"
          aria-label="Open game menu"
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <span className="hidden sm:inline">Menu</span>
        </button>
      </div>

      {/* Game Board - centered and responsive */}
      <div ref={containerRef} className="flex flex-1 items-center justify-center p-4">
        <div className="rounded-xl bg-slate-800/50 p-2 backdrop-blur sm:p-4">
          <canvas
            ref={canvasRef}
            className="rounded-lg"
            style={{ width: `${canvasSize}px`, height: `${canvasSize}px` }}
          />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden w-80 bg-slate-800/30 p-4 lg:block">
        <h2 className="mb-4 text-xl font-bold text-white">{game?.code && `Game: ${game.code}`}</h2>

        <PlayerList players={players} currentPlayerId={currentPlayerId} />

        {/* Position Indicator */}
        {game?.status === 'playing' && (
          <div className="mt-4">
            <PositionIndicator players={players} currentPlayerId={currentPlayerId} />
          </div>
        )}

        {/* Game Status - Desktop (Dice above Move History) */}
        {winner ? (
          <div className="mt-4 rounded-xl bg-game-secondary/20 p-4 text-center">
            <p className="text-lg font-bold text-game-secondary">{winner.name} wins!</p>
          </div>
        ) : (
          <div className="mt-4">
            {/* Desktop Dice */}
            <div className="flex flex-col items-center gap-3 rounded-xl bg-slate-700/30 p-4">
              <p className="text-sm text-slate-400">Click to roll</p>
              <Suspense
                fallback={
                  <Dice3D
                    onRoll={rollDice}
                    disabled={game?.status !== 'playing'}
                    lastRoll={lastMove?.diceRoll ?? null}
                    size="lg"
                    animate={shouldAnimateDice}
                  />
                }
              >
                <ThreeDice
                  onRoll={rollDice}
                  disabled={game?.status !== 'playing'}
                  lastRoll={lastMove?.diceRoll ?? null}
                  size="lg"
                  animate={shouldAnimateDice}
                />
              </Suspense>
              <p className="text-center text-xs text-slate-400">
                Your position: {currentPlayer?.position ?? 0}
              </p>
            </div>
          </div>
        )}

        {/* Move History */}
        {game?.status === 'playing' && (
          <div className="mt-4">
            <MoveHistory moves={moves} maxHeight="180px" />
          </div>
        )}
      </div>

      {/* Mobile Bottom Bar with Big Dice */}
      <div className="fixed inset-x-0 bottom-0 flex items-center bg-slate-900/95 p-3 backdrop-blur lg:hidden">
        {/* Left side: Last move info */}
        <div className="flex flex-1 flex-col justify-center">
          {winner ? (
            <p className="text-lg font-bold text-game-secondary">{winner.name} wins!</p>
          ) : lastMove ? (
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-white">
                {players.find((p) => p.id === lastMove.playerId)?.name} rolled{' '}
                <span className="font-bold text-game-primary">{lastMove.diceRoll}</span>
              </p>
              <p className="text-xs text-slate-400">
                {lastMove.previousPosition} → {lastMove.newPosition}
                {lastMove.effect && (
                  <span
                    className={`ml-1 font-medium ${
                      lastMove.effect.type === 'ladder' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {lastMove.effect.type === 'ladder' ? '↑ Ladder!' : '↓ Snake!'}
                  </span>
                )}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Tap the dice to roll</p>
          )}
        </div>

        {/* Right side: Big Dice */}
        {!winner && (
          <div className="ml-4 flex-shrink-0">
            <Suspense
              fallback={
                <Dice3D
                  onRoll={rollDice}
                  disabled={game?.status !== 'playing'}
                  lastRoll={lastMove?.diceRoll ?? null}
                  size="lg"
                  animate={shouldAnimateDice}
                />
              }
            >
              <ThreeDice
                onRoll={rollDice}
                disabled={game?.status !== 'playing'}
                lastRoll={lastMove?.diceRoll ?? null}
                size="lg"
                animate={shouldAnimateDice}
              />
            </Suspense>
          </div>
        )}
      </div>

      {/* Mobile Stats Sheet */}
      {game?.status === 'playing' && (
        <MobileStatsSheet
          isExpanded={isMobileStatsExpanded}
          onToggle={() => setIsMobileStatsExpanded((prev) => !prev)}
          players={players}
          currentPlayerId={currentPlayerId}
          moves={moves}
        />
      )}

      {/* Spacer for fixed bottom bar on mobile */}
      <div className="h-24 lg:hidden" />

      {/* Winner Modal */}
      {winner && game?.status === 'finished' && (
        <WinnerModal
          winnerName={winner.name}
          winnerColor={winner.color}
          isCurrentPlayer={winner.id === currentPlayerId}
          onPlayAgain={resetGame}
          onLeaveGame={resetGame}
        />
      )}
    </div>
  );
}
