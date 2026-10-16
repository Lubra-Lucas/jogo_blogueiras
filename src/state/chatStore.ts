import { create } from 'zustand'
import { CHAT_MIN_INTERVAL_MS, cleanInput, filterProfanity, LocalTransport, newMessageId, type ChatMessage, type ChatTransport } from '../shared/chat'
import { useProfileStore } from './profileStore'

const MAX_KEPT = 120
const BUBBLE_MS = 5000

interface ChatState {
  messages: ChatMessage[]
  unread: number
  /** balao acima do jogador local */
  bubble: { id: string; text: string; until: number } | null
  /** aviso curto do ultimo envio (limite de taxa etc.) */
  notice: string | null
  send: (raw: string) => boolean
  system: (text: string, kind?: 'system' | 'npc', author?: string) => void
  markRead: () => void
}

let transport: ChatTransport = new LocalTransport()
let unsub: (() => void) | null = null
let lastSent = 0

function attach(t: ChatTransport) {
  unsub?.()
  unsub = t.subscribe((m) => {
    useChatStore.setState((s) => ({
      messages: [...s.messages, m].slice(-MAX_KEPT),
      unread: s.unread + 1,
      bubble: m.self ? { id: m.id, text: m.text, until: performance.now() + BUBBLE_MS } : s.bubble,
    }))
  })
}

/** Troca o transporte (ex.: Supabase Realtime). As mensagens ja exibidas permanecem. */
export function setChatTransport(t: ChatTransport) {
  transport = t
  attach(t)
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  unread: 0,
  bubble: null,
  notice: null,
  send: (raw) => {
    const text = cleanInput(raw)
    if (!text) return false
    const now = performance.now()
    if (now - lastSent < CHAT_MIN_INTERVAL_MS) {
      set({ notice: 'Calma, uma mensagem por segundo.' })
      return false
    }
    lastSent = now
    set({ notice: null })
    const name = useProfileStore.getState().name
    transport.send(name, filterProfanity(text))
    if (/\b(oi|ola|hey|eae|bom dia|boa tarde|boa noite)\b/.test(text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))) {
      window.setTimeout(() => get().system('Oi, linda! Aproveite a cidade e passe na Avenida da Moda!', 'npc', 'Lola'), 1200)
    }
    return true
  },
  system: (text, kind = 'system', author = 'Cidade') => {
    const m: ChatMessage = { id: newMessageId(), kind, author, text, ts: Date.now() }
    // mensagens locais (sistema/NPC) entram pelo mesmo caminho do transporte local
    if (transport instanceof LocalTransport) transport.emit(m)
    else set((s) => ({ messages: [...s.messages, m].slice(-MAX_KEPT), unread: s.unread + 1 }))
  },
  markRead: () => set({ unread: 0 }),
}))

attach(transport)
