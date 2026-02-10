import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

interface FloatingItemProps {
  position: [number, number, number];
  rotation: [number, number, number];
  geometry: 'dollar' | 'gear' | 'phone' | 'diamond' | 'cube' | 'ring';
  speed: number;
  floatIntensity: number;
}

const FloatingItem = ({ position, rotation, geometry, speed, floatIntensity }: FloatingItemProps) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += 0.002 * speed;
    meshRef.current.rotation.y += 0.003 * speed;
    // Subtle drift backward (z)
    const t = state.clock.elapsedTime;
    meshRef.current.position.z = position[2] + Math.sin(t * speed * 0.3) * 0.5;
  });

  const renderGeometry = () => {
    switch (geometry) {
      case 'dollar':
        // Torus = coin/money
        return <torusGeometry args={[0.4, 0.15, 16, 32]} />;
      case 'gear':
        // Cog/gear shape approximated with torus knot
        return <torusKnotGeometry args={[0.3, 0.1, 64, 8, 2, 3]} />;
      case 'phone':
        // Phone = rounded box
        return <boxGeometry args={[0.3, 0.55, 0.05]} />;
      case 'diamond':
        // Diamond
        return <octahedronGeometry args={[0.35, 0]} />;
      case 'cube':
        // Package / box
        return <boxGeometry args={[0.4, 0.4, 0.4]} />;
      case 'ring':
        // Ring shape
        return <torusGeometry args={[0.3, 0.08, 16, 32]} />;
      default:
        return <sphereGeometry args={[0.3, 16, 16]} />;
    }
  };

  return (
    <Float
      speed={speed * 0.8}
      rotationIntensity={0.3}
      floatIntensity={floatIntensity}
      floatingRange={[-0.3, 0.3]}
    >
      <mesh ref={meshRef} position={position} rotation={rotation}>
        {renderGeometry()}
        <meshStandardMaterial
          color="#888888"
          transparent
          opacity={0.12}
          roughness={0.6}
          metalness={0.4}
          wireframe={false}
        />
      </mesh>
    </Float>
  );
};

const Scene = () => {
  const objects = useMemo<FloatingItemProps[]>(() => [
    { position: [-3.5, 1.5, -2], rotation: [0.5, 0.3, 0], geometry: 'dollar', speed: 1.2, floatIntensity: 1.5 },
    { position: [3.8, -0.5, -3], rotation: [0.2, 0.8, 0.4], geometry: 'gear', speed: 0.8, floatIntensity: 1.2 },
    { position: [-2.5, -1.8, -2.5], rotation: [0.1, 0.5, 0.2], geometry: 'phone', speed: 1.0, floatIntensity: 1.0 },
    { position: [2.5, 2.0, -3.5], rotation: [0.7, 0.2, 0.5], geometry: 'diamond', speed: 0.9, floatIntensity: 1.8 },
    { position: [-4.0, -0.5, -4], rotation: [0.3, 0.6, 0.1], geometry: 'cube', speed: 0.7, floatIntensity: 1.3 },
    { position: [4.5, 1.0, -2.5], rotation: [0.4, 0.1, 0.7], geometry: 'ring', speed: 1.1, floatIntensity: 1.1 },
    { position: [0.5, -2.5, -3], rotation: [0.6, 0.4, 0.3], geometry: 'dollar', speed: 0.6, floatIntensity: 1.4 },
    { position: [-1.5, 2.5, -4], rotation: [0.2, 0.7, 0.5], geometry: 'gear', speed: 0.85, floatIntensity: 0.9 },
    { position: [1.5, -1.0, -1.5], rotation: [0.8, 0.3, 0.2], geometry: 'diamond', speed: 1.3, floatIntensity: 1.6 },
    { position: [-0.5, 0.5, -5], rotation: [0.1, 0.9, 0.4], geometry: 'cube', speed: 0.5, floatIntensity: 1.0 },
  ], []);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.4} />
      {objects.map((obj, i) => (
        <FloatingItem key={i} {...obj} />
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
