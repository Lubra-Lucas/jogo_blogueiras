import { create } from 'zustand'
import { useProfileStore } from '../../../state/profileStore'
import { playSfx } from '../audio'
import { getProfessionXp, grantRewards } from '../rewards'
import { DIFFICULTY_REWARD, dailySeed, submitScore, type Difficulty, type Entry } from '../shared/competition'
import { DIFF, PROFESSION, salaoLevel, newUnlocks, type AccId, type Recipe, type Spot, type StyleId, type Unlock } from './data'
import {
  ZERO_RECIPE, clientPoints, colorScore, computeResults, makeOrder, mixColor, patienceFor,
  type ClientResult, type Grade, type Order, type Results,
} from './logic'

const BEST_KEY = 'jdb.salao.best'
const TUT_KEY = 'jdb.salao.tutorialDone'
export const TUTORIAL_STEPS = 3
const DAILY_LEVEL = 4
const GAP = 1.4

export type FinishKind = 'brush' | 'dryer'
export interface Fx { id: number; text: string; kind: 'good' | 'perfect' | 'bad' | 'info' }

export interface Client {
  index: number
  order: Order
  finish: FinishKind
  patienceMax: number
  patience: number
  elapsed: number
  stepT: number
  step: number
  steps: number[]
  style: StyleId
  hairColor: string
  acc: AccId | null
  mix: Recipe
  colorStage: number
  colorScores: number[]
  retried: boolean
  accPick: AccId | null
  accMistakes: number
  peeks: number
  peekUntil: number
  shake: number
  /** ao terminar: nota exibida enquanto a cliente sai */
  done: { grade: Grade; pct: number; points: number } | null
  gap: number
}

interface SalaoStore {
  phase: 'intro' | 'playing' | 'paused' | 'done'
  difficulty: Difficulty
  daily: boolean
  seed: number
  level: number
  time: number
  score: number
  streak: number
  bestStreak: number
  clientResults: ClientResult[]
  client: Client | null
  fx: Fx[]
  sparkle: number
  tutorial: number | null
  best: number
  newBest: boolean
  results: Results | null
  board: Entry[]
  rank: number
  unlockedNow: Unlock[]
  levelAfter: number

  enter: () => void
  setDifficulty: (d: Difficulty) => void
  setDaily: (v: boolean) => void
  start: () => void
  step: (dt: number) => void
  pause: () => void
  resume: () => void
  nextTutorial: () => void
  pickStyle: (id: StyleId) => void
  setPigment: (k: keyof Recipe, v: number) => void
  submitColor: () => void
  finishGesture: (score: number) => void
  pickAcc: (id: AccId) => void
  tapSpot: (s: Spot) => void
  peek: () => void
  devJump: (where: string) => void
}

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
const bestKey = (d: Difficulty) => `${BEST_KEY}.${d}`
let fxId = 1

function newClient(seed: number, index: number, level: number, d: Difficulty): Client {
  const order = makeOrder(seed, index, level)
  const pat = patienceFor(d, index)
  return {
    index, order, finish: index % 2 === 0 ? 'brush' : 'dryer', patienceMax: pat, patience: pat, elapsed: 0, stepT: 0, step: 0, steps: [],
    style: order.startStyle, hairColor: order.startColor, acc: null, mix: ZERO_RECIPE, colorStage: 0, colorScores: [],
    retried: false, accPick: null, accMistakes: 0, peeks: 0, peekUntil: -1, shake: 0, done: null, gap: 0,
  }
}

const effLevel = (s: { daily: boolean; level: number }) => (s.daily ? DAILY_LEVEL : s.level)

export const useSalaoStore = create<SalaoStore>()((set, get) => {
  const addFx = (text: string, kind: Fx['kind']) => {
    const f = { id: fxId++, text, kind }
    set({ fx: [...get().fx.slice(-3), f] })
    setTimeout(() => set({ fx: get().fx.filter((x) => x.id !== f.id) }), 1300)
  }

  const patchClient = (p: Partial<Client>) => {
    const c = get().client
    if (c) set({ client: { ...c, ...p } })
  }

  /** conclui o passo atual com a nota (0..100) e avança; no último passo fecha o cliente. */
  const completeStep = (score: number, patch: Partial<Client> = {}) => {
    const c = get().client
    if (!c || c.done) return
    const sc = Math.max(0, Math.min(100, Math.round(score)))
    const steps = [...c.steps, sc]
    if (sc >= 90) playSfx('serve')
    else if (sc < 40) playSfx('bad')
    else playSfx('tap')
    addFx(sc >= 90 ? 'Perfeito!' : sc >= 70 ? 'Ótimo!' : sc >= 45 ? 'Bom' : 'Ops', sc >= 90 ? 'perfect' : sc >= 45 ? 'good' : 'bad')
    if (sc >= 90) set({ sparkle: get().sparkle + 1 })
    const next = { ...c, ...patch, steps, step: c.step + 1, stepT: 0 }
    if (steps.length < 4) set({ client: next })
    else closeClient(next)
  }

  const closeClient = (c: Client) => {
    const s = get()
    const full = [0, 1, 2, 3].map((i) => c.steps[i] ?? 0)
    const r = clientPoints(full, c.patience / c.patienceMax, c.peeks, s.streak)
    const result: ClientResult = { steps: full, pct: r.pct, points: r.points, grade: r.grade }
    if (r.grade === 'perfeito') playSfx(r.streak >= 2 ? 'combo' : 'tip')
    set({
      client: { ...c, steps: full, done: { grade: r.grade, pct: r.pct, points: r.points }, gap: GAP },
      clientResults: [...s.clientResults, result],
      score: s.score + r.points,
      streak: r.streak,
      bestStreak: Math.max(s.bestStreak, r.streak),
      sparkle: r.grade === 'perfeito' ? s.sparkle + 1 : s.sparkle,
    })
  }

  const endRound = () => {
    const s = get()
    const c = s.client
    let score = s.score
    let list = s.clientResults
    if (c && !c.done && c.steps.length >= 3) {
      const full = [0, 1, 2, 3].map((i) => c.steps[i] ?? 0)
      const r = clientPoints(full, c.patience / c.patienceMax, c.peeks, s.streak)
      list = [...list, { steps: full, pct: r.pct, points: r.points, grade: r.grade }]
      score += r.points
    }
    const mult = DIFFICULTY_REWARD[s.difficulty]
    const res = computeResults(score, list, s.bestStreak, s.difficulty, mult)
    const prevBest = readNum(bestKey(s.difficulty))
    const newBest = score > prevBest
    if (newBest) writeStr(bestKey(s.difficulty), String(score))
    const prevLevel = salaoLevel(getProfessionXp(PROFESSION))
    if (res.clients > 0) grantRewards({ coins: res.coins, xp: res.xp, professionXp: { [PROFESSION]: res.profXp } })
    const levelAfter = salaoLevel(getProfessionXp(PROFESSION))
    let board: Entry[] = []
    let rank = 0
    try {
      const name = useProfileStore.getState().name
      const r = submitScore(s.daily ? 'salao-diario' : 'salao', s.difficulty, score, DIFF[s.difficulty].typical, name)
      board = r.board
      rank = r.rank
    } catch {
      /* ranking indisponível */
    }
    playSfx('done')
    set({
      phase: 'done', score, clientResults: list, results: res, newBest, best: Math.max(prevBest, score), board, rank,
      unlockedNow: newUnlocks(prevLevel, levelAfter), levelAfter, client: null,
    })
  }

  return {
    phase: 'intro', difficulty: 'normal', daily: false, seed: 1, level: 1, time: 0, score: 0, streak: 0, bestStreak: 0,
    clientResults: [], client: null, fx: [], sparkle: 0, tutorial: null, best: 0, newBest: false, results: null,
    board: [], rank: 0, unlockedNow: [], levelAfter: 1,

    enter: () => {
      const level = salaoLevel(getProfessionXp(PROFESSION))
      const d = get().difficulty
      set({ phase: 'intro', level, best: readNum(bestKey(d)), results: null, client: null, tutorial: null, fx: [] })
    },
    setDifficulty: (d) => set({ difficulty: d, best: readNum(bestKey(d)) }),
    setDaily: (v) => set({ daily: v }),

    start: () => {
      const s = get()
      const level = salaoLevel(getProfessionXp(PROFESSION))
      const seed = s.daily ? dailySeed('salao') : (Date.now() ^ 0x5bd1e995) >>> 0
      const seen = readNum(TUT_KEY) === 1
      set({
        phase: seen ? 'playing' : 'paused', seed, level, time: DIFF[s.difficulty].roundSeconds, score: 0, streak: 0, bestStreak: 0,
        clientResults: [], fx: [], results: null, newBest: false, unlockedNow: [], tutorial: seen ? null : 0, board: [],
        client: newClient(seed, 0, s.daily ? DAILY_LEVEL : level, s.difficulty), best: readNum(bestKey(s.difficulty)),
      })
      playSfx('click')
    },

    step: (dt) => {
      const s = get()
      if (s.phase !== 'playing') return
      const time = s.time - dt
      if (time <= 0) {
        set({ time: 0 })
        endRound()
        return
      }
      const c = s.client
      if (!c) return set({ time })
      if (c.done) {
        const gap = c.gap - dt
        if (gap <= 0) set({ time, client: newClient(s.seed, c.index + 1, effLevel(s), s.difficulty) })
        else set({ time, client: { ...c, gap } })
        return
      }
      const patience = c.patience - dt
      const shake = Math.max(0, c.shake - dt)
      if (patience <= 0) {
        // a cliente cansou: passos restantes valem 0 (a coloração vale o que estiver na mistura)
        let steps = c.steps
        if (c.step === 1 && c.steps.length === 1) {
          const sc = colorScore(mixColor(c.mix), mixColor(c.order.colors[c.colorStage].recipe), DIFF[s.difficulty].deTol)
          steps = [...steps, c.colorStage === 0 ? sc : Math.round(((c.colorScores[0] ?? 0) + sc) / 2)]
        }
        addFx('Ela cansou de esperar!', 'bad')
        playSfx('bad')
        set({ time })
        closeClient({ ...c, patience: 0, steps })
        return
      }
      set({ time, client: { ...c, patience, shake, elapsed: c.elapsed + dt, stepT: c.stepT + dt } })
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

    pickStyle: (id) => {
      const s = get()
      const c = s.client
      if (!c || c.done || c.step !== 0) return
      if (id === c.order.style) {
        const base = 80 + 20 * (1 - Math.min(1, c.stepT / 6))
        completeStep(c.retried ? Math.min(50, base) : base, { style: id })
      } else if (DIFF[s.difficulty].retryStyle && !c.retried) {
        playSfx('bad')
        patchClient({ retried: true, shake: 0.4 })
        addFx('Não é esse, tente de novo', 'info')
      } else {
        completeStep(0, { style: id })
      }
    },

    setPigment: (k, v) => {
      const c = get().client
      if (!c || c.done || c.step !== 1) return
      const mix = { ...c.mix, [k]: Math.max(0, Math.min(1, v)) }
      patchClient({ mix, hairColor: mixColor(mix) })
    },

    submitColor: () => {
      const s = get()
      const c = s.client
      if (!c || c.done || c.step !== 1) return
      const target = mixColor(c.order.colors[c.colorStage].recipe)
      const sc = colorScore(mixColor(c.mix), target, DIFF[s.difficulty].deTol)
      if (c.colorStage + 1 < c.order.colors.length) {
        playSfx('tap')
        addFx(sc >= 90 ? 'Raiz perfeita!' : 'Raiz pronta', sc >= 90 ? 'perfect' : 'good')
        patchClient({ colorStage: c.colorStage + 1, colorScores: [...c.colorScores, sc], mix: ZERO_RECIPE })
      } else {
        const all = [...c.colorScores, sc]
        completeStep(all.reduce((a, b) => a + b, 0) / all.length, { colorScores: all })
      }
    },

    finishGesture: (score) => {
      const c = get().client
      if (!c || c.done || c.step !== 2) return
      completeStep(score)
    },

    pickAcc: (id) => {
      const c = get().client
      if (!c || c.done || c.step !== 3 || c.accPick) return
      if (id === c.order.acc) {
        playSfx('tap')
        patchClient({ accPick: id })
      } else {
        playSfx('bad')
        patchClient({ accMistakes: c.accMistakes + 1, shake: 0.4 })
      }
    },

    tapSpot: (spot) => {
      const c = get().client
      if (!c || c.done || c.step !== 3 || !c.accPick) return
      if (spot === c.order.spot) {
        const sc = Math.max(0, 100 - 25 * c.accMistakes) * (1 - 0.15 * Math.min(1, c.stepT / 8))
        completeStep(sc, { acc: c.accPick })
      } else if (c.accMistakes + 1 >= 3) {
        completeStep(0, { acc: c.accPick })
      } else {
        playSfx('bad')
        patchClient({ accMistakes: c.accMistakes + 1, shake: 0.4 })
      }
    },

    peek: () => {
      const s = get()
      const c = s.client
      if (!c || c.done || !DIFF[s.difficulty].canPeek) return
      if (c.elapsed < c.peekUntil) return
      patchClient({ peeks: c.peeks + 1, peekUntil: c.elapsed + 1.3 })
    },

    /** Só em dev (capturas): pula para uma fase. */
    devJump: (where) => {
      get().start()
      set({ phase: 'playing', tutorial: null })
      const c = get().client!
      const o = c.order
      const base = { ...c, steps: [] as number[] }
      if (where === 'style') return
      if (where === 'color') set({ client: { ...base, step: 1, steps: [92], style: o.style } })
      else if (where === 'brush') set({ client: { ...base, step: 2, steps: [92, 88], style: o.style, hairColor: mixColor(o.colors[0].recipe), finish: 'brush' } })
      else if (where === 'dryer') set({ client: { ...base, step: 2, steps: [92, 88], style: o.style, hairColor: mixColor(o.colors[0].recipe), finish: 'dryer' } })
      else if (where === 'acc') set({ client: { ...base, step: 3, steps: [92, 88, 80], style: o.style, hairColor: mixColor(o.colors[0].recipe) } })
      else if (where === 'results') {
        const fake: ClientResult[] = [
          { steps: [96, 91, 88, 100], pct: 94, points: 1080, grade: 'perfeito' },
          { steps: [90, 70, 78, 75], pct: 78, points: 880, grade: 'otimo' },
          { steps: [100, 94, 90, 95], pct: 95, points: 1300, grade: 'perfeito' },
        ]
        set({ clientResults: fake, score: 3260, bestStreak: 2 })
        endRound()
      }
    },
  }
})
