import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import App from './App';

// Mock the child components and providers
vi.mock('./components/GameScreen', () => ({
  GameScreen: () => <div data-testid="game-screen">GameScreen</div>,
}));

vi.mock('./contexts/GameContext', () => ({
  GameProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="game-provider">{children}</div>
  ),
}));

vi.mock('./contexts/WebSocketContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="websocket-provider">{children}</div>
  ),
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);

    expect(screen.getByTestId('game-screen')).toBeInTheDocument();
  });

  it('wraps content in WebSocketProvider', () => {
    render(<App />);

    expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
  });

  it('wraps content in GameProvider', () => {
    render(<App />);

    expect(screen.getByTestId('game-provider')).toBeInTheDocument();
  });

  it('nests providers correctly (WebSocket > Game > Screen)', () => {
    render(<App />);

    // WebSocketProvider should contain GameProvider
    const wsProvider = screen.getByTestId('websocket-provider');
    expect(wsProvider).toContainElement(screen.getByTestId('game-provider'));

    // GameProvider should contain GameScreen
    const gameProvider = screen.getByTestId('game-provider');
    expect(gameProvider).toContainElement(screen.getByTestId('game-screen'));
  });

  it('applies background gradient styling', () => {
    const { container } = render(<App />);

    const mainDiv = container.querySelector('.min-h-screen');
    expect(mainDiv).toBeInTheDocument();
    expect(mainDiv?.className).toContain('bg-gradient-to-br');
    expect(mainDiv?.className).toContain('from-slate-900');
    expect(mainDiv?.className).toContain('via-indigo-950');
    expect(mainDiv?.className).toContain('to-slate-900');
    expect(mainDiv?.className).toContain('animate-gradient-shift');
  });
});
