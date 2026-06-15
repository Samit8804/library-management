import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Line, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

function Stars({ count = 2000 }) {
  const ref = useRef<THREE.Points>(null!)
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80
      pos[i * 3 + 1] = (Math.random() - 0.5) * 80
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80
    }
    return pos
  }, [count])

  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.008
    ref.current.rotation.x += delta * 0.003
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.15} color="#60a5fa" transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

function FloatingBook({ position, rotation, color }: { position: [number, number, number]; rotation: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.3
  })
  return (
    <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.3}>
      <mesh ref={ref} position={position} rotation={rotation}>
        <boxGeometry args={[0.6, 0.08, 0.45]} />
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.25}
          roughness={0.2}
          metalness={0.8}
          distort={0.1}
        />
      </mesh>
      <mesh position={[position[0], position[1] + 0.06, position[2]]}>
        <boxGeometry args={[0.55, 0.01, 0.4]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
    </Float>
  )
}

function DataNode({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <Float speed={0.8} floatIntensity={0.2}>
      <mesh position={position}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
      <pointLight position={position} color={color} intensity={0.3} distance={2} />
    </Float>
  )
}

function NodeConnections() {
  const nodes = useMemo(() =>
    Array.from({ length: 12 }, () => ({
      pos: [(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6] as [number, number, number],
      color: Math.random() > 0.5 ? '#60a5fa' : '#8b5cf6',
    })), []
  )

  const pairs = useMemo(() => {
    const p: { start: [number, number, number]; end: [number, number, number]; color: string }[] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].pos[0] - nodes[j].pos[0]
        const dy = nodes[i].pos[1] - nodes[j].pos[1]
        const dz = nodes[i].pos[2] - nodes[j].pos[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < 5 && Math.random() > 0.6) {
          p.push({ start: nodes[i].pos, end: nodes[j].pos, color: '#60a5fa' })
        }
      }
    }
    return p
  }, [nodes])

  return (
    <group>
      {nodes.map((n, i) => <DataNode key={i} position={n.pos} color={n.color} />)}
      {pairs.map((p, i) => (
        <Line key={i} points={[p.start, p.end]} color={p.color} transparent opacity={0.15} lineWidth={0.5} />
      ))}
    </group>
  )
}

function LightTrails() {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.15
  })
  const trailPoints = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2
      const radius = 3 + Math.sin(i * 0.5) * 1.5
      pts.push([Math.cos(angle) * radius, Math.sin(angle * 2) * 0.8, Math.sin(angle) * radius])
    }
    return pts
  }, [])

  return (
    <group ref={ref}>
      <Line points={trailPoints} color="#8b5cf6" transparent opacity={0.12} lineWidth={1} />
      <Line points={trailPoints.map(p => [p[0] * 0.7, p[1] * 0.7, p[2] * 0.7] as [number, number, number])} color="#60a5fa" transparent opacity={0.08} lineWidth={0.8} />
    </group>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.3} color="#60a5fa" />
      <directionalLight position={[-5, -3, -5]} intensity={0.2} color="#8b5cf6" />
      <Stars />
      <NodeConnections />
      <LightTrails />
      <FloatingBook position={[-2.5, 1.5, -1]} rotation={[0.2, 0.5, 0]} color="#60a5fa" />
      <FloatingBook position={[2.8, -1.8, 0.5]} rotation={[-0.1, -0.3, 0.1]} color="#8b5cf6" />
      <FloatingBook position={[-1, -2.5, -2]} rotation={[0.3, 0.8, -0.1]} color="#06b6d4" />
      <FloatingBook position={[1.5, 2.8, 1]} rotation={[-0.2, -0.6, 0.2]} color="#a78bfa" />
      <FloatingBook position={[3.5, 0.5, -2.5]} rotation={[0.1, -0.4, -0.15]} color="#38bdf8" />
      <FloatingBook position={[-3.2, -0.8, 2]} rotation={[-0.3, 0.7, 0.1]} color="#c084fc" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.5, 0]}>
        <ringGeometry args={[6, 8, 64]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

export function ThreeBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
