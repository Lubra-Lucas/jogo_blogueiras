import type { Card } from './cards'
import { rankLabel } from './cards'

/**
 * Avaliador de mão do Texas Hold'em: melhor mão de 5 entre 5 a 7 cartas.
 * Retorna um número comparável (maior vence): categoria * 15^5 + desempates (cada carta em base 15).
 * Categorias: 0 carta alta, 1 par, 2 dois pares, 3 trinca, 4 sequência, 5 flush, 6 full house,
 * 7 quadra, 8 straight flush (o royal flush é o straight flush com Ás).
 */
export const CATEGORY_NAME = [
  'Carta alta',
  'Par',
  'Dois pares',
  'Trinca',
  'Sequência',
  'Flush',
  'Full house',
  'Quadra',
  'Straight flush',
] as const

const B = 15
const pack = (cat: number, ranks: number[]) => {
  let v = cat
  for (let i = 0; i < 5; i++) v = v * B + (ranks[i] ?? 0)
  return v
}

/** maior carta de uma sequência (14..5; a roda A-2-3-4-5 vale 5) ou 0 */
function straightHigh(mask: number): number {
  // bit r = existe rank r (2..14); Ás também vale 1 (bit 1)
  const m = mask | ((mask >> 14) & 1 ? 2 : 0)
  for (let hi = 14; hi >= 5; hi--) {
    let ok = true
    for (let k = 0; k < 5; k++) {
      if (!((m >> (hi - k)) & 1)) {
        ok = false
        break
      }
    }
    if (ok) return hi
  }
  return 0
}

export function evaluate(cards: Card[]): number {
  const cnt = new Array<number>(15).fill(0)
  const bySuit: number[][] = [[], [], [], []]
  let mask = 0
  for (const c of cards) {
    cnt[c.r]++
    bySuit[c.s].push(c.r)
    mask |= 1 << c.r
  }
  // flush / straight flush
  for (let s = 0; s < 4; s++) {
    if (bySuit[s].length >= 5) {
      let sm = 0
      for (const r of bySuit[s]) sm |= 1 << r
      const sh = straightHigh(sm)
      if (sh) return pack(8, [sh])
    }
  }
  const quads: number[] = []
  const trips: number[] = []
  const pairs: number[] = []
  for (let r = 14; r >= 2; r--) {
    if (cnt[r] === 4) quads.push(r)
    else if (cnt[r] === 3) trips.push(r)
    else if (cnt[r] === 2) pairs.push(r)
  }
  const kickers = (exclude: number[], n: number) => {
    const out: number[] = []
    for (let r = 14; r >= 2 && out.length < n; r--) if (cnt[r] > 0 && !exclude.includes(r)) out.push(r)
    return out
  }
  if (quads.length) return pack(7, [quads[0], ...kickers([quads[0]], 1)])
  if (trips.length && (trips.length > 1 || pairs.length)) {
    const t = trips[0]
    const p = Math.max(trips[1] ?? 0, pairs[0] ?? 0)
    return pack(6, [t, p])
  }
  for (let s = 0; s < 4; s++) {
    if (bySuit[s].length >= 5) {
      const top = bySuit[s].sort((a, b) => b - a).slice(0, 5)
      return pack(5, top)
    }
  }
  const sh = straightHigh(mask)
  if (sh) return pack(4, [sh])
  if (trips.length) return pack(3, [trips[0], ...kickers([trips[0]], 2)])
  if (pairs.length >= 2) return pack(2, [pairs[0], pairs[1], ...kickers([pairs[0], pairs[1]], 1)])
  if (pairs.length === 1) return pack(1, [pairs[0], ...kickers([pairs[0]], 3)])
  return pack(0, kickers([], 5))
}

export const categoryOf = (score: number) => Math.floor(score / B ** 5)

/** Primeira carta de desempate (para nomear a mão). */
const topRank = (score: number) => Math.floor(score / B ** 4) % B
const secondRank = (score: number) => Math.floor(score / B ** 3) % B

const RANK_NAME: Record<number, string> = {
  2: 'Dois', 3: 'Três', 4: 'Quatro', 5: 'Cinco', 6: 'Seis', 7: 'Sete', 8: 'Oito', 9: 'Nove', 10: 'Dez',
  11: 'Valete', 12: 'Dama', 13: 'Rei', 14: 'Ás',
}
const PLURAL: Record<number, string> = {
  2: 'Dois', 3: 'Três', 4: 'Quatros', 5: 'Cincos', 6: 'Seises', 7: 'Setes', 8: 'Oitos', 9: 'Noves', 10: 'Dez',
  11: 'Valetes', 12: 'Damas', 13: 'Reis', 14: 'Ases',
}

/** Nome da mão em português, ex.: "Full house (Reis e Dez)". */
export function handName(score: number): string {
  const cat = categoryOf(score)
  const a = topRank(score)
  const b = secondRank(score)
  switch (cat) {
    case 8:
      return a === 14 ? 'Royal flush' : `Straight flush até ${RANK_NAME[a]}`
    case 7:
      return `Quadra de ${PLURAL[a]}`
    case 6:
      return `Full house (${PLURAL[a]} e ${PLURAL[b]})`
    case 5:
      return `Flush (${RANK_NAME[a]} alto)`
    case 4:
      return `Sequência até ${RANK_NAME[a]}`
    case 3:
      return `Trinca de ${PLURAL[a]}`
    case 2:
      return `Dois pares (${PLURAL[a]} e ${PLURAL[b]})`
    case 1:
      return `Par de ${PLURAL[a]}`
    default:
      return `Carta alta (${rankLabel(a)})`
  }
}
