/**
 * Controlador da partida: junta áudio (Player), cartela (Chart) e julgamento (Run). A interface e a
 * cena 3D leem `live` (objeto mutável, atualizado a cada quadro) sem passar pelo React.
 */
import { create } from 'zustand'
import { playSfx } from '../audio'
import { DIFFICULTY_REWARD, dailySeed, submitScore, type Difficulty, type Entry } from '../shared/competition'
import { getProfessionXp, grantRewards } from '../rewards'
import { useProfileStore } from '../../../state/profileStore'
import { buildChart, type Chart } from './chart'
import { Player, eventAudioTime, getCtx } from './engine'
import { Run, djLevel, gradeOf, starsOf, typicalScore, type Grade, type JudgeEvent, type Judgement } from './run'
import { SONGS, dailySong, getSong, songDuration, type Song } from './songs'

export const PROFESSION = 'DJ'
const TUT_KEY = 'jdb.dj.tutorial'
const SEL_KEY = 'jdb.dj.sel'

export type Phase = 'menu' | 'calibrate' | 'playing' | 'paused' | 'results'

export interface DjResult {
  songName: string
  difficulty: Difficulty
  daily: boolean
  accuracy: number
  grade: Grade
  stars: 1 | 2 | 3
  score: number
  maxCombo: number
  counts: Record<Judgement, number>
  energy: number
  crowdPeak: number
  board: Entry[]
  rank: number
  newBest: boolean
  coins: number
  xp: number
  profXp: number
  levelBefore: number
  levelAfter: number
  unlocked: string[]
}

const read = (k: string): string | null => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* ignora */
  }
}

function loadSel(): { songId: string; difficulty: Difficulty } {
  try {
    const v = JSON.parse(read(SEL_KEY) ?? 'null')
    if (v && SONGS.some((s) => s.id === v.songId) && ['facil', 'normal', 'dificil', 'estrela'].includes(v.difficulty)) return v
  } catch {
    /* ignora */
  }
  return { songId: SONGS[0].id, difficulty: 'normal' }
}

interface DjState {
  phase: Phase
  songId: string
  difficulty: Difficulty
  daily: boolean
  tutorialSeen: boolean
  showHelp: boolean
  result: DjResult | null
  /** muda a cada nova partida (reinicia a UI) */
  runId: number
  set: (p: Partial<Pick<DjState, 'songId' | 'difficulty' | 'daily' | 'showHelp'>>) => void
  setPhase: (p: Phase) => void
  finishTutorial: () => void
}

const sel = loadSel()
export const useDjStore = create<DjState>()((set, get) => ({
  phase: 'menu',
  songId: sel.songId,
  difficulty: sel.difficulty,
  daily: false,
  tutorialSeen: read(TUT_KEY) === '1',
  showHelp: false,
  result: null,
  runId: 0,
  set: (p) => {
    set(p)
    const s = get()
    write(SEL_KEY, JSON.stringify({ songId: s.songId, difficulty: s.difficulty }))
  },
  setPhase: (phase) => set({ phase }),
  finishTutorial: () => {
    write(TUT_KEY, '1')
    set({ tutorialSeen: true, showHelp: false })
  },
}))

/** Estado "vivo" lido por HUD, destaque e cena 3D a cada quadro. */
export const live = {
  t: -2,
  duration: 60,
  bpm: 100,
  beat: 0,
  kick: 0,
  energy: 0.3,
  energySmooth: 0.3,
  combo: 0,
  multiplier: 1,
  fever: false,
  score: 0,
  accuracy: 0,
  judged: 0,
  total: 1,
  lastJudge: { id: 0, j: 'perfect' as Judgement, delta: 0, at: 0, lane: 0 },
  laneFlash: [0, 0, 0, 0],
  held: [false, false, false, false],
  crowdPeak: 0,
  colors: ['#34e0ff', '#8f6bff', '#ffb340'] as [string, string, string],
  active: false,
  section: 0,
}

export interface Session {
  song: Song
  chart: Chart
  run: Run
  player: Player
  diff: Difficulty
  daily: boolean
  seed: number
  levelBefore: number
}
/** só em dev: robô que joga sozinho (?djbot=0.9 = 90% de acerto) para capturas e testes */
export const dev = { bot: 0 }
if (import.meta.env.DEV) Object.assign(window, { __djLive: live, __djSession: () => session })
export let session: Session | null = null

export function djXp() {
  return getProfessionXp(PROFESSION)
}
export function currentLevel() {
  return djLevel(djXp())
}
export const isUnlocked = (s: Song) => currentLevel() >= s.unlock

export function todaysSong(): Song {
  return dailySong(dailySeed('dj'))
}

export function startSong(opts?: { songId?: string; difficulty?: Difficulty; daily?: boolean }) {
  const st = useDjStore.getState()
  const daily = opts?.daily ?? st.daily
  const diff = opts?.difficulty ?? st.difficulty
  const seed = daily ? dailySeed('dj') : 1234 + SONGS.findIndex((s) => s.id === (opts?.songId ?? st.songId)) * 77
  const song = daily ? todaysSong() : getSong(opts?.songId ?? st.songId)
  session?.player.stop()
  const chart = buildChart(song, diff, seed)
  const run = new Run(chart, diff)
  if (!getCtx()) return
  const player = new Player(song, seed)
  session = { song, chart, run, player, diff, daily, seed, levelBefore: currentLevel() }
  Object.assign(live, {
    t: -1.6, duration: chart.duration, bpm: song.bpm, energy: run.energy, energySmooth: run.energy,
    combo: 0, multiplier: 1, fever: false, score: 0, accuracy: 0, judged: 0, total: chart.notes.length, crowdPeak: run.energy,
    colors: song.colors, active: true, laneFlash: [0, 0, 0, 0], held: [false, false, false, false],
  })
  useDjStore.setState({ phase: 'playing', daily, difficulty: diff, songId: song.id, runId: st.runId + 1, result: null })
}

function laneFor(code: string, lanes: 2 | 4): number {
  if (lanes === 4) return ['KeyD', 'KeyF', 'KeyJ', 'KeyK'].indexOf(code)
  return code === 'KeyD' || code === 'KeyF' ? 0 : code === 'KeyJ' || code === 'KeyK' ? 1 : -1
}
export { laneFor }

function onJudge(ev: JudgeEvent) {
  live.lastJudge = { id: live.lastJudge.id + 1, j: ev.j, delta: ev.delta, at: performance.now(), lane: ev.lane }
  live.laneFlash[ev.lane] = 1
  if (ev.j === 'miss') {
    session?.player.duck()
    playSfx('bad')
  } else if (ev.j === 'perfect') playSfx('tap')
}

export function padDown(lane: number, ts: number) {
  const s = session
  if (!s || useDjStore.getState().phase !== 'playing' || s.player.paused) return
  const now = eventAudioTime(ts) - s.player.t0 - latencyOf(s)
  s.run.press(lane, now)
  live.laneFlash[lane] = Math.max(live.laneFlash[lane], 0.6)
  live.held[lane] = true
  flush(s)
}
export function padUp(lane: number, ts: number) {
  const s = session
  live.held[lane] = false
  if (!s || useDjStore.getState().phase !== 'playing') return
  s.run.release(lane, eventAudioTime(ts) - s.player.t0 - latencyOf(s))
  flush(s)
}
export function scratchInput(dir: -1 | 0 | 1, ts: number) {
  const s = session
  if (!s || useDjStore.getState().phase !== 'playing' || s.player.paused) return
  s.run.scratch(s.diff === 'facil' ? 0 : dir, eventAudioTime(ts) - s.player.t0 - latencyOf(s))
  flush(s)
}
function latencyOf(s: Session) {
  // time() = ctx - t0 - latency  =>  latency = ctx - t0 - time()
  return (getCtx()?.currentTime ?? 0) - s.player.t0 - s.player.time()
}
function flush(s: Session) {
  for (const e of s.run.drainEvents()) onJudge(e)
  syncLive(s)
}
function syncLive(s: Session) {
  const r = s.run
  live.energy = r.energy
  live.combo = r.combo
  live.multiplier = r.multiplier
  live.fever = r.fever
  live.score = r.score
  live.accuracy = r.accuracy
  live.judged = r.judged
  live.crowdPeak = Math.max(live.crowdPeak, r.energy)
}

/** Chamado a cada quadro pela interface enquanto a partida existe. */
export function tick(dt: number) {
  const s = session
  if (!s) {
    live.kick = Math.exp(-(((performance.now() / 1000) % 0.6) / 0.6) * 5) * 0.5
    return
  }
  if (!live.active) return
  const phase = useDjStore.getState().phase
  const t = s.player.time()
  live.t = t
  const beatLen = 60 / s.song.bpm
  live.beat = (((t / beatLen) % 1) + 1) % 1
  live.kick = Math.exp(-live.beat * 5)
  live.energySmooth += (live.energy - live.energySmooth) * Math.min(1, dt * 3)
  for (let i = 0; i < 4; i++) live.laneFlash[i] = Math.max(0, live.laneFlash[i] - dt * 4)
  if (phase !== 'playing') return
  if (dev.bot > 0) runBot(s, t)
  s.run.update(t, dt)
  flush(s)
  if (t > s.chart.duration + 0.9 && s.run.finished) finish()
  else if (t > songDuration(s.song) + 2) finish()
}

export function pause() {
  if (!session || useDjStore.getState().phase !== 'playing') return
  session.player.pause()
  useDjStore.setState({ phase: 'paused' })
}
export function resume() {
  if (!session || useDjStore.getState().phase !== 'paused') return
  session.player.resume()
  useDjStore.setState({ phase: 'playing' })
}

export function quitToMenu() {
  session?.player.stop()
  session = null
  live.active = false
  useDjStore.setState({ phase: 'menu', result: null })
}

export function finish() {
  const s = session
  if (!s || useDjStore.getState().phase === 'results') return
  s.player.stop()
  live.active = false
  const r = s.run
  const acc = r.accuracy
  const stars = starsOf(acc)
  const reward = DIFFICULTY_REWARD[s.diff]
  const name = useProfileStore.getState().name
  const typ = typicalScore(s.chart)
  const boardId = s.daily ? 'dj-diario' : `dj-${s.song.id}`
  const { board, rank, newBest } = submitScore(boardId, s.diff, r.score, typ, name)
  const coins = Math.round((10 + Math.min(1.4, r.score / typ) * 22 + stars * 6) * reward)
  const xp = Math.round((8 + stars * 6) * reward)
  const profXp = Math.round((6 + stars * 6 + (s.daily ? 8 : 0)) * reward)
  grantRewards({ coins, xp, professionXp: { [PROFESSION]: profXp } })
  const levelAfter = currentLevel()
  const unlocked = SONGS.filter((x) => x.unlock > s.levelBefore && x.unlock <= levelAfter).map((x) => x.name)
  const result: DjResult = {
    songName: s.song.name, difficulty: s.diff, daily: s.daily, accuracy: acc, grade: gradeOf(acc), stars, score: r.score,
    maxCombo: r.maxCombo, counts: { ...r.counts }, energy: r.energy, crowdPeak: live.crowdPeak, board, rank, newBest,
    coins, xp, profXp, levelBefore: s.levelBefore, levelAfter, unlocked,
  }
  playSfx('done')
  useDjStore.setState({ phase: 'results', result })
}

export function markTutorialDone() {
  useDjStore.getState().finishTutorial()
}

function runBot(s: Session, t: number) {
  const { notes } = s.chart
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]
    if (n.t > t + 0.05) break
    if (s.run.state[i] !== 'pending' || n.t > t) continue
    if (((Math.imul(n.id + 7, 2654435761) >>> 0) / 4294967296) > dev.bot) continue // deixa passar (erro)
    const at = n.t + (((Math.imul(n.id + 3, 40503) >>> 0) / 4294967296) - 0.5) * 0.07
    if (n.type === 'scratch') s.run.scratch(n.dir, at)
    else s.run.press(n.lane, at)
    live.laneFlash[n.lane] = 1
  }
}
