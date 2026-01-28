import { describe, it, expect } from 'vitest';

import { DEFAULT_BOARD_CONFIG, PLAYER_COLORS } from './game.types.js';

describe('game.types', () => {
  describe('DEFAULT_BOARD_CONFIG', () => {
    it('should have size of 100', () => {
      expect(DEFAULT_BOARD_CONFIG.size).toBe(100);
    });

    it('should have snakes and ladders', () => {
      expect(DEFAULT_BOARD_CONFIG.snakesAndLadders.length).toBeGreaterThan(0);
    });

    it('should have valid snakes (end < start)', () => {
      const snakes = DEFAULT_BOARD_CONFIG.snakesAndLadders.filter((s) => s.type === 'snake');
      expect(snakes.length).toBeGreaterThan(0);
      snakes.forEach((snake) => {
        expect(snake.end).toBeLessThan(snake.start);
      });
    });

    it('should have valid ladders (end > start)', () => {
      const ladders = DEFAULT_BOARD_CONFIG.snakesAndLadders.filter((s) => s.type === 'ladder');
      expect(ladders.length).toBeGreaterThan(0);
      ladders.forEach((ladder) => {
        expect(ladder.end).toBeGreaterThan(ladder.start);
      });
    });

    it('should have all positions within board bounds', () => {
      DEFAULT_BOARD_CONFIG.snakesAndLadders.forEach((item) => {
        expect(item.start).toBeGreaterThanOrEqual(1);
        expect(item.start).toBeLessThanOrEqual(DEFAULT_BOARD_CONFIG.size);
        expect(item.end).toBeGreaterThanOrEqual(1);
        expect(item.end).toBeLessThanOrEqual(DEFAULT_BOARD_CONFIG.size);
      });
    });
  });

  describe('PLAYER_COLORS', () => {
    it('should have at least 4 colors', () => {
      expect(PLAYER_COLORS.length).toBeGreaterThanOrEqual(4);
    });

    it('should have valid hex color format', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      PLAYER_COLORS.forEach((color) => {
        expect(color).toMatch(hexColorRegex);
      });
    });

    it('should have unique colors', () => {
      const uniqueColors = new Set(PLAYER_COLORS);
      expect(uniqueColors.size).toBe(PLAYER_COLORS.length);
    });
  });
});
