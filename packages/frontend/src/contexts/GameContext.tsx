import type { Game, Player } from '@snakes-and-ladders/shared';
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

import { useWebSocket } from './WebSocketContext';

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
      const move = action.payload;
      if (!move) return state;
      return {
        ...state,
        lastMove: move,
        players: state.players.map((p) =>
          p.id === move.playerId ? { ...p, position: move.newPosition } : p
        ),
      };
    }

    case 'GAME_STARTED':
      return {
        ...state,
        game: action.payload,
        players: state.players.map((p) => ({ ...p, position: 1 })),
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
