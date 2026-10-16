import type { Rarity } from '../character/itemTags'
import { BIG_TICKETS, type BigTicket } from './prices'

/**
 * Itens de alto valor (carros/casas). Carros vêm do catálogo de veículos (`src/game/vehicles/catalog.ts`)
 * quando ele existe; senão usa os marcadores de `prices.ts`. O formato do catálogo é lido de forma
 * tolerante: procura um array exportado de objetos com `id` e usa (nome|label), (precoBrilhos|brilhos),
 * (precoDiamantes|diamantes), (raridade|rarity), (cor|cores[0]).
 */
const mods = import.meta.glob('/src/game/vehicles/catalog.ts', { eager: true }) as Record<string, Record<string, unknown>>

const RAR: Rarity[] = ['comum', 'raro', 'epico', 'lendario']
const asRarity = (r: unknown): Rarity => (typeof r === 'string' && (RAR as string[]).includes(r) ? (r as Rarity) : 'raro')

let cache: BigTicket[] | null = null

function vehicleCars(): BigTicket[] {
  const mod = Object.values(mods)[0]
  if (!mod) return []
  for (const v of Object.values(mod)) {
    const arr = Array.isArray(v) ? v : v && typeof v === 'object' && !('id' in (v as object)) ? Object.values(v as object) : null
    if (!arr || !arr.length || typeof (arr[0] as { id?: unknown })?.id !== 'string') continue
    return (arr as Array<Record<string, unknown>>).map((c) => {
      const cores = c.cores ?? c.colors
      return {
        id: String(c.id),
        kind: 'car' as const,
        label: String(c.nome ?? c.label ?? c.name ?? c.id),
        blurb: String(c.descricao ?? c.blurb ?? 'Para passear pela cidade.'),
        brilhos: Number(c.precoBrilhos ?? c.brilhos ?? c.priceBrilhos) || undefined,
        diamantes: Number(c.precoDiamantes ?? c.diamantes ?? c.priceDiamantes) || undefined,
        rarity: asRarity(c.raridade ?? c.rarity),
        tint: typeof c.cor === 'string' ? c.cor : Array.isArray(cores) && typeof cores[0] === 'string' ? cores[0] : '#8b8f99',
        live: true,
      }
    })
  }
  return []
}

/** Lista de carros e casas à venda. */
export function bigTickets(): BigTicket[] {
  if (cache) return cache
  const cars = vehicleCars()
  cache = [...(cars.length ? cars : BIG_TICKETS.filter((b) => b.kind === 'car')), ...BIG_TICKETS.filter((b) => b.kind === 'house')]
  return cache
}

export const bigTicketById = (id: string): BigTicket | undefined => bigTickets().find((b) => b.id === id)
export const isBigTicket = (id: string): boolean => !!bigTicketById(id)
