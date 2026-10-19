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
  /** carga extra enviada so no placar final (ex.: os looks do Estilista); vem de outra jogadora, validar antes de usar */
  data?: unknown
}
/** classificacao: maior placar primeiro; quem ainda nao pontuou vai no fim com 0 */
export function standings(players: VersusPlayer[], scores: Record<string, VersusScore>) {
  return players
    .map((p) => ({ id: p.id, ...(scores[p.id] ?? { name: p.name, score: 0, detail: '', done: false }) }))
    .sort((a, b) => Number(b.id in scores) - Number(a.id in scores) || b.score - a.score)
}

/** config de partida vinda de outra jogadora: dificuldade conhecida e seed numerica, senao null */
export function parseMatchBase(c: unknown): { difficulty: 'facil' | 'normal' | 'dificil' | 'estrela'; seed: number } | null {
  const o = c as { difficulty?: unknown; seed?: unknown } | null
  const difficulty = (['facil', 'normal', 'dificil', 'estrela'] as const).find((d) => d === o?.difficulty)
  return difficulty && typeof o?.seed === 'number' && Number.isFinite(o.seed) ? { difficulty, seed: o.seed } : null
}
/** seed de 32 bits para a partida combinada */
export const matchSeed = () => (Math.random() * 4294967296) >>> 0
