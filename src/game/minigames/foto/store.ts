import { create } from 'zustand'
import { playSfx } from '../audio'
import { getProfessionXp, grantRewards } from '../rewards'
import { dailySeed, DIFFICULTY_REWARD, submitScore, type Difficulty, type Entry } from '../shared/competition'
import { usePhotoStore } from '../../../state/photoStore'
import { useProfileStore } from '../../../state/profileStore'
import { DIFF, levelOfXp, PROFESSION, unlocksAt } from './data'
import { live } from './live'
import {
  clamp, clientComment, DEFAULT_CAM, DEFAULT_LIGHT, followersFor, gradeOf, judgeCritique, makeClients, PAN_X, PAN_Y, pointsOf,
  scoreShot, starsFor, ZOOM_MAX, ZOOM_MIN, type CamState, type Client, type LightState, type ShotScore,
} from './logic'
import type { PoseId } from './data'
import { addFollowers, getBest, saveBest, saveToFeed, setTutorialDone, tutorialDone } from './persist'

export type Phase = 'intro' | 'brief' | 'shoot' | 'between' | 'results'

export interface ShotRec {
  id: number
  client: number
  thumb: string
  pose: PoseId
  score: ShotScore | null
}

export interface ClientResult {
  client: Client
  best: ShotRec | null
  comment: string
}

export interface Results {
  perClient: ClientResult[]
  avg: number
  points: number
  stars: number
  followers: number
  followersTotal: number
  coins: number
  xp: number
  profXp: number
  board: Entry[]
  rank: number
  newBest: boolean
  critique: string
  levelBefore: number
  levelAfter: number
  unlocked: string[]
  bestPhoto: ShotRec | null
  savedToFeed: boolean
}

interface FotoState {
  phase: Phase
  difficulty: Difficulty
  daily: boolean
  seed: number
  level: number
  clients: Client[]
  ci: number
  film: number
  timeLeft: number
  paused: boolean
  cam: CamState
  light: LightState
  shots: ShotRec[]
  /** pedido de foto (a cena 3D atende) */
  shotReq: number
  pending: boolean
  flash: number
  feedback: { id: number; total: number; text: string } | null
  tutorial: number | null
  /** muda a cada cliente (reinicia a linha do tempo da modelo) */
  resetKey: number
  results: Results | null
  /** quanto a câmera se mexeu (tutorial) */
  moved: number

  enter: () => void
  start: (d: Difficulty, daily: boolean) => void
  beginShoot: () => void
  setCam: (c: Partial<CamState>) => void
  setLight: (l: Partial<LightState>) => void
  shoot: () => boolean
  commitShot: (thumb: string, pose: PoseId, peak: number, blink: boolean) => void
  endClient: () => void
  nextClient: () => void
  tick: (dt: number) => void
  setPaused: (p: boolean) => void
  skipTutorial: () => void
  finish: () => void
}

let shotId = 0
let timers: number[] = []
const later = (fn: () => void, ms: number) => {
  timers.push(window.setTimeout(fn, ms))
}
const clearTimers = () => {
  timers.forEach((t) => window.clearTimeout(t))
  timers = []
}

export const bestShotOf = (shots: ShotRec[], client: number): ShotRec | null =>
  shots.filter((s) => s.client === client && s.score).reduce<ShotRec | null>((a, s) => (!a || (s.score?.total ?? 0) > (a.score?.total ?? 0) ? s : a), null)

export const useFotoStore = create<FotoState>()((set, get) => ({
  phase: 'intro',
  difficulty: 'normal',
  daily: false,
  seed: 1,
  level: 1,
  clients: [],
  ci: 0,
  film: 5,
  timeLeft: 120,
  paused: false,
  cam: { ...DEFAULT_CAM },
  light: { ...DEFAULT_LIGHT },
  shots: [],
  shotReq: 0,
  pending: false,
  flash: 0,
  feedback: null,
  tutorial: null,
  resetKey: 0,
  results: null,
  moved: 0,

  enter: () => {
    clearTimers()
    set({ phase: 'intro', level: levelOfXp(getProfessionXp(PROFESSION)), results: null, shots: [], paused: false, pending: false, feedback: null, tutorial: null })
  },

  start: (difficulty, daily) => {
    clearTimers()
    const level = levelOfXp(getProfessionXp(PROFESSION))
    const seed = daily ? dailySeed('foto') : Math.floor(Math.random() * 1e9)
    const cfg = DIFF[difficulty]
    live.cam = { ...DEFAULT_CAM }
    set({
      phase: 'brief', difficulty, daily, seed, level,
      clients: makeClients(seed, difficulty, level), ci: 0, film: cfg.film, timeLeft: cfg.time, paused: false,
      cam: { ...DEFAULT_CAM }, light: { ...DEFAULT_LIGHT }, shots: [], pending: false, feedback: null,
      tutorial: tutorialDone() ? null : 0, resetKey: get().resetKey + 1, results: null, moved: 0,
    })
  },

  beginShoot: () => {
    playSfx('tap')
    set({ phase: 'shoot', feedback: null })
  },

  setCam: (c) => {
    const p = get().cam
    const cam = {
      cx: clamp(c.cx ?? p.cx, -PAN_X, PAN_X),
      cy: clamp(c.cy ?? p.cy, PAN_Y[0], PAN_Y[1]),
      zoom: clamp(c.zoom ?? p.zoom, ZOOM_MIN, ZOOM_MAX),
    }
    const moved = get().moved + Math.abs(cam.cx - p.cx) + Math.abs(cam.cy - p.cy) + Math.abs(cam.zoom - p.zoom) * 0.5
    set({ cam, moved, tutorial: get().tutorial === 0 && moved > 0.9 ? 1 : get().tutorial })
  },

  setLight: (l) => {
    const next = { ...get().light, ...l }
    set({ light: next, tutorial: get().tutorial === 1 ? 2 : get().tutorial })
  },

  shoot: () => {
    const s = get()
    if (s.phase !== 'shoot' || s.film <= 0 || s.pending || s.paused) return false
    playSfx('click')
    set({ film: s.film - 1, pending: true, shotReq: s.shotReq + 1, flash: s.flash + 1 })
    return true
  },

  commitShot: (thumb, pose, peak, blink) => {
    const s = get()
    const id = ++shotId
    const ci = s.ci
    const rec: ShotRec = { id, client: ci, thumb, pose, score: null }
    const pre = live.recent
    live.peakSpeed = 0
    const snap = { cam: { ...live.cam }, light: { ...s.light }, pose, peak, blink }
    set({ shots: [...s.shots, rec], tutorial: s.tutorial === 2 ? null : s.tutorial })
    if (s.tutorial === 2) setTutorialDone()
    // obturador aberto por ~0,3 s: movimento da câmera nesse intervalo borra a foto
    later(() => {
      const st = get()
      if (st.phase === 'intro') return
      const motion = Math.max(pre, live.peakSpeed) * 0.3
      const client = st.clients[ci]
      const score = scoreShot({ ...snap, motion }, client.brief, DIFF[st.difficulty].tight)
      const shots = get().shots.map((x) => (x.id === id ? { ...x, score } : x))
      set({ shots, pending: false, feedback: { id, total: score.total, text: gradeOf(score.total) } })
      playSfx(score.total >= 85 ? 'combo' : score.total >= 55 ? 'tip' : 'bad')
      if (get().film <= 0) later(() => get().phase === 'shoot' && get().endClient(), 1500)
    }, 300)
  },

  endClient: () => {
    if (get().phase !== 'shoot') return
    set({ phase: 'between', feedback: null })
  },

  nextClient: () => {
    const s = get()
    if (s.ci + 1 >= s.clients.length) {
      s.finish()
      return
    }
    live.cam = { ...DEFAULT_CAM }
    live.peakSpeed = 0
    set({ ci: s.ci + 1, film: DIFF[s.difficulty].film, phase: 'brief', cam: { ...DEFAULT_CAM }, resetKey: s.resetKey + 1, feedback: null, pending: false })
  },

  tick: (dt) => {
    const s = get()
    if (s.phase !== 'shoot' || s.paused || s.tutorial !== null) return
    const t = s.timeLeft - dt
    if (t <= 0) {
      set({ timeLeft: 0 })
      s.finish()
    } else set({ timeLeft: t })
  },

  setPaused: (paused) => set({ paused }),

  skipTutorial: () => {
    setTutorialDone()
    set({ tutorial: null })
  },

  finish: () => {
    const s = get()
    if (s.phase === 'results') return
    clearTimers()
    const bests = s.clients.map((_, i) => bestShotOf(s.shots, i))
    const perClient: ClientResult[] = s.clients.map((client, i) => ({ client, best: bests[i], comment: clientComment(client, bests[i]?.score ?? null, s.seed) }))
    const totals = bests.map((b) => b?.score?.total ?? 0)
    const avg = totals.reduce((a, b) => a + b, 0) / Math.max(1, totals.length)
    const mult = DIFFICULTY_REWARD[s.difficulty]
    const points = pointsOf(totals)
    const name = useProfileStore.getState().name
    const typical = s.clients.length * 620
    const { board, rank } = submitScore('foto', s.difficulty, points, typical, name)
    const newBest = saveBest(s.difficulty, Math.round(avg)) && getBest(s.difficulty) > 0
    const followers = followersFor(avg, s.difficulty, mult)
    const followersTotal = addFollowers(followers)
    const coins = Math.round(avg * 0.6 * mult)
    const xp = Math.round(avg * 0.5 * mult)
    const profXp = Math.round((10 + avg * 0.5) * mult)
    const levelBefore = levelOfXp(getProfessionXp(PROFESSION))
    grantRewards({ coins, xp, professionXp: { [PROFESSION]: profXp } })
    const levelAfter = levelOfXp(getProfessionXp(PROFESSION))
    const unlocked: string[] = []
    for (let l = levelBefore + 1; l <= levelAfter; l++) unlocked.push(...unlocksAt(l))
    const bestPhoto = bests.reduce<ShotRec | null>((a, b) => (b && (!a || (b.score?.total ?? 0) > (a.score?.total ?? 0)) ? b : a), null)
    let savedToFeed = false
    if (bestPhoto) {
      const cl = s.clients[bestPhoto.client]
      savedToFeed = saveToFeed(bestPhoto.thumb, `Ensaio com ${cl.name}`)
      usePhotoStore.getState().reload()
    }
    useProfileStore.getState().addFame(Math.round(followers / 40))
    set({
      phase: 'results', paused: false, tutorial: null,
      results: {
        perClient, avg, points, stars: starsFor(avg), followers, followersTotal, coins, xp, profXp, board, rank, newBest,
        critique: judgeCritique(bests.flatMap((b) => (b?.score ? [b.score] : []))), levelBefore, levelAfter, unlocked, bestPhoto, savedToFeed,
      },
    })
    playSfx('done')
  },
}))
