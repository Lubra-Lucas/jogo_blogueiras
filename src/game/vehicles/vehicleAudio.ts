import { drive } from './driveStore'
import { vin } from './vehicleInput'

/** Audio do carro 100% sintetizado (WebAudio, sem arquivos): motor, pneus, buzina, batidas, nitro e radio. */

export interface StationInfo {
  name: string
  genre: string
}
export const STATIONS: StationInfo[] = [
  { name: 'Brilho FM', genre: 'Pop' },
  { name: 'Neon 88', genre: 'Synthwave' },
  { name: 'Lofi Jardim', genre: 'Lofi' },
]

type Ctx = AudioContext
let ctx: Ctx | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null

interface Eng {
  o1: OscillatorNode
  o2: OscillatorNode
  lp: BiquadFilterNode
  g: GainNode
  noise: AudioBufferSourceNode
  screechF: BiquadFilterNode
  screechG: GainNode
  windF: BiquadFilterNode
  windG: GainNode
  horn1: OscillatorNode
  horn2: OscillatorNode
  hornG: GainNode
}
let eng: Eng | null = null
let running = false

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

function getCtx(): Ctx | null {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C()
    master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(ctx.destination)
    const len = ctx.sampleRate * 2
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function noiseSrc(c: Ctx): AudioBufferSourceNode {
  const s = c.createBufferSource()
  s.buffer = noiseBuf
  s.loop = true
  return s
}

function build(c: Ctx): Eng {
  const g = c.createGain()
  g.gain.value = 0
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 600
  lp.Q.value = 2
  const o1 = c.createOscillator()
  o1.type = 'sawtooth'
  const o2 = c.createOscillator()
  o2.type = 'square'
  const g2 = c.createGain()
  g2.gain.value = 0.35
  o1.connect(lp)
  o2.connect(g2).connect(lp)
  lp.connect(g).connect(master!)
  o1.start()
  o2.start()

  const noise = noiseSrc(c)
  const screechF = c.createBiquadFilter()
  screechF.type = 'bandpass'
  screechF.frequency.value = 2300
  screechF.Q.value = 4
  const screechG = c.createGain()
  screechG.gain.value = 0
  noise.connect(screechF).connect(screechG).connect(master!)
  const windF = c.createBiquadFilter()
  windF.type = 'lowpass'
  windF.frequency.value = 500
  const windG = c.createGain()
  windG.gain.value = 0
  noise.connect(windF).connect(windG).connect(master!)
  noise.start()

  const hornG = c.createGain()
  hornG.gain.value = 0
  const horn1 = c.createOscillator()
  horn1.type = 'sawtooth'
  horn1.frequency.value = 415
  const horn2 = c.createOscillator()
  horn2.type = 'sawtooth'
  horn2.frequency.value = 523
  const hlp = c.createBiquadFilter()
  hlp.type = 'lowpass'
  hlp.frequency.value = 1800
  horn1.connect(hlp)
  horn2.connect(hlp)
  hlp.connect(hornG).connect(master!)
  horn1.start()
  horn2.start()
  return { o1, o2, lp, g, noise, screechF, screechG, windF, windG, horn1, horn2, hornG }
}

function burst(c: Ctx, dur: number, freq: number, q: number, vol: number, type: BiquadFilterType = 'bandpass', slide?: number) {
  const t = c.currentTime
  const s = noiseSrc(c)
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.setValueAtTime(freq, t)
  if (slide) f.frequency.exponentialRampToValueAtTime(slide, t + dur)
  f.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  s.connect(f).connect(g).connect(master!)
  s.start(t)
  s.stop(t + dur + 0.05)
}

let lastThump = 0

export const vehicleAudio = {
  start() {
    const c = getCtx()
    if (!c) return
    if (!eng) eng = build(c)
    running = true
    eng.g.gain.cancelScheduledValues(c.currentTime)
    eng.g.gain.setTargetAtTime(0.1, c.currentTime, 0.1)
    radio.resume()
  },
  stop() {
    running = false
    radio.pause()
    const c = ctx
    if (!c || !eng) return
    const t = c.currentTime
    eng.g.gain.cancelScheduledValues(t)
    eng.g.gain.setTargetAtTime(0, t, 0.08)
    eng.screechG.gain.setTargetAtTime(0, t, 0.05)
    eng.windG.gain.setTargetAtTime(0, t, 0.1)
    eng.hornG.gain.setTargetAtTime(0, t, 0.03)
  },
  /** por quadro: rpm 0..1, acelerador 0..1 */
  update(rpm: number, throttle: number, speed: number) {
    const c = ctx
    if (!c || !eng || !running) return
    const t = c.currentTime
    const f = 46 + rpm * 118 + (drive.boosting ? 22 : 0)
    eng.o1.frequency.setTargetAtTime(f, t, 0.04)
    eng.o2.frequency.setTargetAtTime(f * 0.5, t, 0.04)
    eng.lp.frequency.setTargetAtTime(360 + rpm * 1100 + throttle * 700, t, 0.05)
    eng.g.gain.setTargetAtTime(0.075 + throttle * 0.06 + rpm * 0.05, t, 0.06)
    eng.windG.gain.setTargetAtTime(Math.min(0.13, (speed / 40) * (speed / 40) * 0.2), t, 0.15)
    eng.windF.frequency.setTargetAtTime(300 + speed * 35, t, 0.2)
    eng.hornG.gain.setTargetAtTime(vin.horn ? 0.07 : 0, t, 0.015)
  },
  screech(amount: number, lateral: number) {
    const c = ctx
    if (!c || !eng || !running) return
    const t = c.currentTime
    eng.screechG.gain.setTargetAtTime(amount * 0.09, t, 0.05)
    eng.screechF.frequency.setTargetAtTime(1700 + Math.min(1200, lateral * 90), t, 0.08)
  },
  thump(strength: number) {
    const c = getCtx()
    if (!c) return
    const now = performance.now()
    if (now - lastThump < 120) return
    lastThump = now
    const t = c.currentTime
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(130, t)
    o.frequency.exponentialRampToValueAtTime(38, t + 0.22)
    const g = c.createGain()
    g.gain.setValueAtTime(0.5 * strength + 0.12, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26)
    o.connect(g).connect(master!)
    o.start(t)
    o.stop(t + 0.3)
    burst(c, 0.16, 700, 0.8, 0.28 * strength + 0.05, 'lowpass', 140)
  },
  whoosh() {
    const c = getCtx()
    if (!c) return
    burst(c, 0.7, 500, 1.2, 0.14, 'bandpass', 2600)
  },
  /** estalo de porta */
  door() {
    const c = getCtx()
    if (!c) return
    burst(c, 0.09, 900, 1, 0.22, 'lowpass', 200)
  },
}

// ---------------------------------------------------------------- radio

interface Voice {
  type: OscillatorType
  vol: number
  dur: number
}

const radioState = { station: 0, timer: 0, next: 0, step: 0, gain: null as GainNode | null, fx: null as BiquadFilterNode | null }

interface Song {
  bpm: number
  /** raiz do acorde por compasso (midi) e intervalos do acorde */
  roots: number[]
  chord: number[]
  bassPat: Array<number | null>
  leadPat: Array<number | null>
  lead: Voice
  pad: Voice
  bass: Voice
  drums: 'pop' | 'synth' | 'lofi'
  scale: number[]
  cutoff: number
}

const SONGS: Song[] = [
  {
    bpm: 118,
    roots: [60, 67, 69, 65],
    chord: [0, 4, 7, 11],
    bassPat: [0, null, null, 0, null, null, 12, null, 0, null, null, 0, null, 7, null, null],
    leadPat: [12, null, 7, 9, null, 12, null, 7, 14, null, 12, null, 9, null, 7, null],
    lead: { type: 'square', vol: 0.045, dur: 0.16 },
    pad: { type: 'triangle', vol: 0.03, dur: 1.9 },
    bass: { type: 'sawtooth', vol: 0.07, dur: 0.2 },
    drums: 'pop',
    scale: [0, 2, 4, 7, 9],
    cutoff: 3200,
  },
  {
    bpm: 98,
    roots: [57, 53, 60, 55],
    chord: [0, 3, 7, 10],
    bassPat: [0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 12, 0, 0, 12, 0, 7],
    leadPat: [24, 19, 15, 19, 24, 19, 15, 19, 22, 17, 14, 17, 22, 17, 14, 17],
    lead: { type: 'sawtooth', vol: 0.04, dur: 0.12 },
    pad: { type: 'sawtooth', vol: 0.02, dur: 1.95 },
    bass: { type: 'sawtooth', vol: 0.075, dur: 0.16 },
    drums: 'synth',
    scale: [0, 3, 5, 7, 10],
    cutoff: 1800,
  },
  {
    bpm: 74,
    roots: [60, 57, 62, 55],
    chord: [0, 4, 7, 11, 14],
    bassPat: [0, null, null, null, null, null, 7, null, 0, null, null, null, 5, null, null, null],
    leadPat: [null, null, 16, null, null, 12, null, null, 14, null, null, null, 11, null, 9, null],
    lead: { type: 'sine', vol: 0.06, dur: 0.5 },
    pad: { type: 'sine', vol: 0.032, dur: 2.2 },
    bass: { type: 'sine', vol: 0.1, dur: 0.5 },
    drums: 'lofi',
    scale: [0, 2, 4, 7, 9],
    cutoff: 1500,
  },
]

function tone(c: Ctx, dest: AudioNode, f: number, t: number, v: Voice, durMul = 1) {
  const o = c.createOscillator()
  o.type = v.type
  o.frequency.value = f
  const g = c.createGain()
  const d = v.dur * durMul
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(v.vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + d)
  o.connect(g).connect(dest)
  o.start(t)
  o.stop(t + d + 0.05)
}

function kick(c: Ctx, dest: AudioNode, t: number, vol = 0.22) {
  const o = c.createOscillator()
  o.frequency.setValueAtTime(150, t)
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
  const g = c.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
  o.connect(g).connect(dest)
  o.start(t)
  o.stop(t + 0.22)
}

function noiseHit(c: Ctx, dest: AudioNode, t: number, dur: number, f: number, type: BiquadFilterType, vol: number) {
  const s = noiseSrc(c)
  const flt = c.createBiquadFilter()
  flt.type = type
  flt.frequency.value = f
  const g = c.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  s.connect(flt).connect(g).connect(dest)
  s.start(t)
  s.stop(t + dur + 0.02)
}

function scheduleStep(c: Ctx, dest: AudioNode, song: Song, step: number, t: number) {
  const bar = Math.floor(step / 16) % song.roots.length
  const s16 = step % 16
  const root = song.roots[bar]
  // pad no primeiro tempo do compasso
  if (s16 === 0) for (const iv of song.chord) tone(c, dest, midi(root + iv), t, song.pad, 1)
  const bp = song.bassPat[s16]
  if (bp !== null) tone(c, dest, midi(root - 24 + bp), t, song.bass)
  const lp = song.leadPat[s16]
  if (lp !== null) {
    const pent = song.scale
    const oct = Math.floor(lp / 12)
    const idx = ((lp % 12) + 12) % 12
    // acomoda a nota ao acorde/escala: arredonda para a nota da escala mais proxima
    let best = pent[0]
    for (const n of pent) if (Math.abs(n - idx) < Math.abs(best - idx)) best = n
    tone(c, dest, midi(root + 12 + oct * 12 + best), t, song.lead)
  }
  // bateria
  if (song.drums === 'pop') {
    if (s16 % 4 === 0) kick(c, dest, t)
    if (s16 === 4 || s16 === 12) noiseHit(c, dest, t, 0.12, 1800, 'bandpass', 0.1)
    if (s16 % 2 === 0) noiseHit(c, dest, t, 0.04, 7500, 'highpass', 0.035)
  } else if (song.drums === 'synth') {
    if (s16 === 0 || s16 === 8 || s16 === 10) kick(c, dest, t, 0.24)
    if (s16 === 4 || s16 === 12) noiseHit(c, dest, t, 0.2, 1400, 'bandpass', 0.13)
    noiseHit(c, dest, t, 0.03, 8000, 'highpass', s16 % 2 ? 0.02 : 0.04)
  } else {
    if (s16 === 0 || s16 === 10) kick(c, dest, t, 0.2)
    if (s16 === 4 || s16 === 12) noiseHit(c, dest, t, 0.14, 1000, 'bandpass', 0.06)
    if (s16 % 2 === 0) noiseHit(c, dest, t, 0.03, 6500, 'highpass', 0.018)
    if (s16 % 8 === 3) noiseHit(c, dest, t, 0.4, 3000, 'highpass', 0.006) // chiado de vinil
  }
}

/** Ganho do radio (antes 0.9: pico ~0.07 e RMS ~0.013 no destino, quase inaudivel). Com 5.0 o pico fica ~0.7 (<0.9). */
const RADIO_GAIN = 5.0

const radio = {
  resume() {
    const st = radioState.station
    if (st > 0) radio.play(st)
  },
  pause() {
    window.clearInterval(radioState.timer)
    radioState.timer = 0
    const c = ctx
    if (c && radioState.gain) radioState.gain.gain.setTargetAtTime(0, c.currentTime, 0.05)
  },
  play(n: number) {
    const c = getCtx()
    if (!c) return
    window.clearInterval(radioState.timer)
    radioState.timer = 0
    radioState.station = n
    if (n <= 0) {
      if (radioState.gain) radioState.gain.gain.setTargetAtTime(0, c.currentTime, 0.05)
      return
    }
    const song = SONGS[n - 1]
    if (!radioState.gain) {
      radioState.gain = c.createGain()
      radioState.fx = c.createBiquadFilter()
      radioState.fx.type = 'lowpass'
      radioState.fx.connect(radioState.gain).connect(master!)
    }
    radioState.fx!.frequency.value = song.cutoff
    radioState.gain.gain.cancelScheduledValues(c.currentTime)
    radioState.gain.gain.setTargetAtTime(RADIO_GAIN, c.currentTime, 0.1)
    radioState.step = 0
    radioState.next = c.currentTime + 0.08
    // chiado curto de "troca de estacao"
    burst(c, 0.25, 3000, 0.7, 0.05, 'highpass')
    const sixteenth = 60 / song.bpm / 4
    radioState.timer = window.setInterval(() => {
      const cc = ctx
      if (!cc || !radioState.fx) return
      while (radioState.next < cc.currentTime + 0.14) {
        scheduleStep(cc, radioState.fx, song, radioState.step, radioState.next)
        radioState.next += sixteenth * (radioState.step % 2 === 1 && song.drums === 'lofi' ? 1.16 : song.drums === 'lofi' ? 0.84 : 1)
        radioState.step++
      }
    }, 30)
  },
}

/** Troca a estacao: 0 = desligado. Toca na hora se estiver dirigindo. */
export function setRadioStation(n: number) {
  radioState.station = n
  if (running) radio.play(n)
}
