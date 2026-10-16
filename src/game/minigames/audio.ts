/** Blips de WebAudio (sem arquivos de som). Mudo persistido em localStorage. */

const MUTE_KEY = 'jdb.minigames.muted'
let ctx: AudioContext | null = null
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
})()

export const isMuted = () => muted
export function setMuted(v: boolean) {
  muted = v
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0')
  } catch {
    /* ignora */
  }
}

function ac(): AudioContext | null {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function blip(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.07, slideTo?: number) {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime + start
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(c.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.02)
}

export type Sfx = 'tap' | 'serve' | 'tip' | 'bad' | 'trash' | 'done' | 'combo' | 'click'

export function playSfx(id: Sfx) {
  if (muted) return
  try {
    switch (id) {
      case 'tap':
      case 'click':
        blip(660, 0, 0.07, 'triangle', 0.05, 880)
        break
      case 'serve':
        blip(523, 0, 0.12, 'sine')
        blip(784, 0.09, 0.18, 'sine')
        break
      case 'tip':
        blip(523, 0, 0.1)
        blip(659, 0.08, 0.1)
        blip(1047, 0.16, 0.26)
        break
      case 'combo':
        blip(784, 0, 0.1, 'triangle')
        blip(988, 0.08, 0.1, 'triangle')
        blip(1318, 0.16, 0.3, 'triangle')
        break
      case 'bad':
        blip(220, 0, 0.22, 'sawtooth', 0.04, 150)
        break
      case 'trash':
        blip(400, 0, 0.14, 'triangle', 0.05, 160)
        break
      case 'done':
        blip(523, 0, 0.14)
        blip(659, 0.14, 0.14)
        blip(784, 0.28, 0.14)
        blip(1047, 0.42, 0.4)
        break
    }
  } catch {
    /* audio indisponivel */
  }
}
