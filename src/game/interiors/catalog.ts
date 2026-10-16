import { Color, Group, Mesh, type Material, type MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { PieceInfo, RoomPalette, SlotName } from './types'

const BASE = import.meta.env.BASE_URL
const ROOT = `${BASE}assets/interiors/`

/** Pecas do cassino (public/assets/casino/): materiais proprios, nao recoloridos. Origem no centro do chao. */
const CASINO: Record<string, PieceInfo> = (() => {
  const mk = (file: string, mn: [number, number, number], mx: [number, number, number], extra: Partial<PieceInfo> = {}): PieceInfo => {
    const size: [number, number, number] = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]]
    return {
      file: `../casino/${file}.glb`,
      tris: 0,
      size,
      bbox_min: mn,
      bbox_max: mx,
      mount: 'floor',
      collider: { type: 'box', size, center: [(mn[0] + mx[0]) / 2, size[1] / 2, (mn[2] + mx[2]) / 2] },
      ...extra,
    }
  }
  return {
    'casino/card_table': mk('card_table', [-1.208, 0, -0.612], [1.208, 0.927, 0.608]),
    'casino/poker_table': mk('poker_table', [-1.305, 0, -0.705], [1.305, 0.79, 0.705]),
    'casino/roulette_table': mk('roulette_table', [-1.535, 0, -0.685], [1.535, 1.117, 0.685]),
    'casino/slot_machine': mk('slot_machine', [-0.41, 0, -0.385], [0.505, 1.9, 0.385]),
    'casino/bar_counter': mk('bar_counter', [-1.56, 0, -0.91], [1.56, 1.98, 0.436]),
    'casino/bar_stool': mk('bar_stool', [-0.242, 0, -0.242], [0.242, 0.76, 0.242], { sit: [{ id: 'sit', pos: [0, 0.72, 0], face: [0, 1] }], collider: undefined }),
    'casino/pillar': mk('pillar', [-0.35, 0, -0.35], [0.35, 3.2, 0.35]),
    'casino/chandelier': mk('chandelier', [-0.613, -0.945, -0.614], [0.613, 0, 0.614], { mount: 'ceiling', collider: undefined }),
    'casino/lamp_floor': mk('lamp_floor', [-0.229, 0, -0.229], [0.229, 1.606, 0.229], { collider: undefined }),
  }
})()

export interface Catalog {
  pieces: Record<string, PieceInfo>
}

let catalogP: Promise<Catalog> | null = null
let catalogV: Catalog | null = null

/** Le interiors.json (uma vez). */
export function loadCatalog(): Promise<Catalog> {
  if (!catalogP) {
    catalogP = fetch(`${ROOT}interiors.json`)
      .then((r) => r.json())
      .then((j: { pieces: Record<string, PieceInfo> }) => {
        catalogV = { pieces: { ...j.pieces, ...CASINO } }
        return catalogV
      })
  }
  return catalogP
}

export const getCatalog = () => catalogV

export function pieceUrl(_key: string, info: PieceInfo): string {
  return `${ROOT}${info.file}`
}

const loader = new GLTFLoader()
const gltfP = new Map<string, Promise<Group>>()
const gltfV = new Map<string, Group>()

export function loadPiece(url: string): Promise<Group> {
  let p = gltfP.get(url)
  if (!p) {
    p = loader.loadAsync(url).then((g) => {
      gltfV.set(url, g.scene)
      return g.scene
    })
    gltfP.set(url, p)
  }
  return p
}

const slotOf = (name: string) => name.split('.')[0] as SlotName

type Std = MeshStandardMaterial & { clearcoat?: number; sheenColor?: Color }

const recolored = new Map<string, Group>()

/** Template recolorido (materiais clonados) para um (arquivo, paleta); as instancias sao `clone(true)` dele. */
function templateFor(url: string, palKey: string, pal: RoomPalette | null): Group | null {
  const src = gltfV.get(url)
  if (!src) return null
  if (!pal) return src
  const key = `${url}|${palKey}`
  let t = recolored.get(key)
  if (t) return t
  t = src.clone(true)
  const mats = new Map<Material, Material>()
  t.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    const fix = (mat: Material): Material => {
      let nm = mats.get(mat)
      if (nm) return nm
      const c = mat.clone() as Std
      const slot = slotOf(mat.name)
      const col = slot === 'trim' ? pal.metal : (pal as unknown as Record<string, string | undefined>)[slot]
      if (col && slot in SLOT_SET) {
        c.color.set(col)
        if (slot === 'glow' || slot === 'glow2') {
          c.emissive.set(col)
        }
        if (slot === 'trim') {
          c.metalness = 1
          c.roughness = pal.metalRough ?? 0.3
        }
      }
      c.name = mat.name
      mats.set(mat, c)
      nm = c
      return nm
    }
    m.material = Array.isArray(m.material) ? m.material.map(fix) : fix(m.material)
  })
  recolored.set(key, t)
  return t
}

const SLOT_SET: Record<string, 1> = { base: 1, accent: 1, accent2: 1, soft: 1, deep: 1, white: 1, fabric: 1, trim: 1, glass: 1, glow: 1, glow2: 1, leaf: 1 }

/** Instancia sincrona (precisa de `loadPiece` ja resolvido). */
export function instantiate(url: string, palKey: string, pal: RoomPalette | null): Group | null {
  const t = templateFor(url, palKey, pal)
  if (!t) return null
  const g = t.clone(true)
  g.traverse((o) => {
    const m = o as Mesh
    if (m.isMesh) {
      m.castShadow = false
      m.receiveShadow = false
    }
  })
  return g
}
