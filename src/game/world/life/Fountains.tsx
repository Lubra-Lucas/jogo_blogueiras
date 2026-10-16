import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { K_DROP, K_MIST, ring, spawn } from './fx'
import { LIFE } from './lifeQuality'
import { life, wind } from './lifeState'
import { env } from '../environment/envState'

/**
 * Fontes vivas: gotas em arcos balisticos (cada gota nasce numa borda/jato e cai exatamente na bacia de baixo),
 * aneis de respingo no ponto de queda e neblina fina no topo. Complementa o brilho de agua corrente do shader
 * do material 'water' do kit (scanner.ts). Posicoes/alturas medidas nos GLBs (fountain_center, plaza_centerpiece).
 */

interface Emitter {
  /** altura e raio de saida */
  y: number
  r: number
  /** altura e faixa de raio de chegada */
  toY: number
  r0: number
  r1: number
  /** velocidade ascendente inicial (m/s) */
  up: number
  /** parte da taxa total */
  share: number
}
interface Fountain {
  x: number
  z: number
  mist?: { y: number; amt: number }
  em: Emitter[]
}

const S1 = 1.3 // fonte do cisne (Jardim)
const S2 = 1.25 // fonte-coracao (Praca Central)
const FOUNTAINS: Fountain[] = [
  {
    x: 0,
    z: 158,
    mist: { y: 3.55 * S1, amt: 1 },
    em: [
      { y: 3.55 * S1, r: 0.12, toY: 2.55 * S1, r0: 0.5 * S1, r1: 1.55 * S1, up: 1.9, share: 0.45 },
      { y: 2.6 * S1, r: 1.5 * S1, toY: 0.82 * S1, r0: 1.8 * S1, r1: 2.25 * S1, up: 0.6, share: 0.55 },
    ],
  },
  {
    x: 0,
    z: 0,
    mist: { y: 3.1 * S2, amt: 1 },
    em: [
      { y: 3.1 * S2, r: 0.2, toY: 0.52 * S2, r0: 1.0 * S2, r1: 2.9 * S2, up: 3.2, share: 0.6 },
      { y: 1.55 * S2, r: 1.3 * S2, toY: 0.52 * S2, r0: 1.7 * S2, r1: 3.1 * S2, up: 0.8, share: 0.4 },
    ],
  },
]

const G = 9.8
interface Splash {
  t: number
  x: number
  y: number
  z: number
}

export function Fountains() {
  const acc = useRef(FOUNTAINS.map(() => 0))
  const splashes = useRef<Splash[]>([])
  const mistAcc = useRef(FOUNTAINS.map(() => 0))

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.1)
    const sp = splashes.current
    for (let i = sp.length - 1; i >= 0; i--) {
      sp[i].t -= dt
      if (sp[i].t <= 0) {
        const s = sp[i]
        ring(s.x, s.y + 0.02, s.z, 0.1 + Math.random() * 0.08, 0.7, 0xffffff, 0.55)
        sp[i] = sp[sp.length - 1]
        sp.pop()
      }
    }
    FOUNTAINS.forEach((f, fi) => {
      const dx = life.cam.x - f.x
      const dz = life.cam.z - f.z
      if (dx * dx + dz * dz > 70 * 70) return
      // chuva forte reduz o jato; vento empurra as gotas
      const rate = LIFE.fountainRate * (1 - 0.15 * env.rain)
      acc.current[fi] += dt * rate
      while (acc.current[fi] >= 1) {
        acc.current[fi] -= 1
        let k = Math.random()
        let e = f.em[0]
        for (const c of f.em) {
          if (k < c.share) {
            e = c
            break
          }
          k -= c.share
        }
        const a = Math.random() * Math.PI * 2
        const dst = e.r0 + Math.random() * (e.r1 - e.r0)
        // tempo de voo ate a altura de chegada: y0 + up*t - g/2 t^2 = toY
        const h = e.y - e.toY
        const disc = e.up * e.up + 2 * G * h
        const T = (e.up + Math.sqrt(Math.max(disc, 0.01))) / G
        const rv = (dst - e.r) / T
        const ca = Math.cos(a)
        const sa = Math.sin(a)
        const drift = wind.strength * 0.5
        spawn({
          x: f.x + ca * e.r,
          y: e.y,
          z: f.z + sa * e.r,
          vx: ca * rv + wind.dx * drift,
          vy: e.up,
          vz: sa * rv + wind.dz * drift,
          life: T,
          s0: 0.04 + Math.random() * 0.02,
          color: 0xdff1ff,
          a: 0.95,
          kind: K_DROP,
          grav: G,
        })
        sp.push({ t: T, x: f.x + ca * dst + wind.dx * drift * T, y: e.toY, z: f.z + sa * dst + wind.dz * drift * T })
      }
      if (f.mist) {
        mistAcc.current[fi] += dt * 5
        while (mistAcc.current[fi] >= 1) {
          mistAcc.current[fi] -= 1
          spawn({
            x: f.x + (Math.random() - 0.5) * 0.5,
            y: f.mist.y + 0.1,
            z: f.z + (Math.random() - 0.5) * 0.5,
            vx: wind.dx * (0.2 + wind.strength) + (Math.random() - 0.5) * 0.2,
            vy: 0.25 + Math.random() * 0.3,
            vz: wind.dz * (0.2 + wind.strength) + (Math.random() - 0.5) * 0.2,
            life: 2.2 + Math.random(),
            s0: 0.2,
            s1: 0.85,
            color: 0xf4fbff,
            a: 0.2 + 0.12 * (1 - env.night),
            kind: K_MIST,
            drag: 0.8,
          })
        }
      }
    })
  })
  return null
}
