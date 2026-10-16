/**
 * Layout da cidade: dados puros (sem three.js), em metros.
 * Eixos: +X = leste, +Z = sul, -Z = norte (o mapa/minimapa fica com o norte para cima).
 * Tudo e deterministico (semente fixa), entao o mesmo layout pode alimentar o jogo,
 * o minimapa e, no futuro, o servidor.
 */

import { AIRPORT_POI, AIRPORT_ROAD } from '../../travel/airportSite'

export type DistrictStyle = 'y2k' | 'luxo' | 'neon' | 'romantico' | 'futuro'
export type Vec2 = readonly [number, number]

export type Shape =
  | { t: 'rect'; x0: number; z0: number; x1: number; z1: number }
  | { t: 'circle'; cx: number; cz: number; r: number }

export interface District {
  id: string
  name: string
  style: DistrictStyle
  center: Vec2
  bounds: Shape
  ground: string
  /** cores de fachada (placeholder) */
  palette: string[]
  /** cores de acento (faixas neon, telhados...) */
  accent: string[]
  /** onde o jogador nasce com ?spawn=<id> */
  spawn: Vec2
}

export type RoadKind = 'avenue' | 'street' | 'path'
export interface Road {
  id: string
  name?: string
  kind: RoadKind
  /** largura total (calcada + pista) */
  width: number
  points: Vec2[]
}

export type AreaKind = 'praca' | 'parque' | 'lago'
export interface OpenArea {
  id: string
  name: string
  kind: AreaKind
  bounds: Shape
  color: string
  spawn?: Vec2
}

export type BlockShape = 'box' | 'cyl' | 'house'
export interface Block {
  id: string
  x: number
  z: number
  /** largura (eixo local X) e profundidade (eixo local Z; a frente e +Z local) */
  w: number
  d: number
  h: number
  /** giro em Y (rad); a frente do predio aponta para (sin rot, cos rot) */
  rot: number
  district: string
  shape: BlockShape
  colorIdx: number
  accentIdx: number
  label?: string
  /** id do POI de loja, se for uma loja */
  shopId?: string
  /** Centro (kit Y2K): 0 = predio base, 1 = esguio, 2 = largo; para 'box': 0 = loja baixa + torre, 1 = dois andares, 2 = loja larga */
  variant?: number
}

export interface Poi {
  id: string
  name: string
  kind: 'spawn' | 'shop' | 'landmark'
  x: number
  z: number
  /** direcao para onde a porta olha (rad; (sin, cos) = vetor para fora) */
  facing: number
  district: string
  /** letra do mapa */
  icon: string
  color: string
}

export interface Lamp {
  x: number
  z: number
  kind: 'warm' | 'neon'
  color: string
}
export interface Bench {
  x: number
  z: number
  rot: number
}
export interface Tree {
  x: number
  z: number
  s: number
  kind: 'lollipop' | 'heart' | 'cone' | 'blossom' | 'orb' | 'palm' | 'dark'
  tint: number
}
export interface Kiosk {
  x: number
  z: number
  rot: number
  color: string
}

export interface City {
  half: number
  ground: string
  districts: District[]
  roads: Road[]
  areas: OpenArea[]
  blocks: Block[]
  pois: Poi[]
  lamps: Lamp[]
  benches: Bench[]
  trees: Tree[]
  kiosks: Kiosk[]
  spawns: Record<string, Vec2>
  /** retangulo fechado do Bairro Futuro */
  futuro: { x0: number; z0: number; x1: number; z1: number }
  lake: { cx: number; cz: number; r: number }
}

// ---------------------------------------------------------------- utilidades

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax
  const dz = bz - az
  const l2 = dx * dx + dz * dz
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz))
}

export function distToPolyline(px: number, pz: number, pts: readonly Vec2[]): number {
  let best = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distToSegment(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])
    if (d < best) best = d
  }
  return best
}

export function inShape(s: Shape, x: number, z: number, margin = 0): boolean {
  if (s.t === 'circle') return Math.hypot(x - s.cx, z - s.cz) <= s.r + margin
  return x >= s.x0 - margin && x <= s.x1 + margin && z >= s.z0 - margin && z <= s.z1 + margin
}

export function polylineLength(pts: readonly Vec2[]): number {
  let l = 0
  for (let i = 0; i < pts.length - 1; i++) l += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
  return l
}

/** Largura da calcada (cada lado) por tipo de via; o resto e pista. */
export const ROAD_SPEC: Record<RoadKind, { width: number; sidewalk: number }> = {
  avenue: { width: 12, sidewalk: 2 },
  street: { width: 8, sidewalk: 1.5 },
  path: { width: 4, sidewalk: 0 },
}

const ring = (cx: number, cz: number, r: number, n: number): Vec2[] => {
  const pts: Vec2[] = []
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r])
  }
  return pts
}

// ---------------------------------------------------------------- definicao

const HALF = 215
const NEON_COLORS = ['#ff3fb4', '#35e8ff', '#a64bff']

const districts: District[] = [
  {
    id: 'centro',
    name: 'Centro',
    style: 'y2k',
    center: [0, 0],
    bounds: { t: 'circle', cx: 0, cz: 0, r: 76 },
    ground: '#cfd1d2',
    palette: ['#b9c9d6', '#bccbbd', '#9099a8', '#e3d6b4', '#e9e7e2'],
    accent: ['#e8eef2', '#c9a15a'],
    spawn: [0, 9],
  },
  {
    id: 'moda',
    name: 'Avenida da Moda',
    style: 'luxo',
    center: [0, -150],
    bounds: { t: 'rect', x0: -62, z0: -196, x1: 62, z1: -72 },
    ground: '#d9cfba',
    palette: ['#e9e0cc', '#d8c8a6', '#a9b8c2', '#8f9a8f'],
    accent: ['#7fa3b8', '#9db8c8'],
    spawn: [0, -122],
  },
  {
    id: 'neon',
    name: 'Palco Neon',
    style: 'neon',
    center: [150, 0],
    bounds: { t: 'rect', x0: 110, z0: -62, x1: 207, z1: 62 },
    ground: '#24242b',
    palette: ['#5a3a34', '#3a3d44', '#4a2f30', '#2f3340'],
    accent: ['#2ee6d6', '#ff3fb4', '#35e8ff'],
    spawn: [140, 9],
  },
  {
    id: 'jardim',
    name: 'Jardim Romântico',
    style: 'romantico',
    center: [0, 158],
    bounds: { t: 'rect', x0: -72, z0: 128, x1: 72, z1: 207 },
    ground: '#8fc16c',
    palette: ['#e8cdb0', '#dfe3d0', '#f1e8d4', '#cfcfcc', '#ecd9a4'],
    accent: ['#b5502f', '#9c4b30', '#6a4a3a', '#a8452c'],
    spawn: [0, 134],
  },
  {
    id: 'futuro',
    name: 'Bairro Futuro',
    style: 'futuro',
    center: [-156, 0],
    bounds: { t: 'rect', x0: -207, z0: -62, x1: -106, z1: 62 },
    ground: '#bdbab3',
    palette: ['#b8b6b0', '#9a9c9f'],
    accent: ['#ffb347'],
    spawn: [-96, 8],
  },
]

const LAKE = { cx: 0, cz: 94, r: 15 }

const areas: OpenArea[] = [
  {
    id: 'lago',
    name: 'Lago',
    kind: 'lago',
    bounds: { t: 'circle', cx: LAKE.cx, cz: LAKE.cz, r: LAKE.r + 1.5 },
    color: '#4f9fb0',
    spawn: [0, 68],
  },
  {
    id: 'parque',
    name: 'Parque do Lago',
    kind: 'parque',
    bounds: { t: 'rect', x0: -48, z0: 62, x1: 48, z1: 126 },
    color: '#86bd6c',
    spawn: [0, 70],
  },
  { id: 'vitrines', name: 'Praça das Vitrines', kind: 'praca', bounds: { t: 'circle', cx: 0, cz: -90, r: 14 }, color: '#ddd3bd' },
  { id: 'praca-moda', name: 'Avenida da Moda', kind: 'praca', bounds: { t: 'circle', cx: 0, cz: -150, r: 9 }, color: '#e1d8c4' },
  { id: 'praca-neon', name: 'Palco Neon', kind: 'praca', bounds: { t: 'circle', cx: 150, cz: 0, r: 9 }, color: '#34323f' },
  { id: 'praca-jardim', name: 'Jardim Romântico', kind: 'praca', bounds: { t: 'circle', cx: 0, cz: 158, r: 9 }, color: '#d9cfb8' },
  { id: 'praca', name: 'Praça Central', kind: 'praca', bounds: { t: 'circle', cx: 0, cz: 0, r: 38 }, color: '#d9d5cc' },
]

const roads: Road[] = [
  { id: 'av-norte', kind: 'avenue', width: 12, points: [[0, -30], [0, -196]] },
  { id: 'boulevard', name: 'Boulevard Noturno', kind: 'avenue', width: 12, points: [[30, 0], [176, 0]] },
  { id: 'av-sul-1', kind: 'avenue', width: 12, points: [[0, 30], [0, 66]] },
  { id: 'av-sul-2', kind: 'avenue', width: 12, points: [[0, 122], [0, 179]] },
  { id: 'av-oeste', kind: 'avenue', width: 12, points: [[-30, 0], [-103, 0]] },
  { id: 'anel', kind: 'street', width: 8, points: ring(0, 0, 46, 72) },
  // parque do lago: caminhos em volta do lago
  { id: 'lago-oeste', kind: 'path', width: 4, points: [[0, 66], [-16, 70], [-24, 80], [-27, 94], [-24, 108], [-16, 118], [0, 122]] },
  { id: 'lago-leste', kind: 'path', width: 4, points: [[0, 66], [16, 70], [24, 80], [27, 94], [24, 108], [16, 118], [0, 122]] },
  { id: 'trilha-o', kind: 'path', width: 4, points: [[-27, 94], [-46, 94]] },
  { id: 'trilha-l', kind: 'path', width: 4, points: [[27, 94], [46, 94]] },
  // Avenida da Moda
  { id: 'moda-ew', kind: 'street', width: 8, points: [[-62, -150], [62, -150]] },
  { id: 'moda-w', kind: 'street', width: 8, points: [[-34, -196], [-34, -72]] },
  { id: 'moda-e', kind: 'street', width: 8, points: [[34, -196], [34, -72]] },
  // Palco Neon
  { id: 'neon-ns', kind: 'street', width: 8, points: [[150, -62], [150, 62]] },
  { id: 'neon-n', kind: 'street', width: 8, points: [[110, -34], [207, -34]] },
  { id: 'neon-s', kind: 'street', width: 8, points: [[110, 34], [207, 34]] },
  // Jardim Romantico
  { id: 'jardim-ew', kind: 'street', width: 8, points: [[-72, 158], [72, 158]] },
  { id: 'jardim-w', kind: 'street', width: 8, points: [[-36, 128], [-36, 207]] },
  { id: 'jardim-e', kind: 'street', width: 8, points: [[36, 128], [36, 207]] },
]

const futuro = { x0: -206, z0: -62, x1: -106, z1: 62 }

const SHOPS: {
  id: string
  name: string
  district: string
  x: number
  z: number
  w: number
  d: number
  h: number
  facing: number
  icon: string
  color: string
}[] = [
  { id: 'cafe-rose', name: 'Café Rosé', district: 'centro', x: -44, z: -44, w: 15, d: 12, h: 9, facing: Math.atan2(44, 44), icon: 'C', color: '#ff7eb6' },
  { id: 'salao-spa', name: 'Salão & Spa', district: 'centro', x: 44, z: 44, w: 16, d: 12, h: 10, facing: Math.atan2(-44, -44), icon: 'S', color: '#c9a6ff' },
  { id: 'boutique', name: 'Boutique', district: 'moda', x: -17, z: -130, w: 14, d: 12, h: 14, facing: Math.PI / 2, icon: 'B', color: '#f4a3c4' },
  { id: 'joalheria', name: 'Joalheria', district: 'moda', x: 17, z: -130, w: 14, d: 12, h: 14, facing: -Math.PI / 2, icon: 'J', color: '#7fd6ff' },
  { id: 'estudio-fotos', name: 'Estúdio de Fotos', district: 'moda', x: -27, z: -90, w: 14, d: 12, h: 11, facing: Math.PI / 2, icon: 'E', color: '#ffd36b' },
  { id: 'palco-neon', name: 'Palco Neon', district: 'neon', x: 187, z: 0, w: 38, d: 18, h: 15, facing: -Math.PI / 2, icon: 'P', color: '#35e8ff' },
  { id: 'cassino', name: 'Lounge de Jogos', district: 'neon', x: 170, z: -50, w: 20, d: 14, h: 12, facing: 0, icon: 'L', color: '#c9a15a' },
  { id: 'casa-sonhos', name: 'Casa dos Sonhos', district: 'jardim', x: 0, z: 189, w: 28, d: 18, h: 13, facing: Math.PI, icon: 'H', color: '#ff9ccb' },
  { id: 'petshop', name: 'Petshop Patinhas', district: 'jardim', x: -54, z: 172, w: 16, d: 12, h: 9, facing: Math.PI, icon: 'Z', color: '#3a9f8a' },
]

// ---------------------------------------------------------------- geracao

function buildCity(): City {
  const rnd = mulberry32(20260507)
  const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)]
  const rr = (a: number, b: number) => a + rnd() * (b - a)

  const roadBox = roads.map((r) => {
    const xs = r.points.map((p) => p[0])
    const zs = r.points.map((p) => p[1])
    const hw = r.width / 2
    return { r, hw, x0: Math.min(...xs) - hw, x1: Math.max(...xs) + hw, z0: Math.min(...zs) - hw, z1: Math.max(...zs) + hw }
  })

  /** menor distancia livre (ja descontada a meia-largura) ate uma via */
  const roadClearance = (x: number, z: number, skip?: string): number => {
    let best = Infinity
    for (const rb of roadBox) {
      if (rb.r.id === skip) continue
      if (x < rb.x0 - 12 || x > rb.x1 + 12 || z < rb.z0 - 12 || z > rb.z1 + 12) continue
      best = Math.min(best, distToPolyline(x, z, rb.r.points) - rb.hw)
    }
    return best
  }
  const inAnyArea = (x: number, z: number, margin: number): boolean => areas.some((a) => inShape(a.bounds, x, z, margin))
  const inHardArea = (x: number, z: number, margin: number): boolean =>
    areas.some((a) => a.kind !== 'parque' && inShape(a.bounds, x, z, margin))

  const blocks: Block[] = []
  const pois: Poi[] = []

  // ---- lojas (blocos reservados) ----
  for (const s of SHOPS) {
    const dist = s.d / 2
    pois.push({
      id: s.id,
      name: s.name,
      kind: s.id === 'casa-sonhos' || s.id === 'palco-neon' ? 'landmark' : 'shop',
      x: s.x + Math.sin(s.facing) * dist,
      z: s.z + Math.cos(s.facing) * dist,
      facing: s.facing,
      district: s.district,
      icon: s.icon,
      color: s.color,
    })
    blocks.push({
      id: `loja-${s.id}`,
      x: s.x,
      z: s.z,
      w: s.w,
      d: s.d,
      h: s.h,
      rot: s.facing,
      district: s.district,
      shape: s.district === 'jardim' ? 'house' : 'box',
      colorIdx: 0,
      accentIdx: 0,
      label: s.name,
      shopId: s.id,
    })
  }
  pois.unshift({ id: 'spawn', name: 'Início', kind: 'spawn', x: 0, z: 9, facing: Math.PI, district: 'centro', icon: '★', color: '#ffd36b' })

  // ---- predios procedurais por distrito ----
  const fits = (b: Block, d: District): boolean => {
    const c = Math.cos(b.rot)
    const s = Math.sin(b.rot)
    const gap = 1.2
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const lx = (i / 2) * (b.w / 2 + 0.5)
        const lz = (j / 2) * (b.d / 2 + 0.5)
        const px = b.x + lx * c + lz * s
        const pz = b.z - lx * s + lz * c
        if (roadClearance(px, pz) < gap) return false
        if (inAnyArea(px, pz, 2.5)) return false
        if (!inShape(d.bounds, px, pz, -1.5)) return false
      }
    }
    const rad = Math.hypot(b.w, b.d) / 2
    for (const o of blocks) {
      if (Math.hypot(o.x - b.x, o.z - b.z) < (rad + Math.hypot(o.w, o.d) / 2) * 0.74 + 1.2) return false
    }
    return true
  }

  const sizeFor = (d: District) => {
    let w: number
    let dd: number
    let h: number
    let shape: BlockShape = 'box'
    switch (d.style) {
      case 'y2k':
        w = rr(9, 11.5)
        dd = rr(9, 11.5)
        h = rr(12, 30)
        if (rnd() < 0.45) shape = 'cyl'
        break
      case 'luxo':
        w = rr(9.5, 12)
        dd = rr(9, 11.5)
        h = rr(26, 54)
        break
      case 'neon':
        w = rr(9, 11.5)
        dd = rr(9, 11.5)
        h = rr(10, 30)
        break
      default:
        w = rr(8, 10)
        dd = rr(8, 10)
        h = rr(5, 7.5)
        shape = 'house'
    }
    if (shape === 'cyl') {
      w = Math.min(w, dd)
      dd = w
    }
    return { w, dd, h, shape }
  }
  const counters: Record<string, number> = {}
  const tryAdd = (d: District, x: number, z: number, rot: number) => {
    if (!inShape(d.bounds, x, z, -2)) return
    const { w, dd, h, shape } = sizeFor(d)
    counters[d.id] = (counters[d.id] ?? 0) + 1
    const blk: Block = {
      id: `${d.id}-${counters[d.id]}`,
      x,
      z,
      w,
      d: dd,
      h,
      rot,
      district: d.id,
      shape,
      colorIdx: Math.floor(rnd() * d.palette.length),
      accentIdx: Math.floor(rnd() * d.accent.length),
    }
    if (d.id === 'centro') centroShape(blk, counters[d.id])
    if (fits(blk, d)) blocks.push(blk)
  }
  /** Centro: dimensoes reais das pecas do kit Y2K (torres redondas / lojas capsula + torre). */
  const centroShape = (b: Block, n: number) => {
    b.variant = n % 3
    if (b.shape === 'cyl') {
      const v = [{ w: 8.4, h: 15 }, { w: 7.6, h: 19.4 }, { w: 9.4, h: 7.6 }][b.variant]
      b.w = v.w
      b.d = v.w
      b.h = v.h
    } else {
      b.shape = 'box'
      b.w = 10.6
      b.d = b.variant === 1 ? 6.2 : 9.6
      b.h = b.variant === 1 ? 10.5 : 15
    }
  }
  const sampleAlong = (
    pts: readonly Vec2[],
    spacing: (t: number) => number,
    fn: (x: number, z: number, tx: number, tz: number, t: number) => void,
  ) => {
    const total = polylineLength(pts)
    let s = 4
    while (s < total - 3) {
      let acc = 0
      for (let i = 0; i < pts.length - 1; i++) {
        const sl = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
        if (s <= acc + sl) {
          const u = (s - acc) / sl
          const tx = (pts[i + 1][0] - pts[i][0]) / sl
          const tz = (pts[i + 1][1] - pts[i][1]) / sl
          fn(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u, tx, tz, s / total)
          break
        }
        acc += sl
      }
      s += spacing(s / total)
    }
  }

  // 1) fachadas em fileiras ao longo das vias (frente para a via)
  for (const d of districts) {
    if (d.style === 'futuro') continue
    for (const r of roads) {
      if (r.kind === 'path') continue
      const hw = r.width / 2
      for (let row = 0; row < 3; row++) {
        sampleAlong(
          r.points,
          () => 12.5,
          (x, z, tx, tz) => {
            for (const side of [1, -1]) {
              const nx = -tz * side
              const nz = tx * side
              if (r.id === 'anel' && nx * x + nz * z < 0) continue // so o lado de fora do anel
              const off = hw + 1.8 + row * 12.2 + 5.5 + rr(-0.3, 0.3)
              tryAdd(d, x + nx * off, z + nz * off, Math.atan2(-nx, -nz))
            }
          },
        )
      }
    }
  }
  // 2) preenchimento de sobras em grade
  for (const d of districts) {
    if (d.style === 'futuro') continue
    const b = d.bounds
    const ext = b.t === 'circle' ? b.r : Math.max(b.x1 - b.x0, b.z1 - b.z0)
    const cx = d.center[0]
    const cz = d.center[1]
    const half = Math.ceil(ext / 13)
    for (let gi = -half; gi <= half; gi++) {
      for (let gj = -half; gj <= half; gj++) {
        const x = cx + gi * 13 + rr(-0.8, 0.8)
        const z = cz + gj * 13 + rr(-0.8, 0.8)
        const rot = d.style === 'y2k' ? Math.atan2(-x, -z) : Math.abs(x - cx) > Math.abs(z - cz) ? (x > cx ? -Math.PI / 2 : Math.PI / 2) : z > cz ? Math.PI : 0
        tryAdd(d, x, z, rot)
      }
    }
  }

  // Centro: segunda passada com semente propria (nao mexe na sequencia dos outros bairros), preenche celulas vazias
  const crnd = mulberry32(777)
  const centro = districts.find((d) => d.id === 'centro')!
  for (let gi = -6; gi <= 6; gi++) {
    for (let gj = -6; gj <= 6; gj++) {
      const x = gi * 12.5 + (crnd() - 0.5) * 2 + ((gj & 1) * 3)
      const z = gj * 12.5 + (crnd() - 0.5) * 2
      const rot = Math.atan2(-x, -z)
      const shape: BlockShape = crnd() < 0.5 ? 'cyl' : 'box'
      counters.centro = (counters.centro ?? 0) + 1
      const blk: Block = { id: `centro-${counters.centro}`, x, z, w: 9, d: 9, h: 12, rot, district: 'centro', shape, colorIdx: 0, accentIdx: 0 }
      centroShape(blk, counters.centro + 1)
      if (inShape(centro.bounds, x, z, -2) && fits(blk, centro)) blocks.push(blk)
    }
  }

  // ---- props: postes, bancos, arvores, quiosques ----
  const lamps: Lamp[] = []
  const benches: Bench[] = []
  const trees: Tree[] = []
  const kiosks: Kiosk[] = []

  for (const r of roads) {
    if (r.kind !== 'avenue') continue
    const off = r.width / 2 - 1
    const isBoulevard = r.id === 'boulevard'
    let side = 1
    sampleAlong(
      r.points,
      (t) => (isBoulevard ? 30 - 22 * t : 22),
      (x, z, tx, tz, t) => {
        side = -side
        const nx = -tz
        const nz = tx
        const useNeon = isBoulevard && t > 0.35
        for (const sgn of isBoulevard ? [1, -1] : [side]) {
          const lx = x + nx * off * sgn
          const lz = z + nz * off * sgn
          if (roadClearance(lx, lz, r.id) < 1.5 || inHardArea(lx, lz, 0.5)) continue
          lamps.push({
            x: lx,
            z: lz,
            kind: useNeon ? 'neon' : 'warm',
            color: useNeon ? NEON_COLORS[Math.floor(rnd() * 3)] : '#ffe2a8',
          })
        }
      },
    )
    sampleAlong(
      r.points,
      () => 38,
      (x, z, tx, tz) => {
        const sgn = rnd() < 0.5 ? 1 : -1
        const bx = x + -tz * (off + 0.2) * sgn + tx * 7
        const bz = z + tx * (off + 0.2) * sgn + tz * 7
        if (roadClearance(bx, bz, r.id) < 1.2 || inHardArea(bx, bz, 0.5)) return
        benches.push({ x: bx, z: bz, rot: Math.atan2(-sgn * -tz, -sgn * tx) })
      },
    )
  }
  // anel de postes e bancos na praca central
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.1
    const lx = Math.cos(a) * 36
    const lz = Math.sin(a) * 36
    if (roadClearance(lx, lz) < 1) continue
    lamps.push({ x: lx, z: lz, kind: 'warm', color: '#ffe2a8' })
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.3
    const bx = Math.cos(a) * 31
    const bz = Math.sin(a) * 31
    if (roadClearance(bx, bz) < 2) continue
    benches.push({ x: bx, z: bz, rot: Math.atan2(-bx, -bz) })
  }
  // quiosques da Praca das Vitrines
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.52
    const kx = Math.cos(a) * 9.5
    const kz = -90 + Math.sin(a) * 9.5
    if (roadClearance(kx, kz) < 1) continue
    kiosks.push({ x: kx, z: kz, rot: Math.atan2(-Math.cos(a), -Math.sin(a)), color: pick(['#f4a3c4', '#a9d6f2', '#ffd36b', '#d6c4f7']) })
  }
  // postes nas pracinhas
  for (const a of areas) {
    if (a.kind !== 'praca' || a.bounds.t !== 'circle' || a.id === 'praca') continue
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + 0.2
      const lx = a.bounds.cx + Math.cos(ang) * (a.bounds.r - 1.2)
      const lz = a.bounds.cz + Math.sin(ang) * (a.bounds.r - 1.2)
      if (roadClearance(lx, lz) < 0.6) continue
      const neon = a.id === 'praca-neon'
      lamps.push({ x: lx, z: lz, kind: neon ? 'neon' : 'warm', color: neon ? NEON_COLORS[i % 3] : '#ffe2a8' })
    }
  }

  const gardenKind = (): Tree['kind'] => {
    const r = rnd()
    return r < 0.42 ? 'lollipop' : r < 0.6 ? 'heart' : r < 0.84 ? 'cone' : 'blossom'
  }
  // arvores do parque (longe do lago e dos caminhos)
  const pb = areas.find((a) => a.id === 'parque')!.bounds as Extract<Shape, { t: 'rect' }>
  for (let tries = 0, n = 0; tries < 2000 && n < 75; tries++) {
    const x = rr(pb.x0 + 2, pb.x1 - 2)
    const z = rr(pb.z0 + 2, pb.z1 - 2)
    if (Math.hypot(x - LAKE.cx, z - LAKE.cz) < LAKE.r + 4.5) continue
    if (roadClearance(x, z) < 2.2) continue
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 4.2)) continue
    trees.push({ x, z, s: rr(0.8, 1.35), kind: gardenKind(), tint: rnd() })
    n++
  }
  // arvores do Jardim Romantico (junto as ruas)
  const jd = districts.find((d) => d.id === 'jardim')!
  for (let tries = 0, n = 0; tries < 3000 && n < 45; tries++) {
    const x = rr(-70, 70)
    const z = rr(130, 205)
    if (!inShape(jd.bounds, x, z, -2)) continue
    const cl = roadClearance(x, z)
    if (cl < 0.2 || cl > 3.4) continue
    if (inHardArea(x, z, 2)) continue
    if (blocks.some((b) => Math.hypot(b.x - x, b.z - z) < Math.hypot(b.w, b.d) / 2 + 1)) continue
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 5)) continue
    trees.push({ x, z, s: rr(0.8, 1.2), kind: gardenKind(), tint: rnd() })
    n++
  }
  // arvores na praca central
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.55
    trees.push({ x: Math.cos(a) * 24, z: Math.sin(a) * 24, s: 0.9, kind: 'orb', tint: i / 12 })
  }
  // palmeiras da Avenida da Moda (entre os postes, em vasos)
  for (let z = -45; z > -194; z -= 22) {
    for (const sgn of [-1, 1]) {
      const x = sgn * 4.7
      if (z > -72 || roadClearance(x, z, 'av-norte') < 1.2 || inHardArea(x, z, 1.5)) continue
      trees.push({ x, z, s: rr(0.95, 1.15), kind: 'palm', tint: rnd() })
    }
  }
  // arvores escuras de borda luminosa no Palco Neon
  const nd = districts.find((d) => d.id === 'neon')!
  for (let tries = 0, n = 0; tries < 3000 && n < 18; tries++) {
    const x = rr(112, 205)
    const z = rr(-60, 60)
    if (!inShape(nd.bounds, x, z, -2)) continue
    const cl = roadClearance(x, z)
    if (cl < 0.2 || cl > 3.4) continue
    if (inHardArea(x, z, 2)) continue
    if (blocks.some((b) => Math.hypot(b.x - x, b.z - z) < Math.hypot(b.w, b.d) / 2 + 1)) continue
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 5)) continue
    trees.push({ x, z, s: rr(0.9, 1.15), kind: 'dark', tint: rnd() })
    n++
  }

  const spawns: Record<string, Vec2> = {}
  for (const d of districts) spawns[d.id] = d.spawn
  for (const a of areas) if (a.spawn) spawns[a.id] = a.spawn
  spawns['vitrines'] = [0, -74]
  spawns['boulevard'] = [90, 3]
  spawns['spawn'] = [0, 9]
  // pontos de captura/atalho no Parque do Lago e na pracinha do Jardim
  spawns['ponte'] = [0, 74]
  spawns['coreto'] = [0, 87.5]
  spawns['margem'] = [-19.5, 96]
  spawns['fonte-jardim'] = [0, 150]
  for (const p of pois) if (p.kind !== 'spawn') spawns[p.id] = [p.x + Math.sin(p.facing) * 4, p.z + Math.cos(p.facing) * 4]

  return { half: HALF, ground: '#b3b09f', districts, roads, areas, blocks, pois, lamps, benches, trees, kiosks, spawns, futuro, lake: LAKE }
}

export const CITY: City = buildCity()

// Aeroporto (game/travel): via + porta somadas DEPOIS de gerar os bairros, para nao mexer na semente dos predios.
CITY.roads.push(AIRPORT_ROAD)
CITY.pois.push(AIRPORT_POI)
CITY.spawns[AIRPORT_POI.id] = [AIRPORT_POI.x + Math.sin(AIRPORT_POI.facing) * 4, AIRPORT_POI.z + Math.cos(AIRPORT_POI.facing) * 4]

/** Gancho de cidades novas (game/travel): quando ha outra cidade ativa, `locate` responde por ela. */
export const locateHook: { fn: ((x: number, z: number) => Locale | null) | null } = { fn: null }

// ---------------------------------------------------------------- consultas

export interface Locale {
  id: string
  name: string
}

/** Onde o ponto (x, z) esta: lago/parque/praca > via com nome > bairro > cidade. */
export function locate(x: number, z: number): Locale {
  const alt = locateHook.fn?.(x, z)
  if (alt) return alt
  for (const a of CITY.areas) if (inShape(a.bounds, x, z)) return { id: a.id, name: a.name }
  for (const r of CITY.roads) {
    if (r.name && distToPolyline(x, z, r.points) <= r.width / 2) return { id: r.id, name: r.name }
  }
  for (const d of CITY.districts) if (inShape(d.bounds, x, z)) return { id: d.id, name: d.name }
  return { id: 'cidade', name: 'Cidade das Blogueiras' }
}

/** Ponto de partida: ?spawn=<id de bairro, area ou loja>. */
export function spawnFor(id: string | null): Vec2 {
  return (id && CITY.spawns[id]) || CITY.spawns['spawn']
}
