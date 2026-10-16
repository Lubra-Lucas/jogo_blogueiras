import { useLayoutEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import type { PerspectiveCamera } from 'three'
import type { Appearance } from '../../../shared/appearance'
import { lookToAppearance } from './adapters'
import { Confetti, Doll, GradientBackdrop, Label3D, StudioEnv } from './sceneKit'
import type { Competitor } from './types'

const BACK: [number, string][] = [[0, '#d8c9f5'], [0.5, '#fbe9d6'], [1, '#cfe5fb']]
const SKINS = ['#efcdbd', '#d9a98d', '#8a5a3c', '#f3dccd', '#b98366']
const MORPHS: Record<string, number>[] = [{ bustBig: 0.3 }, { hipsWide: 0.5, waistThin: 0.4 }, { buttBig: 0.4 }, { waistThin: 0.6 }, {}]

function hash(s: string) {
  let h = 7
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function competitorAppearance(c: Competitor, base: Appearance): Appearance {
  if (c.isPlayer) return lookToAppearance(c.look, base)
  const h = hash(c.id + c.name)
  return lookToAppearance(c.look, { ...base, skin: { tone: SKINS[h % SKINS.length] }, morphs: MORPHS[(h >>> 3) % MORPHS.length], outfit: {}, accessories: [] })
}

const SPOTS: { x: number; h: number; z: number }[] = [
  { x: 0, h: 0.62, z: 0 },
  { x: -1.35, h: 0.4, z: 0.1 },
  { x: 1.35, h: 0.26, z: 0.1 },
  { x: -2.55, h: 0, z: 0.5 },
  { x: 2.55, h: 0, z: 0.5 },
]

/** Pódio 1º-5º com a boneca de cada competidora e chuva de confete. */
export function Podium3D({ ranking, base }: { ranking: Competitor[]; base: Appearance }) {
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const apps = useMemo(() => ranking.map((c) => competitorAppearance(c, base)), [ranking, base])

  useLayoutEffect(() => {
    camera.position.set(0, 1.9, 9.6)
    camera.fov = 36
    camera.lookAt(0, 1.1, 0)
    camera.updateProjectionMatrix()
  }, [camera])
  useLayoutEffect(() => {
    const w = size.width
    const h = size.height
    if (w > h * 1.1) camera.setViewOffset(w, h, w * 0.16, 0, w, h)
    else camera.setViewOffset(w, h, 0, h * 0.2, w, h)
    camera.updateProjectionMatrix()
    return () => camera.clearViewOffset()
  }, [camera, size.width, size.height])

  return (
    <>
      <GradientBackdrop stops={BACK} />
      <StudioEnv />
      <hemisphereLight args={['#fff4ea', '#c9c4e6', 0.7]} />
      <directionalLight position={[2, 5, 5]} intensity={1.4} color="#fff6ea" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <circleGeometry args={[14, 48]} />
        <meshPhysicalMaterial color="#f6eefb" roughness={0.25} clearcoat={0.9} />
      </mesh>
      {SPOTS.slice(0, 3).map((p, i) => (
        <group key={i}>
          <mesh position={[p.x, p.h / 2, p.z]}>
            <boxGeometry args={[1.15, p.h, 1]} />
            <meshPhysicalMaterial color={i === 0 ? '#f6d98a' : i === 1 ? '#e3e7ee' : '#e8b28c'} metalness={0.5} roughness={0.25} clearcoat={0.8} />
          </mesh>
          <mesh position={[p.x, p.h + 0.003, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.15, 1]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.12} />
          </mesh>
        </group>
      ))}
      {ranking.slice(0, 5).map((c, i) => {
        const p = SPOTS[i]
        return (
          <group key={c.id}>
            <Doll appearance={apps[i]} clip={i < 3 ? 'clap' : 'idle'} position={[p.x, p.h, p.z]} scale={i >= 3 ? 0.97 : 1} />
            <Label3D text={`${i + 1}º ${c.name}`} position={[p.x, p.h + 1.82, p.z]} height={0.2} bg={c.isPlayer ? '#fff1c4' : '#fffdf6'} italic={false} />
          </group>
        )
      })}
      <Confetti active count={160} origin={[0, 6, 0]} spread={9} />
      <Sparkles count={50} scale={[8, 4, 4]} position={[0, 2, 0]} size={5} speed={0.4} color="#ffe9a8" />
    </>
  )
}
