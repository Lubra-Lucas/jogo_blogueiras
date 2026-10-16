export type QualityTier = 'low' | 'medium' | 'high'

export interface QualitySettings {
  dpr: number | [number, number]
  shadows: boolean
  shadowMapSize: number
  sparkles: number
  /** distancia de corte (m) de props pequenos / predios e fim da nevoa */
  propDist: number
  buildingDist: number
  fogFar: number
}

export const QUALITY_SETTINGS: Record<QualityTier, QualitySettings> = {
  low: { dpr: 1, shadows: false, shadowMapSize: 512, sparkles: 20, propDist: 65, buildingDist: 170, fogFar: 190 },
  medium: { dpr: [1, 1.5], shadows: true, shadowMapSize: 1024, sparkles: 40, propDist: 85, buildingDist: 215, fogFar: 235 },
  high: { dpr: [1, 2], shadows: true, shadowMapSize: 2048, sparkles: 70, propDist: 105, buildingDist: 250, fogFar: 270 },
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
