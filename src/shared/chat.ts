/**
 * Chat de texto: tipos, transporte plugavel e moderacao basica.
 * Hoje so existe o `LocalTransport` (sem servidor). Para multiplayer, implemente `ChatTransport`
 * (Supabase Realtime, Colyseus...) e troque em `src/state/chatStore.ts` (`setChatTransport`).
 */
export type ChatKind = 'player' | 'system' | 'npc'

export interface ChatMessage {
  id: string
  kind: ChatKind
  author: string
  text: string
  /** epoch ms */
  ts: number
  /** true = enviada pelo jogador local */
  self?: boolean
}

/** Contrato do transporte: `send` publica uma mensagem do jogador; `subscribe` recebe TODAS (inclusive as proprias). */
export interface ChatTransport {
  send(author: string, text: string): void
  subscribe(listener: (m: ChatMessage) => void): () => void
}

export const CHAT_MAX_LENGTH = 140
export const CHAT_MIN_INTERVAL_MS = 1000

let seq = 0
export const newMessageId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`

// ---- filtro de palavroes (lista pequena pt-BR + en; mascara com ***) ----
const BAD = ['porra', 'caralho', 'merda', 'puta', 'puto', 'foda', 'fodase', 'cacete', 'buceta', 'viado', 'arrombada', 'arrombado', 'cuzao', 'otaria', 'otario', 'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'bastard', 'slut', 'whore']

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/0/g, 'o')
    .replace(/[1!]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4|@/g, 'a')
    .replace(/\$|5/g, 's')

/** Mascara palavroes com `***` (comparacao sem acento, com leetspeak simples). */
export function filterProfanity(text: string): string {
  return text.replace(/[\p{L}\p{N}@$!]+/gu, (w) => (BAD.includes(fold(w)) ? '***' : w))
}

/** Normaliza o que o jogador digitou: trim, espacos colapsados, 140 caracteres. */
export function cleanInput(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX_LENGTH)
}

/** Transporte local: ecoa as mensagens do proprio jogador (sem rede). */
export class LocalTransport implements ChatTransport {
  private listeners = new Set<(m: ChatMessage) => void>()
  send(author: string, text: string): void {
    this.emit({ id: newMessageId(), kind: 'player', author, text, ts: Date.now(), self: true })
  }
  subscribe(listener: (m: ChatMessage) => void): () => void {
    this.listeners.add(listener)
    return () => void this.listeners.delete(listener)
  }
  /** injeta mensagem de sistema/NPC (nao faz parte do contrato de rede) */
  emit(m: ChatMessage): void {
    this.listeners.forEach((l) => l(m))
  }
}
