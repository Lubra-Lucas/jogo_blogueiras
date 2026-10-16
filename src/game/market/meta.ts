import { create } from 'zustand'
import { loadJson, saveJson } from '../../shared/storage'
import { STORAGE } from './cfg.ts'

/** Notificacoes, favoritos e noticias do mercado (apenas deste aparelho; num servidor viram push/inbox). */
export interface MarketNote {
  id: number
  t: number
  kind: 'venda' | 'oferta' | 'preco' | 'noticia' | 'sistema'
  text: string
  editionId?: string
  read: boolean
}

export interface TradeLog {
  t: number
  side: 'compra' | 'venda'
  editionId: string
  serial: number
  price: number
  /** taxa paga (vendas) */
  fee: number
}

interface MetaSave {
  v: 1
  notes: MarketNote[]
  log: TradeLog[]
  watch: string[]
  lastNotifiedP: Record<string, number>
  seenIntro: boolean
}
interface MetaState extends MetaSave {
  push: (kind: MarketNote['kind'], text: string, editionId?: string) => void
  addLog: (l: TradeLog) => void
  markAllRead: () => void
  toggleWatch: (id: string) => void
  setNotified: (id: string, p: number) => void
  setIntroSeen: () => void
}

const saved = loadJson<Partial<MetaSave>>(STORAGE.meta)
let nid = Date.now()
const persist = (s: MetaState) => saveJson(STORAGE.meta, { v: 1, notes: s.notes, log: s.log, watch: s.watch, lastNotifiedP: s.lastNotifiedP, seenIntro: s.seenIntro })

export const useMarketMeta = create<MetaState>()((set, get) => ({
  v: 1,
  notes: Array.isArray(saved?.notes) ? saved.notes.slice(0, 40) : [],
  log: Array.isArray(saved?.log) ? saved.log.slice(0, 80) : [],
  watch: Array.isArray(saved?.watch) ? saved.watch : [],
  lastNotifiedP: saved?.lastNotifiedP ?? {},
  seenIntro: !!saved?.seenIntro,
  push: (kind, text, editionId) => {
    set({ notes: [{ id: ++nid, t: Date.now(), kind, text, editionId, read: false }, ...get().notes].slice(0, 40) })
    persist(get())
  },
  addLog: (l) => {
    set({ log: [l, ...get().log].slice(0, 80) })
    persist(get())
  },
  markAllRead: () => {
    set({ notes: get().notes.map((n) => ({ ...n, read: true })) })
    persist(get())
  },
  toggleWatch: (id) => {
    const w = get().watch
    set({ watch: w.includes(id) ? w.filter((x) => x !== id) : [...w, id] })
    persist(get())
  },
  setNotified: (id, p) => {
    set({ lastNotifiedP: { ...get().lastNotifiedP, [id]: p } })
    persist(get())
  },
  setIntroSeen: () => {
    set({ seenIntro: true })
    persist(get())
  },
}))
