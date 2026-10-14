/**
 * Aparencia de um personagem: JSON puro (sem tipos do three), versionado.
 * Salvar, enviar pela rede ou trocar de look e so trocar este objeto.
 * Cores sao strings CSS hex ("#ffb3d1"). Ids de itens apontam para o registro
 * em `src/game/character/items/` (id desconhecido e ignorado sem erro).
 */

export interface ItemRef {
  id: string
  /** cores do item, na ordem definida pelo builder (ex.: [corpete, creme, ouro]) */
  colors?: string[]
  /** parametros numericos do builder (ex.: comprimento da saia) */
  params?: Record<string, number>
}

export interface FaceAppearance {
  eyes: {
    /** 'round' | 'almond' | 'doe' */
    style: string
    iris: string
    /** sombra de olho (gradiente sobre a palpebra) */
    shadow?: string
    shadowOpacity?: number
  }
  /** 'classic' | 'dramatic' | 'wing' (wing = delineado gatinho + cilios) */
  lashes: { style: string; color: string }
  /** 'soft' | 'straight' */
  brows: { style: string; color: string }
  /** 'heart' | 'pout' */
  lips: { style: string; color: string }
  blush: { color: string; opacity: number }
  /** 'freckles' | 'beautyMark' | 'glitter' */
  extras?: string[]
}

export interface Appearance {
  /** versao do formato (para migracoes futuras) */
  v: 1
  skinTone: string
  face: FaceAppearance
  hair: { id: string; color: string; color2?: string }
  outfit: { top?: ItemRef; bottom?: ItemRef; dress?: ItemRef; shoes?: ItemRef }
  accessories: ItemRef[]
}

export const DEFAULT_APPEARANCE: Appearance = {
  v: 1,
  skinTone: '#f3cfb8',
  face: {
    eyes: { style: 'round', iris: '#8a78d4', shadow: '#d9a6ff', shadowOpacity: 0.55 },
    lashes: { style: 'wing', color: '#3a2233' },
    brows: { style: 'soft', color: '#b5788f' },
    lips: { style: 'heart', color: '#e86a92' },
    blush: { color: '#ff8fb0', opacity: 0.5 },
    extras: ['glitter'],
  },
  hair: { id: 'hair.cottonPouf', color: '#ffb3d1', color2: '#d9b3ff' },
  outfit: {
    dress: {
      id: 'dress.rococo',
      colors: ['#ffb6cf', '#fff3e6', '#e6b84f'],
      params: { length: 0.5, flare: 0.52, tiers: 3, ruffleWaves: 14, ruffleDepth: 0.026 },
    },
    shoes: { id: 'shoes.goldHeels' },
  },
  accessories: [
    { id: 'acc.pearlChoker' },
    { id: 'acc.earringsGold' },
    { id: 'acc.hairBow', colors: ['#ffc9dc', '#e6b84f'] },
  ],
}

/** Look de teste alternativo (?look=2): pele escura, outros olhos/labios, cabelo lilas, saia curta de 1 camada. */
export const ALT_APPEARANCE: Appearance = {
  v: 1,
  skinTone: '#8d5a3b',
  face: {
    eyes: { style: 'almond', iris: '#2fb8a8', shadow: '#ff9a3c', shadowOpacity: 0.6 },
    lashes: { style: 'dramatic', color: '#1d1218' },
    brows: { style: 'straight', color: '#2b1a14' },
    lips: { style: 'pout', color: '#c2185b' },
    blush: { color: '#e0507a', opacity: 0.4 },
    extras: ['beautyMark', 'freckles'],
  },
  hair: { id: 'hair.softWaves', color: '#c9a6ff', color2: '#8fb8ff' },
  outfit: {
    dress: {
      id: 'dress.rococo',
      colors: ['#b79cff', '#e9f6ff', '#e6b84f'],
      params: { length: 0.36, flare: 0.36, tiers: 1, ruffleWaves: 14, ruffleDepth: 0.018 },
    },
    shoes: { id: 'shoes.goldHeels' },
  },
  accessories: [{ id: 'acc.pearlChoker' }, { id: 'acc.tiara' }, { id: 'acc.earringsGold' }],
}
