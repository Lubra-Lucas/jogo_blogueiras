/**
 * Adaptador entre o minijogo e o resto do jogo (catálogo de itens, tags, aparência).
 *
 * - Catálogo: itens reais de `character/catalog.ts` (manifestos de roupas/joias, carregados assíncronos) + cabelos de
 *   `items.ts`. Enquanto o manifesto não carregou, usa uma lista de reserva (`FALLBACK`) com os mesmos ids.
 * - Tags de estilo/formalidade/raridade: `character/itemTags.ts` (`tagsOf`).
 * - Aparência: `lookToAppearance` gera um `Appearance` (shared/appearance.ts); cada peça vira um `ItemRef` com as cores
 *   dos slots de material do manifesto (a cor escolhida no camarim tinge o slot 0 = base/metal).
 */
import type { Appearance, ItemRef } from '../../../shared/appearance'
import { getCatalogItem, useCatalogStore, type CatalogItem as RealItem, type ItemSlot } from '../../character/catalog'
import { hairStyles } from '../../character/items'
import { tagsOf, type Rarity } from '../../character/itemTags'
import type { CatalogItem, Look } from './types'

const SW_HAIR = ['#d8b46e', '#816b58', '#3a2417', '#16141a', '#e8dcc8', '#c08a4e', '#e8a0c0', '#9fc8ff', '#c9a6ff', '#8fe0c0']
const SW_GARMENT = ['#ff3f8e', '#fff1f6', '#c8a4ff', '#b9e4ff', '#c8f2e0', '#fff0b0', '#ffd9c2', '#16141a', '#e8b84a', '#7d1d3f']
const SW_METAL = ['#f2c14e', '#e8a090', '#d9dde6', '#f4f6fb']

const RARITY: Record<Rarity, number> = { comum: 0.5, raro: 2, epico: 3, lendario: 4 }

const ICON: Record<string, string> = {
  corset: '💗', aline: '🎀', tutu: '🩰', ballgown: '👗', gloves: '🧤', stockings: '🧦',
  pearl_choker: '📿', ribbon_choker: '🎗️', layered_gold: '⛓️', pearl_studs: '🫧', heart_hoops: '💞', big_hoops: '⭕',
  chandelier_drops: '💎', tennis_bracelet: '🔗', bangle_stack: '🥏', heart_ring: '💍', cocktail_ring: '💠',
  tiara: '👑', hair_bow: '🎀', star_pins: '⭐',
}
const SLOT_ICON: Partial<Record<ItemSlot, string>> = { top: '👚', bottom: '👗', dress: '👗', gloves: '🧤', legwear: '🧦', neck: '📿', ears: '✨', head: '👑', wrist: '🔗', finger: '💍', shoes: '👠' }
const HAIR_ICON: Record<string, string> = { 'hair.meshyUpdo': '👸', 'hair.chestnutWaves': '🌊', 'hair.platinumUndercut': '⚡', 'hair.caramelCurls': '🍯' }

/** Reserva enquanto o manifesto do catálogo não carregou: id, rótulo, slot, cor-base. */
const FALLBACK: { id: string; label: string; slot: ItemSlot; color: string }[] = [
  { id: 'corset', label: 'Espartilho coração', slot: 'top', color: '#ff3f8e' },
  { id: 'aline', label: 'Saia midi evasê', slot: 'bottom', color: '#c8a4ff' },
  { id: 'tutu', label: 'Saia tutu', slot: 'bottom', color: '#ffb3d1' },
  { id: 'ballgown', label: 'Saia de baile rococó', slot: 'bottom', color: '#fff0f6' },
  { id: 'pearl_choker', label: 'Gargantilha de pérolas', slot: 'neck', color: '#fdf3ee' },
  { id: 'pearl_studs', label: 'Brincos de pérola', slot: 'ears', color: '#fdf3ee' },
  { id: 'heart_hoops', label: 'Argolas com coração', slot: 'ears', color: '#e8a090' },
  { id: 'tiara', label: 'Tiara de cristais', slot: 'head', color: '#d9dde6' },
  { id: 'hair_bow', label: 'Laço de cabelo', slot: 'head', color: '#ff5fa8' },
  { id: 'heart_ring', label: 'Anel de coração', slot: 'finger', color: '#ff7fc0' },
]

const CATEGORY: Partial<Record<ItemSlot, CatalogItem['category']>> = {
  top: 'top', bottom: 'bottom', dress: 'bottom',
  neck: 'jewelry', ears: 'jewelry', wrist: 'jewelry', finger: 'jewelry',
  head: 'accessory', gloves: 'accessory', legwear: 'accessory',
}

function toItem(id: string, label: string, slot: ItemSlot, color: string, swatches: string[]): CatalogItem | null {
  const category = CATEGORY[slot]
  if (!category) return null // sapatos: ainda sem seletor
  const t = tagsOf(id)
  return { id, label, category, slot, tags: t.styles, formality: t.formality, rarity: RARITY[t.rarity], color, swatches, icon: ICON[id] ?? SLOT_ICON[slot] ?? '✨' }
}

function fromReal(it: RealItem): CatalogItem | null {
  const m0 = it.mats[0]
  const sw = m0 ? (it.kind === 'garment' ? SW_GARMENT : m0.swatches.length ? m0.swatches : SW_METAL) : SW_GARMENT
  return toItem(it.id, it.label, it.slot, m0?.color ?? '#ffffff', sw)
}

let cache: { loaded: boolean; list: CatalogItem[] } | null = null

/** Itens disponíveis (hoje: todos os do manifesto; futuramente: inventário do perfil). */
export function getCatalog(): CatalogItem[] {
  const { loaded, items } = useCatalogStore.getState()
  if (cache && cache.loaded === loaded) return cache.list
  const hair: CatalogItem[] = hairStyles().map((w) => {
    const t = tagsOf(w.id)
    return { id: w.id, label: w.label, category: 'hair', slot: 'hair', tags: t.styles, formality: t.formality, rarity: RARITY[t.rarity], color: w.defaultColor, swatches: SW_HAIR, icon: HAIR_ICON[w.id] ?? '💇' }
  })
  const rest: CatalogItem[] = []
  if (loaded && Object.keys(items).length) {
    for (const it of Object.values(items)) {
      const c = fromReal(it)
      if (c) rest.push(c)
    }
  } else {
    for (const f of FALLBACK) {
      const c = toItem(f.id, f.label, f.slot, f.color, f.slot === 'top' || f.slot === 'bottom' ? SW_GARMENT : SW_METAL)
      if (c) rest.push(c)
    }
  }
  cache = { loaded, list: [...hair, ...rest] }
  return cache.list
}

export const catalogByCategory = (c: CatalogItem['category']) => getCatalog().filter((i) => i.category === c)
export const catalogItem = (id: string | null | undefined): CatalogItem | undefined => (id ? getCatalog().find((i) => i.id === id) : undefined)

// ----------------------------------------------------------------- look <-> aparência

function refFor(id: string, color: string): ItemRef {
  const real = getCatalogItem(id)
  if (!real) return { id, colors: [color] }
  return {
    id,
    colors: real.mats.map((m, i) => (i === 0 ? color : m.color)),
    finishes: real.kind === 'garment' ? real.mats.map((m) => m.finish) : undefined,
  }
}

export function lookFromAppearance(a: Appearance): Look {
  const pick = (r?: ItemRef) => {
    const c = r && catalogItem(r.id)
    return r && c ? { id: c.id, color: r.colors?.[0] ?? c.color } : null
  }
  const extra: { id: string; color: string }[] = []
  for (const r of [a.outfit.gloves, a.outfit.legwear, ...a.accessories]) {
    const c = r && catalogItem(r.id)
    if (r && c) extra.push({ id: c.id, color: r.colors?.[0] ?? c.color })
  }
  return {
    hairId: a.hair.id,
    hairColor: a.hair.color,
    top: pick(a.outfit.top),
    bottom: pick(a.outfit.bottom),
    dress: pick(a.outfit.dress),
    jewelry: extra.filter((x) => catalogItem(x.id)?.category === 'jewelry'),
    accessories: extra.filter((x) => catalogItem(x.id)?.category === 'accessory'),
    suitColor: a.suit.color,
    suitFinish: a.suit.finish,
    lipsColor: a.lips?.color ?? '#da7076',
    lipsGloss: a.lips?.gloss ?? 0.5,
  }
}

/** Aparência 3D do look (sobre corpo/pele/morphs/sapatos da `base` do jogador). */
export function lookToAppearance(look: Look, base: Appearance): Appearance {
  const outfit: Appearance['outfit'] = {}
  if (base.outfit.shoes) outfit.shoes = base.outfit.shoes
  if (look.dress) outfit.dress = refFor(look.dress.id, look.dress.color)
  else {
    if (look.top) outfit.top = refFor(look.top.id, look.top.color)
    if (look.bottom) outfit.bottom = refFor(look.bottom.id, look.bottom.color)
  }
  const accessories: ItemRef[] = []
  for (const p of [...look.jewelry, ...look.accessories]) {
    const slot = catalogItem(p.id)?.slot
    if (slot === 'gloves') outfit.gloves = refFor(p.id, p.color)
    else if (slot === 'legwear') outfit.legwear = refFor(p.id, p.color)
    else accessories.push(refFor(p.id, p.color))
  }
  return {
    ...base,
    suit: { color: look.suitColor, finish: look.suitFinish },
    lips: { color: look.lipsColor, gloss: look.lipsGloss },
    hair: { id: look.hairId, color: look.hairColor },
    outfit,
    accessories,
  }
}

/** Cores dominantes do look (entrada da nota de harmonia). */
export function lookColors(look: Look): string[] {
  const out = [look.hairColor, look.suitColor, look.lipsColor]
  for (const p of [look.top, look.bottom, look.dress]) if (p) out.push(p.color)
  return out
}
