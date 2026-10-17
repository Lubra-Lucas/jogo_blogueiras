import type { Appearance } from '../../../shared/appearance'
import { applyMakeupLook, MAKEUP_LOOKS } from '../../../game/character/makeup/presets'
import * as D from './data'
import { randomAppearance } from '../../../shared/randomAppearance'

const pick = <T,>(l: readonly T[]): T => l[Math.floor(Math.random() * l.length)]

/**
 * Sorteio com bom gosto: tons e combinacoes reais (tom de pele, cor de cabelo/olhos, um look de maquiagem pronto),
 * morphs moderados. Nao mexe nas roupas. `scope` limita o que muda.
 */
export function randomLook(a: Appearance, scope: 'all' | 'makeup' | 'hair'): Appearance {
  let out = a
  const seed = Math.floor(Math.random() * 4294967296)
  if (scope === 'all') {
    // morphs de rosto antigos (labios, mandibula...) ainda vem dos presets; formatos, olhos, corpo e cores vem do gerador v5
    out = D.applyMorphGroup(out, D.FACE_KEYS, pick(D.FACE_PRESETS).morphs)
    out = randomAppearance(seed, { base: out })
  }
  if (scope === 'all' || scope === 'makeup') out = applyMakeupLook(out, pick(MAKEUP_LOOKS))
  if (scope === 'all' || scope === 'hair') {
    // cor do cabelo coerente com a pele; a sobrancelha do rosto acompanha (no 'all' o gerador acima ja fez)
    if (scope === 'hair') out = randomAppearance(seed, { base: out, skin: false, eyes: false, face: false, body: false })
    const mode = pick(['solid', 'solid', 'ombre', 'highlights', 'twotone'] as const)
    out = { ...out, hair: { ...out.hair, mode, color2: mode === 'solid' ? undefined : pick(D.HAIR_FANTASY.concat(D.HAIR_NATURAL)).hex, amount: 0.35 + Math.random() * 0.4 } }
  }
  return out
}
