import type { ComponentType } from 'react'

/**
 * Registro de minijogos. Cada minijogo vive em `src/ui/minigames/<id>/` e se cadastra sozinho
 * exportando `def` de um arquivo `def.tsx` nessa pasta (achado por import.meta.glob). Nenhum
 * arquivo central precisa ser editado para adicionar um minijogo novo.
 *
 * Exemplo (`src/ui/minigames/salao/def.tsx`):
 *   import { lazy } from 'react'
 *   import type { MinigameDef } from '../registry'
 *   export const def: MinigameDef = {
 *     id: 'salao', label: 'Salão Express', poi: 'salao-spa', order: 1,
 *     component: lazy(() => import('./SalaoGame')),
 *   }
 */
export interface MinigameProps {
  onExit: () => void
}

export interface MinigameDef {
  /** id único, também usado em `?minigame=<id>` */
  id: string
  /** nome mostrado no aviso da porta e nas missões (pt-BR) */
  label: string
  /** POI (porta da cidade) que abre este minijogo; vários minijogos podem dividir a mesma porta */
  poi: string
  /** ordem entre os minijogos da mesma porta (menor primeiro) */
  order?: number
  /** profissão ligada (Barista, Cabeleireira, Fotógrafa, Modelo, Estilista, DJ...) */
  profession?: string
  /** componente em tela cheia; deve chamar onExit para fechar */
  component: ComponentType<MinigameProps>
  /** chamado depois de fechar (ex.: emote de agradecimento no mundo) */
  afterExit?: () => void
}

const modules = import.meta.glob<{ def: MinigameDef }>('./*/def.tsx', { eager: true })

export const MINIGAMES: MinigameDef[] = Object.values(modules)
  .map((m) => m.def)
  .filter(Boolean)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

export const getMinigame = (id: string | null) => MINIGAMES.find((m) => m.id === id) ?? null

export const minigamesAtPoi = (poi: string) => MINIGAMES.filter((m) => m.poi === poi)
