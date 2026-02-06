import { useState, useEffect, useRef } from 'react';

import { useGame } from '../contexts/GameContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { saveSession, loadSession, clearSession } from '../lib/session';

import { PlayerGrid } from './PlayerGrid';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Logo } from './ui/Logo';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export function Lobby() {
  const [view, setView] = useState<'home' | 'create' | 'join' | 'waiting'>('home');
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [createdGameCode, setCreatedGameCode] = useState('');
  const [createdPlayerId, setCreatedPlayerId] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRejoining, setIsRejoining] = useState(false);
  const hasAttemptedRejoin = useRef(false);

  const {
    game,
    players,
    currentPlayerId,
    joinGame,
    rejoinGame,
    startGame,
    error,
    isLoading,
    resetGame,
  } = useGame();
  const { connect, isConnected } = useWebSocket();

  // Auto-transition to waiting room when game is joined
  useEffect(() => {
    if (game && view !== 'waiting') {
      setView('waiting');
      setIsRejoining(false);
    }
  }, [game, view]);

  // Save session when game is joined (for non-creators who join via joinGame)
  useEffect(() => {
    if (game && currentPlayerId && !isRejoining) {
      // Only save if not already saved (creators save immediately after HTTP create)
      const existingSession = loadSession();
      if (!existingSession || existingSession.playerId !== currentPlayerId) {
        saveSession({
          gameCode: game.code,
          playerId: currentPlayerId,
          isCreator: isCreator,
          playerName: playerName.trim(),
        });
      }
    }
  }, [game, currentPlayerId, isCreator, playerName, isRejoining]);

  // Check for existing session on mount and try to rejoin
  useEffect(() => {
    if (hasAttemptedRejoin.current) return;

    const session = loadSession();
    if (session && !game) {
      hasAttemptedRejoin.current = true;
      setIsRejoining(true);
      setCreatedGameCode(session.gameCode);
      setCreatedPlayerId(session.playerId);
      setIsCreator(session.isCreator);
      setPlayerName(session.playerName);
      connect(WS_URL);
    }
  }, [connect, game]);

  // Clear session on error (game not found, player not found, etc.)
  useEffect(() => {
    if (error && isRejoining) {
      clearSession();
      setIsRejoining(false);
      setCreatedGameCode('');
      setCreatedPlayerId('');
      setIsCreator(false);
    }
  }, [error, isRejoining]);

  const handleCreateGame = async () => {
    if (!playerName.trim()) return;

    setIsCreating(true);

    try {
      const response = await fetch(`${API_URL}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorName: playerName }),
      });

      if (!response.ok) {
        throw new Error('Failed to create game');
      }

      const data = (await response.json()) as { game: { code: string }; playerId: string };
      setCreatedGameCode(data.game.code);
      setCreatedPlayerId(data.playerId);
      setIsCreator(true);

      // Save session to localStorage for reconnection on refresh
      saveSession({
        gameCode: data.game.code,
        playerId: data.playerId,
        isCreator: true,
        playerName: playerName.trim(),
      });

      // Connect to WebSocket and join the game
      connect(WS_URL);
    } catch (err) {
      console.error('Failed to create game:', err);
      setIsCreating(false);
    }
  };

  // Rejoin game after WebSocket connection (for creator who already has a playerId)
  useEffect(() => {
    if (isConnected && createdGameCode && createdPlayerId && !game) {
      rejoinGame(createdGameCode, createdPlayerId);
    }
  }, [isConnected, createdGameCode, createdPlayerId, game, rejoinGame]);

  const handleJoinGame = () => {
    if (!playerName.trim() || !gameCode.trim()) return;
    connect(WS_URL);
  };

  // Join game after WebSocket connection for joining players
  useEffect(() => {
    if (isConnected && gameCode && !createdGameCode && !game) {
      joinGame(gameCode.toUpperCase(), playerName);
    }
  }, [isConnected, gameCode, createdGameCode, game, joinGame, playerName]);

  const handleStartGame = () => {
    startGame();
  };

  const handleBack = () => {
    clearSession(); // Clear saved session when leaving game
    setView('home');
    setPlayerName('');
    setGameCode('');
    setCreatedGameCode('');
    setCreatedPlayerId('');
    setIsCreator(false);
    setIsRejoining(false);
    resetGame();
  };

  const canStartGame = isCreator && players.length >= 2;

  if (view === 'waiting' && game) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl bg-slate-800/50 p-8 backdrop-blur">
          <h1 className="mb-2 text-center text-3xl font-bold text-white">Waiting Room</h1>
          <p className="mb-6 text-center text-slate-400">
            Game Code: <span className="font-mono text-2xl text-game-primary">{game.code}</span>
          </p>

          <PlayerGrid players={players} currentPlayerId={currentPlayerId} />

          {error && (
            <div className="mt-4 rounded-lg bg-red-500/20 p-3 text-center text-red-400">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {isCreator && (
              <Button
                onClick={handleStartGame}
                disabled={!canStartGame}
                variant="primary"
                fullWidth
              >
                {canStartGame ? 'Start Game' : 'Waiting for players...'}
              </Button>
            )}
            {!isCreator && (
              <p className="text-center text-slate-400">Waiting for host to start the game...</p>
            )}
            <Button onClick={handleBack} variant="secondary" fullWidth>
              Leave Game
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-slate-800/50 p-8 backdrop-blur">
          <h1 className="mb-6 text-center text-3xl font-bold text-white">Create Game</h1>

          <div className="space-y-4">
            <Input
              label="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
            />

            <Button
              onClick={() => void handleCreateGame()}
              disabled={!playerName.trim() || isCreating || isLoading}
              variant="primary"
              fullWidth
            >
              {isCreating || isLoading ? 'Creating...' : 'Create Game'}
            </Button>

            <Button onClick={handleBack} variant="secondary" fullWidth>
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-slate-800/50 p-8 backdrop-blur">
          <h1 className="mb-6 text-center text-3xl font-bold text-white">Join Game</h1>

          <div className="space-y-4">
            <Input
              label="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
            />

            <Input
              label="Game Code"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              placeholder="Enter game code"
              maxLength={6}
            />

            {error && (
              <div className="rounded-lg bg-red-500/20 p-3 text-center text-red-400">{error}</div>
            )}

            <Button
              onClick={handleJoinGame}
              disabled={!playerName.trim() || !gameCode.trim() || isLoading}
              variant="primary"
              fullWidth
            >
              {isLoading ? 'Joining...' : 'Join Game'}
            </Button>

            <Button onClick={handleBack} variant="secondary" fullWidth>
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while attempting to rejoin
  if (isRejoining && !game) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-slate-800/50 p-8 backdrop-blur">
          <div className="mb-8">
            <Logo size="lg" showSubtitle />
          </div>
          <p className="text-center text-slate-400">Reconnecting to game...</p>
        </div>
      </div>
    );
  }

  // Home view
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-800/50 p-8 backdrop-blur">
        <div className="mb-8">
          <Logo size="lg" showSubtitle />
        </div>

        <div className="space-y-4">
          <Button onClick={() => setView('create')} variant="primary" fullWidth>
            Create Game
          </Button>
          <Button onClick={() => setView('join')} variant="secondary" fullWidth>
            Join Game
          </Button>
        </div>
      </div>
    </div>
  );
}
