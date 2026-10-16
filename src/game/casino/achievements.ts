import { create } from 'zustand'

/**
 * Conquistas do Lounge de Jogos. Só STATUS: títulos e itens de aparência exclusivos (flags).
 * A economia/guarda-roupa mapeia as flags de `casinoUnlocks()` para itens reais depois.
 * Nada aqui concede fichas, Brilhos ou Diamantes.
 */
const KEY = 'jdb.casino.ach.v1'

export interface Achievement {
  id: string
  name: string
  desc: string
  /** título exibido ao lado do nome (opcional) */
  title?: string
  /** flag de item cosmético exclusivo (opcional) */
  unlock?: string
  unlockLabel?: string
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'bj_win', name: 'Primeira mão', desc: 'Vença uma mão de blackjack.' },
  { id: 'bj_natural', name: 'Vinte e um de primeira', desc: 'Receba um blackjack natural.' },
  { id: 'bj_streak', name: 'Mestra do 21', desc: 'Vença 5 mãos seguidas no blackjack.', title: 'Mestra do 21', unlock: 'casino_velvet_gloves', unlockLabel: 'Luvas de veludo' },
  { id: 'poker_hand', name: 'Na mesa', desc: 'Vença uma mão de pôquer.' },
  { id: 'poker_showdown', name: 'Cartas na mesa', desc: 'Vença um showdown com Full house ou melhor.' },
  { id: 'poker_sng', name: 'Rainha do Poker', desc: 'Vença um torneio Sit & Go.', title: 'Rainha do Poker', unlock: 'casino_crown_pin', unlockLabel: 'Broche de coroa' },
  { id: 'roulette_pleno', name: 'Na mosca', desc: 'Acerte um número cheio na roleta.' },
  { id: 'roulette_3', name: 'Dama da Roleta', desc: 'Acerte 3 números cheios.', title: 'Dama da Roleta', unlock: 'casino_roulette_charm', unlockLabel: 'Pingente de roleta' },
  { id: 'slots_big', name: 'Brilho nos rolos', desc: 'Ganhe 30 vezes a aposta num giro.' },
  { id: 'slots_royal', name: 'Rainha dos Rolos', desc: 'Forme 5 coroas (ou estrelas) numa linha.', title: 'Rainha dos Rolos', unlock: 'casino_slot_clutch', unlockLabel: 'Bolsa clutch dourada' },
  { id: 'rank_1', name: 'Número 1 do Lounge', desc: 'Termine o dia em 1º lugar num ranking do cassino.', title: 'Estrela do Lounge', unlock: 'casino_gold_cufflinks', unlockLabel: 'Abotoaduras douradas' },
]

interface State {
  done: string[]
  title: string
  counters: Record<string, number>
  /** conquistas recém-ganhas (fila para o aviso na tela) */
  fresh: string[]
  award: (id: string) => boolean
  bump: (counter: string, by?: number) => number
  setTitle: (t: string) => void
  takeFresh: () => string[]
}

function load(): Pick<State, 'done' | 'title' | 'counters'> {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<State>
    return {
      done: Array.isArray(s.done) ? s.done.filter((x) => typeof x === 'string') : [],
      title: typeof s.title === 'string' ? s.title : '',
      counters: s.counters && typeof s.counters === 'object' ? s.counters : {},
    }
  } catch {
    return { done: [], title: '', counters: {} }
  }
}
const persist = (s: Pick<State, 'done' | 'title' | 'counters'>) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ done: s.done, title: s.title, counters: s.counters }))
  } catch {
    /* ignora */
  }
}

export const useAchievements = create<State>()((set, get) => ({
  ...load(),
  fresh: [],
  award: (id) => {
    const s = get()
    if (s.done.includes(id)) return false
    const a = ACHIEVEMENTS.find((x) => x.id === id)
    const done = [...s.done, id]
    const title = s.title || a?.title || ''
    persist({ done, title, counters: s.counters })
    set({ done, title, fresh: [...s.fresh, id] })
    return true
  },
  bump: (counter, by = 1) => {
    const s = get()
    const v = (s.counters[counter] ?? 0) + by
    const counters = { ...s.counters, [counter]: v }
    persist({ done: s.done, title: s.title, counters })
    set({ counters })
    return v
  },
  setTitle: (t) => {
    const s = get()
    persist({ done: s.done, title: t, counters: s.counters })
    set({ title: t })
  },
  takeFresh: () => {
    const f = get().fresh
    set({ fresh: [] })
    return f
  },
}))

export const achievementById = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)

/** Títulos já ganhos. */
export const earnedTitles = (): string[] => {
  const done = useAchievements.getState().done
  return ACHIEVEMENTS.filter((a) => a.title && done.includes(a.id)).map((a) => a.title as string)
}

/**
 * Flags de itens cosméticos exclusivos do cassino que a jogadora já desbloqueou
 * (ex.: 'casino_crown_pin'). A economia mapeia essas flags para itens do guarda-roupa.
 */
export function casinoUnlocks(): string[] {
  const done = useAchievements.getState().done
  return ACHIEVEMENTS.filter((a) => a.unlock && done.includes(a.id)).map((a) => a.unlock as string)
}
