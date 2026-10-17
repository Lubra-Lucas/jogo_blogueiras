import { lazy } from 'react'
import type { MinigameDef } from '../registry'

export const def: MinigameDef = {
  id: 'memoria',
  label: 'Memória Fashion',
  // Estúdio de Fotos (distrito da Moda): pares de peças e "Lembre o look"
  poi: 'estudio-fotos',
  order: 5,
  profession: 'Estilista',
  category: 'diversao', description: 'Ache os pares de peças ou lembre e remonte o look.',
  component: lazy(() => import('./MemoriaGame').then((m) => ({ default: m.MemoriaGame }))),
}
