import { lazy } from 'react'
import type { MinigameDef } from '../registry'

/** Vôlei de Praia: timing em 3 toques (manchete, levantada, corte). Porta: Sunset Beach Club (Miami Beach). */
export const def: MinigameDef = {
  id: 'volei',
  label: 'Vôlei de Praia',
  poi: 'beach-club',
  order: 0,
  category: 'praia', city: 'miami', place: 'Sunset Beach Club – Miami Beach', description: 'Manchete, levantada e corte no tempo certo.',
  component: lazy(() => import('./VoleiGame')),
}
