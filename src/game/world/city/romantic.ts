import { CITY, type Block } from './layout'
import type { KitItem } from './kit'

/**
 * Kit ROMANTICO (public/assets/city/kit) aplicado ao Jardim Romantico, a Casa dos Sonhos e ao Parque do Lago.
 * Mesmo esquema do Centro (centro.ts): itens de kit com paleta; o kit.tsx funde por celula e coloca os colisores.
 */

/** Casas do Jardim: pessego, menta, creme, lavanda, manteiga, celeste e so um toque de rosa. */
const HOUSE_PAL = ['h_peach', 'h_mint', 'h_cream', 'h_lavender', 'h_butter', 'h_sky', 'h_blush']

/** Disco reservado (x, z, raio): arvores aleatorias nao nascem aqui. */
export type Disc = readonly [number, number, number]
const reserved: Disc[] = []
export const romanticReserved = (x: number, z: number, pad = 0) => reserved.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r + pad)

/** Reserva um disco (mobiliario urbano de streetProps.ts): arvores aleatorias nao nascem aqui. */
export const reserveDisc = (x: number, z: number, r: number) => {
  reserved.push([x, z, r])
}

export const PRAC_JARDIM = { x: 0, z: 158, r: 9 }
export const LAGO = CITY.lake
/** Ilhota do coreto e ponte (Parque do Lago). */
export const ISLET = { x: LAGO.cx, z: LAGO.cz - 4.6, r: 4.4 }
export const BRIDGE = { x: LAGO.cx, z0: LAGO.cz - LAGO.r - 2.0, len: 8.4 } // z0 = ponta da margem

/** Canteiros de flores em volta do lago (x, z, giro): desenhados em ParqueDeco.tsx. */
export const BEDS: { x: number; z: number; rot: number; hue: number }[] = []
{
  const L = CITY.lake
  const angs = [5, 35, 65, 95, 125, 180, 258, 308, 345]
  angs.forEach((deg, i) => {
    const a = (deg * Math.PI) / 180
    const x = L.cx + Math.cos(a) * (L.r + 6.6)
    const z = L.cz + Math.sin(a) * (L.r + 6.6)
    BEDS.push({ x, z, rot: -(a + Math.PI / 2), hue: i })
    reserved.push([x, z, 2.6])
  })
}

function frame(b: Pick<Block, 'x' | 'z' | 'rot'>, s = 1) {
  const c = Math.cos(b.rot)
  const sn = Math.sin(b.rot)
  return (piece: string, lx: number, lz: number, pal: string, y = 0, lrot = 0, sc = 1, over?: KitItem['over']): KitItem => ({
    piece,
    x: b.x + (lx * c + lz * sn) * s,
    z: b.z + (-lx * sn + lz * c) * s,
    y: y * s,
    rot: b.rot + lrot,
    s: s * sc,
    pal,
    over,
  })
}

/** Casa de 2 andares montada com o kit: corpo + modulos de fachada + toldo/sacada + telhado de 4 aguas. */
function house(b: Block, k: number, out: KitItem[], detail: KitItem[]) {
  const pal = HOUSE_PAL[(k * 3) % HOUSE_PAL.length]
  const s = Math.min(1.14, Math.max(0.95, Math.min(b.w, b.d) / 8.4))
  const at = frame(b, s)
  const doorSide = k % 2 ? 1 : -1
  out.push(at('house_shell', 0, 0, pal))
  out.push(at('roof_pitched', 0, 0, pal, 8))
  // detalhes da fachada: celula propria, some mais perto (so ~70 m) para segurar triangulos
  detail.push(at('facade_door', doorSide * 2, 4, pal))
  detail.push(at('facade_win', -doorSide * 2, 4, pal))
  detail.push(at('facade_win', -2, 4, pal, 4))
  detail.push(at('facade_win', 2, 4, pal, 4))
  const v = k % 4
  if (v === 0) detail.push(at('awning_striped', -doorSide * 2, 4.1, pal, 2.85, 0, 0.82))
  else if (v === 1) detail.push(at('balcony_curved', doorSide * 2, 4.1, pal, 4, 0, 0.9))
  reserved.push([b.x, b.z, Math.max(b.w, b.d) * 0.62])
}

/** Casa dos Sonhos: miolo ornamentado (porta, janelas, sacada), duas alas com domos, portao em arco, cerca e baloes. Rosa + ouro-joia. */
function casaDosSonhos(b: Block, out: KitItem[]) {
  const P = 'casa_rosa'
  const at = frame(b)
  const front = b.d / 2 // 9
  // miolo (12 x 12) com fachada ornamentada
  out.push(at('house_shell_wide', 0, front - 6, P))
  const fz = front + 0.4
  out.push(at('wall_window', -4, fz, P))
  out.push(at('wall_door', 0, fz, P))
  out.push(at('wall_window', 4, fz, P))
  for (const x of [-4, 0, 4]) out.push(at('wall_window', x, fz, P, 4))
  out.push(at('balcony_curved', 0, fz + 0.5, P, 4))
  for (const x of [-4, 0, 4]) out.push(at('cornice_scallop', x, fz - 0.1, P, 8))
  for (const sx of [-1, 1]) out.push(at('column_rococo', sx * 6.3, fz + 0.9, P, 0, 0, 1.0))
  out.push(at('roof_dome_small', 0, front - 6, P, 8, 0, 3.5))
  // alas
  for (const sx of [-1, 1]) {
    out.push(at('house_shell', sx * 10, front - 4, P))
    for (const dx of [-2, 2]) {
      out.push(at('facade_win', sx * 10 + dx, front, P))
      out.push(at('facade_win', sx * 10 + dx, front, P, 4))
    }
    out.push(at('roof_dome_small', sx * 10, front - 4, P, 8, 0, 2.4))
  }
  // portao em arco na entrada (sobre o fim da avenida) + cerca + sebes de coracao
  const gz = front + 3
  out.push(at('arch_gate', 0, gz, P, 0, 0, 1.25))
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 2; i++) out.push(at('fence_segment', sx * (4.55 + i * 2.1), gz, P))
    out.push(at('hedge_heart', sx * 9.2, gz, 'p_mint', 0, 0, 1.1))
    out.push(at('planter_round', sx * 3.1, front + 1.9, 'p_coral'))
  }
  // baloes de coracao
  const bal: [number, number, string][] = [[-5.5, gz + 0.8, 'h_lavender'], [5.5, gz + 0.8, 'h_mint'], [-10.5, gz + 1.5, 'h_butter'], [10.5, gz + 1.5, 'h_sky'], [-7.5, gz + 2.6, 'h_peach'], [7.5, gz + 2.6, 'casa_rosa']]
  for (const [x, z, p] of bal) out.push(at('balloon_heart', x, z, p, 0, x * 0.1, 1.35))
  reserved.push([b.x, b.z - 4, 17])
}

function build(): { buildings: KitItem[]; props: KitItem[]; detail: KitItem[]; walk: KitItem[] } {
  const walk: KitItem[] = []
  const bld: KitItem[] = []
  const detail: KitItem[] = []
  const props: KitItem[] = []
  let k = 0
  const blocks = CITY.blocks.filter((b) => b.district === 'jardim')
  for (const b of blocks) {
    if (b.shopId === 'casa-sonhos') casaDosSonhos(b, bld)
    else house(b, k++, bld, detail)
  }
  const nearHouse = (x: number, z: number, pad: number) =>
    blocks.some((b) => b.shopId !== 'casa-sonhos' && Math.hypot(b.x - x, b.z - z) < Math.hypot(b.w, b.d) / 2 + pad) || (z > 172 && Math.abs(x) < 20)

  // ---------------------------------------------------------------- pracinha: fonte do cisne
  const pz = PRAC_JARDIM
  bld.push({ piece: 'fountain_center', x: pz.x, z: pz.z, s: 1.3, pal: 'casa_rosa' })
  reserved.push([pz.x, pz.z, pz.r + 1])
  const pp = ['p_coral', 'p_lemon', 'p_lilac', 'p_mint']
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    if (i % 2 === 0) props.push({ piece: 'bench_tufted', x: pz.x + Math.cos(a) * 6.3, z: pz.z + Math.sin(a) * 6.3, rot: Math.atan2(-Math.cos(a), -Math.sin(a)), pal: pp[i] })
    const a2 = a + Math.PI / 4
    props.push({ piece: i % 2 ? 'hedge_heart' : 'planter_round', x: pz.x + Math.cos(a2) * 6.1, z: pz.z + Math.sin(a2) * 6.1, rot: a2, pal: i % 2 ? 'p_mint' : pp[(i + 1) % 4] })
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.2
    props.push({ piece: 'lamp_post', x: pz.x + Math.cos(a) * 8.1, z: pz.z + Math.sin(a) * 8.1, rot: a, pal: 'h_cream' })
  }

  // ---------------------------------------------------------------- ruas do Jardim: postes, sebes, jardineiras
  const lampPal = ['h_cream', 'h_blush', 'h_mint', 'h_lavender']
  let li = 0
  const lamp = (x: number, z: number, rot: number) => {
    if (nearHouse(x, z, 1.4) || Math.hypot(x - pz.x, z - pz.z) < pz.r + 0.5) return
    props.push({ piece: 'lamp_post', x, z, rot, pal: lampPal[li++ % lampPal.length] })
    reserved.push([x, z, 0.9])
  }
  for (let x = -62; x <= 62; x += 40) lamp(x + 6, 158 + (x % 40 ? 5.2 : -5.2), 0)
  for (const rx of [-36, 36]) for (let z = 134; z <= 200; z += 33) lamp(rx + (z % 44 ? 5.2 : -5.2), z, Math.PI / 2)
  for (const z of [146]) for (const sx of [-1, 1]) lamp(sx * 7.6, z, Math.PI / 2)
  // sebes de coracao e vasos junto das portas (alternando)
  let hi = 0
  let hk = 0
  for (const b of blocks) {
    if (b.shopId === 'casa-sonhos' || hk++ % 2) continue
    const c = Math.cos(b.rot)
    const sn = Math.sin(b.rot)
    const front = b.d / 2 + 2.3
    const sideX = (hi % 2 ? 1 : -1) * 3.6
    const x = b.x + sideX * c + front * sn
    const z = b.z - sideX * sn + front * c
    props.push({ piece: hi % 3 === 0 ? 'hedge_heart' : hi % 3 === 1 ? 'planter_round' : 'balloon_heart', x, z, rot: b.rot, pal: hi % 3 === 0 ? 'p_mint' : HOUSE_PAL[(hi * 2 + 1) % 7], s: hi % 3 === 2 ? 1.2 : 1 })
    reserved.push([x, z, 1.1])
    hi++
  }
  // cercas baixas na frente de algumas casas
  let fi = 0
  for (const b of blocks) {
    if (b.shopId === 'casa-sonhos' || fi++ % 4 !== 1) continue
    const c = Math.cos(b.rot)
    const sn = Math.sin(b.rot)
    const front = b.d / 2 + 2.5
    for (const sx of [-1, 1]) {
      const lx = sx * 3.3
      props.push({ piece: 'fence_segment', x: b.x + lx * c + front * sn, z: b.z - lx * sn + front * c, rot: b.rot, pal: HOUSE_PAL[(fi * 3) % 7] })
    }
  }

  // ---------------------------------------------------------------- Parque do Lago
  const L = LAGO
  // coreto na ilhota, de frente para a ponte (norte)
  bld.push({ piece: 'gazebo', x: ISLET.x, z: ISLET.z, rot: Math.PI, pal: 'p_ponte', collide: true })
  // ponte (colisor proprio em Lago.tsx)
  walk.push({ piece: 'bridge_small', x: BRIDGE.x, z: BRIDGE.z0 + BRIDGE.len / 2, pal: 'p_ponte', collide: false })
  reserved.push([L.cx, L.cz, L.r + 5], [BRIDGE.x, BRIDGE.z0 - 3, 5])
  // bancos virados para o lago e postes em volta
  const benchPal = ['p_coral', 'p_lemon', 'p_lilac', 'p_mint', 'p_coral']
  const benchA = [205, 290, 330, 160]
  benchA.forEach((deg, i) => {
    const a = (deg * Math.PI) / 180
    const x = L.cx + Math.cos(a) * (L.r + 4.3)
    const z = L.cz + Math.sin(a) * (L.r + 4.3)
    props.push({ piece: 'bench_tufted', x, z, rot: Math.atan2(-Math.cos(a), -Math.sin(a)), pal: benchPal[i] })
    reserved.push([x, z, 1.6])
  })
  for (let i = 0; i < 7; i++) {
    const a = ((i + 0.5) / 7) * Math.PI * 2 + Math.PI / 2
    if (Math.abs(((a + Math.PI * 2) % (Math.PI * 2)) - (Math.PI * 3) / 2) < 0.35) continue // vao da ponte
    const x = L.cx + Math.cos(a) * (L.r + 8.4)
    const z = L.cz + Math.sin(a) * (L.r + 8.4)
    props.push({ piece: 'lamp_post', x, z, rot: a, pal: lampPal[i % 4] })
    reserved.push([x, z, 0.9])
  }
  // sebes de coracao e vasos na entrada da ponte
  for (const sx of [-1, 1]) {
    props.push({ piece: 'hedge_heart', x: L.cx + sx * 3.1, z: BRIDGE.z0 - 1.6, rot: 0, pal: 'p_mint', s: 1.1 })
    props.push({ piece: 'planter_round', x: L.cx + sx * 4.6, z: BRIDGE.z0 - 0.6, pal: sx < 0 ? 'p_coral' : 'p_lemon' })
    props.push({ piece: 'balloon_heart', x: L.cx + sx * 5.6, z: BRIDGE.z0 - 3.2, pal: sx < 0 ? 'h_peach' : 'h_lavender', s: 1.4, rot: sx })
  }
  props.push({ piece: 'balloon_heart', x: L.cx + 20, z: L.cz - 8, pal: 'h_butter', s: 1.4 })
  // bancos nas trilhas leste/oeste
  props.push({ piece: 'bench_tufted', x: -37, z: 91.2, rot: Math.PI, pal: 'p_lemon' }, { piece: 'bench_tufted', x: 37, z: 96.8, rot: 0, pal: 'p_coral' })
  return { buildings: bld, props, detail, walk }
}

const R = build()
export const ROMANTIC_BUILDINGS: KitItem[] = R.buildings
export const ROMANTIC_PROPS: KitItem[] = R.props
/** Detalhes de fachada das casas comuns (portas, janelas, toldos): corte de distancia mais curto. */
export const ROMANTIC_DETAIL: KitItem[] = R.detail
export const ROMANTIC_ALL: KitItem[] = [...R.buildings, ...R.detail, ...R.props]
/** Massas (projetam sombra) x detalhes e props pequenos (sem sombra, corte curto de distancia). */
export const ROMANTIC_BIG: KitItem[] = R.buildings
export const ROMANTIC_SMALL: KitItem[] = [...R.detail, ...R.props]
export const SMALL_DIST = 70
/** Pecas caminhaveis (ponte): malha com userData.walkable para o clique-para-andar. */
export const ROMANTIC_WALK: KitItem[] = R.walk
