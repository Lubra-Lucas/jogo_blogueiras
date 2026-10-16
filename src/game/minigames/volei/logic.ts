/**
 * Voleibol de Praia (minijogo da Praia de Miami): logica pura, sem React/three, com RNG de semente.
 *
 * Cada ponto e uma sequencia de 3 toques por TIMING: receber o saque (manchete), levantar (escolhendo a faixa da rede: esquerda,
 * centro ou direita) e cortar. A bloqueadora do outro lado se mexe: ler para onde ela vai pular e escolher a faixa livre e a decisao.
 * Habilidade: ritmo/precisao (aneis que encolhem) + leitura sob pressao (faixa certa). Dificuldade muda janelas, velocidade e dicas.
 */
import type { Difficulty } from '../shared/competition'

export type Rating = 'perfect' | 'good' | 'ok' | 'miss'
export type Phase = 'receive' | 'set' | 'spike'
export const LANES = 3
export const RALLIES = 12
export const HEARTS = 3

export interface DiffCfg {
  /** multiplica as janelas de acerto (maior = mais facil) */
  win: number
  /** multiplica as duracoes dos voos (maior = mais lento) */
  slow: number
  /** mostra o anel que encolhe e a marca da faixa livre */
  guides: boolean
  /** multiplica o tempo que a bloqueadora "entrega" a faixa antes de pular (maior = mais facil de ler) */
  tell: number
  /** chance da bloqueadora fingir uma faixa e trocar no ultimo instante */
  fake: number
}

export const CFG: Record<Difficulty, DiffCfg> = {
  facil: { win: 1.5, slow: 1.28, guides: true, tell: 1.7, fake: 0 },
  normal: { win: 1, slow: 1, guides: true, tell: 1, fake: 0.2 },
  dificil: { win: 0.8, slow: 0.84, guides: true, tell: 0.7, fake: 0.4 },
  estrela: { win: 0.62, slow: 0.72, guides: false, tell: 0.45, fake: 0.6 },
}

/** Janelas base de acerto (s de erro) */
export const WINDOW = { perfect: 0.075, good: 0.16, ok: 0.28 } as const

export function rate(err: number, cfg: DiffCfg): Rating {
  const e = Math.abs(err)
  if (e <= WINDOW.perfect * cfg.win) return 'perfect'
  if (e <= WINDOW.good * cfg.win) return 'good'
  if (e <= WINDOW.ok * cfg.win) return 'ok'
  return 'miss'
}

export const POINTS: Record<Rating, number> = { perfect: 100, good: 60, ok: 30, miss: 0 }
export const RATING_LABEL: Record<Rating, string> = { perfect: 'Perfeito!', good: 'Ótimo!', ok: 'Bom', miss: 'Errou' }

/** multiplicador de combo: sobe 0,5 a cada 4 toques bons seguidos (ate x3) */
export const comboMul = (combo: number) => 1 + Math.min(2, Math.floor(combo / 4) * 0.5)

export type SpikeResult = 'kill' | 'blocked'
export const spikeResult = (lane: number, blockerLane: number): SpikeResult => (lane === blockerLane ? 'blocked' : 'kill')
export const KILL_POINTS = 150
export const BLOCK_POINTS = 20

/** Duracoes (s) dos tres voos de um ponto + o que a bloqueadora vai fazer */
export interface Rally {
  tReceive: number
  tSet: number
  tSpike: number
  /** faixa em que a bloqueadora estara no momento do corte */
  blockerLane: number
  /** faixa para onde ela "se inclina" cedo (se for diferente de blockerLane, ela troca depois do tell) */
  leanLane: number
  /** variacao do ponto de saque (u) */
  serveU: number
}

export function makeRally(rand: () => number, index: number, cfg: DiffCfg): Rally {
  const ramp = Math.max(0.78, 1 - index * 0.022) // acelera um pouco ao longo da partida
  const lane = Math.floor(rand() * LANES)
  const fake = rand() < cfg.fake + index * 0.01
  const lean = fake ? (lane + 1 + Math.floor(rand() * (LANES - 1))) % LANES : lane
  return {
    tReceive: (1.55 + rand() * 0.25) * cfg.slow * ramp,
    tSet: (1.05 + rand() * 0.15) * cfg.slow * ramp,
    tSpike: (0.95 + rand() * 0.12) * cfg.slow * ramp,
    blockerLane: lane,
    leanLane: lean,
    serveU: 0.3 + rand() * 0.4,
  }
}

export interface Tally {
  score: number
  combo: number
  bestCombo: number
  perfects: number
  kills: number
  blocks: number
  rallies: number
  hearts: number
}

export const newTally = (): Tally => ({ score: 0, combo: 0, bestCombo: 0, perfects: 0, kills: 0, blocks: 0, rallies: 0, hearts: HEARTS })

/** aplica um toque ao placar; devolve os pontos ganhos */
export function addTouch(t: Tally, r: Rating): number {
  if (r === 'miss') {
    t.combo = 0
    return 0
  }
  const gained = Math.round(POINTS[r] * comboMul(t.combo))
  t.score += gained
  t.combo += 1
  t.bestCombo = Math.max(t.bestCombo, t.combo)
  if (r === 'perfect') t.perfects += 1
  return gained
}

export function addSpikeResult(t: Tally, res: SpikeResult, r: Rating): number {
  if (res === 'kill') {
    const gained = Math.round((KILL_POINTS + POINTS[r]) * comboMul(t.combo))
    t.score += gained
    t.kills += 1
    return gained
  }
  t.combo = 0
  t.blocks += 1
  t.score += BLOCK_POINTS
  return BLOCK_POINTS
}

/** pontuacao tipica de uma partida boa por dificuldade (rivais NPC do ranking) */
export const TYPICAL: Record<Difficulty, number> = { facil: 2200, normal: 2800, dificil: 3300, estrela: 3800 }
/** segundos ANTES do corte em que a bloqueadora ja esta na faixa final (menos tempo para ler nas dificuldades altas) */
export const tellTime = (cfg: DiffCfg) => 0.55 * cfg.tell

export const STAR_AT = [0.5, 1, 1.45] as const

export function starsFor(score: number, d: Difficulty): number {
  const t = TYPICAL[d]
  return score >= t * STAR_AT[2] ? 3 : score >= t * STAR_AT[1] ? 2 : score >= t * STAR_AT[0] ? 1 : 0
}

export function rewardsFor(score: number, d: Difficulty, kills: number, factor: number) {
  const stars = starsFor(score, d)
  const coins = Math.round((score / 60 + stars * 6) * factor)
  const xp = Math.round((10 + stars * 10 + kills * 1.5) * factor)
  return { stars, coins, xp }
}
