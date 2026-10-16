/**
 * Pagamento de Diamantes. Hoje so existe o provedor de TESTE (nenhuma cobranca real, nenhuma chave).
 * Um provedor real (Stripe, Google Play Billing, Apple IAP, Mercado Pago/Pix...) implementa
 * `PaymentProvider`, mas a confirmacao deve ocorrer no SERVIDOR (webhook) antes de creditar Diamantes.
 */
export interface DiamondPack {
  id: string
  diamonds: number
  /** bonus embutido (apenas rotulo) */
  bonus?: number
  /** preco em centavos de real: PLACEHOLDER */
  cents: number
  label: string
  tag?: string
}

export const DIAMOND_PACKS: DiamondPack[] = [
  { id: 'd100', diamonds: 100, cents: 490, label: 'Punhado' },
  { id: 'd550', diamonds: 550, bonus: 50, cents: 2490, label: 'Bolsinha', tag: 'Mais escolhido' },
  { id: 'd1200', diamonds: 1200, bonus: 200, cents: 4990, label: 'Cofre' },
  { id: 'd2600', diamonds: 2600, bonus: 600, cents: 9990, label: 'Tesouro', tag: 'Melhor valor' },
]

export const brl = (cents: number): string => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`

export interface PaymentResult {
  ok: boolean
  receiptId: string
  mode: 'teste' | 'real'
  error?: string
}

export interface PaymentProvider {
  readonly id: string
  readonly mode: 'teste' | 'real'
  /** Inicia e conclui o pagamento do pacote. Um provedor real abriria o checkout externo. */
  pay(pack: DiamondPack): Promise<PaymentResult>
}

/** Provedor de teste: sempre aprova, sem cobranca. */
export const TestPaymentProvider: PaymentProvider = {
  id: 'teste',
  mode: 'teste',
  async pay(pack) {
    await new Promise((r) => setTimeout(r, 450))
    return { ok: true, mode: 'teste', receiptId: `teste-${pack.id}-${Date.now().toString(36)}` }
  },
}

let provider: PaymentProvider = TestPaymentProvider
export const paymentProvider = (): PaymentProvider => provider
export function setPaymentProvider(p: PaymentProvider): void {
  provider = p
}
