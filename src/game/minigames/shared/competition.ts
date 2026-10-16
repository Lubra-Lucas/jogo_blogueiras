/**
 * Competição comum a todos os minijogos (enquanto não há servidor online).
 *
 * - Ranking por minijogo: a melhor pontuação da jogadora + rivais NPC com pontuações
 *   geradas por semente (parecem jogadoras reais, mudam um pouco a cada dia).
 * - Desafio do dia: semente diária igual para todo mundo (mesmos pedidos/clientes/músicas),
 *   para que, quando houver online, as pontuações sejam comparáveis.
 * - Dificuldade: 'facil' | 'normal' | 'dificil' | 'estrela'. A mesma partida serve para
 *   crianças (fácil, mais tempo e ajudas) e para quem quer desafio (estrela, sem ajudas).
 *
 * Quando existir um backend, troque apenas `submitScore`/`getLeaderboard` por chamadas remotas.
 */

export type Difficulty = 'facil' | 'normal' | 'dificil' | 'estrela'

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
  estrela: 'Estrela',
}

/** Multiplicador de recompensa por dificuldade (mais desafio, mais Brilhos/XP). */
export const DIFFICULTY_REWARD: Record<Difficulty, number> = {
  facil: 0.7,
  normal: 1,
  dificil: 1.35,
  estrela: 1.8,
}

export interface Entry {
  name: string
  score: number
  you?: boolean
}

const RIVAL_NAMES = [
  'Lola', 'Mimi', 'Bia Glam', 'Duda', 'Nina Star', 'Valen', 'Lulu', 'Kiki', 'Cecí', 'Manu',
  'Isa Brilho', 'Tati', 'Gabi', 'Pietra', 'Luna', 'Malu', 'Jojo', 'Sofi', 'Ana Rosé', 'Belle',
]

/** Semente do dia (UTC), igual para todas as jogadoras. */
export function dailySeed(minigameId: string, date = new Date()): number {
  const day = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`
  return hash(`${minigameId}:${day}`)
}

/** RNG determinístico (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const key = (id: string, d: Difficulty) => `jdb.rank.${id}.${d}`

function readBest(id: string, d: Difficulty): number {
  try {
    return Number(localStorage.getItem(key(id, d))) || 0
  } catch {
    return 0
  }
}

/**
 * Registra uma pontuação. `typicalScore` é a pontuação de uma partida "boa" naquela dificuldade
 * (cada minijogo informa a sua), usada para gerar rivais críveis.
 * Retorna o ranking (10 posições) e a posição da jogadora (1 = primeira).
 */
export function submitScore(
  id: string,
  difficulty: Difficulty,
  score: number,
  typicalScore: number,
  playerName = 'Você',
): { board: Entry[]; rank: number; newBest: boolean } {
  const best = readBest(id, difficulty)
  const newBest = score > best
  if (newBest) {
    try {
      localStorage.setItem(key(id, difficulty), String(Math.round(score)))
    } catch {
      /* armazenamento indisponível */
    }
  }
  const board = getLeaderboard(id, difficulty, typicalScore, playerName, score)
  const rank = board.findIndex((e) => e.you) + 1
  return { board, rank, newBest }
}

/** Ranking do dia: 9 rivais NPC + a jogadora (melhor entre a partida atual e o recorde). */
export function getLeaderboard(
  id: string,
  difficulty: Difficulty,
  typicalScore: number,
  playerName = 'Você',
  current = 0,
): Entry[] {
  const r = rng(dailySeed(`${id}:${difficulty}`))
  const names = [...RIVAL_NAMES].sort(() => r() - 0.5).slice(0, 9)
  const rivals: Entry[] = names.map((name, i) => ({
    name,
    // espalhados em torno da partida típica: o topo é difícil de bater, o fim é fácil
    score: Math.round(typicalScore * (1.45 - i * 0.12) * (0.92 + r() * 0.16)),
  }))
  const you: Entry = { name: playerName, score: Math.round(Math.max(current, readBest(id, difficulty))), you: true }
  return [...rivals, you].sort((a, b) => b.score - a.score)
}
