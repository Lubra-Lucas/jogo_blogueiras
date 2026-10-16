/** Dados do "Ensaio Fotográfico": poses, fundos, géis, adereços, dificuldades e desbloqueios. */
import type { Difficulty } from '../shared/competition'

export const PROFESSION = 'Fotógrafa'

// ------------------------------------------------------------------ poses
export type PoseId = 'neutra' | 'cintura' | 'cabelo' | 'fofa' | 'vitoria' | 'perfil_esq' | 'perfil_dir' | 'beijo'

export interface PoseDef {
  id: PoseId
  label: string
  /** rotação do corpo (rad, em Y) */
  yaw: number
  /** clipe de emote (em vez de pose por ossos) */
  clip?: 'kiss'
  /** duração do clipe e janela de pico (fração) */
  clipDur?: number
  peakWin?: [number, number]
}

export const POSES: Record<PoseId, PoseDef> = {
  neutra: { id: 'neutra', label: 'Pose natural', yaw: 0 },
  cintura: { id: 'cintura', label: 'Mãos na cintura', yaw: 0 },
  cabelo: { id: 'cabelo', label: 'Charme no cabelo', yaw: 0 },
  fofa: { id: 'fofa', label: 'Pose fofa', yaw: 0 },
  vitoria: { id: 'vitoria', label: 'Braços para o alto', yaw: 0 },
  perfil_esq: { id: 'perfil_esq', label: 'Perfil à esquerda', yaw: -Math.PI * 0.46 },
  perfil_dir: { id: 'perfil_dir', label: 'Perfil à direita', yaw: Math.PI * 0.46 },
  beijo: { id: 'beijo', label: 'Beijinho', yaw: 0, clip: 'kiss', clipDur: 4.57, peakWin: [0.22, 0.34] },
}

/** Grupos de pose pedidos pelo cliente. */
export type Mood = 'poderosa' | 'fofa' | 'charme' | 'alegre' | 'perfil_esq' | 'perfil_dir' | 'beijinho'
export const MOOD_POSES: Record<Mood, PoseId[]> = {
  poderosa: ['cintura'],
  fofa: ['fofa'],
  charme: ['cabelo'],
  alegre: ['vitoria'],
  perfil_esq: ['perfil_esq'],
  perfil_dir: ['perfil_dir'],
  beijinho: ['beijo'],
}
export const MOOD_LABEL: Record<Mood, string> = {
  poderosa: 'pose poderosa',
  fofa: 'pose fofa',
  charme: 'pose de charme',
  alegre: 'pose animada',
  perfil_esq: 'perfil à esquerda',
  perfil_dir: 'perfil à direita',
  beijinho: 'beijinho',
}

// ------------------------------------------------------------------ luz
export const KELVIN_MIN = 2500
export const KELVIN_MAX = 9500
export type LightSide = 'esq' | 'topo' | 'dir' | 'tras'
export const SIDE_LABEL: Record<LightSide, string> = { esq: 'Esquerda', topo: 'Topo', dir: 'Direita', tras: 'Contraluz' }
export type TempBand = 'quente' | 'neutra' | 'fria'
export const TEMP_K: Record<TempBand, number> = { quente: 3200, neutra: 5300, fria: 7600 }
export const TEMP_LABEL: Record<TempBand, string> = { quente: 'luz quente', neutra: 'luz neutra', fria: 'luz fria' }

// ------------------------------------------------------------------ fundos (cores reais de papel de fundo)
export interface BackdropDef { id: string; label: string; color: string; family: string; level: number }
export const BACKDROPS: BackdropDef[] = [
  { id: 'branco', label: 'Branco ciclorama', color: '#efede8', family: 'claro', level: 1 },
  { id: 'cinza', label: 'Cinza estúdio', color: '#8a8e94', family: 'cinza', level: 1 },
  { id: 'creme', label: 'Creme', color: '#e3d5b8', family: 'claro', level: 1 },
  { id: 'marinho', label: 'Azul-marinho', color: '#1f2d4a', family: 'azul', level: 2 },
  { id: 'terracota', label: 'Terracota', color: '#b2644a', family: 'quente', level: 3 },
  { id: 'oliva', label: 'Verde-oliva', color: '#6b7647', family: 'verde', level: 4 },
  { id: 'preto', label: 'Preto fosco', color: '#1a1a1d', family: 'escuro', level: 5 },
  { id: 'nude', label: 'Rosa nude', color: '#d6a79f', family: 'quente', level: 5 },
]
export const BACKDROP_FAMILY_LABEL: Record<string, string> = { claro: 'fundo claro', cinza: 'fundo cinza', azul: 'fundo azul', quente: 'fundo terroso', verde: 'fundo verde', escuro: 'fundo escuro' }

export interface GelDef { id: string; label: string; color: string; level: number }
export const GELS: GelDef[] = [
  { id: 'nenhum', label: 'Sem gel', color: '#ffffff', level: 1 },
  { id: 'ambar', label: 'Âmbar', color: '#ffb25a', level: 2 },
  { id: 'gelo', label: 'Azul-gelo', color: '#8fc3ff', level: 3 },
  { id: 'magenta', label: 'Magenta', color: '#ff6fb1', level: 4 },
  { id: 'verde', label: 'Verde-menta', color: '#7fe0b0', level: 5 },
]

export interface PropDef {
  id: string
  label: string
  file: string
  level: number
  /** posição no estúdio e caixa (m) para saber se aparece no quadro */
  pos: [number, number, number]
  rotY?: number
  halfW: number
  y0: number
  y1: number
}
export const PROPS: PropDef[] = [
  { id: 'nenhum', label: 'Sem adereço', file: '', level: 1, pos: [0, 0, 0], halfW: 0, y0: 0, y1: 0 },
  { id: 'flor', label: 'Flor gigante', file: 'flower_giant_prop', level: 1, pos: [-1.05, 0, -0.35], halfW: 0.5, y0: 0, y1: 1.8 },
  { id: 'blocos', label: 'Blocos de pose', file: 'posing_blocks_set', level: 2, pos: [1.0, 0, 0.1], rotY: -0.5, halfW: 0.85, y0: 0, y1: 0.6 },
  { id: 'baloes', label: 'Arco de balões', file: 'balloon_arch_pastel', level: 3, pos: [0, 0, -0.95], halfW: 1.3, y0: 0, y1: 2.3 },
  { id: 'neon', label: 'Letreiro neon', file: 'sign_neon_camera', level: 4, pos: [0.75, 0, -1.22], halfW: 0.5, y0: 1.77, y1: 2.52 },
  { id: 'cadeira', label: 'Cadeira de pose', file: 'chair_heart_pose', level: 5, pos: [1.1, 0, -0.2], rotY: -0.5, halfW: 0.4, y0: 0, y1: 1.3 },
]

// ------------------------------------------------------------------ dificuldade
export interface DiffCfg {
  clients: number
  /** segundos da sessão */
  time: number
  /** tempo segurando cada pose (s) */
  hold: number
  blendTime: number
  film: number
  guides: boolean
  /** mostra o indicador de pico */
  peakCue: boolean
  poseName: boolean
  /** alvo no medidor de luz */
  meterTarget: boolean
  /** tolerância (menor = mais exigente) */
  tight: number
}
export const DIFF: Record<Difficulty, DiffCfg> = {
  facil: { clients: 3, time: 150, hold: 2.3, blendTime: 0.9, film: 5, guides: true, peakCue: true, poseName: true, meterTarget: true, tight: 1.35 },
  normal: { clients: 4, time: 135, hold: 1.8, blendTime: 0.8, film: 5, guides: true, peakCue: false, poseName: true, meterTarget: true, tight: 1 },
  dificil: { clients: 4, time: 120, hold: 1.4, blendTime: 0.7, film: 5, guides: false, peakCue: false, poseName: false, meterTarget: true, tight: 0.85 },
  estrela: { clients: 5, time: 120, hold: 1.1, blendTime: 0.6, film: 5, guides: false, peakCue: false, poseName: false, meterTarget: false, tight: 0.7 },
}

// ------------------------------------------------------------------ nível da profissão
export const LEVEL_XP = [0, 60, 160, 300, 500]
export function levelOfXp(xp: number): number {
  let l = 1
  for (let i = 1; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) l = i + 1
  return l
}
export function unlocksAt(level: number): string[] {
  if (level <= 1) return []
  return [
    ...BACKDROPS.filter((b) => b.level === level).map((b) => `Fundo ${b.label}`),
    ...GELS.filter((g) => g.level === level).map((g) => `Gel ${g.label}`),
    ...PROPS.filter((p) => p.level === level).map((p) => `Adereço: ${p.label}`),
  ]
}
