import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CITY } from '../city/layout'
import { romanticReserved } from '../city/romantic'
import { K_LEAF, spawn } from './fx'
import { LIFE } from './lifeQuality'
import { life, wind } from './lifeState'

/**
 * Folhas e petalas que caem das arvores do Parque do Lago e do Jardim (e de qualquer arvore perto da jogadora).
 * Poucas (orcamento por qualidade), levadas pelo vento; pertencem ao pool de particulas (fx.ts).
 */

// cores de outono/primavera realistas; rosa so de vez em quando (petalas)
const LEAF = [0x86b86a, 0x9cc46f, 0xc6cf6b, 0xe0b94f, 0xd98a3f, 0x7aa65e]
const PETAL = [0xf4b6c6, 0xfbe3e8, 0xffffff]

export function FallingLeaves() {
  const acc = useRef(0)
  const trees = useMemo(
    () =>
      CITY.trees
        .filter((t) => t.kind !== 'dark' && t.kind !== 'palm' && !romanticReserved(t.x, t.z, 1.2))
        .map((t) => ({ x: t.x, z: t.z, h: t.kind === 'cone' ? 3.5 : t.kind === 'orb' ? 4.5 : t.kind === 'heart' ? 3.5 : 3.4, s: t.s, blossom: t.kind === 'blossom' })),
    [],
  )
  const near = useRef<number[]>([])
  const cool = useRef(0)

  useFrame((_, dt0) => {
    if (LIFE.leaves <= 0) return
    const dt = Math.min(dt0, 0.1)
    cool.current -= dt
    if (cool.current <= 0) {
      cool.current = 1
      const list = near.current
      list.length = 0
      for (let i = 0; i < trees.length; i++) {
        const t = trees[i]
        const dx = t.x - life.player.x
        const dz = t.z - life.player.z
        if (dx * dx + dz * dz < 38 * 38) list.push(i)
      }
    }
    const list = near.current
    if (!list.length) return
    // rajadas soltam mais folhas
    const rate = (LIFE.leaves / 8) * (0.6 + 1.4 * wind.gust)
    acc.current += dt * rate
    while (acc.current >= 1) {
      acc.current -= 1
      const t = trees[list[Math.floor(Math.random() * list.length)]]
      const petal = t.blossom ? Math.random() < 0.75 : Math.random() < 0.08
      const col = petal ? PETAL[Math.floor(Math.random() * PETAL.length)] : LEAF[Math.floor(Math.random() * LEAF.length)]
      const y0 = t.h * t.s * (0.8 + Math.random() * 0.4)
      const fall = 0.4 + Math.random() * 0.25
      const sp = 0.4 + wind.strength * 2.2
      spawn({
        x: t.x + (Math.random() - 0.5) * 1.8 * t.s,
        y: y0,
        z: t.z + (Math.random() - 0.5) * 1.8 * t.s,
        vx: wind.dx * sp + (Math.random() - 0.5) * 0.4,
        vy: -fall,
        vz: wind.dz * sp + (Math.random() - 0.5) * 0.4,
        life: y0 / fall,
        s0: petal ? 0.035 : 0.06 + Math.random() * 0.03,
        color: col,
        a: 1,
        kind: K_LEAF,
        rot: Math.random() * 6.28,
        rotV: (Math.random() - 0.5) * 5,
      })
    }
  })
  return null
}
