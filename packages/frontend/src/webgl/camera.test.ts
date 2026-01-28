import { describe, it, expect } from 'vitest';

import {
  createCamera,
  updateCamera,
  focusOnPosition,
  resetCameraView,
  createViewMatrix,
} from './camera';

describe('camera', () => {
  describe('createCamera', () => {
    it('should create camera with default position', () => {
      const camera = createCamera();
      expect(camera.x).toBe(250);
      expect(camera.y).toBe(250);
      expect(camera.zoom).toBe(1);
    });

    it('should have target equal to current position', () => {
      const camera = createCamera();
      expect(camera.targetX).toBe(camera.x);
      expect(camera.targetY).toBe(camera.y);
      expect(camera.targetZoom).toBe(camera.zoom);
    });
  });

  describe('updateCamera', () => {
    it('should move camera towards target', () => {
      const camera = {
        x: 0,
        y: 0,
        zoom: 1,
        targetX: 100,
        targetY: 100,
        targetZoom: 2,
      };

      const updated = updateCamera(camera, 0.1);

      expect(updated.x).toBeGreaterThan(0);
      expect(updated.x).toBeLessThan(100);
      expect(updated.y).toBeGreaterThan(0);
      expect(updated.y).toBeLessThan(100);
      expect(updated.zoom).toBeGreaterThan(1);
      expect(updated.zoom).toBeLessThan(2);
    });

    it('should preserve target values', () => {
      const camera = {
        x: 0,
        y: 0,
        zoom: 1,
        targetX: 100,
        targetY: 100,
        targetZoom: 2,
      };

      const updated = updateCamera(camera, 0.1);

      expect(updated.targetX).toBe(100);
      expect(updated.targetY).toBe(100);
      expect(updated.targetZoom).toBe(2);
    });
  });

  describe('focusOnPosition', () => {
    it('should set target to position', () => {
      const camera = createCamera();
      const position = { row: 5, col: 5, x: 275, y: 275 };

      const focused = focusOnPosition(camera, position);

      expect(focused.targetX).toBe(275);
      expect(focused.targetY).toBe(275);
    });

    it('should zoom in when focusing', () => {
      const camera = createCamera();
      const position = { row: 5, col: 5, x: 275, y: 275 };

      const focused = focusOnPosition(camera, position);

      expect(focused.targetZoom).toBe(1.5);
    });
  });

  describe('resetCameraView', () => {
    it('should reset target to default', () => {
      const camera = {
        x: 100,
        y: 100,
        zoom: 2,
        targetX: 100,
        targetY: 100,
        targetZoom: 2,
      };

      const reset = resetCameraView(camera);

      expect(reset.targetX).toBe(250);
      expect(reset.targetY).toBe(250);
      expect(reset.targetZoom).toBe(1);
    });
  });

  describe('createViewMatrix', () => {
    it('should create a 9-element matrix', () => {
      const camera = createCamera();
      const matrix = createViewMatrix(camera, 500, 500);

      expect(matrix).toHaveLength(9);
    });

    it('should scale based on canvas size', () => {
      const camera = createCamera();
      const matrix1 = createViewMatrix(camera, 500, 500);
      const matrix2 = createViewMatrix(camera, 1000, 1000);

      // Larger canvas should have smaller scale
      expect(matrix2[0]).toBeLessThan(matrix1[0]);
    });
  });
});
