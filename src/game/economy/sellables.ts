import { useMemo } from 'react'
import { useCatalogStore, type CatalogItem, type ItemSlot } from '../character/catalog'
import { WEARABLES } from '../character/items'
import { tagsOf, type Rarity, type StyleTag } from '../character/itemTags'
import { useProfileStore } from '../../state/profileStore'
import { editionsOfItem, getEdition } from '../market/editions'
import { useInventory } from '../market/inventory'
import { dayKey, economyNow, hash, nextMidnight } from './clock'
import { bigTicketById, bigTickets, isBigTicket } from './bigTickets'
import { LAUNCH_MS, NEWEST_FIRST, OVERRIDES, STARTER_ITEMS, WEEK_MS, basePrice, type EconomyOverride } from './prices'
import type { Availability, ItemStatus, Offer, ProductKind, ShopId } from './types'

/** Um produto vendavel (cabelo, roupa, joia, carro, casa) com metadados de loja. */
export interface Sellable {
  id: string
  label: string
  kind: ProductKind
  slot: ItemSlot | null
  rarity: Rarity
  styles: StyleTag[]
  colors: string[]
  tint: string
  shop: ShopId
  availability: Availability
  novo: boolean
  blurb?: string
}

const SHOP_OF: Record<string, ShopId> = { hair: 'salao', garment: 'boutique', jewelry: 'joalheria', car: 'concessionaria', house: 'imobiliaria' }

/** Configuracao efetiva de economia de um item (tabela + padrao por raridade). */
export function overrideOf(id: string): EconomyOverride & { availability: Availability } {
  const o = OVERRIDES[id]
  return { availability: 'loja', ...o }
}

function fromCatalog(it: CatalogItem, order: number): Sellable {
  const t = tagsOf(it.id)
  const o = overrideOf(it.id)
  return {
    id: it.id,
    label: it.label,
    kind: it.kind,
    slot: it.slot,
    rarity: t.rarity,
    styles: t.styles,
    colors: t.colors,
    tint: it.mats[0]?.color ?? '#c9a8d8',
    shop: SHOP_OF[it.kind],
    availability: o.availability,
    // itens fora da tabela (chegaram em manifestos novos) contam como novidade
    novo: !!o.novo || !(it.id in OVERRIDES) || NEWEST_FIRST.includes(it.id) || order < 0,
  }
}

/** Todos os produtos de roupa/joia/cabelo (cabelos do registro estatico + catalogo carregado). */
export function buildSellables(items: Record<string, CatalogItem>): Sellable[] {
  const hairs: Sellable[] = Object.values(WEARABLES)
    .filter((w) => w.slot === 'hair')
    .map((w) => {
      const t = tagsOf(w.id)
      const o = overrideOf(w.id)
      return { id: w.id, label: w.label, kind: 'hair' as const, slot: 'hair' as const, rarity: t.rarity, styles: t.styles, colors: t.colors, tint: w.defaultColor, shop: 'salao' as const, availability: o.availability, novo: !!o.novo }
    })
  const rest = Object.values(items).map((it, i) => fromCatalog(it, i))
  const big: Sellable[] = bigTickets().map((b) => ({ id: b.id, label: b.label, kind: b.kind, slot: null, rarity: b.rarity, styles: [], colors: [], tint: b.tint, shop: SHOP_OF[b.kind], availability: 'loja' as const, novo: false, blurb: b.blurb }))
  return [...hairs, ...rest, ...big]
}

export { isBigTicket }

export function useSellables(): Sellable[] {
  const items = useCatalogStore((s) => s.items)
  return useMemo(() => buildSellables(items), [items])
}

/** Ofertas do dia: 3 itens de loja (Brilhos), sorteio determinístico pela data. */
export function dailyDeals(list: Sellable[], now = economyNow()): Map<string, number> {
  const key = dayKey(now)
  const eligible = list.filter((s) => s.availability === 'loja' && !isBigTicket(s.id) && !STARTER_ITEMS.includes(s.id))
  const sorted = [...eligible].sort((a, b) => hash(`${key}:${a.id}`) - hash(`${key}:${b.id}`)).slice(0, 3)
  const pcts = [30, 25, 20]
  return new Map(sorted.map((s, i) => [s.id, pcts[i]]))
}

export const dealsEndAt = (now = economyNow()) => nextMidnight(now)

export function weekIndex(now = economyNow()): number {
  return Math.floor((now - LAUNCH_MS) / WEEK_MS)
}

/** Estado de venda de um produto agora (puro: recebe o conjunto de itens possuidos e as promocoes). */
export function statusOf(s: Sellable, owned: ReadonlySet<string>, deals: ReadonlyMap<string, number>, now = economyNow()): ItemStatus {
  const o = overrideOf(s.id)
  const base: ItemStatus = { id: s.id, availability: s.availability, state: 'locked', offers: [] }
  if (owned.has(s.id)) return { ...base, state: 'owned' }
  const eds = editionsOfItem(s.id)
  if (eds.length) return { ...base, note: 'Edição limitada — no Mercado', marketEdition: eds[0].id }

  const b = bigTicketById(s.id)
  if (b) {
    const offers: Offer[] = []
    if (b.brilhos) offers.push({ currency: 'brilhos', price: b.brilhos })
    if (b.diamantes) offers.push({ currency: 'diamantes', price: b.diamantes })
    return b.live ? { ...base, state: 'buyable', offers } : { ...base, offers, soon: true, note: 'Em breve' }
  }

  const priceB = o.brilhos ?? basePrice(s.rarity, s.slot ?? 'top', 'brilhos')
  const priceD = o.diamantes ?? basePrice(s.rarity, s.slot ?? 'top', 'diamantes')

  switch (s.availability) {
    case 'inicial':
      return { ...base, state: 'owned' }
    case 'loja': {
      const pct = deals.get(s.id)
      const price = pct ? Math.round((priceB * (100 - pct)) / 100 / 5) * 5 : priceB
      return { ...base, state: 'buyable', offers: [{ currency: 'brilhos', price, original: pct ? priceB : undefined }], dealPct: pct }
    }
    case 'exclusivo': {
      const rel = LAUNCH_MS + (o.releaseWeek ?? 0) * WEEK_MS
      if (now < rel) return { ...base, state: 'upcoming', releasesAt: rel, offers: [{ currency: 'diamantes', price: priceD }] }
      const end = rel + WEEK_MS
      if (now < end) return { ...base, state: 'buyable', offers: [{ currency: 'diamantes', price: priceD }], windowEndsAt: end }
      const after = o.brilhosAfter ?? Math.round((priceB * 1.35) / 10) * 10
      return {
        ...base,
        state: 'buyable',
        offers: [
          { currency: 'brilhos', price: after },
          { currency: 'diamantes', price: priceD },
        ],
      }
    }
    case 'evento':
      return { ...base, note: o.event ?? 'Disponível em eventos' }
    case 'missao':
      return { ...base, note: 'Recompensa de missão' }
  }
}

/** Itens em janela de Diamantes agora (para a vitrine "Exclusivos da semana") e proximos lancamentos. */
export function weeklyExclusives(list: Sellable[], now = economyNow()): { live: Sellable[]; next: Sellable[] } {
  const live: Sellable[] = []
  const next: Sellable[] = []
  for (const s of list) {
    if (s.availability !== 'exclusivo') continue
    const rel = LAUNCH_MS + (overrideOf(s.id).releaseWeek ?? 0) * WEEK_MS
    if (now < rel) next.push(s)
    else if (now < rel + WEEK_MS) live.push(s)
  }
  next.sort((a, b) => (overrideOf(a.id).releaseWeek ?? 0) - (overrideOf(b.id).releaseWeek ?? 0))
  return { live, next }
}

/** Hook: mapa de status por id, reativo a posse. */
export function useStatuses(list: Sellable[]): Map<string, ItemStatus> {
  const owned = useProfileStore((s) => s.owned)
  const instances = useInventory((s) => s.instances)
  return useMemo(() => {
    const set = new Set(owned)
    for (const i of Object.values(instances)) { const d = getEdition(i.editionId); if (d) set.add(d.itemId) }
    const deals = dailyDeals(list)
    const now = economyNow()
    return new Map(list.map((s) => [s.id, statusOf(s, set, deals, now)]))
  }, [list, owned, instances])
}
