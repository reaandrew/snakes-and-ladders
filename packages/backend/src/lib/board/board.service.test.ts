import type { BoardConfig } from '@snakes-and-ladders/shared';
import { describe, it, expect } from 'vitest';

import { rollDice, processMove, getPositionCoordinates, validateBoard } from './board.service.js';

describe('board.service', () => {
  const testBoard: BoardConfig = {
    size: 100,
    snakesAndLadders: [
      { start: 16, end: 6, type: 'snake' },
      { start: 47, end: 26, type: 'snake' },
      { start: 4, end: 14, type: 'ladder' },
      { start: 9, end: 31, type: 'ladder' },
    ],
  };

  describe('rollDice', () => {
    it('should return a number between 1 and 6', () => {
      for (let i = 0; i < 100; i++) {
        const result = rollDice();
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
      }
    });
  });

  describe('processMove', () => {
    it('should move to new position when no snake or ladder', () => {
      const result = processMove(1, 2, testBoard);
      expect(result.newPosition).toBe(3);
      expect(result.effect).toBeUndefined();
      expect(result.isWinner).toBe(false);
    });

    it('should trigger ladder when landing on ladder start', () => {
      const result = processMove(1, 3, testBoard); // lands on 4, ladder to 14
      expect(result.newPosition).toBe(14);
      expect(result.effect).toEqual({
        type: 'ladder',
        from: 4,
        to: 14,
      });
      expect(result.isWinner).toBe(false);
    });

    it('should trigger snake when landing on snake start', () => {
      const result = processMove(10, 6, testBoard); // lands on 16, snake to 6
      expect(result.newPosition).toBe(6);
      expect(result.effect).toEqual({
        type: 'snake',
        from: 16,
        to: 6,
      });
      expect(result.isWinner).toBe(false);
    });

    it('should not move if dice roll exceeds board', () => {
      const result = processMove(98, 5, testBoard);
      expect(result.newPosition).toBe(98);
      expect(result.effect).toBeUndefined();
      expect(result.isWinner).toBe(false);
    });

    it('should win when landing exactly on board size', () => {
      const result = processMove(98, 2, testBoard);
      expect(result.newPosition).toBe(100);
      expect(result.isWinner).toBe(true);
    });

    it('should win via ladder to final position', () => {
      const boardWithWinLadder: BoardConfig = {
        size: 100,
        snakesAndLadders: [{ start: 95, end: 100, type: 'ladder' }],
      };
      const result = processMove(93, 2, boardWithWinLadder);
      expect(result.newPosition).toBe(100);
      expect(result.effect).toEqual({
        type: 'ladder',
        from: 95,
        to: 100,
      });
      expect(result.isWinner).toBe(true);
    });
  });

  describe('getPositionCoordinates', () => {
    it('should return correct coordinates for position 1 (bottom-left)', () => {
      const coords = getPositionCoordinates(1);
      expect(coords).toEqual({ row: 0, col: 0 });
    });

    it('should return correct coordinates for position 10 (bottom-right)', () => {
      const coords = getPositionCoordinates(10);
      expect(coords).toEqual({ row: 0, col: 9 });
    });

    it('should return correct coordinates for position 11 (second row, snake pattern)', () => {
      const coords = getPositionCoordinates(11);
      expect(coords).toEqual({ row: 1, col: 9 });
    });

    it('should return correct coordinates for position 20', () => {
      const coords = getPositionCoordinates(20);
      expect(coords).toEqual({ row: 1, col: 0 });
    });

    it('should return correct coordinates for position 100 (top-left)', () => {
      const coords = getPositionCoordinates(100);
      expect(coords).toEqual({ row: 9, col: 0 });
    });
  });

  describe('validateBoard', () => {
    it('should return no errors for valid board', () => {
      const errors = validateBoard(testBoard);
      expect(errors).toHaveLength(0);
    });

    it('should detect board size too small', () => {
      const invalidBoard: BoardConfig = { size: 5, snakesAndLadders: [] };
      const errors = validateBoard(invalidBoard);
      expect(errors).toContain('Board size must be between 10 and 1000');
    });

    it('should detect snake going up instead of down', () => {
      const invalidBoard: BoardConfig = {
        size: 100,
        snakesAndLadders: [{ start: 10, end: 20, type: 'snake' }],
      };
      const errors = validateBoard(invalidBoard);
      expect(errors.some((e) => e.includes('must go down'))).toBe(true);
    });

    it('should detect ladder going down instead of up', () => {
      const invalidBoard: BoardConfig = {
        size: 100,
        snakesAndLadders: [{ start: 20, end: 10, type: 'ladder' }],
      };
      const errors = validateBoard(invalidBoard);
      expect(errors.some((e) => e.includes('must go up'))).toBe(true);
    });

    it('should detect duplicate start positions', () => {
      const invalidBoard: BoardConfig = {
        size: 100,
        snakesAndLadders: [
          { start: 10, end: 5, type: 'snake' },
          { start: 10, end: 20, type: 'ladder' },
        ],
      };
      const errors = validateBoard(invalidBoard);
      expect(errors.some((e) => e.includes('Duplicate start positions'))).toBe(true);
    });
  });
});
