import { create } from 'zustand'
import { playSfx } from '../audio'
import { getProfessionXp, grantRewards } from '../rewards'
import { ingredientName } from './data'
import {
  addIngredient, baristaLevel, computeResults, createState, drainSounds, newUnlocks, serve, setPhase,
  startRound, tick, trashTray,
  type CafeState, type Ingredient, type Results,
} from './logic'

const BEST_KEY = 'jdb.cafe.best'
const TUTORIAL_KEY = 'jdb.cafe.tutorialDone'
export const TUTORIAL_STEPS = 3

function readNum(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}
function writeStr(key: string, v: string) {
  try {
    localStorage.setItem(key, v)
  } catch {
    /* ignora */
  }
}

interface CafeStore {
  s: CafeState
  results: Results | null
  best: number
  newBest: boolean
  /** nomes dos ingredientes liberados pela rodada que acabou */
  unlockedNow: string[]
  levelAfter: number
  /** passo do tutorial (0..2) ou null */
  tutorial: number | null

  enter: () => void
  start: () => void
  step: (dt: number) => void
  ingredient: (i: Ingredient) => void
  trash: () => void
  serve: (slot: number) => void
  pause: () => void
  resume: () => void
  nextTutorial: () => void
}

function commit(set: (p: Partial<CafeStore>) => void, next: CafeState) {
  const { state, sounds } = drainSounds(next)
  for (const id of sounds) playSfx(id)
  set({ s: state })
}

function finish(set: (p: Partial<CafeStore>) => void, final: CafeState) {
  const prevLevel = final.level
  const results = computeResults(final)
  const prevBest = readNum(BEST_KEY)
  const newBest = results.score > prevBest
  if (newBest) writeStr(BEST_KEY, String(results.score))
  grantRewards({ coins: results.coins, xp: results.xp, professionXp: { Barista: results.baristaXp } })
  const levelAfter = baristaLevel(getProfessionXp('Barista'))
  const unlockedNow = newUnlocks(prevLevel, levelAfter).map((u) => ingredientName(u.kind, u.id))
  commit(set, final)
  set({ results, newBest, best: Math.max(prevBest, results.score), unlockedNow, levelAfter })
}

export const useCafeStore = create<CafeStore>()((set, get) => ({
  s: createState(1, 0),
  results: null,
  best: 0,
  newBest: false,
  unlockedNow: [],
  levelAfter: 1,
  tutorial: null,

  /** Abre a tela inicial (le nivel de Barista e recorde). */
  enter: () => {
    set({
      s: createState((Date.now() ^ 0x9e3779b9) >>> 0, getProfessionXp('Barista')),
      results: null,
      newBest: false,
      unlockedNow: [],
      tutorial: null,
      best: readNum(BEST_KEY),
    })
  },

  start: () => {
    const seed = (Date.now() ^ (get().s.rng * 31)) >>> 0
    const next = startRound(createState(seed, getProfessionXp('Barista')), seed)
    const seen = readNum(TUTORIAL_KEY) === 1
    commit(set, seen ? next : setPhase(next, 'paused'))
    set({ results: null, newBest: false, unlockedNow: [], tutorial: seen ? null : 0, best: readNum(BEST_KEY) })
  },

  step: (dt) => {
    const cur = get().s
    if (cur.phase !== 'playing') return
    const next = tick(cur, dt)
    if (next.phase === 'done') finish(set, next)
    else commit(set, next)
  },

  ingredient: (i) => commit(set, addIngredient(get().s, i)),
  trash: () => commit(set, trashTray(get().s)),
  serve: (slot) => commit(set, serve(get().s, slot)),
  pause: () => {
    if (get().s.phase === 'playing') set({ s: setPhase(get().s, 'paused') })
  },
  resume: () => {
    if (get().s.phase === 'paused' && get().tutorial === null) set({ s: setPhase(get().s, 'playing') })
  },
  nextTutorial: () => {
    const t = get().tutorial
    if (t === null) return
    if (t + 1 >= TUTORIAL_STEPS) {
      writeStr(TUTORIAL_KEY, '1')
      set({ tutorial: null, s: setPhase(get().s, 'playing') })
    } else set({ tutorial: t + 1 })
  },
}))
