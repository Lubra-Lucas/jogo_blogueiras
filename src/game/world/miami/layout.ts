/**
 * Layout de MIAMI BEACH: dados puros (sem three.js), em metros, deterministico.
 * Mesmos eixos da cidade principal: +X = leste (o MAR fica a leste), +Z = sul, -Z = norte.
 *
 * De oeste para leste: aeroporto -> Washington Ave -> Collins Ave -> Ocean Drive (hoteis Art Deco) -> Lummus Park
 * (calcadao + ciclovia + gramado com palmeiras) -> areia (torres de salva-vidas, guarda-sois, beach club) -> mar raso -> pier.
 * O Lincoln Road (calcadao de pedestres) cruza tudo em z = 0 e termina no aeroporto.
 */
import type { Poi, Road, Vec2 } from '../city/layout'
import type { KitItem } from './kit'

export const MIAMI_HALF = 140

/** Perfil do mar: o fundo comeca a descer em SHORE_X; a agua (nivel WATER_Y) chega a cintura em WADE_X, onde ha um muro invisivel. */
export const SEA = {
  shoreX: 96,
  waterY: -0.22,
  slope: 0.0625, // m de queda por m
  /** muro invisivel (limite do banho): profundidade ~0,8 m */
  wallX: 113,
  /** fim da area visual do fundo (alem disso e so agua) */
  farX: 700,
} as const

/** altura do fundo do mar em x (0 na areia, descendo depois de shoreX) */
export function seaFloorY(x: number): number {
  if (x <= SEA.shoreX) return 0
  const d = x - SEA.shoreX
  // desce linear ate o muro e depois mais fundo (so visual)
  return d < 17 ? -d * SEA.slope : -17 * SEA.slope - (d - 17) * 0.09
}
/** profundidade da agua (m) em x: <= 0 = seco */
export const waterDepthAt = (x: number) => SEA.waterY - seaFloorY(x)

/** Pier: reto, de z fixo, do x inicial na areia ate a cabeca. */
export const PIER = { z: 60, x0: 88, segs: 8, segLen: 8, y: 0.3 }
export const pierHeadX = PIER.x0 + PIER.segs * PIER.segLen + 4.5

const OCEAN_X = 8
const COLLINS_X = -34
const WASH_X = -80
export const PROMENADE_X = 26
export const BIKE_X = 31.5
/** a areia comeca aqui */
export const SAND_X = 50
export const LAND_W = -150

export const MIAMI_ROADS: Road[] = [
  { id: 'ocean-drive', name: 'Ocean Drive', kind: 'avenue', width: 12, points: [[OCEAN_X, -135], [OCEAN_X, 135]] },
  { id: 'collins', name: 'Collins Avenue', kind: 'avenue', width: 12, points: [[COLLINS_X, -135], [COLLINS_X, 135]] },
  { id: 'washington', name: 'Washington Avenue', kind: 'street', width: 8, points: [[WASH_X, -135], [WASH_X, 135]] },
  { id: 'rua-5', name: '5th Street', kind: 'street', width: 8, points: [[-100, -90], [14, -90]] },
  { id: 'rua-8', name: '8th Street', kind: 'street', width: 8, points: [[-100, -45], [14, -45]] },
  { id: 'rua-12', name: '12th Street', kind: 'street', width: 8, points: [[-100, 45], [14, 45]] },
  { id: 'rua-15', name: '15th Street', kind: 'street', width: 8, points: [[-100, 90], [14, 90]] },
  { id: 'lincoln', name: 'Lincoln Road', kind: 'path', width: 14, points: [[-116, 0], [14, 0]] },
  { id: 'calcadao', name: 'Calçadão', kind: 'path', width: 5, points: [[PROMENADE_X, -135], [PROMENADE_X, 135]] },
  { id: 'ciclovia', name: 'Ciclovia', kind: 'path', width: 3.4, points: [[BIKE_X, -135], [BIKE_X, 135]] },
  // acesso a praia (travessias do calcadao ate a areia)
  { id: 'acesso-1', kind: 'path', width: 4, points: [[PROMENADE_X, -60], [PROMENADE_X + 30, -60], [SAND_X + 6, -60]] },
  { id: 'acesso-2', kind: 'path', width: 4, points: [[PROMENADE_X, 20], [PROMENADE_X + 30, 20], [SAND_X + 6, 20]] },
  { id: 'acesso-3', kind: 'path', width: 4, points: [[PROMENADE_X, 100], [PROMENADE_X + 30, 100], [SAND_X + 6, 100]] },
  // pier
  { id: 'pier', name: 'Píer', kind: 'path', width: 5, points: [[PIER.x0 - 6, PIER.z], [pierHeadX, PIER.z]] },
]

const T = (id: string, name: string, kind: Poi['kind'], x: number, z: number, facing: number, icon: string, color: string): Poi => ({
  id, name, kind, x, z, facing, district: 'miami', icon, color,
})

/** Pontos de interesse com porta (ids novos; `aeroporto` repete o id da cidade principal de proposito: o mesmo minijogo de check-in). */
export const MIAMI_POIS: Poi[] = [
  T('aeroporto', 'Aeroporto de Miami Beach', 'landmark', -119.4, 0, Math.PI / 2, 'A', '#35c0bd'),
  T('beach-club', 'Sunset Beach Club', 'landmark', 57.5, -34, -Math.PI / 2, 'B', '#f08a73'),
  T('loja-praia', 'Surf & Sun · Moda Praia', 'shop', -25.3, -26, -Math.PI / 2, 'M', '#4a9fd8'),
  T('sorveteria', 'Gelato Deco', 'shop', 41.3, 12, -Math.PI / 2, 'G', '#f6c6a2'),
  T('hotel-deco', 'Hotel Pastel Deco', 'landmark', -1.4, -18, Math.PI / 2, 'H', '#8fd6d2'),
]

/** onde a jogadora aparece ao chegar de aviao (a frente do balcao de check-in) e para onde olha */
export const MIAMI_ARRIVAL = { x: -113.5, z: 0, yaw: -Math.PI / 2 }

// ---------------------------------------------------------------- predios (encaixe por lotes)

function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Spec {
  piece: string
  w: number
  d: number
  /** eixos: tamanho da fachada x profundidade, pecas ja tem estas dimensoes na malha */
}
const SPECS: Record<string, Spec> = {
  deco_hotel_a: { piece: 'deco_hotel_a', w: 18, d: 13 },
  deco_hotel_b: { piece: 'deco_hotel_b', w: 16, d: 14 },
  deco_hotel_c: { piece: 'deco_hotel_c', w: 24, d: 12 },
  deco_tower: { piece: 'deco_tower', w: 9, d: 9 },
  deco_shop: { piece: 'deco_shop', w: 11, d: 9 },
}

/** paletas dos predios: cores reais de Miami Beach (menta, pessego, creme, celeste, limao, branco, aqua) */
export const BUILDING_PALS = ['mint', 'peach', 'cream', 'sky', 'lemon', 'white', 'aqua'] as const
export type BuildingKind = 'hotel' | 'shop'

export interface MiamiBuilding {
  id: string
  piece: string
  x: number
  z: number
  /** frente aponta para (sin rot, cos rot) */
  rot: number
  s: number
  pal: string
  w: number
  d: number
  h: number
  /** placa neon sobre a porta (peca 'sign_*') */
  sign?: string
}

export interface MiamiData {
  buildings: MiamiBuilding[]
  items: KitItem[]
  /** pecas de praia/rua que podem sumir mais cedo (props pequenos) */
  small: KitItem[]
  /** posicoes de torres de salva-vidas (para o minimapa) */
  towers: Vec2[]
  /** colisores invisiveis (limites, muro do mar) como caixas [cx, cy, cz, hx, hy, hz] */
  walls: [number, number, number, number, number, number][]
}

const HEIGHTS: Record<string, number> = { deco_hotel_a: 13, deco_hotel_b: 11, deco_hotel_c: 8, deco_tower: 14, deco_shop: 5 }

function build(): MiamiData {
  const rnd = mulberry(20261016)
  const buildings: MiamiBuilding[] = []
  const items: KitItem[] = []
  const small: KitItem[] = []
  const towers: Vec2[] = []
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)]
  const rr = (a: number, b: number) => a + rnd() * (b - a)
  let pal = 0
  const nextPal = () => BUILDING_PALS[pal++ % BUILDING_PALS.length]

  // cruzamentos (z) das ruas E-W; trechos de z livres entre elas para os lotes
  const crossings = [-135, -90, -45, 0, 45, 90, 135]
  const gapHalf = (z: number) => (z === 0 ? 8 : z === -135 || z === 135 ? 0 : 6.5)
  const segments: [number, number][] = []
  for (let i = 0; i < crossings.length - 1; i++) {
    const a = crossings[i] + gapHalf(crossings[i]) + 1
    const b = crossings[i + 1] - gapHalf(crossings[i + 1]) - 1
    if (b - a > 8) segments.push([a, b])
  }

  /** enche um trecho [a, b] de z com predios de uma lista de especies; frente para `rot`; face a `faceX`. */
  const fillRow = (faceX: number, dir: 1 | -1, rot: number, kinds: string[], [a, b]: [number, number], opts: { jitter?: number; scaleMin?: number; scaleMax?: number } = {}) => {
    let z = a + 0.5
    let guard = 0
    while (z < b - 7 && guard++ < 12) {
      const kind = pick(kinds)
      const sp = SPECS[kind]
      const s = rr(opts.scaleMin ?? 0.92, opts.scaleMax ?? 1.12)
      const w = sp.w * s
      if (z + w > b + 0.5) {
        // tenta uma peca mais estreita
        const small = kinds.map((k) => SPECS[k]).filter((p) => p.w * 0.95 + z <= b + 0.5).sort((p, q) => q.w - p.w)[0]
        if (!small) break
        const s2 = Math.min(1.05, (b + 0.5 - z) / small.w)
        const w2 = small.w * s2
        place(small.piece, small, s2, faceX, dir, rot, z + w2 / 2)
        z += w2 + 1.2
        continue
      }
      place(kind, sp, s, faceX, dir, rot, z + w / 2)
      z += w + 1.2 + rnd() * 1.5
    }
  }
  const place = (kind: string, sp: Spec, s: number, faceX: number, dir: 1 | -1, rot: number, zc: number) => {
    const d = sp.d * s
    buildings.push({
      id: `b${buildings.length}`,
      piece: kind,
      x: faceX + dir * (d / 2),
      z: zc,
      rot,
      s,
      pal: nextPal(),
      w: sp.w * s,
      d,
      h: HEIGHTS[kind] * s,
    })
  }

  const HOTELS = ['deco_hotel_a', 'deco_hotel_b', 'deco_hotel_c', 'deco_tower', 'deco_hotel_a']
  const SHOPS = ['deco_shop', 'deco_shop', 'deco_hotel_b', 'deco_shop', 'deco_hotel_a']
  const E = Math.PI / 2 // frente para +X (leste)
  const Wd = -Math.PI / 2 // frente para -X (oeste)

  // Ocean Drive, lado oeste: hoteis Art Deco com a frente para a praia (+X)
  for (const seg of segments) fillRow(-1.6, -1, E, HOTELS, seg, { scaleMin: 0.95, scaleMax: 1.1 })
  // Collins, lado leste (frente para oeste, para a Collins) e lado oeste (frente para leste)
  for (const seg of segments) fillRow(COLLINS_X + 9, 1, Wd, SHOPS, seg, { scaleMin: 0.9, scaleMax: 1.0 })
  for (const seg of segments) fillRow(COLLINS_X - 9, -1, E, SHOPS, seg, { scaleMin: 0.9, scaleMax: 1.0 })
  // Washington: dois lados, baixa
  for (const seg of segments) fillRow(WASH_X + 7, 1, Wd, ['deco_shop', 'deco_hotel_b'], seg, { scaleMin: 0.9, scaleMax: 1.0 })
  for (const seg of segments) fillRow(WASH_X - 7, -1, E, ['deco_shop', 'deco_hotel_a', 'deco_shop'], seg, { scaleMin: 0.9, scaleMax: 1.0 })

  // Lincoln Road: lojas dos dois lados do calcadao (norte: frente para sul, sul: frente para norte), de x=-95 ate -12
  for (const side of [-1, 1] as const) {
    let x = -108
    while (x < -16) {
      if (Math.abs(x - COLLINS_X) < 11 || Math.abs(x - WASH_X) < 9) {
        x += 6
        continue
      }
      const s = rr(0.9, 1.0)
      const w = SPECS.deco_shop.w * s
      buildings.push({
        id: `b${buildings.length}`,
        piece: 'deco_shop',
        x: x + w / 2,
        z: side * (7 + 1.6 + (SPECS.deco_shop.d * s) / 2),
        rot: side < 0 ? 0 : Math.PI,
        s,
        pal: nextPal(),
        w,
        d: SPECS.deco_shop.d * s,
        h: HEIGHTS.deco_shop * s,
      })
      x += w + 2.4
    }
  }

  // ---- predios especiais (POIs) substituem os de lote mais proximos: marcamos com id fixo depois do encaixe ----
  const special = (id: string, piece: string, x: number, z: number, rot: number, pal: string, sign?: string, s = 1) => {
    const sp = SPECS[piece]
    // remove lotes que colidem
    const r = (sp.w * s) / 2 + 1
    const rotated = Math.abs(Math.sin(rot)) > 0.5
    const hw = rotated ? (sp.d * s) / 2 : (sp.w * s) / 2
    const hd = rotated ? (sp.w * s) / 2 : (sp.d * s) / 2
    void r
    for (let i = buildings.length - 1; i >= 0; i--) {
      const b = buildings[i]
      const brot = Math.abs(Math.sin(b.rot)) > 0.5
      const bhw = brot ? b.d / 2 : b.w / 2
      const bhd = brot ? b.w / 2 : b.d / 2
      if (Math.abs(b.x - x) < hw + bhw + 0.3 && Math.abs(b.z - z) < hd + bhd + 0.3) buildings.splice(i, 1)
    }
    buildings.push({ id, piece, x, z, rot, s, pal, w: sp.w * s, d: sp.d * s, h: HEIGHTS[piece] * s, sign })
  }
  // hotel (porta em x ~ -1.4; frente para +X)
  special('hotel-deco', 'deco_hotel_a', -1.6 - 6.5, -18, E, 'mint', 'sign_hotel')
  // loja moda praia na Collins, lado leste (frente para oeste)
  special('loja-praia', 'deco_shop', COLLINS_X + 9 + 4.5, -26, Wd, 'sky', 'sign_surf')
  // sorveteria no parque (gramado), frente para oeste (calcadao)
  special('sorveteria', 'deco_shop', 41.3 + 4.5, 12, Wd, 'peach', 'sign_gelato')

  // ---------------------------------------------------------------- adereços de rua e parque
  const palm = (x: number, z: number, big = true) => {
    const s = rr(0.85, 1.15)
    items.push({ piece: big ? (rnd() < 0.3 ? 'palm_coconut' : 'palm_royal') : 'palm_small', x, z, rot: rnd() * 6.28, s, pal: 'nat' })
  }
  // calcadas: palmeiras ao longo de Ocean Drive (lado da praia) e Collins
  for (let z = -128; z <= 128; z += 12) {
    if (Math.abs(z) < 9) continue // Lincoln Road
    palm(OCEAN_X + 6.9, z + rr(-1, 1))
    palm(COLLINS_X + 6.8, z + 6 + rr(-1, 1))
    palm(COLLINS_X - 6.8, z + rr(-1, 1), false)
  }
  // Lummus Park: duas fileiras de palmeiras e bosque junto a areia
  for (let z = -130; z <= 130; z += 9) {
    palm(19.5, z + rr(-1.5, 1.5))
    palm(37 + rr(-1, 1), z + 4.5 + rr(-1.5, 1.5))
    if (rnd() < 0.55) palm(43 + rr(-1.5, 1.5), z + rr(-3, 3))
  }
  // Lincoln Road: palmeiras pequenas em vasos + bancos
  for (let x = -110; x < 0; x += 9) {
    if (Math.abs(x - COLLINS_X) < 9 || Math.abs(x - WASH_X) < 7) continue
    small.push({ piece: 'planter_deco', x, z: -3.2, rot: 0, pal: 'white' })
    small.push({ piece: 'planter_deco', x, z: 3.2, rot: 0, pal: 'white' })
    items.push({ piece: 'palm_small', x, z: -3.2, y: 0.55, rot: rnd() * 6, s: 0.9, pal: 'nat', collide: false })
    items.push({ piece: 'palm_small', x, z: 3.2, y: 0.55, rot: rnd() * 6, s: 0.9, pal: 'nat', collide: false })
    if (rnd() < 0.5) small.push({ piece: 'bench_deco', x: x + 4.5, z: rnd() < 0.5 ? -4.6 : 4.6, rot: 0, pal: 'cream' })
  }
  // postes: Ocean Drive, Collins, calcadao (a noite acendem)
  for (let z = -130; z <= 130; z += 20) {
    small.push({ piece: 'lamp_deco', x: OCEAN_X - 5.2, z, rot: 0, pal: 'cream' })
    small.push({ piece: 'lamp_deco', x: PROMENADE_X + 3.1, z: z + 10, rot: 0, pal: 'cream' })
    if (z % 40 === 0) small.push({ piece: 'lamp_deco', x: COLLINS_X + 5.2, z, rot: 0, pal: 'cream' })
  }
  // bancos e lixeiras no calcadao
  for (let z = -120; z <= 120; z += 24) {
    small.push({ piece: 'bench_deco', x: PROMENADE_X - 3.4, z: z + 5, rot: Wd, pal: 'aqua' })
    small.push({ piece: 'bench_deco', x: PROMENADE_X + 3.4, z: z + 17, rot: E, pal: 'peach' })
    small.push({ piece: 'trash_bin', x: PROMENADE_X - 3.3, z: z + 9, rot: 0, pal: 'aqua' })
  }
  // quiosques deco no parque e carrinho de sorvete
  small.push({ piece: 'kiosk_deco', x: 41, z: -72, rot: Wd, pal: 'aqua' })
  small.push({ piece: 'kiosk_deco', x: 41, z: 74, rot: Wd, pal: 'lemon' })
  small.push({ piece: 'icecream_cart', x: PROMENADE_X + 5.5, z: -8, rot: Wd, pal: 'mint' })
  small.push({ piece: 'icecream_cart', x: PROMENADE_X + 5.5, z: 40, rot: Wd, pal: 'peach' })
  small.push({ piece: 'surf_rack', x: -25.5 - 0.2, z: -32.2, rot: Wd, pal: 'sky' })
  // arbustos nas bordas do gramado
  for (let z = -128; z <= 128; z += 8) if (rnd() < 0.6) small.push({ piece: 'shrub', x: 46.5 + rr(-0.5, 0.5), z: z + rr(-2, 2), rot: rnd() * 6, pal: 'nat' })

  // ---------------------------------------------------------------- praia
  const LG: string[] = ['lg_yellow', 'lg_turq', 'lg_coral', 'lg_blue', 'lg_green']
  const TZ = [-112, -78, -42, -6, 34, 78, 118]
  TZ.forEach((z, i) => {
    items.push({ piece: 'lifeguard_tower', x: 76, z, rot: -Math.PI / 2, pal: LG[i % LG.length] })
    towers.push([76, z])
  })
  // guarda-sois e espreguicadeiras em fileiras (evita a faixa do Beach Club e das quadras)
  const reserved = (x: number, z: number) => (x > 54 && x < 82 && z > -52 && z < -16) || (x > 62 && x < 88 && z > 62 && z < 96) || Math.abs(z - PIER.z) < 5
  const UMB = ['mint', 'peach', 'sky', 'lemon', 'aqua', 'white']
  let n = 0
  for (let z = -124; z <= 124; z += 8.5) {
    for (const x of [60, 66.5, 84]) {
      if (reserved(x, z) || rnd() < 0.18) continue
      const pal2 = UMB[n++ % UMB.length]
      small.push({ piece: 'umbrella', x, z, rot: rnd() * 6, pal: pal2 })
      small.push({ piece: 'lounger', x: x - 0.2, z: z - 1.2, rot: Math.PI / 2 + rr(-0.2, 0.2), pal: pal2 })
      small.push({ piece: 'lounger', x: x - 0.2, z: z + 1.2, rot: Math.PI / 2 + rr(-0.2, 0.2), pal: pal2 })
      if (rnd() < 0.5) small.push({ piece: 'beach_towel', x: x + 1.8, z: z + rr(-1.3, 1.3), rot: rr(-0.4, 0.4), pal: pick(UMB) })
    }
  }
  // Beach Club (bar tiki + cabanas + espreguicadeiras) e quadras de volei
  items.push({ piece: 'beach_bar', x: 62.5, z: -34, rot: Wd, pal: 'nat' })
  items.push({ piece: 'sign_beach', x: 59.4, z: -34, y: 2.9, rot: Wd, pal: 'white', collide: false, s: 0.9 })
  ;[-47, -41, -27, -21].forEach((z, i) => items.push({ piece: 'cabana', x: 70.5, z, rot: -Math.PI / 2, pal: i % 2 ? 'mint' : 'peach' }))
  for (let k = 0; k < 4; k++) small.push({ piece: 'lounger', x: 76.5, z: -46 + k * 8.4, rot: Math.PI / 2, pal: UMB[k] })
  items.push({ piece: 'vball_net', x: 74, z: 72, rot: 0, pal: 'white' })
  items.push({ piece: 'vball_net', x: 74, z: 84, rot: 0, pal: 'white' })
  // pier
  for (let i = 0; i < PIER.segs; i++) {
    items.push({ piece: 'pier_deck', x: PIER.x0 + PIER.segLen * (i + 0.5), z: PIER.z, y: PIER.y - 0.3, rot: Math.PI / 2, pal: 'white' })
  }
  items.push({ piece: 'pier_head', x: pierHeadX, z: PIER.z, y: PIER.y - 0.3, rot: Math.PI / 2, pal: 'white' })
  for (let i = 0; i < PIER.segs; i += 2) small.push({ piece: 'lamp_deco', x: PIER.x0 + PIER.segLen * (i + 0.5), z: PIER.z - 2.2, rot: 0, pal: 'cream', y: PIER.y })
  small.push({ piece: 'bench_deco', x: pierHeadX - 3, z: PIER.z + 3.6, rot: Math.PI, pal: 'mint', y: PIER.y })
  small.push({ piece: 'bench_deco', x: pierHeadX - 3, z: PIER.z - 3.6, rot: 0, pal: 'peach', y: PIER.y })
  // letreiro grande de boas-vindas sobre a Ocean Drive (placa MIAMI BEACH no inicio da rua)
  items.push({ piece: 'sign_miami', x: -26.5, z: 0, y: 3.2, rot: Wd, pal: 'white', collide: false })

  // ---------------------------------------------------------------- aeroporto
  items.push({ piece: 'airport_terminal', x: -124, z: 0, rot: E, pal: 'white' })
  items.push({ piece: 'checkin_counter', x: -121.8, z: 0, rot: E, pal: 'mint' })
  items.push({ piece: 'sign_airport', x: -113.0, z: 0, y: 9.55, rot: E, pal: 'white', collide: false, s: 1.25 })
  items.push({ piece: 'airplane_deco', x: -104, z: -24, rot: 0.6, pal: 'white', y: 2.5 })
  // bandeirolas e palmeiras de entrada
  for (const z of [-14, -8, 8, 14]) items.push({ piece: z % 2 ? 'palm_coconut' : 'palm_royal', x: -112, z, rot: z, s: 0.95, pal: 'nat' })

  // ---------------------------------------------------------------- limites invisiveis
  const walls: MiamiData['walls'] = []
  const H2 = 3
  // oeste, norte, sul (mantem a jogadora na ilha)
  walls.push([LAND_W + 8, H2, 0, 1, H2, 140], [-5, H2, -140, 160, H2, 1], [-5, H2, 140, 160, H2, 1])
  // muro do mar (depois do pier ha um vao de 6 m)
  walls.push([SEA.wallX + 0.5, H2, (-140 + (PIER.z - 3)) / 2, 0.5, H2, (PIER.z - 3 + 140) / 2])
  walls.push([SEA.wallX + 0.5, H2, (PIER.z + 3 + 140) / 2, 0.5, H2, (140 - PIER.z - 3) / 2])
  // fechamento do fim do pier ja existe (guarda-corpo), fechamento norte-sul alem do muro
  walls.push([SEA.wallX + 40, H2, -141, 40, H2, 1], [SEA.wallX + 40, H2, 141, 40, H2, 1])
  return { buildings, items, small, towers, walls }
}

export const MIAMI: MiamiData = build()

// ---------------------------------------------------------------- consultas

export function miamiLocate(x: number, z: number): { id: string; name: string } {
  if (x > SEA.shoreX + 3.5) return { id: 'mar', name: x > SEA.wallX - 1 && Math.abs(z - PIER.z) < 4 ? 'Píer' : 'Mar de Miami Beach' }
  if (x > PIER.x0 - 2 && Math.abs(z - PIER.z) < 3.5) return { id: 'pier', name: 'Píer' }
  if (x > SAND_X) return { id: 'praia', name: 'Praia de Miami Beach' }
  if (x > 15) return { id: 'lummus', name: 'Lummus Park' }
  if (x < -100 && Math.abs(z) < 30) return { id: 'aeroporto', name: 'Aeroporto de Miami Beach' }
  if (Math.abs(z) < 8 && x < 2) return { id: 'lincoln', name: 'Lincoln Road' }
  for (const r of MIAMI_ROADS) {
    if (!r.name || r.kind === 'path') continue
    const pts = r.points
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i]
      const [bx, bz] = pts[i + 1]
      const dx = bx - ax
      const dz = bz - az
      const l2 = dx * dx + dz * dz || 1
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2))
      if (Math.hypot(x - (ax + t * dx), z - (az + t * dz)) <= r.width / 2 + 3) return { id: r.id, name: r.name }
    }
  }
  return { id: 'miami', name: 'Miami Beach' }
}

/** pontos de captura/atalho (ids para a navegacao e o celular) */
export const MIAMI_SPAWNS: Record<string, Vec2> = {
  spawn: [MIAMI_ARRIVAL.x, MIAMI_ARRIVAL.z],
  'ocean-drive': [14.5, -4],
  lincoln: [-20, 0],
  praia: [66, 2],
  lummus: [38, 4],
  pier: [PIER.x0 + 4, PIER.z],
  mar: [SEA.shoreX + 1.5, 0],
}
for (const p of MIAMI_POIS) MIAMI_SPAWNS[p.id] = [p.x + Math.sin(p.facing) * 4, p.z + Math.cos(p.facing) * 4]
