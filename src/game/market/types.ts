/** Tipos do mercado de edicoes limitadas. Moeda: SEMPRE Brilhos (nada aqui toca Diamantes nem dinheiro real). */
export type Rarity = 'comum' | 'raro' | 'epico' | 'lendario'
export type EditionKind = 'hair' | 'garment' | 'jewelry'
export type Origin = 'evento' | 'temporada' | 'ranking' | 'missao_dificil' | 'conquista'

export const ORIGIN_LABEL: Record<Origin, string> = {
  evento: 'Evento',
  temporada: 'Temporada',
  ranking: 'Ranking',
  missao_dificil: 'Missão difícil',
  conquista: 'Conquista',
}

export interface EditionDef {
  /** id estavel da edicao (ex.: 'ed.tiara_aurora') */
  id: string
  /** item-base do catalogo (cabelo/roupa/joia) */
  itemId: string
  kind: EditionKind
  name: string
  blurb: string
  origin: Origin
  /** texto de origem ("Temporada 1", "Top 3 da Passarela") */
  originNote: string
  /** teto de copias que existirao (serial #NNN/cap) */
  cap: number
  rarity: Rarity
  /** multiplicador de prestigio sobre o valor-base da raridade */
  prestige: number
  /** variacao de cor exclusiva (ItemRef.colors / finishes, na ordem dos slots do item) */
  colorway?: { colors: string[]; finishes?: string[] }
  /** cor de destaque do cartao (paleta de leilao) */
  tint: string
  /** copias reservadas a missoes/eventos: a cunhagem NPC nunca as consome e a edicao nao se aposenta sozinha enquanto houver reserva */
  reserved?: number
  /** ja nasce aposentada (nunca mais cunhada) */
  retired?: boolean
  /** parcela do teto ja cunhada na abertura do mercado (0..1) */
  mintedStart: number
  /** dias de idade do lancamento na abertura */
  ageDays: number
}

export interface EditionInstance {
  id: string
  editionId: string
  serial: number
  origin: Origin | 'mercado'
  mintedAt: number
  acquiredAt: number
  /** instante a partir do qual pode ser negociada */
  tradableAt: number
  /** id do anuncio ativo (peca em custodia) */
  listingId?: string
  /** dono original: 'mint' = recebida direto, 'mercado' = comprada */
  via: 'mint' | 'mercado'
}

export interface DayPoint {
  /** dia de mercado (inteiro) */
  d: number
  o: number
  h: number
  l: number
  c: number
  v: number
}

export interface Hype {
  kind: 'celebridade' | 'fim_temporada' | 'aposentadoria' | 'reedicao' | 'critica'
  amount: number
  startDay: number
  halfLife: number
  text: string
}

export interface Listing {
  id: string
  editionId: string
  serial: number
  price: number
  seller: string
  mine: boolean
  /** instancia do jogador (quando mine) */
  instanceId?: string
  createdMs: number
  expiresMs: number
}

export interface Bid {
  id: string
  editionId: string
  price: number
  mine: boolean
  createdMs: number
  expiresMs: number
}

export type MarketEvent =
  | { type: 'sold'; listingId: string; editionId: string; serial: number; instanceId: string; price: number; fee: number; net: number; buyer: string }
  | { type: 'bid_filled'; bidId: string; editionId: string; serial: number; price: number; refund: number; seller: string }
  | { type: 'listing_expired'; listingId: string; editionId: string; instanceId: string }
  | { type: 'bid_expired'; bidId: string; editionId: string; refund: number }
  | { type: 'hype'; editionId: string; text: string; amount: number }
  | { type: 'retired'; editionId: string; reason: 'esgotada' | 'anunciada' }
  | { type: 'announce'; editionId: string; text: string }

export type FailCode = 'saldo' | 'bloqueada' | 'inexistente' | 'preco' | 'limite' | 'esgotada' | 'anuncio' | 'proprio' | 'taxa' | 'erro'
export interface Result<T = unknown> {
  ok: boolean
  code?: FailCode
  message: string
  data?: T
}
