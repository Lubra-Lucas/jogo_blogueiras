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
}

const A = `${import.meta.env.BASE_URL}assets/characters/`

export const WEARABLES: Record<string, WearableDef> = {
  'hair.meshyUpdo': { id: 'hair.meshyUpdo', slot: 'hair', glb: `${A}hair_meshy_updo.glb`, kind: 'hair', defaultColor: '#d8b46e' },
}

export function getWearable(id: string | null | undefined): WearableDef | null {
  return id ? (WEARABLES[id] ?? null) : null
}

/** Cor efetiva de uma peca: `ref.colors[0]` ou a cor padrao do registro. */
export function itemColor(ref: ItemRef, def: WearableDef): string {
  return ref.colors?.[0] ?? def.defaultColor
}
