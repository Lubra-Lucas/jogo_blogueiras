/** Tipos compartilhados da economia. */
export type Currency = 'brilhos' | 'diamantes'

export const CURRENCY_LABEL: Record<Currency, string> = { brilhos: 'Brilhos', diamantes: 'Diamantes' }

/** Como o item chega ao jogador. */
export type Availability = 'inicial' | 'loja' | 'exclusivo' | 'evento' | 'missao'

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  inicial: 'Inicial',
  loja: 'Loja',
  exclusivo: 'Exclusivo',
  evento: 'Evento',
  missao: 'Missão',
}

export type ShopId = 'boutique' | 'joalheria' | 'salao' | 'concessionaria' | 'imobiliaria'

/** Categoria de produto (roupas/joias/cabelos hoje; carros/casas/moveis em breve). */
export type ProductKind = 'hair' | 'garment' | 'jewelry' | 'car' | 'house' | 'furniture'

export interface Wallet {
  brilhos: number
  diamantes: number
}

export interface Offer {
  currency: Currency
  price: number
  /** preco cheio antes da promocao */
  original?: number
}

export type ItemState =
  /** o jogador ja possui */
  | 'owned'
  /** pode comprar agora */
  | 'buyable'
  /** exclusivo ainda nao lancado */
  | 'upcoming'
  /** nao se compra (evento/missao/em breve) */
  | 'locked'

export interface ItemStatus {
  id: string
  availability: Availability
  state: ItemState
  offers: Offer[]
  /** exclusivo em janela de Diamantes: quando passa a poder ser comprado com Brilhos */
  windowEndsAt?: number
  /** exclusivo ainda nao lancado: quando abre */
  releasesAt?: number
  /** promocao do dia (percentual) */
  dealPct?: number
  /** texto curto para itens nao compraveis ("Recompensa da missão ...") */
  note?: string
  /** item vendido so como edicao limitada: id da edicao (abre o Mercado) */
  marketEdition?: string
  /** item com "Em breve" no gameplay (carros/casas) */
  soon?: boolean
}

export interface LedgerEntry {
  id: number
  t: number
  currency: Currency
  /** positivo = entrada, negativo = saida */
  amount: number
  reason: string
  balance: number
}
