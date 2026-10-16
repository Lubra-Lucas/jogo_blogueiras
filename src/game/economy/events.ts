/**
 * Barramento minimo de eventos da economia (sem dependencias): permite que o perfil avise a
 * economia (rodada jogada, Brilhos ganhos, nivel) sem import circular.
 */
export type EconomyEvent =
  | { type: 'round' }
  | { type: 'earn'; amount: number }
  | { type: 'level'; level: number }
  | { type: 'buy'; itemId: string }
  | { type: 'item'; itemId: string }

type Listener = (e: EconomyEvent) => void
const listeners = new Set<Listener>()

export function onEconomyEvent(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function emitEconomy(e: EconomyEvent): void {
  for (const fn of listeners) {
    try {
      fn(e)
    } catch {
      /* um ouvinte com erro nao derruba o jogo */
    }
  }
}
