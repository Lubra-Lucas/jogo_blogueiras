import { create } from 'zustand'
import { intent } from '../../input/intent'
import { useSitStore } from '../../sit/sitStore'
import type { ClipName } from './animator'

/** Emotes: `id` -> clipe, rotulo (PT-BR), categoria do menu e tecla de atalho (1-9; '' = so pelo menu). */
export type EmoteId = 'wave' | 'kiss' | 'bow' | 'point' | 'thankful' | 'clap' | 'laugh' | 'cry' | 'jump' | 'dance' | 'desfile' | 'texting'
export type EmoteCategory = 'social' | 'reacoes' | 'diversao'

export interface EmoteDef {
  id: EmoteId
  label: string
  /** frase do aviso ao ativar */
  toast: string
  key: string
  icon: string
  cat: EmoteCategory
  clip: ClipName
  /** 'loop' repete ate andar/escolher outro; 'once' toca uma vez e volta ao idle */
  mode: 'once' | 'loop'
}

export const CATEGORY_LABEL: Record<EmoteCategory, string> = { social: 'Social', reacoes: 'Reações', diversao: 'Diversão' }

export const EMOTES: readonly EmoteDef[] = [
  { id: 'wave', label: 'Acenar', toast: 'Acenando!', key: '5', icon: '👋', cat: 'social', clip: 'wave', mode: 'once' },
  { id: 'kiss', label: 'Beijo', toast: 'Mandando um beijo!', key: '6', icon: '😘', cat: 'social', clip: 'kiss', mode: 'once' },
  { id: 'bow', label: 'Reverência', toast: 'Reverência!', key: '8', icon: '🙇‍♀️', cat: 'social', clip: 'bow', mode: 'once' },
  { id: 'point', label: 'Apontar', toast: 'Apontando!', key: '', icon: '👉', cat: 'social', clip: 'point', mode: 'once' },
  { id: 'thankful', label: 'Agradecer', toast: 'Agradecendo!', key: '9', icon: '🙏', cat: 'social', clip: 'thankful', mode: 'once' },
  { id: 'clap', label: 'Aplaudir', toast: 'Aplaudindo!', key: '1', icon: '👏', cat: 'reacoes', clip: 'clap', mode: 'loop' },
  { id: 'laugh', label: 'Rir', toast: 'Rindo!', key: '7', icon: '😂', cat: 'reacoes', clip: 'laugh', mode: 'once' },
  { id: 'cry', label: 'Chorar', toast: 'Chorando...', key: '', icon: '😭', cat: 'reacoes', clip: 'cry', mode: 'once' },
  { id: 'jump', label: 'Pular', toast: 'Pulando!', key: '4', icon: '🦘', cat: 'diversao', clip: 'jump', mode: 'once' },
  { id: 'dance', label: 'Dançar', toast: 'Dançando!', key: '3', icon: '🎶', cat: 'diversao', clip: 'dance_twerk', mode: 'loop' },
  { id: 'desfile', label: 'Desfilar', toast: 'Desfilando!', key: '2', icon: '💃', cat: 'diversao', clip: 'desfile', mode: 'loop' },
  { id: 'texting', label: 'Celular', toast: 'No celular...', key: '', icon: '📱', cat: 'diversao', clip: 'texting', mode: 'loop' },
]
export const EMOTE_BY_ID: Record<EmoteId, EmoteDef> = Object.fromEntries(EMOTES.map((e) => [e.id, e])) as Record<EmoteId, EmoteDef>

interface EmoteState {
  /** emote em andamento (andar cancela; os de `mode: 'once'` terminam sozinhos) */
  emote: Exclude<EmoteId, 'desfile'> | null
  /** tocar uma vez mesmo que seja de loop (ex.: reacao de chat, `playEmote(id, { once: true })`) */
  emoteOnce: boolean
  /** modo desfile: quem anda usa o passo de passarela; fica ligado ate desligar */
  desfile: boolean
  /** digitando no chat: pose do celular */
  typing: boolean
  toast: { id: number; text: string } | null
  trigger: (id: EmoteId, opts?: { once?: boolean; silent?: boolean }) => void
  stop: () => void
}

let toastId = 0
const say = (text: string) => ({ id: ++toastId, text })

export const useEmoteStore = create<EmoteState>()((set, get) => ({
  emote: null,
  emoteOnce: false,
  desfile: false,
  typing: false,
  toast: null,
  trigger: (id, opts) => {
    const s = get()
    const def = EMOTE_BY_ID[id]
    const silent = opts?.silent
    if (useSitStore.getState().seat) {
      if (!silent) set({ toast: say('Levante-se para fazer um emote') })
      return
    }
    if (id === 'desfile') {
      const on = !s.desfile
      set({ desfile: on, emote: null, toast: silent ? s.toast : say(on ? 'Desfilando! (2 para parar)' : 'Desfile desligado') })
      return
    }
    if (s.emote === id && def.mode === 'loop') {
      set({ emote: null, toast: silent ? s.toast : say('Emote encerrado') })
      return
    }
    const moving = intent.move.x !== 0 || intent.move.y !== 0 || intent.target !== null
    if (moving) {
      if (!silent) set({ toast: say('Pare de andar para fazer um emote') })
      return
    }
    set({ emote: id as Exclude<EmoteId, 'desfile'>, emoteOnce: !!opts?.once, desfile: false, toast: silent ? s.toast : say(def.toast) })
  },
  stop: () => {
    if (get().emote) set({ emote: null })
  },
}))

// ------------------------------------------------------------------ API estavel (jogo, chat, minigames)

/** Toca um emote no personagem do jogador. `once`: toca uma vez e volta ao idle (mesmo os de loop). */
export function playEmote(id: EmoteId, opts?: { once?: boolean; silent?: boolean }) {
  useEmoteStore.getState().trigger(id, opts)
}

export function stopEmote() {
  useEmoteStore.getState().stop()
}

/** Pose do celular enquanto o campo do chat esta em foco (parada). */
export function setTypingPose(on: boolean) {
  if (useEmoteStore.getState().typing !== on) useEmoteStore.setState({ typing: on })
}

const REACTIONS: { re: RegExp; id: EmoteId }[] = [
  { re: /\b(oi+|ol[aá]+|oie+)\b/i, id: 'wave' },
  { re: /(k{3,}|\bk{2,}\b|ha(ha)+|\brs+\b|rsrs|😂|🤣)/i, id: 'laugh' },
  { re: /(obrigad|\bvaleu\b|\bvlw\b)/i, id: 'thankful' },
  { re: /(beijo|\bbjs?\b|😘)/i, id: 'kiss' },
  { re: /(:\(|triste|chorando|😢|😭)/i, id: 'cry' },
]
let lastReact = 0

/**
 * Reacao do personagem a uma mensagem de chat ENVIADA pelo jogador local (oi -> acena, kkk -> ri, obrigada -> agradece,
 * beijo -> beijo, triste -> chora). Chame uma vez por mensagem enviada. Nao interrompe quem esta andando/sentada
 * e tem intervalo minimo de 3 s. Retorna o emote tocado (ou null).
 */
export function reactToChatMessage(text: string): EmoteId | null {
  const now = performance.now()
  if (now - lastReact < 3000) return null
  const hit = REACTIONS.find((r) => r.re.test(text))
  if (!hit) return null
  useEmoteStore.getState().trigger(hit.id, { once: true, silent: true })
  const after = useEmoteStore.getState().emote
  if (after !== hit.id) return null
  lastReact = now
  return hit.id
}

/** Hook de conveniencia para a UI/chat: mesma API em um objeto. */
export function useEmoteTriggers() {
  return { playEmote, stopEmote, reactToChatMessage, setTypingPose }
}
