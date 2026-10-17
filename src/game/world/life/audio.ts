import { isMuted } from '../../minigames/audio'
import { isMinigameOpen } from '../../minigames/minigameStore'

/**
 * Som sintetizado (WebAudio, sem arquivos): passos e paisagem sonora ambiente (zumbido da cidade, vento, chuva,
 * fonte, passaros de dia, grilos a noite). O mudo e o MESMO dos minijogos (`isMuted()` de minigames/audio.ts).
 * O contexto so e criado/retomado no primeiro gesto do usuario (politica de autoplay dos navegadores).
 */

type Ctx = AudioContext
let ctx: Ctx | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let armed = false

function ensure(): Ctx | null {
  if (ctx) return ctx
  const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!C) return null
  ctx = new C()
  master = ctx.createGain()
  master.gain.value = 0.9
  master.connect(ctx.destination)
  const n = ctx.sampleRate * 2
  noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate)
  const d = noiseBuf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
  buildAmbient()
  return ctx
}

/** Liga o audio no primeiro gesto (clique/tecla/toque). */
export function armLifeAudio() {
  if (armed) return
  armed = true
  const go = () => {
    const c = ensure()
    if (c && c.state === 'suspended') void c.resume()
  }
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, go, { once: false, passive: true })
}

function live(): Ctx | null {
  if (!ctx || ctx.state !== 'running' || isMuted()) return null
  return ctx
}

export type StepSurface = 'stone' | 'grass' | 'wet'

/** Passo suave: rajada de ruido filtrada; a cor depende do piso. */
export function stepSound(surface: StepSurface, run: boolean, dist = 0) {
  const c = live()
  if (!c || !master || !noiseBuf) return
  const vol = (run ? 0.085 : 0.055) * Math.max(0, 1 - dist / 40)
  if (vol < 0.004) return
  const t = c.currentTime
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  src.playbackRate.value = 0.8 + Math.random() * 0.5
  const f = c.createBiquadFilter()
  const g = c.createGain()
  let dur = 0.08
  if (surface === 'stone') {
    f.type = 'bandpass'
    f.frequency.value = 1500 + Math.random() * 700
    f.Q.value = 0.9
  } else if (surface === 'grass') {
    f.type = 'lowpass'
    f.frequency.value = 900 + Math.random() * 400
    f.Q.value = 0.4
    dur = 0.12
  } else {
    f.type = 'bandpass'
    f.frequency.value = 2600 + Math.random() * 900
    f.Q.value = 0.7
    dur = 0.16
  }
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(master)
  src.start(t, Math.random() * 1.5, dur + 0.05)
  // baque grave do calcanhar
  if (surface !== 'wet') {
    const o = c.createOscillator()
    const og = c.createGain()
    o.frequency.setValueAtTime(surface === 'stone' ? 150 : 95, t)
    o.frequency.exponentialRampToValueAtTime(55, t + 0.07)
    og.gain.setValueAtTime(0.0001, t)
    og.gain.exponentialRampToValueAtTime(vol * 0.7, t + 0.006)
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
    o.connect(og).connect(master)
    o.start(t)
    o.stop(t + 0.1)
  }
}

export function landSound() {
  const c = live()
  if (!c || !master || !noiseBuf) return
  const t = c.currentTime
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 700
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.1, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
  src.connect(f).connect(g).connect(master)
  src.start(t, 0.3, 0.25)
}

// ---------------------------------------------------------------- ambiente

interface Amb {
  hum: GainNode
  wind: GainNode
  rain: GainNode
  fountain: GainNode
  cricket: GainNode
  birdBus: GainNode
}
let amb: Amb | null = null

function noiseLoop(c: Ctx, type: BiquadFilterType, freq: number, q: number, dest: AudioNode, rate = 1) {
  const s = c.createBufferSource()
  s.buffer = noiseBuf
  s.loop = true
  s.playbackRate.value = rate
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  s.connect(f).connect(dest)
  s.start(0, Math.random())
}

function buildAmbient() {
  const c = ctx!
  const mk = () => {
    const g = c.createGain()
    g.gain.value = 0
    g.connect(master!)
    return g
  }
  const hum = mk()
  noiseLoop(c, 'lowpass', 260, 0.7, hum, 0.5)
  const hb = c.createOscillator()
  const hbg = c.createGain()
  hb.type = 'sine'
  hb.frequency.value = 58
  hbg.gain.value = 0.25
  hb.connect(hbg).connect(hum)
  hb.start()

  const wind = mk()
  // modulacao MULTIPLICATIVA: ruido -> windMod (base 1, LFO soma +-0.35) -> wind (mix). Se o LFO fosse ligado
  // direto em wind.gain, ele somaria ao mix e o vento chiaria sempre (mesmo com mix 0 / mudo).
  const windMod = c.createGain()
  windMod.gain.value = 1
  windMod.connect(wind)
  noiseLoop(c, 'bandpass', 520, 0.6, windMod, 0.7)
  const lfo = c.createOscillator()
  const lfoG = c.createGain()
  lfo.frequency.value = 0.18
  lfoG.gain.value = 0.35
  lfo.connect(lfoG).connect(windMod.gain)
  lfo.start()

  const rain = mk()
  noiseLoop(c, 'highpass', 1800, 0.4, rain)
  noiseLoop(c, 'lowpass', 7000, 0.4, rain, 1.3)

  const fountain = mk()
  noiseLoop(c, 'bandpass', 2400, 0.5, fountain)
  noiseLoop(c, 'bandpass', 900, 0.8, fountain, 0.8)

  const cricket = mk()
  const co = c.createOscillator()
  co.type = 'sine'
  co.frequency.value = 4300
  const am = c.createGain()
  am.gain.value = 0
  const lf = c.createOscillator()
  lf.type = 'square'
  lf.frequency.value = 9
  const lg = c.createGain()
  lg.gain.value = 0.5
  const lf2 = c.createOscillator()
  lf2.frequency.value = 0.35
  lf2.type = 'sine'
  const lg2 = c.createGain()
  lg2.gain.value = 0.25
  lf.connect(lg).connect(am.gain)
  lf2.connect(lg2).connect(am.gain)
  co.connect(am).connect(cricket)
  co.start()
  lf.start()
  lf2.start()
  const co2 = c.createOscillator()
  co2.frequency.value = 5100
  const am2 = c.createGain()
  am2.gain.value = 0
  const lfb = c.createOscillator()
  lfb.type = 'square'
  lfb.frequency.value = 7
  const lgb = c.createGain()
  lgb.gain.value = 0.4
  lfb.connect(lgb).connect(am2.gain)
  co2.connect(am2).connect(cricket)
  co2.start()
  lfb.start()

  const birdBus = mk()
  birdBus.gain.value = 1
  amb = { hum, wind, rain, fountain, cricket, birdBus }
}

export interface AmbientMix {
  hum: number
  wind: number
  rain: number
  fountain: number
  cricket: number
  birds: number
}

let lastMix = 0
let nextChirp = 0
/** Ajusta os volumes (chamar ~4x/s) e agenda cantos de passaros. */
export function updateAmbient(mix: AmbientMix) {
  const c = ctx
  if (!c || !amb || c.state !== 'running') return
  const mute = isMuted() || isMinigameOpen()
  const t = c.currentTime
  const set = (g: GainNode, v: number) => g.gain.setTargetAtTime(mute ? 0 : v, t, 0.6)
  if (t - lastMix > 0.2) {
    lastMix = t
    set(amb.hum, mix.hum * 0.05)
    set(amb.wind, mix.wind * 0.07)
    set(amb.rain, mix.rain * 0.09)
    set(amb.fountain, mix.fountain * 0.07)
    set(amb.cricket, mix.cricket * 0.018)
  }
  if (!mute && mix.birds > 0.05 && t > nextChirp) {
    nextChirp = t + 0.6 + Math.random() * (3.2 / mix.birds)
    chirp(c, amb.birdBus, t + 0.02, mix.birds)
  }
}

function chirp(c: Ctx, dest: AudioNode, t0: number, loud: number) {
  const notes = 2 + Math.floor(Math.random() * 4)
  const base = 2300 + Math.random() * 1900
  let t = t0
  const pan = c.createStereoPanner ? c.createStereoPanner() : null
  if (pan) {
    pan.pan.value = Math.random() * 1.6 - 0.8
    pan.connect(dest)
  }
  for (let i = 0; i < notes; i++) {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sine'
    const f = base * (0.9 + Math.random() * 0.35)
    o.frequency.setValueAtTime(f, t)
    o.frequency.exponentialRampToValueAtTime(f * (Math.random() < 0.5 ? 1.35 : 0.72), t + 0.07)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.012 * loud, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
    o.connect(g).connect(pan ?? dest)
    o.start(t)
    o.stop(t + 0.11)
    t += 0.085 + Math.random() * 0.06
  }
}
