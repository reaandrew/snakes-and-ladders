import type { Player } from '@snakes-and-ladders/shared';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { PlayerList } from './PlayerList';

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

describe('PlayerList', () => {
  it('renders empty player list', () => {
    render(<PlayerList players={[]} currentPlayerId={null} />);
    expect(screen.getByText('Players (0)')).toBeInTheDocument();
  });

  it('renders player count correctly', () => {
    const players = [
      createPlayer({ id: 'p1', name: 'Player 1' }),
      createPlayer({ id: 'p2', name: 'Player 2' }),
      createPlayer({ id: 'p3', name: 'Player 3' }),
    ];
    render(<PlayerList players={players} currentPlayerId={null} />);
    expect(screen.getByText('Players (3)')).toBeInTheDocument();
  });

  it('renders player names', () => {
    const players = [
      createPlayer({ id: 'p1', name: 'Alice' }),
      createPlayer({ id: 'p2', name: 'Bob' }),
    ];
    render(<PlayerList players={players} currentPlayerId={null} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows "(you)" indicator for current player', () => {
    const players = [
      createPlayer({ id: 'p1', name: 'Alice' }),
      createPlayer({ id: 'p2', name: 'Bob' }),
    ];
    render(<PlayerList players={players} currentPlayerId="p1" />);
    expect(screen.getByText('(you)')).toBeInTheDocument();
  });

  it('does not show "(you)" when no current player', () => {
    const players = [createPlayer({ id: 'p1', name: 'Alice' })];
    render(<PlayerList players={players} currentPlayerId={null} />);
    expect(screen.queryByText('(you)')).not.toBeInTheDocument();
  });

  it('does not show "(you)" for other players', () => {
    const players = [
      createPlayer({ id: 'p1', name: 'Alice' }),
      createPlayer({ id: 'p2', name: 'Bob' }),
    ];
    render(<PlayerList players={players} currentPlayerId="p1" />);
    // Only one "(you)" should be present
    expect(screen.getAllByText('(you)')).toHaveLength(1);
  });

  it('renders player color indicator', () => {
    const players = [createPlayer({ id: 'p1', name: 'Alice', color: '#3B82F6' })];
    const { container } = render(<PlayerList players={players} currentPlayerId={null} />);
    const colorDiv = container.querySelector('[style*="background-color: rgb(59, 130, 246)"]');
    expect(colorDiv).toBeInTheDocument();
  });

  it('shows connected status indicator for connected players', () => {
    const players = [createPlayer({ id: 'p1', name: 'Alice', isConnected: true })];
    render(<PlayerList players={players} currentPlayerId={null} />);
    expect(screen.getByTitle('Connected')).toBeInTheDocument();
  });

  it('shows disconnected status indicator for disconnected players', () => {
    const players = [createPlayer({ id: 'p1', name: 'Alice', isConnected: false })];
    render(<PlayerList players={players} currentPlayerId={null} />);
    expect(screen.getByTitle('Disconnected')).toBeInTheDocument();
  });

  it('applies highlight styling to current player row', () => {
    const players = [
      createPlayer({ id: 'p1', name: 'Alice' }),
      createPlayer({ id: 'p2', name: 'Bob' }),
    ];
    const { container } = render(<PlayerList players={players} currentPlayerId="p1" />);
    const listItems = container.querySelectorAll('li');

    // First player (current) should have highlight class
    expect(listItems[0].className).toContain('bg-slate-600/50');
    // Second player should not have highlight class
    expect(listItems[1].className).not.toContain('bg-slate-600/50');
  });

  it('renders multiple players with different colors', () => {
    const players = [
      createPlayer({ id: 'p1', name: 'Alice', color: '#EF4444' }),
      createPlayer({ id: 'p2', name: 'Bob', color: '#3B82F6' }),
      createPlayer({ id: 'p3', name: 'Charlie', color: '#22C55E' }),
    ];
    const { container } = render(<PlayerList players={players} currentPlayerId={null} />);

    // Check that all color indicators are rendered
    expect(
      container.querySelector('[style*="background-color: rgb(239, 68, 68)"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[style*="background-color: rgb(59, 130, 246)"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[style*="background-color: rgb(34, 197, 94)"]')
    ).toBeInTheDocument();
  });

  it('renders mixed connected and disconnected players', () => {
    const players = [
      createPlayer({ id: 'p1', name: 'Alice', isConnected: true }),
      createPlayer({ id: 'p2', name: 'Bob', isConnected: false }),
      createPlayer({ id: 'p3', name: 'Charlie', isConnected: true }),
    ];
    render(<PlayerList players={players} currentPlayerId={null} />);

    expect(screen.getAllByTitle('Connected')).toHaveLength(2);
    expect(screen.getAllByTitle('Disconnected')).toHaveLength(1);
  });
});
