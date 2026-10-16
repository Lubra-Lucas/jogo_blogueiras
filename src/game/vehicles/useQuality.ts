import { getQuality, QUALITY_SETTINGS } from '../systems/quality'

const tier = getQuality()

/** Nivel de qualidade atual (fixo por sessao) e suas opcoes. */
export const QUALITY = QUALITY_SETTINGS[tier]
export const QUALITY_TIER = tier

export function useQualityShadows(): boolean {
  return QUALITY.shadows
}
