import type { Player } from '@snakes-and-ladders/shared';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PlayerGrid } from './PlayerGrid';

const createPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'player-1',
  gameCode: 'ABC123',
  name: 'Test Player',
  color: '#EF4444',
  position: 1,
  isConnected: true,
  joinedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const scrollIntoViewMock = vi.fn();

describe('PlayerGrid', () => {
  beforeEach(() => {
    scrollIntoViewMock.mockClear();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
  });

  it('renders player count header', () => {
    const players = [
      createPlayer({ id: 'p1', name: 'Alice' }),
      createPlayer({ id: 'p2', name: 'Bob' }),
    ];
    render(<PlayerGrid players={players} currentPlayerId={null} />);
    expect(screen.getByText('Players (2)')).toBeInTheDocument();
  });

  it('shows hero section when currentPlayerId matches a player', () => {
    const players = [
      createPlayer({ id: 'p1', name: 'Alice' }),
      createPlayer({ id: 'p2', name: 'Bob' }),
    ];
    render(<PlayerGrid players={players} currentPlayerId="p1" />);
    expect(screen.getByText('Player #1')).toBeInTheDocument();
    expect(screen.getByText('You are')).toBeInTheDocument();
  });

  it('hides hero section when currentPlayerId does not match', () => {
    const players = [createPlayer({ id: 'p1', name: 'Alice' })];
    render(<PlayerGrid players={players} currentPlayerId="unknown" />);
    expect(screen.queryByText('You are')).not.toBeInTheDocument();
  });

  it('hides hero section when currentPlayerId is null', () => {
    const players = [createPlayer({ id: 'p1', name: 'Alice' })];
    render(<PlayerGrid players={players} currentPlayerId={null} />);
    expect(screen.queryByText('You are')).not.toBeInTheDocument();
  });

  it('shows "Find Me" button when currentPlayer exists', () => {
    const players = [createPlayer({ id: 'p1', name: 'Alice' })];
    render(<PlayerGrid players={players} currentPlayerId="p1" />);
    expect(screen.getByText('Find Me')).toBeInTheDocument();
  });

  it('does not show "Find Me" button when no currentPlayer', () => {
    const players = [createPlayer({ id: 'p1', name: 'Alice' })];
    render(<PlayerGrid players={players} currentPlayerId={null} />);
    expect(screen.queryByText('Find Me')).not.toBeInTheDocument();
  });

  it('calls scrollIntoView when "Find Me" is clicked', () => {
    const players = [
      createPlayer({ id: 'p1', name: 'Alice' }),
      createPlayer({ id: 'p2', name: 'Bob' }),
    ];
    render(<PlayerGrid players={players} currentPlayerId="p1" />);
    fireEvent.click(screen.getByText('Find Me'));
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });
  });

  it('renders correct number of player cells', () => {
    const players = [
      createPlayer({ id: 'p1', name: 'Alice' }),
      createPlayer({ id: 'p2', name: 'Bob' }),
      createPlayer({ id: 'p3', name: 'Charlie' }),
    ];
    render(<PlayerGrid players={players} currentPlayerId={null} />);
    // Each player has a 1-indexed number inside a span
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    // 3 player cells in the grid via title attributes
    expect(screen.getAllByTitle(/./)).toHaveLength(3);
  });

  it('sets correct title attributes on player cells', () => {
    const players = [
      createPlayer({ id: 'p1', name: 'Alice', isConnected: true }),
      createPlayer({ id: 'p2', name: 'Bob', isConnected: false }),
    ];
    render(<PlayerGrid players={players} currentPlayerId="p1" />);
    expect(screen.getByTitle('Alice (you)')).toBeInTheDocument();
    expect(screen.getByTitle('Bob - disconnected')).toBeInTheDocument();
  });

  it('applies highlight styling to current player cell', () => {
    const players = [
      createPlayer({ id: 'p1', name: 'Alice' }),
      createPlayer({ id: 'p2', name: 'Bob' }),
    ];
    render(<PlayerGrid players={players} currentPlayerId="p1" />);

    const currentCell = screen.getByTitle('Alice (you)');
    expect(currentCell.className).toContain('scale-110');
    expect(currentCell.className).toContain('ring-2');

    // Check animate-ping span for current player
    const pingSpan = currentCell.querySelector('.animate-ping');
    expect(pingSpan).toBeInTheDocument();

    // Non-current player should not have those classes
    const otherCell = screen.getByTitle('Bob');
    expect(otherCell.className).not.toContain('scale-110');
    expect(otherCell.querySelector('.animate-ping')).not.toBeInTheDocument();
  });

  it('applies opacity-50 class to disconnected player', () => {
    const players = [
      createPlayer({ id: 'p1', name: 'Alice', isConnected: true }),
      createPlayer({ id: 'p2', name: 'Bob', isConnected: false }),
    ];
    render(<PlayerGrid players={players} currentPlayerId={null} />);

    const disconnectedCell = screen.getByTitle('Bob - disconnected');
    expect(disconnectedCell.className).toContain('opacity-50');

    const connectedCell = screen.getByTitle('Alice');
    expect(connectedCell.className).not.toContain('opacity-50');
  });

  it('renders white text on dark background (getContrastColor)', () => {
    const players = [createPlayer({ id: 'p1', name: 'Alice', color: '#000000' })];
    const { container } = render(<PlayerGrid players={players} currentPlayerId={null} />);
    const numberSpan = container.querySelector('span[style*="color"]');
    expect(numberSpan).toHaveStyle({ color: '#FFFFFF' });
  });

  it('renders black text on light background (getContrastColor)', () => {
    const players = [createPlayer({ id: 'p1', name: 'Alice', color: '#FFFFFF' })];
    const { container } = render(<PlayerGrid players={players} currentPlayerId={null} />);
    const numberSpan = container.querySelector('span[style*="color"]');
    expect(numberSpan).toHaveStyle({ color: '#000000' });
  });

  it('shows player count with maxPlayers', () => {
    const players = [createPlayer({ id: 'p1', name: 'Alice' })];
    render(<PlayerGrid players={players} currentPlayerId="p1" maxPlayers={100} />);
    expect(screen.getByText('1 of 100')).toBeInTheDocument();
  });
});
