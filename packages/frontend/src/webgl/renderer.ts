import type { BoardConfig } from '@snakes-and-ladders/shared';

import { createCamera, updateCamera, focusOnPosition, createViewMatrix } from './camera';
import { initShaderProgram } from './shaders';
import type { CameraState, Color, CellPosition, PlayerRenderState } from './types';

export interface RendererState {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  colorBuffer: WebGLBuffer;
  positionLocation: number;
  colorLocation: number;
  matrixLocation: WebGLUniformLocation;
  camera: CameraState;
  boardConfig: BoardConfig;
  players: PlayerRenderState[];
  animationFrame: number | null;
  lastTime: number;
}

const BOARD_SIZE = 10;
const CELL_SIZE = 50;

export function createRenderer(
  canvas: HTMLCanvasElement,
  boardConfig: BoardConfig
): RendererState | null {
  const gl = canvas.getContext('webgl', { antialias: true });
  if (!gl) {
    console.error('WebGL not supported');
    return null;
  }

  const program = initShaderProgram(gl);
  if (!program) {
    console.error('Failed to create shader program');
    return null;
  }

  const positionBuffer = gl.createBuffer();
  const colorBuffer = gl.createBuffer();
  if (!positionBuffer || !colorBuffer) {
    console.error('Failed to create buffers');
    return null;
  }

  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const colorLocation = gl.getAttribLocation(program, 'a_color');
  const matrixLocation = gl.getUniformLocation(program, 'u_matrix');

  if (!matrixLocation) {
    console.error('Failed to get uniform location');
    return null;
  }

  return {
    gl,
    program,
    positionBuffer,
    colorBuffer,
    positionLocation,
    colorLocation,
    matrixLocation,
    camera: createCamera(),
    boardConfig,
    players: [],
    animationFrame: null,
    lastTime: 0,
  };
}

export function destroyRenderer(state: RendererState): void {
  if (state.animationFrame !== null) {
    cancelAnimationFrame(state.animationFrame);
  }
  state.gl.deleteBuffer(state.positionBuffer);
  state.gl.deleteBuffer(state.colorBuffer);
  state.gl.deleteProgram(state.program);
}

export function getCellPosition(cellNumber: number): CellPosition {
  const zeroIndexed = cellNumber - 1;
  const row = Math.floor(zeroIndexed / BOARD_SIZE);
  const col =
    row % 2 === 0 ? zeroIndexed % BOARD_SIZE : BOARD_SIZE - 1 - (zeroIndexed % BOARD_SIZE);

  return {
    row,
    col,
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2,
  };
}

export function hexToColor(hex: string): Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 1, g: 1, b: 1, a: 1 };
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
    a: 1,
  };
}

function drawQuad(
  positions: number[],
  colors: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  color: Color
): void {
  const x1 = x;
  const x2 = x + width;
  const y1 = y;
  const y2 = y + height;

  positions.push(x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2);

  for (let i = 0; i < 6; i++) {
    colors.push(color.r, color.g, color.b, color.a);
  }
}

function drawCircle(
  positions: number[],
  colors: number[],
  cx: number,
  cy: number,
  radius: number,
  color: Color,
  segments: number = 24
): void {
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;

    positions.push(
      cx,
      cy,
      cx + Math.cos(angle1) * radius,
      cy + Math.sin(angle1) * radius,
      cx + Math.cos(angle2) * radius,
      cy + Math.sin(angle2) * radius
    );

    for (let j = 0; j < 3; j++) {
      colors.push(color.r, color.g, color.b, color.a);
    }
  }
}

function drawLine(
  positions: number[],
  colors: number[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  color: Color
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = (-dy / len) * (width / 2);
  const ny = (dx / len) * (width / 2);

  positions.push(
    x1 + nx,
    y1 + ny,
    x1 - nx,
    y1 - ny,
    x2 + nx,
    y2 + ny,
    x2 + nx,
    y2 + ny,
    x1 - nx,
    y1 - ny,
    x2 - nx,
    y2 - ny
  );

  for (let i = 0; i < 6; i++) {
    colors.push(color.r, color.g, color.b, color.a);
  }
}

export function render(state: RendererState): void {
  const {
    gl,
    program,
    positionBuffer,
    colorBuffer,
    positionLocation,
    colorLocation,
    matrixLocation,
    camera,
    boardConfig,
    players,
  } = state;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.1, 0.1, 0.15, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);

  const positions: number[] = [];
  const colors: number[] = [];

  // Draw board cells
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const isLight = (row + col) % 2 === 0;
      const color = isLight
        ? { r: 0.22, g: 0.25, b: 0.32, a: 1 }
        : { r: 0.29, g: 0.33, b: 0.42, a: 1 };

      drawQuad(positions, colors, col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE, color);
    }
  }

  // Draw snakes and ladders
  for (const item of boardConfig.snakesAndLadders) {
    const startPos = getCellPosition(item.start);
    const endPos = getCellPosition(item.end);

    const itemColor =
      item.type === 'ladder'
        ? { r: 0.13, g: 0.77, b: 0.37, a: 0.8 }
        : { r: 0.94, g: 0.27, b: 0.27, a: 0.8 };

    drawLine(
      positions,
      colors,
      startPos.x,
      startPos.y,
      endPos.x,
      endPos.y,
      item.type === 'ladder' ? 8 : 6,
      itemColor
    );

    // Draw markers at endpoints
    drawCircle(positions, colors, startPos.x, startPos.y, 6, itemColor);
    drawCircle(positions, colors, endPos.x, endPos.y, 6, itemColor);
  }

  // Draw players
  players.forEach((player, index) => {
    if (player.position > 0) {
      let pos: CellPosition;

      if (player.animating) {
        const startPos = getCellPosition(player.startPosition);
        const endPos = getCellPosition(player.targetPosition);
        const t = player.animationProgress;

        pos = {
          row: 0,
          col: 0,
          x: startPos.x + (endPos.x - startPos.x) * t,
          y: startPos.y + (endPos.y - startPos.y) * t,
        };
      } else {
        pos = getCellPosition(player.position);
      }

      // Offset for multiple players on same cell
      const offsetX = (index % 2) * 15 - 7;
      const offsetY = Math.floor(index / 2) * 15 - 7;

      // Player shadow
      drawCircle(positions, colors, pos.x + offsetX + 2, pos.y + offsetY + 2, 14, {
        r: 0,
        g: 0,
        b: 0,
        a: 0.3,
      });

      // Player token
      drawCircle(positions, colors, pos.x + offsetX, pos.y + offsetY, 12, player.color);

      // Player highlight
      drawCircle(positions, colors, pos.x + offsetX - 3, pos.y + offsetY - 3, 4, {
        r: 1,
        g: 1,
        b: 1,
        a: 0.3,
      });
    }
  });

  // Upload and draw
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(colorLocation);
  gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);

  const matrix = createViewMatrix(camera, gl.canvas.width, gl.canvas.height);
  gl.uniformMatrix3fv(matrixLocation, false, matrix);

  gl.drawArrays(gl.TRIANGLES, 0, positions.length / 2);
}

export function startRenderLoop(state: RendererState): void {
  const loop = (time: number) => {
    const deltaTime = state.lastTime ? (time - state.lastTime) / 1000 : 0;
    state.lastTime = time;

    // Update camera
    state.camera = updateCamera(state.camera, deltaTime);

    // Update player animations
    state.players = state.players.map((player) => {
      if (player.animating) {
        const newProgress = Math.min(player.animationProgress + deltaTime * 2, 1);
        if (newProgress >= 1) {
          return {
            ...player,
            position: player.targetPosition,
            animating: false,
            animationProgress: 0,
          };
        }
        return { ...player, animationProgress: newProgress };
      }
      return player;
    });

    render(state);
    state.animationFrame = requestAnimationFrame(loop);
  };

  state.animationFrame = requestAnimationFrame(loop);
}

export function updatePlayers(
  state: RendererState,
  players: Array<{ id: string; position: number; color: string }>
): void {
  const newPlayers: PlayerRenderState[] = players.map((p) => {
    const existing = state.players.find((ep) => ep.id === p.id);
    const color = hexToColor(p.color);

    if (existing && existing.position !== p.position && !existing.animating) {
      return {
        id: p.id,
        position: existing.position,
        color,
        animating: true,
        animationProgress: 0,
        startPosition: existing.position,
        targetPosition: p.position,
      };
    }

    return (
      existing || {
        id: p.id,
        position: p.position,
        color,
        animating: false,
        animationProgress: 0,
        startPosition: p.position,
        targetPosition: p.position,
      }
    );
  });

  state.players = newPlayers;
}

export function focusOnPlayer(state: RendererState, playerId: string): void {
  const player = state.players.find((p) => p.id === playerId);
  if (player && player.position > 0) {
    const pos = getCellPosition(player.position);
    state.camera = focusOnPosition(state.camera, pos);
  }
}
