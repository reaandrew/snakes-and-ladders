import type { ClientMessage, ServerMessage } from '@snakes-and-ladders/shared';

import type { Transport, TransportConfig, TransportState } from './Transport';
import { calculateBackoff } from './Transport';

export class LongPollingTransport implements Transport {
  readonly type = 'long-polling' as const;

  private _state: TransportState = 'disconnected';
  private baseUrl: string = '';
  private pollAbortController: AbortController | null = null;
  private connectionId: string | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private config: TransportConfig;
  private isPolling = false;

  constructor(config: TransportConfig) {
    this.config = config;
  }

  get state(): TransportState {
    return this._state;
  }

  private setState(state: TransportState): void {
    this._state = state;
    this.config.events.onStateChange(state);
  }

  connect(url: string): void {
    if (this._state === 'connected' || this._state === 'connecting') {
      return;
    }

    // Convert WebSocket URL to HTTP URL for polling
    this.baseUrl = url.replace(/^ws(s)?:/, 'http$1:').replace('/ws', '/poll');
    this.setState('connecting');
    void this.establishConnection();
  }

  disconnect(): void {
    this.isPolling = false;
    if (this.pollAbortController) {
      this.pollAbortController.abort();
      this.pollAbortController = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Notify server of disconnect (fire and forget)
    if (this.connectionId) {
      void fetch(`${this.baseUrl}/disconnect`, {
        method: 'POST',
        headers: { 'X-Connection-Id': this.connectionId },
      }).catch(() => {
        // Ignore errors on disconnect
      });
    }

    this.connectionId = null;
    this.reconnectAttempt = 0;
    this.setState('disconnected');
  }

  send(message: ClientMessage): void {
    void this.sendAsync(message);
  }

  private async sendAsync(message: ClientMessage): Promise<void> {
    if (this._state !== 'connected' || !this.connectionId) {
      console.warn('Long-polling not connected, message not sent');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Connection-Id': this.connectionId,
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send message via long-polling:', error);
      this.config.events.onError(error as Error);
    }
  }

  private async establishConnection(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = (await response.json()) as { connectionId: string };
      this.connectionId = data.connectionId;
      this.reconnectAttempt = 0;
      this.setState('connected');
      void this.startPolling();
    } catch (error) {
      console.error('Failed to establish long-polling connection:', error);
      this.config.events.onError(error as Error);
      this.scheduleReconnect();
    }
  }

  private async startPolling(): Promise<void> {
    this.isPolling = true;

    while (this.isPolling && this._state === 'connected') {
      try {
        this.pollAbortController = new AbortController();

        const response = await fetch(`${this.baseUrl}/messages`, {
          method: 'GET',
          headers: {
            'X-Connection-Id': this.connectionId || '',
          },
          signal: this.pollAbortController.signal,
        });

        if (!response.ok) {
          if (response.status === 404) {
            // Connection expired, reconnect
            this.setState('reconnecting');
            void this.establishConnection();
            return;
          }
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = (await response.json()) as { messages: ServerMessage[] };

        if (data.messages && Array.isArray(data.messages)) {
          for (const message of data.messages) {
            this.config.events.onMessage(message);
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          // Polling was intentionally aborted
          break;
        }
        console.error('Long-polling error:', error);
        this.config.events.onError(error as Error);
        this.scheduleReconnect();
        return;
      }
    }
  }

  private scheduleReconnect(): void {
    const maxRetries = this.config.maxRetries ?? 10;

    if (this.reconnectAttempt >= maxRetries) {
      this.setState('disconnected');
      this.config.events.onError(new Error('Max reconnection attempts reached'));
      return;
    }

    this.setState('reconnecting');
    const delay = calculateBackoff(
      this.reconnectAttempt,
      this.config.initialRetryDelay ?? 1000,
      this.config.maxRetryDelay ?? 30000
    );

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectAttempt++;
      void this.establishConnection();
    }, delay);
  }
}
