import { randInt } from './random'

/**
 * Roleta europeia: 37 casas (0 a 36), um único zero. Vantagem da casa: 1/37 = 2,70%.
 * Todas as apostas têm o mesmo retorno esperado (36/37 = 97,30%).
 */
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const

export const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
export type NumColor = 'red' | 'black' | 'green'
export const colorOf = (n: number): NumColor => (n === 0 ? 'green' : RED_NUMBERS.has(n) ? 'red' : 'black')
export const COLOR_LABEL: Record<NumColor, string> = { red: 'Vermelho', black: 'Preto', green: 'Verde' }

export type BetKind =
  | 'straight' | 'split' | 'street' | 'corner' | 'sixline'
  | 'column' | 'dozen' | 'red' | 'black' | 'odd' | 'even' | 'low' | 'high'

export interface BetSpec {
  kind: BetKind
  /** números cobertos */
  nums: number[]
}

/** Quanto paga cada tipo (N para 1; a aposta volta além disso). */
export const PAYS: Record<BetKind, number> = {
  straight: 35, split: 17, street: 11, corner: 8, sixline: 5,
  column: 2, dozen: 2, red: 1, black: 1, odd: 1, even: 1, low: 1, high: 1,
}

export const KIND_LABEL: Record<BetKind, string> = {
  straight: 'Pleno', split: 'Cavalo', street: 'Linha', corner: 'Quadra', sixline: 'Sextina',
  column: 'Coluna', dozen: 'Dúzia', red: 'Vermelho', black: 'Preto', odd: 'Ímpar', even: 'Par', low: '1 a 18', high: '19 a 36',
}

/** O tabuleiro tem 12 linhas x 3 colunas: o número (linha r 0..11, coluna c 0..2) é r*3 + c + 1. */
export const numAt = (r: number, c: number) => r * 3 + c + 1

export function betKey(b: BetSpec): string {
  return `${b.kind}:${[...b.nums].sort((a, c) => a - c).join('-')}`
}

export const straight = (n: number): BetSpec => ({ kind: 'straight', nums: [n] })
export const outside = (k: 'red' | 'black' | 'odd' | 'even' | 'low' | 'high'): BetSpec => {
  const all = Array.from({ length: 36 }, (_, i) => i + 1)
  const f: Record<typeof k, (n: number) => boolean> = {
    red: (n) => RED_NUMBERS.has(n),
    black: (n) => !RED_NUMBERS.has(n),
    odd: (n) => n % 2 === 1,
    even: (n) => n % 2 === 0,
    low: (n) => n <= 18,
    high: (n) => n >= 19,
  }
  return { kind: k, nums: all.filter(f[k]) }
}
export const dozen = (d: 0 | 1 | 2): BetSpec => ({ kind: 'dozen', nums: Array.from({ length: 12 }, (_, i) => d * 12 + i + 1) })
export const column = (c: 0 | 1 | 2): BetSpec => ({ kind: 'column', nums: Array.from({ length: 12 }, (_, r) => numAt(r, c)) })
export const street = (r: number): BetSpec => ({ kind: 'street', nums: [numAt(r, 0), numAt(r, 1), numAt(r, 2)] })
export const sixline = (r: number): BetSpec => ({ kind: 'sixline', nums: [...street(r).nums, ...street(r + 1).nums] })
export const split = (a: number, b: number): BetSpec => ({ kind: 'split', nums: [a, b] })
/** quadra: cruzamento entre as linhas r e r+1 e as colunas c e c+1 */
export const corner = (r: number, c: number): BetSpec => ({
  kind: 'corner',
  nums: [numAt(r, c), numAt(r, c + 1), numAt(r + 1, c), numAt(r + 1, c + 1)],
})

export function spin(): number {
  return randInt(37)
}

export interface PlacedBet {
  spec: BetSpec
  amount: number
}

/** O que volta para a jogadora (aposta + ganho) se o número sorteado for `n`; 0 se perdeu. */
export function betReturn(b: PlacedBet, n: number): number {
  return b.spec.nums.includes(n) ? b.amount * (PAYS[b.spec.kind] + 1) : 0
}

export function totalReturn(bets: PlacedBet[], n: number): number {
  return bets.reduce((a, b) => a + betReturn(b, n), 0)
}

export const totalStake = (bets: PlacedBet[]) => bets.reduce((a, b) => a + b.amount, 0)

/** Ângulo (graus, sentido horário a partir do topo) do centro da casa na roda. */
export const pocketAngle = (n: number) => (WHEEL_ORDER.indexOf(n as (typeof WHEEL_ORDER)[number]) * 360) / 37

export const ROULETTE_LIMITS = { minBet: 10, maxTotal: 2000 }
