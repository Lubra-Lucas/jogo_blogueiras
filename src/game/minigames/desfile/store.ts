import { create } from 'zustand'
import type { Appearance } from '../../../shared/appearance'
import { useAppearanceStore } from '../../../state/appearanceStore'
import { useProfileStore } from '../../../state/profileStore'
import { grantRewards } from '../rewards'
import { lookFromAppearance, lookToAppearance } from './adapters'
import { addFame, saveBest, getBest } from './persist'
import { JUDGES, makeCompetitors, poseScore, rewardsFor, scoreLook, type RewardOutcome } from './scoring'
import { THEMES } from './themes'
import type { Competitor, JudgeResult, Look, PoseGrade, Theme } from './types'

export type Phase = 'intro' | 'camarim' | 'runway' | 'judging' | 'results'
export type RunStage = 'walk' | 'poses' | 'done'

export const CAMARIM_SECONDS = 90
export const POSES = 3

export interface DesfileResult {
  /** do 1º ao 5º */
  ranking: Competitor[]
  playerRank: number
  judges: JudgeResult[]
  harmonyScheme: string
  rewards: RewardOutcome
  newBest: boolean
  prevBest: number | null
}

interface DesfileState {
  phase: Phase
  theme: Theme
  /** corpo/pele/morphs do jogador no início da rodada (o look salvo só muda em `saveLook`) */
  base: Appearance
  look: Look
  camarimEndsAt: number
  poses: PoseGrade[]
  runStage: RunStage
  poseIdx: number
  /** QTE em andamento: instante (performance.now) do alvo e duração do anel */
  qte: { id: number; startAt: number; targetAt: number } | null
  lastGrade: { id: number; grade: PoseGrade } | null
  result: DesfileResult | null
  saved: boolean

  begin: (themeId?: string) => void
  redraw: () => void
  enterCamarim: () => void
  patchLook: (p: Partial<Look>) => void
  finishCamarim: () => void
  startRunway: () => void
  setRunStage: (s: RunStage) => void
  startQte: (startAt: number, targetAt: number) => void
  recordPose: (g: PoseGrade) => void
  finishRunway: () => void
  showResults: () => void
  saveLook: () => void
}

let gradeId = 0
let qteId = 0

function pickTheme(exclude?: string): Theme {
  const pool = THEMES.filter((t) => t.id !== exclude)
  return pool[Math.floor(Math.random() * pool.length)]
}

export const useDesfileStore = create<DesfileState>()((set, get) => ({
  phase: 'intro',
  theme: THEMES[0],
  base: useAppearanceStore.getState().appearance,
  look: lookFromAppearance(useAppearanceStore.getState().appearance),
  camarimEndsAt: 0,
  poses: [],
  runStage: 'walk',
  poseIdx: 0,
  qte: null,
  lastGrade: null,
  result: null,
  saved: false,

  begin: (themeId) => {
    const base = useAppearanceStore.getState().appearance
    const theme = themeId ? (THEMES.find((t) => t.id === themeId) ?? pickTheme()) : pickTheme()
    set({ phase: 'intro', theme, base, look: lookFromAppearance(base), poses: [], result: null, saved: false, qte: null, lastGrade: null, runStage: 'walk', poseIdx: 0 })
  },
  redraw: () => set({ theme: pickTheme(get().theme.id) }),
  enterCamarim: () => set({ phase: 'camarim', camarimEndsAt: performance.now() + CAMARIM_SECONDS * 1000 }),
  patchLook: (p) => set({ look: { ...get().look, ...p } }),
  finishCamarim: () => set({ phase: 'runway', runStage: 'walk', poseIdx: 0, poses: [], qte: null, lastGrade: null }),
  startRunway: () => set({ runStage: 'walk' }),
  setRunStage: (runStage) => set({ runStage }),
  startQte: (startAt, targetAt) => set({ qte: { id: ++qteId, startAt, targetAt } }),
  recordPose: (grade) => {
    const s = get()
    set({ poses: [...s.poses, grade], lastGrade: { id: ++gradeId, grade }, qte: null, poseIdx: s.poseIdx + 1 })
  },
  finishRunway: () => {
    const s = get()
    const poses = poseScore(s.poses)
    const me = scoreLook(s.look, s.theme, poses, `jogadora|${Date.now()}`)
    const player: Competitor = {
      id: 'player', name: 'Você', emoji: '⭐', look: s.look, skill: 1, total: me.total, score100: me.score100, isPlayer: true, breakdown: me.breakdown,
    }
    const ranking = [player, ...makeCompetitors(s.theme)].sort((a, b) => b.total - a.total || (a.isPlayer ? -1 : 1))
    const playerRank = ranking.findIndex((c) => c.isPlayer) + 1
    const rewards = rewardsFor(playerRank, me.score100)
    grantRewards({ coins: rewards.coins, xp: rewards.xp, professionXp: { Modelo: rewards.modelXp } })
    addFame(rewards.fame)
    // a missão só conclui quando o desfile termina de verdade (não ao abrir/fechar o minijogo)
    useProfileStore.getState().completeQuest('runway')
    const prev = getBest()[s.theme.id]?.score100 ?? null
    const newBest = saveBest(s.theme.id, me.score100, playerRank)
    set({
      phase: 'judging',
      result: { ranking, playerRank, judges: me.judges, harmonyScheme: me.scheme, rewards, newBest, prevBest: prev },
    })
  },
  showResults: () => set({ phase: 'results' }),
  saveLook: () => {
    const s = get()
    useAppearanceStore.getState().setAppearance(lookToAppearance(s.look, s.base))
    set({ saved: true })
  },
}))

export { JUDGES }
