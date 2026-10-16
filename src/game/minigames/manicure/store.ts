import { create } from 'zustand'
import { useProfileStore } from '../../../state/profileStore'
import { playSfx } from '../audio'
import { DIFFICULTY_REWARD, dailySeed, submitScore, type Difficulty, type Entry } from '../shared/competition'
import { getProfessionXp, grantRewards } from '../rewards'
import { DIFF, POLISH_BY_ID, PROFESSION, salonLevel, unlocksAt } from './data'
import {
  PERFECT_NAIL, clientComment, colorFidelity, glossQuality, happinessHearts, judgeComments, makeClient, nailPoints,
  nailScore, scoreDecals, starsFor, type ClientDesign, type Decal, type Judge,
} from './logic'
import { PaintLayer } from './paint'

export type Mode = 'free' | 'daily'
export type Phase = 'intro' | 'playing' | 'paused' | 'done'
export type Step = 'base' | 'paint' | 'art' | 'top' | 'between'

const TUT_KEY = 'jdb.manicure.tutorialDone'
export const TUTORIAL_STEPS = 3
const bestKey = (m: Mode, d: Difficulty) => `jdb.manicure.best.${m}.${d}`
const DIFF_KEY = 'jdb.manicure.diff'

const readNum = (k: string) => {
  try {
    return Number(localStorage.getItem(k)) || 0
  } catch {
    return 0
  }
}
const writeStr = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* ignora */
  }
}

export interface NailLayers {
  base: PaintLayer
  tip: PaintLayer | null
}

export interface ClientSummary {
  name: string
  hearts: number
  comment: string
  score: number
  points: number
  perfects: number
  nails: number
}

export interface Results {
  score: number
  stars: number
  precision: number
  clean: number
  fidelity: number
  gloss: number
  clients: ClientSummary[]
  perfects: number
  bestCombo: number
  timeLeft: number
  coins: number
  xp: number
  salonXp: number
  judges: Judge[]
  board: Entry[]
  rank: number
  newBest: boolean
  best: number
  unlocked: string[]
  levelAfter: number
}

interface Acc {
  precision: number
  clean: number
  fidelity: number
  gloss: number
  n: number
}

interface GlossState {
  holding: boolean
  level: number
  quality: number | null
  zone: [number, number]
  dryT: number
}

interface ManicureStore {
  phase: Phase
  step: Step
  mode: Mode
  diff: Difficulty
  level: number
  seed: number
  time: number
  score: number
  combo: number
  bestCombo: number
  perfects: number
  client: ClientDesign
  clientIdx: number
  choice: { main: string | null; accent: string | null }
  nailIdx: number
  doneNails: boolean[]
  artDone: boolean[]
  layers: Record<number, NailLayers>
  placed: Record<number, Decal[]>
  selDecal: number | null
  cleanups: number
  gloss: GlossState
  betweenT: number
  lastClient: ClientSummary | null
  clients: ClientSummary[]
  acc: Acc
  results: Results | null
  best: number
  tutorial: number | null
  /** incrementa quando algo visual muda fora do React (camadas, adesivos) */
  rev: number

  enter: () => void
  setDiff: (d: Difficulty) => void
  start: (mode: Mode) => void
  step_: (dt: number) => void
  pause: () => void
  resume: () => void
  nextTutorial: () => void
  pickColor: (slot: 'main' | 'accent', id: string) => void
  confirmBase: () => void
  selectNail: (i: number) => void
  nailPainted: (i: number) => void
  useCleanup: () => void
  addDecal: (d: Decal) => void
  patchDecal: (i: number, p: Partial<Decal>) => void
  removeDecal: (i: number) => void
  selectDecal: (i: number | null) => void
  finishArt: (i: number) => void
  skipToTop: () => void
  holdGloss: (on: boolean) => void
  bump: () => void
}

const EMPTY_ACC: Acc = { precision: 0, clean: 0, fidelity: 0, gloss: 0, n: 0 }

function level(): number {
  return salonLevel(getProfessionXp(PROFESSION))
}

function newGloss(seed: number, idx: number, diff: Difficulty): GlossState {
  const w = DIFF[diff].greenZone
  const r = ((Math.sin(seed * 0.001 + idx * 12.9898) * 43758.5453) % 1 + 1) % 1
  const start = 0.5 + r * (0.92 - w - 0.5)
  return { holding: false, level: 0, quality: null, zone: [start, start + w], dryT: 0 }
}

function freshClientState(seed: number, idx: number, diff: Difficulty, lvl: number) {
  const client = makeClient(seed, idx, diff, lvl)
  const n = client.nails.length
  return {
    client,
    clientIdx: idx,
    step: 'base' as Step,
    choice: { main: null, accent: null },
    nailIdx: 0,
    doneNails: Array(n).fill(false) as boolean[],
    artDone: client.nails.map((nl) => !(nl.tip || nl.decals.length)) as boolean[],
    layers: {} as Record<number, NailLayers>,
    placed: {} as Record<number, Decal[]>,
    selDecal: null,
    cleanups: DIFF[diff].cleanups,
    gloss: newGloss(seed, idx, diff),
  }
}

export const useManicureStore = create<ManicureStore>()((set, get) => ({
  phase: 'intro',
  mode: 'free',
  diff: 'normal',
  level: 1,
  seed: 1,
  time: 0,
  score: 0,
  combo: 0,
  bestCombo: 0,
  perfects: 0,
  ...freshClientState(1, 0, 'normal', 1),
  betweenT: 0,
  lastClient: null,
  clients: [],
  acc: EMPTY_ACC,
  results: null,
  best: 0,
  tutorial: null,
  rev: 0,

  enter: () => {
    let d: Difficulty = 'normal'
    try {
      const v = localStorage.getItem(DIFF_KEY) as Difficulty | null
      if (v && v in DIFF) d = v
    } catch {
      /* ignora */
    }
    set({ phase: 'intro', results: null, diff: d, level: level(), best: readNum(bestKey('free', d)), tutorial: null })
  },

  setDiff: (d) => {
    writeStr(DIFF_KEY, d)
    set({ diff: d, best: readNum(bestKey(get().mode, d)) })
  },

  start: (mode) => {
    const { diff } = get()
    const seed = mode === 'daily' ? dailySeed('manicure') : (Date.now() >>> 0) ^ 0x51ed270b
    // no desafio do dia todas jogam com o mesmo conjunto (nível fixo), para a pontuação ser comparável
    const lvl = mode === 'daily' ? 4 : level()
    const seen = readNum(TUT_KEY) === 1
    set({
      mode, seed, level: lvl,
      phase: seen ? 'playing' : 'paused',
      time: DIFF[diff].seconds, score: 0, combo: 0, bestCombo: 0, perfects: 0,
      ...freshClientState(seed, 0, diff, lvl),
      betweenT: 0, lastClient: null, clients: [], acc: { ...EMPTY_ACC }, results: null,
      best: readNum(bestKey(mode, diff)), tutorial: seen ? null : 0,
    })
  },

  step_: (dt) => {
    const s = get()
    if (s.phase !== 'playing') return
    if (s.step === 'between') {
      const t = s.betweenT - dt
      if (t <= 0) nextClient()
      else set({ betweenT: t })
      return
    }
    const time = Math.max(0, s.time - dt)
    if (s.step === 'top') {
      const g = { ...s.gloss }
      const cfg = DIFF[s.diff]
      if (g.holding && g.quality === null) {
        g.level += dt * cfg.glossSpeed
        if (g.level >= 1.15) {
          g.holding = false
          g.quality = glossQuality(g.level, g.zone[0], g.zone[1])
          g.dryT = 1.2
          playSfx('bad')
        }
      }
      if (g.quality !== null) {
        g.dryT -= dt
        if (g.dryT <= 0) {
          set({ gloss: g, time })
          closeClient(false)
          return
        }
      }
      set({ gloss: g, time })
    } else set({ time })
    if (time <= 0) endRound()
  },

  pause: () => {
    if (get().phase === 'playing') set({ phase: 'paused' })
  },
  resume: () => {
    if (get().phase === 'paused' && get().tutorial === null) set({ phase: 'playing' })
  },
  nextTutorial: () => {
    const t = get().tutorial
    if (t === null) return
    if (t + 1 >= TUTORIAL_STEPS) {
      writeStr(TUT_KEY, '1')
      set({ tutorial: null, phase: 'playing' })
    } else set({ tutorial: t + 1 })
  },

  pickColor: (slot, id) => {
    playSfx('tap')
    set({ choice: { ...get().choice, [slot]: id } })
  },

  confirmBase: () => {
    const s = get()
    if (!s.choice.main || (s.client.accentId && !s.choice.accent)) return
    const cfg = DIFF[s.diff]
    const layers: Record<number, NailLayers> = {}
    s.client.nails.forEach((nl, i) => {
      const id = nl.base === 'accent' ? s.choice.accent! : s.choice.main!
      const base = new PaintLayer({ region: 'nail', brush: cfg.brush, maxSpeed: cfg.maxSpeed, ink: cfg.ink, tol: cfg.tol })
      base.setPolish(POLISH_BY_ID[id])
      let tip: PaintLayer | null = null
      if (nl.tip) {
        tip = new PaintLayer({ region: 'tip', brush: Math.max(7, cfg.brush * 0.7), maxSpeed: cfg.maxSpeed, ink: cfg.ink, tol: cfg.tol })
        tip.setPolish(null, nl.tip)
      }
      layers[i] = { base, tip }
    })
    playSfx('serve')
    set({ layers, step: 'paint', nailIdx: 0, rev: s.rev + 1 })
  },

  selectNail: (i) => set({ nailIdx: i, selDecal: null }),

  nailPainted: (i) => {
    const s = get()
    if (s.doneNails[i]) return
    const doneNails = s.doneNails.map((v, k) => (k === i ? true : v))
    playSfx('combo')
    const allDone = doneNails.every(Boolean)
    const patch: Partial<ManicureStore> = { doneNails, rev: s.rev + 1 }
    if (allDone) {
      const firstArt = s.artDone.findIndex((v) => !v)
      if (firstArt >= 0) {
        patch.step = 'art'
        patch.nailIdx = firstArt
      } else patch.step = 'top'
    } else {
      const nxt = doneNails.findIndex((v) => !v)
      patch.nailIdx = nxt
    }
    set(patch)
  },

  useCleanup: () => {
    const s = get()
    const l = s.layers[s.nailIdx]
    if (!l || s.cleanups <= 0) return
    l.base.cleanup()
    playSfx('trash')
    set({ cleanups: s.cleanups - 1, rev: s.rev + 1 })
  },

  addDecal: (d) => {
    const s = get()
    const cur = s.placed[s.nailIdx] ?? []
    if (cur.length >= 5) return
    playSfx('tap')
    set({ placed: { ...s.placed, [s.nailIdx]: [...cur, d] }, selDecal: cur.length })
  },
  patchDecal: (i, p) => {
    const s = get()
    const cur = s.placed[s.nailIdx]
    if (!cur?.[i]) return
    set({ placed: { ...s.placed, [s.nailIdx]: cur.map((d, k) => (k === i ? { ...d, ...p } : d)) } })
  },
  removeDecal: (i) => {
    const s = get()
    const cur = s.placed[s.nailIdx]
    if (!cur) return
    playSfx('trash')
    set({ placed: { ...s.placed, [s.nailIdx]: cur.filter((_, k) => k !== i) }, selDecal: null })
  },
  selectDecal: (i) => set({ selDecal: i }),

  finishArt: (i) => {
    const s = get()
    const artDone = s.artDone.map((v, k) => (k === i ? true : v))
    playSfx('combo')
    const nxt = artDone.findIndex((v) => !v)
    set({ artDone, selDecal: null, rev: s.rev + 1, ...(nxt < 0 ? { step: 'top' as Step } : { nailIdx: nxt }) })
  },

  skipToTop: () => {
    set({ step: 'top' })
  },

  holdGloss: (on) => {
    const s = get()
    if (s.step !== 'top' || s.gloss.quality !== null) return
    if (on) {
      playSfx('click')
      set({ gloss: { ...s.gloss, holding: true } })
    } else if (s.gloss.holding) {
      const q = glossQuality(s.gloss.level, s.gloss.zone[0], s.gloss.zone[1])
      playSfx(q >= 0.95 ? 'tip' : q > 0.6 ? 'serve' : 'bad')
      set({ gloss: { ...s.gloss, holding: false, quality: q, dryT: 1.2 } })
    }
  },

  bump: () => set({ rev: get().rev + 1 }),
}))

// ---------------------------------------------------------------- fechar cliente e rodada
function closeClient(timeout: boolean) {
  const s = useManicureStore.getState()
  const cfg = DIFF[s.diff]
  const gq = s.gloss.quality ?? 0
  let combo = s.combo
  let points = 0
  let perfects = 0
  let sumScore = 0
  const acc = { ...s.acc }
  s.client.nails.forEach((nl, i) => {
    const l = s.layers[i]
    const painted = l ? l.base.score() : { coverage: 0, clean: 0 }
    const tip = nl.tip && l?.tip ? l.tip.score() : nl.tip ? { coverage: 0, clean: 0 } : null
    const targetId = nl.base === 'accent' ? s.client.accentId! : s.client.baseId
    const chosen = nl.base === 'accent' ? s.choice.accent : s.choice.main
    const color = colorFidelity(chosen, targetId)
    const placed = s.placed[i] ?? []
    const art = nl.decals.length || placed.length ? scoreDecals(nl.decals, placed, cfg).score : null
    const r = nailScore({
      coverage: painted.coverage, clean: painted.clean, tipCoverage: tip?.coverage ?? null, tipClean: tip?.clean ?? null,
      color, art, gloss: gq,
    })
    const perfect = r.score >= PERFECT_NAIL
    combo = perfect ? combo + 1 : 0
    if (perfect) perfects++
    points += nailPoints(r.score, combo)
    sumScore += r.score
    acc.precision += r.precision
    acc.clean += r.clean
    acc.fidelity += r.fidelity
    acc.gloss += gq
    acc.n++
  })
  const n = s.client.nails.length
  const avg = sumScore / n
  const hearts = happinessHearts(avg)
  const bonus = Math.round((hearts - 1) * 60 + (timeout ? 0 : 120))
  points += bonus
  const summary: ClientSummary = {
    name: s.client.name, hearts, comment: clientComment(hearts), score: Math.round(avg), points, perfects, nails: n,
  }
  playSfx(hearts >= 4 ? 'done' : hearts >= 3 ? 'serve' : 'bad')
  useManicureStore.setState({
    score: s.score + points, combo, bestCombo: Math.max(s.bestCombo, combo), perfects: s.perfects + perfects,
    acc, lastClient: summary, clients: [...s.clients, summary], step: 'between', betweenT: 2.6,
    time: timeout ? s.time : s.time + cfg.clientBonus,
  })
  if (timeout) endRound()
}

function nextClient() {
  const s = useManicureStore.getState()
  useManicureStore.setState({ ...freshClientState(s.seed, s.clientIdx + 1, s.diff, s.level), lastClient: null })
}

function endRound() {
  const s = useManicureStore.getState()
  if (s.phase === 'done') return
  if (s.step !== 'between') {
    // tempo esgotado no meio da cliente: o que já foi feito conta
    if (s.step === 'base') {
      useManicureStore.setState({ time: 0 })
    } else {
      useManicureStore.setState({ time: 0, gloss: { ...s.gloss, quality: s.gloss.quality ?? 0 } })
      closeClient(true)
      return
    }
  }
  finish()
}

function finish() {
  const s = useManicureStore.getState()
  const cfg = DIFF[s.diff]
  const n = Math.max(1, s.acc.n)
  const precision = s.acc.precision / n
  const clean = s.acc.clean / n
  const fidelity = s.acc.fidelity / n
  const gloss = s.acc.gloss / n
  const score = s.score
  const stars = starsFor(score, s.diff)
  const mult = DIFFICULTY_REWARD[s.diff] * (s.mode === 'daily' ? 1.2 : 1)
  const coins = Math.round((score / 40) * mult)
  const xp = Math.round((score / 100) * mult)
  const salonXp = Math.round((score / 80) * mult)
  const prevLevel = salonLevel(getProfessionXp(PROFESSION))
  grantRewards({ coins, xp, professionXp: { [PROFESSION]: salonXp } })
  const levelAfter = salonLevel(getProfessionXp(PROFESSION))
  const unlocked: string[] = []
  for (let l = prevLevel + 1; l <= levelAfter; l++) unlocked.push(...unlocksAt(l))
  const name = useProfileStore.getState().name || 'Você'
  const id = s.mode === 'daily' ? 'manicure-dia' : 'manicure'
  const { board, rank, newBest } = submitScore(id, s.diff, score, cfg.typical, name)
  const best = Math.max(readNum(bestKey(s.mode, s.diff)), score)
  writeStr(bestKey(s.mode, s.diff), String(best))
  useManicureStore.setState({
    phase: 'done',
    best,
    results: {
      score, stars, precision, clean, fidelity, gloss, clients: s.clients, perfects: s.perfects, bestCombo: s.bestCombo,
      timeLeft: Math.round(s.time), coins, xp, salonXp, judges: judgeComments(precision, clean, fidelity, gloss),
      board, rank, newBest, best, unlocked, levelAfter,
    },
  })
  playSfx('done')
}

/** Termina a rodada quando o tempo acaba (chamado pelo store). */
export function forceEnd() {
  endRound()
}

if (import.meta.env.DEV) (window as unknown as { __mn: typeof useManicureStore }).__mn = useManicureStore
