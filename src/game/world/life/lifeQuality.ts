import { getQuality, type QualityTier } from '../../systems/quality'

/** Orcamentos dos efeitos de "vida do mundo" por nivel de qualidade (src/game/systems/quality.ts decide o nivel). */
export interface LifeBudget {
  /** particulas simultaneas no pool de efeitos (poeira, gotas, folhas) */
  particles: number
  /** folhas/petalas caindo no Parque e no Jardim */
  leaves: number
  /** gotas por segundo de cada fonte */
  fountainRate: number
  ducks: number
  /** bandos de passaros no ceu / passaros no chao / borboletas / vaga-lumes */
  flocks: number
  groundBirds: number
  butterflies: number
  fireflies: number
  /** feixes de luz do Palco Neon */
  beams: number
  /** raios de sol (tela cheia, aditivo) */
  shafts: boolean
  cloudShadows: boolean
  traffic: number
  /** vento nos arbustos e arvores */
  wind: boolean
}

const BUDGETS: Record<QualityTier, LifeBudget> = {
  low: { particles: 140, leaves: 10, fountainRate: 18, ducks: 2, flocks: 1, groundBirds: 4, butterflies: 5, fireflies: 22, beams: 3, shafts: false, cloudShadows: true, traffic: 0, wind: true },
  medium: { particles: 320, leaves: 22, fountainRate: 34, ducks: 3, flocks: 2, groundBirds: 7, butterflies: 9, fireflies: 44, beams: 4, shafts: true, cloudShadows: true, traffic: 3, wind: true },
  high: { particles: 640, leaves: 40, fountainRate: 60, ducks: 4, flocks: 3, groundBirds: 10, butterflies: 14, fireflies: 80, beams: 6, shafts: true, cloudShadows: true, traffic: 5, wind: true },
}

export const LIFE_TIER: QualityTier = getQuality()
export const LIFE: LifeBudget = BUDGETS[LIFE_TIER]
/** ?life=0 desliga todos os efeitos (para comparar desempenho) */
export const LIFE_OFF = new URLSearchParams(window.location.search).get('life') === '0'
