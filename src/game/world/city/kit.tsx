import { useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { Box3, Color, DoubleSide, Float32BufferAttribute, Matrix4, MeshBasicMaterial, MeshPhysicalMaterial, Quaternion, Vector3, type BufferGeometry, type Mesh, type Material } from 'three'
import kitY from './kitY2k.json'
import kitR from './kitRomantic.json'
import kitPP from './propsPlus.json'
import kitPM from './propsMore.json'
import kitPL from './propsLite.json'
import kitLod from './propsLod.json'
import { merge, paint } from './geo'
import { Cull, LodCull, chunkKey, useCullDist } from './cull'
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
const PIECES = { ...kitY.pieces, ...kitR.pieces, ...kitPP.pieces, ...kitPM.pieces, ...kitPL.pieces, ...kitLod.pieces } as unknown as Record<string, { file: string; collider?: Collider }>
/** versao distante (decimada, city_lod.py) de uma peca, se existir */
const lodOf = (p: string): string | undefined => (PIECES['lod_' + p] ? 'lod_' + p : undefined)
const BASE = `${import.meta.env.BASE_URL}assets/city/`
// kits (predios/props do bairro) sao pre-carregados; props de rua (props_plus / props_more) so quando uma cena os usa
Object.keys(PIECES).filter((n) => !PIECES[n].file.startsWith('props_') && !PIECES[n].file.startsWith('lod/')).forEach((n) => useGLTF.preload(BASE + PIECES[n].file))
Object.keys({ ...kitY.pieces, ...kitR.pieces }).forEach((n) => lodOf(n) && useGLTF.preload(BASE + PIECES[lodOf(n)!].file))

type Cls = 'por' | 'metal' | 'glass' | 'glow' | 'water' | 'cloth'
/** pecas de pano (flag_* = bandeira presa no mastro em x=0, banner_* = faixa pendurada): slots de tecido viram a classe 'cloth' (vento) */
const isCloth = (piece: string) => piece.startsWith('flag_') || piece.startsWith('banner_')
const CLOTH_SLOTS = new Set<Slot>(['accent', 'accent2', 'soft', 'white', 'seat'])
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
    cloth: new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.4, side: DoubleSide }),
  }
  // ambiente: porcelana ganha brilho molhado na chuva, janelas acendem a noite, o brilho (neon/globos/placas) cresce a noite
  registerWet(MATS.por as MeshPhysicalMaterial, { roughWet: 0.12, ccWet: 1, dark: 0.08 })
  registerWet(MATS.cloth as MeshPhysicalMaterial, { roughWet: 0.3, ccWet: 0.6, dark: 0.12 })
  nightGlass(MATS.glass as MeshPhysicalMaterial)
  registerGlowColor(MATS.glow as MeshBasicMaterial, 0.8, 1.35)
  return MATS
}

interface Part {
  geo: BufferGeometry
  slot: Slot
  /** pano (vento): geo ganha uv.x = 0 na ponta presa e 1 na ponta livre */
  cloth?: boolean
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
      if (isCloth(name)) {
        const cl = parts.filter((p) => CLOTH_SLOTS.has(p.slot))
        const box = new Box3()
        cl.forEach((p) => box.union((p.geo.computeBoundingBox(), p.geo.boundingBox!)))
        const flag = name.startsWith('flag_')
        for (const p of cl) {
          p.cloth = true
          const pos = p.geo.attributes.position
          const uv = new Float32Array(pos.count * 2)
          for (let i = 0; i < pos.count; i++) {
            uv[i * 2] = flag ? (pos.getX(i) - box.min.x) / Math.max(0.01, box.max.x - box.min.x) : (box.max.y - pos.getY(i)) / Math.max(0.01, box.max.y - box.min.y)
          }
          p.geo.setAttribute('uv', new Float32BufferAttribute(uv, 2))
        }
      }
      out[name] = parts
    })
    return out
  }, [gltfs, names])
}

const _q = new Quaternion()
const _up = new Vector3(0, 1, 0)

const KIT_DATA = { kit: true }
const WALK_DATA = { kit: true, walkable: true }
const CLOTH_DATA = { kit: true, sway: 'flag' }

type Geo = Partial<Record<Cls, BufferGeometry>>
interface Cell {
  cx: number
  cz: number
  r: number
  geo: Geo
  /** versao distante (pecas decimadas) quando algum item da celula tem LOD */
  lo?: Geo
}

function buildCells(items: KitItem[], parts: Record<string, Part[]>, chunk?: number, pad = 14, withLod = false): Cell[] {
  const groups = new Map<number, KitItem[]>()
  for (const it of items) {
    const k = chunk ? Math.floor(it.x / chunk) * 10000 + Math.floor(it.z / chunk) : chunkKey(it.x, it.z)
    const l = groups.get(k)
    if (l) l.push(it)
    else groups.set(k, [it])
  }
  const col = new Color()
  return [...groups.values()].map((list) => {
    const bag: Record<Cls, BufferGeometry[]> = { por: [], metal: [], glass: [], glow: [], water: [], cloth: [] }
    const bagLo: Record<Cls, BufferGeometry[]> = { por: [], metal: [], glass: [], glow: [], water: [], cloth: [] }
    let anyLod = false
    let r = 0
    const cx = list.reduce((a, i) => a + i.x, 0) / list.length
    const cz = list.reduce((a, i) => a + i.z, 0) / list.length
    for (const it of list) {
      const pal = PALETTES[it.pal]
      const s = it.s ?? 1
      const M = new Matrix4().compose(new Vector3(it.x, it.y ?? 0, it.z), _q.setFromAxisAngle(_up, it.rot ?? 0), new Vector3(s, s, s))
      const emit = (name: string, into: Record<Cls, BufferGeometry[]>) => {
        for (const p of parts[name]) {
          const g = p.geo.clone()
          g.applyMatrix4(M)
          paint(g, col.set(slotColor(p.slot, pal, it.over)))
          // versao distante: metal e vidro viram porcelana (menos malhas/chamadas por celula)
          const cls = p.cloth ? 'cloth' : CLASS_OF[p.slot]
          into[into === bagLo && (cls === 'metal' || cls === 'glass') ? 'por' : cls].push(g)
        }
      }
      emit(it.piece, bag)
      if (withLod) {
        const lp = lodOf(it.piece)
        if (lp) anyLod = true
        emit(lp ?? it.piece, bagLo)
      }
      r = Math.max(r, Math.hypot(it.x - cx, it.z - cz) + pad * s)
    }
    const mk = (b: Record<Cls, BufferGeometry[]>): Geo => {
      const g: Geo = {}
      for (const c of Object.keys(b) as Cls[]) if (b[c].length) g[c] = merge(b[c], c === 'cloth')
      return g
    }
    return { cx, cz, r, geo: mk(bag), lo: anyLod ? mk(bagLo) : undefined }
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

/**
 * Cena do kit: itens fundidos por celula (frustum + distancia), 5 materiais compartilhados, colisores do kit.json.
 * `lod` (m): alem dessa distancia a celula troca para as versoes decimadas (lod_<peca>, city_lod.py).
 */
export function KitScene({ items, shadows, cull = 'buildings', max, walkable, chunk, cast = true, pad, lod }: { items: KitItem[]; shadows: boolean; cull?: 'buildings' | 'props'; max?: number; walkable?: boolean; chunk?: number; cast?: boolean; pad?: number; lod?: number }) {
  const names = useMemo(() => {
    const n = new Set(items.map((i) => i.piece))
    if (lod) for (const p of [...n]) { const l = lodOf(p); if (l) n.add(l) }
    return [...n].sort()
  }, [items, lod])
  const parts = useParts(names)
  const dist = useCullDist()
  const cells = useMemo(() => buildCells(items, parts, chunk, pad, !!lod), [items, parts, chunk, pad, lod])
  const mats = kitMaterials()
  const data = walkable ? WALK_DATA : KIT_DATA
  const meshes = (g: Geo) => (
    <>
      {g.por && <mesh userData={data} geometry={g.por} material={mats.por} castShadow={shadows && cast} receiveShadow={shadows} />}
      {g.metal && <mesh userData={data} geometry={g.metal} material={mats.metal} receiveShadow={shadows} />}
      {g.glass && <mesh userData={data} geometry={g.glass} material={mats.glass} renderOrder={3} />}
      {g.glow && <mesh userData={data} geometry={g.glow} material={mats.glow} />}
      {g.water && <mesh userData={data} geometry={g.water} material={mats.water} renderOrder={3} />}
      {g.cloth && <mesh userData={CLOTH_DATA} geometry={g.cloth} material={mats.cloth} receiveShadow={shadows} />}
    </>
  )
  return (
    <group>
      {cells.map((c, i) => {
        const mx = max !== undefined ? Math.min(max, dist[cull]) : dist[cull]
        return c.lo && lod ? (
          <LodCull key={i} cx={c.cx} cz={c.cz} r={c.r} max={mx} lod={lod} lo={meshes(c.lo)}>
            {meshes(c.geo)}
          </LodCull>
        ) : (
          <Cull key={i} cx={c.cx} cz={c.cz} r={c.r} max={mx}>
            {meshes(c.geo)}
          </Cull>
        )
      })}
      <Colliders items={items} />
    </group>
  )
}
