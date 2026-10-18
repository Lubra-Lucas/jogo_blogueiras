import { supabase, OFFLINE } from '../../../net/supabase'
import { currentCharId } from '../../../net/save'

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
 * Online (logada): o ranking vem da tabela `scores` do Supabase (supabase/scores.sql), com as outras jogadoras.
 * Offline (`?offline=1`) ou sem personagem escolhida: rivais NPC, como descrito acima.
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

interface Row { char_id: string; name: string; board_id: string; difficulty: Difficulty; score: number }

const DIFFS: Difficulty[] = ['facil', 'normal', 'dificil', 'estrela']
let rows: Row[] = []
let started = false

const online = () => !OFFLINE && currentCharId() !== null

/** Daily boards (`*-diario`) recomecam todo dia (UTC); os outros sao permanentes. */
const boardId = (id: string) => (id.endsWith('-diario') ? `${id}:${new Date().toISOString().slice(0, 10)}` : id)

/** Ranking online: 9 melhores das outras + a jogadora, em ordem. */
export function buildBoard(others: Entry[], you: Entry): Entry[] {
  const top = [...others].sort((a, b) => b.score - a.score).slice(0, 9)
  return [...top, you].sort((a, b) => b.score - a.score)
}

/** Posicao real (pode passar de 10): 1 + quantas outras tem mais pontos. */
export const trueRank = (others: Entry[], score: number) => 1 + others.filter((o) => o.score > score).length

function othersOf(id: string, d: Difficulty): Entry[] {
  const b = boardId(id)
  const me = currentCharId()
  return rows.filter((r) => r.board_id === b && r.difficulty === d && r.char_id !== me).map((r) => ({ name: r.name, score: r.score }))
}

function upload(r: Row) {
  void supabase
    .from('scores')
    .upsert({ ...r, updated_at: new Date().toISOString() }, { onConflict: 'char_id,board_id,difficulty' })
    .then(({ error }) => {
      if (error) console.warn('ranking: falha ao enviar placar', error.message)
    })
}

function setMine(id: string, d: Difficulty, score: number, name: string): Row {
  const me = currentCharId() as string
  const b = boardId(id)
  const row: Row = { char_id: me, name: name.slice(0, 20) || 'Blogueira', board_id: b, difficulty: d, score: Math.round(score) }
  rows = [...rows.filter((r) => !(r.char_id === me && r.board_id === b && r.difficulty === d)), row]
  return row
}

async function fetchRows(first: boolean) {
  // shortcut: baixa a tabela inteira de recordes; trocar por top-10 por ranking quando passar de ~mil jogadoras
  const { data, error } = await supabase.from('scores').select('char_id, name, board_id, difficulty, score')
  if (error || !data) return void console.warn('ranking: falha ao baixar placares', error?.message)
  rows = data as Row[]
  if (first) uploadLocalBests()
}

/** Sobe os recordes guardados no aparelho que faltam (ou estao acima) no banco, p.ex. jogados antes do ranking online. */
function uploadLocalBests() {
  const me = currentCharId()
  if (!me) return
  const name = (() => { try { return JSON.parse(localStorage.getItem('jb.profile.v1') ?? '{}').name as string } catch { return '' } })() || 'Blogueira'
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k?.startsWith('jdb.rank.')) continue
    const cut = k.lastIndexOf('.')
    const d = k.slice(cut + 1) as Difficulty
    const id = k.slice('jdb.rank.'.length, cut)
    const score = Math.round(Number(localStorage.getItem(k)) || 0)
    if (!DIFFS.includes(d) || !id || score <= 0) continue
    const b = boardId(id)
    const mine = rows.find((r) => r.char_id === me && r.board_id === b && r.difficulty === d)
    if (!mine || mine.score < score) upload(setMine(id, d, score, name))
  }
}

/** Liga o ranking online: baixa os placares agora e a cada 60 s (chamar uma vez, depois do login). */
export function startRanking() {
  if (started || !online()) return
  started = true
  void fetchRows(true)
  setInterval(() => void fetchRows(false), 60_000)
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
  if (online()) {
    if (newBest) upload(setMine(id, difficulty, score, playerName))
    const others = othersOf(id, difficulty)
    const mine = Math.round(Math.max(score, best))
    const board = buildBoard(others, { name: playerName, score: mine, you: true })
    return { board, rank: trueRank(others, mine), newBest }
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
  if (online()) {
    const you: Entry = { name: playerName, score: Math.round(Math.max(current, readBest(id, difficulty))), you: true }
    return buildBoard(othersOf(id, difficulty), you)
  }
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
