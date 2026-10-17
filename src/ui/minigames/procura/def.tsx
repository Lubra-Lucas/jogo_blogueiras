import { lazy } from 'react'
import type { MinigameDef } from '../registry'

export const def: MinigameDef = {
  id: 'procura',
  label: 'Cadê a Blogueira?',
  poi: 'cassino',
  order: 5,
  profession: 'Fotógrafa',
  component: lazy(() => import('./ProcuraGame').then((m) => ({ default: m.ProcuraGame }))),
}
