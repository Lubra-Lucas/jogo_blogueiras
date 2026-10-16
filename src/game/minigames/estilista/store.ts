import { create } from 'zustand'
import { useProfileStore } from '../../../state/profileStore'
import { getProfessionXp, grantRewards } from '../rewards'
import { dailySeed, submitScore, type Difficulty, type Entry } from '../shared/competition'
import type { Look } from '../desfile/types'
import { makeClients } from './clients'
import {
  comboMult, evaluate, newlyUnlocked, rewardsFor, roundStats, testimonial, tierOf, TYPICAL_POINTS, VIP_TIER,
} from './logic'
import type { CatalogItem } from '../desfile/types'
import type { Client, ClientResult, Evaluation, QuestionId } from './types'

export type Phase = 'intro' | 'brief' | 'style' | 'react' | 'results'
export type Mode = 'daily' | 'free'

export interface RoundSummary {
  avg: number
  stars: number
  points: number
  bestCombo: number
  rewards: { coins: number; xp: number; professionXp: number }
  board: Entry[] | null
  rank: number
  newBest: boolean
  unlocked: CatalogItem[]
  tierUp: boolean
}

interface State {
  phase: Phase
  difficulty: Difficulty
  mode: Mode
  clients: Client[]
  idx: number
  look: Look
  asked: QuestionId | null
  /** instante (performance.now) em que acaba o tempo desta cliente */
  endsAt: number
  pausedLeft: number | null
  combo: number
  results: ClientResult[]
  summary: RoundSummary | null
  /** XP da profissão no início da rodada (define estoque e VIP) */
  xp0: number

  setDifficulty: (d: Difficulty) => void
  setMode: (m: Mode) => void
  start: () => void
  beginStyling: () => void
  ask: (q: QuestionId) => void
  patchLook: (p: Partial<Look>) => void
  togglePause: () => void
  submit: (timedOut?: boolean) => void
  next: () => void
  reset: () => void
}

const TUT_KEY = 'jdb.estilista.tut'
export const tutorialSeen = (): boolean => {
  try {
    return localStorage.getItem(TUT_KEY) === '1'
  } catch {
    return true
  }
}
export const markTutorialSeen = () => {
  try {
    localStorage.setItem(TUT_KEY, '1')
  } catch {
    /* ignora */
  }
}

const emptyLook = (): Look => ({
  hairId: null, hairColor: '#3a2417', top: null, bottom: null, dress: null, jewelry: [], accessories: [],
  suitColor: '#efe6d6', suitFinish: 'satin', lipsColor: '#a8566e', lipsGloss: 0.5,
})

export const useEstilistaStore = create<State>()((set, get) => ({
  phase: 'intro',
  difficulty: 'normal',
  mode: 'daily',
  clients: [],
  idx: 0,
  look: emptyLook(),
  asked: null,
  endsAt: 0,
  pausedLeft: null,
  combo: 0,
  results: [],
  summary: null,
  xp0: 0,

  setDifficulty: (difficulty) => set({ difficulty }),
  setMode: (mode) => set({ mode }),
  start: () => {
    const { difficulty, mode } = get()
    const xp0 = getProfessionXp('Estilista')
    const seed = mode === 'daily' ? dailySeed(`estilista:${difficulty}`) : (Math.random() * 4294967296) >>> 0
    const clients = makeClients(seed, difficulty, tierOf(xp0) >= VIP_TIER)
    set({ phase: 'brief', clients, idx: 0, look: clients[0].look0, asked: null, combo: 0, results: [], summary: null, xp0, pausedLeft: null })
  },
  beginStyling: () => {
    const c = get().clients[get().idx]
    set({ phase: 'style', endsAt: performance.now() + c.timeLimit * 1000, pausedLeft: null })
  },
  ask: (q) => {
    if (!get().asked) set({ asked: q })
  },
  patchLook: (p) => set({ look: { ...get().look, ...p } }),
  togglePause: () => {
    const s = get()
    if (s.phase !== 'style') return
    if (s.pausedLeft === null) set({ pausedLeft: Math.max(0, s.endsAt - performance.now()) })
    else set({ endsAt: performance.now() + (s.pausedLeft ?? 0), pausedLeft: null })
  },
  submit: (timedOut = false) => {
    const s = get()
    if (s.phase !== 'style') return
    const client = s.clients[s.idx]
    const left = s.pausedLeft ?? Math.max(0, s.endsAt - performance.now())
    const ev: Evaluation = evaluate(client, s.look, timedOut ? 0 : left / (client.timeLimit * 1000))
    const combo = ev.mood === 'happy' ? s.combo + 1 : 0
    // combo vale para o próximo acerto: multiplicador usa os acertos consecutivos ANTES desta cliente
    const points = Math.round(ev.total * comboMult(s.combo))
    const res: ClientResult = {
      client, look: s.look, eval: ev, points, comboAt: combo, asked: s.asked,
      quote: testimonial(client, ev, s.idx + ev.total), timedOut,
    }
    set({ phase: 'react', results: [...s.results, res], combo })
  },
  next: () => {
    const s = get()
    if (s.idx + 1 < s.clients.length) {
      const c = s.clients[s.idx + 1]
      set({ phase: 'brief', idx: s.idx + 1, look: c.look0, asked: null })
      return
    }
    const st = roundStats(s.results)
    const rewards = rewardsFor(st.stars, st.avg, st.bestCombo, s.difficulty)
    grantRewards({ coins: rewards.coins, xp: rewards.xp, professionXp: { Estilista: rewards.professionXp } })
    const xp1 = getProfessionXp('Estilista')
    const unlocked = newlyUnlocked(s.xp0, Math.max(xp1, s.xp0 + rewards.professionXp))
    let board: Entry[] | null = null
    let rank = 0
    let newBest = false
    if (s.mode === 'daily') {
      const name = useProfileStore.getState().name
      const r = submitScore('estilista', s.difficulty, st.points, TYPICAL_POINTS[s.difficulty], name)
      board = r.board
      rank = r.rank
      newBest = r.newBest
    }
    set({
      phase: 'results',
      summary: { ...st, rewards, board, rank, newBest, unlocked, tierUp: tierOf(s.xp0 + rewards.professionXp) > tierOf(s.xp0) },
    })
  },
  reset: () => set({ phase: 'intro', summary: null, results: [], clients: [], idx: 0, asked: null, combo: 0, pausedLeft: null }),
}))
