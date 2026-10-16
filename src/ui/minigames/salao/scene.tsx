import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { ACESFilmicToneMapping, SRGBColorSpace, type PerspectiveCamera, type Group } from 'three'
import { DEFAULT_APPEARANCE, type Appearance, type ItemRef } from '../../../shared/appearance'
import { getCatalogItem } from '../../../game/character/catalog'
import { Doll, GradientBackdrop, StudioEnv } from '../../../game/minigames/desfile/sceneKit'
import type { AccId } from '../../../game/minigames/salao/data'

export interface Look {
  skin: string
  suit: string
  style: string
  color: string
  acc: AccId | null
  accColor: string
}

export function lookAppearance(l: Look): Appearance {
  const accessories: ItemRef[] = []
  if (l.acc) {
    const it = getCatalogItem(l.acc)
    accessories.push({ id: l.acc, colors: it ? it.mats.map((m) => (m.id === 'ribbon' ? l.accColor : m.color)) : undefined })
  }
  return {
    ...DEFAULT_APPEARANCE,
    skin: { tone: l.skin },
    suit: { color: l.suit, finish: 'satin' },
    lips: { color: '#a8566e', gloss: 0.5 },
    hair: { id: l.style, color: l.color },
    accessories,
  }
}

function Cam({ y, dist, fov, ty }: { y: number; dist: number; fov: number; ty: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  useLayoutEffect(() => {
    camera.position.set(0, y, dist)
    camera.fov = fov
    camera.lookAt(0, ty, 0)
    camera.updateProjectionMatrix()
  }, [camera, y, dist, fov, ty])
  return null
}

const WALL = [[0, '#d9cdbd'], [0.55, '#cbbca8'], [1, '#a99a86']] as [number, string][]

function Chair() {
  return (
    <group position={[0, 0, -0.32]}>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.7, 1.0, 0.14]} />
        <meshPhysicalMaterial color="#26211e" roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.25} />
      </mesh>
      <mesh position={[0, 1.72, 0.01]}>
        <boxGeometry args={[0.52, 0.18, 0.16]} />
        <meshPhysicalMaterial color="#26211e" roughness={0.35} clearcoat={0.8} />
      </mesh>
      {[-0.43, 0.43].map((x) => (
        <mesh key={x} position={[x, 0.82, 0.22]}>
          <boxGeometry args={[0.08, 0.06, 0.62]} />
          <meshStandardMaterial color="#b08d4a" metalness={0.9} roughness={0.28} />
        </mesh>
      ))}
    </group>
  )
}

function Mirror() {
  return (
    <group position={[0, 1.5, -1.5]}>
      <mesh scale={[1, 1.25, 1]}>
        <circleGeometry args={[1.1, 48]} />
        <meshPhysicalMaterial color="#eef1ee" roughness={0.05} metalness={0.6} clearcoat={1} />
      </mesh>
      <mesh scale={[1, 1.25, 1]} position={[0, 0, 0.02]}>
        <torusGeometry args={[1.1, 0.05, 16, 64]} />
        <meshStandardMaterial color="#b08d4a" metalness={0.95} roughness={0.25} />
      </mesh>
    </group>
  )
}

function Cape() {
  return (
    <group position={[0, 1.1, 0.01]}>
      <mesh>
        <cylinderGeometry args={[0.115, 0.3, 0.34, 40, 1, true]} />
        <meshPhysicalMaterial color="#f1ece2" roughness={0.55} side={2} sheen={1} sheenColor="#ffffff" />
      </mesh>
      <mesh position={[0, 0.175, 0]}>
        <torusGeometry args={[0.122, 0.014, 10, 40]} />
        <meshStandardMaterial color="#26211e" roughness={0.5} />
      </mesh>
    </group>
  )
}

/** Cintilar quando `burst` muda. */
function Burst({ burst }: { burst: number }) {
  const g = useRef<Group>(null)
  const last = useRef(burst)
  const t = useRef(0)
  useFrame((_, dt) => {
    if (!g.current) return
    if (burst !== last.current) {
      last.current = burst
      t.current = 1.6
    }
    t.current = Math.max(0, t.current - dt)
    g.current.visible = t.current > 0
  })
  return (
    <group ref={g} visible={false} position={[0, 1.55, 0.25]}>
      <Sparkles count={46} scale={[1.1, 0.9, 0.6]} size={9} speed={1.3} color="#f3dc9a" opacity={1} />
    </group>
  )
}

export function SalaoScene({ look, burst }: { look: Look; burst: number }) {
  const appearance = useMemo(() => lookAppearance(look), [look.skin, look.suit, look.style, look.color, look.acc, look.accColor]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Canvas
      className="sl-canvas"
      dpr={[1, 1.6]}
      camera={{ position: [0, 1.58, 2.15], fov: 30, near: 0.1, far: 80 }}
      gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 0.95
      }}
    >
      <Cam y={1.55} dist={2.1} fov={30} ty={1.45} />
      <GradientBackdrop stops={WALL} />
      <StudioEnv intensity={0.5} />
      <hemisphereLight args={['#fff1e0', '#b5a590', 0.55]} />
      <directionalLight position={[2.2, 3.6, 3]} intensity={1.5} color="#fff2df" />
      <directionalLight position={[-3, 2, 1]} intensity={0.55} color="#e6eee4" />
      <Mirror />
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[9, 40]} />
        <meshPhysicalMaterial color="#8d6a48" roughness={0.35} clearcoat={0.6} />
      </mesh>
      <Chair />
      <Suspense fallback={null}>
        <Doll appearance={appearance} clip="idle" />
      </Suspense>
      <Cape />
      <Burst burst={burst} />
    </Canvas>
  )
}

export function Portrait({ look }: { look: Look }) {
  const appearance = useMemo(() => lookAppearance(look), [look.skin, look.suit, look.style, look.color, look.acc, look.accColor]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Canvas
      className="sl-portrait-canvas"
      dpr={1.25}
      camera={{ position: [0, 1.6, 1.5], fov: 28, near: 0.1, far: 40 }}
      gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
    >
      <Cam y={1.6} dist={1.55} fov={26} ty={1.55} />
      <GradientBackdrop stops={[[0, '#efe8dc'], [1, '#cdbfae']]} radius={30} />
      <StudioEnv intensity={0.55} />
      <directionalLight position={[2, 3, 3]} intensity={1.4} color="#fff2df" />
      <Suspense fallback={null}>
        <Doll appearance={appearance} />
      </Suspense>
    </Canvas>
  )
}
