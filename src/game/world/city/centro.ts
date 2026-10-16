import { CITY } from './layout'
import type { KitItem } from './kit'

/** Raio (m) em que lampadas/bancos usam o kit Y2K novo (o resto da cidade segue com as pecas antigas). */
export const CENTRO_R = 80

/** Paletas do Centro: azul bebe, menta, manteiga, lilas, pessego e perola; rosa so como um acento. */
const CYCLE = ['babyblue', 'mint', 'butter', 'lilac', 'peach', 'pearl', 'mint', 'babyblue', 'peach', 'butter', 'pearl', 'lilac', 'bubblegum']
const SHOP_PAL: Record<string, string> = { 'cafe-rose': 'peach', 'salao-spa': 'lilac' }

function build(): KitItem[] {
  const out: KitItem[] = []
  let k = 0
  for (const b of CITY.blocks) {
    if (b.district !== 'centro') continue
    // sem duas cores iguais lado a lado: indice pelo numero da fachada, "embaralhado"
    const n = Number(b.id.split('-').pop()) || k
    const pal = SHOP_PAL[b.shopId ?? ''] ?? (b.shopId ? 'pearl' : CYCLE[(n * 5 + k) % CYCLE.length])
    k++
    const poi = b.shopId ? CITY.pois.find((p) => p.id === b.shopId) : undefined
    const over = poi ? { accent: poi.color, glow: poi.color } : undefined
    const c = Math.cos(b.rot)
    const s = Math.sin(b.rot)
    // posicao/giro local do bloco -> mundo
    const at = (piece: string, lx: number, lz: number, sc = 1, lrot = 0, y = 0, o = over, p = pal): KitItem => ({
      piece, x: b.x + lx * c + lz * s, z: b.z - lx * s + lz * c, y, rot: b.rot + lrot, s: sc, pal: p, over: o,
    })

    if (b.shopId) {
      // loja: duas fachadas capsula encadeadas + torre atras + marquise curva na porta + placa holografica
      const sc = b.w / 16.9
      const front = b.d / 2
      for (const sx of [-1, 1]) out.push(at('building_capsule_row', sx * 4.225 * sc, front, sc))
      out.push(at(b.shopId === 'cafe-rose' ? 'building_bubble_wide' : 'building_bubble_tall', b.shopId === 'cafe-rose' ? 0 : 2.5, -b.d * 0.12, b.shopId === 'cafe-rose' ? 0.95 : 1.1, 0, 0, undefined))
      out.push(at('canopy_curved', 0, front + 2.2, 1, 0))
      out.push(at('holo_sign', -(b.w / 2 - 0.2), front + 2.6, 1, 0.3))
      out.push(at('planter_orb', b.w / 2 - 0.2, front + 2.4, 1, 0, 0, undefined, 'mint'))
      continue
    }
    if (b.shape === 'cyl') {
      const v = b.variant ?? 0
      const piece = ['building_bubble', 'building_bubble_tall', 'building_bubble_wide'][v]
      const sc = [1.1, 1.2, 0.85][v]
      const R = [3.9, 3.3, 5.5][v] * sc
      out.push(at(piece, 0, 0, sc, 0, 0, undefined))
      // placa holografica em pe ao lado da porta + vaso
      const side = n % 2 ? 1 : -1
      if (n % 2 === 0) out.push(at('holo_sign', side * (R * 0.55), R + 1.6, 1, side * -0.35, 0, undefined, CYCLE[(n * 3 + 2) % CYCLE.length]))
      if (n % 6 === 0) out.push(at('planter_orb', -side * (R * 0.6), R + 1.1, 1, 0, 0, undefined, 'mint'))
      continue
    }
    // 'box': loja capsula
    const v = b.variant ?? 0
    const front = b.d / 2
    if (v === 1) {
      // dois andares empilhados
      const sc = 1.15
      out.push(at('building_capsule_row', 0, front, sc))
      out.push(at('building_capsule_row', 0, front - 0.25, sc * 0.92, 0, 4.24 * sc, undefined, CYCLE[(n * 3 + 4) % CYCLE.length]))
      out.push(at('canopy_curved', 0, front + 2.1, 1))
    } else {
      const sc = 1.25
      out.push(at('building_capsule_row', 0, front, sc))
      out.push(at(v === 0 ? 'building_bubble_tall' : 'building_bubble', 0, -b.d * 0.22, v === 0 ? 0.95 : 0.9, 0, 0, undefined, CYCLE[(n * 3 + 7) % CYCLE.length]))
      if (v === 0) out.push(at('canopy_curved', 0, front + 2.1, 1))
    }
    if (n % 3 === 0) out.push(at('holo_sign', -(b.w / 2 - 0.3), front + 2.4, 1, 0.3))
  }

  // ---------------------------------------------------------------- praca central
  out.push({ piece: 'plaza_centerpiece', x: 0, z: 0, s: 1.25, pal: 'bubblegum', over: { trim: '#f1d27a', glow: '#ff9ccb', glow2: '#8fdcff' } })
  // vasos-orbe em anel ao redor da fonte
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2
    out.push({ piece: 'planter_orb', x: Math.cos(a) * 12, z: Math.sin(a) * 12, pal: ['mint', 'babyblue', 'lilac', 'butter'][i % 4], s: 1.25 })
  }
  // plataformas flutuantes decorativas (topo baixo)
  const plats: [number, number, string, number][] = [[-14, -9, 'lilac', 1.3], [15, -11, 'babyblue', 1.3], [-17, 12, 'mint', 1.2]]
  for (const [x, z, p, sc] of plats) out.push({ piece: 'floating_platform', x, z, pal: p, s: sc })
  // quiosques sob marquise curva nas diagonais
  const kp = ['peach', 'mint', 'butter', 'babyblue']
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2
    const x = Math.cos(a) * 33
    const z = Math.sin(a) * 33
    const rot = Math.atan2(-x, -z)
    out.push({ piece: 'kiosk_pod', x, z, rot, s: 0.8, pal: kp[i] })
    out.push({ piece: 'canopy_curved', x, z, rot, pal: kp[i] })
  }

  // ---------------------------------------------------------------- postes e bancos (no raio do Centro)
  CITY.lamps.forEach((l) => {
    if (Math.hypot(l.x, l.z) >= CENTRO_R) return
    out.push({ piece: 'lamp_futuristic', x: l.x, z: l.z, pal: 'butter', over: { glow: l.color }, rot: Math.atan2(-l.x, -l.z) - Math.PI / 2 })
  })
  const bp = ['babyblue', 'mint', 'lilac', 'peach', 'butter', 'pearl']
  CITY.benches.forEach((bn, i) => {
    if (Math.hypot(bn.x, bn.z) >= CENTRO_R || i % 2) return
    out.push({ piece: 'bench_bubble', x: bn.x, z: bn.z, rot: bn.rot, pal: bp[i % bp.length] })
  })
  return out
}

export const CENTRO_ITEMS: KitItem[] = build()
const BIG = new Set(['building_bubble', 'building_bubble_tall', 'building_bubble_wide', 'building_capsule_row', 'plaza_centerpiece'])
/** Predios (corte por distancia de predios) e props pequenos (corte mais curto). */
export const CENTRO_BUILDINGS: KitItem[] = CENTRO_ITEMS.filter((i) => BIG.has(i.piece))
export const CENTRO_PROPS: KitItem[] = CENTRO_ITEMS.filter((i) => !BIG.has(i.piece))
