import { loadJson, saveJson } from '../../shared/storage'
import { MARKET_CFG, STORAGE } from './cfg.ts'
import { claimCompleted } from './collections.ts'
import { creditBrilhos, brilhosBalance, debitBrilhos } from './economyAdapter.ts'
import { EDITIONS, getEdition } from './editions.ts'
import * as eng from './engine.ts'
import { isTradable, newInstanceId, useInventory } from './inventory.ts'
import { useMarketMeta } from './meta.ts'
import { hypeSum } from './priceModel.ts'
import type { Bid, DayPoint, EditionDef, EditionInstance, FailCode, Listing, MarketEvent, Origin, Result } from './types.ts'

/**
 * Servico do mercado. Leituras sincronas (snapshot) e mutacoes assincronas: hoje `LocalMarketService` resolve
 * na hora; o futuro `RemoteMarketService` troca so a implementacao (a UI nao muda).
 *
 * ============ O QUE O SERVIDOR PRECISA GARANTIR (o cliente NUNCA e confiavel) ============
 *  1. Inventario autoritativo: tabela `edition_instances(id, edition_id, serial UNIQUE por edicao, owner_id, state,
 *     minted_at, tradable_at)`. O cliente so exibe; nao existe "grant" vindo do cliente (missoes/eventos chamam o servidor).
 *  2. Cunhagem atomica: `serial = next_serial(edition)` dentro de transacao com `SELECT ... FOR UPDATE` no contador;
 *     recusa quando aposentada ou `minted >= cap` (o teto e invariante do banco: CHECK).
 *  3. Livro de ordens e casamento no servidor (preco-tempo), uma transacao por negocio: debita comprador, credita vendedor
 *     (menos taxa), move a instancia, grava no livro-razao DUPLO (partidas dobradas) e no log de auditoria imutavel. Tudo ou nada.
 *  4. Custodia (escrow): anuncio tranca a instancia (state=listed); oferta tranca os Brilhos. Cancelar/expirar destranca.
 *  5. Anti-fraude: trava de troca (padrao 24 h) para pecas recebidas; faixa de preco (0,3x a 3,5x da mediana de 7 dias);
 *     limites de ordens ativas; rate limit por conta/IP (ex.: 20 acoes/min); deteccao de wash trading (mesmo
 *     dispositivo/IP/pagamento nos dois lados), de "funil" (varias contas -> uma) e de transferencias por preco abusivo;
 *     idempotency-key em toda mutacao (sem compra duplicada em retry); sem troca direta item-por-item sem escrow.
 *  6. Moeda: mercado SO em Brilhos. Diamantes (premium) e dinheiro real NAO entram: sem conversao, sem saque, sem
 *     compra de Brilhos/itens por fora do jogo (anti-RMT). Brilhos nao saem do ecossistema; a taxa de 5% e destruida.
 *  7. Idade/regiao: contas de menores com mercado desativado ou limitado (sem preco livre, sem chat com desconhecidos);
 *     bloqueio por regiao onde itens virtuais negociaveis contam como jogo de azar/jogos de aposta.
 *  8. Simulacao de liquidez (traders NPC) roda no servidor com orcamento diario auditado (torneira controlada).
 *  9. Eventos de hype/aposentadoria sao agendados pelo servidor (calendario de temporadas) e publicados via WebSocket.
 * 10. Reconciliacao diaria: soma dos saldos + taxas queimadas = emissao - sorvedouros; alerta se divergir.
 */
export interface EditionView {
  def: EditionDef
  price: number
  fair: number
  chg1d: number
  chg7d: number
  chg30d: number
  /** cunhadas ate agora */
  minted: number
  /** teto efetivo: o teto, ou o total cunhado se aposentada antes de esgotar */
  supply: number
  retired: boolean
  volume7d: number
  bestAsk: number | null
  bestBid: number | null
  askCount: number
  bidCount: number
  hype: number
  headline: string | null
  owned: number
}

export interface SaleQuote {
  fee: number
  net: number
}

export interface MarketService {
  readonly kind: 'local' | 'remote'
  subscribe(fn: () => void): () => void
  revision(): number
  editions(): EditionView[]
  view(id: string): EditionView | null
  history(id: string, days: number): DayPoint[]
  book(id: string): { asks: Listing[]; bids: Bid[] }
  myListings(): Listing[]
  myBids(): Bid[]
  quoteSale(price: number): SaleQuote
  priceBand(id: string): [number, number]
  /** compra um anuncio (preco do anuncio, em Brilhos) */
  buy(listingId: string): Promise<Result<EditionInstance>>
  list(instanceId: string, price: number, durationMs: number): Promise<Result<Listing>>
  cancelListing(id: string): Promise<Result>
  /** oferta de compra por qualquer copia da edicao (Brilhos ficam em custodia) */
  placeBid(editionId: string, price: number, durationMs: number): Promise<Result>
  cancelBid(id: string): Promise<Result>
  /** entrega uma copia nova (missao/evento). No servidor: chamada confiavel, nunca do cliente. */
  grant(editionId: string, origin: Origin): Promise<Result<EditionInstance>>
  /** painel de saude (somente dev/auditoria) */
  stats(): eng.MarketStats
}

const fail = (code: FailCode, message: string): Result<never> => ({ ok: false, code, message }) as Result<never>
const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR')

export class LocalMarketService implements MarketService {
  readonly kind = 'local' as const
  private w: eng.MarketWorld
  private rev = 1
  private listeners = new Set<() => void>()
  private lastSave = 0
  private actions: number[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private readonly ctx: eng.Ctx = {
    rng: Math.random,
    taken: (ed, serial) => {
      for (const i of Object.values(useInventory.getState().instances)) if (i.editionId === ed && i.serial === serial) return true
      return false
    },
  }

  constructor() {
    const saved = loadJson<eng.MarketWorld>(STORAGE.world)
    const ok = saved && saved.v === 1 && saved.eds && typeof saved.t === 'number'
    const now = Date.now()
    this.w = ok ? saved : eng.createWorld(now, this.ctx)
    if (ok) {
      eng.ensureEditions(this.w)
      if (this.w.ms > now) this.w.ms = now
      this.apply(eng.advance(this.w, now, this.ctx))
    }
    this.save(true)
    this.start()
  }

  /** liga o relogio do mercado (ticks a cada poucos segundos reais) */
  start() {
    if (this.timer || typeof window === 'undefined') return
    this.timer = setInterval(() => this.pump(), 4000)
  }
  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private pump() {
    const before = this.w.ms
    const ev = eng.advance(this.w, Date.now(), this.ctx)
    if (ev.length || this.w.ms !== before) {
      this.apply(ev)
      this.watchAlerts()
      this.save(false)
      this.bump()
    }
  }

  private bump() {
    this.rev++
    for (const fn of this.listeners) fn()
  }
  private save(force: boolean) {
    const now = Date.now()
    if (!force && now - this.lastSave < 20000) return
    this.lastSave = now
    saveJson(STORAGE.world, this.w)
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }
  revision = () => this.rev
  stats = () => this.w.stats

  private rate(): boolean {
    const now = Date.now()
    this.actions = this.actions.filter((t) => now - t < 60000)
    if (this.actions.length >= 20) return false
    this.actions.push(now)
    return true
  }

  /* ----------------------------------------------------- efeitos dos eventos do motor */
  private apply(events: MarketEvent[]) {
    const meta = useMarketMeta.getState()
    const inv = useInventory.getState()
    const name = (id: string) => getEdition(id)?.name ?? id
    const watched = (id: string) => meta.watch.includes(id) || Object.values(useInventory.getState().instances).some((i) => i.editionId === id)
    for (const e of events) {
      if (e.type === 'sold') {
        inv.remove(e.instanceId)
        creditBrilhos(e.net, `Mercado: venda de ${name(e.editionId)} #${e.serial}`)
        meta.addLog({ t: Date.now(), side: 'venda', editionId: e.editionId, serial: e.serial, price: e.price, fee: e.fee })
        meta.push('venda', `Vendida: ${name(e.editionId)} #${String(e.serial).padStart(3, '0')} por ${fmt(e.price)} Brilhos (você recebeu ${fmt(e.net)}, taxa ${fmt(e.fee)}).`, e.editionId)
      } else if (e.type === 'bid_filled') {
        const now = Date.now()
        useInventory.getState().add({ id: newInstanceId(), editionId: e.editionId, serial: e.serial, origin: 'mercado', mintedAt: now, acquiredAt: now, tradableAt: now + MARKET_CFG.tradeLockMs, via: 'mercado' })
        creditBrilhos(e.refund, `Mercado: troco da oferta (${name(e.editionId)})`)
        meta.addLog({ t: now, side: 'compra', editionId: e.editionId, serial: e.serial, price: e.price, fee: 0 })
        meta.push('oferta', `Sua oferta foi aceita: ${name(e.editionId)} #${String(e.serial).padStart(3, '0')} por ${fmt(e.price)} Brilhos.`, e.editionId)
        claimCompleted().forEach((c) => meta.push('sistema', `Coleção completa: ${c.name}. Título "${c.title}" desbloqueado.`))
      } else if (e.type === 'listing_expired') {
        if (e.instanceId) inv.setListing(e.instanceId, undefined)
        meta.push('sistema', `Seu anúncio de ${name(e.editionId)} expirou. A peça voltou para a sua coleção.`, e.editionId)
      } else if (e.type === 'bid_expired') {
        creditBrilhos(e.refund, `Mercado: oferta expirada (${name(e.editionId)})`)
        meta.push('sistema', `Sua oferta por ${name(e.editionId)} expirou. ${fmt(e.refund)} Brilhos devolvidos.`, e.editionId)
      } else if (e.type === 'hype') {
        if (watched(e.editionId)) meta.push('noticia', e.text, e.editionId)
      } else if (e.type === 'retired') {
        if (watched(e.editionId)) meta.push('noticia', e.reason === 'esgotada' ? `${name(e.editionId)} esgotou e foi aposentada. Nunca mais será feita.` : `${name(e.editionId)} foi aposentada. Nunca mais será feita.`, e.editionId)
      }
    }
  }

  private watchAlerts() {
    const meta = useMarketMeta.getState()
    for (const id of meta.watch) {
      const e = this.w.eds[id]
      if (!e) continue
      const last = meta.lastNotifiedP[id]
      if (last === undefined) meta.setNotified(id, e.P)
      else if (Math.abs(e.P / last - 1) >= 0.08) {
        meta.push('preco', `${getEdition(id)?.name}: ${e.P > last ? 'valorizou' : 'desvalorizou'} ${Math.abs((e.P / last - 1) * 100).toFixed(0)}% (agora ${fmt(e.P)} Brilhos).`, id)
        meta.setNotified(id, e.P)
      }
    }
  }

  /* ----------------------------------------------------- leituras */
  view(id: string): EditionView | null {
    const d = getEdition(id)
    const e = this.w.eds[id]
    if (!d || !e) return null
    const h = e.hist
    const at = (back: number) => (h.length > back ? h[h.length - 1 - back].c : (h[0]?.c ?? e.P))
    const pct = (a: number, b: number) => (b > 0 ? a / b - 1 : 0)
    const asks = e.asks.filter((a) => !a.mine)
    const hypeNow = hypeSum(e.hype, this.w.t)
    const top = [...e.hype].sort((a, b) => Math.abs(b.amount) * Math.pow(0.5, (this.w.t - b.startDay) / b.halfLife) - Math.abs(a.amount) * Math.pow(0.5, (this.w.t - a.startDay) / a.halfLife))[0]
    return {
      def: d,
      price: Math.round(e.P),
      fair: Math.round(e.F),
      chg1d: pct(e.P, at(1)),
      chg7d: pct(e.P, at(7)),
      chg30d: pct(e.P, at(30)),
      minted: e.minted,
      supply: e.retired ? e.minted : d.cap,
      retired: e.retired,
      volume7d: h.slice(-7).reduce((s, p) => s + p.v, 0),
      bestAsk: e.asks[0]?.price ?? null,
      bestBid: e.bids[0]?.price ?? null,
      askCount: asks.length,
      bidCount: e.bids.filter((b) => !b.mine).length,
      hype: hypeNow,
      headline: top && Math.abs(hypeNow) > 0.03 ? top.text : null,
      owned: Object.values(useInventory.getState().instances).filter((i) => i.editionId === id).length,
    }
  }
  editions(): EditionView[] {
    return EDITIONS.map((d) => this.view(d.id)!).filter(Boolean)
  }
  history = (id: string, days: number): DayPoint[] => (this.w.eds[id]?.hist ?? []).slice(-days)
  book = (id: string) => ({ asks: [...(this.w.eds[id]?.asks ?? [])], bids: [...(this.w.eds[id]?.bids ?? [])] })
  myListings = (): Listing[] => Object.values(this.w.eds).flatMap((e) => e.asks.filter((a) => a.mine))
  myBids = (): Bid[] => Object.values(this.w.eds).flatMap((e) => e.bids.filter((b) => b.mine))
  quoteSale = (price: number): SaleQuote => {
    const fee = eng.feeOf(price)
    return { fee, net: price - fee }
  }
  priceBand = (id: string) => eng.priceBand(this.w, id)

  /* ----------------------------------------------------- mutacoes */
  async buy(listingId: string): Promise<Result<EditionInstance>> {
    if (!this.rate()) return fail('limite', 'Calma: muitas ações em pouco tempo. Tente de novo em instantes.')
    const l = eng.findListing(this.w, listingId)
    if (!l) return fail('anuncio', 'Este anúncio não está mais disponível.')
    if (l.mine) return fail('proprio', 'Você não pode comprar o seu próprio anúncio.')
    const name = getEdition(l.editionId)?.name ?? ''
    if (brilhosBalance() < l.price) return fail('saldo', 'Saldo insuficiente.')
    if (!debitBrilhos(l.price, `Mercado: ${name} #${l.serial}`)) return fail('saldo', 'Saldo insuficiente.')
    const taken = eng.takeListing(this.w, listingId)
    if (!taken) {
      creditBrilhos(l.price, 'Mercado: estorno')
      return fail('anuncio', 'Este anúncio acabou de ser vendido.')
    }
    const inst = this.addInstance(taken.editionId, taken.serial, 'mercado', 'mercado', MARKET_CFG.tradeLockMs)
    useMarketMeta.getState().addLog({ t: Date.now(), side: 'compra', editionId: taken.editionId, serial: taken.serial, price: taken.price, fee: 0 })
    claimCompleted().forEach((c) => useMarketMeta.getState().push('sistema', `Coleção completa: ${c.name}. Título "${c.title}" desbloqueado.`))
    this.save(true)
    this.bump()
    return { ok: true, message: `${name} #${String(taken.serial).padStart(3, '0')} agora é sua. Fica travada para troca por ${Math.round(MARKET_CFG.tradeLockMs / 3600000)} h.`, data: inst }
  }

  async list(instanceId: string, price: number, durationMs: number): Promise<Result<Listing>> {
    if (!this.rate()) return fail('limite', 'Calma: muitas ações em pouco tempo.')
    const inst = useInventory.getState().instances[instanceId]
    if (!inst) return fail('inexistente', 'Peça não encontrada.')
    if (inst.listingId) return fail('anuncio', 'Esta peça já está anunciada.')
    if (!isTradable(inst)) return fail('bloqueada', 'Esta peça ainda está com trava de troca.')
    if (!MARKET_CFG.durations.some((d) => d.ms === durationMs)) return fail('erro', 'Duração inválida.')
    const r = eng.createListing(this.w, inst, Math.floor(price), durationMs)
    if (!r.ok || !r.data) return r as Result<Listing>
    useInventory.getState().setListing(inst.id, r.data.id)
    this.save(true)
    this.bump()
    return r
  }

  async cancelListing(id: string): Promise<Result> {
    const l = eng.cancelListing(this.w, id)
    if (!l) return fail('anuncio', 'Anúncio não encontrado.')
    if (l.instanceId) useInventory.getState().setListing(l.instanceId, undefined)
    this.save(true)
    this.bump()
    return { ok: true, message: 'Anúncio cancelado. A peça voltou para a sua coleção.' }
  }

  async placeBid(editionId: string, price: number, durationMs: number): Promise<Result> {
    if (!this.rate()) return fail('limite', 'Calma: muitas ações em pouco tempo.')
    price = Math.floor(price)
    const d = getEdition(editionId)
    if (!d || !this.w.eds[editionId]) return fail('inexistente', 'Edição desconhecida.')
    if (!MARKET_CFG.durations.some((x) => x.ms === durationMs)) return fail('erro', 'Duração inválida.')
    const ask = eng.bestAsk(this.w, editionId)
    if (ask && ask.price <= price) {
      const r = await this.buy(ask.id)
      return { ok: r.ok, code: r.code, message: r.ok ? `Já havia um anúncio por ${fmt(ask.price)} Brilhos: compra feita na hora.` : r.message }
    }
    const bad = eng.checkPrice(this.w, editionId, price)
    if (bad) return bad
    if (!debitBrilhos(price, `Mercado: oferta por ${d.name}`)) return fail('saldo', 'Saldo insuficiente.')
    const r = eng.createBid(this.w, editionId, price, durationMs)
    if (!r.ok) {
      creditBrilhos(price, 'Mercado: estorno')
      return r
    }
    this.save(true)
    this.bump()
    return { ok: true, message: `Oferta de ${fmt(price)} Brilhos registrada. O valor fica reservado até a oferta ser aceita ou cancelada.` }
  }

  async cancelBid(id: string): Promise<Result> {
    const b = eng.cancelBid(this.w, id)
    if (!b) return fail('anuncio', 'Oferta não encontrada.')
    creditBrilhos(b.price, `Mercado: oferta cancelada (${getEdition(b.editionId)?.name})`)
    this.save(true)
    this.bump()
    return { ok: true, message: `Oferta cancelada. ${fmt(b.price)} Brilhos devolvidos.` }
  }

  async grant(editionId: string, origin: Origin): Promise<Result<EditionInstance>> {
    const d = getEdition(editionId)
    if (!d) return fail('inexistente', 'Edição desconhecida.')
    const serial = eng.mintSerial(this.w, editionId, (n) => this.ctx.taken(editionId, n))
    if (serial === null) return fail('esgotada', `${d.name} está esgotada ou aposentada: nenhuma cópia nova será feita.`)
    const inst = this.addInstance(editionId, serial, origin, 'mint', MARKET_CFG.grantLockMs)
    const meta = useMarketMeta.getState()
    meta.push('sistema', `Você recebeu ${d.name} #${String(serial).padStart(3, '0')}/${d.cap}.`, editionId)
    claimCompleted().forEach((c) => meta.push('sistema', `Coleção completa: ${c.name}. Título "${c.title}" desbloqueado.`))
    this.save(true)
    this.bump()
    return { ok: true, message: `${d.name} #${String(serial).padStart(3, '0')}/${d.cap}`, data: inst }
  }

  private addInstance(editionId: string, serial: number, origin: EditionInstance['origin'], via: EditionInstance['via'], lockMs: number): EditionInstance {
    const now = Date.now()
    const inst: EditionInstance = { id: newInstanceId(), editionId, serial, origin, mintedAt: now, acquiredAt: now, tradableAt: now + lockMs, via }
    useInventory.getState().add(inst)
    return inst
  }
}

/**
 * Servico REMOTO (esqueleto): cada metodo vira uma chamada HTTPS autenticada (JWT/sessao) com `Idempotency-Key`,
 * e leituras viram cache + WebSocket (`/market/stream`). Rotas sugeridas:
 *   GET  /market/editions            GET /market/editions/:id/history?days=30     GET /market/editions/:id/book
 *   POST /market/listings            DELETE /market/listings/:id                    POST /market/listings/:id/buy
 *   POST /market/bids                DELETE /market/bids/:id
 *   POST /internal/editions/:id/grant   (so servidores de jogo/missao; nunca o cliente)
 * Todas retornam o estado novo (saldo, inventario, ordens) para o cliente apenas renderizar.
 */
export class RemoteMarketService implements MarketService {
  readonly kind = 'remote' as const
  constructor(private readonly baseUrl: string) {}
  private nope(): never {
    throw new Error(`RemoteMarketService (${this.baseUrl}) ainda não implementado`)
  }
  subscribe = (_fn: () => void): (() => void) => this.nope()
  revision = (): number => this.nope()
  editions = (): EditionView[] => this.nope()
  view = (_id: string): EditionView | null => this.nope()
  history = (_id: string, _days: number): DayPoint[] => this.nope()
  book = (_id: string): { asks: Listing[]; bids: Bid[] } => this.nope()
  myListings = (): Listing[] => this.nope()
  myBids = (): Bid[] => this.nope()
  quoteSale = (_p: number): SaleQuote => this.nope()
  priceBand = (_id: string): [number, number] => this.nope()
  buy = (_id: string): Promise<Result<EditionInstance>> => this.nope()
  list = (_i: string, _p: number, _d: number): Promise<Result<Listing>> => this.nope()
  cancelListing = (_id: string): Promise<Result> => this.nope()
  placeBid = (_e: string, _p: number, _d: number): Promise<Result> => this.nope()
  cancelBid = (_id: string): Promise<Result> => this.nope()
  grant = (_e: string, _o: Origin): Promise<Result<EditionInstance>> => this.nope()
  stats = (): eng.MarketStats => this.nope()
}

let current: MarketService | null = null
/** servico atual (criado sob demanda; o relogio do mercado liga junto) */
export function market(): MarketService {
  current ??= new LocalMarketService()
  return current
}
export function setMarketService(s: MarketService): void {
  current = s
}
