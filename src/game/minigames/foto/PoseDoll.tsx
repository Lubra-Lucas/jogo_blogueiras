import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Quaternion, Vector3, type Group } from 'three'
import type { Appearance } from '../../../shared/appearance'
import { Character, type CharacterHandle } from '../../character/Character'
import { applyRestPose } from '../../character/pose'
import { applyShootPose, SWAY_BONES } from './bonePoses'
import { POSES, type PoseId } from './data'
import { live } from './live'

const BONE_POSES: PoseId[] = ['neutra', 'cintura', 'cabelo', 'fofa', 'vitoria', 'perfil_esq', 'perfil_dir']
const AX = new Vector3(1, 0, 0)
const AY = new Vector3(0, 1, 0)
const AZ = new Vector3(0, 0, 1)
const qa = new Quaternion()
const qb = new Quaternion()

/**
 * Modelo do ensaio: poses por ossos com transição suave (`cur` -> alvo da pose), clipe "kiss" nos beijinhos e um
 * balanço leve de respiração que PARA no pico da pose (a dica sutil de que é a hora de clicar). Pisca com um
 * pequeno aceno de cabeça. Lê a amostra de `live.sample` (calculada pela diretora da cena).
 */
export function PoseDoll({ appearance }: { appearance: Appearance }) {
  const rig = useRef<CharacterHandle>(null)
  const group = useRef<Group>(null)
  const [clip, setClip] = useState<'kiss' | null>(null)
  /** driver estável: o instante `t` é buscado a cada frame para o beijo coincidir com a janela de pico */
  const drv = useRef<{ clip: 'kiss'; t: number }>({ clip: 'kiss', t: 0 })
  const st = useRef({
    ready: false,
    targets: new Map<PoseId, Map<string, Quaternion>>(),
    cur: new Map<string, Quaternion>(),
    mode: 'bone' as 'bone' | 'clip',
    yaw: 0,
    peakS: 0,
    blinkS: 0,
    t: 0,
  })

  useFrame((_, rawDt) => {
    const r = rig.current
    const s = st.current
    if (!r || !Object.keys(r.bones).length) return
    const dt = Math.min(rawDt, 0.05)
    s.t += dt

    if (!s.ready) {
      const snap = new Map<string, { q: Quaternion; p: Vector3 }>()
      for (const n in r.bones) snap.set(n, { q: r.bones[n].quaternion.clone(), p: r.bones[n].position.clone() })
      for (const id of BONE_POSES) {
        for (const [n, v] of snap) {
          r.bones[n].quaternion.copy(v.q)
          r.bones[n].position.copy(v.p)
        }
        applyRestPose(r.bones, r.root)
        applyShootPose(id, r.bones, r.root)
        const m = new Map<string, Quaternion>()
        for (const n in r.bones) m.set(n, r.bones[n].quaternion.clone())
        s.targets.set(id, m)
      }
      for (const [n, q] of s.targets.get('neutra')!) {
        s.cur.set(n, q.clone())
        r.bones[n].quaternion.copy(q)
      }
      s.ready = true
      return
    }

    const sample = live.sample
    const def = POSES[sample.pose]
    const wantClip = !!def.clip
    if (wantClip && s.mode !== 'clip') {
      s.mode = 'clip'
      setClip('kiss')
    } else if (!wantClip && s.mode === 'clip') {
      // volta ao controle manual a partir dos ossos como o clipe os deixou
      for (const n in r.bones) s.cur.get(n)?.copy(r.bones[n].quaternion)
      s.mode = 'bone'
      setClip(null)
      return
    }

    // giro do corpo
    const yawT = wantClip ? 0 : def.yaw
    s.yaw += (yawT - s.yaw) * (1 - Math.exp(-dt * 4.5))
    if (group.current) group.current.rotation.y = s.yaw

    if (s.mode === 'clip') {
      drv.current.t = Math.min(sample.tIn, (def.clipDur ?? 4) - 0.05)
      return
    }

    const target = s.targets.get(sample.pose) ?? s.targets.get('neutra')!
    const k = 1 - Math.exp(-dt * 6)
    for (const [n, q] of target) s.cur.get(n)?.slerp(q, k)

    s.peakS += (sample.peak - s.peakS) * (1 - Math.exp(-dt * 10))
    s.blinkS += ((sample.blink ? 1 : 0) - s.blinkS) * (1 - Math.exp(-dt * 24))
    const amp = 1 - 0.92 * s.peakS
    const sway: Record<string, [number, number, number]> = {
      mixamorigHips: [0, 0, 0.03 * Math.sin(s.t * 1.2)],
      mixamorigSpine: [0.014 * Math.sin(s.t * 1.9), 0, 0],
      mixamorigSpine1: [0.012 * Math.sin(s.t * 1.9 + 0.4), 0, -0.02 * Math.sin(s.t * 1.2)],
      mixamorigSpine2: [0.01 * Math.sin(s.t * 1.9 + 0.8), 0, 0],
      mixamorigHead: [0.02 * Math.sin(s.t * 0.9 + 1) * amp, 0.04 * Math.sin(s.t * 0.7) * amp, 0.025 * Math.sin(s.t * 1.1) * amp],
    }
    for (const n of SWAY_BONES) {
      const b = r.bones[n]
      const c = s.cur.get(n)
      if (!b || !c) continue
      b.quaternion.copy(c)
      const w = sway[n]
      const lift = n === 'mixamorigHead' ? -0.07 * s.peakS + 0.14 * s.blinkS : 0
      qa.setFromAxisAngle(AX, w[0] * amp + lift)
      qb.setFromAxisAngle(AY, w[1] * amp)
      qa.multiply(qb)
      qb.setFromAxisAngle(AZ, w[2] * amp)
      qa.multiply(qb)
      b.quaternion.premultiply(qa)
    }
    for (const n in r.bones) if (!(SWAY_BONES as readonly string[]).includes(n)) r.bones[n].quaternion.copy(s.cur.get(n) ?? r.bones[n].quaternion)
  })

  return (
    <group ref={group}>
      <Character ref={rig} appearance={appearance} shadows anim={clip ? drv.current : undefined} />
    </group>
  )
}
