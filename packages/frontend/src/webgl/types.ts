export interface Vector2 {
  x: number;
  y: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface CellPosition {
  row: number;
  col: number;
  x: number;
  y: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
}

export interface RenderState {
  players: PlayerRenderState[];
  snakesAndLadders: SnakeLadderRenderState[];
  focusedPlayerId: string | null;
}

export interface PlayerRenderState {
  id: string;
  position: number;
  color: Color;
  animating: boolean;
  animationProgress: number;
  startPosition: number;
  targetPosition: number;
}

export interface SnakeLadderRenderState {
  start: number;
  end: number;
  type: 'snake' | 'ladder';
}
