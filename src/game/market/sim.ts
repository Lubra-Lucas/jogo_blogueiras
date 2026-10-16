/**
 * Verificacao da simulacao de precos (roda no Node, sem navegador):
 *   node src/game/market/sim.ts [dias] [semente]
 * Simula N dias de mercado (padrao 60) com um "bot jogador" que anuncia e oferta, e imprime faixas de preco,
 * deriva do valor justo, volume e o balanco de Brilhos (taxa queimada x torneira dos traders NPC).
 */
declare const process: { argv: string[] }
import { MARKET_CFG } from './cfg.ts'
import { EDITIONS } from './editions.ts'
import { advance, bestAsk, createBid, createListing, createWorld, feeOf, takeListing, type Ctx } from './engine.ts'
import { mulberry32 } from './rng.ts'

const days = Number(process.argv[2]) || 60
const seed = Number(process.argv[3]) || 7
const rng = mulberry32(seed)
const owned = new Set<string>()
const key = (ed: string, s: number) => `${ed}#${s}`
const ctx: Ctx = { rng, taken: (ed, s) => owned.has(key(ed, s)) }

const T0 = 1_800_000_000_000
const w = createWorld(T0, ctx)
const start = Object.fromEntries(EDITIONS.map((d) => [d.id, { P: w.eds[d.id].P, F: w.eds[d.id].F }]))
const track: Record<string, { minR: number; maxR: number; minP: number; maxP: number; vol: number; retiredAt?: number }> = {}
for (const d of EDITIONS) track[d.id] = { minR: 9, maxR: 0, minP: 1e12, maxP: 0, vol: 0 }

// bot jogador
let wallet = 60_000
const start0 = wallet
const inv: Array<{ id: string; editionId: string; serial: number }> = []
const escrow = new Map<string, number>()
let n = 0
let hasListing = 0
let sold = 0
let bought = 0
let roundTripLoss = 0
const t0 = w.t
const ticks = days * MARKET_CFG.ticksPerDay
let now = T0
for (let i = 0; i < ticks; i++) {
  now += MARKET_CFG.dayMs / MARKET_CFG.ticksPerDay
  const ev = advance(w, now, ctx)
  for (const e of ev) {
    if (e.type === 'sold') {
      wallet += e.net
      sold++
      const k = inv.findIndex((x) => x.id === e.instanceId)
      if (k >= 0) inv.splice(k, 1)
      owned.delete(key(e.editionId, e.serial))
      hasListing--
    } else if (e.type === 'bid_filled') {
      wallet += e.refund
      inv.push({ id: `i${n++}`, editionId: e.editionId, serial: e.serial })
      owned.add(key(e.editionId, e.serial))
      bought++
    } else if (e.type === 'listing_expired') hasListing--
    else if (e.type === 'bid_expired') wallet += e.refund
    else if (e.type === 'retired') track[e.editionId].retiredAt ??= w.t - t0
  }
  if (i % 3 === 0) {
    // compra a mercado (a menor oferta) e tenta revender com lucro: deve perder pela taxa/spread
    const d = EDITIONS[Math.floor(rng() * EDITIONS.length)]
    const e = w.eds[d.id]
    const ask = bestAsk(w, d.id)
    if (ask && wallet > ask.price + 500 && inv.length < 6) {
      wallet -= ask.price
      takeListing(w, ask.id)
      const id = `i${n++}`
      inv.push({ id, editionId: d.id, serial: ask.serial })
      owned.add(key(d.id, ask.serial))
      bought++
      const price = Math.round(e.P * 1.04)
      const r = createListing(w, { id, editionId: d.id, serial: ask.serial }, price, 3 * MARKET_CFG.dayMs)
      if (r.ok) {
        hasListing++
        roundTripLoss += ask.price - (price - feeOf(price))
      }
    } else if (wallet > 3000 && rng() < 0.3) {
      const price = Math.round(e.P * 0.9)
      const r = createBid(w, d.id, price, 2 * MARKET_CFG.dayMs)
      if (r.ok) {
        wallet -= price
        escrow.set(r.data!.id, price)
      }
    }
  }
  for (const d of EDITIONS) {
    const e = w.eds[d.id]
    const t = track[d.id]
    t.minR = Math.min(t.minR, e.P / e.F)
    t.maxR = Math.max(t.maxR, e.P / e.F)
    t.minP = Math.min(t.minP, e.P)
    t.maxP = Math.max(t.maxP, e.P)
  }
}
for (const d of EDITIONS) track[d.id].vol = w.eds[d.id].hist.slice(-days).reduce((s, p) => s + p.v, 0)

const fmt = (x: number) => Math.round(x).toLocaleString('pt-BR').padStart(7)
console.log(`Simulacao: ${days} dias de mercado (semente ${seed}), dia = ${(MARKET_CFG.dayMs / 60000).toFixed(0)} min reais\n`)
console.log('edicao'.padEnd(26), 'P ini'.padStart(7), 'P fim'.padStart(7), 'var%'.padStart(6), 'minP'.padStart(7), 'maxP'.padStart(7), ' P/F min..max  F fim  vol/d  cunh  aposent.')
let worstUp = 0
let worstDown = 1e9
for (const d of EDITIONS) {
  const e = w.eds[d.id]
  const s = start[d.id]
  const t = track[d.id]
  const chg = (e.P / s.P - 1) * 100
  worstUp = Math.max(worstUp, e.P / s.P)
  worstDown = Math.min(worstDown, e.P / s.P)
  console.log(
    d.name.slice(0, 25).padEnd(26),
    fmt(s.P),
    fmt(e.P),
    `${chg >= 0 ? '+' : ''}${chg.toFixed(0)}`.padStart(6),
    fmt(t.minP),
    fmt(t.maxP),
    ` ${t.minR.toFixed(2)}..${t.maxR.toFixed(2)}`,
    fmt(e.F),
    (t.vol / days).toFixed(1).padStart(5),
    `${e.minted}/${d.cap}`.padStart(8),
    e.retired ? (t.retiredAt !== undefined ? `dia ${Math.round(t.retiredAt)}` : 'sim') : '-',
  )
}
const inventory = inv.reduce((s, x) => s + w.eds[x.editionId].P, 0)
console.log(`\nMaior alta de preco em ${days} dias: x${worstUp.toFixed(2)} | maior queda: x${worstDown.toFixed(2)}`)
console.log(`Taxa de mercado queimada (5%): ${Math.round(w.stats.feeBurned).toLocaleString('pt-BR')} Brilhos`)
console.log(`Traders NPC -> jogador (torneira): ${Math.round(w.stats.npcPaid).toLocaleString('pt-BR')} | jogador -> NPC (ralo): ${Math.round(w.stats.npcReceived).toLocaleString('pt-BR')}`)
console.log(`Bot: ${bought} compras, ${sold} vendas. Patrimonio ${Math.round(start0).toLocaleString('pt-BR')} -> ${Math.round(wallet + inventory + [...escrow.values()].length * 0).toLocaleString('pt-BR')} (caixa ${Math.round(wallet).toLocaleString('pt-BR')} + pecas ${Math.round(inventory).toLocaleString('pt-BR')}); perda alvo em ida-e-volta ~ ${Math.round(roundTripLoss).toLocaleString('pt-BR')}`)
