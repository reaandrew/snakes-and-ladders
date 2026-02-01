interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export function Logo({ size = 'lg', showSubtitle = true }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        {/* Snake and Ladder SVG Icon */}
        <div className={`${sizeClasses[size]} animate-snake-wiggle`}>
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Ladder */}
            <rect x="40" y="8" width="4" height="48" rx="2" fill="#22C55E" />
            <rect x="52" y="8" width="4" height="48" rx="2" fill="#22C55E" />
            <rect x="40" y="14" width="16" height="3" rx="1" fill="#22C55E" />
            <rect x="40" y="24" width="16" height="3" rx="1" fill="#22C55E" />
            <rect x="40" y="34" width="16" height="3" rx="1" fill="#22C55E" />
            <rect x="40" y="44" width="16" height="3" rx="1" fill="#22C55E" />

            {/* Snake body - wavy path */}
            <path
              d="M8 12 C16 8, 20 20, 28 16 C36 12, 24 32, 32 28 C40 24, 28 44, 36 40 C44 36, 32 56, 28 52"
              stroke="#EF4444"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />

            {/* Snake head */}
            <circle cx="8" cy="12" r="5" fill="#EF4444" />
            <circle cx="6" cy="10" r="1.5" fill="white" />
            <circle cx="10" cy="10" r="1.5" fill="white" />
            <circle cx="6" cy="10" r="0.5" fill="black" />
            <circle cx="10" cy="10" r="0.5" fill="black" />

            {/* Snake tongue */}
            <path
              d="M8 17 L6 21 M8 17 L10 21"
              stroke="#EF4444"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Title with gradient */}
        <h1
          className={`${textSizes[size]} font-bold bg-gradient-to-r from-game-primary via-game-secondary to-game-accent bg-clip-text text-transparent`}
        >
          Snakes & Ladders
        </h1>
      </div>

      {showSubtitle && (
        <p className="text-slate-400 text-sm tracking-wide">Real-time multiplayer</p>
      )}
    </div>
  );
}
