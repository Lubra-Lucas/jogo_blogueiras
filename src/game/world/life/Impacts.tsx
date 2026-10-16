import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { usePlayerStore } from '../../../state/playerStore'
import { useEmoteStore } from '../../character/animation/emoteStore'
import { env } from '../environment/envState'
import { landSound, stepSound, type StepSurface } from './audio'
import { K_DROP, K_LEAF, K_PUFF, ring, spawn } from './fx'
import { life } from './lifeState'
import { groundAt } from './surface'

/**
 * Efeitos dos passos da jogadora por piso: poeira (pedra), folhinhas (grama), respingo com aneis e gotas (molhado),
 * mais um aneis de poeira ao aterrissar do emote "Pular". Os passos sao por DISTANCIA percorrida (alterna os pes).
 * Ondulacoes na agua do lago ficam em LakeLife.tsx.
 */

const GRASS = [0x7fae5c, 0x9bc46b, 0x6b9a4e]

export function Impacts() {
  const s = useRef({ dist: 0, side: 1, jumpT: -1, wasJump: false, px: 0, pz: 0, init: false, acc: 0 })

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.1)
    const S = s.current
    const p = usePlayerStore.getState()
    const x = p.position.x
    const z = p.position.z
    if (!S.init) {
      S.init = true
      S.px = x
      S.pz = z
    }
    // distancia horizontal real percorrida (ignora teletransporte)
    const moved = Math.hypot(x - S.px, z - S.pz)
    S.px = x
    S.pz = z
    const sp = moved / Math.max(dt, 1e-3)
    const walking = moved < 1.2 && sp > 0.35 && !useEmoteStore.getState().emote
    const gy = p.position.y - 0.82
    const jumping = useEmoteStore.getState().emote === 'jump'

    // ---- aterrissagem do pulo (fim do emote)
    if (jumping) S.wasJump = true
    else if (S.wasJump) {
      S.wasJump = false
      const g = groundAt(x, z)
      if (g !== 'water') {
        const wet = env.wet > 0.5
        const col = wet ? 0xcfd8e0 : g === 'grass' ? 0x9bc46b : 0xd8d2c8
        ring(x, gy + 0.04, z, 0.85, 0.6, col, 0.55)
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + Math.random() * 0.5
          spawn({ x: x + Math.cos(a) * 0.2, y: gy + 0.06, z: z + Math.sin(a) * 0.2, vx: Math.cos(a) * 0.9, vy: 0.3, vz: Math.sin(a) * 0.9, life: 0.6, s0: 0.06, s1: 0.2, color: col, a: 0.4, kind: K_PUFF, drag: 3 })
        }
        landSound()
      }
    }

    if (!walking || p.speed < 0.3) return
    const run = sp > 2.4
    const stride = run ? 1.25 : 0.72
    S.dist += moved
    if (S.dist < stride) return
    S.dist -= stride
    S.side = -S.side

    const yaw = p.yaw
    const fx = Math.sin(yaw)
    const fz = Math.cos(yaw)
    const rx = fz
    const rz = -fx
    const px = x + rx * 0.1 * S.side - fx * 0.05
    const pz = z + rz * 0.1 * S.side - fz * 0.05
    const ground = groundAt(px, pz)
    if (ground === 'water') return // ponte: som de madeira nao existe; ondulacoes no LakeLife
    const raining = env.wet > 0.5 && env.rain > 0.15
    const surface: StepSurface = raining ? 'wet' : ground === 'grass' ? 'grass' : 'stone'
    stepSound(surface, run, Math.hypot(life.cam.x - px, life.cam.z - pz))

    const n = run ? 3 : 2
    if (raining) {
      ring(px, gy + 0.05, pz, 0.3 + (run ? 0.08 : 0), 0.55, 0xdfeaf2, 0.6)
      for (let i = 0; i < n + 1; i++) {
        const a = Math.random() * Math.PI * 2
        spawn({ x: px, y: gy + 0.06, z: pz, vx: Math.cos(a) * 0.5, vy: 1.3 + Math.random() * 0.8, vz: Math.sin(a) * 0.5, life: 0.4, s0: 0.016, color: 0xe6f1fa, a: 0.9, kind: K_DROP, grav: 9.8 })
      }
    } else if (ground === 'grass') {
      for (let i = 0; i < n + 1; i++) {
        const a = Math.random() * Math.PI * 2
        spawn({
          x: px, y: gy + 0.05, z: pz,
          vx: Math.cos(a) * 0.4 - fx * 0.3, vy: 0.9 + Math.random() * 0.6, vz: Math.sin(a) * 0.4 - fz * 0.3,
          life: 0.55, s0: 0.022, color: GRASS[i % 3], a: 1, kind: K_LEAF, grav: 4.5, rot: Math.random() * 6, rotV: (Math.random() - 0.5) * 14,
        })
      }
    } else {
      for (let i = 0; i < n; i++) {
        spawn({
          x: px + (Math.random() - 0.5) * 0.1, y: gy + 0.04, z: pz + (Math.random() - 0.5) * 0.1,
          vx: -fx * 0.25 + (Math.random() - 0.5) * 0.3, vy: 0.12 + Math.random() * 0.1, vz: -fz * 0.25 + (Math.random() - 0.5) * 0.3,
          life: 0.55 + Math.random() * 0.25, s0: 0.04, s1: 0.16 + (run ? 0.06 : 0), color: 0xd9d3c9, a: run ? 0.34 : 0.22, kind: K_PUFF, drag: 2.2,
        })
      }
    }
  })
  return null
}
