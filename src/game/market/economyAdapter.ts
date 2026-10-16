import { useProfileStore } from '../../state/profileStore'

/**
 * Unica ponte entre o mercado e a economia/perfil. O mercado SO usa Brilhos: este adaptador nem expoe a escolha
 * de moeda (Diamantes e dinheiro real nunca entram em compra, venda ou taxa do mercado).
 * Se a carteira da economia mudar de forma, ajuste apenas este arquivo.
 */
export const brilhosBalance = (): number => useProfileStore.getState().coins

/** cobra Brilhos; false se faltar saldo (nada muda) */
export function debitBrilhos(amount: number, reason: string): boolean {
  return useProfileStore.getState().debit('brilhos', Math.floor(amount), reason)
}

export function creditBrilhos(amount: number, reason: string): void {
  if (amount > 0) useProfileStore.getState().credit('brilhos', Math.floor(amount), reason, { silent: true })
}

export const playerName = (): string => useProfileStore.getState().name || 'Você'
