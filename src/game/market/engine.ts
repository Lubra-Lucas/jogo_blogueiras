import { MARKET_CFG } from './cfg.ts'
import { EDITIONS, EDITION_BY_ID } from './editions.ts'
import { baseValue, expectedTrades, fairValue, hypeSum, rollHype, stepPrice } from './priceModel.ts'
import { clamp, gauss, poisson, seeded, type Rng } from './rng.ts'
import type { Bid, DayPoint, EditionDef, Hype, Listing, MarketEvent, Result } from './types.ts'

/**
 * Motor do mercado simulado (puro, sem React/zustand/localStorage: roda no navegador e no Node).
 * O estado e um JSON (`MarketWorld`). Efeitos fora do motor (saldo, inventario) ficam no `LocalMarketService`.
 *
 * Tempo: `t` em DIAS DE MERCADO (1 dia = `dayMs` reais). Prazos de anuncio/ofertas e trava usam ms reais (`ms`).
 * Ordem de cada dia: humor -> eventos de hype -> aposentadoria -> cunhagem NPC -> valor justo -> preco -> negocios
 * -> historico -> livro de ordens NPC renovado. Entre dias, "ticks" cruzam as ordens do jogador com o fluxo NPC.
 */
export interface EdState {
  P: number
  F: number
  minted: number
  retired: boolean
  retireDay: number | null
  announceDay: number | null
  hype: Hype[]
  asks: Listing[]
  bids: Bid[]
  hist: DayPoint[]
}

export interface MarketStats {
  /** Brilhos queimados em taxas (vendas do jogador) */
  feeBurned: number
  /** Brilhos que traders NPC pagaram ao jogador (torneira) */
  npcPaid: number
  /** Brilhos que o jogador pagou a traders NPC (ralo) */
  npcReceived: number
  budgetDay: number
  budgetUsed: number
  trades: number
}

export interface MarketWorld {
  v: 1
  /** dia de mercado (inteiro) */
  t: number
  /** passo intradia atual (0..ticksPerDay-1) */
  sub: number
  ms: number
  mood: number
  nextId: number
  eds: Record<string, EdState>
  stats: MarketStats
}

export interface Ctx {
  rng: Rng
  /** serial ja pertence ao jogador (ou esta reservado)? */
  taken(editionId: string, serial: number): boolean
}

const NPC_NAMES = ['cecilia.vintage', 'Atelier Mari', 'bia.closet', 'Rafa Colecionador', 'lojinha da Nina', 'Duda Leilões', 'Helena.m', 'closet.da.gabi', 'Teo Raridades', 'Iris & Co.', 'luluzinha_97', 'Ateliê Pérola']
export const npcName = (r: Rng) => NPC_NAMES[Math.floor(r() * NPC_NAMES.length)]

const uid = (w: MarketWorld, p: string) => `${p}${(w.nextId++).toString(36)}`

/* ---------------------------------------------------------------- criacao */

export function newEdState(d: EditionDef): EdState {
  const minted = d.retired ? d.cap : Math.max(1, Math.round(d.cap * d.mintedStart))
  const F = fairValue(d, { minted, retired: !!d.retired, retiredFor: d.retired ? d.ageDays * 0.4 : 0, hype: 0, mood: 0 })
  return { P: F, F, minted, retired: !!d.retired, retireDay: d.retired ? -d.ageDays * 0.4 : null, announceDay: null, hype: [], asks: [], bids: [], hist: [] }
}

export function createWorld(nowMs: number, ctx: Ctx): MarketWorld {
  const w: MarketWorld = {
    v: 1,
    t: 0,
    sub: 0,
    ms: nowMs,
    mood: 0,
    nextId: 1,
    eds: {},
    stats: { feeBurned: 0, npcPaid: 0, npcReceived: 0, budgetDay: 0, budgetUsed: 0, trades: 0 },
  }
  for (const d of EDITIONS) w.eds[d.id] = newEdState(d)
  // pre-historico: a primeira abertura ja mostra um mercado "vivo"
  const dayMs = MARKET_CFG.dayMs
  w.ms = nowMs - MARKET_CFG.preHistoryDays * dayMs
  for (let i = 0; i < MARKET_CFG.preHistoryDays; i++) {
    w.ms += dayMs
    dailyStep(w, ctx, [])
  }
  w.ms = nowMs
  return w
}

/** edicoes novas no catalogo entram em mundos antigos (preco no valor justo, sem historico) */
export function ensureEditions(w: MarketWorld): void {
  for (const d of EDITIONS) if (!w.eds[d.id]) w.eds[d.id] = newEdState(d)
}

/* ---------------------------------------------------------------- dia */

function medianClose(e: EdState, n = 7): number {
  const xs = e.hist.slice(-n).map((p) => p.c).sort((a, b) => a - b)
  if (!xs.length) return e.P
  const m = Math.floor(xs.length / 2)
  return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2
}

export function dailyStep(w: MarketWorld, ctx: Ctx, out: MarketEvent[]): void {
  const day = w.t + 1
  w.t = day
  w.stats.budgetDay = day
  w.stats.budgetUsed = 0
  const rm = seeded('mood', day)
  w.mood = clamp(w.mood * 0.9 + 0.02 * gauss(rm), -0.12, 0.12)

  for (const d of EDITIONS) {
    const e = w.eds[d.id]
    const r = seeded(d.id, day)
    // hype: limpa o que ja decaiu e sorteia um novo
    e.hype = e.hype.filter((h) => Math.abs(h.amount) * Math.pow(0.5, (day - h.startDay) / h.halfLife) > 0.012)
    const h = rollHype(d, e.retired, e.announceDay !== null || !!d.reserved, 1 - e.minted / d.cap, day, r)
    if (h) {
      e.hype.push(h)
      if (h.kind === 'aposentadoria') e.announceDay = day
      out.push({ type: 'hype', editionId: d.id, text: h.text, amount: h.amount })
    }
    // aposentadoria anunciada ou esgotada
    if (!e.retired && e.announceDay !== null && day - e.announceDay >= 3) retire(e, d, day, 'anunciada', out)
    // cunhagem NPC (para de vez quando aposentada)
    if (!e.retired) {
      const npcCap = d.cap - (d.reserved ?? 0)
      const n = Math.max(0, Math.min(npcCap - e.minted, poisson(r, (npcCap - e.minted) * 0.007 + 0.05)))
      e.minted += n
      if (e.minted >= d.cap) retire(e, d, day, 'esgotada', out)
    }
    e.F = fairValue(d, { minted: e.minted, retired: e.retired, retiredFor: e.retired ? day - (e.retireDay ?? day) : 0, hype: hypeSum(e.hype, day), mood: w.mood })
    e.P = stepPrice(e.P, e.F, d, r)
    // negocios do dia
    const lam = expectedTrades(d, hypeSum(e.hype, day))
    const n = poisson(r, lam)
    const open = e.P
    let hi = e.P
    let lo = e.P
    let close = e.P
    for (let i = 0; i < n; i++) {
      const p = e.P * Math.exp(0.012 * gauss(r))
      hi = Math.max(hi, p)
      lo = Math.min(lo, p)
      close = p
    }
    e.hist.push({ d: day, o: Math.round(open), h: Math.round(hi), l: Math.round(lo), c: Math.round(close), v: n })
    if (e.hist.length > MARKET_CFG.historyDays) e.hist.splice(0, e.hist.length - MARKET_CFG.historyDays)
    refreshBook(w, d, e, r, ctx, out)
  }
}

/** aposentar = nenhuma copia nova, nunca mais; o teto efetivo passa a ser o total ja cunhado */
function retire(e: EdState, d: EditionDef, day: number, reason: 'esgotada' | 'anunciada', out: MarketEvent[]) {
  e.retired = true
  e.retireDay = day
  out.push({ type: 'retired', editionId: d.id, reason })
}

/** renova o livro NPC (anuncios e ofertas) em torno do preco; ordens do jogador permanecem */
function refreshBook(w: MarketWorld, d: EditionDef, e: EdState, r: Rng, ctx: Ctx, out: MarketEvent[]) {
  const lam = expectedTrades(d, hypeSum(e.hype, w.t))
  const nAsk = clamp(Math.round(3 + lam * 1.2), 3, 9)
  const nBid = clamp(Math.round(2 + lam * 0.9), 2, 7)
  e.asks = e.asks.filter((a) => a.mine)
  e.bids = e.bids.filter((b) => b.mine)
  const usedSerials = new Set(e.asks.map((a) => a.serial))
  for (let i = 0; i < nAsk; i++) {
    const serial = freeSerial(e, d, ctx, usedSerials, r)
    if (serial === null) break
    usedSerials.add(serial)
    const price = Math.max(MARKET_CFG.minPrice, Math.round(e.P * (1.015 + Math.abs(gauss(r)) * 0.045)))
    e.asks.push({ id: uid(w, 'L'), editionId: d.id, serial, price, seller: npcName(r), mine: false, createdMs: w.ms, expiresMs: w.ms + 3 * MARKET_CFG.dayMs })
  }
  for (let i = 0; i < nBid; i++) {
    const price = Math.max(MARKET_CFG.minPrice, Math.round(e.P * (0.985 - Math.abs(gauss(r)) * 0.05)))
    e.bids.push({ id: uid(w, 'B'), editionId: d.id, price, mine: false, createdMs: w.ms, expiresMs: w.ms + 3 * MARKET_CFG.dayMs })
  }
  e.asks.sort((a, b) => a.price - b.price)
  e.bids.sort((a, b) => b.price - a.price)
  // ofertas do jogador cruzando com os novos anuncios NPC
  for (const b of e.bids.filter((x) => x.mine)) crossBid(w, d, e, b, ctx, out)
}

function freeSerial(e: EdState, d: EditionDef, ctx: Ctx, used: Set<number>, r: Rng): number | null {
  for (let i = 0; i < 30; i++) {
    const s = 1 + Math.floor(r() * Math.max(1, Math.min(e.minted, d.cap)))
    if (!used.has(s) && !ctx.taken(d.id, s)) return s
  }
  for (let s = 1; s <= e.minted; s++) if (!used.has(s) && !ctx.taken(d.id, s)) return s
  return null
}

/** impacto do negocio do jogador no preco (puxa P na direcao do preco negociado) */
function impact(w: MarketWorld, e: EdState, price: number) {
  const p = Math.max(1, price)
  e.P = clamp(e.P * Math.exp(0.15 * Math.log(p / e.P)), 0.55 * e.F, 1.8 * e.F)
  const last = e.hist[e.hist.length - 1]
  if (last) {
    last.c = Math.round(p)
    last.h = Math.max(last.h, Math.round(p))
    last.l = Math.min(last.l, Math.round(p))
    last.v += 1
  }
  w.stats.trades++
}

/* ---------------------------------------------------------------- tick intradia */

function hazardBuy(ask: number, P: number, lam: number, cheaper: number, ticks: number): number {
  const ratio = ask / P
  if (ratio > 1.6) return 0
  const base = (lam / ticks) * (ratio < 1 ? 1.3 : 1) * Math.exp(-18 * Math.max(0, ratio - 1))
  return base / (1 + 0.6 * cheaper)
}
const hazardSell = (bid: number, P: number, lam: number, higher: number, ticks: number): number => {
  const ratio = bid / P
  if (ratio < 0.5) return 0
  return ((lam / ticks) * (ratio > 1 ? 1.3 : 1) * Math.exp(-18 * Math.max(0, 1 - ratio))) / (1 + 0.6 * higher)
}

/** avanca o mundo ate `nowMs` (dias, ticks, expiracao). Devolve eventos para o servico aplicar. */
export function advance(w: MarketWorld, nowMs: number, ctx: Ctx): MarketEvent[] {
  const out: MarketEvent[] = []
  const dayMs = MARKET_CFG.dayMs
  const tickMs = dayMs / MARKET_CFG.ticksPerDay
  let guard = MARKET_CFG.maxCatchUpDays * MARKET_CFG.ticksPerDay
  if (nowMs - w.ms > guard * tickMs) w.ms = nowMs - guard * tickMs
  while (w.ms + tickMs <= nowMs && guard-- > 0) {
    w.ms += tickMs
    if (++w.sub >= MARKET_CFG.ticksPerDay) {
      w.sub = 0
      dailyStep(w, ctx, out)
    }
    tick(w, ctx, out)
  }
  return out
}

function tick(w: MarketWorld, ctx: Ctx, out: MarketEvent[]) {
  const ticks = MARKET_CFG.ticksPerDay
  for (const d of EDITIONS) {
    const e = w.eds[d.id]
    const lam = expectedTrades(d, hypeSum(e.hype, w.t))
    // anuncios do jogador
    for (const a of e.asks.filter((x) => x.mine)) {
      if (w.ms >= a.expiresMs) {
        e.asks = e.asks.filter((x) => x !== a)
        out.push({ type: 'listing_expired', listingId: a.id, editionId: d.id, instanceId: a.instanceId ?? '' })
        continue
      }
      const cheaper = e.asks.filter((x) => x.price < a.price).length
      const h = hazardBuy(a.price, e.P, lam, cheaper, ticks)
      if (w.stats.budgetUsed + a.price > MARKET_CFG.npcDailyBuyBudget) continue
      if (ctx.rng() < 1 - Math.exp(-h)) {
        e.asks = e.asks.filter((x) => x !== a)
        const fee = feeOf(a.price)
        w.stats.budgetUsed += a.price
        w.stats.npcPaid += a.price - fee
        w.stats.feeBurned += fee
        impact(w, e, a.price)
        out.push({ type: 'sold', listingId: a.id, editionId: d.id, serial: a.serial, instanceId: a.instanceId ?? '', price: a.price, fee, net: a.price - fee, buyer: npcName(ctx.rng) })
      }
    }
    // ofertas do jogador
    for (const b of e.bids.filter((x) => x.mine)) {
      if (w.ms >= b.expiresMs) {
        e.bids = e.bids.filter((x) => x !== b)
        out.push({ type: 'bid_expired', bidId: b.id, editionId: d.id, refund: b.price })
        continue
      }
      if (crossBid(w, d, e, b, ctx, out)) continue
      const higher = e.bids.filter((x) => x.price > b.price).length
      const h = hazardSell(b.price, e.P, lam, higher, ticks)
      if (ctx.rng() < 1 - Math.exp(-h)) fillBid(w, d, e, b, Math.min(b.price, Math.round(e.P * 1.03)), npcName(ctx.rng), ctx, out)
    }
  }
}

/** oferta do jogador >= menor anuncio NPC: executa ao preco do anuncio */
function crossBid(w: MarketWorld, d: EditionDef, e: EdState, b: Bid, ctx: Ctx, out: MarketEvent[]): boolean {
  const ask = e.asks.find((a) => !a.mine && a.price <= b.price)
  if (!ask) return false
  e.asks = e.asks.filter((a) => a !== ask)
  fillBid(w, d, e, b, ask.price, ask.seller, ctx, out, ask.serial)
  return true
}

function fillBid(w: MarketWorld, d: EditionDef, e: EdState, b: Bid, price: number, seller: string, ctx: Ctx, out: MarketEvent[], serial?: number) {
  const s = serial ?? freeSerial(e, d, ctx, new Set(e.asks.map((a) => a.serial)), ctx.rng)
  if (s === null) return
  e.bids = e.bids.filter((x) => x !== b)
  w.stats.npcReceived += price
  impact(w, e, price)
  out.push({ type: 'bid_filled', bidId: b.id, editionId: d.id, serial: s, price, refund: b.price - price, seller })
}

/* ---------------------------------------------------------------- operacoes do jogador */

export const feeOf = (price: number) => Math.max(1, Math.floor(price * MARKET_CFG.feePct))

export function priceBand(w: MarketWorld, editionId: string): [number, number] {
  const m = medianClose(w.eds[editionId])
  return [Math.max(MARKET_CFG.minPrice, Math.ceil(m * MARKET_CFG.priceBand[0])), Math.min(MARKET_CFG.maxPrice, Math.floor(m * MARKET_CFG.priceBand[1]))]
}

export function checkPrice(w: MarketWorld, editionId: string, price: number): Result<never> | null {
  if (!Number.isInteger(price) || price < MARKET_CFG.minPrice) return { ok: false, code: 'preco', message: `Preço mínimo: ${MARKET_CFG.minPrice} Brilhos.` }
  const [lo, hi] = priceBand(w, editionId)
  if (price < lo || price > hi) return { ok: false, code: 'preco', message: `Preço fora da faixa permitida (${lo.toLocaleString('pt-BR')} a ${hi.toLocaleString('pt-BR')} Brilhos), para proteger contra golpes.` }
  return null
}

export function createListing(w: MarketWorld, instance: { id: string; editionId: string; serial: number }, price: number, durMs: number): Result<Listing> {
  const e = w.eds[instance.editionId]
  if (!e) return { ok: false, code: 'inexistente', message: 'Edição desconhecida.' }
  const bad = checkPrice(w, instance.editionId, price)
  if (bad) return bad
  if (Object.values(w.eds).reduce((n, x) => n + x.asks.filter((a) => a.mine).length, 0) >= MARKET_CFG.maxPlayerListings)
    return { ok: false, code: 'limite', message: `Limite de ${MARKET_CFG.maxPlayerListings} anúncios ativos.` }
  const l: Listing = { id: uid(w, 'L'), editionId: instance.editionId, serial: instance.serial, price, seller: 'você', mine: true, instanceId: instance.id, createdMs: w.ms, expiresMs: w.ms + durMs }
  e.asks.push(l)
  e.asks.sort((a, b) => a.price - b.price)
  return { ok: true, message: 'Anúncio publicado.', data: l }
}

export function cancelListing(w: MarketWorld, id: string): Listing | null {
  for (const e of Object.values(w.eds)) {
    const l = e.asks.find((a) => a.id === id && a.mine)
    if (l) {
      e.asks = e.asks.filter((a) => a !== l)
      return l
    }
  }
  return null
}

/** compra de um anuncio NPC (o servico ja debitou o saldo) */
export function takeListing(w: MarketWorld, id: string): Listing | null {
  for (const e of Object.values(w.eds)) {
    const l = e.asks.find((a) => a.id === id && !a.mine)
    if (l) {
      e.asks = e.asks.filter((a) => a !== l)
      w.stats.npcReceived += l.price
      impact(w, e, l.price)
      return l
    }
  }
  return null
}

export function findListing(w: MarketWorld, id: string): Listing | null {
  for (const e of Object.values(w.eds)) {
    const l = e.asks.find((a) => a.id === id)
    if (l) return l
  }
  return null
}

export function createBid(w: MarketWorld, editionId: string, price: number, durMs: number): Result<Bid> {
  const e = w.eds[editionId]
  if (!e) return { ok: false, code: 'inexistente', message: 'Edição desconhecida.' }
  const bad = checkPrice(w, editionId, price)
  if (bad) return bad
  if (Object.values(w.eds).reduce((n, x) => n + x.bids.filter((b) => b.mine).length, 0) >= MARKET_CFG.maxPlayerBids)
    return { ok: false, code: 'limite', message: `Limite de ${MARKET_CFG.maxPlayerBids} ofertas ativas.` }
  const b: Bid = { id: uid(w, 'B'), editionId, price, mine: true, createdMs: w.ms, expiresMs: w.ms + durMs }
  e.bids.push(b)
  e.bids.sort((a, c) => c.price - a.price)
  return { ok: true, message: 'Oferta registrada.', data: b }
}

export function cancelBid(w: MarketWorld, id: string): Bid | null {
  for (const e of Object.values(w.eds)) {
    const b = e.bids.find((x) => x.id === id && x.mine)
    if (b) {
      e.bids = e.bids.filter((x) => x !== b)
      return b
    }
  }
  return null
}

/** menor anuncio NPC (para "comprar agora" a partir de uma oferta) */
export const bestAsk = (w: MarketWorld, editionId: string): Listing | null => w.eds[editionId].asks.find((a) => !a.mine) ?? null

/** cunha a proxima copia para missoes/eventos; null se aposentada ou esgotada */
export function mintSerial(w: MarketWorld, editionId: string, taken?: (serial: number) => boolean): number | null {
  const e = w.eds[editionId]
  const d = EDITION_BY_ID[editionId]
  if (!e || !d || e.retired || e.minted >= d.cap) return null
  do e.minted++
  while (taken?.(e.minted) && e.minted < d.cap)
  if (taken?.(e.minted)) return null
  if (e.minted >= d.cap) {
    e.retired = true
    e.retireDay = w.t
  }
  return e.minted
}

/** valor de referencia de uma edicao hoje (para vitrine/patrimonio) */
export const marketValue = (w: MarketWorld, editionId: string): number => Math.round(w.eds[editionId]?.P ?? baseValue(EDITION_BY_ID[editionId]))
