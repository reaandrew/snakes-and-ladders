import type { ClientMessage, ServerMessage } from '@snakes-and-ladders/shared';

import type { Transport, TransportConfig, TransportState } from './Transport';
import { calculateBackoff } from './Transport';

export class WebSocketTransport implements Transport {
  readonly type = 'websocket' as const;

  private ws: WebSocket | null = null;
  private _state: TransportState = 'disconnected';
  private url: string = '';
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private pingInterval: number | null = null;
  private config: TransportConfig;

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

    this.url = url;
    this.clearTimers();
    this.setState('connecting');

    try {
      this.ws = new WebSocket(url);
      this.setupEventHandlers();
    } catch (error) {
      this.config.events.onError(error as Error);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempt = 0;
    this.setState('disconnected');
  }

  send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  }

  getConsecutiveFailures(): number {
    return this.reconnectAttempt;
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.setState('connected');
      this.startPingInterval();
    };

    this.ws.onclose = () => {
      this.clearTimers();
      if (this._state !== 'disconnected') {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      this.config.events.onError(new Error('WebSocket connection error'));
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as ServerMessage;
        this.config.events.onMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  private startPingInterval(): void {
    this.pingInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30000);
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
      this.connect(this.url);
    }, delay);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
