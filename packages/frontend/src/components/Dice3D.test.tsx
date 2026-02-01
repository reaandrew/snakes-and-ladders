import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Dice3D } from './Dice3D';

describe('Dice3D', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders dice button', () => {
      render(<Dice3D onRoll={vi.fn()} disabled={false} lastRoll={null} />);

      expect(screen.getByRole('button', { name: 'Roll dice' })).toBeInTheDocument();
    });

    it('renders all six faces', () => {
      const { container } = render(<Dice3D onRoll={vi.fn()} disabled={false} lastRoll={null} />);

      // Each face has dots rendered as divs with rounded-full class
      const faces = container.querySelectorAll('.bg-white');
      expect(faces.length).toBe(6);
    });
  });

  describe('Interaction', () => {
    it('calls onRoll when clicked', () => {
      const onRoll = vi.fn();
      render(<Dice3D onRoll={onRoll} disabled={false} lastRoll={null} />);

      fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));

      expect(onRoll).toHaveBeenCalledTimes(1);
    });

    it('does not call onRoll when disabled', () => {
      const onRoll = vi.fn();
      render(<Dice3D onRoll={onRoll} disabled={true} lastRoll={null} />);

      fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));

      expect(onRoll).not.toHaveBeenCalled();
    });

    it('does not call onRoll while rolling', () => {
      const onRoll = vi.fn();
      const { rerender } = render(<Dice3D onRoll={onRoll} disabled={false} lastRoll={null} />);

      // Start a roll
      rerender(<Dice3D onRoll={onRoll} disabled={false} lastRoll={3} />);

      // Try to click during animation
      fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));

      // Should not call onRoll during animation
      expect(onRoll).not.toHaveBeenCalled();
    });

    it('handles touch events', () => {
      const onRoll = vi.fn();
      render(<Dice3D onRoll={onRoll} disabled={false} lastRoll={null} />);

      fireEvent.touchEnd(screen.getByRole('button', { name: 'Roll dice' }));

      expect(onRoll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Animation', () => {
    it('animates when lastRoll changes and animate is true', () => {
      const { rerender } = render(
        <Dice3D onRoll={vi.fn()} disabled={false} lastRoll={null} animate={true} />
      );

      rerender(<Dice3D onRoll={vi.fn()} disabled={false} lastRoll={4} animate={true} />);

      // During animation, should not be able to click
      const onRoll = vi.fn();
      rerender(<Dice3D onRoll={onRoll} disabled={false} lastRoll={4} animate={true} />);
      fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));
      expect(onRoll).not.toHaveBeenCalled();

      // After animation completes
      act(() => {
        vi.advanceTimersByTime(800);
      });

      fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));
      expect(onRoll).toHaveBeenCalled();
    });

    it('skips animation when animate is false', () => {
      const onRoll = vi.fn();
      const { rerender } = render(
        <Dice3D onRoll={onRoll} disabled={false} lastRoll={null} animate={false} />
      );

      rerender(<Dice3D onRoll={onRoll} disabled={false} lastRoll={4} animate={false} />);

      // Should be immediately clickable without waiting for animation
      fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));
      expect(onRoll).toHaveBeenCalledTimes(1);
    });

    it('defaults animate to true', () => {
      const { rerender } = render(<Dice3D onRoll={vi.fn()} disabled={false} lastRoll={null} />);

      rerender(<Dice3D onRoll={vi.fn()} disabled={false} lastRoll={5} />);

      // During animation (defaults to animate=true)
      const onRoll = vi.fn();
      rerender(<Dice3D onRoll={onRoll} disabled={false} lastRoll={5} />);
      fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));
      expect(onRoll).not.toHaveBeenCalled();
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      const { container } = render(
        <Dice3D onRoll={vi.fn()} disabled={false} lastRoll={null} size="sm" />
      );

      const button = container.querySelector('button');
      expect(button).toHaveClass('h-12', 'w-12');
    });

    it('renders medium size (default)', () => {
      const { container } = render(
        <Dice3D onRoll={vi.fn()} disabled={false} lastRoll={null} size="md" />
      );

      const button = container.querySelector('button');
      expect(button).toHaveClass('h-16', 'w-16');
    });

    it('renders large size', () => {
      const { container } = render(
        <Dice3D onRoll={vi.fn()} disabled={false} lastRoll={null} size="lg" />
      );

      const button = container.querySelector('button');
      expect(button).toHaveClass('h-24', 'w-24');
    });
  });

  describe('Disabled state', () => {
    it('shows disabled styling', () => {
      const { container } = render(<Dice3D onRoll={vi.fn()} disabled={true} lastRoll={null} />);

      const button = container.querySelector('button');
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });
});
