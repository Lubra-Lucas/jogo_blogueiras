import { rng, type Difficulty } from '../shared/competition'

/**
 * Banho & Tosa (lógica pura). Dois estágios:
 *  1. Ensaboar (precisão): arraste a esponja sobre as manchas sem esfregar olhos, nariz e orelhas.
 *  2. Enxaguar (tempo): toque quando o ponteiro estiver na faixa verde.
 * Coordenadas no espaço SVG do pet (400 x 420).
 */
export interface Spot {
  id: number
  x: number
  y: number
  r: number
  /** 0..1 */
  done: number
}

export interface Zone {
  x: number
  y: number
  r: number
}

/** Áreas sensíveis: olhos e nariz. */
export const SENSITIVE: Zone[] = [
  { x: 163, y: 152, r: 26 },
  { x: 237, y: 152, r: 26 },
  { x: 200, y: 190, r: 17 },
]

export interface BanhoParams {
  spots: number
  /** segundos do estágio 1 */
  time: number
  spotR: number
  /** ganho de esfregar por unidade de distância */
  gain: number
  /** mostra as áreas sensíveis em destaque */
  hint: boolean
  taps: number
  gaugeSpeed: number
  /** largura da faixa verde (0..1) */
  zoneW: number
}

export function paramsFor(d: Difficulty, shampoo: boolean): BanhoParams {
  const base: Record<Difficulty, BanhoParams> = {
    facil: { spots: 4, time: 42, spotR: 34, gain: 1, hint: true, taps: 6, gaugeSpeed: 0.55, zoneW: 0.34 },
    normal: { spots: 6, time: 36, spotR: 29, gain: 1, hint: true, taps: 8, gaugeSpeed: 0.8, zoneW: 0.26 },
    dificil: { spots: 8, time: 32, spotR: 25, gain: 1, hint: true, taps: 10, gaugeSpeed: 1.05, zoneW: 0.2 },
    estrela: { spots: 9, time: 28, spotR: 22, gain: 1, hint: false, taps: 12, gaugeSpeed: 1.35, zoneW: 0.16 },
  }
  const p = { ...base[d] }
  if (shampoo) p.gain *= 1.2
  return p
}

/** Mesma semente = mesmas manchas (desafio do dia). */
export function makeSpots(seed: number, count: number, r: number): Spot[] {
  const rand = rng(seed)
  // regioes onde ha manchas: corpo, bochechas e testa (evita olhos e nariz)
  const zones: { cx: number; cy: number; rx: number; ry: number }[] = [
    { cx: 200, cy: 305, rx: 78, ry: 62 },
    { cx: 200, cy: 112, rx: 52, ry: 22 },
    { cx: 128, cy: 205, rx: 20, ry: 24 },
    { cx: 272, cy: 205, rx: 20, ry: 24 },
    { cx: 160, cy: 255, rx: 30, ry: 14 },
    { cx: 240, cy: 255, rx: 30, ry: 14 },
  ]
  const out: Spot[] = []
  for (let tries = 0; out.length < count && tries < 400; tries++) {
    const z = zones[Math.floor(rand() * zones.length)]
    const a = rand() * Math.PI * 2
    const m = Math.sqrt(rand())
    const x = z.cx + Math.cos(a) * z.rx * m
    const y = z.cy + Math.sin(a) * z.ry * m
    if (SENSITIVE.some((s) => Math.hypot(x - s.x, y - s.y) < s.r + r * 0.7)) continue
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < r * 1.5)) continue
    out.push({ id: out.length, x, y, r, done: 0 })
  }
  return out
}

/** Esfrega em (x, y) depois de andar `dist`. Devolve se atingiu zona sensível. */
export function scrub(spots: Spot[], x: number, y: number, dist: number, gain: number): { sensitive: boolean; cleaned: number } {
  let cleaned = 0
  for (const s of spots) {
    if (s.done >= 1) continue
    if (Math.hypot(x - s.x, y - s.y) < s.r) {
      s.done = Math.min(1, s.done + (dist / (s.r * 5.5)) * gain)
      if (s.done >= 1) cleaned++
    }
  }
  return { sensitive: SENSITIVE.some((z) => Math.hypot(x - z.x, y - z.y) < z.r), cleaned }
}

export function stage1Score(spots: Spot[], timeLeft: number, time: number, wiggles: number): number {
  const avg = spots.reduce((a, s) => a + s.done, 0) / Math.max(1, spots.length)
  const all = spots.every((s) => s.done >= 1)
  const bonus = all ? (timeLeft / time) * 100 : 0
  return Math.max(0, Math.round(500 * avg + bonus - Math.min(150, wiggles * 30)))
}

/** Posição do ponteiro (0..1) em onda triangular. */
export const gaugePos = (t: number, speed: number) => {
  const p = (t * speed) % 2
  return p < 1 ? p : 2 - p
}

export type TapGrade = 'perfeito' | 'otimo' | 'bom' | 'errou'
export function gradeTap(pos: number, center: number, zoneW: number): { grade: TapGrade; pts: number } {
  const off = Math.abs(pos - center) / (zoneW / 2)
  if (off < 0.3) return { grade: 'perfeito', pts: 100 }
  if (off < 0.65) return { grade: 'otimo', pts: 80 }
  if (off < 1) return { grade: 'bom', pts: 55 }
  return { grade: 'errou', pts: 0 }
}

export const GRADE_LABEL: Record<TapGrade, string> = { perfeito: 'Perfeito!', otimo: 'Ótimo!', bom: 'Bom', errou: 'Errou' }

export function stage2Score(points: number[], bestCombo: number, golden: boolean): number {
  const mean = points.reduce((a, b) => a + b, 0) / Math.max(1, points.length)
  const combo = Math.min(60, bestCombo * (golden ? 8 : 5))
  return Math.round((mean / 100) * 340 + combo)
}

/** Pontuação "boa" por dificuldade (para rivais NPC e estrelas). */
export const BANHO_TYPICAL: Record<Difficulty, number> = { facil: 640, normal: 660, dificil: 640, estrela: 600 }
export const BANHO_MAX = 1000
