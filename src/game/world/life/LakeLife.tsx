import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  CylinderGeometry,
  ConeGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  MeshPhysicalMaterial,
  Object3D,
  ShaderMaterial,
  SphereGeometry,
  BufferGeometry,
  Float32BufferAttribute,
} from 'three'
import { CITY } from '../city/layout'
import { lampSpots } from '../environment/lamps'
import { env } from '../environment/envState'
import { ring } from './fx'
import { mergeGeo, paintGeo, xform } from './geoUtil'
import { LIFE } from './lifeQuality'
import { life, lifeU, wind } from './lifeState'

/**
 * Vida no lago do Parque: lirios que balancam, patos e cisnes nadando em arcos (deixam ondulacoes),
 * ondulacoes quando a jogadora anda perto da margem / na ponte, e reflexos falsos dos postes a noite.
 */

const L = CITY.lake
const WATER_Y = 0.2
const ISLET = { x: L.cx, z: L.cz - 4.6, r: 4.4 }

const rnd = (n: number) => ((Math.sin(n * 91.7 + 3.1) * 43758.5453) % 1 + 1) % 1

// ---------------------------------------------------------------- aves aquaticas (low-poly, cor de vertice)

function swanGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const body = xform(new SphereGeometry(0.34, 12, 8), [0, 0.2, 0], [0, 0, 0], [1.45, 0.8, 0.9])
  parts.push(paintGeo(body, '#f7f5ef'))
  parts.push(paintGeo(xform(new ConeGeometry(0.2, 0.5, 8), [0, 0.32, -0.55], [-Math.PI / 2 - 0.35, 0, 0]), '#f1efe8'))
  // asas dobradas
  for (const s of [-1, 1]) parts.push(paintGeo(xform(new SphereGeometry(0.3, 8, 6), [s * 0.21, 0.34, -0.06], [0, 0, s * 0.3], [0.5, 0.45, 1.15]), '#efece4'))
  // pescoco em S (3 segmentos)
  const seg: [number, number, number, number][] = [
    [0, 0.34, 0.38, 0.5],
    [0, 0.62, 0.5, 0.35],
    [0, 0.88, 0.5, 0.32],
  ]
  seg.forEach(([x, y, z, tilt], i) => parts.push(paintGeo(xform(new CylinderGeometry(0.06 - i * 0.008, 0.075 - i * 0.008, 0.32, 8), [x, y, z], [-tilt + (i === 2 ? 0.1 : 0), 0, 0]), '#f7f5ef')))
  parts.push(paintGeo(xform(new SphereGeometry(0.085, 10, 8), [0, 1.04, 0.56], [0, 0, 0], [0.9, 0.95, 1.2]), '#f7f5ef'))
  parts.push(paintGeo(xform(new SphereGeometry(0.05, 8, 6), [0, 1.04, 0.64], [0, 0, 0], [1, 0.8, 0.9]), '#2b2b2e'))
  parts.push(paintGeo(xform(new ConeGeometry(0.035, 0.14, 6), [0, 1.02, 0.74], [Math.PI / 2 + 0.15, 0, 0]), '#ea8b3b'))
  return mergeGeo(parts)
}

function duckGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = []
  parts.push(paintGeo(xform(new SphereGeometry(0.2, 10, 8), [0, 0.1, 0], [0, 0, 0], [1.25, 0.8, 0.85]), '#9a7656'))
  parts.push(paintGeo(xform(new SphereGeometry(0.1, 8, 6), [0, 0.14, -0.2], [0, 0, 0], [0.9, 0.8, 1.2]), '#6b4a30'))
  parts.push(paintGeo(xform(new SphereGeometry(0.19, 8, 6), [0, 0.12, 0.08], [0, 0, 0], [1.02, 0.5, 0.9]), '#b79b78'))
  parts.push(paintGeo(xform(new CylinderGeometry(0.052, 0.065, 0.16, 8), [0, 0.28, 0.2], [-0.35, 0, 0]), '#2f6e4c'))
  parts.push(paintGeo(xform(new CylinderGeometry(0.056, 0.056, 0.02, 8), [0, 0.22, 0.17], [-0.35, 0, 0]), '#f3efe6'))
  parts.push(paintGeo(xform(new SphereGeometry(0.075, 10, 8), [0, 0.37, 0.27]), '#2f6e4c'))
  parts.push(paintGeo(xform(new SphereGeometry(0.03, 6, 5), [0, 0.37, 0.34], [0, 0, 0], [1.3, 0.55, 1.5]), '#e6bd3a'))
  return mergeGeo(parts)
}

interface Bird {
  geo: BufferGeometry
  /** arco em angulo (rad) em torno do centro do lago */
  a0: number
  a1: number
  r: number
  rWob: number
  speed: number
  phase: number
  swan: boolean
}

function makeBirds(n: number): Bird[] {
  const list: Bird[] = [
    // sul do lago (fora do vao da ponte, ao norte)
    { geo: swanGeometry(), a0: 0.35, a1: 1.5, r: 11.2, rWob: 0.9, speed: 0.55, phase: 0, swan: true },
    { geo: duckGeometry(), a0: 1.7, a1: 2.95, r: 10.2, rWob: 1.1, speed: 0.4, phase: 2, swan: false },
    { geo: swanGeometry(), a0: 2.9, a1: 4.1, r: 12.2, rWob: 0.7, speed: 0.5, phase: 4.1, swan: true },
    { geo: duckGeometry(), a0: -0.35, a1: 0.9, r: 9.6, rWob: 0.9, speed: 0.46, phase: 5.5, swan: false },
  ]
  return list.slice(0, n)
}

const lilyData = (() => {
  const out: { x: number; z: number; r: number; ph: number; flower: number }[] = []
  for (let i = 0; i < 16; i++) {
    const a = rnd(i + 5) * Math.PI * 2
    const rr = 2.5 + rnd(i + 31) * (L.r - 4.5)
    const x = L.cx + Math.cos(a) * rr
    const z = L.cz + Math.sin(a) * rr
    if (Math.hypot(x - ISLET.x, z - ISLET.z) < ISLET.r + 1.4) continue
    if (Math.abs(x - L.cx) < 3.2 && z < ISLET.z) continue
    out.push({ x, z, r: 0.34 + rnd(i + 9) * 0.3, ph: rnd(i + 17) * 6.28, flower: i % 3 === 0 ? 1 : 0 })
  }
  return out
})()

// reflexos falsos dos postes na agua
const REFL_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const REFL_FRAG = /* glsl */ `
varying vec2 vUv;
uniform float uT;
uniform float uI;
uniform vec3 uCol;
float h(float n){ return fract(sin(n * 127.1) * 43758.5453); }
void main() {
  // vUv.x = largura (0..1), vUv.y = ao longo do raio (0 = longe do poste ... 1 = margem proxima)
  float x = abs(vUv.x - 0.5) * 2.0;
  float row = floor(vUv.y * 22.0);
  float wob = sin(uT * 1.6 + row * 1.7) * 0.18 + sin(uT * 2.9 + row * 3.1) * 0.08;
  float w = (0.18 + 0.5 * (1.0 - vUv.y)) * (0.6 + 0.4 * h(row + floor(uT * 1.4)));
  float a = (1.0 - smoothstep(w - 0.1, w + 0.05, abs(x - wob * 0.5))) ;
  a *= smoothstep(0.0, 0.15, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
  a *= 0.55 + 0.45 * h(row * 3.7 + floor(uT * 2.0));
  gl_FragColor = vec4(uCol * a * uI, a * uI);
}
`

export function LakeLife() {
  const birds = useMemo(() => makeBirds(LIFE.ducks), [])
  const birdMat = useMemo(() => new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3 }), [])
  const birdRefs = useRef<(Group | null)[]>([])
  const birdState = useRef(birds.map((b) => ({ yaw: 0, x: 0, z: 0, rip: Math.random() * 2, px: 0, pz: 0, init: false, b })))
  const padRef = useRef<InstancedMesh>(null)
  const flowerRef = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const padGeo = useMemo(() => new CircleGeometry(1, 14, 0.2, Math.PI * 2 - 0.5).rotateX(-Math.PI / 2), [])
  const flowerGeo = useMemo(() => {
    const parts: BufferGeometry[] = []
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      parts.push(paintGeo(xform(new SphereGeometry(0.1, 6, 5), [Math.cos(a) * 0.1, 0.04, Math.sin(a) * 0.1], [0, 0, 0], [0.8, 0.45, 1.4]), '#faf6ee'))
    }
    parts.push(paintGeo(xform(new SphereGeometry(0.05, 6, 5), [0, 0.06, 0]), '#f1c232'))
    return mergeGeo(parts)
  }, [])
  const padMat = useMemo(() => new MeshPhysicalMaterial({ color: '#4f9a52', roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2, side: DoubleSide }), [])
  const flowerMat = useMemo(() => new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.4, clearcoat: 0.6 }), [])

  const lampPos = useMemo(() => lampSpots().filter((p) => Math.hypot(p.x - L.cx, p.z - L.cz) < L.r + 12 && Math.hypot(p.x - L.cx, p.z - L.cz) > L.r + 2), [])

  useEffect(
    () => () => {
      for (const b of birds) b.geo.dispose()
    },
    [birds],
  )

  const reflMesh = useMemo(() => {
    if (!lampPos.length) return null
    const g = new BufferGeometry()
    const pos: number[] = []
    const uvs: number[] = []
    const idx: number[] = []
    lampPos.forEach((sp, i) => {
      const ang = Math.atan2(sp.z - L.cz, sp.x - L.cx)
      const cx = Math.cos(ang)
      const cz = Math.sin(ang)
      const px = -cz
      const pz = cx
      const rows: [number, number, number][] = [
        [L.r * 0.3, 0.45, 0],
        [L.r * 0.98, 1.2, 1],
      ]
      rows.forEach(([r, w, v]) => {
        pos.push(L.cx + cx * r - px * w, WATER_Y + 0.025, L.cz + cz * r - pz * w, L.cx + cx * r + px * w, WATER_Y + 0.025, L.cz + cz * r + pz * w)
        uvs.push(0, 1 - v, 1, 1 - v)
      })
      const o = i * 4
      idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2)
    })
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    g.setIndex(idx)
    const m = new ShaderMaterial({
      vertexShader: REFL_VERT,
      fragmentShader: REFL_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -12,
      polygonOffsetUnits: -12,
      uniforms: { uT: { value: 0 }, uI: { value: 0 }, uCol: { value: new Color('#ffd9a0') } },
    })
    return { g, m }
  }, [lampPos])

  const lastRip = useRef(0)
  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.1)
    const t = life.t
    const dc = Math.hypot(life.cam.x - L.cx, life.cam.z - L.cz)
    if (dc > 80) return

    // ---- aves
    birdState.current.forEach((s, i) => {
      const g = birdRefs.current[i]
      if (!g) return
      const b = s.b
      const u = 0.5 - 0.5 * Math.cos(t * b.speed * 0.28 + b.phase) // 0..1 ping-pong suave
      const ang = b.a0 + (b.a1 - b.a0) * u
      const r = b.r + Math.sin(t * 0.21 + b.phase * 2) * b.rWob
      const x = L.cx + Math.cos(ang) * r
      const z = L.cz + Math.sin(ang) * r
      if (!s.init) {
        s.init = true
        s.px = x
        s.pz = z
      }
      const vx = x - s.px
      const vz = z - s.pz
      s.px = x
      s.pz = z
      if (vx * vx + vz * vz > 1e-8) {
        const target = Math.atan2(vx, vz)
        let d = target - s.yaw
        d = Math.atan2(Math.sin(d), Math.cos(d))
        s.yaw += d * Math.min(1, dt * 2.2)
      }
      g.position.set(x, WATER_Y - 0.01 + Math.sin(t * 1.3 + b.phase) * 0.012, z)
      g.rotation.set(Math.sin(t * 1.1 + b.phase) * 0.03, s.yaw, Math.sin(t * 0.9 + b.phase * 1.7) * 0.03)
      g.visible = true
      s.rip -= dt
      if (s.rip <= 0) {
        s.rip = 0.9 + Math.random() * 0.8
        ring(x - Math.sin(s.yaw) * 0.2, WATER_Y + 0.02, z - Math.cos(s.yaw) * 0.2, b.swan ? 0.55 : 0.4, 1.8, 0xffffff, 0.4)
      }
    })

    // ---- lirios: balanco suave + deriva com o vento
    const pad = padRef.current
    const fl = flowerRef.current
    if (pad && fl) {
      let fi = 0
      lilyData.forEach((p, i) => {
        const bob = Math.sin(t * 0.9 + p.ph) * 0.012 + Math.sin(t * 1.7 + p.ph * 2) * 0.006
        const dx = Math.sin(t * 0.13 + p.ph) * 0.12 + wind.dx * wind.strength * 0.08
        const dz = Math.cos(t * 0.11 + p.ph) * 0.12 + wind.dz * wind.strength * 0.08
        // empurra quando alguem se aproxima (o jogador nunca entra, mas patos passam)
        dummy.position.set(p.x + dx, WATER_Y + 0.045 + bob, p.z + dz)
        dummy.rotation.set(Math.sin(t * 1.1 + p.ph) * 0.05, p.ph + Math.sin(t * 0.1 + p.ph) * 0.2, Math.cos(t * 0.9 + p.ph) * 0.05)
        dummy.scale.setScalar(p.r)
        dummy.updateMatrix()
        pad.setMatrixAt(i, dummy.matrix)
        if (p.flower) {
          dummy.position.y += 0.02
          dummy.scale.setScalar(p.r * 1.3)
          dummy.updateMatrix()
          fl.setMatrixAt(fi++, dummy.matrix)
        }
      })
      pad.instanceMatrix.needsUpdate = true
      fl.instanceMatrix.needsUpdate = true
    }

    // ---- ondulacoes quando a jogadora anda perto da margem ou sobre a ponte
    if (life.speed > 0.4 && t - lastRip.current > 0.45) {
      const px = life.player.x
      const pz = life.player.z
      const d = Math.hypot(px - L.cx, pz - L.cz)
      const onBridge = Math.abs(px - L.cx) < 1.8 && pz > L.cz - L.r - 2 && pz < ISLET.z + ISLET.r
      if (onBridge && d < L.r + 1.5) {
        lastRip.current = t
        ring(px + (Math.random() - 0.5) * 0.6, WATER_Y + 0.02, pz, 0.7, 1.6, 0xffffff, 0.45)
      } else if (d > L.r - 0.5 && d < L.r + 3.2) {
        lastRip.current = t
        const k = (L.r - 0.6) / d
        ring(L.cx + (px - L.cx) * k, WATER_Y + 0.02, L.cz + (pz - L.cz) * k, 0.55, 1.5, 0xffffff, 0.4)
      }
    }

    if (reflMesh) {
      reflMesh.m.uniforms.uT.value = t
      reflMesh.m.uniforms.uI.value = env.lights * 0.5 * (1 - 0.4 * env.rain)
    }
  })

  void lifeU
  return (
    <group>
      {birds.map((b, i) => (
        <group key={i} ref={(g) => (birdRefs.current[i] = g)} visible={false}>
          <mesh geometry={b.geo} material={birdMat} castShadow />
        </group>
      ))}
      <instancedMesh ref={padRef} args={[padGeo, padMat, lilyData.length]} frustumCulled={false} />
      <instancedMesh ref={flowerRef} args={[flowerGeo, flowerMat, Math.max(1, lilyData.filter((p) => p.flower).length)]} frustumCulled={false} />
      {reflMesh && <mesh geometry={reflMesh.g} material={reflMesh.m} frustumCulled={false} renderOrder={5} />}
    </group>
  )
}
