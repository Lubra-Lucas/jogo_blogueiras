import { isMuted } from '../audio'

/** Sons do cassino em WebAudio puro (sem arquivos). Respeita o mudo geral dos minijogos. */
let ctx: AudioContext | null = null
function ac(): AudioContext | null {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, at: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime + at
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(c.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.02)
}

function noise(at: number, dur: number, vol: number, lo = 800, hi = 6000) {
  const c = ac()
  if (!c) return
  const n = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, n, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const src = c.createBufferSource()
  src.buffer = buf
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = (lo + hi) / 2
  bp.Q.value = 0.7
  const g = c.createGain()
  g.gain.value = vol
  src.connect(bp).connect(g).connect(c.destination)
  src.start(c.currentTime + at)
}

export type CasinoSfx =
  | 'card' | 'flip' | 'chip' | 'chips' | 'tick' | 'ball' | 'reel' | 'stop' | 'lever'
  | 'win' | 'big' | 'lose' | 'push' | 'bell' | 'fold' | 'alert'

export function casinoSfx(id: CasinoSfx) {
  if (isMuted()) return
  try {
    switch (id) {
      case 'card':
        noise(0, 0.07, 0.25, 1500, 7000)
        break
      case 'flip':
        noise(0, 0.05, 0.18, 2500, 8000)
        tone(300, 0, 0.05, 'triangle', 0.03)
        break
      case 'chip':
        tone(2100, 0, 0.05, 'triangle', 0.06, 1500)
        tone(3100, 0.012, 0.04, 'sine', 0.025)
        break
      case 'chips':
        for (let i = 0; i < 4; i++) tone(1800 + i * 160 + Math.random() * 120, i * 0.045, 0.05, 'triangle', 0.05, 1400)
        break
      case 'tick':
        tone(1400, 0, 0.025, 'square', 0.025)
        break
      case 'ball':
        tone(900, 0, 0.03, 'triangle', 0.04, 500)
        break
      case 'reel':
        tone(220, 0, 0.05, 'square', 0.02)
        break
      case 'stop':
        tone(150, 0, 0.12, 'triangle', 0.09, 70)
        noise(0, 0.05, 0.12, 400, 2500)
        break
      case 'lever':
        tone(180, 0, 0.25, 'sawtooth', 0.04, 90)
        break
      case 'win':
        ;[523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.16, 'triangle', 0.07))
        break
      case 'big':
        ;[523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.08, 0.22, 'triangle', 0.07))
        for (let i = 0; i < 8; i++) tone(2200 + (i % 3) * 300, 0.5 + i * 0.06, 0.05, 'triangle', 0.04, 1600)
        break
      case 'lose':
        tone(262, 0, 0.18, 'sine', 0.05, 196)
        break
      case 'push':
        tone(440, 0, 0.12, 'sine', 0.05)
        break
      case 'bell':
        tone(1320, 0, 0.5, 'sine', 0.06)
        tone(1980, 0, 0.4, 'sine', 0.025)
        break
      case 'fold':
        noise(0, 0.09, 0.12, 600, 3000)
        break
      case 'alert':
        tone(660, 0, 0.12, 'sine', 0.06)
        tone(880, 0.14, 0.2, 'sine', 0.06)
        break
    }
  } catch {
    /* sem áudio */
  }
}
