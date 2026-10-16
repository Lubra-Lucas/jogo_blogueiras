/** Peças 3D compartilhadas do minijogo: luz de estúdio, fundo em gradiente, confete, boneca. */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { BackSide, CanvasTexture, Color, InstancedMesh, Object3D, Quaternion, SRGBColorSpace, Vector3 } from 'three'
import type { Appearance } from '../../../shared/appearance'
import { Character, type CharacterHandle } from '../../character/Character'
import { applyRestPose } from '../../character/pose'
import { applyBonePose, type PoseId } from './bonePoses'
import type { AnimDriver } from '../../character/animation/CharacterAnimation'
import type { ClipName } from '../../character/animation/animator'

/** Luz de estúdio procedural (sem HDR/CDN), tons champagne / azul bebê / lilás. */
export function StudioEnv({ intensity = 0.55 }: { intensity?: number }) {
  return (
    <Environment resolution={256} frames={1} background={false} environmentIntensity={intensity}>
      <Lightformer form="rect" intensity={2.4} color="#fff2e0" position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[18, 18, 1]} />
      <Lightformer form="rect" intensity={3} color="#ffe6c4" position={[7, 3, 3]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} />
      <Lightformer form="rect" intensity={2.6} color="#cfe5fb" position={[-7, 3, 2]} rotation-y={Math.PI / 2} scale={[10, 4, 1]} />
      <Lightformer form="ring" intensity={2.4} color="#e6d6ff" position={[0, 4, -8]} scale={7} />
      <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[0, 2, 9]} rotation-y={Math.PI} scale={[14, 4, 1]} />
    </Environment>
  )
}

export function gradientTexture(stops: [number, string][], size = 512): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, size)
  for (const [o, col] of stops) g.addColorStop(o, col)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, size)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

/** Esfera de fundo com gradiente vertical. */
export function GradientBackdrop({ stops, radius = 60 }: { stops: [number, string][]; radius?: number }) {
  const tex = useMemo(() => gradientTexture(stops), [stops])
  return (
    <mesh>
      <sphereGeometry args={[radius, 24, 16]} />
      <meshBasicMaterial map={tex} side={BackSide} fog={false} toneMapped={false} />
    </mesh>
  )
}

const CONFETTI_COLORS = ['#ffd36b', '#ffb3d1', '#b9e4ff', '#c8a4ff', '#bfe8d6', '#fff0b0', '#ffffff']

/** Chuva de confete (InstancedMesh, animada na CPU: ~140 pedaços). */
export function Confetti({ active, count = 140, origin = [0, 5.5, 0], spread = 6, burst = false }: { active: boolean; count?: number; origin?: [number, number, number]; spread?: number; burst?: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const data = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (Math.random() - 0.5) * spread,
        y: Math.random() * 6,
        z: (Math.random() - 0.5) * spread,
        vy: 0.9 + Math.random() * 1.2,
        vx: (Math.random() - 0.5) * 0.6,
        rot: Math.random() * 6,
        spin: (Math.random() - 0.5) * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    [count, spread],
  )
  const colors = useMemo(() => data.map((d) => new Color(d.color)), [data])
  useEffect(() => {
    const m = ref.current
    if (!m) return
    colors.forEach((c, i) => m.setColorAt(i, c))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [colors])
  useFrame((state, dt) => {
    const m = ref.current
    if (!m) return
    m.visible = active
    if (!active) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < data.length; i++) {
      const d = data[i]
      d.y -= d.vy * Math.min(dt, 0.05)
      d.x += d.vx * Math.min(dt, 0.05)
      d.rot += d.spin * Math.min(dt, 0.05)
      if (d.y < -0.5) d.y = burst ? 6 : 6.5
      dummy.position.set(origin[0] + d.x + Math.sin(t + i) * 0.15, origin[1] + d.y - 5.5, origin[2] + d.z)
      dummy.rotation.set(d.rot, d.rot * 0.7, d.rot * 0.3)
      dummy.scale.set(0.09, 0.14, 0.01)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}

/**
 * Boneca animada: clipe contínuo (`clip`), clipe congelado (`clip` + `t`) ou pose por ossos (`pose`, sem animador).
 * A pose guarda os ossos antes da 1ª aplicação e os restaura ao sair dela.
 */
export function Doll({
  appearance, clip, t, pose, position = [0, 0, 0], rotationY = 0, scale = 1,
}: { appearance: Appearance; clip?: ClipName; t?: number; pose?: PoseId | null; position?: [number, number, number]; rotationY?: number; scale?: number }) {
  const rig = useRef<CharacterHandle>(null)
  const snap = useRef<Map<string, { q: Quaternion; p: Vector3 }> | null>(null)
  const applied = useRef<PoseId | null>(null)
  const anim: AnimDriver | undefined = clip && !pose ? { clip, t } : undefined

  useFrame(() => {
    const r = rig.current
    if (!r) return
    if (!snap.current) {
      snap.current = new Map()
      for (const n in r.bones) snap.current.set(n, { q: r.bones[n].quaternion.clone(), p: r.bones[n].position.clone() })
    }
    const want = pose ?? null
    if (want === applied.current) return
    if (want) {
      for (const [n, v] of snap.current) {
        const b = r.bones[n]
        if (b) {
          b.quaternion.copy(v.q)
          b.position.copy(v.p)
        }
      }
      applyRestPose(r.bones, r.root)
      applyBonePose(want, r.bones, r.root)
    }
    applied.current = want
  })

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <Character ref={rig} appearance={appearance} anim={anim} />
    </group>
  )
}

/** Etiqueta de texto 3D (sprite com CanvasTexture; evita o <Html> do drei, que desmonta uma raiz React no meio do render). */
export function Label3D({ text, position, height = 0.2, bg = '#fffdf6', color = '#1d1a24', border = '#e8c872', italic = true }: { text: string; position: [number, number, number]; height?: number; bg?: string; color?: string; border?: string; italic?: boolean }) {
  const { tex, aspect } = useMemo(() => {
    const font = `${italic ? 'italic ' : ''}600 56px "Playfair Display", "Times New Roman", serif`
    const c = document.createElement('canvas')
    const g = c.getContext('2d')!
    g.font = font
    const w = Math.ceil(g.measureText(text).width) + 64
    c.width = w
    c.height = 100
    const g2 = c.getContext('2d')!
    g2.font = font
    g2.fillStyle = bg
    g2.strokeStyle = border
    g2.lineWidth = 5
    g2.beginPath()
    g2.roundRect(4, 4, w - 8, 92, 46)
    g2.fill()
    g2.stroke()
    g2.fillStyle = color
    g2.textAlign = 'center'
    g2.textBaseline = 'middle'
    g2.fillText(text, w / 2, 54)
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    return { tex: t, aspect: w / 100 }
  }, [text, bg, color, border, italic])
  return (
    <sprite position={position} scale={[height * aspect, height, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} fog={false} />
    </sprite>
  )
}
