import { create } from 'zustand'
import { intent } from '../../input/intent'
import { useSitStore } from '../../sit/sitStore'

/** Emotes disponiveis: `id` -> clipe, rotulo (PT-BR) e tecla de atalho. */
export type EmoteId = 'clap' | 'desfile' | 'dance' | 'jump'

export interface EmoteDef {
  id: EmoteId
  label: string
  /** frase do aviso ao ativar */
  toast: string
  key: string
  icon: string
}

export const EMOTES: readonly EmoteDef[] = [
  { id: 'clap', label: 'Aplaudir', toast: 'Aplaudindo!', key: '1', icon: '👏' },
  { id: 'desfile', label: 'Desfilar', toast: 'Desfilando!', key: '2', icon: '💃' },
  { id: 'dance', label: 'Dançar', toast: 'Dançando!', key: '3', icon: '🎶' },
  { id: 'jump', label: 'Pular', toast: 'Pulando!', key: '4', icon: '🦘' },
]

interface EmoteState {
  /** emote em loop em andamento (aplaudir/dancar); andar cancela */
  emote: 'clap' | 'dance' | 'jump' | null
  /** modo desfile: quem anda usa o passo de passarela; fica ligado ate desligar */
  desfile: boolean
  toast: { id: number; text: string } | null
  trigger: (id: EmoteId) => void
  stop: () => void
}

let toastId = 0
const say = (text: string) => ({ id: ++toastId, text })

export const useEmoteStore = create<EmoteState>()((set, get) => ({
  emote: null,
  desfile: false,
  toast: null,
  trigger: (id) => {
    const s = get()
    if (useSitStore.getState().seat) {
      set({ toast: say('Levante-se para fazer um emote') })
      return
    }
    if (id === 'desfile') {
      const on = !s.desfile
      set({ desfile: on, emote: null, toast: say(on ? 'Desfilando! (2 para parar)' : 'Desfile desligado') })
      return
    }
    if (s.emote === id) {
      set({ emote: null, toast: say('Emote encerrado') })
      return
    }
    const moving = intent.move.x !== 0 || intent.move.y !== 0 || intent.target !== null
    if (moving) {
      set({ toast: say('Pare de andar para fazer um emote') })
      return
    }
    set({ emote: id, desfile: false, toast: say(id === 'clap' ? 'Aplaudindo!' : id === 'jump' ? 'Pulando!' : 'Dançando!') })
  },
  stop: () => {
    if (get().emote) set({ emote: null })
  },
}))
