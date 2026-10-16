import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { env } from '../environment/envState'
import { armLifeAudio, updateAmbient } from './audio'
import { life, wind } from './lifeState'
import { greenAt } from './surface'

const FOUNTAINS: [number, number][] = [
  [0, 0],
  [0, 158],
]

/** Paisagem sonora: o volume de cada camada depende de onde a jogadora esta (verde x cidade, perto de fontes) e do ambiente. */
export function LifeAudio() {
  const acc = useRef(0)
  useEffect(() => {
    armLifeAudio()
  }, [])
  useFrame((_, dt) => {
    acc.current += dt
    if (acc.current < 0.25) return
    acc.current = 0
    const px = life.player.x
    const pz = life.player.z
    const green = greenAt(px, pz)
    let fd = 1e9
    for (const [x, z] of FOUNTAINS) fd = Math.min(fd, Math.hypot(px - x, pz - z))
    const day = 1 - env.night
    updateAmbient({
      hum: (1 - green * 0.75) * (0.55 + 0.45 * day),
      wind: Math.min(1.4, wind.strength * 1.2) * (0.5 + 0.5 * green),
      rain: env.rain,
      fountain: Math.max(0, 1 - fd / 24),
      cricket: env.night * green * (1 - env.rain),
      birds: day * (0.25 + 0.75 * green) * (1 - env.rain * 0.9) * (1 - 0.5 * env.gloom),
    })
  })
  return null
}
