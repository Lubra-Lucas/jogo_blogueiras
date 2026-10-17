import { DIMS, type BodyFit } from '../character/proportions'
import { SEAT_HIPS_GAP } from '../sit/sitStore'
import type { CarSpec } from './catalog'

/** coque/chapeu acima do cranio (m); medido: coque padrao = 0,935 m acima do banco para a boneca de 1,60 m */
const HAIR = 0.1
/** folga entre o topo da cabeca e o forro (m) */
const MARGEM = 0.03

/** Topo da cabeca (com coque) acima do assento, sentada, para este corpo. */
export function headTopAboveSeat(fit: BodyFit): number {
  return SEAT_HIPS_GAP + (fit.height - DIMS.hipsY * fit.stride) + HAIR
}

/** Altura dos olhos acima do assento, sentada. */
export function eyeAboveSeat(fit: BodyFit): number {
  return SEAT_HIPS_GAP + (fit.eyeY - DIMS.hipsY * fit.stride)
}

/** Deslocamento vertical total do banco (m, <= 0): bancoDy fixo + rebaixamento para a cabeca caber sob o forro. */
export function seatDy(spec: CarSpec, fit: BodyFit): number {
  const base = spec.bancoDy ?? 0
  if (spec.forroY == null) return base
  const drop = Math.min(spec.bancoMax ?? 0, Math.max(0, headTopAboveSeat(fit) + MARGEM - (spec.forroY - base)))
  return base - drop
}

/** Altura dos olhos (m) acima do banco ja rebaixado, para a camera em 1a pessoa; nao passa do forro. */
export function eyeHeight(spec: CarSpec, fit: BodyFit): number {
  let e = eyeAboveSeat(fit)
  if (spec.olhoY != null) e = Math.min(e, spec.olhoY)
  if (spec.forroY != null) e = Math.min(e, spec.forroY - seatDy(spec, fit) - 0.1)
  return e
}
