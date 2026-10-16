import { create } from 'zustand'
import { playSfx } from '../audio'
import { getProfessionXp, grantRewards } from '../rewards'
import { dailySeed, submitScore, type Difficulty, type Entry } from '../shared/competition'
import { useProfileStore } from '../../../state/profileStore'
import {
  TYPICAL, clearSlot, computeResults, createState, deliverNow, drainSounds, dropHand, grab, joalheiraLevel,
  newUnlocks, placeHand, polishHand, setPhase, startRound, tick,
  type JoiaState, type Results,
} from './logic'

const BEST_KEY = 'jdb.joia.best'
const TUTORIAL_KEY = 'jdb.joia.tutorialDone'
const DIFF_KEY = 'jdb.joia.difficulty'
export const TUTORIAL_STEPS = 3
export const PROFESSION = 'Joalheira'

function readStr(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function writeStr(key: string, v: string) {
  try {
    localStorage.setItem(key, v)
  } catch {
    /* ignora */
  }
}
const bestKey = (d: Difficulty) => `${BEST_KEY}.${d}`

/** Dev: ?jlevel=N força o nível de joalheira (para ver os desbloqueios). */
function devLevel(): number | undefined {
  if (!import.meta.env.DEV && !window.location.search.includes('jdebug')) return undefined
  const v = Number(new URLSearchParams(window.location.search).get('jlevel'))
  return v >= 1 && v <= 10 ? v : undefined
}

function playerName(): string {
  try {
    return useProfileStore.getState().name || 'Você'
  } catch {
    return 'Você'
  }
}

interface JoiaStore {
  s: JoiaState
  results: Results | null
  board: Entry[]
  rank: number
  best: number
  newBest: boolean
  unlockedNow: string[]
  levelAfter: number
  tutorial: number | null
  difficulty: Difficulty
  daily: boolean

  enter: () => void
  setDifficulty: (d: Difficulty) => void
  setDaily: (v: boolean) => void
  start: () => void
  step: (dt: number) => void
  grab: (id: number) => void
  drop: () => void
  place: (slot: number) => void
  clear: (slot: number) => void
  polish: () => void
  deliver: () => void
  pause: () => void
  resume: () => void
  nextTutorial: () => void
  showTutorial: () => void
}

type Set = (p: Partial<JoiaStore>) => void

function commit(set: Set, next: JoiaState) {
  const { state, sounds } = drainSounds(next)
  for (const id of sounds) playSfx(id)
  set({ s: state })
}

function finish(set: Set, get: () => JoiaStore, final: JoiaState) {
  const results = computeResults(final)
  const prevXp = getProfessionXp(PROFESSION)
  const prevLevel = final.level
  const d = final.difficulty
  const prevBest = Number(readStr(bestKey(d))) || 0
  const newBest = results.score > prevBest
  if (newBest) writeStr(bestKey(d), String(results.score))
  grantRewards({ coins: results.coins, xp: results.xp, professionXp: { [PROFESSION]: results.joiaXp } })
  const levelAfter = Math.max(devLevel() ?? 1, joalheiraLevel(prevXp + results.joiaXp))
  const unlocked = newUnlocks(prevLevel, levelAfter).map((u) => `${u.name}`)
  const { board, rank } = submitScore('joia', d, results.score, TYPICAL[d], playerName())
  commit(set, final)
  set({ results, board, rank, newBest, best: Math.max(prevBest, results.score), unlockedNow: unlocked, levelAfter })
  void get
}

const fresh = (d: Difficulty, daily: boolean, seed?: number) => {
  const sd = seed ?? (daily ? dailySeed('joia') : (Date.now() ^ 0x9e3779b9) >>> 0)
  const lvl = devLevel()
  return createState(sd, getProfessionXp(PROFESSION), d, daily, lvl)
}

export const useJoiaStore = create<JoiaStore>()((set, get) => ({
  s: createState(1, 0),
  results: null,
  board: [],
  rank: 0,
  best: 0,
  newBest: false,
  unlockedNow: [],
  levelAfter: 1,
  tutorial: null,
  difficulty: 'normal',
  daily: false,

  enter: () => {
    const saved = readStr(DIFF_KEY) as Difficulty | null
    const d: Difficulty = saved && ['facil', 'normal', 'dificil', 'estrela'].includes(saved) ? saved : 'normal'
    set({ s: fresh(d, false), difficulty: d, daily: false, results: null, tutorial: null, best: Number(readStr(bestKey(d))) || 0 })
  },
  setDifficulty: (d) => {
    writeStr(DIFF_KEY, d)
    set({ difficulty: d, s: fresh(d, get().daily), best: Number(readStr(bestKey(d))) || 0 })
  },
  setDaily: (v) => set({ daily: v, s: fresh(get().difficulty, v) }),

  start: () => {
    const { difficulty, daily } = get()
    // nova partida: pedidos novos (ou os do dia)
    const next = startRound(fresh(difficulty, daily))
    const seen = readStr(TUTORIAL_KEY) === '1'
    commit(set, seen ? next : setPhase(next, 'paused'))
    set({ results: null, newBest: false, unlockedNow: [], tutorial: seen ? null : 0, best: Number(readStr(bestKey(difficulty))) || 0 })
  },

  step: (dt) => {
    const cur = get().s
    if (cur.phase !== 'playing') return
    const next = tick(cur, dt)
    if (next.phase === 'done') finish(set, get, next)
    else commit(set, next)
  },

  grab: (id) => commit(set, grab(get().s, id)),
  drop: () => commit(set, dropHand(get().s)),
  place: (slot) => {
    const next = placeHand(get().s, slot)
    if (next.phase === 'done') finish(set, get, next)
    else commit(set, next)
  },
  clear: (slot) => commit(set, clearSlot(get().s, slot)),
  polish: () => commit(set, polishHand(get().s)),
  deliver: () => {
    const next = deliverNow(get().s)
    if (next.phase === 'done') finish(set, get, next)
    else commit(set, next)
  },
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
      const cur = get().s
      set({ tutorial: null, s: cur.phase === 'paused' ? setPhase(cur, 'playing') : cur })
    } else set({ tutorial: t + 1 })
  },
  showTutorial: () => {
    if (get().s.phase === 'playing') set({ s: setPhase(get().s, 'paused') })
    set({ tutorial: 0 })
  },
}))

// dev: window.__joia para testes manuais
if (import.meta.env.DEV || window.location.search.includes('jdebug')) (window as unknown as { __joia?: unknown }).__joia = useJoiaStore
