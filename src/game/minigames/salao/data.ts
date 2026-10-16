import type { Difficulty } from '../shared/competition'

export const PROFESSION = 'Cabeleireira'

export type StyleId = 'hair.meshyUpdo' | 'hair.chestnutWaves' | 'hair.caramelCurls' | 'hair.platinumUndercut'
export type AccId = 'hair_bow' | 'star_pins' | 'tiara'
export type Spot = 'left' | 'right' | 'top'

export const STYLE_NAME: Record<StyleId, string> = {
  'hair.meshyUpdo': 'Coque alto',
  'hair.chestnutWaves': 'Ondas longas',
  'hair.caramelCurls': 'Cachos',
  'hair.platinumUndercut': 'Undercut',
}
export const ACC_NAME: Record<AccId, string> = { hair_bow: 'Laço', star_pins: 'Presilhas estrela', tiara: 'Tiara' }
export const ACC_SPOTS: Record<AccId, Spot[]> = { hair_bow: ['left', 'right'], star_pins: ['left', 'right'], tiara: ['top'] }
export const SPOT_NAME: Record<Spot, string> = { left: 'esquerda', right: 'direita', top: 'topo' }

/** Pigmentos 0..1: vermelho-tijolo, ocre, azul-marinho, branco, escuro. */
export interface Recipe { r: number; y: number; b: number; w: number; d: number }
export const PIGMENTS = [
  { key: 'r', name: 'Tijolo', color: '#b5382c' },
  { key: 'y', name: 'Ocre', color: '#d9a441' },
  { key: 'b', name: 'Marinho', color: '#2f4f8a' },
  { key: 'w', name: 'Branco', color: '#f7f3ea' },
  { key: 'd', name: 'Escuro', color: '#1e1814' },
] as const

export interface ColorDef { id: string; name: string; recipe: Recipe; level: number }
export const COLORS: ColorDef[] = [
  { id: 'mel', name: 'Loiro mel', recipe: { r: 0.15, y: 0.8, b: 0, w: 0.35, d: 0 }, level: 1 },
  { id: 'castanho', name: 'Castanho', recipe: { r: 0.35, y: 0.35, b: 0.3, w: 0, d: 0.1 }, level: 1 },
  { id: 'ruivo', name: 'Ruivo acobreado', recipe: { r: 0.8, y: 0.4, b: 0, w: 0, d: 0.05 }, level: 1 },
  { id: 'preto', name: 'Preto azulado', recipe: { r: 0.25, y: 0.25, b: 0.5, w: 0, d: 0.8 }, level: 1 },
  { id: 'caramelo', name: 'Caramelo', recipe: { r: 0.4, y: 0.6, b: 0.05, w: 0.1, d: 0 }, level: 1 },
  { id: 'platinado', name: 'Platinado', recipe: { r: 0, y: 0.1, b: 0, w: 0.9, d: 0 }, level: 2 },
  { id: 'ameixa', name: 'Ameixa', recipe: { r: 0.5, y: 0, b: 0.5, w: 0, d: 0.15 }, level: 3 },
  { id: 'petroleo', name: 'Azul petróleo', recipe: { r: 0, y: 0.15, b: 1, w: 0, d: 0.1 }, level: 4 },
  { id: 'rose', name: 'Rosé acinzentado', recipe: { r: 0.5, y: 0.1, b: 0, w: 0.6, d: 0 }, level: 5 },
]

export interface Unlock { level: number; kind: 'estilo' | 'cor' | 'acessório' | 'duas cores'; id: string; name: string }
export const UNLOCKS: Unlock[] = [
  { level: 2, kind: 'cor', id: 'platinado', name: 'Platinado' },
  { level: 2, kind: 'acessório', id: 'star_pins', name: 'Presilhas estrela' },
  { level: 3, kind: 'estilo', id: 'hair.platinumUndercut', name: 'Undercut' },
  { level: 3, kind: 'cor', id: 'ameixa', name: 'Ameixa' },
  { level: 3, kind: 'duas cores', id: 'duo', name: 'Coloração em duas cores' },
  { level: 4, kind: 'cor', id: 'petroleo', name: 'Azul petróleo' },
  { level: 4, kind: 'acessório', id: 'tiara', name: 'Tiara' },
  { level: 5, kind: 'cor', id: 'rose', name: 'Rosé acinzentado' },
]

export const STYLES_ALL: StyleId[] = ['hair.meshyUpdo', 'hair.chestnutWaves', 'hair.caramelCurls', 'hair.platinumUndercut']

export function unlockedPool(level: number) {
  const has = (kind: Unlock['kind'], id: string) => !UNLOCKS.some((u) => u.kind === kind && u.id === id && u.level > level)
  return {
    styles: STYLES_ALL.filter((s) => has('estilo', s)),
    colors: COLORS.filter((c) => c.level <= level),
    accs: (['hair_bow', 'star_pins', 'tiara'] as AccId[]).filter((a) => has('acessório', a)),
    duo: level >= 3,
  }
}

export function xpForLevel(n: number): number {
  return 25 * n * (n - 1)
}
export function salaoLevel(xp: number): number {
  let n = 1
  while (n < 8 && xp >= xpForLevel(n + 1)) n++
  return n
}
export function newUnlocks(prev: number, now: number) {
  return UNLOCKS.filter((u) => u.level > prev && u.level <= now)
}

export interface DiffCfg {
  roundSeconds: number
  patience: number
  /** esconde o cartão de referência após N segundos (0 = nunca) */
  hideAfter: number
  canPeek: boolean
  /** ΔE de tolerância (acima de 3) para zerar a coloração */
  deTol: number
  traceR: number
  dryerHalf: number
  dryerSeconds: number
  liveHint: boolean
  retryStyle: boolean
  typical: number
}
export const DIFF: Record<Difficulty, DiffCfg> = {
  facil: { roundSeconds: 120, patience: 46, hideAfter: 0, canPeek: false, deTol: 40, traceR: 7.5, dryerHalf: 0.18, dryerSeconds: 6, liveHint: true, retryStyle: true, typical: 3300 },
  normal: { roundSeconds: 110, patience: 38, hideAfter: 0, canPeek: false, deTol: 32, traceR: 6, dryerHalf: 0.14, dryerSeconds: 6, liveHint: false, retryStyle: false, typical: 3700 },
  dificil: { roundSeconds: 100, patience: 32, hideAfter: 4, canPeek: true, deTol: 26, traceR: 5, dryerHalf: 0.11, dryerSeconds: 6.5, liveHint: false, retryStyle: false, typical: 4000 },
  estrela: { roundSeconds: 95, patience: 28, hideAfter: 3, canPeek: false, deTol: 20, traceR: 4.2, dryerHalf: 0.085, dryerSeconds: 7, liveHint: false, retryStyle: false, typical: 4300 },
}

export const STEP_NAME = ['Estilo', 'Coloração', 'Finalização', 'Acessório'] as const
export const SKIN_TONES = ['#efcdbd', '#d9a888', '#b57d5c', '#8a5a3c', '#5e3a26']
export const SUIT_COLORS = ['#2b2622', '#e9e1d3', '#7d8f7a', '#5b6b82', '#a68a5b']
export const ACC_COLORS = ['#1d1b22', '#f6f0ff', '#7d8f7a', '#b08d4a']
