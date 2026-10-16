import { lazy } from 'react'
import type { MinigameDef } from '../registry'

const CasinoGame = lazy(() => import('./CasinoGame').then((m) => ({ default: m.CasinoGame })))

/**
 * Lounge de Jogos (cassino de fichas). Porta: POI 'cassino' (prédio a ser criado pela cidade).
 * Abre direto em dev com `?minigame=cassino` (e `&cgame=blackjack|poker|roleta|slots`).
 */
export const def: MinigameDef = {
  id: 'cassino',
  label: 'Lounge de Jogos',
  poi: 'cassino',
  order: 10,
  component: CasinoGame,
}
