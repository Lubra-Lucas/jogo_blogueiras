/** Relogio da economia. `?shopday=3` adianta N dias (teste de promocoes/janelas de exclusivos). */
const OFFSET_DAYS = Number(new URLSearchParams(window.location.search).get('shopday')) || 0

export const economyNow = (): number => Date.now() + OFFSET_DAYS * 86400000

/** Chave de dia local (AAAA-MM-DD) para recompensa diaria/missoes. */
export function dayKey(t = economyNow()): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Instante da proxima meia-noite local. */
export function nextMidnight(t = economyNow()): number {
  const d = new Date(t)
  d.setHours(24, 0, 0, 0)
  return d.getTime()
}

export function monthKey(t = economyNow()): string {
  return dayKey(t).slice(0, 7)
}

/** "2d 4h", "3h 12min", "12min" */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'agora'
  const m = Math.floor(ms / 60000)
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  const mm = m % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${String(mm).padStart(2, '0')}min`
  return `${Math.max(1, mm)}min`
}

/** hash deterministico simples (FNV-1a) para sorteios por semente diaria. */
export function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
