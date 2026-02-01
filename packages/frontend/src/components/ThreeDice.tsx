import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

export interface ThreeDiceProps {
  onRoll: () => void;
  disabled: boolean;
  lastRoll: number | null;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

// Face rotations to show each number (Euler angles in radians)
const faceRotations: Record<number, THREE.Euler> = {
  1: new THREE.Euler(0, 0, 0),
  2: new THREE.Euler(-Math.PI / 2, 0, 0),
  3: new THREE.Euler(0, Math.PI / 2, 0),
  4: new THREE.Euler(0, -Math.PI / 2, 0),
  5: new THREE.Euler(Math.PI / 2, 0, 0),
  6: new THREE.Euler(Math.PI, 0, 0),
};

// Create a canvas texture for a dice face
function createFaceTexture(value: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Rounded corners
  const radius = 16;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();

  // Draw dots
  ctx.fillStyle = '#1e293b'; // slate-800
  const dotRadius = size * 0.08;
  const margin = size * 0.25;
  const center = size / 2;

  const positions: Record<number, [number, number][]> = {
    1: [[center, center]],
    2: [
      [margin, margin],
      [size - margin, size - margin],
    ],
    3: [
      [margin, margin],
      [center, center],
      [size - margin, size - margin],
    ],
    4: [
      [margin, margin],
      [size - margin, margin],
      [margin, size - margin],
      [size - margin, size - margin],
    ],
    5: [
      [margin, margin],
      [size - margin, margin],
      [center, center],
      [margin, size - margin],
      [size - margin, size - margin],
    ],
    6: [
      [margin, margin],
      [size - margin, margin],
      [margin, center],
      [size - margin, center],
      [margin, size - margin],
      [size - margin, size - margin],
    ],
  };

  positions[value].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function ThreeDice({
  onRoll,
  disabled,
  lastRoll,
  size = 'md',
  animate = true,
}: ThreeDiceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    cube: THREE.Mesh;
    animationId: number | null;
  } | null>(null);

  const [isRolling, setIsRolling] = useState(false);
  const [displayValue, setDisplayValue] = useState<number>(1);
  const rollStartTimeRef = useRef<number>(0);
  const targetRotationRef = useRef<THREE.Euler>(faceRotations[1]);
  const spinVelocityRef = useRef({ x: 0, y: 0, z: 0 });

  const sizeMap = {
    sm: { width: 48, height: 48 },
    md: { width: 64, height: 64 },
    lg: { width: 96, height: 96 },
  };

  const { width, height } = sizeMap[size];

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = null; // Transparent background

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Create dice geometry with beveled edges
    const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);

    // Create materials for each face with textures
    const materials = [
      new THREE.MeshStandardMaterial({ map: createFaceTexture(3) }), // right
      new THREE.MeshStandardMaterial({ map: createFaceTexture(4) }), // left
      new THREE.MeshStandardMaterial({ map: createFaceTexture(2) }), // top
      new THREE.MeshStandardMaterial({ map: createFaceTexture(5) }), // bottom
      new THREE.MeshStandardMaterial({ map: createFaceTexture(1) }), // front
      new THREE.MeshStandardMaterial({ map: createFaceTexture(6) }), // back
    ];

    const cube = new THREE.Mesh(geometry, materials);
    scene.add(cube);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 2, 2);
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-1, -1, 1);
    scene.add(directionalLight2);

    // Initial render
    renderer.render(scene, camera);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      cube,
      animationId: null,
    };

    return () => {
      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      renderer.dispose();
      geometry.dispose();
      materials.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [width, height]);

  // Handle roll animation
  useEffect(() => {
    if (lastRoll !== null && lastRoll !== displayValue) {
      if (animate) {
        setIsRolling(true);
        rollStartTimeRef.current = performance.now();
        targetRotationRef.current = faceRotations[lastRoll];

        // Random spin velocity for realistic tumble
        spinVelocityRef.current = {
          x: (Math.random() - 0.5) * 20 + 10,
          y: (Math.random() - 0.5) * 20 + 10,
          z: (Math.random() - 0.5) * 10,
        };

        const animateDice = () => {
          if (!sceneRef.current) return;

          const elapsed = performance.now() - rollStartTimeRef.current;
          const duration = 800;
          const progress = Math.min(elapsed / duration, 1);

          // Easing function (ease out cubic)
          const eased = 1 - Math.pow(1 - progress, 3);

          // Apply spin with decay
          const decay = 1 - eased;
          const { cube, scene, camera, renderer } = sceneRef.current;

          if (progress < 1) {
            // During animation: spin with decay
            cube.rotation.x += spinVelocityRef.current.x * 0.016 * decay;
            cube.rotation.y += spinVelocityRef.current.y * 0.016 * decay;
            cube.rotation.z += spinVelocityRef.current.z * 0.016 * decay;
          } else {
            // Final position: snap to target
            cube.rotation.copy(targetRotationRef.current);
          }

          renderer.render(scene, camera);

          if (progress < 1) {
            sceneRef.current.animationId = requestAnimationFrame(animateDice);
          } else {
            setDisplayValue(lastRoll);
            setIsRolling(false);
            sceneRef.current.animationId = null;
          }
        };

        animateDice();
      } else {
        // Immediately show result without animation
        if (sceneRef.current) {
          const { cube, scene, camera, renderer } = sceneRef.current;
          cube.rotation.copy(faceRotations[lastRoll]);
          renderer.render(scene, camera);
        }
        setDisplayValue(lastRoll);
      }
    }
  }, [lastRoll, displayValue, animate]);

  // Re-render when displayValue changes (for initial state)
  useEffect(() => {
    if (sceneRef.current && !isRolling) {
      const { cube, scene, camera, renderer } = sceneRef.current;
      cube.rotation.copy(faceRotations[displayValue]);
      renderer.render(scene, camera);
    }
  }, [displayValue, isRolling]);

  const handleClick = useCallback(() => {
    if (!disabled && !isRolling) {
      onRoll();
    }
  }, [disabled, isRolling, onRoll]);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      handleClick();
    },
    [handleClick]
  );

  return (
    <button
      onClick={handleClick}
      onTouchEnd={handleTouchEnd}
      disabled={disabled}
      className={`
        relative touch-manipulation select-none rounded-lg
        transition-transform duration-200
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}
        ${isRolling ? '' : 'active:scale-95'}
      `}
      style={{ width, height }}
      aria-label="Roll dice"
    >
      <div ref={containerRef} className="h-full w-full" style={{ width, height }} />
    </button>
  );
}

export default ThreeDice;
