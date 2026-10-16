import {
  AnimationClip,
  AnimationMixer,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  Quaternion,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
  type AnimationAction,
  type Bone,
  type Object3D,
} from 'three'

export type ClipName = 'idle' | 'walk' | 'walk_normal' | 'sit' | 'jump' | 'desfile' | 'clap' | 'dance_twerk' | 'walk_start'

/**
 * Velocidade (m/s) que o clipe de passo "cobre" por ciclo (medida no retarget, tools/blender/retarget_mixamo.py ->
 * public/assets/anims/doll_anims.json). timeScale = velocidade real / este valor mantem o pe sem deslizar.
 */
export const CLIP_SPEED: Partial<Record<ClipName, number>> = { walk: 0.855, walk_normal: 1.03, desfile: 0.86 }

export const ANIMS_URL = `${import.meta.env.BASE_URL}assets/anims/doll_anims.glb`

/** Entrada por frame (valores ja lidos dos stores, sem alocar). */
export interface AnimInput {
  speed: number
  emote: 'clap' | 'dance' | 'jump' | null
  desfile: boolean
  seated: boolean
}

const FADE = 0.25
const MOVE_ON = 0.45 // m/s: comeca a andar
const MOVE_OFF = 0.25 // m/s: volta ao idle (histerese)
const RUN_ON = 2.5 // m/s: passa a correr (entre andar e correr do PLAYER)
const RUN_OFF = 2.2
const WALK_TS_MAX = 2.0
const RUN_TS_MAX = 2.8
const TS_MIN = 0.6
const LEAN_RUN = 0.17 // rad de inclinacao para frente ao correr (ate existir um clipe de corrida)
const LEAN_WALK = 0.02

const AXIS_X = { x: 1, y: 0, z: 0 } as const
const AXIS_Z = { x: 0, y: 0, z: 1 } as const

/**
 * Clipe de idle procedural (ate existir um idle do Mixamo; para trocar basta devolver outro AnimationClip em
 * `makeIdleClip`). Congela a pose de repouso atual (bracos baixos via applyRestPose) e soma: respiracao na coluna,
 * troca de peso no quadril (rotacao + leve deslocamento) com contra-rotacao no tronco e leve balanco da cabeca.
 * Tem trilha para TODOS os ossos, entao o crossfade com os clipes do Mixamo e uniforme.
 */
export function makeIdleClip(bones: Record<string, Bone>): AnimationClip {
  const T = 8
  const N = 32
  const times = Array.from({ length: N + 1 }, (_, i) => (i / N) * T)
  const tracks: Array<QuaternionKeyframeTrack | VectorKeyframeTrack> = []
  const q = new Quaternion()
  const base = new Quaternion()
  const qa = new Quaternion()
  const qb = new Quaternion()
  const breathe = (t: number) => Math.sin((t / T) * Math.PI * 2 * 2) // 2 respiracoes em 8 s
  const sway = (t: number) => Math.sin((t / T) * Math.PI * 2) // troca de peso a cada 8 s
  const extra: Record<string, (t: number, out: Quaternion) => void> = {
    mixamorigHips: (t, out) => out.setFromAxisAngle(AXIS_Z, 0.03 * sway(t)),
    mixamorigSpine: (t, out) => out.setFromAxisAngle(AXIS_X, 0.012 * breathe(t)),
    mixamorigSpine1: (t, out) => {
      qa.setFromAxisAngle(AXIS_X, 0.014 * breathe(t))
      qb.setFromAxisAngle(AXIS_Z, -0.02 * sway(t))
      out.copy(qa).multiply(qb)
    },
    mixamorigSpine2: (t, out) => out.setFromAxisAngle(AXIS_X, 0.01 * breathe(t)),
    mixamorigHead: (t, out) => {
      qa.setFromAxisAngle(AXIS_X, -0.012 * breathe(t))
      qb.setFromAxisAngle(AXIS_Z, -0.012 * sway(t))
      out.copy(qa).multiply(qb)
    },
  }
  for (const name in bones) {
    base.copy(bones[name].quaternion)
    const f = extra[name]
    if (!f) {
      tracks.push(new QuaternionKeyframeTrack(`${name}.quaternion`, [0, T], [base.x, base.y, base.z, base.w, base.x, base.y, base.z, base.w]))
      continue
    }
    const vals: number[] = []
    for (const t of times) {
      f(t, q)
      q.premultiply(base) // repouso * delta (delta no espaco local do osso)
      vals.push(q.x, q.y, q.z, q.w)
    }
    tracks.push(new QuaternionKeyframeTrack(`${name}.quaternion`, times, vals))
  }
  const hips = bones.mixamorigHips
  if (hips) {
    const p = hips.position
    const vals: number[] = []
    for (const t of times) vals.push(p.x + 0.008 * sway(t), p.y + 0.002 * (breathe(t) - 1), p.z)
    tracks.push(new VectorKeyframeTrack('mixamorigHips.position', times, vals))
  }
  return new AnimationClip('idle', T, tracks)
}

/**
 * Um mixer por personagem; os clipes sao compartilhados (carregados uma vez). Maquina de estados:
 * idle / walk / run / emote(clap, dance) / desfile, com crossfade de 0,25 s.
 * `update` nao aloca.
 */
export class CharacterAnimator {
  readonly mixer: AnimationMixer
  private actions = new Map<string, AnimationAction>()
  private current: AnimationAction | null = null
  /** clipe em reproducao (depuracao/testes) */
  currentName: ClipName | null = null
  private moving = false
  private running = false
  timeScale = 1
  private lean = 0
  private spine1: Bone | undefined
  private qLean = new Quaternion()

  constructor(root: Object3D, bones: Record<string, Bone>, clips: AnimationClip[], idle: AnimationClip = makeIdleClip(bones)) {
    this.mixer = new AnimationMixer(root)
    for (const c of [...clips, idle]) {
      const a = this.mixer.clipAction(c)
      a.setLoop(c.name === 'walk_start' || c.name === 'jump' ? LoopOnce : LoopRepeat, Infinity)
      if (c.name === 'jump') a.clampWhenFinished = true
      this.actions.set(c.name, a)
    }
    this.spine1 = bones.mixamorigSpine1
  }

  has(name: ClipName) {
    return this.actions.has(name)
  }

  play(name: ClipName, fade = FADE) {
    if (this.currentName === name) return
    const next = this.actions.get(name)
    if (!next) return
    next.enabled = true
    next.setEffectiveTimeScale(1).setEffectiveWeight(1)
    next.reset().play()
    if (this.current && fade > 0) this.current.crossFadeTo(next, fade, false)
    else if (this.current) this.current.stop()
    this.current = next
    this.currentName = name
  }

  /** Visualizador: congela o clipe no instante `t` (s). */
  seek(name: ClipName, t: number) {
    this.play(name, 0)
    const a = this.current
    if (!a) return
    a.paused = true
    a.time = t
    this.mixer.update(0)
  }

  update(dt: number, inp: AnimInput) {
    const speed = inp.speed
    this.moving = !inp.seated && (this.moving ? speed > MOVE_OFF : speed > MOVE_ON)
    this.running = this.running ? speed > RUN_OFF : speed > RUN_ON
    const step: ClipName = inp.desfile ? 'desfile' : 'walk_normal'
    let want: ClipName
    if (inp.seated) want = 'sit'
    else if (this.moving) want = step
    else if (inp.emote === 'clap') want = 'clap'
    else if (inp.emote === 'dance') want = 'dance_twerk'
    else if (inp.emote === 'jump') want = 'jump'
    else if (inp.desfile) want = 'desfile'
    else want = 'idle'
    this.play(want)

    // cadencia do passo acompanha a velocidade real
    let ts = 1
    let leanTarget = 0
    if (this.moving) {
      const cs = CLIP_SPEED[step] ?? 1
      ts = MathUtils.clamp(speed / cs, TS_MIN, this.running ? RUN_TS_MAX : WALK_TS_MAX)
      leanTarget = this.running ? LEAN_RUN : LEAN_WALK
    }
    const k = 1 - Math.exp(-8 * dt)
    this.timeScale += (ts - this.timeScale) * k
    this.lean += (leanTarget - this.lean) * (1 - Math.exp(-5 * dt))
    if (this.current && (this.currentName === 'walk_normal' || this.currentName === 'desfile')) this.current.setEffectiveTimeScale(this.timeScale)
    this.mixer.update(dt)
    if (this.spine1 && this.lean > 0.002) {
      this.qLean.setFromAxisAngle(AXIS_X, this.lean)
      this.spine1.quaternion.multiply(this.qLean)
    }
  }

  dispose() {
    // so para as acoes (nao descarta o cache do mixer: o StrictMode monta/desmonta/monta com o mesmo animator)
    this.mixer.stopAllAction()
    this.current = null
    this.currentName = null
  }
}
