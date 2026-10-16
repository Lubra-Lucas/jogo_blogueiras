import { ownsEditionOfItem } from '../market/inventory'
import { useCatalogStore } from '../character/catalog'
import { useProfileStore } from '../../state/profileStore'
import { economyNow } from './clock'
import { emitEconomy } from './events'
import { buildSellables, dailyDeals, statusOf, type Sellable } from './sellables'
import type { Currency, ItemStatus, LedgerEntry, Wallet } from './types'

/**
 * Servico de economia. A interface e assincrona de proposito: hoje o `LocalEconomyService` resolve na
 * hora, mas o futuro `RemoteEconomyService` (servidor autoritativo) usara a mesma assinatura.
 *
 * AVISO DE SEGURANCA: no cliente nada impede alguem de editar localStorage/memoria e se dar saldo ou
 * itens. O modo local serve para o jogo single-player/prototipo. Para valer dinheiro (Diamantes
 * comprados) e preciso o servidor guardar saldo, inventario e extrato, validar cada compra
 * (preco/disponibilidade/saldo/limite) e verificar recibos do provedor de pagamento.
 */
export type PurchaseFailure = 'saldo' | 'indisponivel' | 'ja_possui' | 'desconhecido' | 'erro'

export interface PurchaseResult {
  ok: boolean
  reason?: PurchaseFailure
  message: string
  wallet: Wallet
}

export interface EconomyService {
  readonly kind: 'local' | 'remote'
  getWallet(): Wallet
  ledger(): LedgerEntry[]
  ownsItem(id: string): boolean
  /** estado de venda do item agora (preco, janela, promocao) */
  quote(itemId: string): ItemStatus | null
  /** compra um item do catalogo na moeda escolhida */
  purchaseItem(itemId: string, currency: Currency): Promise<PurchaseResult>
  /** cobra um servico/acabamento (sumidouro de moeda) */
  purchaseService(label: string, currency: Currency, price: number): Promise<PurchaseResult>
  /** credita um pacote de Diamantes ja pago e verificado (recibo do PaymentProvider) */
  creditDiamondPack(packId: string, diamonds: number, receiptId: string): Promise<PurchaseResult>
}

const wallet = (): Wallet => {
  const p = useProfileStore.getState()
  return { brilhos: p.coins, diamantes: p.diamonds }
}

let sellableCache: { key: unknown; list: Sellable[] } | null = null
function sellables(): Sellable[] {
  const items = useCatalogStore.getState().items
  if (sellableCache?.key !== items) sellableCache = { key: items, list: buildSellables(items) }
  return sellableCache.list
}

export class LocalEconomyService implements EconomyService {
  readonly kind = 'local' as const
  getWallet = wallet
  ledger = () => useProfileStore.getState().ledger
  ownsItem = (id: string) => useProfileStore.getState().owned.includes(id) || ownsEditionOfItem(id)

  quote(itemId: string): ItemStatus | null {
    const list = sellables()
    const s = list.find((x) => x.id === itemId)
    if (!s) return null
    const now = economyNow()
    return statusOf(s, new Set(useProfileStore.getState().owned), dailyDeals(list, now), now)
  }

  async purchaseItem(itemId: string, currency: Currency): Promise<PurchaseResult> {
    const st = this.quote(itemId)
    const s = sellables().find((x) => x.id === itemId)
    const fail = (reason: PurchaseFailure, message: string): PurchaseResult => ({ ok: false, reason, message, wallet: wallet() })
    if (!st || !s) return fail('desconhecido', 'Item não encontrado.')
    if (st.state === 'owned') return fail('ja_possui', 'Você já tem esta peça.')
    if (st.state !== 'buyable') return fail('indisponivel', st.state === 'upcoming' ? 'Este exclusivo ainda não foi lançado.' : (st.note ?? 'Item indisponível para compra.'))
    const offer = st.offers.find((o) => o.currency === currency)
    if (!offer) return fail('indisponivel', 'Este item não pode ser comprado com essa moeda agora.')
    const p = useProfileStore.getState()
    if (!p.debit(currency, offer.price, `Compra: ${s.label}`)) return fail('saldo', 'Saldo insuficiente.')
    p.grantItem(itemId)
    emitEconomy({ type: 'buy', itemId })
    return { ok: true, message: `${s.label} agora é sua!`, wallet: wallet() }
  }

  async purchaseService(label: string, currency: Currency, price: number): Promise<PurchaseResult> {
    if (!useProfileStore.getState().debit(currency, price, label)) return { ok: false, reason: 'saldo', message: 'Saldo insuficiente.', wallet: wallet() }
    return { ok: true, message: `${label} concluído.`, wallet: wallet() }
  }

  async creditDiamondPack(packId: string, diamonds: number, receiptId: string): Promise<PurchaseResult> {
    useProfileStore.getState().credit('diamantes', diamonds, `Pacote ${packId} (recibo ${receiptId.slice(0, 8)})`)
    return { ok: true, message: `+${diamonds} Diamantes`, wallet: wallet() }
  }
}

/**
 * Futuro: servico autoritativo. Cada metodo vira uma chamada HTTPS autenticada (ex.: POST /wallet/purchase)
 * e o cliente so renderiza o resultado; o servidor devolve saldo/inventario atualizados.
 */
export class RemoteEconomyService implements EconomyService {
  readonly kind = 'remote' as const
  constructor(private readonly baseUrl: string) {}
  private nope(): never {
    throw new Error(`RemoteEconomyService (${this.baseUrl}) ainda não implementado`)
  }
  getWallet = (): Wallet => this.nope()
  ledger = (): LedgerEntry[] => this.nope()
  ownsItem = (_id: string): boolean => this.nope()
  quote = (_id: string): ItemStatus | null => this.nope()
  purchaseItem = (_id: string, _c: Currency): Promise<PurchaseResult> => this.nope()
  purchaseService = (_l: string, _c: Currency, _p: number): Promise<PurchaseResult> => this.nope()
  creditDiamondPack = (_p: string, _d: number, _r: string): Promise<PurchaseResult> => this.nope()
}

let current: EconomyService = new LocalEconomyService()
export const economy = (): EconomyService => current
export function setEconomyService(s: EconomyService): void {
  current = s
}
