import { useGame } from '../contexts/GameContext';

import { GameBoard } from './GameBoard';
import { Lobby } from './Lobby';

export function GameScreen() {
  const { game } = useGame();

  if (!game) {
    return <Lobby />;
  }

  if (game.status === 'waiting') {
    return <Lobby />;
  }

  return <GameBoard />;
}
