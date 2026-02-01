import type { ClientMessage, ServerMessage } from '@snakes-and-ladders/shared';

export type TransportState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface TransportEvents {
  onMessage: (message: ServerMessage) => void;
  onStateChange: (state: TransportState) => void;
  onError: (error: Error) => void;
}

export interface Transport {
  readonly state: TransportState;
  readonly type: 'websocket' | 'long-polling';

  connect(url: string): void;
  disconnect(): void;
  send(message: ClientMessage): void;
}

export interface TransportConfig {
  events: TransportEvents;
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
}

// Exponential backoff helper
export function calculateBackoff(
  attempt: number,
  initialDelay: number = 1000,
  maxDelay: number = 30000
): number {
  const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}
