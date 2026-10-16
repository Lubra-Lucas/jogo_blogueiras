import { isMuted } from '../minigames/audio'
import type { AmbientKind } from './types'

/**
 * Som ambiente por sala (WebAudio sintetizado, sem arquivos). Respeita o mudo global (`isMuted()`).
 * O contexto nasce no primeiro gesto (entrar numa sala ja e um gesto: tecla E / clique).
 */
let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
let nodes: AudioNode[] = []
let timers: number[] = []
let kind: AmbientKind | null = null

function ensure(): AudioContext | null {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C()
    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    const n = ctx.sampleRate * 3
    noise = ctx.createBuffer(1, n, ctx.sampleRate)
    const d = noise.getChannelData(0)
    let last = 0
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1
      last = (last + 0.02 * w) / 1.02 // ruido marrom
      d[i] = last * 3.5
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function src(c: AudioContext, loop = true): AudioBufferSourceNode {
  const s = c.createBufferSource()
  s.buffer = noise
  s.loop = loop
  s.loopStart = Math.random() * 1.5
  return s
}

function bandNoise(c: AudioContext, f: number, q: number, gain: number, lfo?: { rate: number; depth: number }) {
  const s = src(c)
  const b = c.createBiquadFilter()
  b.type = 'bandpass'
  b.frequency.value = f
  b.Q.value = q
  const g = c.createGain()
  g.gain.value = gain
  s.connect(b).connect(g).connect(master!)
  s.start()
  nodes.push(s, b, g)
  if (lfo) {
    const o = c.createOscillator()
    o.frequency.value = lfo.rate
    const og = c.createGain()
    og.gain.value = lfo.depth
    o.connect(og).connect(g.gain)
    o.start()
    nodes.push(o, og)
  }
}

function blip(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', delay = 0) {
  const c = ctx
  if (!c || !master) return
  const t0 = c.currentTime + delay
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(master)
  o.start(t0)
  o.stop(t0 + dur + 0.05)
}

function burst(f: number, dur: number, vol: number, hp = true) {
  const c = ctx
  if (!c || !master) return
  const t0 = c.currentTime
  const s = src(c, false)
  const b = c.createBiquadFilter()
  b.type = hp ? 'highpass' : 'lowpass'
  b.frequency.value = f
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.05)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  s.connect(b).connect(g).connect(master)
  s.start(t0)
  s.stop(t0 + dur + 0.1)
}

function kick(vol: number) {
  const c = ctx
  if (!c || !master) return
  const t0 = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.frequency.setValueAtTime(120, t0)
  o.frequency.exponentialRampToValueAtTime(42, t0 + 0.16)
  g.gain.setValueAtTime(vol, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28)
  o.connect(g).connect(master)
  o.start(t0)
  o.stop(t0 + 0.3)
}

const every = (ms: number, fn: () => void, jitter = 0) => {
  const run = () => {
    fn()
    timers.push(window.setTimeout(run, ms + Math.random() * jitter))
  }
  timers.push(window.setTimeout(run, ms * Math.random() + 300))
}

const GAIN: Record<AmbientKind, number> = { cafe: 0.5, salon: 0.5, boutique: 0.4, jewel: 0.35, studio: 0.3, club: 0.7, home: 0.4, casino: 0.5 }

export function startAmbience(k: AmbientKind) {
  stopAmbience(true)
  const c = ensure()
  if (!c || !master) return
  kind = k
  switch (k) {
    case 'cafe':
      bandNoise(c, 520, 0.9, 0.22, { rate: 0.35, depth: 0.08 }) // burburinho
      bandNoise(c, 1100, 1.4, 0.07, { rate: 0.6, depth: 0.04 })
      every(15000, () => burst(3500, 2.2, 0.08), 8000) // vapor da maquina
      every(7000, () => { blip(2400, 0.25, 0.03, 'triangle'); blip(3100, 0.2, 0.02, 'triangle', 0.12) }, 6000) // loucas
      break
    case 'salon':
      bandNoise(c, 700, 0.5, 0.2, { rate: 0.12, depth: 0.04 }) // secador
      bandNoise(c, 2200, 0.6, 0.07)
      bandNoise(c, 420, 1, 0.1, { rate: 0.3, depth: 0.05 })
      every(11000, () => burst(5000, 1.4, 0.05), 6000) // spray
      break
    case 'boutique':
    case 'jewel': {
      const chord = k === 'jewel' ? [261.6, 329.6, 392, 493.9] : [220, 277.2, 329.6, 440]
      bandNoise(c, 380, 1, 0.05, { rate: 0.2, depth: 0.02 })
      every(2600, () => blip(chord[Math.floor(Math.random() * chord.length)] * (Math.random() > 0.6 ? 2 : 1), 2.2, 0.035, 'sine'), 1500)
      break
    }
    case 'studio':
      bandNoise(c, 260, 0.8, 0.06)
      every(9000, () => { burst(2500, 0.08, 0.1); blip(1800, 0.08, 0.04, 'square', 0.06) }, 7000) // clique da camera
      break
    case 'club':
      bandNoise(c, 150, 0.8, 0.1)
      {
        const beat = 60000 / 124
        let n = 0
        timers.push(
          window.setInterval(() => {
            if (isMuted()) return
            kick(0.55)
            if (n % 2 === 1) burst(7000, 0.07, 0.06)
            if (n % 4 === 2) blip(110, 0.18, 0.12, 'sawtooth')
            n++
          }, beat),
        )
      }
      break
    case 'home':
      bandNoise(c, 300, 1, 0.04)
      every(3200, () => blip([261.6, 329.6, 392, 523.3][Math.floor(Math.random() * 4)], 1.8, 0.03, 'triangle'), 2500)
      every(1000, () => blip(900, 0.03, 0.01, 'square'))
      break
    case 'casino':
      bandNoise(c, 600, 0.9, 0.18, { rate: 0.3, depth: 0.06 })
      every(5000, () => [880, 1175, 1568, 2093].forEach((f, i) => blip(f, 0.15, 0.025, 'square', i * 0.07)), 6000) // jackpot ao longe
      every(2400, () => blip(1500 + Math.random() * 600, 0.04, 0.02, 'square'), 1500)
      break
  }
  // volume + mudo
  const set = () => {
    if (master && ctx) master.gain.setTargetAtTime(isMuted() ? 0 : GAIN[k] * 0.35, ctx.currentTime, 0.2)
  }
  set()
  timers.push(window.setInterval(set, 600))
}

export function stopAmbience(immediate = false) {
  timers.forEach((t) => {
    window.clearTimeout(t)
    window.clearInterval(t)
  })
  timers = []
  const old = nodes
  nodes = []
  kind = null
  const c = ctx
  if (c && master) master.gain.setTargetAtTime(0, c.currentTime, immediate ? 0.01 : 0.15)
  window.setTimeout(
    () => {
      for (const n of old) {
        try {
          ;(n as AudioScheduledSourceNode).stop?.()
        } catch {
          /* ja parado */
        }
        n.disconnect()
      }
    },
    immediate ? 30 : 600,
  )
}

export const ambienceKind = () => kind
