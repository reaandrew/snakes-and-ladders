import { useState, useEffect, useCallback } from 'react';

interface Dice3DProps {
  onRoll: () => void;
  disabled: boolean;
  lastRoll: number | null;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

// Rotation values to show each face
const faceRotations: Record<number, string> = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateX(-90deg) rotateY(0deg)',
  3: 'rotateX(0deg) rotateY(90deg)',
  4: 'rotateX(0deg) rotateY(-90deg)',
  5: 'rotateX(90deg) rotateY(0deg)',
  6: 'rotateX(180deg) rotateY(0deg)',
};

// Dot patterns for each face
function DiceDots({ value, dotSize }: { value: number; dotSize: string }) {
  const dotClass = `${dotSize} rounded-full bg-slate-800`;

  const patterns: Record<number, JSX.Element> = {
    1: (
      <div className="flex h-full items-center justify-center">
        <div className={dotClass} />
      </div>
    ),
    2: (
      <div className="flex h-full flex-col justify-between p-[15%]">
        <div className={`${dotClass} self-start`} />
        <div className={`${dotClass} self-end`} />
      </div>
    ),
    3: (
      <div className="flex h-full flex-col justify-between p-[15%]">
        <div className={`${dotClass} self-start`} />
        <div className={`${dotClass} self-center`} />
        <div className={`${dotClass} self-end`} />
      </div>
    ),
    4: (
      <div className="grid h-full grid-cols-2 gap-1 p-[15%]">
        <div className={dotClass} />
        <div className={`${dotClass} justify-self-end`} />
        <div className={dotClass} />
        <div className={`${dotClass} justify-self-end`} />
      </div>
    ),
    5: (
      <div className="grid h-full grid-cols-2 gap-1 p-[15%]">
        <div className={dotClass} />
        <div className={`${dotClass} justify-self-end`} />
        <div className={`${dotClass} col-span-2 justify-self-center`} />
        <div className={dotClass} />
        <div className={`${dotClass} justify-self-end`} />
      </div>
    ),
    6: (
      <div className="grid h-full grid-cols-2 gap-1 p-[15%]">
        <div className={dotClass} />
        <div className={`${dotClass} justify-self-end`} />
        <div className={dotClass} />
        <div className={`${dotClass} justify-self-end`} />
        <div className={dotClass} />
        <div className={`${dotClass} justify-self-end`} />
      </div>
    ),
  };

  return patterns[value];
}

export function Dice3D({ onRoll, disabled, lastRoll, size = 'md', animate = true }: Dice3DProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [displayValue, setDisplayValue] = useState<number>(1);
  const [spinCount, setSpinCount] = useState(0);

  const sizeClasses = {
    sm: { container: 'h-12 w-12', perspective: '200px', dot: 'h-1.5 w-1.5' },
    md: {
      container: 'h-16 w-16 sm:h-20 sm:w-20',
      perspective: '400px',
      dot: 'h-2 w-2 sm:h-3 sm:w-3',
    },
    lg: { container: 'h-24 w-24', perspective: '600px', dot: 'h-4 w-4' },
  };

  const { container, perspective, dot } = sizeClasses[size];

  // Handle the roll animation when lastRoll changes
  useEffect(() => {
    if (lastRoll !== null && lastRoll !== displayValue) {
      if (animate) {
        setIsRolling(true);
        setSpinCount((prev) => prev + 1);

        // Set the final value after animation completes
        const timer = setTimeout(() => {
          setDisplayValue(lastRoll);
          setIsRolling(false);
        }, 800);

        return () => clearTimeout(timer);
      } else {
        // Immediately show result without animation
        setDisplayValue(lastRoll);
      }
    }
  }, [lastRoll, displayValue, animate]);

  const handleClick = useCallback(() => {
    if (!disabled && !isRolling) {
      onRoll();
    }
  }, [disabled, isRolling, onRoll]);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      handleClick();
    },
    [handleClick]
  );

  // Calculate rotation with extra spins for animation effect
  const getTransform = () => {
    if (isRolling) {
      const extraSpins = 2 + spinCount;
      return `rotateX(${360 * extraSpins}deg) rotateY(${360 * extraSpins}deg)`;
    }
    return faceRotations[displayValue];
  };

  const faceClass =
    'absolute flex h-full w-full items-center justify-center rounded-lg bg-white shadow-inner border border-slate-200';

  return (
    <button
      onClick={handleClick}
      onTouchEnd={handleTouchEnd}
      disabled={disabled}
      className={`
        relative ${container}
        touch-manipulation select-none
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
      `}
      style={{ perspective }}
      aria-label="Roll dice"
    >
      <div
        className={`
          relative h-full w-full
          transition-transform duration-[800ms] ease-out
          ${isRolling ? '' : 'hover:scale-105'}
        `}
        style={{
          transformStyle: 'preserve-3d',
          transform: getTransform(),
        }}
      >
        {/* Face 1 - Front */}
        <div className={faceClass} style={{ transform: 'translateZ(calc(var(--dice-size) / 2))' }}>
          <div className="h-full w-full" style={{ '--dice-size': '100%' } as React.CSSProperties}>
            <DiceDots value={1} dotSize={dot} />
          </div>
        </div>

        {/* Face 6 - Back */}
        <div
          className={faceClass}
          style={{ transform: 'rotateY(180deg) translateZ(calc(var(--dice-size) / 2))' }}
        >
          <div className="h-full w-full" style={{ '--dice-size': '100%' } as React.CSSProperties}>
            <DiceDots value={6} dotSize={dot} />
          </div>
        </div>

        {/* Face 3 - Right */}
        <div
          className={faceClass}
          style={{ transform: 'rotateY(90deg) translateZ(calc(var(--dice-size) / 2))' }}
        >
          <div className="h-full w-full" style={{ '--dice-size': '100%' } as React.CSSProperties}>
            <DiceDots value={3} dotSize={dot} />
          </div>
        </div>

        {/* Face 4 - Left */}
        <div
          className={faceClass}
          style={{ transform: 'rotateY(-90deg) translateZ(calc(var(--dice-size) / 2))' }}
        >
          <div className="h-full w-full" style={{ '--dice-size': '100%' } as React.CSSProperties}>
            <DiceDots value={4} dotSize={dot} />
          </div>
        </div>

        {/* Face 2 - Top */}
        <div
          className={faceClass}
          style={{ transform: 'rotateX(90deg) translateZ(calc(var(--dice-size) / 2))' }}
        >
          <div className="h-full w-full" style={{ '--dice-size': '100%' } as React.CSSProperties}>
            <DiceDots value={2} dotSize={dot} />
          </div>
        </div>

        {/* Face 5 - Bottom */}
        <div
          className={faceClass}
          style={{ transform: 'rotateX(-90deg) translateZ(calc(var(--dice-size) / 2))' }}
        >
          <div className="h-full w-full" style={{ '--dice-size': '100%' } as React.CSSProperties}>
            <DiceDots value={5} dotSize={dot} />
          </div>
        </div>
      </div>
    </button>
  );
}
