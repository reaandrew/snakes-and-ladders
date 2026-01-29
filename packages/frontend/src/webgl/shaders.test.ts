import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  VERTEX_SHADER,
  FRAGMENT_SHADER,
  createShader,
  createProgram,
  initShaderProgram,
} from './shaders';

// Mock WebGL context
const createMockGLContext = () => {
  const shaders: Map<WebGLShader, { type: number; source: string }> = new Map();
  const programs: Map<WebGLProgram, { vertex: WebGLShader; fragment: WebGLShader }> = new Map();
  let shaderIdCounter = 1;
  let programIdCounter = 1;
  let compileSucceeds = true;
  let linkSucceeds = true;

  return {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,

    createShader: vi.fn((type: number) => {
      const shader = { id: shaderIdCounter++ } as unknown as WebGLShader;
      shaders.set(shader, { type, source: '' });
      return shader;
    }),

    shaderSource: vi.fn((shader: WebGLShader, source: string) => {
      const info = shaders.get(shader);
      if (info) {
        info.source = source;
      }
    }),

    compileShader: vi.fn(),

    getShaderParameter: vi.fn((_shader, pname: number) => {
      if (pname === 35713) {
        // COMPILE_STATUS
        return compileSucceeds;
      }
      return null;
    }),

    getShaderInfoLog: vi.fn(() => 'Shader compile error'),

    deleteShader: vi.fn((shader: WebGLShader) => {
      shaders.delete(shader);
    }),

    createProgram: vi.fn(() => {
      const program = { id: programIdCounter++ } as unknown as WebGLProgram;
      return program;
    }),

    attachShader: vi.fn((program: WebGLProgram, shader: WebGLShader) => {
      const existing = programs.get(program);
      const shaderInfo = shaders.get(shader);
      if (shaderInfo) {
        if (shaderInfo.type === 35633) {
          // VERTEX_SHADER
          programs.set(program, { ...existing, vertex: shader } as {
            vertex: WebGLShader;
            fragment: WebGLShader;
          });
        } else {
          programs.set(program, { ...existing, fragment: shader } as {
            vertex: WebGLShader;
            fragment: WebGLShader;
          });
        }
      }
    }),

    linkProgram: vi.fn(),

    getProgramParameter: vi.fn((_program: WebGLProgram, pname: number) => {
      if (pname === 35714) {
        // LINK_STATUS
        return linkSucceeds;
      }
      return null;
    }),

    getProgramInfoLog: vi.fn(() => 'Program link error'),

    deleteProgram: vi.fn((program: WebGLProgram) => {
      programs.delete(program);
    }),

    // Helper methods for testing
    setCompileSuccess: (success: boolean) => {
      compileSucceeds = success;
    },
    setLinkSuccess: (success: boolean) => {
      linkSucceeds = success;
    },
    getShaders: () => shaders,
    getPrograms: () => programs,
  };
};

describe('shaders', () => {
  describe('shader source constants', () => {
    it('exports VERTEX_SHADER source', () => {
      expect(VERTEX_SHADER).toBeDefined();
      expect(typeof VERTEX_SHADER).toBe('string');
      expect(VERTEX_SHADER).toContain('a_position');
      expect(VERTEX_SHADER).toContain('a_color');
      expect(VERTEX_SHADER).toContain('u_matrix');
      expect(VERTEX_SHADER).toContain('gl_Position');
    });

    it('exports FRAGMENT_SHADER source', () => {
      expect(FRAGMENT_SHADER).toBeDefined();
      expect(typeof FRAGMENT_SHADER).toBe('string');
      expect(FRAGMENT_SHADER).toContain('v_color');
      expect(FRAGMENT_SHADER).toContain('gl_FragColor');
    });

    it('VERTEX_SHADER contains attribute declarations', () => {
      expect(VERTEX_SHADER).toContain('attribute vec2 a_position');
      expect(VERTEX_SHADER).toContain('attribute vec4 a_color');
    });

    it('VERTEX_SHADER contains uniform declaration', () => {
      expect(VERTEX_SHADER).toContain('uniform mat3 u_matrix');
    });

    it('VERTEX_SHADER contains varying output', () => {
      expect(VERTEX_SHADER).toContain('varying vec4 v_color');
    });

    it('FRAGMENT_SHADER contains precision declaration', () => {
      expect(FRAGMENT_SHADER).toContain('precision mediump float');
    });

    it('FRAGMENT_SHADER contains varying input', () => {
      expect(FRAGMENT_SHADER).toContain('varying vec4 v_color');
    });
  });

  describe('createShader', () => {
    let gl: ReturnType<typeof createMockGLContext>;

    beforeEach(() => {
      gl = createMockGLContext();
    });

    it('creates a vertex shader', () => {
      const shader = createShader(
        gl as unknown as WebGLRenderingContext,
        gl.VERTEX_SHADER,
        VERTEX_SHADER
      );

      expect(shader).not.toBeNull();
      expect(gl.createShader).toHaveBeenCalledWith(gl.VERTEX_SHADER);
      expect(gl.shaderSource).toHaveBeenCalledWith(shader, VERTEX_SHADER);
      expect(gl.compileShader).toHaveBeenCalledWith(shader);
    });

    it('creates a fragment shader', () => {
      const shader = createShader(
        gl as unknown as WebGLRenderingContext,
        gl.FRAGMENT_SHADER,
        FRAGMENT_SHADER
      );

      expect(shader).not.toBeNull();
      expect(gl.createShader).toHaveBeenCalledWith(gl.FRAGMENT_SHADER);
      expect(gl.shaderSource).toHaveBeenCalledWith(shader, FRAGMENT_SHADER);
      expect(gl.compileShader).toHaveBeenCalledWith(shader);
    });

    it('returns null when createShader fails', () => {
      gl.createShader = vi.fn().mockReturnValue(null);

      const shader = createShader(
        gl as unknown as WebGLRenderingContext,
        gl.VERTEX_SHADER,
        VERTEX_SHADER
      );

      expect(shader).toBeNull();
    });

    it('returns null and logs error when compile fails', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      gl.setCompileSuccess(false);

      const shader = createShader(
        gl as unknown as WebGLRenderingContext,
        gl.VERTEX_SHADER,
        VERTEX_SHADER
      );

      expect(shader).toBeNull();
      expect(consoleError).toHaveBeenCalledWith('Shader compile error:', 'Shader compile error');
      expect(gl.deleteShader).toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it('checks compile status', () => {
      createShader(gl as unknown as WebGLRenderingContext, gl.VERTEX_SHADER, VERTEX_SHADER);

      expect(gl.getShaderParameter).toHaveBeenCalledWith(expect.anything(), gl.COMPILE_STATUS);
    });
  });

  describe('createProgram', () => {
    let gl: ReturnType<typeof createMockGLContext>;
    let vertexShader: WebGLShader;
    let fragmentShader: WebGLShader;

    beforeEach(() => {
      gl = createMockGLContext();
      vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
      fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    });

    it('creates a program and attaches shaders', () => {
      const program = createProgram(
        gl as unknown as WebGLRenderingContext,
        vertexShader,
        fragmentShader
      );

      expect(program).not.toBeNull();
      expect(gl.createProgram).toHaveBeenCalled();
      expect(gl.attachShader).toHaveBeenCalledWith(program, vertexShader);
      expect(gl.attachShader).toHaveBeenCalledWith(program, fragmentShader);
      expect(gl.linkProgram).toHaveBeenCalledWith(program);
    });

    it('returns null when createProgram fails', () => {
      gl.createProgram = vi.fn().mockReturnValue(null);

      const program = createProgram(
        gl as unknown as WebGLRenderingContext,
        vertexShader,
        fragmentShader
      );

      expect(program).toBeNull();
    });

    it('returns null and logs error when link fails', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      gl.setLinkSuccess(false);

      const program = createProgram(
        gl as unknown as WebGLRenderingContext,
        vertexShader,
        fragmentShader
      );

      expect(program).toBeNull();
      expect(consoleError).toHaveBeenCalledWith('Program link error:', 'Program link error');
      expect(gl.deleteProgram).toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it('checks link status', () => {
      createProgram(gl as unknown as WebGLRenderingContext, vertexShader, fragmentShader);

      expect(gl.getProgramParameter).toHaveBeenCalledWith(expect.anything(), gl.LINK_STATUS);
    });
  });

  describe('initShaderProgram', () => {
    let gl: ReturnType<typeof createMockGLContext>;

    beforeEach(() => {
      gl = createMockGLContext();
    });

    it('creates both shaders and links program', () => {
      const program = initShaderProgram(gl as unknown as WebGLRenderingContext);

      expect(program).not.toBeNull();
      expect(gl.createShader).toHaveBeenCalledTimes(2);
      expect(gl.createProgram).toHaveBeenCalledTimes(1);
    });

    it('returns null when vertex shader fails to compile', () => {
      let callCount = 0;
      gl.getShaderParameter = vi.fn(() => {
        callCount++;
        return callCount > 1; // First call (vertex shader) fails
      });

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const program = initShaderProgram(gl as unknown as WebGLRenderingContext);

      expect(program).toBeNull();

      consoleError.mockRestore();
    });

    it('returns null when fragment shader fails to compile', () => {
      let callCount = 0;
      gl.getShaderParameter = vi.fn(() => {
        callCount++;
        return callCount !== 2; // Second call (fragment shader) fails
      });

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const program = initShaderProgram(gl as unknown as WebGLRenderingContext);

      expect(program).toBeNull();

      consoleError.mockRestore();
    });

    it('returns null when program linking fails', () => {
      gl.setLinkSuccess(false);

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const program = initShaderProgram(gl as unknown as WebGLRenderingContext);

      expect(program).toBeNull();

      consoleError.mockRestore();
    });

    it('uses correct shader sources', () => {
      initShaderProgram(gl as unknown as WebGLRenderingContext);

      expect(gl.shaderSource).toHaveBeenCalledWith(expect.anything(), VERTEX_SHADER);
      expect(gl.shaderSource).toHaveBeenCalledWith(expect.anything(), FRAGMENT_SHADER);
    });
  });
});
