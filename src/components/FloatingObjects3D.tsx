import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

type GeoType = 'money' | 'gun' | 'gear' | 'phone' | 'shield' | 'lightning';

interface FloatingItemProps {
  position: [number, number, number];
  rotation: [number, number, number];
  geometry: GeoType;
  speed: number;
  floatIntensity: number;
  scale?: number;
}

// Dollar sign shape
const createDollarShape = () => {
  const shape = new THREE.Shape();
  // Coin circle
  const r = 0.4;
  shape.absarc(0, 0, r, 0, Math.PI * 2, false);
  return shape;
};

// Gun silhouette shape
const createGunShape = () => {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0.1);
  shape.lineTo(0.5, 0.1);
  shape.lineTo(0.5, -0.02);
  shape.lineTo(0.15, -0.02);
  shape.lineTo(0.1, -0.35);
  shape.lineTo(-0.05, -0.35);
  shape.lineTo(0.0, -0.02);
  shape.lineTo(-0.5, -0.02);
  shape.lineTo(-0.5, 0.1);
  return shape;
};

// Phone shape
const createPhoneShape = () => {
  const shape = new THREE.Shape();
  const w = 0.22, h = 0.4, r = 0.04;
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  return shape;
};

// Shield shape
const createShieldShape = () => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.45);
  shape.quadraticCurveTo(0.35, 0.35, 0.35, 0.1);
  shape.lineTo(0.35, -0.1);
  shape.quadraticCurveTo(0.3, -0.35, 0, -0.45);
  shape.quadraticCurveTo(-0.3, -0.35, -0.35, -0.1);
  shape.lineTo(-0.35, 0.1);
  shape.quadraticCurveTo(-0.35, 0.35, 0, 0.45);
  return shape;
};

// Lightning bolt shape
const createLightningShape = () => {
  const shape = new THREE.Shape();
  shape.moveTo(0.05, 0.5);
  shape.lineTo(0.25, 0.5);
  shape.lineTo(0.0, 0.0);
  shape.lineTo(0.2, 0.0);
  shape.lineTo(-0.1, -0.5);
  shape.lineTo(-0.05, -0.05);
  shape.lineTo(-0.2, -0.05);
  shape.lineTo(0.05, 0.5);
  return shape;
};

const extrudeSettings: THREE.ExtrudeGeometryOptions = {
  depth: 0.08,
  bevelEnabled: true,
  bevelThickness: 0.02,
  bevelSize: 0.02,
  bevelSegments: 3,
};

const FloatingItem = ({ position, rotation, geometry, speed, floatIntensity, scale = 1 }: FloatingItemProps) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += 0.003 * speed;
    meshRef.current.rotation.y += 0.004 * speed;
    const t = state.clock.elapsedTime;
    meshRef.current.position.z = position[2] + Math.sin(t * speed * 0.3) * 0.5;
  });

  const geo = useMemo(() => {
    switch (geometry) {
      case 'money':
        return new THREE.ExtrudeGeometry(createDollarShape(), { ...extrudeSettings, depth: 0.05 });
      case 'gun':
        return new THREE.ExtrudeGeometry(createGunShape(), extrudeSettings);
      case 'phone':
        return new THREE.ExtrudeGeometry(createPhoneShape(), { ...extrudeSettings, depth: 0.04 });
      case 'shield':
        return new THREE.ExtrudeGeometry(createShieldShape(), extrudeSettings);
      case 'lightning':
        return new THREE.ExtrudeGeometry(createLightningShape(), extrudeSettings);
      case 'gear':
        return new THREE.TorusKnotGeometry(0.25, 0.08, 64, 8, 2, 3);
      default:
        return new THREE.SphereGeometry(0.3, 16, 16);
    }
  }, [geometry]);

  return (
    <Float
      speed={speed * 0.8}
      rotationIntensity={0.4}
      floatIntensity={floatIntensity}
      floatingRange={[-0.3, 0.3]}
    >
      <mesh ref={meshRef} position={position} rotation={rotation} scale={scale} geometry={geo}>
        <meshStandardMaterial
          color="#9b9b9b"
          transparent
          opacity={0.28}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
    </Float>
  );
};

const Scene = () => {
  const objects = useMemo<FloatingItemProps[]>(() => [
    { position: [-3.5, 1.5, -2], rotation: [0.5, 0.3, 0], geometry: 'money', speed: 1.2, floatIntensity: 1.5, scale: 1.1 },
    { position: [3.8, -0.5, -3], rotation: [0.2, 0.8, 0.4], geometry: 'gear', speed: 0.8, floatIntensity: 1.2 },
    { position: [-2.5, -1.8, -2.5], rotation: [0.1, 0.5, 0.2], geometry: 'phone', speed: 1.0, floatIntensity: 1.0, scale: 1.2 },
    { position: [2.5, 2.0, -3.5], rotation: [0.7, 0.2, 0.5], geometry: 'gun', speed: 0.9, floatIntensity: 1.8, scale: 0.9 },
    { position: [-4.0, -0.5, -4], rotation: [0.3, 0.6, 0.1], geometry: 'shield', speed: 0.7, floatIntensity: 1.3 },
    { position: [4.5, 1.0, -2.5], rotation: [0.4, 0.1, 0.7], geometry: 'lightning', speed: 1.1, floatIntensity: 1.1, scale: 1.1 },
    { position: [0.5, -2.5, -3], rotation: [0.6, 0.4, 0.3], geometry: 'money', speed: 0.6, floatIntensity: 1.4, scale: 0.8 },
    { position: [-1.5, 2.5, -4], rotation: [0.2, 0.7, 0.5], geometry: 'gear', speed: 0.85, floatIntensity: 0.9 },
    { position: [1.5, -1.0, -1.5], rotation: [0.8, 0.3, 0.2], geometry: 'gun', speed: 1.3, floatIntensity: 1.6, scale: 0.7 },
    { position: [-0.5, 0.5, -5], rotation: [0.1, 0.9, 0.4], geometry: 'phone', speed: 0.5, floatIntensity: 1.0, scale: 1.0 },
    { position: [1.0, 2.8, -3], rotation: [0.4, 0.2, 0.6], geometry: 'shield', speed: 0.75, floatIntensity: 1.2, scale: 0.85 },
    { position: [-3.0, 0.0, -3.5], rotation: [0.6, 0.1, 0.3], geometry: 'lightning', speed: 0.95, floatIntensity: 1.5, scale: 0.9 },
  ], []);

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />
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
