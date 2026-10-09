import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Float } from '@react-three/drei';
import * as THREE from 'three';

function RetroTotemMesh() {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.7;
      // Gentle tilt reacting to mouse position
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        state.pointer.y * 0.3,
        0.1
      );
      meshRef.current.rotation.z = THREE.MathUtils.lerp(
        meshRef.current.rotation.z,
        -state.pointer.x * 0.3,
        0.1
      );
    }
  });

  return (
    <group ref={meshRef}>
      {/* Main Cartridge Body */}
      <RoundedBox args={[2.2, 2.6, 0.6]} radius={0.12} smoothness={4}>
        <meshStandardMaterial
          color="#E25241"
          roughness={0.25}
          metalness={0.1}
        />
      </RoundedBox>

      {/* Cartridge Label Plate */}
      <RoundedBox position={[0, 0.2, 0.31]} args={[1.7, 1.8, 0.05]} radius={0.06} smoothness={4}>
        <meshStandardMaterial
          color="#F5A623"
          roughness={0.3}
          metalness={0.05}
        />
      </RoundedBox>

      {/* Cartridge Grip Ridges */}
      {[-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6].map((x, i) => (
        <RoundedBox key={i} position={[x, -1.0, 0]} args={[0.08, 0.35, 0.65]} radius={0.02} smoothness={2}>
          <meshStandardMaterial color="#1F1916" roughness={0.4} />
        </RoundedBox>
      ))}

      {/* Top Arcade Jewel */}
      <RoundedBox position={[0, 1.4, 0]} args={[0.8, 0.25, 0.4]} radius={0.05} smoothness={4}>
        <meshStandardMaterial color="#2B6CB0" roughness={0.1} metalness={0.3} />
      </RoundedBox>
    </group>
  );
}

export function TotemCanvas() {
  return (
    <div className="w-full h-48 md:h-64 relative cursor-grab active:cursor-grabbing">
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[5, 8, 5]} intensity={1.8} />
        <directionalLight position={[-5, -2, -2]} intensity={0.6} color="#F5A623" />
        <Float speed={2.5} rotationIntensity={0.4} floatIntensity={0.6}>
          <RetroTotemMesh />
        </Float>
      </Canvas>
    </div>
  );
}
