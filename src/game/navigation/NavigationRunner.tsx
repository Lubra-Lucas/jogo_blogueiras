import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import {
  CanvasTexture,
  Color,
  DynamicDrawUsage,
  InstancedMesh,
  Object3D,
  SRGBColorSpace,
  type Group,
  type Sprite,
} from 'three'
import { usePlayerStore } from '../../state/playerStore'
import { fastTravelTo, navDebug, navigateTo, navigateToPoint, tickNavigation } from './navigation'
import { navStore } from './navStore'
import { invalidateGraph, getGraph, graphComponents, findPath, nodesIn } from './pathfinder'
import { resolveDestination } from './destinations'
import { registerWorld, unregisterWorld } from './probe'

const MAX_DOTS = 420
const PINK = new Color('#ff3d94')
const LILAC = new Color('#a56bff')
const GOLD = new Color('#ffb400')

/**
 * Montado dentro de <Physics>: registra o mundo Rapier para as consultas de visibilidade, move a jogadora
 * pelos pontos do caminho (tick), desenha a trilha pontilhada + marcador de destino e atende ?goto= / ?fast=.
 */
export function NavigationRunner() {
  const { world, rapier } = useRapier()

  useEffect(() => {
    registerWorld(world, rapier)
    invalidateGraph()
    return () => unregisterWorld(world)
  }, [world, rapier])

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const goto = q.get('goto')
    const fast = q.get('fast')
    const w = window as unknown as { __nav?: unknown }
    if (import.meta.env.DEV) w.__nav = { toPoint: navigateToPoint, plan: (id: string, sx: number, sz: number) => { const d = resolveDestination(id); if (!d) return null; const t = performance.now(); const p = findPath(sx, sz, d.x, d.z); return { ms: Math.round(performance.now() - t), n: p?.length ?? -1, p: p?.map((q) => q.map(Math.round)) } }, nodesIn, comps: graphComponents, findPath, navigateTo, fastTravelTo, stats: () => navDebug(), pos: () => { const p = usePlayerStore.getState().position; return [Math.round(p.x * 10) / 10, Math.round(p.z * 10) / 10] }, nav: () => navStore.getState(), build: () => { const t = performance.now(); getGraph(); return performance.now() - t } }
    if (!goto && !fast) return
    const t = window.setTimeout(() => (goto ? void navigateTo(goto) : fastTravelTo(fast!)), 3500)
    return () => window.clearTimeout(t)
  }, [])

  useFrame((_, dt) => tickNavigation(Math.min(dt, 0.05)))

  return (
    <>
      <PathTrail />
      <DestMarker />
    </>
  )
}

// ---------------------------------------------------------------- trilha pontilhada

const dummy = new Object3D()
const col = new Color()

function PathTrail() {
  const waypoints = navStore((s) => s.waypoints)
  const mesh = useRef<InstancedMesh>(null)

  /** pontos da trilha: [x, z, distancia acumulada] */
  const dots = useMemo(() => {
    if (!waypoints.length) return []
    const p = usePlayerStore.getState().position
    const pts: [number, number][] = [[p.x, p.z], ...waypoints]
    let total = 0
    for (let i = 0; i < pts.length - 1; i++) total += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
    const step = Math.max(1.1, total / (MAX_DOTS - 4))
    const out: { x: number; z: number; s: number }[] = []
    let acc = 0
    let next = step * 0.5
    for (let i = 0; i < pts.length - 1; i++) {
      const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
      while (next <= acc + l && out.length < MAX_DOTS) {
        const u = (next - acc) / l
        out.push({ x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, z: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u, s: next })
        next += step
      }
      acc += l
    }
    return out.map((d) => ({ ...d, t: total > 0 ? d.s / total : 0 }))
  }, [waypoints])

  useEffect(() => {
    const m = mesh.current
    if (!m) return
    m.count = dots.length
    dots.forEach((d, i) => {
      col.copy(PINK).lerp(LILAC, Math.min(1, d.t * 2)).lerp(GOLD, Math.max(0, d.t * 2 - 1.2))
      m.setColorAt(i, col)
    })
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [dots])

  useFrame(({ clock }) => {
    const m = mesh.current
    if (!m || !dots.length) return
    const p = usePlayerStore.getState().position
    // dot mais proximo da jogadora define o "ja andou"
    let near = 0
    let nd = Infinity
    for (let i = 0; i < dots.length; i++) {
      const d = (dots[i].x - p.x) ** 2 + (dots[i].z - p.z) ** 2
      if (d < nd) {
        nd = d
        near = i
      }
    }
    const t = clock.elapsedTime
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i]
      const ahead = i - near
      // some atras da jogadora (fade em ~4 pontos) e perto dela; pulsa viajando pelo caminho
      const fade = Math.min(1, Math.max(0, (ahead + 1) / 4))
      const pulse = 0.62 + 0.38 * Math.sin(t * 4 - d.s * 0.9)
      const sc = 0.3 * fade * pulse
      dummy.position.set(d.x, 0.1, d.z)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.scale.set(sc, sc, sc)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX_DOTS]} frustumCulled={false} renderOrder={3} onUpdate={(m) => (m.instanceMatrix.setUsage(DynamicDrawUsage))}>
      <circleGeometry args={[1, 14]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.92} depthWrite={false} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
    </instancedMesh>
  )
}

// ---------------------------------------------------------------- marcador de destino

function makeLabel(text: string) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const g = c.getContext('2d')!
  const r = 56
  g.fillStyle = 'rgba(255,250,244,0.92)'
  g.strokeStyle = '#f2cf6e'
  g.lineWidth = 6
  g.font = '700 54px system-ui, -apple-system, "Segoe UI", sans-serif'
  const w = Math.min(496, g.measureText(text).width + 70)
  const x = (512 - w) / 2
  g.beginPath()
  g.roundRect(x, 64 - r / 1.2, w, r * 1.67, r)
  g.fill()
  g.stroke()
  g.fillStyle = '#7a4b6a'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, 256, 68, 450)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

function DestMarker() {
  const active = navStore((s) => s.active)
  const name = navStore((s) => s.targetName)
  const waypoints = navStore((s) => s.waypoints)
  const group = useRef<Group>(null)
  const ripple = useRef<Object3D>(null)
  const label = useRef<Sprite>(null)
  const dest = waypoints.length ? waypoints[waypoints.length - 1] : null
  const tex = useMemo(() => (name ? makeLabel(name) : null), [name])
  const t0 = useRef(0)

  useEffect(() => {
    t0.current = performance.now()
  }, [dest])

  useFrame(() => {
    const g = group.current
    if (!g) return
    g.visible = active && dest !== null
    if (!g.visible || !dest) return
    const t = (performance.now() - t0.current) / 1000
    g.position.set(dest[0], 0.09, dest[1])
    const pop = Math.min(1, t / 0.3)
    const e = 1 + 2.70158 * Math.pow(pop - 1, 3) + 1.70158 * Math.pow(pop - 1, 2)
    const s = Math.max(0.001, e * (1 + 0.07 * Math.sin(t * 5)))
    g.scale.set(s, s, s)
    const r = ripple.current
    if (r) {
      const k = (t * 0.8) % 1
      const rs = 1 + k * 1.8
      r.scale.set(rs, rs, rs)
      const m = (r as unknown as { material: { opacity: number } }).material
      m.opacity = 0.5 * (1 - k)
    }
    const l = label.current
    if (l) l.position.y = 2.7 + Math.sin(t * 2.2) * 0.08
  })

  return (
    <group ref={group} visible={false}>
      <mesh rotation-x={-Math.PI / 2} renderOrder={4}>
        <ringGeometry args={[0.55, 0.72, 48]} />
        <meshBasicMaterial color="#ffd36b" toneMapped={false} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} renderOrder={3}>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial color="#fff2c0" toneMapped={false} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <mesh ref={ripple} rotation-x={-Math.PI / 2} renderOrder={3}>
        <ringGeometry args={[0.66, 0.72, 48]} />
        <meshBasicMaterial color="#ff9ccb" toneMapped={false} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      {/* coluna de luz suave */}
      <mesh position-y={1.2} renderOrder={3}>
        <cylinderGeometry args={[0.05, 0.05, 2.4, 8, 1, true]} />
        <meshBasicMaterial color="#ffe7a3" toneMapped={false} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      {tex && (
        <sprite ref={label} position={[0, 2.7, 0]} scale={[3.2, 0.8, 1]} renderOrder={6}>
          <spriteMaterial map={tex} transparent depthWrite={false} depthTest={false} toneMapped={false} />
        </sprite>
      )}
    </group>
  )
}
