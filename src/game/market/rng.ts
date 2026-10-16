/** PRNG deterministico (mulberry32) + utilidades estatisticas. */
export type Rng = () => number

export function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const seeded = (...parts: Array<string | number>): Rng => mulberry32(hash(parts.join('|')))

export function gauss(r: Rng): number {
  const u = Math.max(1e-9, r())
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r())
}

export function poisson(r: Rng, lambda: number): number {
  if (lambda <= 0) return 0
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gauss(r)))
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= r()
  } while (p > L)
  return k - 1
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const pick = <T,>(r: Rng, a: readonly T[]): T => a[Math.floor(r() * a.length) % a.length]
