import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls, Sparkles } from '@react-three/drei'
import type { PerspectiveCamera } from 'three'
import type { Appearance } from '../../../shared/appearance'
import { Doll, GradientBackdrop, StudioEnv } from './sceneKit'

const BACK: [number, string][] = [[0, '#e9defa'], [0.5, '#fbeed9'], [1, '#d9ecfb']]

/** Camarim: boneca numa plataforma giratória (arraste para girar). O painel da UI ocupa um lado, então a cena é deslocada. */
export function Camarim3D({ appearance, spin = true }: { appearance: Appearance; spin?: boolean }) {
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const [auto, setAuto] = useState(spin)
  const timer = useRef(0)

  useLayoutEffect(() => {
    camera.position.set(0, 1.2, 3.7)
    camera.fov = 38
    camera.updateProjectionMatrix()
  }, [camera])

  // desloca o quadro: paisagem -> boneca à esquerda; retrato -> boneca no alto (painel embaixo)
  useLayoutEffect(() => {
    const w = size.width
    const h = size.height
    if (w > h * 1.1) camera.setViewOffset(w, h, w * 0.14, 0, w, h)
    else camera.setViewOffset(w, h, 0, h * 0.13, w, h)
    camera.updateProjectionMatrix()
    return () => camera.clearViewOffset()
  }, [camera, size.width, size.height])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <>
      <GradientBackdrop stops={BACK} />
      <StudioEnv />
      <hemisphereLight args={['#fff4ea', '#c9c4e6', 0.6]} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.5} color="#fff6ea" />
      <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#cfe5fb" />

      {/* plataforma */}
      <group>
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.8, 0.86, 0.12, 48]} />
          <meshPhysicalMaterial color="#fff6e4" roughness={0.18} clearcoat={1} clearcoatRoughness={0.1} />
        </mesh>
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.76, 64]} />
          <meshStandardMaterial color="#e8b84a" metalness={0.9} roughness={0.25} emissive="#e8b84a" emissiveIntensity={0.25} />
        </mesh>
        <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[12, 48]} />
          <meshPhysicalMaterial color="#f4ecfb" roughness={0.3} clearcoat={0.8} />
        </mesh>
      </group>

      <Doll appearance={appearance} clip="idle" />
      <Sparkles count={40} scale={[4, 3, 4]} position={[0, 1.4, 0]} size={5} speed={0.35} color="#ffe9a8" />

      <OrbitControls
        makeDefault
        target={[0, 0.88, 0]}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI * 0.38}
        maxPolarAngle={Math.PI * 0.55}
        autoRotate={auto}
        autoRotateSpeed={1.1}
        onStart={() => {
          setAuto(false)
          window.clearTimeout(timer.current)
        }}
        onEnd={() => {
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => setAuto(spin), 5000)
        }}
      />
    </>
  )
}
