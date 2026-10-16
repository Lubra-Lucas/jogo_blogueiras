import type { Appearance } from '../../../shared/appearance'
import { applyMakeupLook, MAKEUP_LOOKS } from '../../../game/character/makeup/presets'
import * as D from './data'

const pick = <T,>(l: readonly T[]): T => l[Math.floor(Math.random() * l.length)]

/**
 * Sorteio com bom gosto: tons e combinacoes reais (tom de pele, cor de cabelo/olhos, um look de maquiagem pronto),
 * morphs moderados. Nao mexe nas roupas. `scope` limita o que muda.
 */
export function randomLook(a: Appearance, scope: 'all' | 'makeup' | 'hair'): Appearance {
  let out = a
  if (scope === 'all') {
    const face = pick(D.FACE_PRESETS)
    const body = pick(D.BODY_PRESETS)
    out = D.applyMorphGroup(out, D.FACE_KEYS, face.morphs)
    out = D.applyMorphGroup(out, D.BODY_KEYS, body.morphs)
    out = { ...out, skin: { ...out.skin, tone: pick(D.SKIN_TONES).hex }, eyes: { ...(out.eyes ?? { color: null, ring: 0.35 }), color: Math.random() < 0.25 ? null : pick([...D.EYE_NATURAL, ...D.EYE_NATURAL, ...D.EYE_FANTASY]).hex, colorR: null } }
  }
  if (scope === 'all' || scope === 'makeup') out = applyMakeupLook(out, pick(MAKEUP_LOOKS))
  if (scope === 'all' || scope === 'hair') {
    const natural = Math.random() < 0.7
    const c = pick(natural ? D.HAIR_NATURAL : D.HAIR_FANTASY).hex
    const mode = pick(['solid', 'solid', 'ombre', 'highlights', 'twotone'] as const)
    out = { ...out, hair: { ...out.hair, color: c, mode, color2: mode === 'solid' ? undefined : pick(D.HAIR_FANTASY.concat(D.HAIR_NATURAL)).hex, amount: 0.35 + Math.random() * 0.4 } }
  }
  return out
}
