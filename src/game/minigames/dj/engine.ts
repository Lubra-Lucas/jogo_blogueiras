/**
 * Motor de áudio do DJ da Noite: sintetiza a música com WebAudio (sem arquivos) e dá o relógio da
 * partida. O tempo de julgamento vem de `AudioContext.currentTime`, nunca do requestAnimationFrame.
 */
import { isMuted } from '../audio'
import { buildTimeline, stepDur, type Ev, type Song } from './songs'

const LAT_KEY = 'jdb.dj.latency'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let leadBus: GainNode | null = null
let analyser: AnalyserNode | null = null
let noiseBuf: AudioBuffer | null = null

export function getCtx(): AudioContext | null {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C({ latencyHint: 'interactive' })
    master = ctx.createGain()
    master.gain.value = 0.8
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 5
    analyser = ctx.createAnalyser()
    analyser.fftSize = 128
    analyser.smoothingTimeConstant = 0.75
    leadBus = ctx.createGain()
    leadBus.connect(master)
    master.connect(comp).connect(analyser)
    comp.connect(ctx.destination)
    const len = ctx.sampleRate
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function getSpectrum(out: Uint8Array): boolean {
  if (!analyser) return false
  analyser.getByteFrequencyData(out as Uint8Array<ArrayBuffer>)
  return true
}
export const spectrumSize = () => (analyser ? analyser.frequencyBinCount : 64)

/**
 * Converte o carimbo de um evento de entrada (performance.now) para o relógio do áudio: instante atual do
 * contexto menos o tempo que o evento esperou até ser tratado. Usa o mesmo relógio que desenha e julga.
 */
export function eventAudioTime(ts: number): number {
  const c = getCtx()
  if (!c) return 0
  const waited = Math.max(0, Math.min(0.2, (performance.now() - ts) / 1000))
  return c.currentTime - waited
}

export function getLatency(): number {
  try {
    const v = Number(localStorage.getItem(LAT_KEY))
    return Number.isFinite(v) ? Math.max(-0.3, Math.min(0.3, v)) : 0
  } catch {
    return 0
  }
}
export function setLatency(s: number) {
  try {
    localStorage.setItem(LAT_KEY, String(s))
  } catch {
    /* ignora */
  }
}
export const hasCalibrated = () => {
  try {
    return localStorage.getItem(LAT_KEY) !== null
  } catch {
    return false
  }
}

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

function env(g: GainNode, t0: number, peak: number, attack: number, dur: number, release = 0.05) {
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack)
  g.gain.setValueAtTime(peak, Math.max(t0 + attack, t0 + dur - release))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release)
}

function noiseHit(c: AudioContext, t0: number, dur: number, hp: number, vol: number, dest: AudioNode, lp = 0) {
  const s = c.createBufferSource()
  s.buffer = noiseBuf
  const f = c.createBiquadFilter()
  f.type = 'highpass'
  f.frequency.value = hp
  const g = c.createGain()
  g.gain.setValueAtTime(vol, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  let node: AudioNode = s.connect(f)
  if (lp) {
    const l = c.createBiquadFilter()
    l.type = 'lowpass'
    l.frequency.value = lp
    node.connect(l)
    node = l
  }
  node.connect(g).connect(dest)
  s.start(t0, Math.random() * 0.5)
  s.stop(t0 + dur + 0.02)
}

function voice(c: AudioContext, type: OscillatorType, freq: number, t0: number, dur: number, vol: number, cutoff: number, dest: AudioNode, detune = 0) {
  const o = c.createOscillator()
  o.type = type
  o.frequency.value = freq
  o.detune.value = detune
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(cutoff * 1.6, t0)
  f.frequency.exponentialRampToValueAtTime(cutoff, t0 + Math.min(0.2, dur))
  const g = c.createGain()
  env(g, t0, vol, 0.012, dur)
  o.connect(f).connect(g).connect(dest)
  o.start(t0)
  o.stop(t0 + dur + 0.1)
}

function play(c: AudioContext, song: Song, e: Ev, t0: number, sd: number) {
  const out = master!
  switch (e.kind) {
    case 'kick': {
      const o = c.createOscillator()
      const g = c.createGain()
      o.frequency.setValueAtTime(160, t0)
      o.frequency.exponentialRampToValueAtTime(44, t0 + 0.13)
      g.gain.setValueAtTime(1, t0)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34)
      o.connect(g).connect(out)
      o.start(t0)
      o.stop(t0 + 0.38)
      break
    }
    case 'snare': {
      noiseHit(c, t0, 0.17, 1500, 0.5, out)
      const o = c.createOscillator()
      o.type = 'triangle'
      o.frequency.setValueAtTime(220, t0)
      o.frequency.exponentialRampToValueAtTime(130, t0 + 0.08)
      const g = c.createGain()
      g.gain.setValueAtTime(0.4, t0)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11)
      o.connect(g).connect(out)
      o.start(t0)
      o.stop(t0 + 0.14)
      break
    }
    case 'hat':
      noiseHit(c, t0, 0.04, 7500, 0.16, out)
      break
    case 'ohat':
      noiseHit(c, t0, 0.16, 6500, 0.14, out)
      break
    case 'crash':
      noiseHit(c, t0, 1.6, 3500, 0.35, out)
      break
    case 'bass':
      voice(c, song.bassWave, mtof(e.midi!), t0, Math.max(0.12, e.len * sd * 0.9), 0.5, 380, out)
      break
    case 'chord':
      for (const m of e.chord!) {
        voice(c, 'sawtooth', mtof(m + 12), t0, e.len * sd, 0.045, 1300, out, -7)
        voice(c, 'sawtooth', mtof(m + 12), t0, e.len * sd, 0.045, 1300, out, 7)
      }
      break
    case 'lead': {
      const d = Math.max(0.1, e.len * sd * 0.92)
      voice(c, song.leadWave, mtof(e.midi!), t0, d, 0.15, 3200, leadBus!)
      voice(c, 'sine', mtof(e.midi!) * 2, t0, d, 0.04, 6000, leadBus!)
      break
    }
  }
}

/** Reprodução de uma música com relógio próprio. */
export class Player {
  readonly song: Song
  readonly timeline: Ev[]
  private sd: number
  private idx = 0
  private timer = 0
  /** relógio do áudio no tempo zero da música */
  t0 = 0
  paused = false
  ended = false

  constructor(song: Song, seed: number, leadIn = 1.6) {
    this.song = song
    this.sd = stepDur(song)
    this.timeline = buildTimeline(song, seed)
    const c = getCtx()
    if (c) this.t0 = c.currentTime + leadIn
    if (leadBus) {
      leadBus.gain.cancelScheduledValues(0)
      leadBus.gain.value = 1
    }
    if (master) master.gain.value = isMuted() ? 0 : 0.8
    this.timer = window.setInterval(() => this.pump(), 40)
    this.pump()
  }

  private pump() {
    const c = ctx
    if (!c || this.paused) return
    const horizon = c.currentTime + 0.7
    while (this.idx < this.timeline.length) {
      const e = this.timeline[this.idx]
      const when = this.t0 + e.step * this.sd
      if (when > horizon) break
      if (when >= c.currentTime - 0.05) play(c, this.song, e, Math.max(when, c.currentTime), this.sd)
      this.idx++
    }
  }

  /** tempo da música (s) já descontada a latência medida; negativo = antes de começar */
  time(): number {
    return ctx ? ctx.currentTime - this.t0 - getLatency() : 0
  }

  /** abaixa o lead por um instante (erro) */
  duck() {
    const c = ctx
    if (!c || !leadBus) return
    const t = c.currentTime
    leadBus.gain.cancelScheduledValues(t)
    leadBus.gain.setValueAtTime(0.15, t)
    leadBus.gain.linearRampToValueAtTime(1, t + 0.35)
  }

  setMuted(m: boolean) {
    if (master) master.gain.value = m ? 0 : 0.8
  }

  pause() {
    if (this.paused) return
    this.paused = true
    void ctx?.suspend()
  }
  resume() {
    if (!this.paused) return
    this.paused = false
    void ctx?.resume()
  }
  stop() {
    window.clearInterval(this.timer)
    this.ended = true
    if (ctx?.state === 'suspended') void ctx.resume()
    if (master && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08)
    }
  }
}

/** Calibração: 8 cliques a 90 BPM; devolve o relógio de cada clique. */
export function startMetronome(count = 9, bpm = 90, leadIn = 1.0): { times: number[]; stop: () => void } {
  const c = getCtx()!
  if (master) master.gain.value = 0.8
  const t0 = c.currentTime + leadIn
  const times: number[] = []
  for (let i = 0; i < count; i++) {
    const t = t0 + (i * 60) / bpm
    times.push(t)
    const o = c.createOscillator()
    const g = c.createGain()
    o.frequency.value = i % 4 === 0 ? 1500 : 1000
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
    o.connect(g).connect(c.destination)
    o.start(t)
    o.stop(t + 0.08)
  }
  return { times, stop: () => undefined }
}

/** Mediana do erro dos toques em relação aos cliques (usa os mais próximos). */
export function computeLatency(clicks: number[], taps: number[]): number | null {
  const errs: number[] = []
  for (const t of taps) {
    let best = Infinity
    for (const k of clicks) if (Math.abs(t - k) < Math.abs(best)) best = t - k
    if (Math.abs(best) < 0.35) errs.push(best)
  }
  if (errs.length < 4) return null
  errs.sort((a, b) => a - b)
  return errs[Math.floor(errs.length / 2)]
}
