import { useRef, type MutableRefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { ACESFilmicToneMapping, MathUtils, SRGBColorSpace, type Group } from 'three'
import { useAppearanceStore } from '../../state/appearanceStore'
import { Character } from '../../game/character/Character'
import type { AnimDriver } from '../../game/character/animation/CharacterAnimation'
import { fitOf } from '../../game/character/proportions'

export type StageFocus = 'body' | 'face' | 'hair' | 'torso' | 'eyes' | 'mouth' | 'hands'

/** Enquadramentos: altura do alvo (m) e distancia da camera (m). */
const FRAMES: Record<StageFocus, { y: number; d: number; x?: number }> = {
  body: { y: 0.9, d: 3.7 },
  torso: { y: 1.18, d: 2.1 },
  hair: { y: 1.42, d: 1.75 },
  face: { y: 1.47, d: 0.95 },
  eyes: { y: 1.4, d: 0.72 },
  mouth: { y: 1.35, d: 0.72 },
  hands: { y: 0.82, d: 1.15, x: 0.3 },
}

const IDLE: AnimDriver = { clip: 'idle' }

interface Rot {
  yaw: number
}

function Stage({ focus, rot }: { focus: StageFocus; rot: MutableRefObject<Rot> }) {
  const appearance = useAppearanceStore((s) => (s.compare ? s.saved : s.appearance))
  const group = useRef<Group>(null)
  const cur = useRef({ y: FRAMES[focus].y, d: FRAMES[focus].d, x: FRAMES[focus].x ?? 0 })
  useFrame(({ camera }, dt) => {
    // o enquadramento acompanha a altura do corpo (baixa/alta); mao e perto do quadril (altura menos sensivel)
    const hs = fitOf(appearance.body).heightScale
    const f0 = FRAMES[focus]
    const f = { y: f0.y * hs, d: f0.d * Math.max(hs, 0.95) * (focus === 'body' ? 1.06 : 1), x: f0.x }
    const k = 1 - Math.exp(-7 * Math.min(dt, 0.05))
    cur.current.y = MathUtils.lerp(cur.current.y, f.y, k)
    cur.current.d = MathUtils.lerp(cur.current.d, f.d, k)
    cur.current.x = MathUtils.lerp(cur.current.x, f.x ?? 0, k)
    camera.position.set(cur.current.x, cur.current.y + 0.04, cur.current.d)
    camera.lookAt(cur.current.x, cur.current.y, 0)
    if (group.current) group.current.rotation.y = MathUtils.lerp(group.current.rotation.y, rot.current.yaw, 1 - Math.exp(-14 * Math.min(dt, 0.05)))
  })
  return (
    <group ref={group} position={[0, 0.02, 0]}>
      <Character appearance={appearance} anim={focus === 'body' ? IDLE : undefined} />
    </group>
  )
}

/** Visualizador 3D (Canvas proprio) do personagem, arrastavel para girar. Reflete a aparencia ao vivo. */
export function CharacterPreview({ focus, rot }: { focus: StageFocus; rot: MutableRefObject<Rot> }) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 1, 3.7], fov: 30, near: 0.05, far: 30 }} gl={{ antialias: true, alpha: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }} style={{ position: 'absolute', inset: 0 }}>
      <Environment resolution={128} frames={1} background={false} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={2.4} color="#ffd6e6" position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[14, 14, 1]} />
        <Lightformer form="rect" intensity={3} color="#ffe2a8" position={[6, 2, 3]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#d2bfff" position={[-6, 2, 1]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[0, 2, 7]} rotation-y={Math.PI} scale={[12, 5, 1]} />
      </Environment>
      <hemisphereLight args={['#fff4ea', '#c9c0e8', 0.5]} />
      <directionalLight position={[2.5, 4, 4]} intensity={1.6} color="#fff1e4" />
      <Stage focus={focus} rot={rot} />
    </Canvas>
  )
}
