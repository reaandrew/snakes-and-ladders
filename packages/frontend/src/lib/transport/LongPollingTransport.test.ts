import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { LongPollingTransport } from './LongPollingTransport';

describe('LongPollingTransport', () => {
  let transport: LongPollingTransport;
  let onMessage: ReturnType<typeof vi.fn>;
  let onStateChange: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;

  // URL-routed fetch mock: different responses per endpoint
  let sendResponse: unknown;
  let sendStatus: number;

  beforeEach(() => {
    onMessage = vi.fn();
    onStateChange = vi.fn();
    onError = vi.fn();

    sendResponse = { type: 'pong' };
    sendStatus = 200;

    const fetchImpl = (url: string) => {
      if (url.includes('/poll/connect')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ connectionId: 'conn-123' }),
        });
      }
      if (url.includes('/poll/messages')) {
        // Slow down polling to avoid test races
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ messages: [] }),
              }),
            500
          )
        );
      }
      if (url.includes('/poll/send')) {
        return Promise.resolve({
          ok: sendStatus >= 200 && sendStatus < 300,
          status: sendStatus,
          json: () => Promise.resolve(sendResponse),
        });
      }
      if (url.includes('/poll/disconnect')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      }
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    };

    vi.stubGlobal('fetch', vi.fn(fetchImpl));

    transport = new LongPollingTransport({
      events: { onMessage, onStateChange, onError },
      maxRetries: 3,
      initialRetryDelay: 10,
      maxRetryDelay: 100,
    });
  });

  afterEach(() => {
    transport.disconnect();
    vi.restoreAllMocks();
  });

  async function connectTransport() {
    transport.connect('ws://localhost:8080/ws');
    await vi.waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith('connected');
    });
  }

  describe('send() delivers response as message', () => {
    it('delivers joinedGame response from POST /poll/send', async () => {
      await connectTransport();

      sendResponse = {
        type: 'joinedGame',
        playerId: 'player-42',
        game: {
          code: 'XYZ',
          status: 'waiting',
          creatorId: 'player-42',
          board: { size: 100, snakesAndLadders: [] },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        players: [
          {
            id: 'player-42',
            gameCode: 'XYZ',
            name: 'Mobile Player',
            color: '#EF4444',
            position: 1,
            isConnected: true,
            joinedAt: '2024-01-01T00:00:00Z',
          },
        ],
      };

      transport.send({ action: 'joinGame', gameCode: 'XYZ', playerName: 'Mobile Player' });

      await vi.waitFor(() => {
        expect(onMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'joinedGame',
            playerId: 'player-42',
          })
        );
      });
    });

    it('delivers playerMoved response from POST /poll/send', async () => {
      await connectTransport();

      sendResponse = {
        type: 'playerMoved',
        playerId: 'player-1',
        playerName: 'Player 1',
        diceRoll: 6,
        previousPosition: 1,
        newPosition: 7,
      };

      transport.send({ action: 'rollDice', gameCode: 'ABC', playerId: 'player-1' });

      await vi.waitFor(() => {
        expect(onMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'playerMoved',
            diceRoll: 6,
            newPosition: 7,
          })
        );
      });
    });

    it('does not deliver response without type field', async () => {
      await connectTransport();

      sendResponse = { success: true };
      onMessage.mockClear();

      transport.send({ action: 'ping' });

      await new Promise((r) => setTimeout(r, 100));

      // onMessage should not have been called with the { success: true } object
      for (const call of onMessage.mock.calls) {
        expect(call[0]).not.toHaveProperty('success');
      }
    });

    it('reports error on HTTP 500 from send', async () => {
      await connectTransport();

      sendStatus = 500;
      sendResponse = {};

      transport.send({ action: 'rollDice', gameCode: 'ABC', playerId: 'p1' });

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('connection headers', () => {
    it('sends X-Connection-Id header with send requests', async () => {
      await connectTransport();

      transport.send({ action: 'ping' });

      await vi.waitFor(() => {
        const fetchFn = vi.mocked(globalThis.fetch);
        const sendCall = fetchFn.mock.calls.find(
          (call) => typeof call[0] === 'string' && call[0].includes('/poll/send')
        );
        expect(sendCall).toBeDefined();
        const headers = (sendCall![1] as RequestInit).headers as Record<string, string>;
        expect(headers['X-Connection-Id']).toBe('conn-123');
      });
    });
  });
});
