import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
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
import { CENTRO_R } from './centro'
import { romanticReserved } from './romantic'
import './streetProps' // reserva discos (parquinho, piquenique...) antes de filtrar as arvores
import { merge, paint, place, placement } from './geo'
import { Cull, LodCull, chunkKey, useCullDist } from './cull'
import { registerGlowColor, registerGlowEmissive } from '../environment/registry'
import { makeOccludable } from '../../camera/occlusion'

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

/**
 * InstancedMesh dividido em celulas espaciais: frustum culling por celula + corte por distancia.
 * `far` + `lod` (m): alem dessa distancia a celula troca para uma geometria mais simples (mesmas instancias).
 */
function Instances({ geometry, items, shadows, children, cast = true, far, lod = 42 }: { geometry: BufferGeometry; items: Inst[]; shadows: boolean; children: ReactNode; cast?: boolean; far?: BufferGeometry; lod?: number }) {
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
      {chunks.map((c, i) =>
        far ? (
          <LodCull
            key={i}
            cx={c.cx}
            cz={c.cz}
            r={c.r}
            max={dist.props}
            lod={lod}
            lo={
              <InstChunk geometry={far} items={c.list} shadows={shadows} cast={cast}>
                {children}
              </InstChunk>
            }
          >
            <InstChunk geometry={geometry} items={c.list} shadows={shadows} cast={cast}>
              {children}
            </InstChunk>
          </LodCull>
        ) : (
          <Cull key={i} cx={c.cx} cz={c.cz} r={c.r} max={dist.props}>
            <InstChunk geometry={geometry} items={c.list} shadows={shadows} cast={cast}>
              {children}
            </InstChunk>
          </Cull>
        ),
      )}
    </>
  )
}

// ------------------------------------------------------------------ arvores

const MINT = ['#5fa05a', '#6cae62', '#549a52']
const SAGE = ['#7fae6a', '#8cb976', '#6f9f60']
const BLUSH = ['#c9663a', '#d98a3a', '#b85a34']
const LILAC = ['#4d8a58', '#5a9660', '#437d4f']
const CORAL = ['#3f7f4f', '#4a8a56', '#37744a']
const LEMON = ['#a8c35a', '#b6cf68', '#9ab850']
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


/** o scanner de vento (life/scanner.ts) decide pelo `geometry.type`: troncos = 'CylinderGeometry' (parados), copas = qualquer outro (balancam) */
const retype = (g: BufferGeometry, t: string) => {
  Object.defineProperty(g, 'type', { value: t, writable: true })
}

/** deslocamento determinístico (ruido de vertice) para copas e folhagem "irregulares" */
function lumpy(g: BufferGeometry, amp: number, seed: number): BufferGeometry {
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const n = Math.sin(x * 5.3 + seed) * Math.cos(z * 4.7 - seed * 1.3) + Math.sin(y * 6.1 + seed * 0.7) * 0.6
    const k = 1 + amp * n
    p.setXYZ(i, x * k, y * k, z * k)
  }
  g.computeVertexNormals()
  return g
}

/** pinta tons de luz/sombra por altura (multiplica a cor de instancia): base escura, topo claro */
function shadeByHeight(g: BufferGeometry, lo: number, hi: number, y0: number, y1: number): BufferGeometry {
  const p = g.attributes.position
  const c = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) {
    const t = Math.min(1, Math.max(0, (p.getY(i) - y0) / (y1 - y0)))
    const k = lo + (hi - lo) * t
    c[i * 3] = k
    c[i * 3 + 1] = k * 1.01
    c[i * 3 + 2] = k * 0.97
  }
  g.setAttribute('color', new Float32BufferAttribute(c, 3))
  return g
}

/** Copa "de folhagem": 7 massas achatadas e irregulares (nuvem de folhas) em vez de uma bola; raio ~1, altura ~1.45. Perto das arvores apenas. */
function canopyCluster(): BufferGeometry {
  const lobes: [number, number, number, number, number][] = [
    [0, 0.05, 0, 0.78, 0.82],
    [0.62, -0.12, 0.22, 0.5, 0.78],
    [-0.58, -0.1, -0.28, 0.54, 0.8],
    [0.12, -0.16, -0.66, 0.46, 0.76],
    [-0.28, -0.12, 0.62, 0.48, 0.78],
    [-0.2, 0.52, 0.18, 0.5, 0.8],
    [0.3, 0.6, -0.22, 0.4, 0.78],
  ]
  const list: BufferGeometry[] = lobes.map(([x, y, z, r, sy], i) => {
    const g = new SphereGeometry(r, 8, 6)
    g.scale(1, sy, 1)
    lumpy(g, 0.14, i * 1.7)
    g.translate(x, y, z)
    return g
  })
  const g = merge(list)
  g.translate(0, -0.3, 0) // centro na origem, como a esfera unitaria que ela substitui
  g.scale(1, 1.2, 1)
  shadeByHeight(g, 0.74, 1.12, -0.95, 0.95)
  retype(g, 'CanopyGeometry')
  return g
}

/** Pinheiro/cone em 3 andares sobrepostos (copa em camadas), unidade de altura 1. */
function tieredCone(): BufferGeometry {
  const list: BufferGeometry[] = []
  const tiers: [number, number, number][] = [[1.0, 0.5, 0.0], [0.76, 0.46, 0.26], [0.5, 0.42, 0.52]]
  for (const [r, h, y] of tiers) {
    const c = new ConeGeometry(r, h * 1.15, 10)
    lumpy(c, 0.05, y * 9)
    c.translate(0, y + h * 0.5, 0)
    list.push(c)
  }
  const g = merge(list)
  g.translate(0, -0.5, 0) // mesma caixa do cone unitario (-0,5..0,5)
  shadeByHeight(g, 0.76, 1.12, -0.5, 0.5)
  retype(g, 'CanopyGeometry')
  return g
}

/** Tronco com alargamento na base e 3 galhos que sobem para dentro da copa (coordenadas unitarias; y escalado pela altura do tronco). */
function forkedTrunk(): BufferGeometry {
  const list: BufferGeometry[] = []
  const base = new CylinderGeometry(0.14, 0.2, 1, 8, 1)
  list.push(base)
  const flare = new CylinderGeometry(0.2, 0.34, 0.1, 8, 1)
  flare.translate(0, -0.45, 0)
  list.push(flare)
  const arms: [number, number][] = [[0.34, 0.1], [-0.3, 0.2], [0.04, -0.34]]
  for (const [dx, dz] of arms) {
    const a = new CylinderGeometry(0.035, 0.08, 0.36, 6, 1)
    a.translate(0, 0.18, 0)
    a.rotateZ(-dx * 1.4)
    a.rotateX(dz * 1.4)
    a.translate(0, 0.46, 0)
    list.push(a)
  }
  const g = merge(list)
  retype(g, 'CylinderGeometry') // o scanner de vento trata como tronco (nao balanca)
  return g
}

/** Palmeira estilizada: vaso branco + tronco em curva (segmentos) + folhas pastel. */
function palmGeometries(): { base: BufferGeometry; leaves: BufferGeometry } {
  const base: BufferGeometry[] = []
  const pot = new CylinderGeometry(0.75, 0.6, 0.9, 10)
  pot.translate(0, 0.45, 0)
  base.push(paint(pot, '#b9a98c'))
  let x = 0
  let y = 0.9
  for (let i = 0; i < 5; i++) {
    const tilt = 0.09 * (i + 1)
    const seg = new CylinderGeometry(0.17 - i * 0.015, 0.2 - i * 0.015, 0.9, 10)
    seg.rotateZ(-tilt)
    seg.translate(x + Math.sin(tilt) * 0.45, y + Math.cos(tilt) * 0.45, 0)
    x += Math.sin(tilt) * 0.9
    y += Math.cos(tilt) * 0.9
    base.push(paint(seg, i % 2 ? '#8a6a48' : '#9a7a54'))
  }
  const leaves: BufferGeometry[] = []
  const cols = ['#5fa05a', '#4a8a52', '#6cae62', '#7fb86a']
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

/** Arvores do layout, menos as que cairiam em cima de casas, ponte, lago, vasos e postes do kit romantico. */
const TREES = CITY.trees.filter((t) => !romanticReserved(t.x, t.z, 1.2))

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
    for (const t of TREES) {
      const s = t.s
      const rot = t.tint * 6.28
      switch (t.kind) {
        case 'lollipop': {
          const th = 2.5 * s
          trunks.push({ x: t.x, y: th / 2, z: t.z, sx: s, sy: th, sz: s, color: '#7a5a3e' })
          rings.push({ x: t.x, y: th * 0.42, z: t.z, sx: s, sy: s, sz: s })
          round.push({ x: t.x, y: th + 0.9 * s, z: t.z, sx: 1.45 * s, sy: 1.35 * s, sz: 1.45 * s, color: pal(t.tint) })
          break
        }
        case 'heart': {
          const th = 2.3 * s
          trunks.push({ x: t.x, y: th / 2, z: t.z, sx: s, sy: th, sz: s, color: '#7a5a3e' })
          rings.push({ x: t.x, y: th * 0.42, z: t.z, sx: s, sy: s, sz: s })
          heart.push({ x: t.x, y: th + 1.2 * s, z: t.z, rot, sx: 1.7 * s, sy: 1.7 * s, sz: 1.5 * s, color: [BLUSH, CORAL, LEMON][Math.floor(t.tint * 3) % 3][Math.floor(t.tint * 9) % 3] })
          break
        }
        case 'cone': {
          const th = 1.3 * s
          trunks.push({ x: t.x, y: th / 2, z: t.z, sx: s, sy: th, sz: s, color: '#7a5a3e' })
          rings.push({ x: t.x, y: th * 0.5, z: t.z, sx: s, sy: s, sz: s })
          cone.push({ x: t.x, y: th + 2.2 * s, z: t.z, sx: 1.6 * s, sy: 4.4 * s, sz: 1.6 * s, color: t.tint < 0.5 ? MINT[Math.floor(t.tint * 6) % 3] : LILAC[Math.floor(t.tint * 6) % 3] })
          break
        }
        case 'blossom': {
          const th = 2.6 * s
          trunks.push({ x: t.x, y: th / 2, z: t.z, sx: s, sy: th, sz: s, color: '#7a5a3e' })
          rings.push({ x: t.x, y: th * 0.42, z: t.z, sx: s, sy: s, sz: s })
          blossom.push({ x: t.x, y: th + 0.9 * s, z: t.z, rot, sx: 1.5 * s, sy: 1.5 * s, sz: 1.5 * s, color: ['#f2b8cf', '#f7d0d8', '#fbe8ec'][Math.floor(t.tint * 3) % 3] })
          break
        }
        case 'orb': {
          const th = 3.4 * s
          trunks.push({ x: t.x, y: th / 2, z: t.z, sx: 0.45 * s, sy: th, sz: 0.45 * s, color: '#6f5438' })
          orbs.push({ x: t.x, y: th + 1.1 * s, z: t.z, sx: 1.25 * s, sy: 1.25 * s, sz: 1.25 * s, color: ['#6fae6a', '#5ea062', '#7dba72'][Math.floor(t.tint * 3) % 3] })
          orbRings.push({ x: t.x, y: th + 1.1 * s, z: t.z, rot, sx: 1.25 * s, sy: 1.25 * s, sz: 1.25 * s, color: t.tint < 0.5 ? '#d8c27a' : '#c9a15a' })
          break
        }
        case 'palm':
          palmBase.push({ x: t.x, y: 0, z: t.z, rot, sx: s, sy: s, sz: s })
          palmLeaves.push({ x: t.x, y: 0, z: t.z, rot, sx: s, sy: s, sz: s })
          break
        case 'dark': {
          const th = 2.6 * s
          trunks.push({ x: t.x, y: th / 2, z: t.z, sx: 1.2 * s, sy: th, sz: 1.2 * s, color: '#2a2a30' })
          darkTop.push({ x: t.x, y: th + 1.2 * s, z: t.z, sx: 1.5 * s, sy: 1.5 * s, sz: 1.5 * s, color: ['#1f4a44', '#1a3f46', '#24524a'][Math.floor(t.tint * 3) % 3] })
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
      trunk: forkedTrunk(),
      ring: new TorusGeometry(0.22, 0.05, 4, 10).rotateX(Math.PI / 2),
      sphere: paint(new SphereGeometry(1, 14, 9), '#ffffff'),
      heart: heartGeometry(),
      cone: paint(new ConeGeometry(1, 1, 14), '#ffffff'),
      tiers: tieredCone(),
      cluster: canopyCluster(),
      blossom: blossomGeometry(),
      orbRing: new TorusGeometry(1.32, 0.035, 4, 28).rotateX(Math.PI / 2 + 0.5),
      darkRing: new TorusGeometry(1.1, 0.045, 4, 24).rotateX(Math.PI / 2 - 0.45),
      palmBase: palm.base,
      palmLeaves: palm.leaves,
    }
  }, [])

  const colliders = useMemo(() => TREES.map((t) => ({ x: t.x, z: t.z, r: t.kind === 'palm' ? 0.7 : 0.3 })), [])

  return (
    <group>
      <Instances geometry={geos.trunk} items={data.trunks} shadows={shadows}>
        <meshPhysicalMaterial {...PORCELAIN} color="#ffffff" />
      </Instances>
      <Instances geometry={geos.ring} items={data.rings} shadows={false}>
        <meshPhysicalMaterial color="#f0c35a" metalness={0.9} roughness={0.25} clearcoat={0.5} />
      </Instances>
      <Instances geometry={geos.cluster} far={geos.sphere} lod={34} items={data.round} shadows={shadows}>
        <meshPhysicalMaterial ref={(m) => m && makeOccludable(m)} {...PORCELAIN} color="#ffffff" vertexColors />
      </Instances>
      <Instances geometry={geos.heart} items={data.heart} shadows={shadows}>
        <meshPhysicalMaterial ref={(m) => m && makeOccludable(m)} {...PORCELAIN} color="#ffffff" />
      </Instances>
      <Instances geometry={geos.tiers} far={geos.cone} lod={34} items={data.cone} shadows={shadows}>
        <meshPhysicalMaterial ref={(m) => m && makeOccludable(m)} {...PORCELAIN} color="#ffffff" vertexColors />
      </Instances>
      <Instances geometry={geos.blossom} items={data.blossom} shadows={shadows}>
        <meshPhysicalMaterial ref={(m) => m && makeOccludable(m)} {...PORCELAIN} color="#ffffff" />
      </Instances>
      <Instances geometry={geos.sphere} items={data.orbs} shadows={shadows}>
        <meshPhysicalMaterial ref={(m) => m && makeOccludable(m)} color="#ffffff" roughness={0.12} clearcoat={1} clearcoatRoughness={0.08} iridescence={0.8} iridescenceIOR={1.4} metalness={0.15} />
      </Instances>
      <Instances geometry={geos.orbRing} items={data.orbRings} shadows={false}>
        <meshBasicMaterial ref={(m) => m && registerGlowColor(m, 0.85, 1.3)} color="#ffffff" toneMapped={false} />
      </Instances>
      <Instances geometry={geos.palmBase} items={data.palmBase} shadows={shadows}>
        <meshPhysicalMaterial ref={(m) => m && makeOccludable(m)} {...PORCELAIN} vertexColors />
      </Instances>
      <Instances geometry={geos.palmLeaves} items={data.palmLeaves} shadows={shadows}>
        <meshPhysicalMaterial ref={(m) => m && makeOccludable(m)} {...PORCELAIN} vertexColors side={2} />
      </Instances>
      <Instances geometry={geos.sphere} items={data.darkTop} shadows={shadows}>
        <meshPhysicalMaterial ref={(m) => m && makeOccludable(m)} color="#ffffff" roughness={0.2} clearcoat={1} clearcoatRoughness={0.1} />
      </Instances>
      <Instances geometry={geos.darkRing} items={data.darkRing} shadows={false}>
        <meshBasicMaterial ref={(m) => m && registerGlowColor(m, 0.85, 1.3)} color="#ffffff" toneMapped={false} />
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
      emissive: emissive ? src.emissive : new Color(0x000000),
      emissiveIntensity: emissive ? Math.min(src.emissiveIntensity, 1.6) : 0,
      roughness: 0.28,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
    })
    // globos dos postes: apagados de dia, acesos a noite
    if (emissive) registerGlowEmissive(m as MeshPhysicalMaterial, Math.min(src.emissiveIntensity, 1.6) * 0.22, Math.min(src.emissiveIntensity, 1.6) * 1.5)
    toyCache.set(src, m)
  }
  return m
}

/** Instancia todas as malhas de um GLB do kit (1 draw call por malha/material). */
function KitInstances({ url, items, shadows, fade }: { url: string; items: { x: number; z: number; rot?: number }[]; shadows: boolean; fade?: boolean }) {
  const gltf = useGLTF(url)
  const parts = useMemo(() => {
    gltf.scene.updateMatrixWorld(true)
    const out: { geo: BufferGeometry; mat: Material }[] = []
    gltf.scene.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      const g = m.geometry.clone()
      g.applyMatrix4(m.matrixWorld)
      const mat = toyMaterial(m.material as MeshStandardMaterial)
      out.push({ geo: g, mat: fade ? makeOccludable(mat) : mat })
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
const inCentro = (x: number, z: number) => Math.hypot(x, z) < CENTRO_R
/** Parque do Lago + Jardim Romantico: postes e bancos vem do kit romantico (romantic.ts). */
const inRomantic = (x: number, z: number) => z > 60 && z < 215 && Math.abs(x) < 80

export function Lamps({ shadows }: { shadows: boolean }) {
  const sets = useMemo(() => {
    const lampsY = CITY.lamps.filter((l) => isY2k(l.x, l.z) && !inCentro(l.x, l.z))
    const lampsR = CITY.lamps.filter((l) => !isY2k(l.x, l.z) && !inRomantic(l.x, l.z))
    const benchY = CITY.benches.filter((b) => isY2k(b.x, b.z) && !inCentro(b.x, b.z)).map((b) => ({ x: b.x, z: b.z, rot: b.rot }))
    const benchR = CITY.benches.filter((b) => !isY2k(b.x, b.z) && !inRomantic(b.x, b.z)).map((b) => ({ x: b.x, z: b.z, rot: b.rot }))
    return { lampsY, lampsR, benchY, benchR }
  }, [])
  return (
    <group>
      <KitInstances url={URL_LAMP_Y2K} items={sets.lampsY} shadows={shadows} fade />
      <KitInstances url={URL_LAMP_ROCOCO} items={sets.lampsR} shadows={shadows} fade />
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
      add(new RoundedBoxGeometry(2.6, 2.4, 2.2, 3, 0.3), '#d9cfb8', k.x, 1.2, k.z, k.rot)
      const m = placement(k.x, 0, k.z, k.rot)
      const aw = paint(new RoundedBoxGeometry(3.4, 0.3, 1.6, 2, 0.12), k.color)
      place(aw, m, 0, 2.6, 1.5)
      list.push(aw)
      const top = paint(new RoundedBoxGeometry(2.9, 0.3, 2.5, 2, 0.12), k.color)
      place(top, m, 0, 2.5, 0)
      list.push(top)
      // acabamento: franja festonada do toldo, balcao com friso, caixilhos da vitrine e lanterna no teto
      for (let i = 0; i < 9; i++) {
        const f = paint(new CylinderGeometry(0.17, 0.17, 0.05, 8).rotateX(Math.PI / 2), i % 2 ? '#fff7ee' : k.color)
        place(f, m, -1.6 + i * 0.4, 2.47, 2.3)
        list.push(f)
      }
      const ledge = paint(new RoundedBoxGeometry(2.9, 0.1, 0.5, 1, 0.04), '#c9b896')
      place(ledge, m, 0, 1.05, 1.28)
      list.push(ledge)
      for (const gx of [-0.9, 0, 0.9]) {
        const mu = paint(new BoxGeometry(0.06, 1.1, 0.06), '#7a6a52')
        place(mu, m, gx, 1.65, 1.13)
        list.push(mu)
      }
      const lant = paint(new SphereGeometry(0.2, 10, 6), '#ffe9b0')
      place(lant, m, 0, 2.95, 0)
      list.push(lant)
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
    const cols = ['#4f8f4f', '#5f9f55', '#3f7a48', '#6aa85a']
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
        paint(wallGeo, '#4a8a4c')
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
        <meshStandardMaterial color="#3f8aa8" roughness={0.1} metalness={0.2} />
      </mesh>

      <Label text="Em breve" sub="Bairro Futuro" accent="#ffb347" position={[F.x1 + 3.9, 5.4, 0]} height={3.2} />
    </group>
  )
}
