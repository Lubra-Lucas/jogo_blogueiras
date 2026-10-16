import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { market, type EditionView } from '../../game/market/service'

export const fmt = (n: number): string => Math.round(n).toLocaleString('pt-BR')
export const serialFmt = (serial: number, cap?: number): string => `${String(serial).padStart(3, '0')}${cap ? `/${cap}` : ''}`

export function pct(v: number, digits = 1): string {
  const s = (Math.abs(v) * 100).toFixed(digits).replace('.', ',')
  return `${v >= 0 ? '+' : '−'}${s}%`
}

export function countdown(ms: number): string {
  if (ms <= 0) return 'agora'
  const m = Math.floor(ms / 60000)
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  const mm = m % 60
  if (d > 0) return `${d} d ${h} h`
  if (h > 0) return `${h} h ${String(mm).padStart(2, '0')} min`
  return `${Math.max(1, mm)} min`
}

export function ago(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return 'agora há pouco'
  const m = Math.floor(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h} h`
  return `há ${Math.floor(h / 24)} d`
}

/** re-renderiza quando o mercado muda */
export function useMarketRev(): number {
  return useSyncExternalStore(
    (fn) => market().subscribe(fn),
    () => market().revision(),
  )
}

export function useEditions(): EditionView[] {
  const rev = useMarketRev()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => market().editions(), [rev])
}

export function useNow(ms = 30000): number {
  const [n, setN] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setN(Date.now()), ms)
    return () => window.clearInterval(t)
  }, [ms])
  return n
}
