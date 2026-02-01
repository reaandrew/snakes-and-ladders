import { render, screen, act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { WebSocketProvider, useWebSocket } from './WebSocketContext';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: Event) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }

  // Helper methods for testing
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) this.onopen();
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }

  simulateError(error: Event) {
    if (this.onerror) this.onerror(error);
  }

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
}

// Set up global WebSocket mock
const originalWebSocket = global.WebSocket;

describe('WebSocketContext', () => {
  let timeoutCallbacks: Array<{ callback: () => void; delay: number; id: number }>;
  let intervalCallbacks: Array<{ callback: () => void; delay: number; id: number }>;
  let nextId: number;

  beforeEach(() => {
    MockWebSocket.instances = [];
    timeoutCallbacks = [];
    intervalCallbacks = [];
    nextId = 1;

    // Mock window timers
    vi.spyOn(window, 'setTimeout').mockImplementation(((
      callback: () => void,
      delay: number
    ): number => {
      const id = nextId++;
      timeoutCallbacks.push({ callback, delay, id });
      return id;
    }) as typeof window.setTimeout);

    vi.spyOn(window, 'setInterval').mockImplementation(((
      callback: () => void,
      delay: number
    ): number => {
      const id = nextId++;
      intervalCallbacks.push({ callback, delay, id });
      return id;
    }) as typeof window.setInterval);

    vi.spyOn(window, 'clearTimeout').mockImplementation(((id?: number) => {
      timeoutCallbacks = timeoutCallbacks.filter((t) => t.id !== id);
    }) as typeof window.clearTimeout);

    vi.spyOn(window, 'clearInterval').mockImplementation(((id?: number) => {
      intervalCallbacks = intervalCallbacks.filter((i) => i.id !== id);
    }) as typeof window.clearInterval);

    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    vi.restoreAllMocks();
  });

  describe('useWebSocket hook', () => {
    it('throws error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useWebSocket());
      }).toThrow('useWebSocket must be used within a WebSocketProvider');

      consoleError.mockRestore();
    });
  });

  describe('WebSocketProvider', () => {
    it('provides initial disconnected state', () => {
      const TestComponent = () => {
        const { isConnected, lastMessage } = useWebSocket();
        return (
          <div>
            <span data-testid="connected">{isConnected ? 'true' : 'false'}</span>
            <span data-testid="lastMessage">{lastMessage ? 'has-message' : 'no-message'}</span>
          </div>
        );
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      expect(screen.getByTestId('connected')).toHaveTextContent('false');
      expect(screen.getByTestId('lastMessage')).toHaveTextContent('no-message');
    });

    it('connects to WebSocket server', () => {
      const TestComponent = () => {
        const { connect, isConnected } = useWebSocket();
        return (
          <div>
            <button onClick={() => connect('ws://localhost:3001')}>Connect</button>
            <span data-testid="connected">{isConnected ? 'true' : 'false'}</span>
          </div>
        );
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      act(() => {
        screen.getByText('Connect').click();
      });

      expect(MockWebSocket.instances).toHaveLength(1);
      expect(MockWebSocket.instances[0].url).toBe('ws://localhost:3001');

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      expect(screen.getByTestId('connected')).toHaveTextContent('true');
    });

    it('does not create new connection if already connected', () => {
      const TestComponent = () => {
        const { connect } = useWebSocket();
        return <button onClick={() => connect('ws://localhost:3001')}>Connect</button>;
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      act(() => {
        screen.getByText('Connect').click();
      });

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      act(() => {
        screen.getByText('Connect').click();
      });

      expect(MockWebSocket.instances).toHaveLength(1);
    });

    it('handles disconnect', () => {
      const TestComponent = () => {
        const { connect, disconnect, isConnected } = useWebSocket();
        return (
          <div>
            <button onClick={() => connect('ws://localhost:3001')}>Connect</button>
            <button onClick={disconnect}>Disconnect</button>
            <span data-testid="connected">{isConnected ? 'true' : 'false'}</span>
          </div>
        );
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      act(() => {
        screen.getByText('Connect').click();
      });

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      expect(screen.getByTestId('connected')).toHaveTextContent('true');

      act(() => {
        screen.getByText('Disconnect').click();
      });

      expect(screen.getByTestId('connected')).toHaveTextContent('false');
    });

    it('sends messages when connected', () => {
      const TestComponent = () => {
        const { connect, sendMessage } = useWebSocket();
        return (
          <div>
            <button onClick={() => connect('ws://localhost:3001')}>Connect</button>
            <button
              onClick={() =>
                sendMessage({ action: 'joinGame', gameCode: 'ABC123', playerName: 'Test' })
              }
            >
              Send
            </button>
          </div>
        );
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      act(() => {
        screen.getByText('Connect').click();
      });

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      act(() => {
        screen.getByText('Send').click();
      });

      expect(MockWebSocket.instances[0].sentMessages).toHaveLength(1);
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[0])).toEqual({
        action: 'joinGame',
        gameCode: 'ABC123',
        playerName: 'Test',
      });
    });

    it('warns when sending message while not connected', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const TestComponent = () => {
        const { sendMessage } = useWebSocket();
        return (
          <button
            onClick={() =>
              sendMessage({ action: 'joinGame', gameCode: 'ABC123', playerName: 'Test' })
            }
          >
            Send
          </button>
        );
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      act(() => {
        screen.getByText('Send').click();
      });

      expect(consoleWarn).toHaveBeenCalledWith('Transport not connected');
      consoleWarn.mockRestore();
    });

    it('receives and parses messages', () => {
      const TestComponent = () => {
        const { connect, lastMessage } = useWebSocket();
        return (
          <div>
            <button onClick={() => connect('ws://localhost:3001')}>Connect</button>
            <span data-testid="lastMessage">
              {lastMessage ? JSON.stringify(lastMessage) : 'no-message'}
            </span>
          </div>
        );
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      act(() => {
        screen.getByText('Connect').click();
      });

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      act(() => {
        MockWebSocket.instances[0].simulateMessage({ type: 'playerJoined', player: { id: 'p1' } });
      });

      expect(screen.getByTestId('lastMessage')).toHaveTextContent(
        '{"type":"playerJoined","player":{"id":"p1"}}'
      );
    });

    it('handles malformed messages gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const TestComponent = () => {
        const { connect, lastMessage } = useWebSocket();
        return (
          <div>
            <button onClick={() => connect('ws://localhost:3001')}>Connect</button>
            <span data-testid="lastMessage">{lastMessage ? 'has-message' : 'no-message'}</span>
          </div>
        );
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      act(() => {
        screen.getByText('Connect').click();
      });

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      // Simulate receiving invalid JSON
      act(() => {
        if (MockWebSocket.instances[0].onmessage) {
          MockWebSocket.instances[0].onmessage({ data: 'invalid json{' });
        }
      });

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to parse WebSocket message:',
        expect.any(Error)
      );
      expect(screen.getByTestId('lastMessage')).toHaveTextContent('no-message');
      consoleError.mockRestore();
    });

    it('handles WebSocket errors', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const TestComponent = () => {
        const { connect } = useWebSocket();
        return <button onClick={() => connect('ws://localhost:3001')}>Connect</button>;
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      act(() => {
        screen.getByText('Connect').click();
      });

      act(() => {
        MockWebSocket.instances[0].simulateError(new Event('error'));
      });

      expect(consoleError).toHaveBeenCalledWith('WebSocket error:', expect.any(Event));
      consoleError.mockRestore();
    });

    it('starts ping interval on connection', () => {
      const TestComponent = () => {
        const { connect } = useWebSocket();
        return <button onClick={() => connect('ws://localhost:3001')}>Connect</button>;
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      act(() => {
        screen.getByText('Connect').click();
      });

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      // Check that ping interval was set (30 seconds)
      const pingInterval = intervalCallbacks.find((i) => i.delay === 30000);
      expect(pingInterval).toBeDefined();
    });

    it('sets up auto-reconnect on disconnect', () => {
      const TestComponent = () => {
        const { connect, isConnected } = useWebSocket();
        return (
          <div>
            <button onClick={() => connect('ws://localhost:3001')}>Connect</button>
            <span data-testid="connected">{isConnected ? 'true' : 'false'}</span>
          </div>
        );
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      act(() => {
        screen.getByText('Connect').click();
      });

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      act(() => {
        MockWebSocket.instances[0].simulateClose();
      });

      // Check that reconnect timeout was set (exponential backoff starting at 1 second)
      // With jitter, delay will be between 800-1200ms
      const reconnectTimeout = timeoutCallbacks.find((t) => t.delay >= 800 && t.delay <= 1200);
      expect(reconnectTimeout).toBeDefined();
    });

    it('cleans up on unmount', () => {
      const TestComponent = () => {
        const { connect } = useWebSocket();
        return <button onClick={() => connect('ws://localhost:3001')}>Connect</button>;
      };

      const { unmount } = render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      act(() => {
        screen.getByText('Connect').click();
      });

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      unmount();

      expect(MockWebSocket.instances[0].readyState).toBe(MockWebSocket.CLOSED);
    });
  });
});
