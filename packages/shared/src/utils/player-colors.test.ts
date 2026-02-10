import { describe, it, expect } from 'vitest';

import { generatePlayerColor, getPlayerColor, PLAYER_COLORS, MAX_PLAYERS } from './player-colors';

describe('player-colors', () => {
  describe('MAX_PLAYERS', () => {
    it('equals 300', () => {
      expect(MAX_PLAYERS).toBe(300);
    });
  });

  describe('generatePlayerColor', () => {
    it('returns a valid hex color string', () => {
      const color = generatePlayerColor(0);
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });

    it('is deterministic for the same index', () => {
      expect(generatePlayerColor(5)).toBe(generatePlayerColor(5));
    });

    it('returns distinct colors for consecutive indices', () => {
      const color0 = generatePlayerColor(0);
      const color1 = generatePlayerColor(1);
      const color2 = generatePlayerColor(2);
      expect(color0).not.toBe(color1);
      expect(color1).not.toBe(color2);
      expect(color0).not.toBe(color2);
    });

    it('produces valid hex for all hue ranges of hslToHex', () => {
      // Test indices that produce hues across all 6 ranges (0-60, 60-120, etc.)
      // golden ratio * 360 = ~222.5 per step
      // We need to cover all 6 ranges by testing enough indices
      const colors: string[] = [];
      for (let i = 0; i < 20; i++) {
        const color = generatePlayerColor(i);
        expect(color).toMatch(/^#[0-9A-F]{6}$/);
        colors.push(color);
      }
      // Verify we got at least 15 distinct colors from 20 indices
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBeGreaterThanOrEqual(15);
    });
  });

  describe('getPlayerColor', () => {
    it('maps 1-indexed to 0-indexed correctly', () => {
      expect(getPlayerColor(1)).toBe(generatePlayerColor(0));
      expect(getPlayerColor(2)).toBe(generatePlayerColor(1));
      expect(getPlayerColor(10)).toBe(generatePlayerColor(9));
    });
  });

  describe('PLAYER_COLORS', () => {
    it('has 300 entries', () => {
      expect(PLAYER_COLORS).toHaveLength(300);
    });

    it('contains all unique colors', () => {
      const unique = new Set(PLAYER_COLORS);
      expect(unique.size).toBe(300);
    });

    it('contains valid hex color strings', () => {
      for (const color of PLAYER_COLORS) {
        expect(color).toMatch(/^#[0-9A-F]{6}$/);
      }
    });

    it('is frozen', () => {
      expect(Object.isFrozen(PLAYER_COLORS)).toBe(true);
    });

    it('matches generatePlayerColor output', () => {
      expect(PLAYER_COLORS[0]).toBe(generatePlayerColor(0));
      expect(PLAYER_COLORS[99]).toBe(generatePlayerColor(99));
      expect(PLAYER_COLORS[199]).toBe(generatePlayerColor(199));
    });
  });
});
