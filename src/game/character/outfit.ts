import type { Appearance, ItemRef } from '../../shared/appearance'
import { getCatalogItem, type CatalogItem, type ItemSlot } from './catalog'
import { getWearable, WEARABLES } from './items'

/** Funcoes puras de equipar/tirar (devolvem uma nova Appearance). */

/** O que esta equipado em um slot (cabelo, roupa ou joia). */
export function equippedRef(a: Appearance, slot: ItemSlot): ItemRef | null {
  if (slot === 'hair') return a.hair.id ? { id: a.hair.id } : null
  const o = a.outfit[slot as keyof Appearance['outfit']]
  if (o) return o
  return a.accessories.find((r) => getCatalogItem(r.id)?.slot === slot) ?? null
}

export function isEquipped(a: Appearance, id: string): boolean {
  return a.hair.id === id || Object.values(a.outfit).some((r) => r?.id === id) || a.accessories.some((r) => r.id === id)
}

export function equip(a: Appearance, id: string): Appearance {
  const hair = getWearable(id)
  if (hair && hair.slot === 'hair') return { ...a, hair: { id, color: hair.defaultColor } }
  const item = getCatalogItem(id)
  if (!item) return a
  const ref: ItemRef = { id, colors: item.mats.map((m) => m.color), finishes: item.kind === 'garment' ? item.mats.map((m) => m.finish) : undefined }
  if (item.kind === 'garment') {
    const outfit = { ...a.outfit, [item.slot]: ref }
    if (item.slot === 'dress') delete outfit.top, delete outfit.bottom
    else if (item.slot === 'top' || item.slot === 'bottom') delete outfit.dress // sapatos/luvas/meias convivem com o vestido
    return { ...a, outfit }
  }
  return { ...a, accessories: [...a.accessories.filter((r) => getCatalogItem(r.id)?.slot !== item.slot), ref] }
}

export function unequip(a: Appearance, slot: ItemSlot): Appearance {
  if (slot === 'hair') return { ...a, hair: { ...a.hair, id: null } }
  const outfit = { ...a.outfit }
  delete outfit[slot as keyof Appearance['outfit']]
  return { ...a, outfit, accessories: a.accessories.filter((r) => getCatalogItem(r.id)?.slot !== slot) }
}

/** Troca cor e/ou acabamento de um slot de material do item equipado. */
export function recolor(a: Appearance, item: CatalogItem, matIndex: number, patch: { color?: string; finish?: string }): Appearance {
  const upd = (r: ItemRef): ItemRef => {
    const colors = item.mats.map((m, i) => r.colors?.[i] ?? m.color)
    const finishes = item.mats.map((m, i) => r.finishes?.[i] ?? m.finish)
    if (patch.color) colors[matIndex] = patch.color
    if (patch.finish) finishes[matIndex] = patch.finish
    return { ...r, colors, finishes: item.kind === 'garment' ? finishes : undefined }
  }
  if (item.kind === 'garment') {
    const key = item.slot as keyof Appearance['outfit']
    const cur = a.outfit[key]
    return cur && cur.id === item.id ? { ...a, outfit: { ...a.outfit, [key]: upd(cur) } } : a
  }
  return { ...a, accessories: a.accessories.map((r) => (r.id === item.id ? upd(r) : r)) }
}

export const hairList = () => Object.values(WEARABLES).filter((w) => w.slot === 'hair')

/** Escolhe a estampa (id; '' = liso) da roupa equipada no slot do item. */
export function setPattern(a: Appearance, item: CatalogItem, pattern: string): Appearance {
  if (item.kind !== 'garment') return a
  const key = item.slot as keyof Appearance['outfit']
  const cur = a.outfit[key]
  if (!cur || cur.id !== item.id) return a
  const next = { ...cur }
  if (pattern) next.pattern = pattern
  else delete next.pattern
  return { ...a, outfit: { ...a.outfit, [key]: next } }
}
