import { create } from 'zustand'
import type { GameId } from '../../../game/casino/chips'
import type { Difficulty } from '../../../game/minigames/shared/competition'

export type Screen = 'lobby' | GameId

const DIFF_KEY = 'jdb.casino.diff'
const SEEN_KEY = 'jdb.casino.seen'

const loadDiff = (): Difficulty => {
  try {
    const v = localStorage.getItem(DIFF_KEY)
    if (v === 'facil' || v === 'normal' || v === 'dificil' || v === 'estrela') return v
  } catch {
    /* ignora */
  }
  return 'normal'
}
const loadSeen = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

interface CzState {
  screen: Screen
  focus: Screen
  difficulty: Difficulty
  help: GameId | null
  seen: string[]
  rankOpen: boolean
  setScreen: (s: Screen) => void
  setFocus: (s: Screen) => void
  setDifficulty: (d: Difficulty) => void
  openHelp: (g: GameId) => void
  closeHelp: () => void
  setRankOpen: (v: boolean) => void
}

export const useCz = create<CzState>()((set, get) => ({
  screen: 'lobby',
  focus: 'lobby',
  difficulty: loadDiff(),
  help: null,
  seen: loadSeen(),
  rankOpen: false,
  setScreen: (screen) => {
    set({ screen, focus: screen })
    // primeira vez em cada jogo: abre o "Como jogar" sozinho
    if (screen !== 'lobby' && !get().seen.includes(screen)) set({ help: screen })
  },
  setFocus: (focus) => set({ focus }),
  setDifficulty: (difficulty) => {
    try {
      localStorage.setItem(DIFF_KEY, difficulty)
    } catch {
      /* ignora */
    }
    set({ difficulty })
  },
  openHelp: (help) => set({ help }),
  closeHelp: () => {
    const h = get().help
    if (!h) return
    const seen = get().seen.includes(h) ? get().seen : [...get().seen, h]
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen))
    } catch {
      /* ignora */
    }
    set({ help: null, seen })
  },
  setRankOpen: (rankOpen) => set({ rankOpen }),
}))
