import { CITY, ROAD_SPEC, distToPolyline, inShape, polylineLength, type Road, type Vec2 } from './layout'
import type { KitItem } from './kit'
import { reserveDisc, romanticReserved } from './romantic'

/**
 * Mobiliario urbano (public/assets/city/props_more + props_plus, gerados por tools/blender/city_props_more*.py):
 * faixas de pedestres, semaforos, pontos de onibus, carros estacionados, food trucks, luzinhas, parquinho, obra...
 * Tudo deterministico e posicionado sobre os dados de layout.ts (vias, blocos, pois, lagos, arvores).
 * As pecas viram KitItem (fundidos por celula em kit.tsx) e os colisores vem do JSON de cada peca.
 */

// ---------------------------------------------------------------- utilidades
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = rng(424242)
const PI = Math.PI

interface Taken {
  x: number
  z: number
  r: number
}
const taken: Taken[] = []

const half = (r: Road) => (r.width - ROAD_SPEC[r.kind].sidewalk * 2) / 2 // meia-largura do asfalto
const roads = CITY.roads.filter((r) => r.kind !== 'path')
const paths = CITY.roads.filter((r) => r.kind === 'path')

function frameAt(pts: readonly Vec2[], s: number): { x: number; z: number; tx: number; tz: number } {
  let acc = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
    if (s <= acc + l || i === pts.length - 2) {
      const u = Math.min(1, Math.max(0, (s - acc) / l))
      return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, z: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u, tx: (pts[i + 1][0] - pts[i][0]) / l, tz: (pts[i + 1][1] - pts[i][1]) / l }
    }
    acc += l
  }
  return { x: pts[0][0], z: pts[0][1], tx: 1, tz: 0 }
}

/** distancia (m) da borda do asfalto mais proximo: <0 = em cima do asfalto */
function asphaltClear(x: number, z: number): number {
  let best = Infinity
  for (const r of roads) best = Math.min(best, distToPolyline(x, z, r.points) - half(r))
  return best
}
const inPlaza = (x: number, z: number, m = 0) => CITY.areas.some((a) => a.kind !== 'parque' && inShape(a.bounds, x, z, m))
const inLake = (x: number, z: number, m = 0) => Math.hypot(x - CITY.lake.cx, z - CITY.lake.cz) < CITY.lake.r + 2 + m

function inBlock(x: number, z: number, pad: number): boolean {
  for (const b of CITY.blocks) {
    const dx = x - b.x
    const dz = z - b.z
    if (Math.abs(dx) > 30 || Math.abs(dz) > 30) continue
    const c = Math.cos(b.rot)
    const s = Math.sin(b.rot)
    const lx = dx * c - dz * s
    const lz = dx * s + dz * c
    const p = b.district === 'centro' || b.shopId ? pad + 1.5 : pad
    if (Math.abs(lx) < b.w / 2 + p && Math.abs(lz) < b.d / 2 + p) return true
  }
  return false
}

function nearTaken(x: number, z: number, r: number): boolean {
  for (const t of taken) if (Math.hypot(t.x - x, t.z - z) < t.r + r) return true
  return false
}

// itens existentes que nao podemos atropelar
for (const l of CITY.lamps) taken.push({ x: l.x, z: l.z, r: 0.9 })
for (const b of CITY.benches) taken.push({ x: b.x, z: b.z, r: 1.4 })
for (const t of CITY.trees) taken.push({ x: t.x, z: t.z, r: 1.3 * t.s })
for (const k of CITY.kiosks) taken.push({ x: k.x, z: k.z, r: 2.4 })
for (const p of CITY.pois) {
  if (p.kind === 'spawn') continue
  // corredor da porta: 6 m livres a frente
  for (const d of [1, 3, 5.5]) taken.push({ x: p.x + Math.sin(p.facing) * d, z: p.z + Math.cos(p.facing) * d, r: 2.2 })
}
taken.push({ x: 0, z: 9, r: 4 }) // nascimento
// pracas do mapa: fonte central, jardim, vitrines
taken.push({ x: 0, z: 0, r: 16 }, { x: 0, z: 158, r: 10.5 }, { x: 0, z: -90, r: 5.5 }, { x: 0, z: -150, r: 3.6 }, { x: 150, z: 0, r: 6.6 })
taken.push({ x: CITY.lake.cx, z: CITY.lake.cz - 4.6, r: 5.2 }) // coreto

// pecas de props_plus decimadas (tools/blender/city_props_more_lite.py) para uso em massa
const LITE = new Set(['photo_spot_frame', 'wayfinding_post', 'magazine_kiosk', 'flower_cart', 'rose_arch', 'macaron_stand', 'bike_rack', 'phone_booth_capsule', 'vending_pod', 'bubble_car_parked', 'cafe_table_set', 'mannequin_display', 'palm_planter_lux', 'trash_bin_cute', 'mailbox_heart'])
const nm = (p: string) => (LITE.has(p) ? 'lite_' + p : p)

// ---------------------------------------------------------------- saida
const big: KitItem[] = []
const small: KitItem[] = []
const decor: KitItem[] = []
const walk: KitItem[] = []
type Bucket = 'big' | 'small' | 'decor' | 'walk'
const B: Record<Bucket, KitItem[]> = { big, small, decor, walk }

interface Opt {
  /** raio de folga (m) para outras pecas e predios */
  r?: number
  /** permite estar sobre o asfalto / na praca */
  asphalt?: boolean
  plaza?: boolean
  bucket?: Bucket
  s?: number
  /** nao registra como ocupado */
  free?: boolean
  over?: KitItem['over']
  collide?: boolean
  y?: number
}

/** coloca uma peca se o local estiver livre; devolve true se colocou */
function put(piece: string, x: number, z: number, rot: number, pal: string, o: Opt = {}): boolean {
  const r = o.r ?? 0.8
  if (!o.asphalt && asphaltClear(x, z) < r * 0.5 + 0.1) return false
  if (!o.plaza && inPlaza(x, z, 0)) return false
  if (inLake(x, z)) return false
  if (inBlock(x, z, r * 0.7)) return false
  if (nearTaken(x, z, r)) return false
  for (const p of paths) if (distToPolyline(x, z, p.points) < p.width / 2 + r * 0.4 && !o.plaza && o.bucket !== 'walk') return false
  B[o.bucket ?? 'small'].push({ piece: nm(piece), x, z, rot, pal, s: o.s, over: o.over, collide: o.collide, y: o.y })
  if (!o.free) taken.push({ x, z, r })
  return true
}

/** pose sem verificar nada (cena ja conferida) */
function force(piece: string, x: number, z: number, rot: number, pal: string, o: Opt = {}) {
  B[o.bucket ?? 'small'].push({ piece: nm(piece), x, z, rot, pal, s: o.s, over: o.over, collide: o.collide, y: o.y })
  if (!o.free && o.r) taken.push({ x, z, r: o.r })
}

/** tenta posicoes em espiral em torno de (cx, cz) */
function around(piece: string, cx: number, cz: number, rot: number, pal: string, o: Opt = {}, maxR = 7): boolean {
  if (put(piece, cx, cz, rot, pal, o)) return true
  for (let rad = 1.5; rad <= maxR; rad += 1.5) {
    const n = Math.round(rad * 4)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + rad
      if (put(piece, cx + Math.cos(a) * rad, cz + Math.sin(a) * rad, rot, pal, o)) return true
    }
  }
  return false
}

const faceTo = (x: number, z: number, tx: number, tz: number) => Math.atan2(tx - x, tz - z)
const districtOf = (x: number, z: number): string => {
  for (const d of CITY.districts) if (inShape(d.bounds, x, z)) return d.id
  return 'cidade'
}

// ---------------------------------------------------------------- 1) cruzamentos, faixas de pedestres, semaforos
export interface Zebra {
  x: number
  z: number
  /** direcao ao longo da via (vetor unitario) */
  tx: number
  tz: number
  /** largura a atravessar (asfalto) */
  w: number
}
export interface Mark {
  x0: number
  z0: number
  x1: number
  z1: number
  w: number
  color: string
}
export const ZEBRAS: Zebra[] = []
export const MARKS: Mark[] = []

interface Cross {
  x: number
  z: number
  a: Road
  b: Road
  ta: Vec2
  tb: Vec2
}
const crosses: Cross[] = []
{
  const seg = (r: Road, i: number) => ({ ax: r.points[i][0], az: r.points[i][1], bx: r.points[i + 1][0], bz: r.points[i + 1][1] })
  for (let i = 0; i < roads.length; i++) {
    for (let j = i + 1; j < roads.length; j++) {
      const A = roads[i]
      const Bn = roads[j]
      for (let s = 0; s < A.points.length - 1; s++) {
        for (let t = 0; t < Bn.points.length - 1; t++) {
          const p = seg(A, s)
          const q = seg(Bn, t)
          const rx = p.bx - p.ax
          const rz = p.bz - p.az
          const sx = q.bx - q.ax
          const sz = q.bz - q.az
          const den = rx * sz - rz * sx
          if (Math.abs(den) < 1e-9) continue
          const u = ((q.ax - p.ax) * sz - (q.az - p.az) * sx) / den
          const v = ((q.ax - p.ax) * rz - (q.az - p.az) * rx) / den
          if (u < 0 || u > 1 || v < 0 || v > 1) continue
          const x = p.ax + rx * u
          const z = p.az + rz * u
          if (crosses.some((c) => Math.hypot(c.x - x, c.z - z) < 6)) continue
          const la = Math.hypot(rx, rz)
          const lb = Math.hypot(sx, sz)
          crosses.push({ x, z, a: A, b: Bn, ta: [rx / la, rz / la], tb: [sx / lb, sz / lb] })
        }
      }
    }
  }
}

/** tipo de bairro do ponto, para escolher paletas */
const SIG_COLOR = '#46d68a'
for (const c of crosses) {
  if (inPlaza(c.x, c.z, 0)) continue
  const Ha = half(c.a)
  const Hb = half(c.b)
  const arms: [Road, Vec2, number, number][] = [
    [c.a, c.ta, Hb, Ha],
    [c.b, c.tb, Ha, Hb],
  ]
  let n = 0
  for (const [r, t, Ho, Hr] of arms) {
    for (const sg of [-1, 1]) {
      const d = Ho + 2.4
      const x = c.x + t[0] * sg * d
      const z = c.z + t[1] * sg * d
      if (distToPolyline(x, z, r.points) > 0.6 || inPlaza(x, z, 0) || inLake(x, z)) continue
      ZEBRAS.push({ x, z, tx: t[0], tz: t[1], w: Hr * 2 })
      // linha de retencao (branca larga) antes da faixa, so na pista de chegada (lado direito)
      n++
    }
  }
  if (n < 3) continue
  // semaforos nos cantos (2 diagonais; 4 se avenida x avenida)
  const corners: [number, number][] = [[1, 1], [-1, -1]]
  for (const [su, sv] of corners) {
    const u = su * (Hb + 1.0)
    const v = sv * (Ha + 1.0)
    const x = c.x + c.ta[0] * u + c.tb[0] * v
    const z = c.z + c.ta[1] * u + c.tb[1] * v
    if (inBlock(x, z, 0.3) || inLake(x, z)) continue
    put('traffic_light', x, z, faceTo(x, z, c.x, c.z), 'traffic', { r: 0.7, asphalt: false, over: { glow: SIG_COLOR } })
  }
  // placas de rua em dois cantos
  const nm = c.a.kind === 'avenue' ? 1 : -1
  for (const [su, sv] of [[1, -1]] as [number, number][]) {
    const u = su * (Hb + 1.0)
    const v = sv * (Ha + 1.5)
    const x = c.x + c.ta[0] * u + c.tb[0] * v
    const z = c.z + c.ta[1] * u + c.tb[1] * v
    const dist = districtOf(x, z)
    const pal = dist === 'moda' ? 'navy' : dist === 'neon' ? 'neon' : dist === 'jardim' ? 'forest' : 'navy'
    put('street_sign_post', x, z, faceTo(x, z, c.x, c.z) + (nm > 0 ? 0.4 : -0.4), pal, { r: 0.6 })
  }
}

// ---------------------------------------------------------------- 2) marcas de pista (linha central) - amostragem
{
  const clearOfCross = (x: number, z: number, r: Road) => {
    for (const c of crosses) {
      const other = c.a === r ? c.b : c.b === r ? c.a : null
      if (!other) continue
      if (Math.hypot(x - c.x, z - c.z) < half(other) + 5.2) return false
    }
    return true
  }
  for (const r of roads) {
    const L = polylineLength(r.points)
    const step = 1
    let prev: { x: number; z: number } | null = null
    for (let s = 3; s < L - 3; s += step) {
      const f = frameAt(r.points, s)
      const ok = clearOfCross(f.x, f.z, r) && !inPlaza(f.x, f.z, 0.5) && !inLake(f.x, f.z)
      if (!ok) {
        prev = null
        continue
      }
      const avenue = r.kind === 'avenue'
      const dash = avenue || Math.floor(s / 2.5) % 2 === 0
      if (dash && prev) {
        if (avenue) {
          const nx = -f.tz
          const nz = f.tx
          for (const o of [-0.16, 0.16]) MARKS.push({ x0: prev.x + nx * o, z0: prev.z + nz * o, x1: f.x + nx * o, z1: f.z + nz * o, w: 0.11, color: '#e0b22a' })
        } else MARKS.push({ x0: prev.x, z0: prev.z, x1: f.x, z1: f.z, w: 0.14, color: '#f2f0ea' })
      }
      prev = { x: f.x, z: f.z }
    }
  }
}

// ---------------------------------------------------------------- 3) mobiliario ao longo das vias
interface Along {
  road: Road
  side: number
  s: number
  x: number
  z: number
  tx: number
  tz: number
  /** normal que aponta para o lado escolhido (para fora da pista) */
  nx: number
  nz: number
}

function along(r: Road, from: number, to: number, spacing: number, jitter: number, fn: (a: Along) => void) {
  const L = polylineLength(r.points)
  for (let s = from; s < Math.min(to, L - 3); s += spacing + (rnd() - 0.5) * jitter) {
    const f = frameAt(r.points, s)
    fn({ road: r, side: 1, s, x: f.x, z: f.z, tx: f.tx, tz: f.tz, nx: -f.tz, nz: f.tx })
  }
}
const off = (a: Along, side: number, d: number): [number, number] => [a.x + a.nx * side * d, a.z + a.nz * side * d]
/** giro para que a frente (+Z) da peca aponte para a via a partir do lado `side` */
const towardRoad = (a: Along, side: number) => Math.atan2(-a.nx * side, -a.nz * side)
/** giro para a peca ficar paralela a via (frente na direcao de t) */
const parallel = (a: Along, dir = 1) => Math.atan2(a.tx * dir, a.tz * dir)

const R = (id: string) => CITY.roads.find((r) => r.id === id)!
const STYLE: Record<string, { pole: string; wood: string; stone: string; bin: string; cars: string[]; plant: string }> = {
  centro: { pole: 'y2k', wood: 'wood', stone: 'concrete', bin: 'y2k', cars: ['car_silver', 'car_cream', 'car_teal', 'car_navy', 'car_red', 'car_mustard'], plant: 'concrete' },
  moda: { pole: 'char', wood: 'luxo', stone: 'stone', bin: 'char', cars: ['car_black', 'car_navy', 'car_silver', 'car_cream', 'car_black', 'car_green'], plant: 'luxo' },
  neon: { pole: 'neon', wood: 'neon', stone: 'neon', bin: 'neon', cars: ['car_black', 'car_red', 'car_navy', 'car_teal', 'car_silver', 'car_black'], plant: 'neon' },
  jardim: { pole: 'forest', wood: 'wood', stone: 'white', bin: 'forest', cars: ['car_cream', 'car_green', 'car_mustard', 'car_red', 'car_teal', 'car_cream'], plant: 'white' },
  futuro: { pole: 'concrete', wood: 'concrete', stone: 'concrete', bin: 'concrete', cars: ['car_silver', 'car_mustard'], plant: 'concrete' },
  cidade: { pole: 'char', wood: 'wood', stone: 'stone', bin: 'char', cars: ['car_silver', 'car_navy'], plant: 'stone' },
}
const styleAt = (x: number, z: number) => STYLE[districtOf(x, z)] ?? STYLE.cidade
const CARS = ['car_hatch', 'car_sedan', 'car_suv']

for (const r of roads) {
  const avenue = r.kind === 'avenue'
  const sw = avenue ? 5.2 : 3.4 // centro da calcada
  // postes de rua altos nas ruas (as avenidas ja tem os postes do layout)
  if (!avenue) {
    let k = 0
    along(r, 6, 1e9, 46, 6, (a) => {
      const side = k++ % 2 ? 1 : -1
      const [x, z] = off(a, side, sw + 0.2)
      const st = styleAt(x, z)
      put('street_lamp_tall', x, z, towardRoad(a, side), st.pole, { r: 1.0, over: { glow: districtOf(x, z) === 'neon' ? '#35e8ff' : '#ffe2a8' } })
    })
  }
  // hidrantes
  along(r, 14 + rnd() * 10, 1e9, avenue ? 100 : 130, 12, (a) => {
    const side = rnd() < 0.5 ? 1 : -1
    const [x, z] = off(a, side, avenue ? 4.5 : 2.9)
    put('fire_hydrant', x, z, towardRoad(a, side), 'hydrant', { r: 0.6 })
  })
  // lixeiras (bin cute do kit plus) e lixeira de reciclagem tripla
  let kb = 0
  along(r, 20 + rnd() * 8, 1e9, avenue ? 95 : 115, 10, (a) => {
    const side = kb++ % 2 ? 1 : -1
    const [x, z] = off(a, side, avenue ? 5.7 : 3.6)
    const st = styleAt(x, z)
    if (kb % 3 === 0) put('recycling_bins_triple', x, z, parallel(a), 'recycle', { r: 1.3 })
    else put('trash_bin_cute', x, z, towardRoad(a, side), st.bin, { r: 0.7 })
  })
  // arvores de calcada em grade (Centro / Moda / Jardim) e canteiros de rua
  let kt = 0
  along(r, 11, 1e9, avenue ? 62 : 52, 8, (a) => {
    const side = kt++ % 2 ? 1 : -1
    const [x, z] = off(a, side, avenue ? 5.9 : 3.8)
    const d = districtOf(x, z)
    if (d === 'neon' || d === 'futuro') return
    if (kt % 3 === 0) {
      put('street_planter', x, z, parallel(a), STYLE[d]?.plant ?? 'stone', { r: 1.1 })
    } else put('sidewalk_tree_grate', x, z, kt * 1.7, 'forest', { r: 1.1, over: kt % 7 === 0 ? { leaf: '#c9703a' } : undefined })
  })
  // bicicletarios / bikes parqueadas
  let kk = 0
  along(r, 26 + rnd() * 10, 1e9, 115, 14, (a) => {
    const side = kk++ % 2 ? 1 : -1
    const [x, z] = off(a, side, avenue ? 5.2 : 3.4)
    const d = districtOf(x, z)
    if (kk % 2) {
      if (put('bike_hoop', x, z, parallel(a), 'char', { r: 1.1 })) {
        const nxs = a.nx * side
        const nzs = a.nz * side
        put('bicycle_parked', x + a.tx * 0.4, z + a.tz * 0.4, parallel(a) + PI / 2, ['bike_a', 'bike_b', 'bike_c'][kk % 3], { r: 0.7, free: true, collide: false })
        void nxs
        void nzs
      }
    } else if (d !== 'neon') put('kick_scooter', x, z, parallel(a) + 0.4, 'bike_c', { r: 0.6 })
  })
  // bancos simples
  let kbn = 0
  along(r, 33, 1e9, avenue ? 90 : 110, 12, (a) => {
    const side = kbn++ % 2 ? 1 : -1
    const [x, z] = off(a, side, avenue ? 5.6 : 3.6)
    const st = styleAt(x, z)
    put('bench_simple', x, z, parallel(a) + (side > 0 ? PI : 0), st.wood, { r: 1.2 })
  })
  // carros estacionados junto ao meio-fio (avenida: nas duas pistas; rua: so um lado)
  let kc = 0
  along(r, 9 + rnd() * 6, 1e9, avenue ? 31 : 38, 14, (a) => {
    const side = avenue ? (kc % 2 ? 1 : -1) : 1
    kc++
    const st = styleAt(a.x, a.z)
    const offset = half(r) - (avenue ? 1.15 : 0.9)
    const [x, z] = off(a, side, offset)
    if (Math.abs(a.x) < 22 && Math.abs(a.z) < 22) return
    // folga nos cruzamentos
    for (const c of crosses) if (Math.hypot(x - c.x, z - c.z) < 14) return
    const pal = st.cars[kc % st.cars.length]
    const rot = parallel(a, side > 0 ? 1 : -1)
    if (kc % 11 === 0 && districtOf(x, z) === 'moda') {
      put('car_convertible', x, z, rot, 'car_cream', { r: 2.7, asphalt: true, bucket: 'small' })
    } else put(CARS[kc % 3], x, z, rot, pal, { r: 2.2, asphalt: true })
  })
}

// pontos de onibus nas avenidas (abrigo de frente para a via; so calcada)
{
  const stops: [string, number, number][] = [
    ['av-norte', 40, 1], ['av-norte', 108, -1], ['av-norte', 168, 1], ['boulevard', 86, 1], ['boulevard', 128, -1],
    ['av-sul-1', 22, -1], ['av-sul-2', 48, 1], ['av-oeste', 34, 1],
  ]
  for (const [id, s, side] of stops) {
    const r = R(id)
    for (const ds of [0, 4, -4, 8, -8, 12]) {
      const f = frameAt(r.points, s + ds)
      const a: Along = { road: r, side, s: s + ds, x: f.x, z: f.z, tx: f.tx, tz: f.tz, nx: -f.tz, nz: f.tx }
      const [x, z] = off(a, side, 5.2)
      if (inPlaza(x, z, 2)) continue
      if (put('bus_stop', x, z, towardRoad(a, side) + PI, 'bus', { r: 2.6, bucket: 'small' })) break
    }
  }
}

// ---------------------------------------------------------------- 4) bairros: Centro
{
  const C = 'y2k'
  const P = (piece: string, x: number, z: number, rot: number, pal: string, o: Opt = {}, mr = 7) => around(piece, x, z, rot, pal, { plaza: true, ...o }, mr)
  // praca central (r 38): totens holograficos, bancos-capsula, selfie, escultura, roda-gigante, fonte de piso
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + 0.52
    P('holo_totem', Math.cos(a) * 20, Math.sin(a) * 20, a + PI / 2, C, { r: 1.2 })
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + 0.95
    P('capsule_bench', Math.cos(a) * 27, Math.sin(a) * 27, Math.atan2(-Math.cos(a), -Math.sin(a)) + PI, 'y2k', { r: 1.6 })
  }
  P('selfie_totem', -14, 22, 0.6, C, { r: 1.5 })
  P('selfie_totem', 15, -22, PI + 0.6, C, { r: 1.5 })
  P('pop_sculpture', -26, 23, 0.4, 'y2k', { r: 2.2, over: { accent2: '#e0558f' } })
  P('ferris_wheel_mini', 27, 20, -0.7, 'y2k', { r: 4.2, bucket: 'big' })
  P('ground_fountain_jets', -24, -22, 0, 'y2k', { r: 3.8, bucket: 'walk', collide: false })
  P('clock_post', 5.4, -36.5, 0, 'char', { r: 0.8, plaza: true })
  P('city_map_totem', 6.5, 11.5, PI - 0.3, 'luxo', { r: 1, plaza: true })
  P('info_kiosk', -22, 30, 0.5, 'concrete', { r: 3.2, bucket: 'big' })
  P('popcorn_cart', 12, 28, PI - 0.4, 'carnival', { r: 1.6 })
  P('cotton_candy_cart', -9, -28, 0.5, 'carnival', { r: 1.6 })
  P('food_truck_icecream', 31, -6, -PI / 2, 'truck_cream', { r: 3.4, bucket: 'big' })
  P('food_truck_crepe', -31, 5, PI / 2, 'truck_mint', { r: 3.4, bucket: 'big' })
  P('photo_spot_frame', 20, 14, PI + 0.5, 'luxo', { r: 3.4, bucket: 'big' }, 9)
  P('wayfinding_post', -6, 14, PI, 'luxo', { r: 1.2 })
  P('magazine_kiosk', -20, -32, 0.3, 'navy', { r: 3, bucket: 'big' }, 9)
  P('bike_rack', 8, -30, 0.3, 'char', { r: 2.2 })
  P('phone_booth_capsule', -30, -14, PI / 2, 'y2k', { r: 1.6 })
  P('vending_pod', 30, 12, -PI / 2, 'y2k', { r: 1.3 })
  P('drinking_fountain', -6, 31, 0, 'concrete', { r: 0.8 })
  P('drinking_fountain', 28, 8, 0, 'concrete', { r: 0.8 })
  P('bubble_car_parked', 34, -16, PI / 2, 'car_mustard', { r: 2, bucket: 'small' }, 8)
  // cafes do Centro: mesinhas de bistro com guarda-sol em frente a Cafe Rose / Salao
  for (const id of ['cafe-rose', 'salao-spa']) {
    const p = CITY.pois.find((q) => q.id === id)!
    const fx = Math.sin(p.facing)
    const fz = Math.cos(p.facing)
    const lx = fz
    const lz = -fx
    for (const [dd, lat, pal] of [[7.5, -4.6, 'umbrella'], [7.5, 4.6, 'umbrella'], [10.5, -3.4, 'umbrella']] as [number, number, string][]) {
      const x = p.x + fx * dd + lx * lat
      const z = p.z + fz * dd + lz * lat
      if (put('bistro_set', x, z, 0.4, 'wood', { r: 1.6, plaza: true })) put('patio_umbrella', x, z, 0, pal, { r: 0.4, free: true, collide: false, plaza: true })
    }
  }
}

// ---------------------------------------------------------------- 5) Avenida da Moda
{
  const ST = 'luxo'
  const shops = ['boutique', 'joalheria', 'estudio-fotos']
  for (const id of shops) {
    const p = CITY.pois.find((q) => q.id === id)!
    const fx = Math.sin(p.facing)
    const fz = Math.cos(p.facing)
    const lx = fz
    const lz = -fx
    // tapete vermelho curto da porta ate a calcada + manequins/palmeiras de cada lado
    const len = 5.2
    force('red_carpet_short', p.x + fx * (len / 2 + 0.2), p.z + fz * (len / 2 + 0.2), Math.atan2(fx, fz), ST, { bucket: 'walk', collide: false })
    for (const sg of [-1, 1]) {
      const x = p.x + fx * 2.2 + lx * sg * 4.4
      const z = p.z + fz * 2.2 + lz * sg * 4.4
      put('mannequin_display', x, z, Math.atan2(fx, fz), 'luxo', { r: 1.7, plaza: true })
      put('palm_planter_lux', p.x + fx * 6.4 + lx * sg * 3.4, p.z + fz * 6.4 + lz * sg * 3.4, 0, 'luxo', { r: 1.3, plaza: true })
    }
    put('brand_totem', p.x + fx * 1.2 + lx * 6.4, p.z + fz * 1.2 + lz * 6.4, Math.atan2(fx, fz), id === 'joalheria' ? 'char' : ST, { r: 1.2, plaza: true })
  }
  // praca das vitrines (0,-90): valet, holofotes, cafes, food trucks
  around('valet_stand', 9, -80, PI, ST, { plaza: true, r: 1.6 }, 4)
  for (const sx of [-1, 1]) around('spotlight_tower', sx * 11.5, -96, 0, 'char', { plaza: true, r: 1 }, 3)
  around('food_truck_icecream', -17, -98, PI / 2, 'truck_navy', { plaza: true, r: 3.4, bucket: 'big' }, 6)
  around('cafe_table_set', 7, -100, 0.3, 'luxo', { plaza: true, r: 1.6 }, 4)
  around('cafe_table_set', -8, -81, 0.9, 'luxo', { plaza: true, r: 1.6 }, 4)
  around('flower_cart', 10, -98, 0.2, 'flower_real', { plaza: true, r: 1.7 }, 4)
  // praca-moda (0,-150): totens e holofotes de evento
  for (const sx of [-1, 1]) around('spotlight_tower', sx * 7.2, -141, 0, 'char', { plaza: true, r: 1 }, 2)
  around('wayfinding_post', 6, -156, 0, ST, { plaza: true, r: 1.1 }, 3)
  // outdoor no fim da avenida e nas laterais
  force('billboard_fashion', 0, -202, 0, ST, { bucket: 'big', r: 4 })
  force('billboard_fashion', -50, -72.5, PI, ST, { bucket: 'big', r: 4, s: 0.8 })
  force('billboard_fashion', 50, -72.5, PI, 'char', { bucket: 'big', r: 4, s: 0.8 })
  for (const [x, z] of [[-12, -63], [13, -62]] as [number, number][]) around('vertical_shop_sign', x, z, PI, ST, { r: 1, plaza: true }, 4)
  // luzinhas atravessando a avenida e as ruas
  for (const z of [-118, -176]) force('string_lights_span', 0, z, 0, 'lights', { bucket: 'decor', r: 0 })
  for (const x of [-22, 22]) force('string_lights_span', x, -150, PI / 2, 'lights', { bucket: 'decor', s: 0.72 })
  for (const sx of [-34, 34]) for (const z of [-180]) force('string_lights_span', sx, z, 0, 'lights', { bucket: 'decor', s: 0.72 })
  // carros de luxo estacionados na praca
  around('car_convertible', -11, -150.5, PI / 2, 'car_cream', { plaza: true, r: 2.8, asphalt: false }, 3)
  around('car_convertible', 12, -92, 0.2, 'car_black', { plaza: true, r: 2.8 }, 4)
}

// ---------------------------------------------------------------- 6) Palco Neon
{
  const N = 'neon'
  const pn = CITY.pois.find((q) => q.id === 'palco-neon')!
  const cx = CITY.pois.find((q) => q.id === 'cassino')
  // filas de cordao diante do palco e do cassino
  for (const sz of [-1, 1]) force('queue_rope_line', pn.x - 4.5, sz * 2.6, 0, N, { bucket: 'walk', collide: false })
  if (cx) {
    for (const sx of [-1, 1]) force('queue_rope_line', cx.x + sx * 2.3, cx.z + 3.2, PI / 2, N, { bucket: 'walk', collide: false })
  }
  // praca neon (150,0): totens de luz em anel, poca refletiva, mesas altas
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2 + 0.3
    around('light_totem', 150 + Math.cos(a) * 7.4, Math.sin(a) * 7.4, 0, N, { plaza: true, r: 1 }, 2)
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + 1.0
    around('bar_stool_table', 150 + Math.cos(a) * 5.0, Math.sin(a) * 5.0, 0, N, { plaza: true, r: 1.2 }, 2)
  }
  around('food_truck_crepe', 140, -9, -PI / 2, 'truck_neon', { plaza: true, r: 3.4, bucket: 'big' }, 6)
  around('food_truck_icecream', 162, 11, PI / 2, 'truck_neon', { plaza: true, r: 3.4, bucket: 'big' }, 6)
  for (const [x, z] of [[146, 3], [156, -4], [152, 8]] as [number, number][]) force('neon_puddle', x, z, x, N, { bucket: 'walk', collide: false, y: 0.03 })
  // placas de neon ao longo das ruas
  for (const [x, z, rot] of [[154.5, -22, -PI / 2], [145.5, 22, PI / 2], [128, -30, 0], [170, 30, PI], [134, 30, PI], [166, -38, 0], [124, 4.6, PI]] as [number, number, number][]) around('neon_street_sign', x, z, rot, N, { r: 1.1 }, 3)
  for (const [x, z] of [[116, 3.3], [196, -3.3]] as [number, number][]) around('phone_booth_capsule', x, z, PI / 2, N, { r: 1.6 }, 4)
  around('vending_pod', 122, -3.5, PI, N, { r: 1.3 }, 5)
  around('vending_pod', 138, 38.5, PI, N, { r: 1.3 }, 5)
  // luzinhas e outdoors
  for (const x of [124, 176]) force('string_lights_span', x, 0, PI / 2, 'lights', { bucket: 'decor', r: 0 })
  for (const x of [132, 186]) {
    force('string_lights_span', x, -34, PI / 2, 'lights', { bucket: 'decor', s: 0.72 })
    force('string_lights_span', x, 34, PI / 2, 'lights', { bucket: 'decor', s: 0.72 })
  }
    around('billboard_fashion', 125, -50, PI, 'neon', { bucket: 'big', r: 4, s: 0.8, plaza: false }, 6)
  around('billboard_fashion', 196, 50, 0, 'neon', { bucket: 'big', r: 4, s: 0.8 }, 6)
  around('vertical_shop_sign', 166, 7.8, PI, N, { r: 1.1 }, 4)
}

// ---------------------------------------------------------------- 7) Jardim e Parque do Lago
{
  const G = 'garden'
  const jg = (piece: string, x: number, z: number, rot: number, pal: string, o: Opt = {}, mr = 6) => around(piece, x, z, rot, pal, { plaza: true, ...o }, mr)
  // pracinha do Jardim (0,158): arcos de rosas nas entradas, carrinhos, tapete de pedras
  for (const sg of [-1, 1]) {
    force('rose_arch', sg * 13.2, 158, PI / 2, 'white', { r: 0, collide: true })
    force('stepping_stones', sg * 10.8, 158, PI / 2, 'stone', { bucket: 'walk', collide: false, y: 0.02 })
  }
  jg('flower_cart', 6, 168.5, 0.3, 'flower_real', { r: 1.8 })
  jg('macaron_stand', -7, 167.5, -0.3, 'luxo', { r: 1.7 })
  jg('swing_bench', -12, 151, 0.5, 'white', { r: 2.6, bucket: 'big' }, 5)
  jg('pergola_flowers', 17.5, 166, 0, 'white', { r: 3.4, bucket: 'big' }, 6)
  jg('birdhouse_post', 10, 149.5, 0, 'wood', { r: 0.8 })
  jg('garden_pots_can', -9.5, 149, 0.3, G, { r: 1.2 })
  jg('picket_fence', -20, 133.4, 0, 'white', { r: 1.2 })
  for (const sg of [-1, 1]) {
    for (let i = 0; i < 3; i++) jg('picket_fence', sg * (45 + i * 2.1), 151.5, 0, 'white', { r: 1.05 }, 1)
  }
  jg('garden_lantern_hook', 5.5, 148.5, 0, 'forest', { r: 0.7 })
  jg('garden_lantern_hook', -5.5, 168.5, 0, 'forest', { r: 0.7 })
  jg('cafe_table_set', 16, 150, 0.4, 'white', { r: 1.7 }, 5)
  for (const x of [-60, -48, -22, 24, 48, 60]) jg('house_mailbox', x, 151.2, 0, 'wood', { r: 0.7 }, 3)
  force('bunting_span', -18, 158, PI / 2, G, { bucket: 'decor', s: 0.72 })
  force('bunting_span', 18, 158, PI / 2, G, { bucket: 'decor', s: 0.72 })
  force('bunting_span', -36, 176, 0, G, { bucket: 'decor', s: 0.72 })
  force('bunting_span', 36, 176, 0, G, { bucket: 'decor', s: 0.72 })
  // Parque do Lago: parquinho (nordeste), piquenique (sudoeste), pergolado (sudeste)
  const play = { x: 33, z: 74 }
  reserveDisc(play.x, play.z, 9)
  force('playground_swings', play.x, play.z, 0, 'play', { bucket: 'big', r: 3.2 })
  force('playground_slide', play.x + 6.2, play.z + 3.6, -PI / 2, 'play', { bucket: 'big', r: 2.4 })
  force('playground_seesaw', play.x - 1.5, play.z + 6.2, 0.2, 'play', { bucket: 'big', r: 2 })
  force('bench_simple', play.x - 6, play.z + 2, PI / 2, 'wood', { r: 1.2 })
  force('trash_bin_cute', play.x - 6.2, play.z + 4.4, 0, 'forest', { r: 0.7 })
  const pic = { x: -33, z: 113 }
  reserveDisc(pic.x, pic.z, 6)
  force('picnic_set', pic.x, pic.z, 0.35, G, { bucket: 'walk', collide: false, y: 0.02 })
  force('picnic_set', pic.x + 5, pic.z + 3, -0.4, G, { bucket: 'walk', collide: false, y: 0.02, s: 0.85 })
  force('garden_pots_can', pic.x - 4, pic.z - 3.2, 0, G, { r: 1.2 })
  force('pergola_flowers', 34, 112, 0.4, 'white', { bucket: 'big', r: 3.4 })
  reserveDisc(34, 112, 4.8)
  force('swing_bench', -34, 74, -0.5, 'white', { bucket: 'big', r: 2.6 })
  reserveDisc(-34, 74, 3.6)
  force('flower_cart', -8, 124, 0.3, 'flower_real', { r: 1.8 })
  for (const [x, z] of [[-27, 73], [27, 115], [-27, 115], [-14, 66.5], [14, 66.5], [14, 121.5], [-14, 121.5]] as [number, number][]) around('garden_lamp_low', x, z, 0, 'forest', { r: 0.7, plaza: true }, 2)
  jg('wayfinding_post', 5.5, 64.5, PI, 'wood', { r: 1.2 }, 3)
  jg('birdhouse_post', -40, 100, 0, 'wood', { r: 0.8 }, 3)
  jg('birdhouse_post', 41, 90, 0, 'wood', { r: 0.8 }, 3)
  jg('drinking_fountain', 20, 66, 0, 'white', { r: 0.8 }, 3)
  jg('bike_rack', -28, 66, 0.2, 'char', { r: 2.2 }, 4)
  jg('stepping_stones', -41, 85, 0.3, 'stone', { bucket: 'walk', collide: false, y: 0.02, r: 0.8 }, 3)
}

// ---------------------------------------------------------------- 8) Bairro Futuro (obra) - portao fechado
{
  const F = CITY.futuro
  const gx = F.x1
  // tapumes pintados diante da cerca (ladeando o portao)
  for (const sg of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const z = sg * (9.5 + i * 2.5)
      force('tapume_panel', gx + 1.15, z, -PI / 2 * 0 + PI / 2 * 1, 'plywood', { r: 0, bucket: 'small' })
    }
  }
  for (const z of [-6.5, 6.5]) {
    force('traffic_cone', gx + 2.6, z, 0, 'cone', { bucket: 'small', collide: false })
    force('traffic_cone', gx + 2.6, z + (z > 0 ? 1.6 : -1.6), 0, 'cone', { bucket: 'small', collide: false })
    force('road_barrier', gx + 3.4, z * 1.5, PI / 2, 'cone', { bucket: 'small' })
  }
  force('soon_sign', gx + 7.4, 12.5, PI / 2, 'plywood', { bucket: 'big', r: 2 })
  force('soon_sign', gx + 7.4, -12.5, PI / 2, 'plywood', { bucket: 'big', r: 2 })
  // guindastes e entulho (dentro do terreno, por tras da cerca)
  force('crane_toy', gx - 14, -16, 0.4, 'cone', { bucket: 'big' })
  force('crane_toy', gx - 30, 22, -1.0, 'cone', { bucket: 'big' })
  force('skip_dumpster', gx - 8, 22, 0.1, 'cone', { bucket: 'big' })
  force('skip_dumpster', gx - 8, -24, -0.2, 'cone', { bucket: 'big' })
  force('sand_pile_wheelbarrow', gx - 12, 10, 0.5, 'cone', { bucket: 'big' })
  for (let i = 0; i < 6; i++) force('traffic_cone', gx - 4 - (i % 3) * 1.1, 4 + i * 0.9, 0, 'cone', { bucket: 'small', collide: false })
  force('street_lamp_tall', gx + 3.2, -14, PI / 2, 'concrete', { bucket: 'small' })
  force('street_lamp_tall', gx + 3.2, 14, PI / 2, 'concrete', { bucket: 'small' })
}

// ---------------------------------------------------------------- 9) rotina final: tampas de bueiro no asfalto, cones das ruas
{
  const asphalt = roads.filter((r) => r.kind === 'avenue' || r.id.startsWith('moda') || r.id.startsWith('neon'))
  for (const r of asphalt) {
    const L = polylineLength(r.points)
    for (let s = 20 + rnd() * 20; s < L - 10; s += 38 + rnd() * 20) {
      const f = frameAt(r.points, s)
      const side = rnd() < 0.5 ? 1 : -1
      const x = f.x - f.tz * side * (half(r) - 1.9)
      const z = f.z + f.tx * side * (half(r) - 1.9)
      if (inPlaza(x, z, 1) || crosses.some((c) => Math.hypot(c.x - x, c.z - z) < 10)) continue
      B.walk.push({ piece: 'manhole_cover', x, z, y: 0.045, rot: s, pal: 'char', collide: false })
    }
  }
}

// ---------------------------------------------------------------- exportacao
/** massas (projetam sombra): casino/outdoors/food trucks/roda-gigante/parquinho/guindastes */
export const STREET_BIG: KitItem[] = big
/** mobiliario pequeno (corte curto de distancia, sem sombra) */
export const STREET_SMALL: KitItem[] = small
// varais e bandeirinhas entram junto dos pequenos (mesmo corte)
small.push(...decor)
/** varais e bandeirinhas (muito finos: corte curto) */
export const STREET_DECOR: KitItem[] = decor
/** pecas rasas (tapetes, fonte de piso, pedras, piquenique): malha com userData.walkable */
export const STREET_WALK: KitItem[] = walk
export const STREET_SMALL_DIST = 40
export const STREET_DECOR_DIST = 95

// o casino e um predio comum do layout (ver layout.ts SHOPS 'cassino'); a peca e posicionada aqui
{
  const b = CITY.blocks.find((q) => q.shopId === 'cassino')
  if (b) big.push({ piece: 'casino_building', x: b.x, z: b.z, rot: b.rot, pal: 'casino', collide: false })
}
void romanticReserved
