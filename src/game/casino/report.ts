import { getLeaderboard, submitScore, type Difficulty, type Entry } from '../minigames/shared/competition'
import { useAchievements } from './achievements'
import { useChips, type GameId } from './chips'
import { useProfileStore } from '../../state/profileStore'

/** Valor típico de ganho do dia por jogo (gera os rivais NPC dos rankings). */
const TYPICAL: Record<GameId, number> = { blackjack: 900, poker: 1300, roleta: 700, slots: 800 }

export interface RoundReport {
  board: Entry[]
  rank: number
  score: number
}

/**
 * Fecha uma rodada: guarda o ganho líquido do dia e atualiza o ranking do jogo.
 * A pontuação do ranking é o ganho líquido de hoje em fichas (nunca negativa).
 * Fichas valem só status: nada aqui toca Brilhos ou Diamantes.
 */
export function finishRound(game: GameId, difficulty: Difficulty, net: number): RoundReport {
  const chips = useChips.getState()
  chips.recordRound(game, net)
  const score = Math.max(0, chips.dayNet(game))
  let name = 'Você'
  try {
    name = useProfileStore.getState().name || 'Você'
  } catch {
    /* sem perfil */
  }
  const r = submitScore(`cassino-${game}`, difficulty, score, TYPICAL[game], name)
  if (r.rank === 1 && score > 0) useAchievements.getState().award('rank_1')
  return { board: r.board, rank: r.rank, score }
}

export function leaderboardFor(game: GameId, difficulty: Difficulty): RoundReport {
  const score = Math.max(0, useChips.getState().dayNet(game))
  return finishRoundless(game, difficulty, score)
}

function finishRoundless(game: GameId, difficulty: Difficulty, score: number): RoundReport {
  let name = 'Você'
  try {
    name = useProfileStore.getState().name || 'Você'
  } catch {
    /* sem perfil */
  }
  const board = getLeaderboard(`cassino-${game}`, difficulty, TYPICAL[game], name, score)
  return { board, rank: board.findIndex((e) => e.you) + 1, score }
}
