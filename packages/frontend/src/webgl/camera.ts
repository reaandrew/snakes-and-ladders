import type { CameraState, CellPosition } from './types';

export function createCamera(): CameraState {
  return {
    x: 250,
    y: 250,
    zoom: 1,
    targetX: 250,
    targetY: 250,
    targetZoom: 1,
  };
}

export function updateCamera(camera: CameraState, deltaTime: number): CameraState {
  const smoothing = 1 - Math.pow(0.001, deltaTime);

  return {
    ...camera,
    x: camera.x + (camera.targetX - camera.x) * smoothing,
    y: camera.y + (camera.targetY - camera.y) * smoothing,
    zoom: camera.zoom + (camera.targetZoom - camera.zoom) * smoothing,
  };
}

export function focusOnPosition(camera: CameraState, position: CellPosition): CameraState {
  return {
    ...camera,
    targetX: position.x,
    targetY: position.y,
    targetZoom: 1.5,
  };
}

export function resetCameraView(camera: CameraState): CameraState {
  return {
    ...camera,
    targetX: 250,
    targetY: 250,
    targetZoom: 1,
  };
}

export function createViewMatrix(
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
): number[] {
  const scaleX = (2 * camera.zoom) / canvasWidth;
  const scaleY = (2 * camera.zoom) / canvasHeight;

  const translateX = -camera.x * scaleX;
  const translateY = -camera.y * scaleY;

  // Column-major 3x3 matrix for 2D transformation
  return [
    scaleX,
    0,
    0,
    0,
    -scaleY,
    0, // Flip Y axis
    translateX,
    translateY + 1,
    1, // Adjust for flipped Y
  ];
}
