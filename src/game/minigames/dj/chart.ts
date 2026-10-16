/** Cartela de notas gerada da mesma linha do tempo que o áudio toca. Lógica pura. */
import { rng, type Difficulty } from '../shared/competition'
import { buildTimeline, sectionOf, stepDur, type Ev, type Song } from './songs'

export type NoteType = 'tap' | 'hold' | 'scratch'

export interface Note {
  id: number
  /** segundos desde o início da música */
  t: number
  lane: number
  type: NoteType
  /** duração (segundos) das notas longas */
  dur: number
  /** direção do scratch: -1 esquerda, 1 direita */
  dir: -1 | 1
}

export interface Chart {
  notes: Note[]
  laneCount: 2 | 4
  /** tempo (s) de aproximação da nota até a linha */
  approach: number
  duration: number
}

export const LANE_KEYS: Record<2 | 4, string[][]> = {
  4: [['KeyD'], ['KeyF'], ['KeyJ'], ['KeyK']],
  2: [['KeyD', 'KeyF'], ['KeyJ', 'KeyK']],
}
export const LANE_LABEL: Record<2 | 4, string[]> = { 4: ['D', 'F', 'J', 'K'], 2: ['D F', 'J K'] }

interface Cfg {
  lanes: 2 | 4
  approach: number
  minGap: number
}
const CFG: Record<Difficulty, Cfg> = {
  facil: { lanes: 2, approach: 2.1, minGap: 0.34 },
  normal: { lanes: 4, approach: 1.7, minGap: 0.2 },
  dificil: { lanes: 4, approach: 1.5, minGap: 0.14 },
  estrela: { lanes: 4, approach: 1.3, minGap: 0.11 },
}

interface Raw {
  step: number
  lane: number
  type: NoteType
  len: number
  dir: -1 | 1
}

export function buildChart(song: Song, diff: Difficulty, seed: number): Chart {
  const cfg = CFG[diff]
  const tl = buildTimeline(song, seed)
  const sd = stepDur(song)
  const r = rng(seed ^ 0x9e3779b9)
  const median = (() => {
    const ms = tl.filter((e) => e.kind === 'lead').map((e) => e.midi!).sort((a, b) => a - b)
    return ms.length ? ms[Math.floor(ms.length / 2)] : 0
  })()
  const raw: Raw[] = []
  const push = (step: number, lane: number, type: NoteType = 'tap', len = 1, dir: -1 | 1 = 1) =>
    raw.push({ step, lane, type, len, dir })
  const leadLane = (e: Ev) => (e.midi! >= median ? 3 : 2)

  // compassos de "scratch" (fill)
  const scratchBars = new Set<number>()
  if (diff === 'dificil' || diff === 'estrela') {
    for (let b = 4; b < song.bars - 1; b++) {
      if (sectionOf(song, b) !== 'main') continue
      if (diff === 'dificil' ? b % 4 === 3 : b % 2 === 1) scratchBars.add(b)
    }
  }
  let hatFlip = 0
  let scratchDir: -1 | 1 = -1
  for (const e of tl) {
    const bar = Math.floor(e.step / 16)
    const i = e.step % 16
    if (e.kind === 'kick') {
      if (diff === 'facil') {
        if (i === 0) push(e.step, 0)
      } else if (diff === 'normal') {
        if (i % 8 === 0) push(e.step, 0)
      } else push(e.step, 0)
    } else if (e.kind === 'snare') {
      if (diff === 'facil') {
        if (i === 4 || i === 12) push(e.step, 0)
      } else if (diff === 'normal') {
        if (i === 4 || i === 12) push(e.step, 1)
      } else if (i === 4 || i === 12 || diff === 'estrela') push(e.step, 1)
    } else if (e.kind === 'lead') {
      const long = e.len >= 4
      if (diff === 'facil') {
        if (i % 4 === 0) push(e.step, 1)
      } else if (diff === 'normal') push(e.step, leadLane(e))
      else if (long) push(e.step, leadLane(e), 'hold', e.len)
      else push(e.step, leadLane(e))
    } else if (e.kind === 'ohat' || e.kind === 'hat') {
      if ((diff === 'dificil' && e.kind === 'ohat' && i % 4 === 2 && r() < 0.55) || (diff === 'normal' && e.kind === 'ohat' && i % 4 === 2 && r() < 0.4)) push(e.step, 2 + (hatFlip++ % 2))
      else if (diff === 'estrela' && ((e.kind === 'ohat' && i % 2 === 0) || (e.kind === 'hat' && i % 4 === 2 && r() < 0.5)))
        push(e.step, 2 + (hatFlip++ % 2))
    }
    if (scratchBars.has(bar) && i === 0 && e.kind === 'kick') {
      push(e.step + 12, 0, 'scratch', 1, scratchDir)
      scratchDir = scratchDir === 1 ? -1 : 1
    }
  }

  // limpa: limite por passo, espaço mínimo por pista, scratch limpa o que está em volta
  raw.sort((a, b) => a.step - b.step || (a.type === 'scratch' ? -1 : 1))
  const scratchSteps = raw.filter((n) => n.type === 'scratch').map((n) => n.step)
  const lastEnd = new Map<number, number>()
  const maxSim = diff === 'estrela' || diff === 'dificil' ? 2 : 1
  const perStep = new Map<number, number>()
  const notes: Note[] = []
  for (const n of raw) {
    const t = n.step * sd
    if (n.type !== 'scratch' && scratchSteps.some((s) => n.step >= s - 4 && n.step <= s + 2)) continue
    const lane = cfg.lanes === 2 ? (n.lane < 2 ? 0 : 1) : n.lane
    const key = n.type === 'scratch' ? 9 : lane
    const prev = lastEnd.get(key)
    const hold = n.type === 'hold' ? n.len * sd : 0
    if (prev !== undefined && t - prev < cfg.minGap) continue
    const cnt = perStep.get(n.step) ?? 0
    if (cnt >= maxSim) continue
    perStep.set(n.step, cnt + 1)
    lastEnd.set(key, t + hold)
    notes.push({ id: 0, t, lane, type: n.type, dur: hold, dir: n.dir })
  }
  notes.sort((a, b) => a.t - b.t)
  notes.forEach((n, k) => (n.id = k))
  const duration = (song.bars - 1) * 16 * sd
  return { notes, laneCount: cfg.lanes, approach: cfg.approach, duration }
}
