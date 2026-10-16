import { useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { Color, DoubleSide, Matrix4, MeshBasicMaterial, MeshPhysicalMaterial, Quaternion, Vector3, type BufferGeometry, type Mesh, type Material } from 'three'
import kitY from './kitY2k.json'
import kitR from './kitRomantic.json'
import kitPP from './propsPlus.json'
import kitPM from './propsMore.json'
import kitPL from './propsLite.json'
import { merge, paint } from './geo'
import { Cull, chunkKey, useCullDist } from './cull'
import { nightGlass, registerGlowColor, registerWet } from '../environment/registry'

/**
 * Kit Y2K (public/assets/city/kit_y2k + kitY2k.json, gerado por tools/blender/city_kit_y2k.py).
 * Cada peca do GLB tem materiais por SLOT; aqui o slot vira COR DE VERTICE conforme a paleta do predio
 * e as pecas de uma celula espacial sao fundidas em poucas malhas (porcelana, metal, vidro, brilho, agua),
 * com 5 materiais compartilhados em toda a cidade. Resultado: ~4 draw calls por celula.
 * O kit ROMANTICO (public/assets/city/kit + kitRomantic.json, tools/blender/city_kit.py) usa o mesmo formato e e fundido aqui
 * (paletas e metais com chaves distintas; slot extra 'seat' = estofado).
 */

export type Slot = 'base' | 'accent' | 'accent2' | 'soft' | 'deep' | 'white' | 'trim' | 'glass' | 'glow' | 'glow2' | 'leaf' | 'water' | 'seat'
type PaletteDef = { base: string; accent: string; accent2: string; soft: string; deep: string; white: string; glass: string; glow: string; glow2?: string; seat?: string; metal: string }
type PaletteDefX = PaletteDef & { leaf?: string }
export const PALETTES = { ...kitY.palettes, ...kitR.palettes, ...kitPP.palettes, ...kitPM.palettes, ...kitPL.palettes } as unknown as Record<string, PaletteDefX>
const METALS = { ...kitY.metals, ...kitR.metals, ...kitPP.metals, ...kitPM.metals, ...kitPL.metals } as Record<string, { color: string; roughness: number; metallic: number }>

export interface KitItem {
  piece: string
  x: number
  z: number
  y?: number
  rot?: number
  s?: number
  pal: string
  /** cores que substituem slots da paleta (ex.: cor da loja) */
  over?: Partial<Record<Slot, string>>
  /** false = sem colisor */
  collide?: boolean
}

type Collider = { type: 'cylinder' | 'box' | 'boxes'; size: number[] | number[][]; center: number[] | null }
const PIECES = { ...kitY.pieces, ...kitR.pieces, ...kitPP.pieces, ...kitPM.pieces, ...kitPL.pieces } as unknown as Record<string, { file: string; collider?: Collider }>
const BASE = `${import.meta.env.BASE_URL}assets/city/`
// kits (predios/props do bairro) sao pre-carregados; props de rua (props_plus / props_more) so quando uma cena os usa
Object.keys(PIECES).filter((n) => !PIECES[n].file.startsWith('props_')).forEach((n) => useGLTF.preload(BASE + PIECES[n].file))

type Cls = 'por' | 'metal' | 'glass' | 'glow' | 'water'
const CLASS_OF: Record<Slot, Cls> = {
  base: 'por', seat: 'por', accent: 'por', accent2: 'por', soft: 'por', deep: 'por', white: 'por', leaf: 'por', trim: 'metal', glass: 'glass', glow: 'glow', glow2: 'glow', water: 'water',
}

function slotColor(slot: Slot, p: PaletteDefX, over?: Partial<Record<Slot, string>>): string {
  if (over && over[slot]) return over[slot]!
  if (slot === 'trim') return METALS[p.metal].color
  if (slot === 'leaf') return p.leaf ?? '#5f9a58'
  if (slot === 'water') return '#a8d4e0'
  if (slot === 'glass') return new Color(p.glass).lerp(new Color('#ffffff'), 0.55).getStyle()
  if (slot === 'seat') return p.seat ?? p.base
  return p[slot] ?? p.base
}

// materiais compartilhados (um por classe, para a cidade toda)
let MATS: Record<Cls, Material> | null = null
export function kitMaterials(): Record<Cls, Material> {
  if (MATS) return MATS
  MATS = {
    // porcelana / vinil de brinquedo
    por: new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.9 }),
    // ouro-joia / perola / cromo (a cor vem do vertice; leve iridescencia perolada)
    metal: new MeshPhysicalMaterial({ vertexColors: true, metalness: 0.72, roughness: 0.22, envMapIntensity: 3, iridescence: 0.5, iridescenceIOR: 1.4, iridescenceThicknessRange: [150, 450] }),
    // vidro perolado Y2K
    glass: new MeshPhysicalMaterial({
      vertexColors: true, transparent: true, opacity: 0.62, roughness: 0.05, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03,
      iridescence: 1, iridescenceIOR: 1.5, iridescenceThicknessRange: [220, 780], envMapIntensity: 2.2, depthWrite: false, side: DoubleSide,
    }),
    glow: new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    water: new MeshPhysicalMaterial({ vertexColors: true, transparent: true, opacity: 0.5, roughness: 0.02, clearcoat: 1, envMapIntensity: 1.5, depthWrite: false }),
  }
  // ambiente: porcelana ganha brilho molhado na chuva, janelas acendem a noite, o brilho (neon/globos/placas) cresce a noite
  registerWet(MATS.por as MeshPhysicalMaterial, { roughWet: 0.12, ccWet: 1, dark: 0.08 })
  nightGlass(MATS.glass as MeshPhysicalMaterial)
  registerGlowColor(MATS.glow as MeshBasicMaterial, 0.8, 1.35)
  return MATS
}

interface Part {
  geo: BufferGeometry
  slot: Slot
}

/** Carrega todos os GLBs do kit e devolve as geometrias (ja no espaco da peca) por slot. */
function useParts(names: string[]): Record<string, Part[]> {
  const gltfs = useGLTF(names.map((n) => BASE + PIECES[n].file))
  return useMemo(() => {
    const out: Record<string, Part[]> = {}
    names.forEach((name, i) => {
      const scene = gltfs[i].scene
      scene.updateMatrixWorld(true)
      const parts: Part[] = []
      scene.traverse((o) => {
        const m = o as Mesh
        if (!m.isMesh) return
        const g = m.geometry.clone()
        g.applyMatrix4(m.matrixWorld)
        const mat = m.material as Material
        parts.push({ geo: g, slot: mat.name.split(/[@.]/)[0] as Slot })
      })
      out[name] = parts
    })
    return out
  }, [gltfs, names])
}

const _q = new Quaternion()
const _up = new Vector3(0, 1, 0)

const KIT_DATA = { kit: true }
const WALK_DATA = { kit: true, walkable: true }

interface Cell {
  cx: number
  cz: number
  r: number
  geo: Partial<Record<Cls, BufferGeometry>>
}

function buildCells(items: KitItem[], parts: Record<string, Part[]>, chunk?: number, pad = 14): Cell[] {
  const groups = new Map<number, KitItem[]>()
  for (const it of items) {
    const k = chunk ? Math.floor(it.x / chunk) * 10000 + Math.floor(it.z / chunk) : chunkKey(it.x, it.z)
    const l = groups.get(k)
    if (l) l.push(it)
    else groups.set(k, [it])
  }
  const col = new Color()
  return [...groups.values()].map((list) => {
    const bag: Record<Cls, BufferGeometry[]> = { por: [], metal: [], glass: [], glow: [], water: [] }
    let r = 0
    const cx = list.reduce((a, i) => a + i.x, 0) / list.length
    const cz = list.reduce((a, i) => a + i.z, 0) / list.length
    for (const it of list) {
      const pal = PALETTES[it.pal]
      const s = it.s ?? 1
      const M = new Matrix4().compose(new Vector3(it.x, it.y ?? 0, it.z), _q.setFromAxisAngle(_up, it.rot ?? 0), new Vector3(s, s, s))
      for (const p of parts[it.piece]) {
        const g = p.geo.clone()
        g.applyMatrix4(M)
        paint(g, col.set(slotColor(p.slot, pal, it.over)))
        bag[CLASS_OF[p.slot]].push(g)
      }
      r = Math.max(r, Math.hypot(it.x - cx, it.z - cz) + pad * s)
    }
    const geo: Cell['geo'] = {}
    for (const c of Object.keys(bag) as Cls[]) if (bag[c].length) geo[c] = merge(bag[c])
    return { cx, cz, r, geo }
  })
}

/** Colisores do kit (cuboid/cilindro) para os itens posicionados. */
function Colliders({ items }: { items: KitItem[] }) {
  const nodes: ReactNode[] = []
  items.forEach((it, n) => {
    if (it.collide === false) return
    const c = PIECES[it.piece].collider
    if (!c) return
    const s = it.s ?? 1
    const rot = it.rot ?? 0
    const cs = Math.cos(rot)
    const sn = Math.sin(rot)
    const at = (lx: number, ly: number, lz: number): [number, number, number] => [it.x + (lx * cs + lz * sn) * s, (it.y ?? 0) + ly * s, it.z + (-lx * sn + lz * cs) * s]
    if (c.type === 'cylinder') {
      const [r, h] = c.size as number[]
      const ce = c.center ?? [0, h / 2, 0]
      nodes.push(<CylinderCollider key={n} args={[(h / 2) * s, r * s]} position={at(ce[0], ce[1], ce[2])} />)
    } else if (c.type === 'box') {
      const [w, h, d] = c.size as number[]
      const ce = c.center ?? [0, h / 2, 0]
      nodes.push(<CuboidCollider key={n} args={[(w / 2) * s, (h / 2) * s, (d / 2) * s]} position={at(ce[0], ce[1], ce[2])} rotation={[0, rot, 0]} />)
    } else {
      ;(c.size as number[][]).forEach((b, j) => {
        nodes.push(<CuboidCollider key={`${n}-${j}`} args={[(b[0] / 2) * s, (b[1] / 2) * s, (b[2] / 2) * s]} position={at(b[3], b[4], b[5])} rotation={[0, rot, 0]} />)
      })
    }
  })
  return (
    <RigidBody type="fixed" colliders={false}>
      {nodes}
    </RigidBody>
  )
}

/** Cena do kit: itens fundidos por celula (frustum + distancia), 5 materiais compartilhados, colisores do kit.json. */
export function KitScene({ items, shadows, cull = 'buildings', max, walkable, chunk, cast = true, pad }: { items: KitItem[]; shadows: boolean; cull?: 'buildings' | 'props'; max?: number; walkable?: boolean; chunk?: number; cast?: boolean; pad?: number }) {
  const names = useMemo(() => [...new Set(items.map((i) => i.piece))].sort(), [items])
  const parts = useParts(names)
  const dist = useCullDist()
  const cells = useMemo(() => buildCells(items, parts, chunk, pad), [items, parts, chunk, pad])
  const mats = kitMaterials()
  const data = walkable ? WALK_DATA : KIT_DATA
  return (
    <group>
      {cells.map((c, i) => (
        <Cull key={i} cx={c.cx} cz={c.cz} r={c.r} max={max !== undefined ? Math.min(max, dist[cull]) : dist[cull]}>
          {c.geo.por && <mesh userData={data} geometry={c.geo.por} material={mats.por} castShadow={shadows && cast} receiveShadow={shadows} />}
          {c.geo.metal && <mesh userData={data} geometry={c.geo.metal} material={mats.metal} receiveShadow={shadows} />}
          {c.geo.glass && <mesh userData={data} geometry={c.geo.glass} material={mats.glass} renderOrder={3} />}
          {c.geo.glow && <mesh userData={data} geometry={c.geo.glow} material={mats.glow} />}
          {c.geo.water && <mesh userData={data} geometry={c.geo.water} material={mats.water} renderOrder={3} />}
        </Cull>
      ))}
      <Colliders items={items} />
    </group>
  )
}
