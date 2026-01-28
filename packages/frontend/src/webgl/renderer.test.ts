import { describe, it, expect } from 'vitest';

import { getCellPosition, hexToColor } from './renderer';

describe('renderer utilities', () => {
  describe('getCellPosition', () => {
    it('should return correct position for cell 1 (bottom-left)', () => {
      const pos = getCellPosition(1);
      expect(pos.row).toBe(0);
      expect(pos.col).toBe(0);
      expect(pos.x).toBe(25); // CELL_SIZE / 2
      expect(pos.y).toBe(25);
    });

    it('should return correct position for cell 10 (bottom-right)', () => {
      const pos = getCellPosition(10);
      expect(pos.row).toBe(0);
      expect(pos.col).toBe(9);
      expect(pos.x).toBe(475); // 9 * 50 + 25
      expect(pos.y).toBe(25);
    });

    it('should handle snake pattern (cell 11 is right side)', () => {
      const pos = getCellPosition(11);
      expect(pos.row).toBe(1);
      expect(pos.col).toBe(9); // Second row goes right to left
    });

    it('should return correct position for cell 20', () => {
      const pos = getCellPosition(20);
      expect(pos.row).toBe(1);
      expect(pos.col).toBe(0);
    });

    it('should return correct position for cell 100', () => {
      const pos = getCellPosition(100);
      expect(pos.row).toBe(9);
      expect(pos.col).toBe(0);
    });
  });

  describe('hexToColor', () => {
    it('should convert hex to RGBA', () => {
      const color = hexToColor('#FF0000');
      expect(color.r).toBe(1);
      expect(color.g).toBe(0);
      expect(color.b).toBe(0);
      expect(color.a).toBe(1);
    });

    it('should handle lowercase hex', () => {
      const color = hexToColor('#00ff00');
      expect(color.r).toBe(0);
      expect(color.g).toBe(1);
      expect(color.b).toBe(0);
    });

    it('should handle hex without hash', () => {
      const color = hexToColor('0000FF');
      expect(color.r).toBe(0);
      expect(color.g).toBe(0);
      expect(color.b).toBe(1);
    });

    it('should return white for invalid hex', () => {
      const color = hexToColor('invalid');
      expect(color.r).toBe(1);
      expect(color.g).toBe(1);
      expect(color.b).toBe(1);
    });

    it('should handle mixed colors', () => {
      const color = hexToColor('#808080');
      expect(color.r).toBeCloseTo(0.502, 2);
      expect(color.g).toBeCloseTo(0.502, 2);
      expect(color.b).toBeCloseTo(0.502, 2);
    });
  });
});
