// Parte pura da competicao ao vivo (separada de versus.ts para o teste rodar sem Supabase/Vite).
export interface VersusPlayer {
  id: string
  name: string
}
export interface VersusScore {
  name: string
  score: number
  detail: string
  done: boolean
}
/** classificacao: maior placar primeiro; quem ainda nao pontuou vai no fim com 0 */
export function standings(players: VersusPlayer[], scores: Record<string, VersusScore>) {
  return players
    .map((p) => ({ id: p.id, ...(scores[p.id] ?? { name: p.name, score: 0, detail: '', done: false }) }))
    .sort((a, b) => Number(b.id in scores) - Number(a.id in scores) || b.score - a.score)
}
