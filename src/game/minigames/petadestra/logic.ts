import { rng, type Difficulty } from '../shared/competition'

/**
 * Adestramento (lógica pura): memória + tempo.
 * O treinador mostra uma sequência de comandos; a jogadora repete tocando nos botões, cada um dentro
 * da janela de tempo (o relógio da "paciência" corre). Sequências crescem; "pegadinhas" (comandos que
 * não valem) aparecem nas dificuldades altas.
 */
export type Command = 'senta' | 'deita' | 'pata' | 'gira' | 'pula'

export const COMMANDS: Command[] = ['senta', 'deita', 'pata', 'gira', 'pula']
export const COMMAND_LABEL: Record<Command, string> = { senta: 'Senta', deita: 'Deita', pata: 'Pata', gira: 'Gira', pula: 'Pula' }

export interface AdParams {
  /** segundos totais */
  time: number
  startLen: number
  maxLen: number
  /** tempo (ms) que cada comando fica visível */
  showMs: number
  /** janela (s) para responder cada comando */
  answerS: number
  /** comandos disponiveis */
  pool: number
  /** tentativas extras */
  lives: number
  /** mostra dica depois de um erro */
  hints: boolean
  decoys: boolean
}

export function paramsFor(d: Difficulty): AdParams {
  const t: Record<Difficulty, AdParams> = {
    facil: { time: 100, startLen: 2, maxLen: 6, showMs: 900, answerS: 6, pool: 3, lives: 3, hints: true, decoys: false },
    normal: { time: 95, startLen: 3, maxLen: 8, showMs: 700, answerS: 4.2, pool: 4, lives: 3, hints: true, decoys: false },
    dificil: { time: 90, startLen: 3, maxLen: 9, showMs: 560, answerS: 3.2, pool: 5, lives: 2, hints: false, decoys: true },
    estrela: { time: 85, startLen: 4, maxLen: 10, showMs: 440, answerS: 2.6, pool: 5, lives: 2, hints: false, decoys: true },
  }
  return t[d]
}

/** Sequência da rodada `round` (0-based). Mesma semente = mesmas sequências. */
export function makeRound(seed: number, round: number, p: AdParams): Command[] {
  const rand = rng(seed + round * 9973)
  const len = Math.min(p.maxLen, p.startLen + Math.floor(round / 2))
  const pool = COMMANDS.slice(0, p.pool)
  const out: Command[] = []
  for (let i = 0; i < len; i++) {
    let c = pool[Math.floor(rand() * pool.length)]
    if (i > 0 && c === out[i - 1] && rand() < 0.6) c = pool[(pool.indexOf(c) + 1) % pool.length]
    out.push(c)
  }
  return out
}

/** Pontos de um comando correto: base + bônus de rapidez + combo. */
export function commandPoints(elapsedS: number, answerS: number, combo: number, golden: boolean): number {
  const fast = Math.max(0, 1 - elapsedS / answerS)
  const mult = 1 + Math.min(combo, 12) * (golden ? 0.07 : 0.05)
  return Math.round((20 + fast * 22) * mult)
}

export const roundBonus = (len: number, mistakes: number) => (mistakes === 0 ? len * 18 : 0)

export const ADESTRA_TYPICAL: Record<Difficulty, number> = { facil: 780, normal: 900, dificil: 820, estrela: 760 }
export const ADESTRA_MAX = 2200
