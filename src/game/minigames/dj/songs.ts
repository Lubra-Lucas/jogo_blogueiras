/**
 * Músicas originais do DJ da Noite. Nada de arquivo de áudio: cada música é um conjunto de padrões de
 * 16 passos (semicolcheias) que o motor de áudio sintetiza e que também gera a cartela de notas.
 */
import { rng } from '../shared/competition'

export type EvKind = 'kick' | 'snare' | 'hat' | 'ohat' | 'lead' | 'bass' | 'chord' | 'crash'

export interface Ev {
  /** semicolcheia absoluta desde o início da música */
  step: number
  kind: EvKind
  /** nota MIDI (lead / baixo) */
  midi?: number
  /** acorde (notas MIDI) */
  chord?: number[]
  /** duração em passos */
  len: number
}

export interface Song {
  id: string
  name: string
  genre: string
  bpm: number
  bars: number
  /** nível de DJ que libera a música */
  unlock: number
  /** tônica (MIDI) */
  root: number
  kick: string
  snare: string
  hat: string
  ohat: string
  bass: string
  /** progressão: deslocamento da tônica e se é maior (true) ou menor, uma por compasso (cicla) */
  prog: [number, boolean][]
  leadWave: OscillatorType
  bassWave: OscillatorType
  /** densidade do lead (0..1) */
  leadDensity: number
  /** cores do clube (hex) para as luzes */
  colors: [string, string, string]
}

export const SONGS: Song[] = [
  {
    id: 'amanhecer', name: 'Amanhecer Neon', genre: 'Chill', bpm: 100, bars: 28, unlock: 1, root: 57,
    kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', ohat: '................',
    bass: 'x.....x...x.....', prog: [[0, false], [8, true], [3, true], [10, true]],
    leadWave: 'triangle', bassWave: 'sine', leadDensity: 0.5, colors: ['#34e0ff', '#8f6bff', '#ffb340'],
  },
  {
    id: 'pulso', name: 'Pulso Prata', genre: 'Synth pop', bpm: 115, bars: 32, unlock: 2, root: 62,
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', ohat: '.x.x.x.x.x.x.x.x',
    bass: 'x..x..x.x..x..x.', prog: [[0, false], [5, true], [8, true], [7, true]],
    leadWave: 'sawtooth', bassWave: 'sawtooth', leadDensity: 0.6, colors: ['#8f6bff', '#34e0ff', '#ff4fa3'],
  },
  {
    id: 'meia-noite', name: 'Meia-Noite', genre: 'House', bpm: 128, bars: 36, unlock: 3, root: 59,
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', ohat: '..x...x...x...x.',
    bass: '.x..x..x.x..x..x', prog: [[0, false], [3, true], [10, true], [8, true]],
    leadWave: 'square', bassWave: 'sawtooth', leadDensity: 0.65, colors: ['#ffb340', '#34e0ff', '#8f6bff'],
  },
  {
    id: 'laser', name: 'Laser', genre: 'Techno', bpm: 140, bars: 40, unlock: 4, root: 55,
    kick: 'x..x..x...x..x..', snare: '....x.......x..x', hat: 'xxxxxxxxxxxxxxxx', ohat: '..x...x...x...x.',
    bass: 'xx.xx.xxxx.xx.x.', prog: [[0, false], [0, false], [8, true], [10, true]],
    leadWave: 'sawtooth', bassWave: 'square', leadDensity: 0.75, colors: ['#ff4fa3', '#8f6bff', '#34e0ff'],
  },
]

export const getSong = (id: string) => SONGS.find((s) => s.id === id) ?? SONGS[0]

export const stepDur = (s: Song) => 60 / s.bpm / 4
export const songDuration = (s: Song) => s.bars * 16 * stepDur(s)

/** Compasso de cada seção. */
export function sectionOf(song: Song, bar: number): 'intro' | 'build' | 'main' | 'break' | 'outro' {
  if (bar < 2) return 'intro'
  if (bar < 4) return 'build'
  if (bar >= song.bars - 1) return 'outro'
  const b0 = song.bars - 12
  if (bar >= b0 && bar < b0 + 4) return 'break'
  return 'main'
}

const SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22]

function leadPhrase(song: Song, seed: number, phraseSeed: number, resolve: boolean): { step: number; midi: number; len: number }[] {
  const r = rng(seed ^ Math.imul(phraseSeed + 1, 2654435761))
  const starts: number[] = []
  for (let s = 0; s < 32; s += 2) {
    const beat = s % 8 === 0
    const p = (beat ? 0.9 : s % 4 === 0 ? 0.6 : 0.4) * (0.55 + song.leadDensity * 0.7)
    if (r() < p) starts.push(s)
  }
  if (!starts.length) starts.push(0)
  let deg = 2 + Math.floor(r() * 3)
  return starts.map((s, i) => {
    const next = i + 1 < starts.length ? starts[i + 1] : 32
    const jump = r()
    deg += jump < 0.35 ? -1 : jump < 0.7 ? 1 : jump < 0.85 ? 2 : -2
    deg = Math.max(0, Math.min(SCALE.length - 1, deg))
    if (resolve && i === starts.length - 1) deg = 0
    const gap = next - s
    return { step: s, midi: song.root + 12 + SCALE[deg], len: Math.min(8, gap) }
  })
}

/** Linha do tempo completa (áudio e cartela vêm daqui: sincronia perfeita). `seed` muda o refrão. */
export function buildTimeline(song: Song, seed: number): Ev[] {
  const evs: Ev[] = []
  const add = (step: number, kind: EvKind, extra: Partial<Ev> = {}) => evs.push({ step, kind, len: 1, ...extra })
  const phrases = Math.ceil(song.bars / 2)
  for (let bar = 0; bar < song.bars; bar++) {
    const sec = sectionOf(song, bar)
    const base = bar * 16
    const [off, major] = song.prog[bar % song.prog.length]
    const rootN = song.root + off
    const third = major ? 4 : 3
    for (let i = 0; i < 16; i++) {
      const st = base + i
      if (sec !== 'outro') {
        if (song.hat[i] === 'x') add(st, 'hat')
        if (sec !== 'intro' && song.ohat[i] === 'x') add(st, 'ohat')
      }
      if (sec === 'build' || sec === 'main' || sec === 'outro') {
        if (song.kick[i] === 'x' && !(sec === 'outro' && i > 0)) add(st, 'kick')
        if (sec !== 'outro' && song.snare[i] === 'x') add(st, 'snare')
      }
      if (sec === 'build' || sec === 'main') if (song.bass[i] === 'x') add(st, 'bass', { midi: rootN - 12 + (i % 8 === 6 ? 7 : 0), len: 2 })
    }
    // fill de caixa no último compasso de cada grupo de 4
    if (sec === 'main' && bar % 4 === 3) for (const i of [12, 13, 14, 15]) add(base + i, 'snare')
    // acorde (pad)
    if (sec !== 'intro') add(base, 'chord', { chord: [rootN, rootN + third, rootN + 7], len: 16 })
    if (sec === 'break') for (const i of [0, 8]) add(base + i, 'bass', { midi: rootN - 12, len: 4 })
    if (bar === song.bars - 1) add(base, 'crash')
  }
  // lead: a partir do compasso 4, em frases de 2 compassos (A B A B)
  for (let ph = 2; ph < phrases; ph++) {
    const bar = ph * 2
    if (bar >= song.bars - 1) break
    const sec = sectionOf(song, bar)
    if (sec === 'intro' || sec === 'build' || sec === 'outro') continue
    const resolve = ph % 4 === 3
    for (const n of leadPhrase(song, seed, ph % 2, resolve)) {
      const step = bar * 16 + n.step
      // não vaza para o compasso final
      if (step >= (song.bars - 1) * 16) continue
      add(step, 'lead', { midi: n.midi, len: n.len })
    }
  }
  evs.sort((a, b) => a.step - b.step)
  return evs
}

/** Música do dia (a mesma para todas, pela semente diária). */
export const dailySong = (seed: number) => SONGS[seed % SONGS.length]
