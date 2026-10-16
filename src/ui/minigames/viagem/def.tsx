import { lazy } from 'react'
import type { MinigameDef } from '../registry'

/** Check-in do aeroporto (viagem de aviao). Nao e um jogo: usa o registro de portas para abrir a tela de destinos. */
export const def: MinigameDef = {
  id: 'viagem',
  label: 'Check-in (viajar)',
  poi: 'aeroporto',
  order: 0,
  component: lazy(() => import('./ViagemGame')),
}
