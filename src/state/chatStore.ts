import { create } from 'zustand'
import { CHAT_MIN_INTERVAL_MS, cleanInput, filterProfanity, LocalTransport, newMessageId, type ChatMessage, type ChatTransport } from '../shared/chat'
import { useProfileStore } from './profileStore'
import { reactToChatMessage } from '../game/character/animation/emoteStore'

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
    const filtered = filterProfanity(text)
    transport.send(name, filtered)
    reactToChatMessage(filtered)
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

// ---- "jogadoras" ambientes (so local; some quando houver transporte real) ----
const AMBIENT_NAMES = ['Mimi', 'Duda', 'Cacau', 'Bia Glam', 'Nina Rosa', 'Lolita']
const AMBIENT_LINES = [
  'Alguém viu a vitrine nova da Avenida da Moda?',
  'Esse pôr do sol hoje está lindo',
  'Procurando uma foto bonita no centro, me acompanha?',
  'Acabei de tomar um café delicioso no Café Rosé',
  'Quem vai no desfile hoje?',
  'Adorei o look da moça de rosa',
  'Passei no parque, o lago está tranquilo',
  'Boa noite, blogueiras!',
  'Estou montando um look romântico, dicas?',
  'Esse chão da praça é tão bonito',
  'Bom dia, cidade!',
  'Vou dar uma volta no Boulevard',
]
let ambientTimer = 0
function scheduleAmbient(first: boolean) {
  const delay = first ? 14000 + Math.random() * 8000 : 30000 + Math.random() * 40000
  ambientTimer = window.setTimeout(() => {
    if (transport instanceof LocalTransport) {
      const name = AMBIENT_NAMES[Math.floor(Math.random() * AMBIENT_NAMES.length)]
      const line = AMBIENT_LINES[Math.floor(Math.random() * AMBIENT_LINES.length)]
      useChatStore.getState().system(line, 'npc', name)
    }
    scheduleAmbient(false)
  }, delay)
}
if (!ambientTimer) scheduleAmbient(true)
