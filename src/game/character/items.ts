import type { ItemRef } from '../../shared/appearance'

/**
 * Registro de pecas vestiveis: id -> GLB. Todas as pecas compartilham o esqueleto da base
 * (`mixamorig:*`) e os morph targets do corpo, entao seguem animacao e sliders sem trabalho extra.
 * Para adicionar uma peca: exporte um GLB pelo pipeline Blender (tools/blender) e registre aqui.
 */
export type WearableSlot = 'hair' | 'top' | 'bottom' | 'dress' | 'shoes'

export interface WearableDef {
  id: string
  slot: WearableSlot
  glb: string
  /** 'hair' = malha de cabelo (textura do atlas, recolorida); 'garment' = roupa (cor lisa) */
  kind: 'hair' | 'garment'
  defaultColor: string
  /** rotulo (pt) para a UI */
  label: string
  /**
   * Cabelo: de onde vem a textura. 'atlas' (padrao) = atlas do corpo (o coque usa o mesmo UV do corpo);
   * 'own' = textura propria do GLB do cabelo (baseColor + normal proprios).
   */
  texture?: 'atlas' | 'own'
  /** Cabelo: luminancia linear media da textura (referencia da recoloracao por razao de luminancia). */
  refLum?: number
  /** cabelo MASCULINO (male_base): casca com cor de vertice, sem textura; so aparece para o genero masculino */
  male?: boolean
}

const A = `${import.meta.env.BASE_URL}assets/characters/`

export const WEARABLES: Record<string, WearableDef> = {
  'hair.meshyUpdo': { id: 'hair.meshyUpdo', slot: 'hair', glb: `${A}hair_meshy_updo.glb`, kind: 'hair', defaultColor: '#d8b46e', label: 'Coque loiro' },
  'hair.chestnutWaves': {
    id: 'hair.chestnutWaves',
    slot: 'hair',
    glb: `${A}hair_chestnutWaves.glb`,
    kind: 'hair',
    defaultColor: '#816b58',
    label: 'Ondas castanhas',
    texture: 'own',
    refLum: 0.157,
  },
  // GLBs sem textura (malha lisa): a cor do cabelo vem so do uniforme uHair
  'hair.platinumUndercut': { id: 'hair.platinumUndercut', slot: 'hair', glb: `${A}hair_platinumUndercut.glb`, kind: 'hair', defaultColor: '#e8dcc8', label: 'Undercut platinado', texture: 'own' },
  // bob ruivo com franja (Meshy -> tools/blender/hair/prepare_bob.py): textura de luminancia propria, tinge como os demais
  'hair.bobAuburn': { id: 'hair.bobAuburn', slot: 'hair', glb: `${A}hair_bobAuburn.glb`, kind: 'hair', defaultColor: '#854730', label: 'Chanel ruivo com franja', texture: 'own', refLum: 0.0968 },
  'hair.caramelCurls': { id: 'hair.caramelCurls', slot: 'hair', glb: `${A}hair_caramelCurls.glb`, kind: 'hair', defaultColor: '#c08a4e', label: 'Cachos caramelo', texture: 'own' },
}

/** Cabelos masculinos (fora de WEARABLES: nao entram na loja/inventario; sao gratuitos para o masculino). */
export const MALE_WEARABLES: Record<string, WearableDef> = {
  'hair.m.buzz': { id: 'hair.m.buzz', slot: 'hair', glb: `${A}male/hair_buzz.glb`, kind: 'hair', defaultColor: '#2b2622', label: 'Raspado', male: true },
  'hair.m.quiff': { id: 'hair.m.quiff', slot: 'hair', glb: `${A}male/hair_quiff.glb`, kind: 'hair', defaultColor: '#6a4a2a', label: 'Topete curto', male: true },
  'hair.m.sidepart': { id: 'hair.m.sidepart', slot: 'hair', glb: `${A}male/hair_sidepart.glb`, kind: 'hair', defaultColor: '#4a3626', label: 'Curto com risca', male: true },
}
export const maleHairStyles = (): WearableDef[] => Object.values(MALE_WEARABLES)

/** Estilos de cabelo disponiveis (ordem do registro), para o seletor do editor. */
export function hairStyles(): WearableDef[] {
  return Object.values(WEARABLES).filter((w) => w.slot === 'hair')
}

/** Aceita `chestnutWaves` ou `hair.chestnutWaves`; null se desconhecido. */
export function resolveHairId(raw: string | null | undefined): string | null {
  if (!raw) return null
  const id = raw.startsWith('hair.') ? raw : `hair.${raw}`
  return WEARABLES[id] || MALE_WEARABLES[id] ? id : null
}

export function getWearable(id: string | null | undefined): WearableDef | null {
  return id ? (WEARABLES[id] ?? MALE_WEARABLES[id] ?? null) : null
}

/** Cor efetiva de uma peca: `ref.colors[0]` ou a cor padrao do registro. */
export function itemColor(ref: ItemRef, def: WearableDef): string {
  return ref.colors?.[0] ?? def.defaultColor
}
