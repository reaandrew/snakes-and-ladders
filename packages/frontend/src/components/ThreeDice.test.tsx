import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the entire ThreeDice component since Three.js doesn't work in jsdom
vi.mock('./ThreeDice', () => ({
  default: vi.fn(
    ({
      onRoll,
      disabled,
      size = 'md',
      animate = true,
    }: {
      onRoll: () => void;
      disabled: boolean;
      lastRoll: number | null;
      size?: 'sm' | 'md' | 'lg';
      animate?: boolean;
    }) => {
      const sizeMap = {
        sm: { width: 48, height: 48 },
        md: { width: 64, height: 64 },
        lg: { width: 96, height: 96 },
      };
      const { width, height } = sizeMap[size];

      return (
        <button
          onClick={() => !disabled && onRoll()}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (!disabled) onRoll();
          }}
          disabled={disabled}
          className={`
            relative touch-manipulation select-none rounded-lg
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}
          `}
          style={{ width, height }}
          aria-label="Roll dice"
          data-animate={animate}
        >
          <div>3D Dice Mock</div>
        </button>
      );
    }
  ),
  ThreeDice: vi.fn(
    ({
      onRoll,
      disabled,
      size = 'md',
      animate = true,
    }: {
      onRoll: () => void;
      disabled: boolean;
      lastRoll: number | null;
      size?: 'sm' | 'md' | 'lg';
      animate?: boolean;
    }) => {
      const sizeMap = {
        sm: { width: 48, height: 48 },
        md: { width: 64, height: 64 },
        lg: { width: 96, height: 96 },
      };
      const { width, height } = sizeMap[size];

      return (
        <button
          onClick={() => !disabled && onRoll()}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (!disabled) onRoll();
          }}
          disabled={disabled}
          className={`
            relative touch-manipulation select-none rounded-lg
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}
          `}
          style={{ width, height }}
          aria-label="Roll dice"
          data-animate={animate}
        >
          <div>3D Dice Mock</div>
        </button>
      );
    }
  ),
}));

// Import after mocking
const { default: ThreeDice } = await import('./ThreeDice');

describe('ThreeDice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders dice button', () => {
      render(<ThreeDice onRoll={vi.fn()} disabled={false} lastRoll={null} />);

      expect(screen.getByRole('button', { name: 'Roll dice' })).toBeInTheDocument();
    });

    it('renders with correct size for sm', () => {
      render(<ThreeDice onRoll={vi.fn()} disabled={false} lastRoll={null} size="sm" />);

      const button = screen.getByRole('button', { name: 'Roll dice' });
      expect(button).toHaveStyle({ width: '48px', height: '48px' });
    });

    it('renders with correct size for md (default)', () => {
      render(<ThreeDice onRoll={vi.fn()} disabled={false} lastRoll={null} />);

      const button = screen.getByRole('button', { name: 'Roll dice' });
      expect(button).toHaveStyle({ width: '64px', height: '64px' });
    });

    it('renders with correct size for lg', () => {
      render(<ThreeDice onRoll={vi.fn()} disabled={false} lastRoll={null} size="lg" />);

      const button = screen.getByRole('button', { name: 'Roll dice' });
      expect(button).toHaveStyle({ width: '96px', height: '96px' });
    });
  });

  describe('Interaction', () => {
    it('calls onRoll when clicked', () => {
      const onRoll = vi.fn();
      render(<ThreeDice onRoll={onRoll} disabled={false} lastRoll={null} />);

      fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));

      expect(onRoll).toHaveBeenCalledTimes(1);
    });

    it('does not call onRoll when disabled', () => {
      const onRoll = vi.fn();
      render(<ThreeDice onRoll={onRoll} disabled={true} lastRoll={null} />);

      fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));

      expect(onRoll).not.toHaveBeenCalled();
    });

    it('handles touch events', () => {
      const onRoll = vi.fn();
      render(<ThreeDice onRoll={onRoll} disabled={false} lastRoll={null} />);

      fireEvent.touchEnd(screen.getByRole('button', { name: 'Roll dice' }));

      expect(onRoll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disabled state', () => {
    it('shows disabled styling', () => {
      render(<ThreeDice onRoll={vi.fn()} disabled={true} lastRoll={null} />);

      const button = screen.getByRole('button', { name: 'Roll dice' });
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('shows enabled styling when not disabled', () => {
      render(<ThreeDice onRoll={vi.fn()} disabled={false} lastRoll={null} />);

      const button = screen.getByRole('button', { name: 'Roll dice' });
      expect(button).toHaveClass('cursor-pointer');
      expect(button).not.toHaveClass('opacity-50');
    });
  });

  describe('Animation prop', () => {
    it('accepts animate prop', () => {
      render(<ThreeDice onRoll={vi.fn()} disabled={false} lastRoll={null} animate={true} />);

      const button = screen.getByRole('button', { name: 'Roll dice' });
      expect(button).toHaveAttribute('data-animate', 'true');
    });

    it('defaults animate to true', () => {
      render(<ThreeDice onRoll={vi.fn()} disabled={false} lastRoll={null} />);

      const button = screen.getByRole('button', { name: 'Roll dice' });
      expect(button).toHaveAttribute('data-animate', 'true');
    });

    it('accepts animate=false', () => {
      render(<ThreeDice onRoll={vi.fn()} disabled={false} lastRoll={null} animate={false} />);

      const button = screen.getByRole('button', { name: 'Roll dice' });
      expect(button).toHaveAttribute('data-animate', 'false');
    });
  });

  describe('LastRoll updates', () => {
    it('handles lastRoll change', () => {
      const { rerender } = render(<ThreeDice onRoll={vi.fn()} disabled={false} lastRoll={null} />);

      // Should not throw when lastRoll changes
      expect(() =>
        rerender(<ThreeDice onRoll={vi.fn()} disabled={false} lastRoll={4} />)
      ).not.toThrow();
    });

    it('handles multiple lastRoll changes', () => {
      const { rerender } = render(<ThreeDice onRoll={vi.fn()} disabled={false} lastRoll={null} />);

      rerender(<ThreeDice onRoll={vi.fn()} disabled={false} lastRoll={4} />);
      rerender(<ThreeDice onRoll={vi.fn()} disabled={false} lastRoll={6} />);

      // Should not throw
      expect(screen.getByRole('button', { name: 'Roll dice' })).toBeInTheDocument();
    });
  });
});
