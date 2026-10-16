import { lazy } from 'react'
import type { MinigameDef } from '../registry'

export const def: MinigameDef = {
  id: 'foto',
  label: 'Ensaio Fotográfico',
  // id real da porta do Estúdio de Fotos em world/city/layout.ts
  poi: 'estudio-fotos',
  order: 0,
  profession: 'Fotógrafa',
  component: lazy(() => import('./FotoGame').then((m) => ({ default: m.FotoGame }))),
}
