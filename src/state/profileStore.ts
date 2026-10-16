import { create } from 'zustand'
import { loadJson, saveJson, STORAGE_KEYS } from '../shared/storage'
import { QUESTS } from './quests'

/** Nome da moeda do jogo (troque aqui para renomear em toda a UI). */
export const CURRENCY_NAME = 'Brilhos'

export const PROFESSIONS = ['Barista', 'Cabeleireira', 'Fotógrafa', 'Modelo', 'Estilista'] as const
export const NO_PROFESSION = 'Sem profissão'

/** XP necessario para sair do nivel `level` para o proximo. */
export function xpToNext(level: number): number {
  return Math.round(80 + 45 * Math.pow(level - 1, 1.5))
}

/** Titulo de fama por nivel. */
export function fameTitle(level: number): string {
  if (level >= 25) return 'Ícone'
  if (level >= 16) return 'Celebridade'
  if (level >= 11) return 'It Girl'
  if (level >= 7) return 'Blogueira'
  if (level >= 4) return 'Micro-influencer'
  if (level >= 2) return 'Iniciante'
  return 'Anônima'
}

export interface Toast {
  id: number
  kind: 'xp' | 'level' | 'quest'
  text: string
  sub?: string
}

interface Saved {
  v: 1
  name: string
  named: boolean
  level: number
  xp: number
  coins: number
  profession: string | null
  status: string
  visited: string[]
  done: string[]
}

const DEFAULTS: Saved = {
  v: 1,
  name: 'Blogueira',
  named: false,
  level: 1,
  xp: 0,
  coins: 50,
  profession: null,
  status: 'Pronta para brilhar ✨',
  visited: [],
  done: [],
}

function load(): Saved {
  const s = loadJson<Partial<Saved>>(STORAGE_KEYS.profile)
  if (!s || s.v !== 1) return { ...DEFAULTS }
  return {
    ...DEFAULTS,
    ...s,
    name: typeof s.name === 'string' && s.name.trim() ? s.name.slice(0, 20) : DEFAULTS.name,
    level: Math.max(1, Math.floor(Number(s.level) || 1)),
    xp: Math.max(0, Number(s.xp) || 0),
    coins: Math.max(0, Math.floor(Number(s.coins) || 0)),
    visited: Array.isArray(s.visited) ? s.visited.filter((x) => typeof x === 'string') : [],
    done: Array.isArray(s.done) ? s.done.filter((x) => typeof x === 'string') : [],
  }
}

interface ProfileState extends Saved {
  toast: Toast | null
  setName: (n: string) => void
  setStatus: (s: string) => void
  addXp: (n: number) => void
  addCoins: (n: number) => void
  /** registra que o jogador esteve numa area (id do `locate`); conclui missoes de visita */
  visit: (areaId: string) => void
  reset: () => void
}

let toastId = 0
const persist = (s: ProfileState) => {
  const { v, name, named, level, xp, coins, profession, status, visited, done } = s
  saveJson(STORAGE_KEYS.profile, { v, name, named, level, xp, coins, profession, status, visited, done })
}

export const useProfileStore = create<ProfileState>()((set, get) => ({
  ...load(),
  toast: null,
  setName: (n) => {
    const name = n.replace(/\s+/g, ' ').trim().slice(0, 20) || DEFAULTS.name
    set({ name, named: true })
    persist(get())
  },
  setStatus: (s) => {
    set({ status: s.slice(0, 60) })
    persist(get())
  },
  addXp: (n) => {
    let { level, xp } = get()
    const before = level
    xp += n
    while (xp >= xpToNext(level)) {
      xp -= xpToNext(level)
      level++
    }
    set({ level, xp, toast: level > before ? { id: ++toastId, kind: 'level', text: `Nível ${level}!`, sub: fameTitle(level) } : get().toast })
    persist(get())
  },
  addCoins: (n) => {
    set({ coins: Math.max(0, get().coins + n) })
    persist(get())
  },
  visit: (areaId) => {
    const s = get()
    if (!s.visited.includes(areaId)) set({ visited: [...s.visited, areaId] })
    for (const q of QUESTS) {
      if (q.visit !== areaId || get().done.includes(q.id)) continue
      set({ done: [...get().done, q.id], toast: { id: ++toastId, kind: 'quest', text: `Missão concluída: ${q.title}`, sub: `+${q.xp} XP · +${q.coins} ${CURRENCY_NAME}` } })
      get().addCoins(q.coins)
      get().addXp(q.xp)
      // se subiu de nivel o aviso de nivel substitui o da missao
    }
    persist(get())
  },
  reset: () => {
    set({ ...DEFAULTS, toast: null })
    persist(get())
  },
}))
