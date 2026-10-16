import { CITY } from '../world/city/layout'
import { CENTRO_ITEMS, CENTRO_R } from '../world/city/centro'
import { ROMANTIC_ALL } from '../world/city/romantic'

/**
 * Assentos dos bancos da cidade (somente leitura dos dados da cidade). Cada banco tem 2 lugares.
 * O banco e posto na cena com `rot` (yaw) e frente +Z; o assento fica um pouco a frente do encosto.
 */
export type BenchKind = 'bubble' | 'tufted'

interface KindSpec {
  /** altura do topo da almofada (m, a partir do chao do banco) */
  seatY: number
  /** deslocamento do centro do assento em z local (+ = frente) */
  seatZ: number
  /** deslocamento dos 2 lugares em x local */
  seatX: number
  /** caixa de clique/hover: tamanho [w, h, d] (centro em y = h/2) */
  box: readonly [number, number, number]
}
export const KINDS: Record<BenchKind, KindSpec> = {
  bubble: { seatY: 0.7, seatZ: 0.1, seatX: 0.5, box: [2.2, 1.1, 0.8] },
  tufted: { seatY: 0.78, seatZ: 0.08, seatX: 0.55, box: [2.4, 1.2, 0.8] },
}

export interface Bench {
  id: number
  kind: BenchKind
  x: number
  z: number
  rot: number
}

export interface Seat {
  id: string
  bench: Bench
  /** centro do assento (mundo) */
  x: number
  z: number
  /** topo da almofada (mundo) */
  y: number
  /** direcao do olhar (yaw, 0 = +Z) */
  yaw: number
  /** ponto de aproximacao/saida: a frente do banco, fora do colisor */
  ax: number
  az: number
}

// Mesmas regras de Props.tsx para saber de qual conjunto cada banco da cidade vem (copia; nao exportadas la).
const isY2k = (x: number, z: number) => Math.hypot(x, z) < 82 || (x > 20 && Math.abs(z) < 70)
const inCentro = (x: number, z: number) => Math.hypot(x, z) < CENTRO_R
const inRomantic = (x: number, z: number) => z > 60 && z < 215 && Math.abs(x) < 80

function collectBenches(): Bench[] {
  const out: Bench[] = []
  let id = 0
  const add = (kind: BenchKind, x: number, z: number, rot: number) => out.push({ id: id++, kind, x, z, rot })
  for (const b of CITY.benches) {
    if (isY2k(b.x, b.z) && !inCentro(b.x, b.z)) add('bubble', b.x, b.z, b.rot)
    else if (!isY2k(b.x, b.z) && !inRomantic(b.x, b.z)) add('tufted', b.x, b.z, b.rot)
  }
  for (const it of CENTRO_ITEMS) if (it.piece === 'bench_bubble') add('bubble', it.x, it.z, it.rot ?? 0)
  for (const it of ROMANTIC_ALL) if (it.piece === 'bench_tufted') add('tufted', it.x, it.z, it.rot ?? 0)
  return out
}

/** Distancia do centro do banco ate o ponto de aproximacao (frente do colisor + raio da capsula + folga). */
const APPROACH = 0.95

function buildSeats(benches: Bench[]): Seat[] {
  const seats: Seat[] = []
  for (const b of benches) {
    const k = KINDS[b.kind]
    const sn = Math.sin(b.rot)
    const cs = Math.cos(b.rot)
    // local (lx, lz) -> mundo, yaw `rot` (three: x' = x cos + z sin ; z' = -x sin + z cos)
    const at = (lx: number, lz: number) => [b.x + lx * cs + lz * sn, b.z - lx * sn + lz * cs] as const
    for (const sx of [-1, 1]) {
      const [x, z] = at(sx * k.seatX, k.seatZ)
      const [ax, az] = at(sx * k.seatX, APPROACH)
      seats.push({ id: `${b.id}${sx < 0 ? 'L' : 'R'}`, bench: b, x, z, y: k.seatY, yaw: b.rot, ax, az })
    }
  }
  return seats
}

export const BENCHES: Bench[] = collectBenches()
export const SEATS: Seat[] = buildSeats(BENCHES)
