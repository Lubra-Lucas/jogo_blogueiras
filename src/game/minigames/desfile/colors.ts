/** Matemática de cor (hex <-> HSL) e regras de harmonia usadas na nota "harmonia de cores". */

export interface HSL {
  h: number // 0..360
  s: number // 0..1
  l: number // 0..1
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function hexToHsl(hex: string): HSL {
  const [r8, g8, b8] = hexToRgb(hex)
  const r = r8 / 255
  const g = g8 / 255
  const b = b8 / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d < 1e-6) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s, l }
}

/** Distância angular entre matizes (0..180). */
export function hueDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/** Cor "neutra" (preto, branco, cinza...): combina com tudo. */
export function isNeutral(c: HSL): boolean {
  return c.s < 0.16 || c.l < 0.1 || c.l > 0.93
}

/** Distância perceptual simples entre duas cores (0..~1) em RGB ponderado. */
export function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  const rm = (r1 + r2) / 2
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  const d = Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db)
  return d / 765
}

/** Esquemas de harmonia: ângulos relativos ao matiz-base. */
const SCHEMES: { id: string; offsets: number[]; bonus: number }[] = [
  { id: 'monocromático', offsets: [0], bonus: 1 },
  { id: 'análogo', offsets: [-25, 0, 25], bonus: 0.97 },
  { id: 'complementar', offsets: [0, 180], bonus: 0.95 },
  { id: 'complementar dividido', offsets: [0, 150, 210], bonus: 0.92 },
  { id: 'tríade', offsets: [0, 120, 240], bonus: 0.9 },
]

export interface HarmonyResult {
  /** 0..1 */
  score: number
  scheme: string
  /** nº de cores cromáticas consideradas */
  chromatic: number
}

/**
 * Harmonia entre as cores do look (peso = saturação, neutras ignoradas).
 * Para cada esquema e cada matiz-base (passos de 10 graus) mede o desvio médio ponderado dos matizes até a
 * âncora mais próxima do esquema; vale o melhor (esquema x bônus). Desvio 0 -> 1.0; 50 graus ou mais -> 0.
 * Poucas cores cromáticas (0-1) = look "limpo": nota alta fixa (0.85 / 0.92).
 */
export function harmony(colors: string[]): HarmonyResult {
  const hsl = colors.map(hexToHsl).filter((c) => !isNeutral(c))
  if (hsl.length === 0) return { score: 0.85, scheme: 'neutro', chromatic: 0 }
  if (hsl.length === 1) return { score: 0.92, scheme: 'monocromático', chromatic: 1 }
  const wsum = hsl.reduce((a, c) => a + c.s, 0) || 1
  let best: HarmonyResult = { score: 0, scheme: 'caótico', chromatic: hsl.length }
  for (const sc of SCHEMES) {
    for (let base = 0; base < 360; base += 10) {
      let dev = 0
      for (const c of hsl) {
        let m = 180
        for (const o of sc.offsets) m = Math.min(m, hueDist(c.h, (base + o + 360) % 360))
        dev += (m * c.s) / wsum
      }
      const s = Math.max(0, 1 - dev / 50) * sc.bonus
      if (s > best.score) best = { score: s, scheme: sc.id, chromatic: hsl.length }
    }
  }
  return best
}
