import { Vector3 } from 'three'
import { usePlayerStore } from '../../../state/playerStore'
import { lifeU, wind } from '../../world/life/lifeState'

/**
 * Movimento secundario do personagem (cabelo e saias): duas molas 3D em espaco de MUNDO, uma para o cabelo (mais curta
 * e saltitante) e outra para saias/vestidos (mais mole e larga). O alvo de cada mola vem da velocidade (a massa fica
 * ATRAS), da aceleracao (puxao ao arrancar/frear), da taxa de giro (o cabelo/saia "demora" a virar) e do vento.
 * O shader (secondaryShader.ts) aplica o deslocamento DEPOIS do skinning, ponderado pela altura do vertice.
 * Funciona com qualquer personagem: usa so a velocidade/yaw da jogadora local (quem nao anda so recebe vento).
 */

export const sec = {
  hair: new Vector3(),
  skirt: new Vector3(),
  /** forca do "abrir" da barra da saia ao correr (0..1) */
  flare: 0,
}
const hv = new Vector3()
const sv = new Vector3()
const prevV = new Vector3()
const acc = new Vector3()
const tgt = new Vector3()
let prevYaw = 0
let init = false
let turn = 0
let aSm = new Vector3()

export const uSecHair = { value: new Vector3() }
export const uSecSkirt = { value: new Vector3() }
export const uSecFlare = { value: 0 }

function spring(x: Vector3, v: Vector3, target: Vector3, w: number, z: number, dt: number) {
  // semi-implicito, 2 subpassos para estabilidade com quadros longos
  const n = dt > 0.025 ? 2 : 1
  const h = dt / n
  for (let i = 0; i < n; i++) {
    v.x += (-w * w * (x.x - target.x) - 2 * z * w * v.x) * h
    v.y += (-w * w * (x.y - target.y) - 2 * z * w * v.y) * h
    v.z += (-w * w * (x.z - target.z) - 2 * z * w * v.z) * h
    x.addScaledVector(v, h)
  }
}

/** Atualiza as molas (1x por quadro, depois do PlayerController). */
export function updateSecondary(dt: number, t: number) {
  if (dt <= 0) return
  const p = usePlayerStore.getState()
  const v = p.velocity
  if (!init) {
    init = true
    prevV.copy(v)
    prevYaw = p.yaw
  }
  acc.copy(v).sub(prevV).divideScalar(dt)
  prevV.copy(v)
  aSm.lerp(acc, Math.min(1, dt * 12))
  let dy = p.yaw - prevYaw
  dy = Math.atan2(Math.sin(dy), Math.cos(dy))
  prevYaw = p.yaw
  turn += (dy / dt - turn) * Math.min(1, dt * 10)
  const rx = Math.cos(p.yaw)
  const rz = -Math.sin(p.yaw)
  const ws = wind.strength
  const speed = p.speed
  const bob = Math.sin(t * (speed > 2.4 ? 13 : 8)) * Math.min(1, speed / 2)

  // cabelo: fica para tras, balanca com giros, sobe/desce com o passo
  tgt.set(-v.x * 0.045 - aSm.x * 0.006 + rx * turn * 0.012 + wind.dx * ws * 0.05, bob * 0.012 - aSm.y * 0.004 - 0.003, -v.z * 0.045 - aSm.z * 0.006 + rz * turn * 0.012 + wind.dz * ws * 0.05)
  clampLen(tgt, 0.16)
  spring(sec.hair, hv, tgt, 15, 0.32, dt)

  // saia: mais mole, maior amplitude; o vento empurra a barra
  tgt.set(-v.x * 0.07 - aSm.x * 0.01 + rx * turn * 0.02 + wind.dx * ws * 0.08, bob * 0.018 - aSm.y * 0.006, -v.z * 0.07 - aSm.z * 0.01 + rz * turn * 0.02 + wind.dz * ws * 0.08)
  clampLen(tgt, 0.26)
  spring(sec.skirt, sv, tgt, 9.5, 0.42, dt)

  sec.flare += (Math.min(1, speed / 3.2) - sec.flare) * Math.min(1, dt * 5)
  uSecHair.value.copy(sec.hair)
  uSecSkirt.value.copy(sec.skirt)
  uSecFlare.value = sec.flare
  void lifeU
}

function clampLen(v: Vector3, m: number) {
  const l = v.length()
  if (l > m) v.multiplyScalar(m / l)
}
