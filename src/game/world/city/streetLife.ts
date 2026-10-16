import { CITY, polylineLength, type Block } from './layout'
import type { KitItem } from './kit'
import { reserveDisc } from './romantic'
import { around, asphaltClear, districtOf, force, frameAt, inBlock, inLake, inPlaza, put, roads, STREET_CLUTTER, STREET_ROOF, STREET_SMALL, STREET_WALL, taken, type Opt } from './streetProps'

/**
 * Vida da rua, rodada 2 (props_more: pecas de tools/blender/city_props_more_e/f/g.py): vendedores, miudezas de calcada, vitrines,
 * outdoors, murais, bandeiras, telhados, parques, pier, obra. Tudo deterministico; usa as mesmas regras de ocupacao de streetProps.ts
 * (put/around recusam asfalto, praca, lago, predio e corredor de porta). Buckets: clutter (corte ~34 m), vend (~60 m), wall, roof, walk.
 */
const PI = Math.PI
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
const rnd = rng(777001)
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)]
const poi = (id: string) => CITY.pois.find((p) => p.id === id)

const CL: Opt = { bucket: 'clutter' }
const VEND: Opt = { bucket: 'vend' }

/** ponto a (fwd, lat) m da porta de uma loja (fwd = para fora da fachada, lat = para a esquerda de quem sai) */
function atDoor(id: string, fwd: number, lat: number) {
  const p = poi(id)!
  const fx = Math.sin(p.facing)
  const fz = Math.cos(p.facing)
  return { x: p.x + fx * fwd + fz * lat, z: p.z + fz * fwd - fx * lat, rot: Math.atan2(fx, fz), fx, fz }
}

// ---------------------------------------------------------------- 1) Centro: cafes, feira, vendedores, servicos
{
  for (const id of ['cafe-rose', 'salao-spa']) {
    const flip = id === 'salao-spa' ? -1 : 1
    // lousa, baldes de flores, jornais ao lado da porta; aquecedor entre as mesinhas; tapete na entrada
    for (const [fwd, lat, piece, pal, r, o] of [
      [3.2, 3.4 * flip, 'chalkboard_sign', 'chalk', 0.6, CL],
      [3.4, -3.6 * flip, 'flower_buckets', 'buckets', 1.0, CL],
      [11.5, 0.2, 'patio_heater', 'char', 0.6, CL],
      [8.5, -1.3, 'dog_bowl_post', 'wood', 0.6, CL],
      [4.6, 0.0, 'cafe_rug', 'rug', 0.4, { bucket: 'walk', collide: false, plaza: true, y: 0.012 } as Opt],
    ] as [number, number, string, string, number, Opt][]) {
      const d = atDoor(id, fwd, lat)
      around(piece, d.x, d.z, d.rot + (piece === 'cafe_rug' ? 0 : lat * 0.05), pal, { plaza: true, r, ...o }, 3)
    }
    const o1 = atDoor(id, 3.0, -7.4 * flip)
    around('potted_olive', o1.x, o1.z, 0, 'olive', { plaza: true, r: 0.9, ...CL }, 3)
    const o2 = atDoor(id, 3.0, 7.0 * flip)
    around('potted_olive', o2.x, o2.z, 0, 'olive', { plaza: true, r: 0.9, ...CL }, 3)
  }
  // servicos na praca central e arredores (nada na pista nem na fonte)
  const P = (piece: string, x: number, z: number, rot: number, pal: string, o: Opt, mr = 4) => around(piece, x, z, rot, pal, { plaza: true, ...o }, mr)
  P('charging_station', -12.5, -27, 0.2, 'char', { r: 0.8, ...CL })
  P('charging_station', 27, 24, PI + 0.8, 'y2k', { r: 0.8, ...CL })
  P('bike_share_dock', 17, 30, PI, 'forest', { r: 2.4, ...CL }, 5)
  P('bike_share_dock', -28, -4, PI / 2, 'forest', { r: 2.4, ...CL }, 5)
  P('post_box_pillar', 3, 34, PI, 'post_red', { r: 0.7, ...CL })
  P('post_box_pillar', -3.5, -35, 0, 'post_blue', { r: 0.7, ...CL })
  P('newspaper_box', 8.6, -34.5, PI, 'navy', { r: 0.7, ...CL })
  P('newspaper_stack', 9.8, -34.2, 0.3, 'bags', { r: 0.4, free: true, collide: false, ...CL })
  P('hotdog_cart', -4, 27, 0.4, 'cartyel', { r: 1.8, ...VEND })
  P('fruit_stand', 29, -22, -PI / 2, 'market', { r: 2.0, ...VEND }, 5)
  P('flower_kiosk', -22, 17, 0.9, 'forest', { r: 2.4, ...VEND }, 6)
  P('coffee_cart', 4, -27, PI, 'wood', { r: 1.5, ...VEND })
  P('hopscotch', -8, 36, 0.2, 'chalk', { r: 1.4, bucket: 'walk', collide: false, y: 0.012 })
  P('bird_bath', 21, 19, 0, 'stone', { r: 0.6, ...CL })
}

// ---------------------------------------------------------------- 2) ruas: miudezas ao longo das calcadas por bairro
{
  for (const r of roads) {
    const L = polylineLength(r.points)
    const avenue = r.kind === 'avenue'
    const sw = avenue ? 5.2 : 3.4
    for (let s = 12 + rnd() * 14; s < L - 6; s += 26 + rnd() * 24) {
      const f = frameAt(r.points, s)
      const side = rnd() < 0.5 ? 1 : -1
      const nx = -f.tz * side
      const nz = f.tx * side
      const x = f.x + nx * sw
      const z = f.z + nz * sw
      const d = districtOf(x, z)
      if (d === 'futuro') continue
      const face = Math.atan2(-nx, -nz) // frente para a via
      const para = Math.atan2(f.tx, f.tz)
      const roll = rnd()
      if (d === 'moda') {
        if (roll < 0.32) put('topiary_planter', x, z, para, 'gold', { r: 0.9, ...CL })
        else if (roll < 0.55) put('gold_planter', x, z, para, 'gold', { r: 1.1, ...CL })
        else if (roll < 0.7) put('newspaper_box', x, z, face, 'char', { r: 0.7, ...CL })
        else if (roll < 0.85) put('chalkboard_sign', x, z, face + 0.3, 'chalk', { r: 0.6, ...CL })
        else put('charging_station', x, z, face, 'char', { r: 0.8, ...CL })
      } else if (d === 'neon') {
        if (roll < 0.4) put('arcade_machine', x, z, face, 'arcade', { r: 0.9, ...CL, over: pick([{ soft: '#ff3fb4' }, { soft: '#35e8ff' }, { accent2: '#ffd23f' }]) })
        else if (roll < 0.62) put('neon_arrow_sign', x, z, para + (rnd() < 0.5 ? 0 : PI), 'neon', { r: 0.9, ...CL })
        else if (roll < 0.8) put('newspaper_box', x, z, face, 'neon', { r: 0.7, ...CL })
        else put('charging_station', x, z, face, 'neon', { r: 0.8, ...CL })
      } else if (d === 'jardim') {
        if (roll < 0.35) put('potted_olive', x, z, 0, 'olive', { r: 0.9, ...CL })
        else if (roll < 0.6) put('flower_buckets', x, z, face, 'buckets', { r: 1.0, ...CL })
        else if (roll < 0.8) put('dog_bowl_post', x, z, face, 'wood', { r: 0.6, ...CL })
        else put('chalkboard_sign', x, z, face + 0.3, 'chalk', { r: 0.6, ...CL })
      } else {
        if (roll < 0.3) put('chalkboard_sign', x, z, face + 0.3, 'chalk', { r: 0.6, ...CL })
        else if (roll < 0.55) put('potted_olive', x, z, 0, 'olive', { r: 0.9, ...CL })
        else if (roll < 0.75) put('newspaper_box', x, z, face, 'navy', { r: 0.7, ...CL })
        else put('charging_station', x, z, face, 'y2k', { r: 0.8, ...CL })
      }
    }
  }
  // sacolas de compras sobre bancos (bancos de rua ja colocados por streetProps)
  let k = 0
  for (const b of [...STREET_SMALL]) {
    if (b.piece !== 'bench_simple' || k++ % 2) continue
    const along = b.rot ?? 0
    // banco: 1.8 m ao longo do eixo X local; a sacola fica a 0.45 m de um dos extremos
    const sx = Math.cos(along) * 0.5
    const sz = -Math.sin(along) * 0.5
    STREET_CLUTTER.push({ piece: 'shopping_bags', x: b.x + sx, z: b.z + sz, y: 0.48, rot: along + 0.3, s: 0.8, pal: 'bags', collide: false })
  }
}

// ---------------------------------------------------------------- 3) Avenida da Moda
{
  // limusine e jardineiras junto as lojas; carrinho de cafe e floricultura na praca das vitrines
  around('limo_black', 6.6, -136.5, 0, 'car_black', { asphalt: true, r: 3.4, ...VEND }, 3)
  around('limo_black', -6.4, -86, PI, 'car_black', { asphalt: true, r: 3.4, ...VEND }, 3)
  around('coffee_cart', -6, -84, 0.5, 'wood', { plaza: true, r: 1.5, ...VEND }, 5)
  around('flower_kiosk', 12.5, -89, -PI / 2, 'forest', { plaza: true, r: 2.4, ...VEND }, 5)
  around('fruit_stand', -13, -92, PI / 2, 'market', { plaza: true, r: 2.0, ...VEND }, 5)
  around('bike_share_dock', 2, -156, 0, 'char', { plaza: true, r: 2.4, ...CL }, 5)
  around('charging_station', -5.5, -153, 0.4, 'char', { plaza: true, r: 0.8, ...CL }, 3)
  around('post_box_pillar', 6, -145, 0, 'post_blue', { plaza: true, r: 0.7, ...CL }, 3)
  for (const [x, z] of [[-3, -141], [3.5, -92], [-9, -100]] as [number, number][]) around('topiary_planter', x, z, 0, 'gold', { plaza: true, r: 0.9, ...CL }, 3)
  around('hopscotch', -11, -153, 0.2, 'chalk', { plaza: true, r: 1.4, bucket: 'walk', collide: false, y: 0.012 }, 3)
  // placas de lojas: lousas e baldes
  for (const id of ['boutique', 'joalheria', 'estudio-fotos']) {
    const d = atDoor(id, 4.2, 3.0)
    around('chalkboard_sign', d.x, d.z, d.rot + 0.2, 'chalk', { plaza: true, r: 0.6, ...CL }, 2)
    const e = atDoor(id, 4.0, -3.2)
    around('gold_planter', e.x, e.z, d.rot + PI / 2, 'gold', { plaza: true, r: 1.1, ...CL }, 2)
  }
}

// ---------------------------------------------------------------- 4) Palco Neon
{
  const cx = poi('cassino')
  const pn = poi('palco-neon')!
  if (cx) {
    for (const [dx, dz, ov] of [[-6.5, 7.2, { soft: '#ff3fb4' }], [-4.5, 7.4, { soft: '#35e8ff' }], [4.5, 7.4, { accent2: '#ffd23f' }], [6.5, 7.2, { soft: '#ff3fb4' }]] as [number, number, Partial<Record<'soft' | 'accent2', string>>][]) {
      around('arcade_machine', cx.x + dx, cx.z + dz, 0, 'arcade', { r: 0.9, ...CL, over: ov }, 5)
    }
    around('neon_arrow_sign', cx.x - 9.5, cx.z + 4, -PI / 2, 'neon', { r: 0.9, ...CL }, 3)
    around('neon_arrow_sign', cx.x + 9.5, cx.z + 4, -PI / 2, 'neon', { r: 0.9, ...CL }, 3)
  }
  around('neon_arrow_sign', pn.x - 8, 10, -PI / 2, 'neon', { r: 0.9, ...CL }, 3)
  around('neon_arrow_sign', pn.x - 8, -10, -PI / 2, 'neon', { r: 0.9, ...CL }, 3)
  around('hotdog_cart', 143, 12, 0.6, 'cartyel', { plaza: true, r: 1.8, ...VEND }, 5)
  around('hotdog_cart', 157, -11, PI + 0.4, 'cartyel', { plaza: true, r: 1.8, ...VEND }, 5)
  around('coffee_cart', 149, 13, PI, 'wood', { plaza: true, r: 1.5, ...VEND }, 5)
  around('bike_share_dock', 118, 6, PI / 2, 'neon', { r: 2.4, ...CL }, 5)
  around('charging_station', 156, 6, 0.5, 'neon', { plaza: true, r: 0.8, ...CL }, 3)
  around('post_box_pillar', 126, -5, PI, 'post_blue', { r: 0.7, ...CL }, 3)
}

// ---------------------------------------------------------------- 5) Jardim e Parque do Lago
{
  const G = (piece: string, x: number, z: number, rot: number, pal: string, o: Opt = {}, mr = 4) => around(piece, x, z, rot, pal, { plaza: true, ...o }, mr)
  G('fruit_stand', 9, 164, PI, 'market', { r: 2.0, ...VEND }, 5)
  G('flower_kiosk', -11, 164, PI, 'forest', { r: 2.4, ...VEND }, 5)
  G('coffee_cart', 3, 150, 0, 'wood', { r: 1.5, ...VEND }, 5)
  G('bird_bath', -3.5, 154, 0, 'stone', { r: 0.6, ...CL }, 3)
  G('bird_bath', 4, 163, 0.5, 'stone', { r: 0.6, ...CL }, 3)
  G('hopscotch', 0, 170, 0, 'chalk', { r: 1.4, bucket: 'walk', collide: false, y: 0.012 }, 3)
  G('post_box_pillar', 14, 168, PI, 'post_red', { r: 0.7, ...CL }, 3)
  G('dog_bowl_post', 7, 152, 0.5, 'wood', { r: 0.6, ...CL }, 3)
  // Parque do Lago: cachorródromo, academia ao ar livre, piqueniques, pier + barcos
  {
    const cx = -39
    const cz = 84
    const W = 9
    const D = 7
    reserveDisc(cx, cz, 7)
    for (const sz of [-1, 1]) for (let i = 0; i < 3; i++) force('dog_park_fence', cx - W / 2 + 1.5 + i * 3, cz + sz * D / 2, 0, 'forest', { bucket: 'clutter', r: 0 })
    for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) force('dog_park_fence', cx + sx * W / 2, cz - D / 2 + 1.75 + i * 3.5, PI / 2, 'forest', { bucket: 'clutter', r: 0 })
    force('dog_agility', cx, cz - 0.5, 0.2, 'play', { bucket: 'clutter', r: 0 })
    force('dog_bowl_post', cx + W / 2 + 0.9, cz + 1, -PI / 2, 'wood', { bucket: 'clutter', r: 0.6 })
    taken.push({ x: cx, z: cz, r: 6 })
  }
  {
    reserveDisc(39, 102, 3.5)
    force('outdoor_gym', 39, 102, -PI / 2, 'concrete', { bucket: 'vend', r: 2.6 })
    force('drinking_fountain', 36, 106.5, 0, 'concrete', { bucket: 'clutter', r: 0.8 })
  }
  for (const [x, z, rot] of [[-30, 120, 0.2], [26, 98, -0.3], [-14, 68, 0.5]] as [number, number, number][]) {
    reserveDisc(x, z, 2.6)
    force('picnic_blanket', x, z, rot, 'blanket', { bucket: 'walk', collide: false, y: 0.014, r: 1.6 })
    force('bike_hoop', x + 2.2, z - 1.2, 0.4, 'char', { bucket: 'clutter', r: 0.8, collide: false })
  }
  force('picnic_blanket', -33 + 8, 113 - 5, 0.7, 'blanket', { bucket: 'walk', collide: false, y: 0.014, r: 1.5, s: 0.8 })
  for (const [x, z] of [[-24, 90], [24, 108]] as [number, number][]) G('bird_bath', x, z, 0, 'stone', { r: 0.6, ...CL }, 3)
  // pier + barcos
  {
    const L = CITY.lake
    const a = (160 * PI) / 180
    const dx = Math.cos(a)
    const dz = Math.sin(a)
    const rot = Math.atan2(dx, dz)
    const cR = L.r - 3.0 // centro do pier (8 m): comeca ~1 m fora da margem, avanca sobre a agua
    force('lake_pier', L.cx + dx * cR, L.cz + dz * cR, rot, 'pier', { bucket: 'vend', r: 0, collide: false })
    force('rowboat', L.cx + dx * (L.r - 6.5) - dz * 2.8, L.cz + dz * (L.r - 6.5) + dx * 2.8, rot + 0.15, 'boat', { bucket: 'vend', r: 0, collide: false })
    force('rowboat', L.cx + dx * (L.r - 8.5) + dz * 3.4, L.cz + dz * (L.r - 8.5) - dx * 3.4, rot - 0.3, 'boat', { bucket: 'vend', r: 0, collide: false, over: { base: '#d9a02a', accent: '#f4f0e6' } })
    taken.push({ x: L.cx + dx * (L.r + 1), z: L.cz + dz * (L.r + 1), r: 3 })
  }
}

// ---------------------------------------------------------------- 6) Bairro Futuro (obra)
{
  const F = CITY.futuro
  const gx = F.x1
  for (const [dx, z, rot] of [[-26, -3, 0.1], [-44, -30, -0.2], [-40, 30, 0.3], [-62, 4, 0]] as [number, number, number][]) force('scaffold_tower', gx + dx, z, rot, 'scaffold', { bucket: 'vend', r: 2.5 })
  for (const [dx, z, rot] of [[-20, 36, PI / 2 + 0.1], [-52, -12, -PI / 2], [-72, 38, 0]] as [number, number, number][]) force('site_hut', gx + dx, z, rot, 'cone', { bucket: 'vend', r: 3.5 })
  for (const [dx, z, rot] of [[-22, 6, 0.5], [-34, -14, 2.4], [-56, 22, -1]] as [number, number, number][]) force('cement_mixer', gx + dx, z, rot, 'cone', { bucket: 'vend', r: 1.2 })
  for (const [dx, z] of [[-16, 20], [-36, 0], [-48, 36]] as [number, number][]) force('road_barrier', gx + dx, z, PI / 2, 'cone', { bucket: 'clutter', r: 1 })
}

// ---------------------------------------------------------------- 7) fachadas e telhados (blocos de Moda e Neon + casas do Jardim)
function frame(b: Pick<Block, 'x' | 'z' | 'rot'>) {
  const c = Math.cos(b.rot)
  const s = Math.sin(b.rot)
  return (lx: number, lz: number): [number, number] => [b.x + lx * c + lz * s, b.z - lx * s + lz * c]
}
const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967296
}
function addWall(b: Block, piece: string, lx: number, ly: number, lz: number, lrot: number, pal: string, over?: KitItem['over'], s = 1) {
  const at = frame(b)(lx, lz)
  STREET_WALL.push({ piece, x: at[0], z: at[1], y: ly, rot: b.rot + lrot, s, pal, over, collide: false })
}
function addRoof(b: Block, piece: string, lx: number, lz: number, lrot: number, pal: string, over?: KitItem['over'], s = 1, collide = false) {
  const at = frame(b)(lx, lz)
  STREET_ROOF.push({ piece, x: at[0], z: at[1], y: b.h, rot: b.rot + lrot, s, pal, over, collide })
}

const DISPLAYS = ['window_display_dress', 'window_display_bags', 'window_display_shoes']
const MODA_FLAG = { accent: '#14213d', accent2: '#c9a15a', white: '#f4f0e6' }
const NEON_FLAG = { accent: '#ff3fb4', accent2: '#35e8ff', white: '#f4f0e6' }
for (const b of CITY.blocks) {
  if (b.shape !== 'box' || (b.district !== 'moda' && b.district !== 'neon') || b.shopId === 'cassino') continue
  const moda = b.district === 'moda'
  const h1 = hash(b.id)
  const h2 = hash(b.id + 'x')
  const h3 = hash(b.id + 'y')
  const pal = moda ? 'luxo' : 'neon'
  const front = b.d / 2 + (moda ? 1.03 : 0.04) // moda: o embasamento de 1 m se projeta alem da fachada
  const upper = b.d / 2 + (moda ? 0.14 : 0.1)
  // --- terreo
  const lowerW = b.w - 1.4
  if (moda && lowerW > 5) {
    const n = b.shopId ? 2 : lowerW > 9 ? 2 : 1
    for (let i = 0; i < n; i++) {
      const lx = n === 1 ? 0 : (i === 0 ? -1 : 1) * (b.shopId ? b.w / 2 - 2.1 : b.w * 0.26)
      addWall(b, DISPLAYS[Math.floor((h1 * 7 + i * 1.7) % 3)], lx, 0.02, front, 0, pal, undefined, b.shopId ? 0.95 : Math.min(1, b.w / 9))
    }
    for (const sg of [-1, 1]) addWall(b, 'wall_lamp', sg * (b.w / 2 - 0.35), 2.55, front, 0, 'char')
  } else if (!moda) {
    for (const sg of [-1, 1]) addWall(b, 'wall_lamp', sg * (b.w / 2 - 0.45), 2.7, front, 0, 'neon', { glow: sg > 0 ? '#ff3fb4' : '#35e8ff' })
    if (!b.shopId && b.w > 6) addWall(b, 'shop_awning', 0, 3.1, front, 0, 'carnival', { accent: pick(['#0f8b8d', '#7b2d8e', '#b8352f', '#1f4a7a']), base: '#f1ede2' }, Math.min(1, b.w / 5.5))
    if (h2 < 0.45) addWall(b, 'wall_ac_unit', b.w / 2 - 1.1, 5.2 + h3 * 3, front, 0, 'wall_tan')
  }
  // --- fachada alta: outdoor luminoso, mural na lateral, bandeiras
  if (b.h > 16) {
    if (h2 < 0.55) {
      const kind = ['ad_dress', 'ad_sun', 'ad_lines'][Math.floor(h3 * 3)]
      const ox = (h1 - 0.5) * Math.max(0, b.w - 3.6) * 0.6
      addWall(b, kind, ox, 7.6 + h1 * 5, upper, 0, 'ad', moda ? (h3 < 0.5 ? { accent2: '#7a2a30', soft: '#e0b858' } : { accent2: '#1f4a7a', soft: '#e8dfc8' }) : { accent2: '#ff3fb4', soft: '#35e8ff' }, Math.min(1, (b.w - 1) / 2.6))
    }
    if (h3 < 0.5 && b.d > 5) {
      const sg = h1 < 0.5 ? -1 : 1
      addWall(b, ['mural_arches', 'mural_sunset', 'mural_leaves'][Math.floor(h2 * 3)], sg * (b.w / 2 + 0.06), 5.4 + h1 * 3, 0, sg * (PI / 2), 'mural', undefined, Math.min(1, (b.d - 1) / 3.8))
    }
    if (h1 > 0.5) {
      const sg = h2 < 0.5 ? -1 : 1
      addWall(b, 'flag_wall', sg * (b.w / 2 - 1.0), 9.2 + h3 * 6, upper, 0, 'navy', moda ? MODA_FLAG : NEON_FLAG)
    }
  }
  // --- telhado: 1-2 itens
  if (b.h > 10 && b.w > 5 && b.d > 5) {
    const kinds = ['rooftop_ac_pair', 'rooftop_water_tank', 'rooftop_dish', 'rooftop_antenna', 'rooftop_garden', 'flag_roof']
    const k1 = Math.floor(h1 * kinds.length)
    const k2 = (k1 + 1 + Math.floor(h2 * (kinds.length - 1))) % kinds.length
    const spots: [number, number][] = [[-b.w * 0.2, -b.d * 0.15], [b.w * 0.22, b.d * 0.12]]
    ;[k1, h3 < 0.6 ? k2 : -1].forEach((k, i) => {
      if (k < 0) return
      let kind = kinds[k]
      if (kind === 'rooftop_garden' && (b.w < 8 || b.d < 6)) kind = 'rooftop_ac_pair'
      const [lx, lz] = kind === 'rooftop_garden' ? [0, 0] : spots[i]
      const pl = kind === 'rooftop_water_tank' ? 'wood' : kind === 'rooftop_garden' ? 'garden' : kind === 'flag_roof' ? 'char' : 'wall_tan'
      addRoof(b, kind, lx, lz, (h2 + i) * PI, pl, kind === 'flag_roof' ? (moda ? MODA_FLAG : NEON_FLAG) : undefined, Math.min(1, (b.w - 1.5) / 3.3), kind === 'flag_roof' ? false : false)
    })
  }
}
// casas do Jardim: arandelas, placa de porta, vaso de oliveira, bandeirinha
for (const b of CITY.blocks) {
  if (b.district !== 'jardim' || b.shape !== 'house') continue
  const s = Math.min(1.14, Math.max(0.95, Math.min(b.w, b.d) / 8.4))
  const k = Number(b.id.split('-').pop()) || 0
  const side = k % 2 ? 1 : -1
  const fz = 4.08 * s
  for (const sg of [-1, 1]) addWall(b, 'wall_lamp', sg * 3.5 * s, 2.5 * s, fz, 0, 'forest', undefined, s)
  addWall(b, k % 3 ? 'door_plate_12' : 'door_plate_7', side * 3.35 * s, 0.9 * s, fz, 0, 'wood', undefined, s * 0.9)
  if (k % 3 === 0) addWall(b, 'flag_wall', -side * 3.6 * s, 4.4 * s, fz, 0, 'navy', { accent: '#2f5d46', accent2: '#c9553a', white: '#f4f0e6' }, 0.9)
  const at = frame(b)(side * 3.9 * s, fz + 1.1)
  if (!inBlock(at[0], at[1], -3) && asphaltClear(at[0], at[1]) > 0.6 && !inPlaza(at[0], at[1]) && !inLake(at[0], at[1])) STREET_CLUTTER.push({ piece: 'potted_olive', x: at[0], z: at[1], rot: 0, pal: 'olive', s: 0.85, collide: true })
}
