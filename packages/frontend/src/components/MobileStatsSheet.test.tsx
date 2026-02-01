import type { Player } from '@snakes-and-ladders/shared';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { MobileStatsSheet, MobileStatsHeader } from './MobileStatsSheet';

const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'player-1',
  gameCode: 'ABC123',
  name: 'Test Player',
  color: '#EF4444',
  position: 10,
  isConnected: true,
  joinedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const mockMoves = [
  {
    id: 'move-1',
    playerColor: '#EF4444',
    playerName: 'Test Player',
    diceRoll: 4,
    previousPosition: 6,
    newPosition: 10,
  },
];

describe('MobileStatsSheet', () => {
  describe('Rendering', () => {
    it('renders when expanded', () => {
      render(
        <MobileStatsSheet
          isExpanded={true}
          onToggle={vi.fn()}
          players={[createMockPlayer()]}
          currentPlayerId="player-1"
          moves={mockMoves}
        />
      );

      expect(screen.getByRole('dialog', { name: 'Game statistics' })).toBeInTheDocument();
    });

    it('has translate-y-full class when collapsed', () => {
      const { container } = render(
        <MobileStatsSheet
          isExpanded={false}
          onToggle={vi.fn()}
          players={[createMockPlayer()]}
          currentPlayerId="player-1"
          moves={mockMoves}
        />
      );

      const sheet = container.querySelector('[role="dialog"]');
      expect(sheet).toHaveClass('translate-y-full');
    });

    it('has translate-y-0 class when expanded', () => {
      const { container } = render(
        <MobileStatsSheet
          isExpanded={true}
          onToggle={vi.fn()}
          players={[createMockPlayer()]}
          currentPlayerId="player-1"
          moves={mockMoves}
        />
      );

      const sheet = container.querySelector('[role="dialog"]');
      expect(sheet).toHaveClass('translate-y-0');
    });

    it('renders backdrop when expanded', () => {
      const { container } = render(
        <MobileStatsSheet
          isExpanded={true}
          onToggle={vi.fn()}
          players={[createMockPlayer()]}
          currentPlayerId="player-1"
          moves={mockMoves}
        />
      );

      const backdrop = container.querySelector('.bg-black\\/50');
      expect(backdrop).toBeInTheDocument();
    });

    it('does not render backdrop when collapsed', () => {
      const { container } = render(
        <MobileStatsSheet
          isExpanded={false}
          onToggle={vi.fn()}
          players={[createMockPlayer()]}
          currentPlayerId="player-1"
          moves={mockMoves}
        />
      );

      const backdrop = container.querySelector('.bg-black\\/50');
      expect(backdrop).not.toBeInTheDocument();
    });

    it('renders player list', () => {
      render(
        <MobileStatsSheet
          isExpanded={true}
          onToggle={vi.fn()}
          players={[createMockPlayer()]}
          currentPlayerId="player-1"
          moves={mockMoves}
        />
      );

      expect(screen.getAllByText('Players (1)').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Test Player').length).toBeGreaterThan(0);
    });

    it('renders position indicator', () => {
      render(
        <MobileStatsSheet
          isExpanded={true}
          onToggle={vi.fn()}
          players={[
            createMockPlayer({ id: 'player-1', position: 10 }),
            createMockPlayer({ id: 'player-2', name: 'Player 2', position: 5 }),
          ]}
          currentPlayerId="player-1"
          moves={mockMoves}
        />
      );

      expect(screen.getByText('1st')).toBeInTheDocument();
      expect(screen.getByText('place')).toBeInTheDocument();
    });

    it('renders move history', () => {
      render(
        <MobileStatsSheet
          isExpanded={true}
          onToggle={vi.fn()}
          players={[createMockPlayer()]}
          currentPlayerId="player-1"
          moves={mockMoves}
        />
      );

      expect(screen.getByText('Move History')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('calls onToggle when close button is clicked', () => {
      const onToggle = vi.fn();
      render(
        <MobileStatsSheet
          isExpanded={true}
          onToggle={onToggle}
          players={[createMockPlayer()]}
          currentPlayerId="player-1"
          moves={mockMoves}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Close stats panel' }));

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onToggle when backdrop is clicked', () => {
      const onToggle = vi.fn();
      const { container } = render(
        <MobileStatsSheet
          isExpanded={true}
          onToggle={onToggle}
          players={[createMockPlayer()]}
          currentPlayerId="player-1"
          moves={mockMoves}
        />
      );

      const backdrop = container.querySelector('.bg-black\\/50');
      fireEvent.click(backdrop!);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });
});

describe('MobileStatsHeader', () => {
  describe('Rendering', () => {
    it('renders rank and tap message', () => {
      render(
        <MobileStatsHeader
          players={[
            createMockPlayer({ id: 'player-1', position: 10 }),
            createMockPlayer({ id: 'player-2', name: 'Player 2', position: 5 }),
          ]}
          currentPlayerId="player-1"
          onTap={vi.fn()}
        />
      );

      expect(screen.getByText('1st')).toBeInTheDocument();
      expect(screen.getByText('Tap for details')).toBeInTheDocument();
    });

    it('renders correct ordinal for various ranks', () => {
      const { rerender } = render(
        <MobileStatsHeader
          players={[
            createMockPlayer({ id: 'player-1', position: 5 }),
            createMockPlayer({ id: 'player-2', name: 'Player 2', position: 10 }),
          ]}
          currentPlayerId="player-1"
          onTap={vi.fn()}
        />
      );

      expect(screen.getByText('2nd')).toBeInTheDocument();

      rerender(
        <MobileStatsHeader
          players={[
            createMockPlayer({ id: 'player-1', position: 3 }),
            createMockPlayer({ id: 'player-2', name: 'Player 2', position: 10 }),
            createMockPlayer({ id: 'player-3', name: 'Player 3', position: 7 }),
          ]}
          currentPlayerId="player-1"
          onTap={vi.fn()}
        />
      );

      expect(screen.getByText('3rd')).toBeInTheDocument();
    });

    it('returns null when player not found', () => {
      const { container } = render(
        <MobileStatsHeader
          players={[createMockPlayer({ id: 'player-2' })]}
          currentPlayerId="player-1"
          onTap={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Interaction', () => {
    it('calls onTap when clicked', () => {
      const onTap = vi.fn();
      render(
        <MobileStatsHeader
          players={[createMockPlayer()]}
          currentPlayerId="player-1"
          onTap={onTap}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Open game statistics' }));

      expect(onTap).toHaveBeenCalledTimes(1);
    });
  });
});
