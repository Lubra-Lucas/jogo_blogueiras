import { DIFFICULTY_REWARD, submitScore, type Difficulty, type Entry } from './competition'
import { grantRewards } from '../rewards'

export interface Settled {
  board: Entry[]
  rank: number
  newBest: boolean
  coins: number
  xp: number
  profXp: number
  stars: number
}

/** Estrelas (0 a 3) pelos limiares [1 estrela, 2 estrelas, 3 estrelas]. */
export function starsFor(score: number, th: readonly [number, number, number]): number {
  return score >= th[2] ? 3 : score >= th[1] ? 2 : score >= th[0] ? 1 : 0
}

/** Fecha uma partida: ranking com rivais NPC, recorde e recompensas (Brilhos, XP e XP da profissão). */
export function settle(o: {
  rankId: string
  difficulty: Difficulty
  score: number
  typical: number
  stars: number
  profession: string
  playerName: string
}): Settled {
  const m = DIFFICULTY_REWARD[o.difficulty]
  const coins = Math.round((18 + o.score * 0.05) * m * (0.6 + o.stars * 0.2))
  const xp = Math.round((8 + o.score * 0.015) * m)
  const profXp = Math.round((6 + o.stars * 6) * m)
  const sub = submitScore(o.rankId, o.difficulty, o.score, o.typical, o.playerName)
  if (o.score > 0) grantRewards({ coins, xp, professionXp: { [o.profession]: profXp } })
  return { ...sub, coins, xp, profXp, stars: o.stars }
}

/** Recorde pessoal salvo (lido do ranking local). */
export function bestOf(rankId: string, d: Difficulty): number {
  try {
    return Number(localStorage.getItem(`jdb.rank.${rankId}.${d}`)) || 0
  } catch {
    return 0
  }
}
