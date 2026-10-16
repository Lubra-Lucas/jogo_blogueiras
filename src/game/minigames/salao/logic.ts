import { rng, type Difficulty } from '../shared/competition'
import {
  ACC_COLORS, ACC_SPOTS, DIFF, SKIN_TONES, SUIT_COLORS, unlockedPool,
  type AccId, type ColorDef, type Recipe, type Spot, type StyleId,
} from './data'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// ------------------------------------------------------------------ cor
type RGB = [number, number, number]
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
export const toHex = (c: RGB) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
const R = hex('#b5382c'), Y = hex('#d9a441'), B = hex('#2f4f8a'), NEUTRAL = hex('#cfc6b8'), WHITE = hex('#f7f3ea'), DARK = hex('#1e1814')

export const ZERO_RECIPE: Recipe = { r: 0, y: 0, b: 0, w: 0, d: 0 }

/** Mistura de pigmentos: razão dos primários define o matiz; a soma, a saturação; branco clareia, escuro escurece. */
export function mixColor(m: Recipe): string {
  const t = m.r + m.y + m.b
  let c: RGB = NEUTRAL
  if (t > 0.001) {
    const ratio = [0, 1, 2].map((i) => (R[i] * m.r + Y[i] * m.y + B[i] * m.b) / t) as RGB
    const k = clamp01(t)
    c = [0, 1, 2].map((i) => lerp(NEUTRAL[i], ratio[i], k)) as RGB
  }
  c = c.map((v, i) => lerp(v, WHITE[i], m.w * 0.85)) as RGB
  c = c.map((v, i) => lerp(v, DARK[i], m.d * 0.85)) as RGB
  return toHex(c)
}

function lab(h: string): RGB {
  const lin = hex(h).map((v) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  const [r, g, b] = lin
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const f = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}
export function deltaE(a: string, b: string): number {
  const p = lab(a), q = lab(b)
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
}
/** 0..100 a partir do ΔE (CIE76); até 3 é indistinguível. */
export function colorScore(a: string, b: string, tol: number): number {
  return Math.round(100 * clamp01(1 - (deltaE(a, b) - 3) / tol))
}

// ------------------------------------------------------------------ pedido
export interface Order {
  style: StyleId
  colors: ColorDef[] // 1 (cor única) ou 2 (raiz + pontas)
  acc: AccId
  accColor: string
  spot: Spot
  skin: string
  suit: string
  /** visual da cliente ao sentar (antes de atender) */
  startStyle: StyleId
  startColor: string
  styleOptions: StyleId[]
  accOptions: AccId[]
}

export function makeOrder(seed: number, index: number, level: number): Order {
  const r = rng((seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0)
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length) % a.length]
  const pool = unlockedPool(level)
  const style = pick(pool.styles)
  const c1 = pick(pool.colors)
  const duo = pool.duo && r() < Math.min(0.55, 0.15 + index * 0.12)
  const c2 = duo ? pick(pool.colors.filter((c) => c.id !== c1.id)) : null
  const acc = pick(pool.accs)
  const spot = pick(ACC_SPOTS[acc])
  const others = pool.styles.filter((s) => s !== style).sort(() => r() - 0.5)
  const styleOptions = [style, ...others.slice(0, 3)].sort(() => r() - 0.5)
  const accOthers = pool.accs.filter((a) => a !== acc)
  const accOptions = [acc, ...accOthers.slice(0, 2)].sort(() => r() - 0.5)
  const startStyle = pick(pool.styles.filter((s) => s !== style))
  const startColor = pick(['#6b4a35', '#c8a566', '#3a2a22', '#8b8579'])
  return {
    style, colors: c2 ? [c1, c2] : [c1], acc, accColor: pick(ACC_COLORS), spot,
    skin: pick(SKIN_TONES), suit: pick(SUIT_COLORS), startStyle, startColor, styleOptions, accOptions,
  }
}

export function patienceFor(d: Difficulty, index: number): number {
  return DIFF[d].patience * Math.max(0.6, 1 - index * 0.04)
}

// ------------------------------------------------------------------ trilha da escova
export type Pt = { x: number; y: number }
export const BRUSH_W = 100
export const BRUSH_H = 64

export function makePath(seed: number, index: number, d: Difficulty): Pt[] {
  const r = rng((seed ^ Math.imul(index + 3, 7919) ^ 0xabc) >>> 0)
  const wob = d === 'facil' ? 0.55 : d === 'normal' ? 0.8 : 1
  const n = 5
  const ctrl: Pt[] = []
  let x = 18 + r() * 64
  for (let i = 0; i < n; i++) {
    ctrl.push({ x, y: 8 + (i / (n - 1)) * 48 })
    const dir = (r() < 0.5 ? -1 : 1) * (22 + r() * 22) * wob
    x = Math.max(12, Math.min(88, x + dir))
  }
  const out: Pt[] = []
  const P = (i: number) => ctrl[Math.max(0, Math.min(n - 1, i))]
  for (let i = 0; i < n - 1; i++) {
    for (let s = 0; s < 18; s++) {
      const t = s / 18, t2 = t * t, t3 = t2 * t
      const a = P(i - 1), b = P(i), c = P(i + 1), e = P(i + 2)
      out.push({
        x: 0.5 * (2 * b.x + (-a.x + c.x) * t + (2 * a.x - 5 * b.x + 4 * c.x - e.x) * t2 + (-a.x + 3 * b.x - 3 * c.x + e.x) * t3),
        y: 0.5 * (2 * b.y + (-a.y + c.y) * t + (2 * a.y - 5 * b.y + 4 * c.y - e.y) * t2 + (-a.y + 3 * b.y - 3 * c.y + e.y) * t3),
      })
    }
  }
  out.push(ctrl[n - 1])
  return out
}

export interface Trace {
  covered: boolean[]
  total: number
  on: number
  pts: Pt[]
}
export const newTrace = (path: Pt[]): Trace => ({ covered: path.map(() => false), total: 0, on: 0, pts: [] })

export function traceAdd(t: Trace, path: Pt[], p: Pt, r: number) {
  t.total++
  let best = Infinity
  for (let i = 0; i < path.length; i++) {
    const d = Math.hypot(path[i].x - p.x, path[i].y - p.y)
    if (d < best) best = d
    if (d <= r) t.covered[i] = true
  }
  if (best <= r * 1.5) t.on++
  const last = t.pts[t.pts.length - 1]
  if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 2.5) t.pts.push(p)
}
export const traceCoverage = (t: Trace) => t.covered.filter(Boolean).length / Math.max(1, t.covered.length)

export function traceScore(t: Trace): { score: number; coverage: number; onPath: number; smooth: number } {
  const coverage = traceCoverage(t)
  const onFrac = t.total ? t.on / t.total : 0
  let turn = 0, n = 0
  for (let i = 2; i < t.pts.length; i++) {
    const a = Math.atan2(t.pts[i - 1].y - t.pts[i - 2].y, t.pts[i - 1].x - t.pts[i - 2].x)
    const b = Math.atan2(t.pts[i].y - t.pts[i - 1].y, t.pts[i].x - t.pts[i - 1].x)
    let d = Math.abs(b - a)
    if (d > Math.PI) d = 2 * Math.PI - d
    turn += d
    n++
  }
  const mean = n ? turn / n : 0
  const smooth = clamp01(1 - (mean - 0.2) / 0.8)
  const onPath = clamp01((onFrac - 0.5) / 0.45)
  return { score: Math.round(100 * coverage * (0.7 * onPath + 0.3 * smooth)), coverage, onPath, smooth }
}

// ------------------------------------------------------------------ secador
export interface Dryer { t: number; p: number; v: number; inZone: number; phase: number }
export const newDryer = (seed: number): Dryer => ({ t: 0, p: 0.3, v: 0, inZone: 0, phase: (seed % 628) / 100 })
export const dryerZone = (s: Dryer) => 0.5 + 0.26 * Math.sin(s.t * 0.9 + s.phase) + 0.1 * Math.sin(s.t * 2.3 + s.phase * 2)
export function dryerStep(s: Dryer, dt: number, hold: boolean, half: number): Dryer {
  const drift = 0.9 * Math.sin(s.t * 3.1 + s.phase) + 0.6 * Math.sin(s.t * 5.7)
  let v = s.v + ((hold ? 2.4 : -1.9) + drift) * dt
  v *= Math.pow(0.4, dt)
  let p = s.p + v * dt
  if (p < 0) { p = 0; v = 0 }
  if (p > 1) { p = 1; v = 0 }
  const t = s.t + dt
  const z = dryerZone({ ...s, t })
  return { ...s, t, p, v, inZone: s.inZone + (Math.abs(p - z) <= half ? dt : 0) }
}
export const dryerScore = (s: Dryer) => Math.round(100 * Math.pow(clamp01(s.inZone / Math.max(0.1, s.t)), 1.15))

// ------------------------------------------------------------------ pontuação
export type Grade = 'perfeito' | 'otimo' | 'bom' | 'ops'
export const gradeOf = (pct: number): Grade => (pct >= 90 ? 'perfeito' : pct >= 75 ? 'otimo' : pct >= 55 ? 'bom' : 'ops')
export const GRADE_TEXT: Record<Grade, string> = { perfeito: 'Perfeito!', otimo: 'Ótimo!', bom: 'Bom', ops: 'Quase...' }

export function comboMult(streak: number): number {
  return streak >= 4 ? 2 : streak === 3 ? 1.5 : streak === 2 ? 1.25 : 1
}

export interface ClientResult { steps: number[]; pct: number; points: number; grade: Grade }

export function clientPoints(steps: number[], patienceFrac: number, peeks: number, streakBefore: number) {
  const pct = Math.max(0, Math.round(steps.reduce((a, b) => a + b, 0) / 4 - peeks * 4))
  const grade = gradeOf(pct)
  const streak = grade === 'perfeito' ? streakBefore + 1 : 0
  const speed = pct >= 60 ? Math.round(clamp01(patienceFrac) * 150) : 0
  return { pct, grade, streak, points: Math.round((pct * 10 + speed) * comboMult(streak)) }
}

export function starsFor(score: number, d: Difficulty): number {
  const t = DIFF[d].typical
  return score >= t * 0.95 ? 3 : score >= t * 0.6 ? 2 : score >= t * 0.2 ? 1 : 0
}

export interface Comment { who: string; text: string }
const COMMENTS: [string, string][][] = [
  [['Dona Marta', 'Esse corte não era o da foto, mas a gente se acostuma.'], ['Dona Marta', 'Acertou o estilo, só faltou segurança.'], ['Dona Marta', 'Cortou direitinho, sem hesitar.']],
  [['Camila', 'A cor ficou fora do tom que eu queria.'], ['Camila', 'Cor bonita, só um pouquinho diferente da foto.'], ['Camila', 'O tom bateu com a referência!']],
  [['Helena', 'A escova puxou torta, mas dá para ajeitar.'], ['Helena', 'Escova macia, fios quase alinhados.'], ['Helena', 'Brilho de vitrine, mãos de fada.']],
  [['Rosa', 'Cadê o acessório no lugar certo?'], ['Rosa', 'Acessório bom, faltou um pouco de pressa.'], ['Rosa', 'Encaixou como uma luva.']],
]
export function commentsFor(avgs: number[]): Comment[] {
  return avgs.map((a, i) => {
    const [who, text] = COMMENTS[i][a >= 85 ? 2 : a >= 55 ? 1 : 0]
    return { who, text }
  })
}

export interface Results {
  score: number
  stars: number
  clients: number
  perfect: number
  bestStreak: number
  skills: number[]
  comments: Comment[]
  coins: number
  xp: number
  profXp: number
}

export function computeResults(score: number, results: ClientResult[], bestStreak: number, d: Difficulty, mult: number): Results {
  const n = results.length
  const skills = [0, 1, 2, 3].map((i) => (n ? Math.round(results.reduce((a, r) => a + r.steps[i], 0) / n) : 0))
  const stars = starsFor(score, d)
  return {
    score, stars, clients: n, perfect: results.filter((r) => r.grade === 'perfeito').length, bestStreak, skills,
    comments: commentsFor(skills),
    coins: n ? Math.round((score / 70 + stars * 6) * mult) : 0,
    xp: n ? Math.round((8 + stars * 8 + n * 2) * mult) : 0,
    profXp: n ? Math.round((12 + stars * 10 + n * 3 + score / 120) * mult) : 0,
  }
}
