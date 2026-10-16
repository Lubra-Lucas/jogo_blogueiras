import { Suspense, useEffect, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import type { Group } from 'three'
import { CITY, ROAD_SPEC } from '../world/city/layout'
import { hasWorld, isFree } from '../navigation/probe'
import { useQualityShadows } from './useQuality'

/**
 * Objetos leves que o carro pode derrubar: cones de obra e lixeiras (corpos dinamicos que dormem sozinhos).
 * Fica so nas pistas/calcadas; posicoes deterministicas e filtradas contra colisores fixos.
 */
const BASE = import.meta.env.BASE_URL
const CONE = `${BASE}assets/city/props_more/traffic_cone.glb`
const BIN = `${BASE}assets/city/props_plus/trash_bin_cute.glb`

interface Item {
  kind: 'cone' | 'bin'
  x: number
  z: number
  rot: number
}

function rnd(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function candidates(): Item[] {
  const r = rnd(7788)
  const out: Item[] = []
  let n = 0
  for (const road of CITY.roads) {
    if (road.kind === 'path') continue
    const spec = ROAD_SPEC[road.kind]
    const pts = road.points
    const side = road.width / 2 - spec.sidewalk * 0.55
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0]
      const az = pts[i][1]
      const bx = pts[i + 1][0]
      const bz = pts[i + 1][1]
      const len = Math.hypot(bx - ax, bz - az)
      if (len < 6) continue
      const dx = (bx - ax) / len
      const dz = (bz - az) / len
      const step = road.kind === 'avenue' ? 34 : 44
      for (let t = 10 + r() * 14; t < len - 8; t += step + r() * 14) {
        n++
        const s = r() < 0.5 ? -1 : 1
        const px = ax + dx * t
        const pz = az + dz * t
        // lixeira na calcada
        out.push({ kind: 'bin', x: px - dz * s * side, z: pz + dx * s * side, rot: r() * 6.28 })
        // a cada tantos, um trio de cones na beira da pista
        if (n % 4 === 0) {
          const lane = (road.width - spec.sidewalk * 2) / 2 - 0.8
          for (let k = 0; k < 3; k++) {
            out.push({ kind: 'cone', x: px - dz * -s * lane + dx * k * 2.2, z: pz + dx * -s * lane + dz * k * 2.2, rot: r() * 6.28 })
          }
        }
      }
    }
  }
  return out
}

function Obj({ item, shadows }: { item: Item; shadows: boolean }) {
  const gltf = useGLTF(item.kind === 'cone' ? CONE : BIN)
  const scene = useMemo(() => {
    const g = gltf.scene.clone(true) as Group
    g.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh) o.castShadow = shadows
    })
    return g
  }, [gltf, shadows])
  const cone = item.kind === 'cone'
  return (
    <RigidBody
      type="dynamic"
      colliders={false}
      position={[item.x, 0.02, item.z]}
      rotation={[0, item.rot, 0]}
      mass={cone ? 4 : 14}
      linearDamping={0.4}
      angularDamping={0.5}
    >
      <CylinderCollider args={cone ? [0.3, 0.2] : [0.62, 0.38]} position={[0, cone ? 0.32 : 0.64, 0]} friction={0.7} restitution={0.2} />
      <primitive object={scene} />
    </RigidBody>
  )
}

export function Knockables() {
  const [items, setItems] = useState<Item[]>([])
  const shadows = useQualityShadows()
  useEffect(() => {
    let alive = true
    const tryBuild = (tries: number) => {
      if (!alive) return
      if (!hasWorld() && tries < 20) {
        window.setTimeout(() => tryBuild(tries + 1), 300)
        return
      }
      const list = candidates().filter((c) => isFree(c.x, c.z, c.kind === 'bin' ? 0.55 : 0.3))
      // limite: dos mais proximos do centro para os mais longes
      list.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))
      setItems(list.slice(0, 70))
    }
    window.setTimeout(() => tryBuild(0), 900)
    return () => {
      alive = false
    }
  }, [])
  return (
    <Suspense fallback={null}>
      {items.map((it, i) => (
        <Obj key={i} item={it} shadows={shadows} />
      ))}
    </Suspense>
  )
}
