import { isMuted } from '../../minigames/audio'
import { isMinigameOpen } from '../../minigames/minigameStore'

/**
 * Som do mar de Miami (WebAudio sintetizado, sem arquivos): ondas (ruido marrom filtrado com swell lento), chiado da
 * espuma e gaivotas ocasionais. O volume segue a proximidade da jogadora com a agua. Respeita o mudo global.
 */
let ctx: AudioContext | null = null
let master: GainNode | null = null
let wave: GainNode | null = null
let hiss: GainNode | null = null
let running = false
const mods = new Map<GainNode, GainNode>()
let gullT = 0
let armed = false

function build(c: AudioContext) {
  master = c.createGain()
  master.gain.value = 0
  master.connect(c.destination)
  const n = c.sampleRate * 4
  const buf = c.createBuffer(1, n, c.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < n; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    d[i] = last * 3.5
  }
  const mk = (type: BiquadFilterType, f: number, q: number) => {
    const s = c.createBufferSource()
    s.buffer = buf
    s.loop = true
    s.loopStart = Math.random() * 2
    const b = c.createBiquadFilter()
    b.type = type
    b.frequency.value = f
    b.Q.value = q
    // mod (base 1) recebe o LFO: modulacao MULTIPLICATIVA do volume g (LFO ligado direto em g.gain somaria e chiaria longe do mar)
    const mod = c.createGain()
    mod.gain.value = 1
    const g = c.createGain()
    g.gain.value = 0.0
    s.connect(b).connect(mod).connect(g).connect(master!)
    s.start()
    mods.set(g, mod)
    return g
  }
  wave = mk('lowpass', 520, 0.6)
  hiss = mk('bandpass', 2300, 0.5)
  // swell: duas LFOs lentas modulam o volume das ondas
  for (const [rate, depth, target] of [[0.14, 0.4, wave], [0.33, 0.18, wave], [0.2, 0.3, hiss]] as const) {
    const o = c.createOscillator()
    o.frequency.value = rate
    const og = c.createGain()
    og.gain.value = depth
    o.connect(og).connect(mods.get(target)!.gain)
    o.start()
  }
}

/** liga o audio no primeiro gesto do usuario */
export function armSea() {
  if (armed) return
  armed = true
  const go = () => {
    if (!ctx) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!C) return
      ctx = new C()
      build(ctx)
    }
    if (ctx.state === 'suspended') void ctx.resume()
  }
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, go, { passive: true })
  // só cria o AudioContext se a jogadora já interagiu com a página (senão o navegador avisa e bloqueia)
  if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) go()
}

function gull(c: AudioContext, vol: number) {
  const t = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'triangle'
  const f0 = 1500 + Math.random() * 400
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.34)
  o.frequency.setValueAtTime(f0 * 1.05, t + 0.46)
  o.frequency.exponentialRampToValueAtTime(f0 * 0.5, t + 0.78)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.04)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8)
  o.connect(g).connect(master!)
  o.start(t)
  o.stop(t + 0.85)
}

/** near: 0..1 (proximidade do mar); day: 0..1 (gaivotas de dia) */
export function updateSea(near: number, day: number, dt: number) {
  const c = ctx
  if (!c || !master || !wave || !hiss) return
  const on = c.state === 'running' && !isMuted() && !isMinigameOpen()
  const t = c.currentTime
  master.gain.setTargetAtTime(on ? 0.9 : 0, t, 0.3)
  wave.gain.setTargetAtTime(0.1 + near * 0.42, t, 0.4)
  hiss.gain.setTargetAtTime(0.01 + near * 0.045, t, 0.4)
  running = on
  gullT -= dt
  if (on && gullT < 0) {
    gullT = 7 + Math.random() * 14
    if (day > 0.3 && Math.random() < 0.8) gull(c, 0.03 + 0.05 * (0.3 + near))
  }
}

export function stopSea() {
  if (ctx && master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.2)
  running = false
}
export const seaRunning = () => running
