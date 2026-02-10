import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import * as THREE from 'three';

interface FloatingEmojiProps {
  position: [number, number, number];
  emoji: string;
  speed: number;
  floatIntensity: number;
  size: number;
  rotationDir: number;
}

const FloatingEmoji = ({ position, emoji, speed, floatIntensity, size, rotationDir }: FloatingEmojiProps) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += 0.005 * speed * rotationDir;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * speed * 0.2) * 0.15;
    groupRef.current.position.z = position[2] + Math.sin(state.clock.elapsedTime * speed * 0.25) * 0.6;
  });

  return (
    <Float
      speed={speed * 0.7}
      rotationIntensity={0.2}
      floatIntensity={floatIntensity}
      floatingRange={[-0.4, 0.4]}
    >
      <group ref={groupRef} position={position}>
        <Html
          transform
          distanceFactor={8}
          style={{
            fontSize: `${size}px`,
            opacity: 0.3,
            filter: 'grayscale(40%)',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          <span>{emoji}</span>
        </Html>
      </group>
    </Float>
  );
};

const Scene = () => {
  const objects = useMemo<FloatingEmojiProps[]>(() => [
    { position: [-3.5, 1.5, -2], emoji: '💰', speed: 1.2, floatIntensity: 1.5, size: 48, rotationDir: 1 },
    { position: [3.8, -0.5, -3], emoji: '⚙️', speed: 0.8, floatIntensity: 1.2, size: 44, rotationDir: -1 },
    { position: [-2.5, -1.8, -2.5], emoji: '📱', speed: 1.0, floatIntensity: 1.0, size: 42, rotationDir: 1 },
    { position: [2.5, 2.0, -3.5], emoji: '🔫', speed: 0.9, floatIntensity: 1.8, size: 40, rotationDir: -1 },
    { position: [-4.2, -0.5, -4], emoji: '🛡️', speed: 0.7, floatIntensity: 1.3, size: 46, rotationDir: 1 },
    { position: [4.5, 1.0, -2.5], emoji: '⚡', speed: 1.1, floatIntensity: 1.1, size: 44, rotationDir: -1 },
    { position: [0.5, -2.5, -3], emoji: '💵', speed: 0.6, floatIntensity: 1.4, size: 38, rotationDir: 1 },
    { position: [-1.5, 2.5, -4], emoji: '🔑', speed: 0.85, floatIntensity: 0.9, size: 36, rotationDir: -1 },
    { position: [1.5, -1.0, -1.5], emoji: '💎', speed: 1.3, floatIntensity: 1.6, size: 40, rotationDir: 1 },
    { position: [-0.5, 0.8, -5], emoji: '🖥️', speed: 0.5, floatIntensity: 1.0, size: 42, rotationDir: -1 },
    { position: [1.0, 2.8, -3], emoji: '🏦', speed: 0.75, floatIntensity: 1.2, size: 38, rotationDir: 1 },
    { position: [-3.0, 0.0, -3.5], emoji: '📦', speed: 0.95, floatIntensity: 1.5, size: 40, rotationDir: -1 },
  ], []);

  return (
    <>
      {objects.map((obj, i) => (
        <FloatingEmoji key={i} {...obj} />
      ))}
    </>
  );
};

const FloatingObjects3D = () => {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};

export default FloatingObjects3D;
