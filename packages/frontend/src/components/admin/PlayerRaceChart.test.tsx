import type { AdminPlayerDetail } from '@snakes-and-ladders/shared';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { PlayerRaceChart } from './PlayerRaceChart';

const mockPlayers: AdminPlayerDetail[] = [
  {
    id: '1',
    gameCode: 'ABC123',
    name: 'Alice',
    color: '#EF4444',
    position: 78,
    isConnected: true,
    joinedAt: '2026-02-01T10:00:00Z',
    rank: 1,
    distanceToWin: 22,
  },
  {
    id: '2',
    gameCode: 'ABC123',
    name: 'Bob',
    color: '#3B82F6',
    position: 58,
    isConnected: true,
    joinedAt: '2026-02-01T10:01:00Z',
    rank: 2,
    distanceToWin: 42,
  },
  {
    id: '3',
    gameCode: 'ABC123',
    name: 'Carol',
    color: '#22C55E',
    position: 45,
    isConnected: false,
    joinedAt: '2026-02-01T10:02:00Z',
    rank: 3,
    distanceToWin: 55,
  },
];

describe('PlayerRaceChart', () => {
  it('renders empty state when no players', () => {
    render(<PlayerRaceChart players={[]} boardSize={100} />);

    expect(screen.getByText('No players in this game')).toBeInTheDocument();
  });

  it('displays leader label', () => {
    render(<PlayerRaceChart players={mockPlayers} boardSize={100} />);

    expect(screen.getByText('LEADER:')).toBeInTheDocument();
  });

  it('displays player names', () => {
    render(<PlayerRaceChart players={mockPlayers} boardSize={100} />);

    // Each player name appears at least once
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Carol').length).toBeGreaterThanOrEqual(1);
  });

  it('displays player ranks', () => {
    render(<PlayerRaceChart players={mockPlayers} boardSize={100} />);

    // Ranks appear in the chart
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
  });

  it('displays start and finish labels', () => {
    render(<PlayerRaceChart players={mockPlayers} boardSize={100} />);

    expect(screen.getByText('Start (0)')).toBeInTheDocument();
    expect(screen.getByText('Finish (100)')).toBeInTheDocument();
  });

  it('renders progress bars with player colors', () => {
    const { container } = render(<PlayerRaceChart players={mockPlayers} boardSize={100} />);

    const progressBars = container.querySelectorAll('[style*="background-color"]');
    const colors = Array.from(progressBars).map((el) => (el as HTMLElement).style.backgroundColor);

    expect(colors).toContain('rgb(239, 68, 68)'); // Alice's red
    expect(colors).toContain('rgb(59, 130, 246)'); // Bob's blue
    expect(colors).toContain('rgb(34, 197, 94)'); // Carol's green
  });

  it('handles single player', () => {
    render(<PlayerRaceChart players={[mockPlayers[0]]} boardSize={100} />);

    // Should not crash and should show player name
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
  });

  it('handles different board sizes', () => {
    render(<PlayerRaceChart players={mockPlayers} boardSize={50} />);

    expect(screen.getByText('Finish (50)')).toBeInTheDocument();
  });
});
