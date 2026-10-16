/**
 * Metadados de moda dos itens (para o minigame "Passarela" e filtros do guarda-roupa).
 * Dados puros: id do item -> estilos, cores, formalidade (0 = casual .. 1 = gala) e raridade.
 * Itens sem entrada usam `DEFAULT_TAGS`.
 */
export type StyleTag = 'romantico' | 'y2k' | 'gala' | 'casual' | 'goth' | 'praia' | 'rococo' | 'esportivo'
export type Rarity = 'comum' | 'raro' | 'epico' | 'lendario'

export const STYLE_LABELS: Record<StyleTag, string> = {
  romantico: 'Romântico',
  y2k: 'Y2K',
  gala: 'Gala',
  casual: 'Casual',
  goth: 'Gótico',
  praia: 'Praia',
  rococo: 'Rococó',
  esportivo: 'Esportivo',
}

export const RARITY_LABELS: Record<Rarity, string> = { comum: 'Comum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário' }
export const RARITY_COLORS: Record<Rarity, string> = { comum: '#b8b2c4', raro: '#5fb0f0', epico: '#b277f0', lendario: '#f2b632' }

export interface ItemTags {
  styles: StyleTag[]
  /** cores dominantes (nomes simples em pt) */
  colors: string[]
  /** 0 = casual .. 1 = gala */
  formality: number
  rarity: Rarity
}

export const DEFAULT_TAGS: ItemTags = { styles: ['casual'], colors: [], formality: 0.3, rarity: 'comum' }

export const ITEM_TAGS: Record<string, ItemTags> = {
  // cabelos
  'hair.meshyUpdo': { styles: ['romantico', 'gala', 'rococo'], colors: ['loiro'], formality: 0.8, rarity: 'comum' },
  'hair.chestnutWaves': { styles: ['romantico', 'casual'], colors: ['castanho'], formality: 0.5, rarity: 'comum' },
  'hair.platinumUndercut': { styles: ['y2k', 'goth', 'esportivo'], colors: ['platinado'], formality: 0.3, rarity: 'raro' },
  'hair.caramelCurls': { styles: ['romantico', 'praia', 'casual'], colors: ['caramelo'], formality: 0.35, rarity: 'raro' },
  // roupas
  corset: { styles: ['romantico', 'y2k', 'goth'], colors: ['rosa', 'dourado'], formality: 0.6, rarity: 'raro' },
  aline: { styles: ['romantico', 'casual'], colors: ['lilas', 'rosa'], formality: 0.45, rarity: 'comum' },
  tutu: { styles: ['romantico', 'y2k'], colors: ['rosa'], formality: 0.4, rarity: 'raro' },
  ballgown: { styles: ['gala', 'rococo', 'romantico'], colors: ['branco', 'rosa', 'dourado'], formality: 1, rarity: 'lendario' },
  gloves: { styles: ['gala', 'rococo', 'goth'], colors: ['rosa'], formality: 0.85, rarity: 'epico' },
  stockings: { styles: ['romantico', 'y2k', 'goth'], colors: ['rosa'], formality: 0.5, rarity: 'comum' },
  // joias
  pearl_choker: { styles: ['romantico', 'gala', 'rococo'], colors: ['dourado', 'branco'], formality: 0.8, rarity: 'epico' },
  ribbon_choker: { styles: ['romantico', 'goth', 'y2k'], colors: ['rosa'], formality: 0.5, rarity: 'comum' },
  layered_gold: { styles: ['y2k', 'casual', 'praia'], colors: ['dourado'], formality: 0.4, rarity: 'raro' },
  pearl_studs: { styles: ['romantico', 'gala'], colors: ['branco'], formality: 0.7, rarity: 'comum' },
  heart_hoops: { styles: ['y2k', 'romantico'], colors: ['dourado', 'rosa'], formality: 0.3, rarity: 'comum' },
  big_hoops: { styles: ['y2k', 'casual', 'esportivo'], colors: ['dourado'], formality: 0.25, rarity: 'comum' },
  chandelier_drops: { styles: ['gala', 'rococo'], colors: ['dourado', 'rosa'], formality: 0.95, rarity: 'epico' },
  tiara: { styles: ['gala', 'rococo', 'romantico'], colors: ['dourado', 'rosa'], formality: 1, rarity: 'lendario' },
  hair_bow: { styles: ['romantico', 'y2k', 'casual'], colors: ['rosa'], formality: 0.3, rarity: 'comum' },
  star_pins: { styles: ['y2k', 'goth'], colors: ['dourado'], formality: 0.3, rarity: 'raro' },
  tennis_bracelet: { styles: ['gala', 'rococo'], colors: ['dourado', 'branco'], formality: 0.85, rarity: 'epico' },
  bangle_stack: { styles: ['y2k', 'casual', 'praia'], colors: ['dourado'], formality: 0.3, rarity: 'raro' },
  heart_ring: { styles: ['romantico', 'y2k'], colors: ['dourado', 'rosa'], formality: 0.35, rarity: 'comum' },
  cocktail_ring: { styles: ['gala', 'rococo'], colors: ['dourado', 'rosa'], formality: 0.9, rarity: 'epico' },
}

export function tagsOf(id: string): ItemTags {
  return ITEM_TAGS[id] ?? DEFAULT_TAGS
}
