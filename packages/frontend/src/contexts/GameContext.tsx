import type { Game, Player } from '@snakes-and-ladders/shared';
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { useWebSocket } from './WebSocketContext';

interface Move {
  id: string;
  gameCode: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  diceRoll: number;
  previousPosition: number;
  newPosition: number;
  effect?: { type: 'snake' | 'ladder'; from: number; to: number };
  timestamp: string;
}

interface GameState {
  game: Game | null;
  players: Player[];
  currentPlayerId: string | null;
  lastMove: {
    playerId: string;
    diceRoll: number;
    previousPosition: number;
    newPosition: number;
    effect?: { type: 'snake' | 'ladder'; from: number; to: number };
  } | null;
  moves: Move[];
  error: string | null;
  isLoading: boolean;
}

type GameAction =
  | { type: 'SET_GAME'; payload: { game: Game; players: Player[]; playerId: string } }
  | { type: 'SET_PLAYERS'; payload: Player[] }
  | { type: 'PLAYER_JOINED'; payload: Player }
  | { type: 'PLAYER_LEFT'; payload: string }
  | { type: 'PLAYER_MOVED'; payload: GameState['lastMove'] }
  | { type: 'GAME_STARTED'; payload: Game }
  | { type: 'GAME_ENDED'; payload: { winnerId: string } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESET' };

const initialState: GameState = {
  game: null,
  players: [],
  currentPlayerId: null,
  lastMove: null,
  moves: [],
  error: null,
  isLoading: false,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_GAME':
      return {
        ...state,
        game: action.payload.game,
        players: action.payload.players,
        currentPlayerId: action.payload.playerId,
        error: null,
        isLoading: false,
      };

    case 'SET_PLAYERS':
      return { ...state, players: action.payload };

    case 'PLAYER_JOINED':
      return {
        ...state,
        players: [...state.players, action.payload],
      };

    case 'PLAYER_LEFT':
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.payload),
      };

    case 'PLAYER_MOVED': {
      const moveData = action.payload;
      if (!moveData) return state;
      const player = state.players.find((p) => p.id === moveData.playerId);
      const newMove: Move = {
        id: `${Date.now()}-${moveData.playerId.slice(-6)}`,
        gameCode: state.game?.code || '',
        playerId: moveData.playerId,
        playerName: player?.name || 'Unknown',
        playerColor: player?.color || '#888888',
        diceRoll: moveData.diceRoll,
        previousPosition: moveData.previousPosition,
        newPosition: moveData.newPosition,
        effect: moveData.effect,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        lastMove: moveData,
        moves: [newMove, ...state.moves].slice(0, 50), // Keep last 50 moves
        players: state.players.map((p) =>
          p.id === moveData.playerId ? { ...p, position: moveData.newPosition } : p
        ),
      };
    }

    case 'GAME_STARTED':
      return {
        ...state,
        game: action.payload,
        players: state.players.map((p) => ({ ...p, position: 1 })),
        moves: [], // Clear move history on game start
      };

    case 'GAME_ENDED':
      return {
        ...state,
        game: state.game
          ? { ...state.game, status: 'finished', winnerId: action.payload.winnerId }
          : null,
      };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

interface GameContextType extends GameState {
  joinGame: (gameCode: string, playerName: string) => void;
  startGame: () => void;
  rollDice: () => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

interface GameProviderProps {
  children: React.ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { sendMessage, lastMessage, isConnected } = useWebSocket();
  const needsRejoinRef = useRef(false);
  const wasConnectedRef = useRef(false);

  // Handle visibility change (device wake from sleep)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.game && state.currentPlayerId) {
        // Mark that we need to rejoin when connection is restored
        needsRejoinRef.current = true;
        console.log('Device woke up, will rejoin game when connected');

        // If already connected, rejoin immediately
        if (isConnected) {
          sendMessage({
            action: 'rejoinGame',
            gameCode: state.game.code,
            playerId: state.currentPlayerId,
          });
          needsRejoinRef.current = false;
        }
      }
    };

    const handleOnline = () => {
      if (state.game && state.currentPlayerId) {
        needsRejoinRef.current = true;
        console.log('Device came online, will rejoin game when connected');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [state.game, state.currentPlayerId, isConnected, sendMessage]);

  // Handle reconnection - rejoin game if needed
  useEffect(() => {
    if (isConnected && needsRejoinRef.current && state.game && state.currentPlayerId) {
      console.log('Reconnected, rejoining game...');
      sendMessage({
        action: 'rejoinGame',
        gameCode: state.game.code,
        playerId: state.currentPlayerId,
      });
      needsRejoinRef.current = false;
    }

    // Track connection state for detecting reconnections
    if (wasConnectedRef.current && !isConnected && state.game) {
      // Just disconnected while in a game, mark for rejoin
      needsRejoinRef.current = true;
      console.log('Disconnected from game, will rejoin when reconnected');
    }

    wasConnectedRef.current = isConnected;
  }, [isConnected, state.game, state.currentPlayerId, sendMessage]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    const message = lastMessage;

    switch (message.type) {
      case 'joinedGame':
        dispatch({
          type: 'SET_GAME',
          payload: {
            game: message.game,
            players: message.players,
            playerId: message.playerId,
          },
        });
        break;

      case 'playerJoined':
        dispatch({ type: 'PLAYER_JOINED', payload: message.player });
        break;

      case 'playerLeft':
        dispatch({ type: 'PLAYER_LEFT', payload: message.playerId });
        break;

      case 'playerMoved':
        dispatch({
          type: 'PLAYER_MOVED',
          payload: {
            playerId: message.playerId,
            diceRoll: message.diceRoll,
            previousPosition: message.previousPosition,
            newPosition: message.newPosition,
            effect: message.effect,
          },
        });
        break;

      case 'gameStarted':
        dispatch({ type: 'GAME_STARTED', payload: message.game });
        break;

      case 'gameEnded':
        dispatch({ type: 'GAME_ENDED', payload: { winnerId: message.winnerId } });
        break;

      case 'error':
        dispatch({ type: 'SET_ERROR', payload: message.message });
        break;
    }
  }, [lastMessage]);

  const joinGame = useCallback(
    (gameCode: string, playerName: string) => {
      if (!isConnected) {
        dispatch({ type: 'SET_ERROR', payload: 'Not connected to server' });
        return;
      }
      dispatch({ type: 'SET_LOADING', payload: true });
      sendMessage({ action: 'joinGame', gameCode, playerName });
    },
    [isConnected, sendMessage]
  );

  const startGame = useCallback(() => {
    if (!state.game || !state.currentPlayerId) return;
    sendMessage({
      action: 'startGame',
      gameCode: state.game.code,
      playerId: state.currentPlayerId,
    });
  }, [state.game, state.currentPlayerId, sendMessage]);

  const rollDice = useCallback(() => {
    if (!state.game || !state.currentPlayerId) return;
    sendMessage({
      action: 'rollDice',
      gameCode: state.game.code,
      playerId: state.currentPlayerId,
    });
  }, [state.game, state.currentPlayerId, sendMessage]);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <GameContext.Provider
      value={{
        ...state,
        joinGame,
        startGame,
        rollDice,
        resetGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
