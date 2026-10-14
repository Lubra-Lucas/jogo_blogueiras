export type QualityTier = 'low' | 'medium' | 'high'

export interface QualitySettings {
  dpr: number | [number, number]
  shadows: boolean
  shadowMapSize: number
  sparkles: number
}

export const QUALITY_SETTINGS: Record<QualityTier, QualitySettings> = {
  low: { dpr: 1, shadows: false, shadowMapSize: 512, sparkles: 20 },
  medium: { dpr: [1, 1.5], shadows: true, shadowMapSize: 1024, sparkles: 40 },
  high: { dpr: [1, 2], shadows: true, shadowMapSize: 2048, sparkles: 70 },
}

/** Detecta celular / aparelho fraco e devolve o nivel de qualidade. Use ?quality=low|medium|high para forcar. */
export function getQuality(): QualityTier {
  const params = new URLSearchParams(window.location.search)
  const forced = params.get('quality')
  if (forced === 'low' || forced === 'medium' || forced === 'high') return forced

  const nav = navigator as Navigator & { deviceMemory?: number }
  const mobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent) ||
    (window.matchMedia?.('(pointer: coarse)').matches ?? false)
  const cores = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory ?? 4

  if (cores <= 4 || memory <= 2) return 'low'
  if (mobile) return 'medium'
  return 'high'
}
