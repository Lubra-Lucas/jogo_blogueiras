import { Quaternion, Vector3, type Bone, type Object3D } from 'three'
import { DEFAULT_BODY, type BodyParams } from '../../shared/faceCatalog'

/**
 * Proporcoes corporais por OSSOS, em tempo de execucao (sem Blender).
 *
 * Principios:
 *  - COMPRIMENTO = posicao do osso filho (nunca `scale` em osso de membro): a escala de osso propaga para os filhos e deforma
 *    roupa/joia. A malha estica entre os ossos (os pesos de pele suavizam a juncao), e roupas skinned no mesmo esqueleto
 *    acompanham sozinhas.
 *  - TAMANHO de cabeca, maos e pes = escala UNIFORME nesses tres ossos (so tem filhos que devem acompanhar: dedos, dedos do pe,
 *    cabelo/chapeu/brincos). Escala uniforme nao deforma a roupa, so a engrossa junto.
 *  - Roda DEPOIS da animacao a cada quadro: `begin()` desfaz o que foi escrito no quadro anterior, o mixer escreve a pose, `apply()`
 *    sobrepoe posicoes absolutas (resto x fator) e rotacoes aditivas (postura), tudo em torno do eixo X/Z do esqueleto.
 */

// ---- medidas do corpo (m) em repouso: valores iniciais = boneca atual; o BodyRig as REMEDE do esqueleto (so nomes e posicoes
// de ossos), entao um corpo novo com os mesmos ossos mixamorig funciona sem mexer aqui ----
export const DIMS = {
  /** altura do corpo sem cabelo */
  height: 1.6,
  hipsY: 0.844,
  /** coxa + canela */
  legChain: 0.606,
  spine: 0.25,
  neck: 0.16,
  /** do osso Head ao topo do cranio */
  headAbove: 0.346,
  /** do osso Head a linha dos olhos (selfie) */
  eyeAboveHead: 0.09,
  /** altura do osso do tornozelo acima do chao */
  ankleY: 0.213,
}

/** Remede o esqueleto em repouso (nenhuma suposicao de malha): comprimentos dos ossos e altura do tornozelo. */
function measure(root: Object3D, bones: Record<string, Bone>) {
  const g = (n: string) => bones['mixamorig' + n]
  const hips = g('Hips')
  const foot = g('LeftFoot')
  const leg = g('LeftLeg')
  if (!hips || !foot || !leg || !g('Neck') || !g('Head')) return
  root.updateWorldMatrix(true, true)
  const wy = (b: Bone) => b.getWorldPosition(new Vector3()).y
  const hipsY = wy(hips)
  const headY = wy(g('Head'))
  DIMS.hipsY = hipsY
  DIMS.legChain = Math.abs(leg.position.y) + Math.abs(foot.position.y)
  DIMS.ankleY = Math.max(0, wy(foot))
  DIMS.spine = Math.abs(g('Spine').position.y) + Math.abs(g('Spine1').position.y) + Math.abs(g('Spine2').position.y)
  DIMS.neck = Math.abs(g('Neck').position.y) + Math.abs(g('Head').position.y)
  // so para capsula/camera/enquadramento (estimativa por proporcao da boneca; a renderizacao nao usa)
  DIMS.headAbove = 0.276 * headY
  DIMS.eyeAboveHead = 0.072 * headY
  DIMS.height = headY + DIMS.headAbove
}

/** Altura do corpo (m) nos extremos do slider `height`: baixa ~1,45 m, alta ~1,85 m. */
export const HEIGHT_RANGE = { min: 1.45, max: 1.85 }
/** fator de comprimento correspondente aos extremos (resolve `bodyHeight(f) = HEIGHT_RANGE`, ver `heightAt`) */
const F_LO = 0.8875
const F_HI = 1.1868

/** A altura se reparte: pernas crescem mais que o tronco, a cabeca bem menos (estilo boneca). */
const E_LEG = 1.2
const E_TORSO = 0.9
const E_NECK = 1
const E_HEAD = 0.45
const E_ARM = 0.95
const E_HAND = 0.5
const E_FOOT = 0.85
const E_SHOULDER = 0.7

/** Manter a sola no chao: o quadril sobe/desce o quanto as pernas crescem/encolhem (geometrico, pelos ossos) e o pe escalado afunda ~2/3 da altura do tornozelo. */
const FOOT_SOLE_RATIO = 0.66

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** fator de comprimento (1 = boneca original) para o slider de altura -1..1 */
export function heightFactor(h: number): number {
  const v = clamp(h, -1, 1)
  return v >= 0 ? lerp(1, F_HI, v) : lerp(1, F_LO, -v)
}

/** fatores derivados (tudo em torno de 1 = boneca original) */
export interface Proportions {
  f: number
  leg: number
  torso: number
  neck: number
  /** posicao do osso Arm.y (largura do ombro, clavicula) */
  clavicle: number
  arm: number
  head: number
  hand: number
  foot: number
  /** elevacao do osso Hips (m) para a sola continuar no chao */
  hipsDelta: number
  /** razao entre a altura do quadril e a original (escala do passo) */
  stride: number
  /** altura do corpo sem cabelo (m) */
  height: number
  /** altura do osso Head acima dos pes (m) */
  headY: number
  /** altura dos olhos (m) */
  eyeY: number
  /** postura (rad, ver `postureAngles`) */
  posture: number
  lordosis: number
  slope: number
}

export function proportionsOf(b: BodyParams): Proportions {
  const f = heightFactor(b.height)
  const leg = Math.pow(f, E_LEG) * (1 + 0.28 * b.legs)
  const torso = Math.pow(f, E_TORSO) * (1 + 0.22 * b.torso)
  const neck = Math.pow(f, E_NECK) * (1 + 0.55 * b.neck)
  const clavicle = Math.pow(f, E_SHOULDER) * (1 + 0.3 * b.shoulders)
  const arm = Math.pow(f, E_ARM) * (1 + 0.22 * b.arms)
  const head = Math.pow(f, E_HEAD) * (1 + 0.2 * b.headSize)
  const hand = Math.pow(f, E_HAND) * (1 + 0.22 * b.hands)
  const foot = Math.pow(f, E_FOOT) * (1 + 0.2 * b.feet)
  const hipsDelta = DIMS.legChain * (leg - 1) + FOOT_SOLE_RATIO * DIMS.ankleY * (foot - 1)
  const hipsY = DIMS.hipsY + hipsDelta
  const spineTop = hipsY + DIMS.spine * torso
  const headY = spineTop + DIMS.neck * neck
  return {
    f,
    leg,
    torso,
    neck,
    clavicle,
    arm,
    head,
    hand,
    foot,
    hipsDelta,
    stride: hipsY / DIMS.hipsY,
    height: headY + DIMS.headAbove * head,
    headY,
    eyeY: headY + DIMS.eyeAboveHead * head,
    posture: b.posture,
    lordosis: b.lordosis,
    slope: b.shouldersSlope,
  }
}

/** Medidas que o resto do jogo usa (capsula, camera, assento). */
export interface BodyFit {
  /** altura do corpo / 1,60 m */
  heightScale: number
  /** razao hips/original (passo e deslocamentos do assento) */
  stride: number
  /** elevacao do quadril (m) */
  hipsDelta: number
  /** altura do olhar acima dos pes (m) */
  eyeY: number
  height: number
}

export const DEFAULT_FIT: BodyFit = { heightScale: 1, stride: 1, hipsDelta: 0, eyeY: 1.43, height: 1.6 }

export function fitOf(b: BodyParams): BodyFit {
  const p = proportionsOf(b)
  return { heightScale: p.height / DIMS.height, stride: p.stride, hipsDelta: p.hipsDelta, eyeY: p.eyeY, height: p.height }
}

/** Corpo e todo zero (nada a fazer)? */
export function isNeutralBody(b: BodyParams): boolean {
  for (const k of BONE_KEYS) if (Math.abs(b[k]) > 1e-4) return false
  return true
}
const BONE_KEYS = ['height', 'shoulders', 'legs', 'arms', 'torso', 'neck', 'headSize', 'hands', 'feet', 'posture', 'lordosis', 'shouldersSlope'] as const

// ---- angulos de postura (rad) ----
/** Cifose: cada trecho da coluna flexiona; a cabeca compensa para olhar ao horizonte. Ereta (negativo) e mais sutil. */
export function postureAngles(p: number) {
  const a = p >= 0 ? p : p * 0.3
  return {
    spine: 0.07 * a,
    spine1: 0.17 * a,
    spine2: 0.22 * a,
    neck: 0.12 * a,
    /** compensacao da cabeca (rad, contra a flexao) */
    head: -0.5 * a,
    /** compensacao dos bracos: continuam caindo na vertical */
    arm: -0.4 * a,
  }
}

/** parte da correcao de olhar que vai para o pescoco (o resto, para a cabeca) */
const HEAD_LIFT_NECK = 0.4
const LORD_MAX = 0.2
const SLOPE_MAX = 0.2

// ---- aplicacao ----
const _q = new Quaternion()
const _pq = new Quaternion()
const _rq = new Quaternion()
const _r = new Quaternion()
const AX = new Vector3(1, 0, 0)
const AZ = new Vector3(0, 0, 1)

interface Saved {
  bone: Bone
  q: Quaternion
  out: Quaternion
  active: boolean
}

/** Estado/peso de postura de um quadro (0..1), preenchido por quem conhece o contexto (sentada, emote, selfie...). */
export interface PostureWeights {
  posture: number
  lordosis: number
}

export class BodyRig {
  readonly p: Proportions
  private rest = new Map<string, Vector3>()
  private root: Object3D
  private bones: Record<string, Bone>
  private saved = new Map<string, Saved>()
  private hipsBase = new Vector3()
  private hipsOut = new Vector3()
  private hipsActive = false
  private neutral = true
  /** pesos suavizados pelo chamador (0 = sem postura) */
  weights: PostureWeights = { posture: 1, lordosis: 1 }
  /**
   * Correcao de postura da cabeca (rad, >0 = levanta o olhar), ja suavizada e atenuada pelo chamador. Soma-se DEPOIS da cifose
   * (que compensa a cabeca contra a flexao da coluna e deixa o olhar no mesmo lugar): uma e a outra atuam em eixos
   * independentes (a cifose pelo tronco, esta pelo olhar medio da animacao), entao nao acumulam.
   */
  headLift = 0

  constructor(root: Object3D, bones: Record<string, Bone>) {
    this.root = root
    this.bones = bones
    for (const n in bones) this.rest.set(n, bones[n].position.clone())
    measure(root, bones)
    this.p = proportionsOf(DEFAULT_BODY)
    this.set(DEFAULT_BODY)
  }

  set(b: BodyParams) {
    Object.assign(this.p, proportionsOf(b))
    this.neutral = isNeutralBody(b)
    this.writeStatic()
  }

  private bone(n: string) {
    return this.bones['mixamorig' + n]
  }

  private placed(n: string, s: number | Vector3) {
    const bn = this.bone(n)
    const r = this.rest.get('mixamorig' + n)
    if (!bn || !r) return
    if (typeof s === 'number') bn.position.copy(r).multiplyScalar(s)
    else bn.position.set(r.x * s.x, r.y * s.y, r.z * s.z)
  }

  /** posicoes (comprimentos) e escalas uniformes: absolutas, nao dependem da animacao (a animacao so mexe no Hips) */
  private writeStatic() {
    const p = this.p
    const sides = ['Left', 'Right']
    // Pernas: MAIS LONGAS = posicao do filho (a malha estica entre os ossos, sem artefato). MAIS CURTAS = a posicao empurraria a
    // canela por cima da coxa e faria uma "bainha" no joelho (triangulos invertidos), entao comprime-se o comprimento com
    // escala em Y (eixo do osso) na coxa; a canela herda. O pe compensa o Y herdado (so a altura do pe, nao o tamanho).
    const shorten = p.leg < 1
    for (const s of sides) {
      this.placed(`${s}Leg`, shorten ? 1 : p.leg)
      this.placed(`${s}Foot`, shorten ? 1 : p.leg)
      this.bone(`${s}UpLeg`)?.scale.set(1, shorten ? p.leg : 1, 1)
      this.bone(`${s}Foot`)?.scale.set(p.foot, shorten ? p.foot / p.leg : p.foot, p.foot)
      this.placed(`${s}Arm`, new Vector3(1, p.clavicle, 1))
      this.placed(`${s}ForeArm`, p.arm)
      this.placed(`${s}Hand`, p.arm)
      this.placed(`${s}Shoulder`, p.torso)
      this.bone(`${s}Hand`)?.scale.setScalar(p.hand)
    }
    this.placed('Spine', p.torso)
    this.placed('Spine1', p.torso)
    this.placed('Spine2', p.torso)
    this.placed('Neck', p.neck)
    this.placed('Head', p.neck)
    this.bone('Head')?.scale.setScalar(p.head)
  }

  /** 1o passo do quadro: desfaz o que o `apply` do quadro anterior escreveu (o mixer so reescreve o que tem trilha). */
  begin() {
    for (const s of this.saved.values()) {
      if (s.active && s.bone.quaternion.equals(s.out)) s.bone.quaternion.copy(s.q)
      s.active = false
    }
    const hips = this.bone('Hips')
    if (hips && this.hipsActive && hips.position.equals(this.hipsOut)) hips.position.copy(this.hipsBase)
    this.hipsActive = false
  }

  /** Depois da animacao: eleva/escala o quadril e soma a postura. */
  apply() {
    const p = this.p
    const hips = this.bone('Hips')
    if (hips && (p.hipsDelta !== 0 || p.stride !== 1)) {
      this.hipsBase.copy(hips.position)
      hips.position.set(this.hipsBase.x * p.stride, this.hipsBase.y + p.hipsDelta, this.hipsBase.z * p.stride)
      this.hipsOut.copy(hips.position)
      this.hipsActive = true
    }
    const wp = this.weights.posture
    const wl = this.weights.lordosis
    const hunch = Math.abs(p.posture) > 1e-3 && wp > 1e-3
    const lord = Math.abs(p.lordosis) > 1e-3 && wl > 1e-3
    const slope = Math.abs(p.slope) > 1e-3
    const lift = Math.abs(this.headLift) > 1e-4
    if (!hunch && !lord && !slope && !lift) return
    this.root.updateWorldMatrix(true, false)
    if (lord) {
      const a = LORD_MAX * p.lordosis * wl
      this.rot('Hips', a, AX)
      this.rot('LeftUpLeg', -a, AX)
      this.rot('RightUpLeg', -a, AX)
      this.rot('Spine', -0.8 * a, AX)
      this.rot('Spine1', -0.2 * a, AX)
    }
    if (hunch) {
      const t = postureAngles(p.posture * wp)
      this.rot('Spine', t.spine, AX)
      this.rot('Spine1', t.spine1, AX)
      this.rot('Spine2', t.spine2, AX)
      const arm = (t.spine + t.spine1 + t.spine2) * -0.85
      this.rot('LeftArm', arm, AX)
      this.rot('RightArm', arm, AX)
      this.rot('Neck', t.neck, AX)
      this.rot('Head', t.head, AX)
    }
    if (lift) {
      // levantar o olhar = girar para tras (angulo negativo em X); reparte entre o pescoco e a cabeca
      this.rot('Neck', -this.headLift * HEAD_LIFT_NECK, AX)
      this.rot('Head', -this.headLift * (1 - HEAD_LIFT_NECK), AX)
    }
    if (slope) {
      const d = SLOPE_MAX * p.slope
      this.rot('LeftShoulder', -d, AZ)
      this.rot('RightShoulder', d, AZ)
      this.rot('LeftArm', d, AZ)
      this.rot('RightArm', -d, AZ)
    }
  }

  /** Gira o osso `angle` rad em torno de um eixo do esqueleto (X = lateral, Z = frente), no espaco do mundo: a posicao do osso nao muda. */
  private rot(name: string, angle: number, axis: Vector3) {
    if (Math.abs(angle) < 1e-5) return
    const b = this.bone(name)
    if (!b || !b.parent) return
    let s = this.saved.get(name)
    if (!s) this.saved.set(name, (s = { bone: b, q: new Quaternion(), out: new Quaternion(), active: false }))
    if (!s.active) {
      s.q.copy(b.quaternion)
      s.active = true
    }
    b.parent.updateWorldMatrix(true, false)
    b.parent.getWorldQuaternion(_pq)
    this.root.getWorldQuaternion(_rq)
    _r.setFromAxisAngle(axis, angle).premultiply(_rq) // eixo do esqueleto -> mundo
    _r.multiply(_q.copy(_rq).invert()) // R_world = Qroot * Rot * Qroot^-1
    // local' = Pw^-1 * R_world * Pw * local
    b.quaternion.premultiply(_pq).premultiply(_r).premultiply(_pq.invert())
    s.out.copy(b.quaternion)
  }

  get isNeutral() {
    return this.neutral
  }
}
