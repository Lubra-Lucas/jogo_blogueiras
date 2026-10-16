/** Tipos compartilhados do minijogo "Passarela das Blogueiras". */
import type { ItemSlot } from '../../character/catalog'

export type StyleTag = 'romantico' | 'y2k' | 'gala' | 'casual' | 'goth' | 'praia' | 'rococo' | 'esportivo'

export const TAG_LABEL: Record<StyleTag, string> = {
  romantico: 'Romântico',
  y2k: 'Y2K',
  gala: 'Gala',
  casual: 'Casual',
  goth: 'Gótico',
  praia: 'Praia',
  rococo: 'Rococó',
  esportivo: 'Esportivo',
}

export type CatalogCategory = 'hair' | 'top' | 'bottom' | 'jewelry' | 'accessory'

/** Peça escolhível no camarim (vinda do catálogo; adaptada em adapters.ts). */
export interface CatalogItem {
  /** id para o `Appearance` (cabelo: 'hair.xxx'; roupas/joias: id do JSON de itens) */
  id: string
  label: string
  category: CatalogCategory
  /** slot real do catálogo (vestido ocupa top+bottom; um item por slot) */
  slot: ItemSlot
  tags: StyleTag[]
  /** 0 (informal) .. 1 (muito formal) */
  formality: number
  /** 0 comum .. 4 lendário */
  rarity: number
  /** cor principal (referência de harmonia) */
  color: string
  /** paleta de cores sugeridas para recolorir */
  swatches?: string[]
  /** emoji/ícone para o botão */
  icon: string
}

export interface Theme {
  id: string
  name: string
  blurb: string
  icon: string
  /** tag -> peso 0..1 */
  tags: Partial<Record<StyleTag, number>>
  /** cores que combinam (hex) */
  colors: string[]
  /** formalidade ideal 0..1 */
  formality: number
  /** gradiente do cartão */
  gradient: [string, string]
}

/** Look escolhido no camarim (puro, sem three). */
export interface Look {
  hairId: string | null
  hairColor: string
  /** top/bottom/dress: id + cor (null = nenhuma peça: só o macacão pintado) */
  top: { id: string; color: string } | null
  bottom: { id: string; color: string } | null
  dress: { id: string; color: string } | null
  jewelry: { id: string; color: string }[]
  accessories: { id: string; color: string }[]
  suitColor: string
  suitFinish: 'latex' | 'satin' | 'matte'
  lipsColor: string
  lipsGloss: number
}

export type PoseGrade = 'perfect' | 'good' | 'miss'

export interface ScoreBreakdown {
  /** 1..10 cada */
  theme: number
  colors: number
  creativity: number
  poses: number
}

export interface JudgeResult {
  judgeId: string
  scores: ScoreBreakdown
  /** nota final do jurado 1..10 (média ponderada) */
  total: number
  comment: string
}

export interface Competitor {
  id: string
  name: string
  emoji: string
  look: Look
  /** 0..1: habilidade nas poses */
  skill: number
  total: number
  /** média das notas 0..100 */
  score100: number
  isPlayer: boolean
  breakdown: ScoreBreakdown
}
