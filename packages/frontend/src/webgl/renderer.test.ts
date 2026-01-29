import type { BoardConfig } from '@snakes-and-ladders/shared';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  getCellPosition,
  hexToColor,
  createRenderer,
  destroyRenderer,
  render,
  startRenderLoop,
  updatePlayers,
  focusOnPlayer,
} from './renderer';

// Mock WebGL context
const createMockGLContext = () => {
  return {
    canvas: { width: 500, height: 500 },
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    TRIANGLES: 4,
    COLOR_BUFFER_BIT: 16384,

    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    deleteProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    deleteBuffer: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn(() => ({})),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    useProgram: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    drawArrays: vi.fn(),
  };
};

const mockBoardConfig: BoardConfig = {
  size: 100,
  snakesAndLadders: [
    { start: 2, end: 38, type: 'ladder' },
    { start: 16, end: 6, type: 'snake' },
  ],
};

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

    it('should return correct x coordinate for middle cells', () => {
      const pos = getCellPosition(5);
      expect(pos.x).toBe(225); // 4 * 50 + 25
    });

    it('should return correct y coordinate for higher rows', () => {
      const pos = getCellPosition(91);
      expect(pos.row).toBe(9);
      expect(pos.y).toBe(475); // 9 * 50 + 25
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

    it('should return white for empty string', () => {
      const color = hexToColor('');
      expect(color.r).toBe(1);
      expect(color.g).toBe(1);
      expect(color.b).toBe(1);
    });

    it('should handle short hex format', () => {
      const color = hexToColor('#FFF');
      // Short format not supported, should return white
      expect(color.r).toBe(1);
      expect(color.g).toBe(1);
      expect(color.b).toBe(1);
    });
  });
});

describe('renderer', () => {
  let mockGl: ReturnType<typeof createMockGLContext>;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockGl = createMockGLContext();
    mockCanvas = {
      getContext: vi.fn(() => mockGl),
      width: 500,
      height: 500,
    } as unknown as HTMLCanvasElement;
  });

  describe('createRenderer', () => {
    it('creates renderer state when WebGL is supported', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig);

      expect(state).not.toBeNull();
      expect(state?.gl).toBe(mockGl);
      expect(state?.boardConfig).toBe(mockBoardConfig);
      expect(state?.players).toEqual([]);
    });

    it('returns null when WebGL is not supported', () => {
      mockCanvas.getContext = vi.fn(() => null);
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const state = createRenderer(mockCanvas, mockBoardConfig);

      expect(state).toBeNull();
      expect(consoleError).toHaveBeenCalledWith('WebGL not supported');

      consoleError.mockRestore();
    });

    it('returns null when shader program fails', () => {
      mockGl.createShader = vi.fn().mockReturnValue(null) as typeof mockGl.createShader;
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const state = createRenderer(mockCanvas, mockBoardConfig);

      expect(state).toBeNull();

      consoleError.mockRestore();
    });

    it('returns null when buffer creation fails', () => {
      mockGl.createBuffer = vi.fn().mockReturnValue(null) as typeof mockGl.createBuffer;
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const state = createRenderer(mockCanvas, mockBoardConfig);

      expect(state).toBeNull();
      expect(consoleError).toHaveBeenCalledWith('Failed to create buffers');

      consoleError.mockRestore();
    });

    it('returns null when uniform location is not found', () => {
      mockGl.getUniformLocation = vi.fn().mockReturnValue(null) as typeof mockGl.getUniformLocation;
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const state = createRenderer(mockCanvas, mockBoardConfig);

      expect(state).toBeNull();
      expect(consoleError).toHaveBeenCalledWith('Failed to get uniform location');

      consoleError.mockRestore();
    });

    it('initializes camera state', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig);

      expect(state?.camera).toBeDefined();
      expect(state?.camera.x).toBe(250);
      expect(state?.camera.y).toBe(250);
      expect(state?.camera.zoom).toBe(1);
    });
  });

  describe('destroyRenderer', () => {
    it('cancels animation frame', () => {
      const cancelAnimationFrame = vi
        .spyOn(global, 'cancelAnimationFrame')
        .mockImplementation(() => {});

      const state = createRenderer(mockCanvas, mockBoardConfig)!;
      state.animationFrame = 123;

      destroyRenderer(state);

      expect(cancelAnimationFrame).toHaveBeenCalledWith(123);

      cancelAnimationFrame.mockRestore();
    });

    it('deletes WebGL resources', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig)!;

      destroyRenderer(state);

      expect(mockGl.deleteBuffer).toHaveBeenCalledWith(state.positionBuffer);
      expect(mockGl.deleteBuffer).toHaveBeenCalledWith(state.colorBuffer);
      expect(mockGl.deleteProgram).toHaveBeenCalledWith(state.program);
    });

    it('handles null animation frame', () => {
      const cancelAnimationFrame = vi
        .spyOn(global, 'cancelAnimationFrame')
        .mockImplementation(() => {});

      const state = createRenderer(mockCanvas, mockBoardConfig)!;
      state.animationFrame = null;

      // Should not throw
      expect(() => destroyRenderer(state)).not.toThrow();

      expect(cancelAnimationFrame).not.toHaveBeenCalled();

      cancelAnimationFrame.mockRestore();
    });
  });

  describe('render', () => {
    it('clears the canvas', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig)!;

      render(state);

      expect(mockGl.viewport).toHaveBeenCalled();
      expect(mockGl.clearColor).toHaveBeenCalled();
      expect(mockGl.clear).toHaveBeenCalledWith(mockGl.COLOR_BUFFER_BIT);
    });

    it('uses the shader program', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig)!;

      render(state);

      expect(mockGl.useProgram).toHaveBeenCalledWith(state.program);
    });

    it('draws triangles', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig)!;

      render(state);

      expect(mockGl.drawArrays).toHaveBeenCalledWith(mockGl.TRIANGLES, 0, expect.any(Number));
    });

    it('renders players on the board', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig)!;
      state.players = [
        {
          id: 'player-1',
          position: 10,
          color: { r: 1, g: 0, b: 0, a: 1 },
          animating: false,
          animationProgress: 0,
          startPosition: 10,
          targetPosition: 10,
        },
      ];

      render(state);

      expect(mockGl.drawArrays).toHaveBeenCalled();
    });

    it('handles animating players', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig)!;
      state.players = [
        {
          id: 'player-1',
          position: 5,
          color: { r: 1, g: 0, b: 0, a: 1 },
          animating: true,
          animationProgress: 0.5,
          startPosition: 5,
          targetPosition: 10,
        },
      ];

      // Should not throw
      expect(() => render(state)).not.toThrow();
    });

    it('skips players at position 0', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig)!;
      state.players = [
        {
          id: 'player-1',
          position: 0,
          color: { r: 1, g: 0, b: 0, a: 1 },
          animating: false,
          animationProgress: 0,
          startPosition: 0,
          targetPosition: 0,
        },
      ];

      // Should not throw
      expect(() => render(state)).not.toThrow();
    });
  });

  describe('startRenderLoop', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('starts animation frame loop', () => {
      const requestAnimationFrame = vi
        .spyOn(global, 'requestAnimationFrame')
        .mockImplementation((_cb) => {
          return 1;
        });

      const state = createRenderer(mockCanvas, mockBoardConfig)!;

      startRenderLoop(state);

      expect(requestAnimationFrame).toHaveBeenCalled();

      requestAnimationFrame.mockRestore();
    });

    it('updates lastTime', () => {
      let callback: FrameRequestCallback | undefined;
      const requestAnimationFrame = vi
        .spyOn(global, 'requestAnimationFrame')
        .mockImplementation((cb) => {
          callback = cb;
          return 1;
        });

      const state = createRenderer(mockCanvas, mockBoardConfig)!;
      state.lastTime = 0;

      startRenderLoop(state);

      expect(callback).toBeDefined();
      callback!(1000);

      expect(state.lastTime).toBe(1000);

      requestAnimationFrame.mockRestore();
    });
  });

  describe('updatePlayers', () => {
    it('adds new players', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig)!;

      updatePlayers(state, [{ id: 'player-1', position: 5, color: '#FF0000' }]);

      expect(state.players).toHaveLength(1);
      expect(state.players[0].id).toBe('player-1');
      expect(state.players[0].position).toBe(5);
    });

    it('starts animation when position changes', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig)!;
      state.players = [
        {
          id: 'player-1',
          position: 5,
          color: { r: 1, g: 0, b: 0, a: 1 },
          animating: false,
          animationProgress: 0,
          startPosition: 5,
          targetPosition: 5,
        },
      ];

      updatePlayers(state, [{ id: 'player-1', position: 10, color: '#FF0000' }]);

      expect(state.players[0].animating).toBe(true);
      expect(state.players[0].startPosition).toBe(5);
      expect(state.players[0].targetPosition).toBe(10);
    });

    it('preserves existing player during animation', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig)!;
      state.players = [
        {
          id: 'player-1',
          position: 5,
          color: { r: 1, g: 0, b: 0, a: 1 },
          animating: true,
          animationProgress: 0.5,
          startPosition: 1,
          targetPosition: 5,
        },
      ];

      updatePlayers(state, [{ id: 'player-1', position: 10, color: '#FF0000' }]);

      // Should keep existing state during animation
      expect(state.players[0].animating).toBe(true);
      expect(state.players[0].animationProgress).toBe(0.5);
    });

    it('converts hex color to Color object', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig)!;

      updatePlayers(state, [{ id: 'player-1', position: 5, color: '#00FF00' }]);

      expect(state.players[0].color.r).toBe(0);
      expect(state.players[0].color.g).toBe(1);
      expect(state.players[0].color.b).toBe(0);
    });

    it('handles multiple players', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig)!;

      updatePlayers(state, [
        { id: 'player-1', position: 5, color: '#FF0000' },
        { id: 'player-2', position: 10, color: '#00FF00' },
      ]);

      expect(state.players).toHaveLength(2);
    });
  });

  describe('focusOnPlayer', () => {
    it('updates camera target to player position', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig)!;
      state.players = [
        {
          id: 'player-1',
          position: 50,
          color: { r: 1, g: 0, b: 0, a: 1 },
          animating: false,
          animationProgress: 0,
          startPosition: 50,
          targetPosition: 50,
        },
      ];

      focusOnPlayer(state, 'player-1');

      expect(state.camera.targetZoom).toBe(1.5);
    });

    it('does nothing for non-existent player', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig)!;
      const originalCamera = { ...state.camera };

      focusOnPlayer(state, 'non-existent');

      expect(state.camera.targetX).toBe(originalCamera.targetX);
      expect(state.camera.targetY).toBe(originalCamera.targetY);
    });

    it('does nothing for player at position 0', () => {
      const state = createRenderer(mockCanvas, mockBoardConfig)!;
      state.players = [
        {
          id: 'player-1',
          position: 0,
          color: { r: 1, g: 0, b: 0, a: 1 },
          animating: false,
          animationProgress: 0,
          startPosition: 0,
          targetPosition: 0,
        },
      ];
      const originalCamera = { ...state.camera };

      focusOnPlayer(state, 'player-1');

      expect(state.camera.targetX).toBe(originalCamera.targetX);
      expect(state.camera.targetY).toBe(originalCamera.targetY);
    });
  });
});
