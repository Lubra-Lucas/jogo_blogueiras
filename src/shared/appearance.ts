/**
 * Aparencia de um personagem: JSON puro (sem tipos do three), versionado (`v: 3`).
 * Salvar, enviar pela rede ou trocar de look e so trocar este objeto.
 * Cores sao strings CSS hex ("#ffb3d1"). Ids de itens apontam para o registro em
 * `src/game/character/items.ts` (id desconhecido e ignorado sem erro; nomes de morph desconhecidos tambem).
 */

export interface ItemRef {
  id: string
  /** cores do item, na ordem dos slots de material do manifesto (base/trim/accent...; metal/gem/...) */
  colors?: string[]
  /** acabamentos por slot de material (mesma ordem de `colors`) */
  finishes?: string[]
  /** parametros numericos do item */
  params?: Record<string, number>
}

/** Acabamento do macacao pintado: latex (brilho de espelho), cetim (brilho suave) ou fosco. */
export type SuitFinish = 'latex' | 'satin' | 'matte'

export interface Appearance {
  /** versao do formato (para migracoes futuras) */
  v: 3
  /** qual malha base (GLB) */
  base: 'doll'
  /** nome do morph target -> 0..1 (corpo e rosto); nomes desconhecidos sao ignorados */
  morphs: Record<string, number>
  /** tom da pele nua (rosto, pescoco, maos, pes) */
  skin: { tone: string }
  /** macacao pintado na textura (cor + acabamento) */
  suit: { color: string; finish: SuitFinish }
  /** batom: cor dos labios (+ brilho 0..1); sem isto usa a cor pintada original */
  lips?: { color: string; gloss: number }
  /** id do cabelo (null = careca) e sua cor */
  hair: { id: string | null; color: string }
  outfit: { top?: ItemRef; bottom?: ItemRef; dress?: ItemRef; shoes?: ItemRef; gloves?: ItemRef; legwear?: ItemRef }
  /** joias (um item por slot: neck/ears/head/wrist/finger) */
  accessories: ItemRef[]
}

/** Look padrao: porcelana, macacao rosa de latex, labios rosados brilhantes, cabelo loiro preso. */
export const DEFAULT_APPEARANCE: Appearance = {
  v: 3,
  base: 'doll',
  morphs: {},
  skin: { tone: '#efcdbd' },
  suit: { color: '#f39ab3', finish: 'latex' },
  lips: { color: '#da7076', gloss: 0.5 },
  hair: { id: 'hair.meshyUpdo', color: '#d8b46e' },
  outfit: {},
  accessories: [],
}

/** Look de teste alternativo (?look=2): pele escura, macacao preto, labios malva, cabelo castanho escuro, morphs marcados. */
export const ALT_APPEARANCE: Appearance = {
  v: 3,
  base: 'doll',
  morphs: { bustBig: 0.5, buttBig: 0.6, hipsWide: 0.5, waistThin: 0.6, lipsFull: 0.7 },
  skin: { tone: '#6b4128' },
  suit: { color: '#16141a', finish: 'latex' },
  lips: { color: '#a8566e', gloss: 0.7 },
  hair: { id: 'hair.meshyUpdo', color: '#3a2417' },
  outfit: {},
  accessories: [],
}

/** Rotulos (pt) dos acabamentos, para a UI. */
export const FINISH_LABELS: Record<SuitFinish, string> = { latex: 'Látex', satin: 'Cetim', matte: 'Fosco' }
