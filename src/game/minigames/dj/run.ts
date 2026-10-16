/** Julgamento, combo, pontos e energia da pista. Lógica pura, sem React nem áudio. */
import type { Difficulty } from '../shared/competition'
import type { Chart, Note } from './chart'

export type Judgement = 'perfect' | 'great' | 'good' | 'miss'

export const JUDGE_LABEL: Record<Judgement, string> = { perfect: 'Perfeito!', great: 'Ótimo!', good: 'Bom', miss: 'Errou' }
const BASE_POINTS: Record<Judgement, number> = { perfect: 300, great: 200, good: 100, miss: 0 }
/** Energia da pista = média móvel do desempenho recente: acertos enchem a pista, erros em sequência esvaziam. */
const ENERGY_TARGET: Record<Judgement, number> = { perfect: 1, great: 0.85, good: 0.55, miss: 0 }

/** Janelas em segundos (±), mais largas no Fácil. */
export function windows(d: Difficulty) {
  const k = d === 'facil' ? 1.5 : d === 'normal' ? 1.1 : 1
  return { perfect: 0.04 * k, great: 0.08 * k, good: 0.13 * k }
}

export const FEVER_COMBO = 30
export const multiplierOf = (combo: number) => 1 + Math.min(3, Math.floor(combo / 10))

export interface JudgeEvent {
  j: Judgement
  lane: number
  note: Note
  /** erro em ms (positivo = tarde) */
  delta: number
  fever: boolean
  combo: number
}

type NState = 'pending' | 'hit' | 'held' | 'done' | 'missed'

export class Run {
  readonly chart: Chart
  readonly win: ReturnType<typeof windows>
  state: NState[]
  /** pista -> índice da nota longa segurada */
  holding = new Map<number, number>()
  score = 0
  combo = 0
  maxCombo = 0
  energy = 0.3
  counts: Record<Judgement, number> = { perfect: 0, great: 0, good: 0, miss: 0 }
  fever = false
  feverTime = 0
  events: JudgeEvent[] = []
  private cursor = 0

  constructor(chart: Chart, diff: Difficulty) {
    this.chart = chart
    this.win = windows(diff)
    this.state = chart.notes.map(() => 'pending')
  }

  get total() {
    return this.chart.notes.length
  }
  get judged() {
    return this.counts.perfect + this.counts.great + this.counts.good + this.counts.miss
  }
  get accuracy() {
    const n = this.judged
    if (!n) return 0
    return (100 * (this.counts.perfect + 0.8 * this.counts.great + 0.5 * this.counts.good)) / n
  }
  get multiplier() {
    return multiplierOf(this.combo) * (this.fever ? 1.5 : 1)
  }

  private award(j: Judgement, n: Note, delta: number) {
    this.counts[j]++
    if (j === 'miss') {
      this.combo = 0
      this.fever = false
    } else {
      this.combo++
      this.maxCombo = Math.max(this.maxCombo, this.combo)
      if (this.combo >= FEVER_COMBO) this.fever = true
      this.score += Math.round(BASE_POINTS[j] * this.multiplier)
    }
    this.energy += (ENERGY_TARGET[j] - this.energy) * (j === 'miss' ? 0.14 : 0.09)
    this.events.push({ j, lane: n.lane, note: n, delta: delta * 1000, fever: this.fever, combo: this.combo })
  }

  private classify(abs: number): Judgement | null {
    if (abs <= this.win.perfect) return 'perfect'
    if (abs <= this.win.great) return 'great'
    if (abs <= this.win.good) return 'good'
    return null
  }

  /** Toque na pista `lane` no instante `t` (s). Devolve o julgamento ou null (toque sem nota). */
  press(lane: number, t: number): Judgement | null {
    const notes = this.chart.notes
    let best = -1
    let bestAbs = Infinity
    for (let i = this.cursor; i < notes.length; i++) {
      const n = notes[i]
      if (n.t - t > this.win.good) break
      if (this.state[i] !== 'pending' || n.lane !== lane || n.type === 'scratch') continue
      const a = Math.abs(t - n.t)
      if (a < bestAbs) {
        bestAbs = a
        best = i
      }
    }
    if (best < 0) return null
    const j = this.classify(bestAbs)
    if (!j) return null
    const n = notes[best]
    if (n.type === 'hold') {
      this.state[best] = 'held'
      this.holding.set(lane, best)
    } else this.state[best] = 'hit'
    this.award(j, n, t - n.t)
    return j
  }

  release(lane: number, t: number) {
    const idx = this.holding.get(lane)
    if (idx === undefined) return
    const n = this.chart.notes[idx]
    this.holding.delete(lane)
    this.state[idx] = 'done'
    if (t < n.t + n.dur - 0.12) this.award('miss', n, 0) // soltou cedo: quebra o combo
  }

  scratch(dir: -1 | 0 | 1, t: number): Judgement | null {
    const notes = this.chart.notes
    for (let i = this.cursor; i < notes.length; i++) {
      const n = notes[i]
      if (n.t - t > this.win.good) break
      if (this.state[i] !== 'pending' || n.type !== 'scratch') continue
      const j = this.classify(Math.abs(t - n.t))
      if (!j) continue
      this.state[i] = 'hit'
      // direção errada vale no máximo "Bom"
      const given: Judgement = n.dir === dir || dir === 0 ? j : 'good'
      this.award(given, n, t - n.t)
      return given
    }
    return null
  }

  /** Avança o relógio: marca erros, termina notas longas e acumula tempo de fever. */
  update(t: number, dt = 0) {
    const notes = this.chart.notes
    for (let i = this.cursor; i < notes.length; i++) {
      const n = notes[i]
      if (this.state[i] === 'pending' && t > n.t + this.win.good) {
        this.state[i] = 'missed'
        this.award('miss', n, 0)
      } else if (this.state[i] === 'held' && t >= n.t + n.dur) {
        this.state[i] = 'done'
        this.holding.delete(n.lane)
        this.score += Math.round(100 * this.multiplier)
      }
      if (n.t - t > 1.5 + n.dur) break
    }
    while (this.cursor < notes.length && ['hit', 'done', 'missed'].includes(this.state[this.cursor])) this.cursor++
    if (this.fever) this.feverTime += dt
    // nota longa segurada rende energia
    if (this.holding.size) this.energy = Math.min(1, this.energy + 0.01 * dt * this.holding.size)
  }

  get finished() {
    return this.judged >= this.total && this.holding.size === 0
  }

  drainEvents(): JudgeEvent[] {
    const e = this.events
    this.events = []
    return e
  }
}

export type Grade = 'S' | 'A' | 'B' | 'C'
export function gradeOf(acc: number): Grade {
  return acc >= 95 ? 'S' : acc >= 85 ? 'A' : acc >= 70 ? 'B' : 'C'
}
export function starsOf(acc: number): 1 | 2 | 3 {
  return acc >= 90 ? 3 : acc >= 75 ? 2 : 1
}
/** Pontuação de uma partida "boa" (para gerar os rivais). */
export function typicalScore(chart: Chart): number {
  return Math.round(chart.notes.length * 300 * 2.3 * 0.55)
}

/** XP de DJ necessário para cada nível (nível 1 = 0). */
export const djXpForLevel = (l: number) => (l <= 1 ? 0 : (40 * (l - 1) * l) / 2)
export function djLevel(xp: number): number {
  let l = 1
  while (xp >= djXpForLevel(l + 1) && l < 20) l++
  return l
}
