import { create } from 'zustand'
import type { Seat } from './seats'

interface SitState {
  /** assento ocupado (sentada) */
  seat: Seat | null
  /** assento para o qual a personagem esta andando (clique no banco): senta ao chegar */
  pending: Seat | null
  /** `intent.targetSetAt` do destino que a levou ao banco; outro destino cancela */
  pendingStamp: number
  /** assento livre mais proximo (aviso "Sentar [E]"); null se longe ou se uma porta esta mais perto */
  nearest: Seat | null
  /** altura do quadril no clipe `sit` (preenchido ao carregar os clipes) */
  sitHipsY: number
  sitDown: (seat: Seat) => void
  standUp: () => void
}

/** Folga entre o osso do quadril e o topo da almofada (m): o osso fica ~acima da parte de baixo do bumbum. */
export const SEAT_HIPS_GAP = 0.1

export const useSitStore = create<SitState>()((set) => ({
  seat: null,
  pending: null,
  pendingStamp: 0,
  nearest: null,
  sitHipsY: 0.45,
  sitDown: (seat) => set({ seat, pending: null, nearest: null }),
  standUp: () => set({ seat: null }),
}))
