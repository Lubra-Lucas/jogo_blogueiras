import { Color, MathUtils } from 'three'
import type { env as Env } from '../environment/envState'

/**
 * Preset de ambiente de Miami Beach (gancho do envState): ceu tropical azul-turquesa de dia, sol mais forte, poucas nuvens e um
 * por do sol quente (laranja no horizonte, coral e anil acima) que dura mais. Mistura sobre o ciclo normal (a chuva ainda escurece).
 */
const T = {
  day: { top: new Color('#1782ea'), mid: new Color('#4cb6f2'), hor: new Color('#c4ecf6'), fog: new Color('#bfe7f2') },
  dawn: { top: new Color('#4a78c8'), mid: new Color('#f2a88c'), hor: new Color('#ffd7a0'), fog: new Color('#f3c9a8') },
  sunset: { top: new Color('#26408f'), mid: new Color('#d8587f'), hor: new Color('#ff9440'), fog: new Color('#e89a78') },
}
const s = MathUtils.smoothstep

export function miamiEnvHook(e: typeof Env, hour: number) {
  const g = 1 - e.gloom * 0.65
  const wDay = s(hour, 7, 9) * (1 - s(hour, 16.4, 17.4))
  const wSet = s(hour, 16.4, 17.6) * (1 - s(hour, 19.6, 20.8))
  const wDawn = s(hour, 5.2, 6.2) * (1 - s(hour, 7.4, 8.8))
  const mix = (k: 'top' | 'mid' | 'hor' | 'fog', dst: Color, a = 0.9) => {
    dst.lerp(T.day[k], wDay * a * g)
    dst.lerp(T.dawn[k], wDawn * a * g)
    dst.lerp(T.sunset[k], wSet * a * g)
  }
  mix('top', e.skyTop)
  mix('mid', e.skyMid)
  mix('hor', e.skyHor)
  mix('fog', e.fogColor, 0.8)
  e.lightI *= 1 + 0.16 * (wDay + wSet * 0.5) * g
  e.sunGlow *= 1 + 0.35 * wSet
  e.cover *= 0.72
  e.exposure += 0.03 * wDay
}
