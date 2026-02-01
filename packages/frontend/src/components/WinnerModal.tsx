import { useEffect, useState } from 'react';

import { Button } from './ui/Button';

interface WinnerModalProps {
  winnerName: string;
  winnerColor: string;
  isCurrentPlayer: boolean;
  onPlayAgain: () => void;
  onLeaveGame: () => void;
}

// Generate confetti pieces
function Confetti() {
  const colors = [
    '#EF4444',
    '#3B82F6',
    '#22C55E',
    '#EAB308',
    '#A855F7',
    '#F97316',
    '#06B6D4',
    '#EC4899',
  ];
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${2 + Math.random() * 2}s`,
    size: `${8 + Math.random() * 8}px`,
  }));

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: piece.left,
            top: '-20px',
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function WinnerModal({
  winnerName,
  winnerColor,
  isCurrentPlayer,
  onPlayAgain,
  onLeaveGame,
}: WinnerModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Confetti */}
      <Confetti />

      {/* Modal */}
      <div
        className={`relative z-10 w-full max-w-md rounded-2xl bg-slate-800/90 p-8 text-center shadow-2xl backdrop-blur transition-all duration-500 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      >
        {/* Trophy icon */}
        <div className="mb-4 animate-winner-bounce">
          <svg
            className="mx-auto h-20 w-20 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            <path d="M19 3H5v4c0 1.1.9 2 2 2h1c0 1.66 1.34 3 3 3h2c1.66 0 3-1.34 3-3h1c1.1 0 2-.9 2-2V3zm-7 14h2v3h-2z" />
          </svg>
          <svg
            className="mx-auto -mt-16 h-20 w-20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-2.927 0"
              className="text-yellow-400"
            />
          </svg>
        </div>

        {/* Winner text */}
        <h2 className="mb-2 text-xl text-slate-300">
          {isCurrentPlayer ? 'Congratulations!' : 'Game Over!'}
        </h2>
        <div className="mb-6">
          <span
            className="inline-block rounded-full px-4 py-2 text-2xl font-bold text-white"
            style={{ backgroundColor: winnerColor }}
          >
            {winnerName}
          </span>
          <p className="mt-2 text-lg text-game-secondary">
            {isCurrentPlayer ? 'You won!' : 'wins the game!'}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={onPlayAgain} variant="primary">
            Play Again
          </Button>
          <Button onClick={onLeaveGame} variant="secondary">
            Leave Game
          </Button>
        </div>
      </div>
    </div>
  );
}
