import { lazy } from 'react'
import type { MinigameDef } from '../registry'

const SalaoGame = lazy(() => import('./SalaoGame').then((m) => ({ default: m.SalaoGame })))

export const def: MinigameDef = {
  id: 'salao',
  label: 'Salão Express',
  poi: 'salao-spa',
  order: 0,
  profession: 'Cabeleireira',
  component: SalaoGame,
}
