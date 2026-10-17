import { lazy } from 'react'
import type { MinigameDef } from '../registry'

export const def: MinigameDef = {
  id: 'procura',
  label: 'Cadê a Blogueira?',
  poi: 'cassino',
  order: 5,
  profession: 'Fotógrafa',
  category: 'diversao', description: 'Ache as blogueiras, os pets e o fotógrafo no meio da multidão.',
  component: lazy(() => import('./ProcuraGame').then((m) => ({ default: m.ProcuraGame }))),
}
