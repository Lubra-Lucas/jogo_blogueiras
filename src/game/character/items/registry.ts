import type { ItemRef } from '../../../shared/appearance'
import type { BuiltPart, ItemDef, ItemSlot } from './types'

const REGISTRY = new Map<string, ItemDef>()

export function registerItem(def: ItemDef): void {
  REGISTRY.set(def.id, def)
}

export function getItem(id: string): ItemDef | undefined {
  return REGISTRY.get(id)
}

export function listItems(slot?: ItemSlot): ItemDef[] {
  return [...REGISTRY.values()].filter((d) => !slot || d.slot === slot)
}

/**
 * Constroi um item a partir de um `ItemRef`. Id desconhecido (ex.: item de uma versao nova do jogo)
 * e ignorado: devolve lista vazia, sem lancar erro.
 */
export function buildItem(ref: ItemRef | undefined, colorsOverride?: string[]): BuiltPart[] {
  if (!ref) return []
  const def = REGISTRY.get(ref.id)
  if (!def) return []
  const colors = [...def.defaultColors]
  const src = colorsOverride ?? ref.colors
  if (src) src.forEach((c, i) => (colors[i] = c))
  return def.build({ colors, params: { ...def.defaultParams, ...ref.params } })
}
