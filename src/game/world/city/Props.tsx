import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Mesh,
  Object3D,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
  MeshPhysicalMaterial,
  type MeshStandardMaterial,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { CITY } from './layout'
import { merge, paint, place, placement } from './geo'
import { Cull, chunkKey, useCullDist } from './cull'

/** Material "porcelana/vinil de brinquedo" compartilhado por todos os props. */
export const PORCELAIN = { roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 } as const

interface Inst {
  x: number
  y: number
  z: number
  rot?: number
  sx?: number
  sy?: number
  sz?: number
  color?: string
}

/** Uma celula espacial de instancias (1 draw call; frustum culling ligado). */
function InstChunk({ geometry, items, shadows, children, cast }: { geometry: BufferGeometry; items: Inst[]; shadows: boolean; children: ReactNode; cast: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    const c = new Color()
    items.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z)
      o.rotation.set(0, it.rot ?? 0, 0)
      o.scale.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      if (it.color) m.setColorAt(i, c.set(it.color))
    })
    m.count = items.length
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.boundingSphere = null
    m.computeBoundingSphere()
  }, [items])
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]} castShadow={shadows && cast} receiveShadow={shadows}>
      {children}
    </instancedMesh>
  )
}

/** InstancedMesh dividido em celulas espaciais: frustum culling por celula + corte por distancia. */
function Instances({ geometry, items, shadows, children, cast = true }: { geometry: BufferGeometry; items: Inst[]; shadows: boolean; children: ReactNode; cast?: boolean }) {
  const dist = useCullDist()
  const chunks = useMemo(() => {
    const map = new Map<number, Inst[]>()
    for (const it of items) {
      const k = chunkKey(it.x, it.z)
      const l = map.get(k)
      if (l) l.push(it)
      else map.set(k, [it])
    }
    return [...map.values()].map((list) => {
      const cx = list.reduce((a, i) => a + i.x, 0) / list.length
      const cz = list.reduce((a, i) => a + i.z, 0) / list.length
      const r = Math.max(...list.map((i) => Math.hypot(i.x - cx, i.z - cz))) + 8
      return { list, cx, cz, r }
    })
  }, [items])
  return (
    <>
      {chunks.map((c, i) => (
        <Cull key={i} cx={c.cx} cz={c.cz} r={c.r} max={dist.props}>
          <InstChunk geometry={geometry} items={c.list} shadows={shadows} cast={cast}>
            {children}
          </InstChunk>
        </Cull>
      ))}
    </>
  )
}

// ------------------------------------------------------------------ arvores

const MINT = ['#a8ecd0', '#b9f0d9', '#9fe3c8']
const SAGE = ['#bcd8b8', '#c7e0be', '#aecfae']
const BLUSH = ['#ffb6cf', '#ffc9dc', '#ffa9c6']
const LILAC = ['#cdb3f5', '#d9c4fa', '#c3a6f0']
const CORAL = ['#ffb199', '#ffc0a8', '#ffa58a']
const LEMON = ['#fff0a0', '#ffe98a', '#fff4b8']
// gramados em menta/sage, com acentos de coral, limao, lilas e so um pouco de rosa
const CANOPY = [MINT, SAGE, MINT, SAGE, CORAL, LEMON, LILAC, BLUSH]

function heartGeometry(): BufferGeometry {
  const list: BufferGeometry[] = []
  for (const sx of [-1, 1]) {
    const s = new SphereGeometry(0.62, 10, 7)
    s.translate(sx * 0.4, 0.28, 0)
    list.push(s)
  }
  const tip = new ConeGeometry(0.98, 1.4, 10)
  tip.rotateX(Math.PI)
  tip.translate(0, -0.4, 0)
  list.push(tip)
  return merge(list)
}

function blossomGeometry(): BufferGeometry {
  const list: BufferGeometry[] = []
  const pts: [number, number, number, number][] = [
    [0, 0.2, 0, 0.8],
    [0.7, -0.1, 0.1, 0.6],
    [-0.65, -0.05, 0.2, 0.62],
    [0.1, 0.05, -0.7, 0.6],
    [-0.15, 0.7, 0.2, 0.55],
    [0.2, 0.15, 0.7, 0.5],
  ]
  for (const [x, y, z, r] of pts) {
    const s = new SphereGeometry(r, 8, 6)
    s.translate(x, y, z)
    list.push(s)
  }
  return merge(list)
}

/** Palmeira estilizada: vaso branco + tronco em curva (segmentos) + folhas pastel. */
function palmGeometries(): { base: BufferGeometry; leaves: BufferGeometry } {
  const base: BufferGeometry[] = []
  const pot = new CylinderGeometry(0.75, 0.6, 0.9, 10)
  pot.translate(0, 0.45, 0)
  base.push(paint(pot, '#fff7ee'))
  let x = 0
  let y = 0.9
  for (let i = 0; i < 5; i++) {
    const tilt = 0.09 * (i + 1)
    const seg = new CylinderGeometry(0.17 - i * 0.015, 0.2 - i * 0.015, 0.9, 10)
    seg.rotateZ(-tilt)
    seg.translate(x + Math.sin(tilt) * 0.45, y + Math.cos(tilt) * 0.45, 0)
    x += Math.sin(tilt) * 0.9
    y += Math.cos(tilt) * 0.9
    base.push(paint(seg, i % 2 ? '#f6e3d3' : '#fff1e4'))
  }
  const leaves: BufferGeometry[] = []
  const cols = ['#a8ecd0', '#cdb3f5', '#b9f0d9', '#ffc2d9']
  for (let i = 0; i < 8; i++) {
    const leaf = new SphereGeometry(1, 7, 4)
    leaf.scale(1.7, 0.1, 0.42)
    leaf.translate(1.5, 0, 0)
    leaf.rotateZ(-0.32) // cai um pouco
    leaf.rotateY((i / 8) * Math.PI * 2)
    leaf.translate(x, y + 0.1, 0)
    leaves.push(paint(leaf, cols[i % cols.length]))
  }
  return { base: merge(base), leaves: merge(leaves) }
}

export function Trees({ shadows }: { shadows: boolean }) {
  const data = useMemo(() => {
    const trunks: Inst[] = []
    const rings: Inst[] = []
    const round: Inst[] = []
    const heart: Inst[] = []
    const cone: Inst[] = []
    const blossom: Inst[] = []
    const orbs: Inst[] = []
    const orbRings: Inst[] = []
    const palmBase: Inst[] = []
    const palmLeaves: Inst[] = []
    const darkTop: Inst[] = []
    const darkRing: Inst[] = []
    const pal = (t: number) => {
      const set = CANOPY[Math.floor(t * 8) % 8]
      return set[Math.floor((t * 24) % 3)]
    }
    for (const t of CITY.trees) {
      const s = t.s
      const rot = t.tint * 6.28
      switch (t.kind) {
        case 'lollipop': {
          const th = 2.5 * s
          trunks.push({ x: t.x, y: th / 2, z: t.z, sx: s, sy: th, sz: s, color: '#fffaf5' })
          rings.push({ x: t.x, y: th * 0.42, z: t.z, sx: s, sy: s, sz: s })
          round.push({ x: t.x, y: th + 0.9 * s, z: t.z, sx: 1.45 * s, sy: 1.35 * s, sz: 1.45 * s, color: pal(t.tint) })
          break
        }
        case 'heart': {
          const th = 2.3 * s
          trunks.push({ x: t.x, y: th / 2, z: t.z, sx: s, sy: th, sz: s, color: '#fffaf5' })
          rings.push({ x: t.x, y: th * 0.42, z: t.z, sx: s, sy: s, sz: s })
          heart.push({ x: t.x, y: th + 1.2 * s, z: t.z, rot, sx: 1.7 * s, sy: 1.7 * s, sz: 1.5 * s, color: [BLUSH, CORAL, LEMON][Math.floor(t.tint * 3) % 3][Math.floor(t.tint * 9) % 3] })
          break
        }
        case 'cone': {
          const th = 1.3 * s
          trunks.push({ x: t.x, y: th / 2, z: t.z, sx: s, sy: th, sz: s, color: '#fffaf5' })
          rings.push({ x: t.x, y: th * 0.5, z: t.z, sx: s, sy: s, sz: s })
          cone.push({ x: t.x, y: th + 2.2 * s, z: t.z, sx: 1.6 * s, sy: 4.4 * s, sz: 1.6 * s, color: t.tint < 0.5 ? MINT[Math.floor(t.tint * 6) % 3] : LILAC[Math.floor(t.tint * 6) % 3] })
          break
        }
        case 'blossom': {
          const th = 2.6 * s
          trunks.push({ x: t.x, y: th / 2, z: t.z, sx: s, sy: th, sz: s, color: '#fffaf5' })
          rings.push({ x: t.x, y: th * 0.42, z: t.z, sx: s, sy: s, sz: s })
          blossom.push({ x: t.x, y: th + 0.9 * s, z: t.z, rot, sx: 1.5 * s, sy: 1.5 * s, sz: 1.5 * s, color: ['#ffc2d9', '#ffb199', '#fff0a0'][Math.floor(t.tint * 3) % 3] })
          break
        }
        case 'orb': {
          const th = 3.4 * s
          trunks.push({ x: t.x, y: th / 2, z: t.z, sx: 0.45 * s, sy: th, sz: 0.45 * s, color: '#efe6ff' })
          orbs.push({ x: t.x, y: th + 1.1 * s, z: t.z, sx: 1.25 * s, sy: 1.25 * s, sz: 1.25 * s, color: ['#f1e6ff', '#e3f3ff', '#ffe6f2'][Math.floor(t.tint * 3) % 3] })
          orbRings.push({ x: t.x, y: th + 1.1 * s, z: t.z, rot, sx: 1.25 * s, sy: 1.25 * s, sz: 1.25 * s, color: t.tint < 0.5 ? '#8fe9ff' : '#ff9fd6' })
          break
        }
        case 'palm':
          palmBase.push({ x: t.x, y: 0, z: t.z, rot, sx: s, sy: s, sz: s })
          palmLeaves.push({ x: t.x, y: 0, z: t.z, rot, sx: s, sy: s, sz: s })
          break
        case 'dark': {
          const th = 2.6 * s
          trunks.push({ x: t.x, y: th / 2, z: t.z, sx: 1.2 * s, sy: th, sz: 1.2 * s, color: '#2d1b52' })
          darkTop.push({ x: t.x, y: th + 1.2 * s, z: t.z, sx: 1.5 * s, sy: 1.5 * s, sz: 1.5 * s, color: ['#3a2170', '#2c1860', '#46267f'][Math.floor(t.tint * 3) % 3] })
          darkRing.push({ x: t.x, y: th + 1.2 * s, z: t.z, rot, sx: 1.5 * s, sy: 1.5 * s, sz: 1.5 * s, color: t.tint < 0.5 ? '#ff3fb4' : '#35e8ff' })
          break
        }
      }
    }
    return { trunks, rings, round, heart, cone, blossom, orbs, orbRings, palmBase, palmLeaves, darkTop, darkRing }
  }, [])

  const geos = useMemo(() => {
    const palm = palmGeometries()
    return {
      trunk: new CylinderGeometry(0.14, 0.2, 1, 8),
      ring: new TorusGeometry(0.22, 0.05, 4, 10).rotateX(Math.PI / 2),
      sphere: new SphereGeometry(1, 14, 9),
      heart: heartGeometry(),
      cone: new ConeGeometry(1, 1, 14),
      blossom: blossomGeometry(),
      orbRing: new TorusGeometry(1.32, 0.035, 4, 28).rotateX(Math.PI / 2 + 0.5),
      darkRing: new TorusGeometry(1.1, 0.045, 4, 24).rotateX(Math.PI / 2 - 0.45),
      palmBase: palm.base,
      palmLeaves: palm.leaves,
    }
  }, [])

  const colliders = useMemo(() => CITY.trees.map((t) => ({ x: t.x, z: t.z, r: t.kind === 'palm' ? 0.7 : 0.3 })), [])

  return (
    <group>
      <Instances geometry={geos.trunk} items={data.trunks} shadows={shadows}>
        <meshPhysicalMaterial {...PORCELAIN} color="#ffffff" />
      </Instances>
      <Instances geometry={geos.ring} items={data.rings} shadows={false}>
        <meshPhysicalMaterial color="#f0c35a" metalness={0.9} roughness={0.25} clearcoat={0.5} />
      </Instances>
      <Instances geometry={geos.sphere} items={data.round} shadows={shadows}>
        <meshPhysicalMaterial {...PORCELAIN} color="#ffffff" />
      </Instances>
      <Instances geometry={geos.heart} items={data.heart} shadows={shadows}>
        <meshPhysicalMaterial {...PORCELAIN} color="#ffffff" />
      </Instances>
      <Instances geometry={geos.cone} items={data.cone} shadows={shadows}>
        <meshPhysicalMaterial {...PORCELAIN} color="#ffffff" />
      </Instances>
      <Instances geometry={geos.blossom} items={data.blossom} shadows={shadows}>
        <meshPhysicalMaterial {...PORCELAIN} color="#ffffff" />
      </Instances>
      <Instances geometry={geos.sphere} items={data.orbs} shadows={shadows}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.12} clearcoat={1} clearcoatRoughness={0.08} iridescence={0.8} iridescenceIOR={1.4} metalness={0.15} />
      </Instances>
      <Instances geometry={geos.orbRing} items={data.orbRings} shadows={false}>
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </Instances>
      <Instances geometry={geos.palmBase} items={data.palmBase} shadows={shadows}>
        <meshPhysicalMaterial {...PORCELAIN} vertexColors />
      </Instances>
      <Instances geometry={geos.palmLeaves} items={data.palmLeaves} shadows={shadows}>
        <meshPhysicalMaterial {...PORCELAIN} vertexColors side={2} />
      </Instances>
      <Instances geometry={geos.sphere} items={data.darkTop} shadows={shadows}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.2} clearcoat={1} clearcoatRoughness={0.1} />
      </Instances>
      <Instances geometry={geos.darkRing} items={data.darkRing} shadows={false}>
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </Instances>

      <RigidBody type="fixed" colliders={false}>
        {colliders.map((c, i) => (
          <CylinderCollider key={i} args={[1.5, c.r]} position={[c.x, 1.5, c.z]} />
        ))}
      </RigidBody>
    </group>
  )
}

// ------------------------------------------------------------------ postes e bancos (kit GLB)

const KIT = `${import.meta.env.BASE_URL}assets/city/`
const URL_LAMP_Y2K = `${KIT}kit_y2k/lamp_futuristic.glb`
const URL_LAMP_ROCOCO = `${KIT}kit/lamp_post.glb`
const URL_BENCH_Y2K = `${KIT}kit_y2k/bench_bubble.glb`
const URL_BENCH_ROCOCO = `${KIT}kit/bench_tufted.glb`

/** Troca o material do GLB por porcelana/vinil (mantem cor e brilho emissivo, descarta sheen/clearcoat do glTF). */
const toyCache = new Map<Material, Material>()
function toyMaterial(src: MeshStandardMaterial): Material {
  let m = toyCache.get(src)
  if (!m) {
    const emissive = src.emissiveIntensity > 0 && src.emissive && src.emissive.getHex() !== 0
    m = new MeshPhysicalMaterial({
      color: src.color,
      emissive: emissive ? src.emissive : undefined,
      emissiveIntensity: emissive ? Math.min(src.emissiveIntensity, 1.6) : 0,
      roughness: 0.28,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
    })
    toyCache.set(src, m)
  }
  return m
}

/** Instancia todas as malhas de um GLB do kit (1 draw call por malha/material). */
function KitInstances({ url, items, shadows }: { url: string; items: { x: number; z: number; rot?: number }[]; shadows: boolean }) {
  const gltf = useGLTF(url)
  const parts = useMemo(() => {
    gltf.scene.updateMatrixWorld(true)
    const out: { geo: BufferGeometry; mat: Material }[] = []
    gltf.scene.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      const g = m.geometry.clone()
      g.applyMatrix4(m.matrixWorld)
      out.push({ geo: g, mat: toyMaterial(m.material as MeshStandardMaterial) })
    })
    return out
  }, [gltf])
  const inst = useMemo<Inst[]>(() => items.map((i) => ({ x: i.x, y: 0, z: i.z, rot: i.rot })), [items])
  return (
    <>
      {parts.map((p, i) => (
        <Instances key={i} geometry={p.geo} items={inst} shadows={shadows}>
          <primitive object={p.mat} attach="material" />
        </Instances>
      ))}
    </>
  )
}

const isY2k = (x: number, z: number) => Math.hypot(x, z) < 82 || (x > 20 && Math.abs(z) < 70)

export function Lamps({ shadows }: { shadows: boolean }) {
  const sets = useMemo(() => {
    const lampsY = CITY.lamps.filter((l) => isY2k(l.x, l.z))
    const lampsR = CITY.lamps.filter((l) => !isY2k(l.x, l.z))
    const benchY = CITY.benches.filter((b) => isY2k(b.x, b.z)).map((b) => ({ x: b.x, z: b.z, rot: b.rot }))
    const benchR = CITY.benches.filter((b) => !isY2k(b.x, b.z)).map((b) => ({ x: b.x, z: b.z, rot: b.rot }))
    return { lampsY, lampsR, benchY, benchR }
  }, [])
  return (
    <group>
      <KitInstances url={URL_LAMP_Y2K} items={sets.lampsY} shadows={shadows} />
      <KitInstances url={URL_LAMP_ROCOCO} items={sets.lampsR} shadows={shadows} />
      <KitInstances url={URL_BENCH_Y2K} items={sets.benchY} shadows={shadows} />
      <KitInstances url={URL_BENCH_ROCOCO} items={sets.benchR} shadows={shadows} />
    </group>
  )
}

// ------------------------------------------------------------------ etiquetas

/** Textura de etiqueta (pilula com texto). */
function labelTexture(text: string, accent: string, sub?: string): { tex: CanvasTexture; aspect: number } {
  const c = document.createElement('canvas')
  c.width = 768
  c.height = sub ? 256 : 160
  const g = c.getContext('2d')!
  const r = 50
  g.fillStyle = 'rgba(255,246,236,0.92)'
  g.beginPath()
  g.roundRect(6, 6, c.width - 12, c.height - 12, r)
  g.fill()
  g.lineWidth = 8
  g.strokeStyle = accent
  g.stroke()
  g.fillStyle = '#5a3a55'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `italic 700 ${sub ? 84 : 88}px 'Playfair Display', Georgia, serif`
  g.fillText(text, c.width / 2, sub ? c.height * 0.36 : c.height / 2 + 4, c.width - 60)
  if (sub) {
    g.font = `600 56px system-ui, sans-serif`
    g.fillStyle = accent
    g.fillText(sub, c.width / 2, c.height * 0.74, c.width - 60)
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return { tex, aspect: c.width / c.height }
}

export function Label({ text, accent, sub, position, height = 2.4 }: { text: string; accent: string; sub?: string; position: [number, number, number]; height?: number }) {
  const { tex, aspect } = useMemo(() => labelTexture(text, accent, sub), [text, accent, sub])
  return (
    <sprite position={position} scale={[height * aspect, height, 1]} renderOrder={20}>
      <spriteMaterial map={tex} transparent depthWrite={false} fog={false} toneMapped={false} />
    </sprite>
  )
}

/** Predios-loja: nomes flutuantes sobre as portas. */
export function ShopLabels() {
  return (
    <>
      {CITY.pois
        .filter((p) => p.kind !== 'spawn')
        .map((p) => (
          <Label
            key={p.id}
            text={p.name}
            accent={p.color}
            position={[p.x + Math.sin(p.facing) * 2.2, p.id === 'casa-sonhos' || p.id === 'palco-neon' ? 8.5 : 6.2, p.z + Math.cos(p.facing) * 2.2]}
            height={p.kind === 'landmark' ? 3 : 2.2}
          />
        ))}
    </>
  )
}

// ------------------------------------------------------------------ marcos, sebe e cerca

/** Quiosques, sebe-cenoura do perimetro, cerca do Bairro Futuro e cones (tudo mesclado em 1 malha, material porcelana). */
export function Landmarks({ shadows }: { shadows: boolean }) {
  const F = CITY.futuro
  const H = CITY.half
  const geo = useMemo(() => {
    const list: BufferGeometry[] = []
    const add = (g: BufferGeometry, color: string, x: number, y: number, z: number, rot = 0) => {
      paint(g, color)
      place(g, placement(x, 0, z, rot), 0, y, 0)
      list.push(g)
    }
    // quiosques
    for (const k of CITY.kiosks) {
      add(new RoundedBoxGeometry(2.6, 2.4, 2.2, 3, 0.3), '#fff4e6', k.x, 1.2, k.z, k.rot)
      const m = placement(k.x, 0, k.z, k.rot)
      const aw = paint(new RoundedBoxGeometry(3.4, 0.3, 1.6, 2, 0.12), k.color)
      place(aw, m, 0, 2.6, 1.5)
      list.push(aw)
      const top = paint(new RoundedBoxGeometry(2.9, 0.3, 2.5, 2, 0.12), k.color)
      place(top, m, 0, 2.5, 0)
      list.push(top)
    }
    // cerca do Bairro Futuro
    const orange = '#ffb347'
    const white = '#fff7ee'
    const post = (x: number, z: number, i: number) => add(new BoxGeometry(0.3, 2.6, 0.3), i % 2 ? orange : white, x, 1.3, z)
    const rail = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0)
      const rot = Math.atan2(x1 - x0, z1 - z0)
      for (const y of [1.0, 2.0]) add(new BoxGeometry(0.15, 0.3, len), orange, (x0 + x1) / 2, y, (z0 + z1) / 2, rot)
    }
    const edges: [number, number, number, number][] = [
      [F.x0, F.z0, F.x1, F.z0],
      [F.x1, F.z0, F.x1, F.z1],
      [F.x1, F.z1, F.x0, F.z1],
      [F.x0, F.z1, F.x0, F.z0],
    ]
    for (const [x0, z0, x1, z1] of edges) {
      const len = Math.hypot(x1 - x0, z1 - z0)
      const cnt = Math.round(len / 4)
      for (let i = 0; i <= cnt; i++) post(x0 + ((x1 - x0) * i) / cnt, z0 + ((z1 - z0) * i) / cnt, i)
      rail(x0, z0, x1, z1)
    }
    // cones de obra perto do portao
    for (let i = 0; i < 10; i++) {
      const cz = -9 + i * 2
      if (Math.abs(cz) < 6.5) continue
      add(new ConeGeometry(0.5, 1.1, 10), '#ff8a3d', F.x1 - 2.4, 0.55, cz)
    }
    for (const cz of [-4.5, 4.5]) add(new RoundedBoxGeometry(1.0, 1.4, 3, 2, 0.2), '#ffb347', F.x1 - 1.2, 0.9, cz)
    // placa "Em breve"
    add(new BoxGeometry(0.4, 5.5, 0.4), '#6a5a7a', F.x1 + 3.5, 2.75, -5)
    add(new BoxGeometry(0.4, 5.5, 0.4), '#6a5a7a', F.x1 + 3.5, 2.75, 5)
    add(new RoundedBoxGeometry(0.5, 3.6, 12, 2, 0.15), '#fff7ee', F.x1 + 3.5, 5.4, 0)
    return merge(list)
  }, [F, H])

  const hedges = useMemo(() => {
    // sebe do perimetro: muro baixo + festao de esferas pastel (mint / rosa / lilas), em trechos de ~70 m
    const cols = ['#a8ecd0', '#fff0a0', '#d9c4fa', '#ffc2b0']
    const out: { geo: BufferGeometry; cx: number; cz: number }[] = []
    const SEG = 70
    const T = 3
    let n = 0
    for (const side of [0, 1, 2, 3]) {
      for (let a0 = -H - 3; a0 < H + 3; a0 += SEG) {
        const a1 = Math.min(a0 + SEG, H + 3)
        const list: BufferGeometry[] = []
        const at = (t: number): [number, number] => (side === 0 ? [t, -H] : side === 1 ? [t, H] : side === 2 ? [-H, t] : [H, t])
        const [mx, mz] = at((a0 + a1) / 2)
        const horizontal = side < 2
        const wallGeo = new RoundedBoxGeometry(horizontal ? a1 - a0 : T, 2.2, horizontal ? T : a1 - a0, 1, 0.9)
        paint(wallGeo, '#b9f0d9')
        wallGeo.translate(mx, 1.1, mz)
        list.push(wallGeo)
        for (let t = a0 + 2.5; t < a1; t += 5) {
          const [x, z] = at(t)
          const r = 2.5 + ((n * 7) % 5) * 0.08
          const g1 = new SphereGeometry(r, 8, 5)
          paint(g1, cols[n % 4])
          g1.translate(x, 3.3, z)
          const g2 = new SphereGeometry(1.5, 7, 4)
          paint(g2, cols[(n + 1) % 4])
          g2.translate(x, 5.2, z)
          list.push(g1, g2)
          n++
        }
        out.push({ geo: merge(list), cx: mx, cz: mz })
      }
    }
    return out
  }, [H])
  const dist = useCullDist()

  const wall = 6 // altura das paredes invisiveis
  return (
    <group>
      <mesh geometry={geo} castShadow={shadows} receiveShadow={shadows}>
        <meshPhysicalMaterial {...PORCELAIN} vertexColors />
      </mesh>

      {hedges.map((h, i) => (
        <Cull key={i} cx={h.cx} cz={h.cz} r={40} max={dist.buildings}>
          <mesh geometry={h.geo} castShadow={shadows} receiveShadow={shadows}>
            <meshPhysicalMaterial {...PORCELAIN} vertexColors />
          </mesh>
        </Cull>
      ))}

      <RigidBody type="fixed" colliders={false}>
        {/* paredes do perimetro */}
        <CuboidCollider args={[H + 3, wall, 1.5]} position={[0, wall, -H]} />
        <CuboidCollider args={[H + 3, wall, 1.5]} position={[0, wall, H]} />
        <CuboidCollider args={[1.5, wall, H + 3]} position={[-H, wall, 0]} />
        <CuboidCollider args={[1.5, wall, H + 3]} position={[H, wall, 0]} />
        {/* cerca do Bairro Futuro */}
        <CuboidCollider args={[(F.x1 - F.x0) / 2, 2, 0.4]} position={[(F.x0 + F.x1) / 2, 2, F.z0]} />
        <CuboidCollider args={[(F.x1 - F.x0) / 2, 2, 0.4]} position={[(F.x0 + F.x1) / 2, 2, F.z1]} />
        <CuboidCollider args={[0.4, 2, (F.z1 - F.z0) / 2]} position={[F.x0, 2, 0]} />
        <CuboidCollider args={[0.4, 2, (F.z1 - F.z0) / 2]} position={[F.x1, 2, 0]} />
      </RigidBody>

      {/* mar ao redor da cidade */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.8, 0]}>
        <planeGeometry args={[1600, 1600]} />
        <meshStandardMaterial color="#8fd0f0" roughness={0.1} metalness={0.2} />
      </mesh>

      <Label text="Em breve" sub="Bairro Futuro" accent="#ffb347" position={[F.x1 + 3.9, 5.4, 0]} height={3.2} />
    </group>
  )
}
