/** Dados estaticos do Cafe Rose (nomes em pt-BR, cores, desbloqueios). Sem React. */

export type Size = 'P' | 'M' | 'G'
export type Base = 'cafe' | 'cha' | 'milkshake' | 'matcha'
export type Topping = 'chantilly' | 'granulado' | 'morango' | 'caramelo'
export type Sweet = 'cupcake' | 'macaron'

export const SIZES: Size[] = ['P', 'M', 'G']
export const BASES: Base[] = ['cafe', 'cha', 'milkshake', 'matcha']
export const TOPPINGS: Topping[] = ['chantilly', 'granulado', 'morango', 'caramelo']
export const SWEETS: Sweet[] = ['cupcake', 'macaron']

export const SIZE_NAME: Record<Size, string> = { P: 'Pequeno', M: 'Médio', G: 'Grande' }
export const BASE_NAME: Record<Base, string> = { cafe: 'Café', cha: 'Chá', milkshake: 'Milkshake', matcha: 'Matcha' }
export const TOPPING_NAME: Record<Topping, string> = {
  chantilly: 'Chantilly',
  granulado: 'Granulado',
  morango: 'Morango',
  caramelo: 'Calda de caramelo',
}
export const SWEET_NAME: Record<Sweet, string> = { cupcake: 'Cupcake', macaron: 'Macaron' }

export const BASE_COLOR: Record<Base, string> = {
  cafe: '#8a5a3c',
  cha: '#e9a94f',
  milkshake: '#f6b3cb',
  matcha: '#9ccb7c',
}

export type IngredientKind = 'base' | 'topping' | 'sweet'
export interface Unlock {
  level: number
  kind: IngredientKind
  id: string
}

/** Nivel de Barista que libera cada ingrediente (nivel 1 = Cafe, Cha, Chantilly, Granulado). */
export const UNLOCKS: Unlock[] = [
  { level: 1, kind: 'base', id: 'cafe' },
  { level: 1, kind: 'base', id: 'cha' },
  { level: 1, kind: 'topping', id: 'chantilly' },
  { level: 1, kind: 'topping', id: 'granulado' },
  { level: 2, kind: 'base', id: 'milkshake' },
  { level: 2, kind: 'topping', id: 'morango' },
  { level: 3, kind: 'base', id: 'matcha' },
  { level: 3, kind: 'topping', id: 'caramelo' },
  { level: 4, kind: 'sweet', id: 'cupcake' },
  { level: 5, kind: 'sweet', id: 'macaron' },
]

export function ingredientName(kind: IngredientKind, id: string): string {
  if (kind === 'base') return BASE_NAME[id as Base]
  if (kind === 'topping') return TOPPING_NAME[id as Topping]
  return SWEET_NAME[id as Sweet]
}

export interface Unlocked {
  bases: Base[]
  toppings: Topping[]
  sweets: Sweet[]
}

export function unlockedAt(level: number): Unlocked {
  const u: Unlocked = { bases: [], toppings: [], sweets: [] }
  for (const k of UNLOCKS) {
    if (k.level > level) continue
    if (k.kind === 'base') u.bases.push(k.id as Base)
    else if (k.kind === 'topping') u.toppings.push(k.id as Topping)
    else u.sweets.push(k.id as Sweet)
  }
  return u
}

// ---- aparencia dos clientes (diversa) ----
export const SKINS = ['#fde3d3', '#f6caa9', '#e6ad82', '#c98b64', '#9c6645', '#6e4532']
export const HAIRS = ['#2a1a16', '#5b3527', '#a6652e', '#e8c56c', '#f0a4c0', '#8d6fdc', '#4db5c8', '#d9d4cf']
export const SHIRTS = ['#bfe8d6', '#fbe7a1', '#bcd9f7', '#ffcfb5', '#d8c8f5', '#f8bcd3']
export const HAIR_STYLES = ['bob', 'bun', 'puffs', 'long', 'bangs'] as const
export type HairStyle = (typeof HAIR_STYLES)[number]
export const ACCESSORIES = ['none', 'bow', 'glasses', 'flower'] as const
export type Accessory = (typeof ACCESSORIES)[number]
