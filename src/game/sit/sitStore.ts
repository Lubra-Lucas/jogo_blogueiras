import { create } from 'zustand'
import type { Seat } from './seats'

/** Medidas dos clipes stand_to_sit / sit_to_stand (preenchidas ao carregar os clipes). */
export interface SitClipInfo {
  /** duracao (s) de sentar / levantar */
  inDur: number
  outDur: number
  /** deslocamento do quadril no fim de sentar, relativo ao inicio (espaco local da personagem: x lateral, z frente) */
  offX: number
  offZ: number
  /** altura do osso do quadril (acima do chao da personagem) no fim de sentar */
  endY: number
  /** deslocamento do quadril no fim de levantar (o clipe comeca com o quadril sobre o assento) */
  outX: number
  outZ: number
}

interface SitState {
  /** assento ocupado (sentando, sentada ou levantando) */
  seat: Seat | null
  /** 'sitting' = indo/ficando sentada; 'standing' = tocando o clipe de levantar */
  phase: 'sitting' | 'standing'
  /** assento para o qual a personagem esta andando (clique no banco): senta ao chegar */
  pending: Seat | null
  /** `intent.targetSetAt` do destino que a levou ao banco; outro destino cancela */
  pendingStamp: number
  /** assento livre mais proximo (aviso "Sentar [E]"); null se longe ou se uma porta esta mais perto */
  nearest: Seat | null
  clip: SitClipInfo
  sitDown: (seat: Seat) => void
  /** comeca a levantar (clipe sit_to_stand); o PlayerController solta o assento ao fim do clipe */
  standUp: () => void
  /** fim de levantar: libera o movimento */
  release: () => void
}

/** Folga entre o osso do quadril e o topo da almofada (m): o osso fica acima da parte de baixo do bumbum. Ajuste fino. */
export const SEAT_HIPS_GAP = 0.08

export const useSitStore = create<SitState>()((set, get) => ({
  seat: null,
  phase: 'sitting',
  pending: null,
  pendingStamp: 0,
  nearest: null,
  clip: { inDur: 2.2, outDur: 2.2, offX: 0, offZ: -0.39, endY: 0.47, outX: 0, outZ: 0.39 },
  sitDown: (seat) => set({ seat, phase: 'sitting', pending: null, nearest: null }),
  standUp: () => {
    if (get().seat && get().phase === 'sitting') set({ phase: 'standing' })
  },
  release: () => set({ seat: null, phase: 'sitting' }),
}))
