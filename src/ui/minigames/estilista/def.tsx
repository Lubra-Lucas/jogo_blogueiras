import { lazy } from 'react'
import type { MinigameDef } from '../registry'

export const def: MinigameDef = {
  id: 'estilista',
  label: 'Estilista Personal',
  poi: 'boutique',
  order: 1,
  profession: 'Estilista',
  component: lazy(() => import('./EstilistaGame')),
}
