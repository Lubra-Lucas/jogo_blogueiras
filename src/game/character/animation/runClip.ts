import { AnimationClip, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack, type KeyframeTrack } from 'three'

/**
 * CORRIDA PROVISORIA (procedural). Nao ha clipe de corrida (so "Running Turn 180") em E:\Jogo Blog, entao o clipe `run` e
 * derivado do ciclo de caminhada `walk_normal` em tempo de carga: as oscilacoes de cada osso em torno da pose media sao
 * amplificadas (passada maior, bracos soltos), joelhos e cotovelos ganham flexao fixa, o quadril sobe e desce mais (fase de voo)
 * e o tronco gira mais. E um "trote" feminino leve, nao uma corrida de atleta.
 * Fallback: o GLB agora traz o `run` real do Mixamo (Running (1).fbx); isto so e usado se o clipe faltar.
 * GLB passa a ter prioridade sobre este (animator.ts so gera o procedural se `run` nao existir).
 */
export interface RunTuning {
  /** amplificacao da oscilacao por osso (1 = igual a caminhada) */
  swing: Record<string, number>
  /** flexao extra (rad) em torno do eixo de flexao do osso */
  flex: Record<string, number>
  /** eixo de flexao fixo (no espaco local do osso) quando o eixo deduzido da caminhada nao serve */
  axis: Record<string, [number, number, number]>
  hipsBounce: number
  hipsSway: number
  hipsDrop: number
}

export const RUN_TUNING: RunTuning = {
  swing: {
    mixamorigLeftUpLeg: 2.0,
    mixamorigRightUpLeg: 2.0,
    mixamorigLeftLeg: 1.45,
    mixamorigRightLeg: 1.45,
    mixamorigLeftFoot: 1.4,
    mixamorigRightFoot: 1.4,
    mixamorigLeftArm: 1.35,
    mixamorigRightArm: 1.35,
    mixamorigLeftForeArm: 1.2,
    mixamorigRightForeArm: 1.2,
    mixamorigHips: 1.5,
    mixamorigSpine: 1.6,
    mixamorigSpine1: 1.6,
    mixamorigSpine2: 1.6,
    mixamorigHead: 0.6,
    mixamorigNeck: 0.6,
  },
  flex: { mixamorigLeftLeg: 0.38, mixamorigRightLeg: 0.38, mixamorigLeftForeArm: 1.15, mixamorigRightForeArm: 1.15 },
  axis: {},
  hipsBounce: 2.2,
  hipsSway: 1.3,
  hipsDrop: 0.05,
}

const vAx = new Vector3()
const qi = new Quaternion()
const qd = new Quaternion()
const qo = new Quaternion()

/** media (ciclica, aproximada) de uma lista de quaternions proximos */
function meanQuat(v: ArrayLike<number>): Quaternion {
  let x = 0
  let y = 0
  let z = 0
  let w = 0
  const rx = v[0]
  const ry = v[1]
  const rz = v[2]
  const rw = v[3]
  for (let i = 0; i < v.length; i += 4) {
    const s = v[i] * rx + v[i + 1] * ry + v[i + 2] * rz + v[i + 3] * rw < 0 ? -1 : 1
    x += v[i] * s
    y += v[i + 1] * s
    z += v[i + 2] * s
    w += v[i + 3] * s
  }
  return new Quaternion(x, y, z, w).normalize()
}

/** escala o angulo de uma rotacao (q ja normalizada, w >= 0 apos o ajuste) */
function scaleAngle(q: Quaternion, k: number, out: Quaternion) {
  if (q.w < 0) q = out.set(-q.x, -q.y, -q.z, -q.w)
  else out.copy(q)
  const s = Math.hypot(out.x, out.y, out.z)
  if (s < 1e-7) return out.set(0, 0, 0, 1)
  const ang = 2 * Math.atan2(s, out.w) * k
  const h = Math.sin(ang / 2) / s
  return out.set(out.x * h, out.y * h, out.z * h, Math.cos(ang / 2))
}

/** Gera o clipe `run` a partir do `walk_normal`. */
export function buildRunClip(walk: AnimationClip, tune: RunTuning = RUN_TUNING): AnimationClip {
  const tracks: KeyframeTrack[] = []
  for (const tr of walk.tracks) {
    const [bone, prop] = tr.name.split('.')
    if (prop === 'quaternion') {
      const v = tr.values
      const k = tune.swing[bone] ?? 1
      const flex = tune.flex[bone] ?? 0
      const m = meanQuat(v)
      qi.copy(m).invert()
      // eixo de flexao: eixo da maior oscilacao (a que mais se afasta da media)
      let best = 0
      let ax = 1
      let ay = 0
      let az = 0
      if (flex) {
        for (let i = 0; i < v.length; i += 4) {
          qd.set(v[i], v[i + 1], v[i + 2], v[i + 3])
          qd.premultiply(qi) // m^-1 * q
          if (qd.w < 0) qd.set(-qd.x, -qd.y, -qd.z, -qd.w)
          const s = Math.hypot(qd.x, qd.y, qd.z)
          if (s > best) {
            best = s
            ax = qd.x / s
            ay = qd.y / s
            az = qd.z / s
          }
        }
        const fixed = tune.axis[bone]
        if (fixed) [ax, ay, az] = fixed
        qo.setFromAxisAngle(vAx.set(ax, ay, az), flex)
      }
      const out = new Float32Array(v.length)
      for (let i = 0; i < v.length; i += 4) {
        qd.set(v[i], v[i + 1], v[i + 2], v[i + 3])
        qd.premultiply(qi) // delta local = m^-1 * q
        scaleAngle(qd, k, qd)
        qd.premultiply(m)
        if (flex) qd.multiply(qo)
        out[i] = qd.x
        out[i + 1] = qd.y
        out[i + 2] = qd.z
        out[i + 3] = qd.w
      }
      tracks.push(new QuaternionKeyframeTrack(tr.name, Array.from(tr.times), Array.from(out)))
    } else if (prop === 'position' && bone === 'mixamorigHips') {
      const v = tr.values
      const n = v.length / 3
      const mean = [0, 0, 0]
      for (let i = 0; i < v.length; i += 3) for (let a = 0; a < 3; a++) mean[a] += v[i + a] / n
      const out = new Float32Array(v.length)
      for (let i = 0; i < v.length; i += 3) {
        out[i] = mean[0] + (v[i] - mean[0]) * tune.hipsSway
        out[i + 1] = mean[1] + (v[i + 1] - mean[1]) * tune.hipsBounce - tune.hipsDrop
        out[i + 2] = mean[2] + (v[i + 2] - mean[2]) * tune.hipsSway
      }
      tracks.push(new VectorKeyframeTrack(tr.name, Array.from(tr.times), Array.from(out)))
    } else {
      tracks.push(tr.clone())
    }
  }
  return new AnimationClip('run', walk.duration, tracks)
}
