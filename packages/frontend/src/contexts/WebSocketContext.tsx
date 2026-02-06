import type { ClientMessage, ServerMessage } from '@snakes-and-ladders/shared';
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

import type { Transport, TransportState } from '../lib/transport';
import { WebSocketTransport, LongPollingTransport } from '../lib/transport';

interface WebSocketContextType {
  isConnected: boolean;
  transportState: TransportState;
  transportType: 'websocket' | 'long-polling' | null;
  sendMessage: (message: ClientMessage) => void;
  lastMessage: ServerMessage | null;
  messageVersion: number;
  consumeMessages: () => ServerMessage[];
  connect: (url: string) => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

const FALLBACK_THRESHOLD = 3; // Switch to long-polling after 3 consecutive WebSocket failures

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [transportState, setTransportState] = useState<TransportState>('disconnected');
  const [transportType, setTransportType] = useState<'websocket' | 'long-polling' | null>(null);
  const [messageVersion, setMessageVersion] = useState(0);
  const messageQueueRef = useRef<ServerMessage[]>([]);
  const transportRef = useRef<Transport | null>(null);
  const urlRef = useRef<string>('');
  const wsFailureCountRef = useRef<number>(0);

  const createTransport = useCallback((type: 'websocket' | 'long-polling'): Transport => {
    const config = {
      events: {
        onMessage: (message: ServerMessage) => {
          messageQueueRef.current.push(message);
          setMessageVersion((v) => v + 1);
        },
        onStateChange: (state: TransportState) => {
          setTransportState(state);

          // Track WebSocket failures for fallback logic
          if (type === 'websocket') {
            if (state === 'reconnecting') {
              wsFailureCountRef.current++;

              // Switch to long-polling after threshold
              if (wsFailureCountRef.current >= FALLBACK_THRESHOLD) {
                console.log('Switching to long-polling fallback after WebSocket failures');
                transportRef.current?.disconnect();
                const longPolling = createTransport('long-polling');
                transportRef.current = longPolling;
                setTransportType('long-polling');
                longPolling.connect(urlRef.current);
              }
            } else if (state === 'connected') {
              wsFailureCountRef.current = 0;
            }
          }
        },
        onError: (error: Error) => {
          console.error(`Transport error (${type}):`, error);
        },
      },
      maxRetries: 10,
      initialRetryDelay: 1000,
      maxRetryDelay: 30000,
    };

    if (type === 'websocket') {
      return new WebSocketTransport(config);
    }
    return new LongPollingTransport(config);
  }, []);

  const connect = useCallback(
    (url: string) => {
      if (transportRef.current?.state === 'connected') {
        return;
      }

      urlRef.current = url;
      wsFailureCountRef.current = 0;

      // Always start with WebSocket
      const transport = createTransport('websocket');
      transportRef.current = transport;
      setTransportType('websocket');
      transport.connect(url);
    },
    [createTransport]
  );

  const disconnect = useCallback(() => {
    transportRef.current?.disconnect();
    transportRef.current = null;
    setTransportType(null);
    wsFailureCountRef.current = 0;
  }, []);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (transportRef.current?.state === 'connected') {
      transportRef.current.send(message);
    } else {
      console.warn('Transport not connected');
    }
  }, []);

  const consumeMessages = useCallback((): ServerMessage[] => {
    const messages = messageQueueRef.current;
    messageQueueRef.current = [];
    return messages;
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const isConnected = transportState === 'connected';

  // Derive lastMessage for backward compat — last item in queue, or null
  const lastMessage =
    messageQueueRef.current.length > 0
      ? messageQueueRef.current[messageQueueRef.current.length - 1]
      : null;

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        transportState,
        transportType,
        sendMessage,
        lastMessage,
        messageVersion,
        consumeMessages,
        connect,
        disconnect,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
