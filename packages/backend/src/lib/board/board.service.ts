import type { BoardConfig, MoveEffect, SnakeOrLadder } from '@snakes-and-ladders/shared';

export interface MoveResult {
  newPosition: number;
  effect?: MoveEffect;
  isWinner: boolean;
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function processMove(
  currentPosition: number,
  diceRoll: number,
  board: BoardConfig
): MoveResult {
  const targetPosition = currentPosition + diceRoll;

  // If exceeds board size, player doesn't move
  if (targetPosition > board.size) {
    return {
      newPosition: currentPosition,
      isWinner: false,
    };
  }

  // Check for win condition
  if (targetPosition === board.size) {
    return {
      newPosition: targetPosition,
      isWinner: true,
    };
  }

  // Check for snake or ladder
  const snakeOrLadder = findSnakeOrLadder(targetPosition, board);

  if (snakeOrLadder) {
    return {
      newPosition: snakeOrLadder.end,
      effect: {
        type: snakeOrLadder.type,
        from: targetPosition,
        to: snakeOrLadder.end,
      },
      isWinner: snakeOrLadder.end === board.size,
    };
  }

  return {
    newPosition: targetPosition,
    isWinner: false,
  };
}

function findSnakeOrLadder(position: number, board: BoardConfig): SnakeOrLadder | undefined {
  return board.snakesAndLadders.find((item) => item.start === position);
}

export function getPositionCoordinates(
  position: number,
  boardSize: number = 10
): { row: number; col: number } {
  // Position 1 is bottom-left, position 100 is top-left
  // Board is 10x10 by default (100 cells)
  const zeroIndexed = position - 1;
  const row = Math.floor(zeroIndexed / boardSize);
  const col = row % 2 === 0 ? zeroIndexed % boardSize : boardSize - 1 - (zeroIndexed % boardSize);

  return { row, col };
}

export function validateBoard(board: BoardConfig): string[] {
  const errors: string[] = [];

  if (board.size < 10 || board.size > 1000) {
    errors.push('Board size must be between 10 and 1000');
  }

  for (const item of board.snakesAndLadders) {
    if (item.start < 2 || item.start > board.size - 1) {
      errors.push(
        `${item.type} start position ${item.start} is invalid (must be between 2 and ${board.size - 1})`
      );
    }

    if (item.end < 1 || item.end > board.size) {
      errors.push(
        `${item.type} end position ${item.end} is invalid (must be between 1 and ${board.size})`
      );
    }

    if (item.type === 'snake' && item.end >= item.start) {
      errors.push(`Snake at ${item.start} must go down (end ${item.end} >= start ${item.start})`);
    }

    if (item.type === 'ladder' && item.end <= item.start) {
      errors.push(`Ladder at ${item.start} must go up (end ${item.end} <= start ${item.start})`);
    }
  }

  // Check for duplicate start positions
  const startPositions = board.snakesAndLadders.map((item) => item.start);
  const duplicates = startPositions.filter((pos, index) => startPositions.indexOf(pos) !== index);

  if (duplicates.length > 0) {
    errors.push(`Duplicate start positions found: ${[...new Set(duplicates)].join(', ')}`);
  }

  return errors;
}
