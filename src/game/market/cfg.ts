/**
 * Configuracao do mercado de edicoes limitadas. Tudo ajustavel aqui (ou por parametros de URL em dev):
 *  ?marketlock=<horas>   trava de troca (padrao 24; 0 desliga)
 *  ?marketday=<minutos>  duracao de um "dia de mercado" em tempo real (padrao 20)
 */
const q = (k: string): number | null => {
  try {
    if (typeof window === 'undefined') return null
    const v = new URLSearchParams(window.location.search).get(k)
    return v === null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)
  } catch {
    return null
  }
}

const HOUR = 3600_000

export const MARKET_CFG = {
  /** taxa do mercado sobre cada venda (sumidouro de Brilhos) */
  feePct: 0.05,
  /** peca recem-adquirida (compra/oferta) so pode ser negociada depois disso */
  tradeLockMs: (q('marketlock') ?? 24) * HOUR,
  /** peca entregue por missao/evento: mesma trava por padrao */
  grantLockMs: (q('marketlock') ?? 24) * HOUR,
  /** um dia de mercado em tempo real */
  dayMs: Math.max(0.2, q('marketday') ?? 20) * 60_000,
  /** passos intradia (cruzamento de ordens) por dia de mercado */
  ticksPerDay: 4,
  /** dias de historico guardados */
  historyDays: 60,
  /** dias simulados na primeira abertura */
  preHistoryDays: 35,
  /** maximo de dias recuperados ao voltar depois de um tempo fora */
  maxCatchUpDays: 40,
  maxVitrine: 6,
  maxPlayerListings: 12,
  maxPlayerBids: 12,
  /** faixa de preco aceita em relacao a mediana de 7 dias (anti-lavagem de valor / anti-golpe) */
  priceBand: [0.3, 3.5] as [number, number],
  minPrice: 10,
  maxPrice: 5_000_000,
  /** duracoes de anuncio/oferta (tempo real) */
  durations: [
    { id: '6h', label: '6 horas', ms: 6 * HOUR },
    { id: '24h', label: '24 horas', ms: 24 * HOUR },
    { id: '3d', label: '3 dias', ms: 72 * HOUR },
    { id: '7d', label: '7 dias', ms: 168 * HOUR },
  ],
  /** acima disso (Brilhos) ou 50% do saldo, a confirmacao pede um segundo passo */
  highValue: 1000,
  /** teto de compras pelos "traders" NPC por dia de mercado (Brilhos que o mercado injeta no jogador) */
  npcDailyBuyBudget: 40_000,
}

export const DAY_MS_DEFAULT = MARKET_CFG.dayMs
export const STORAGE = { inv: 'jb.market.inv.v1', world: 'jb.market.world.v1', meta: 'jb.market.meta.v1' } as const
