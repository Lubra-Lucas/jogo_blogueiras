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

/** Clipes do retarget (tools/blender/retarget_mixamo.py). `core` = doll_anims_core.glb, o resto vem de doll_anims_emotes.glb. */
export type ClipName =
  | 'idle'
  | 'walk'
  | 'walk_normal'
  | 'desfile'
  | 'stand_to_sit'
  | 'sit_to_stand'
  | 'sit'
  | 'run_turn'
  | 'clap'
  | 'dance_twerk'
  | 'jump'
  | 'wave'
  | 'kiss'
  | 'bow'
  | 'laugh'
  | 'cry'
  | 'point'
  | 'thankful'
  | 'texting'

/** Clipes do arquivo de emotes (carregado sob demanda). */
export const EMOTE_CLIPS: ReadonlySet<string> = new Set(['clap', 'dance_twerk', 'jump', 'wave', 'kiss', 'bow', 'laugh', 'cry', 'point', 'thankful', 'texting'])

/** Velocidade (m/s) que o clipe de passo cobre por ciclo a 1x; timeScale = velocidade real / este valor (sem deslizar o pe). */
export const CLIP_SPEED: Partial<Record<ClipName, number>> = { walk_normal: 1.03, desfile: 0.86 }

const BASE = import.meta.env.BASE_URL
export const CORE_URL = `${BASE}assets/anims/doll_anims_core.glb`
export const EMOTES_URL = `${BASE}assets/anims/doll_anims_emotes.glb`

/** Clipes de ator unico (tocam uma vez e seguram o ultimo frame). */
const ONE_SHOT: ReadonlySet<string> = new Set(['stand_to_sit', 'sit_to_stand', 'run_turn', 'jump', 'wave', 'kiss', 'bow', 'laugh', 'cry', 'point', 'thankful'])
const REPEATS: Partial<Record<ClipName, number>> = { wave: 3 }
/** Clipes que mantem o ultimo frame ao terminar (ficam sentados / nao voltam ao primeiro quadro). */
const CLAMP: ReadonlySet<string> = new Set(['stand_to_sit', 'sit_to_stand', 'run_turn'])

/** Entrada por frame (valores ja lidos dos stores, sem alocar). */
export interface AnimInput {
  /** curva de 180 graus correndo */
  turn: boolean
  speed: number
  /** clipe do emote em andamento (ou null) e se deve tocar so uma vez */
  emote: ClipName | null
  emoteOnce: boolean
  desfile: boolean
  /** sentando / sentada / levantando */
  seat: 'none' | 'sitting' | 'standing'
  /** digitando no chat: pose do celular */
  typing: boolean
}

const FADE = 0.25
const MOVE_ON = 0.45 // m/s: comeca a andar
const MOVE_OFF = 0.25 // m/s: volta ao idle (histerese)
const RUN_ON = 2.5 // m/s: passa a correr
const RUN_OFF = 2.2
const WALK_TS_MAX = 2.0
const RUN_TS_MAX = 2.8
const TS_MIN = 0.6
const LEAN_RUN = 0.17 // rad de inclinacao para frente ao correr (ate existir um clipe de corrida)
const LEAN_WALK = 0.02
const FIDGET_MIN = 10 // s parada sem fazer nada ate pegar o celular
const FIDGET_RAND = 5
const FIDGET_DUR_MIN = 8
const FIDGET_DUR_RAND = 4

const AXIS_X = { x: 1, y: 0, z: 0 } as const
const AXIS_Z = { x: 0, y: 0, z: 1 } as const

/**
 * Idle procedural de reserva (so se o clipe `idle` do Mixamo nao vier): respiracao e troca de peso sobre a pose de repouso.
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
  const breathe = (t: number) => Math.sin((t / T) * Math.PI * 2 * 2)
  const sway = (t: number) => Math.sin((t / T) * Math.PI * 2)
  const extra: Record<string, (t: number, out: Quaternion) => void> = {
    mixamorigHips: (t, out) => out.setFromAxisAngle(AXIS_Z, 0.03 * sway(t)),
    mixamorigSpine: (t, out) => out.setFromAxisAngle(AXIS_X, 0.012 * breathe(t)),
    mixamorigSpine1: (t, out) => {
      qa.setFromAxisAngle(AXIS_X, 0.014 * breathe(t))
      qb.setFromAxisAngle(AXIS_Z, -0.02 * sway(t))
      out.copy(qa).multiply(qb)
    },
    mixamorigSpine2: (t, out) => out.setFromAxisAngle(AXIS_X, 0.01 * breathe(t)),
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
      q.premultiply(base)
      vals.push(q.x, q.y, q.z, q.w)
    }
    tracks.push(new QuaternionKeyframeTrack(`${name}.quaternion`, times, vals))
  }
  return new AnimationClip('idle', T, tracks)
}

/**
 * Um mixer por personagem; os clipes sao compartilhados (carregados uma vez). Maquina de estados:
 * idle (Breathing Idle) / walk / run / emotes / desfile / sentar-levantar, com crossfade. Parada ha 10-15 s, pega o
 * celular (texting) por um tempo. `update` nao aloca.
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
  private idleT = 0
  private fidgetAt = FIDGET_MIN + Math.random() * FIDGET_RAND
  private fidgetUntil = 0
  private clock = 0

  constructor(root: Object3D, bones: Record<string, Bone>, clips: AnimationClip[]) {
    this.mixer = new AnimationMixer(root)
    this.spine1 = bones.mixamorigSpine1
    this.addClips(clips)
    if (!this.actions.has('idle')) this.addClips([makeIdleClip(bones)])
  }

  /** Adiciona clipes (ex.: o arquivo de emotes carregado sob demanda). */
  addClips(clips: AnimationClip[]) {
    for (const c of clips) {
      if (this.actions.has(c.name)) continue
      const a = this.mixer.clipAction(c)
      a.clampWhenFinished = CLAMP.has(c.name) || ONE_SHOT.has(c.name)
      this.actions.set(c.name, a)
    }
  }

  has(name: ClipName) {
    return this.actions.has(name)
  }

  /** duracao (s) de um clipe; 0 se ainda nao carregado */
  duration(name: ClipName) {
    return this.actions.get(name)?.getClip().duration ?? 0
  }

  /** `once`: toca uma vez e segura o ultimo frame (dispara `finished`); senao repete. */
  play(name: ClipName, fade = FADE, once = false) {
    if (this.currentName === name) return
    const next = this.actions.get(name)
    if (!next) return
    next.enabled = true
    next.setEffectiveTimeScale(1).setEffectiveWeight(1)
    next.paused = false
    if (once || ONE_SHOT.has(name) && !this.looping) next.setLoop(LoopOnce, 1)
    else next.setLoop(LoopRepeat, Infinity)
    if (once && REPEATS[name]) next.setLoop(LoopRepeat, REPEATS[name]!)
    next.reset().play()
    if (this.current && fade > 0) this.current.crossFadeTo(next, fade, false)
    else if (this.current) this.current.stop()
    this.current = next
    this.currentName = name
  }

  /** modo continuo (minigames/visualizador): clipes de ator unico repetem em vez de parar */
  looping = false

  /** Visualizador: congela o clipe no instante `t` (s). */
  seek(name: ClipName, t: number) {
    this.looping = true
    this.play(name, 0)
    const a = this.current
    if (!a) return
    a.paused = true
    a.time = t
    this.mixer.update(0)
  }

  update(dt: number, inp: AnimInput) {
    this.clock += dt
    const speed = inp.speed
    this.moving = inp.seat === 'none' && (this.moving ? speed > MOVE_OFF : speed > MOVE_ON)
    this.running = this.running ? speed > RUN_OFF : speed > RUN_ON
    const step: ClipName = inp.desfile ? 'desfile' : 'walk_normal'
    let want: ClipName = 'idle'
    let once = false
    let fade = FADE
    let idle = false
    if (inp.turn && this.actions.has('run_turn') && inp.seat === 'none') {
      want = 'run_turn'
      once = true
      fade = 0.12
    } else if (inp.seat === 'sitting') {
      want = 'stand_to_sit'
      once = true
    } else if (inp.seat === 'standing') {
      want = 'sit_to_stand'
      once = true
    } else if (this.moving) want = step
    else if (inp.emote && this.actions.has(inp.emote)) {
      want = inp.emote
      once = inp.emoteOnce || ONE_SHOT.has(inp.emote)
      fade = 0.3
    } else if (inp.desfile) want = 'desfile'
    else if ((inp.typing || this.clock < this.fidgetUntil) && this.actions.has('texting')) {
      want = 'texting'
      fade = 0.4
    } else idle = true

    // parada sem fazer nada por 10-15 s: pega o celular por um tempo
    if (idle) {
      this.idleT += dt
      if (this.idleT > this.fidgetAt && this.actions.has('texting')) {
        this.fidgetUntil = this.clock + FIDGET_DUR_MIN + Math.random() * FIDGET_DUR_RAND
        this.idleT = 0
        this.fidgetAt = FIDGET_MIN + Math.random() * FIDGET_RAND
      }
    } else {
      this.idleT = 0
      if (this.moving || inp.emote || inp.seat !== 'none') this.fidgetUntil = 0
    }
    if (want === 'idle' && this.currentName === 'texting') fade = 0.4
    this.play(want, fade, once)

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
