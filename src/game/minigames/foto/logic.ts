/**
 * Lógica pura do "Ensaio Fotográfico" (sem React/three): câmera, enquadramento, luz, linha do tempo da modelo,
 * pontuação de cada foto e geração dos clientes. Tudo determinístico a partir de sementes.
 */
import { rng } from '../shared/competition'
import type { Difficulty } from '../shared/competition'
import {
  BACKDROPS, BACKDROP_FAMILY_LABEL, DIFF, GELS, MOOD_LABEL, MOOD_POSES, POSES, PROPS, TEMP_K, TEMP_LABEL,
  type DiffCfg, type LightSide, type Mood, type PoseId, type TempBand,
} from './data'

// ------------------------------------------------------------------ câmera
export interface CamState { cx: number; cy: number; zoom: number }
export const CAM_D = 4.6
export const FOV0 = 38
export const ASPECT = 0.8 // largura / altura do quadro (retrato 4:5)
export const ZOOM_MIN = 1
export const ZOOM_MAX = 6
export const PAN_X = 1.6
export const PAN_Y: [number, number] = [0.15, 2.3]
export const DEFAULT_CAM: CamState = { cx: 0, cy: 1.0, zoom: 1.35 }

export const fovOf = (zoom: number) => (2 * Math.atan(Math.tan((FOV0 * Math.PI) / 360) / zoom) * 180) / Math.PI
/** meia-altura do mundo visível na distância da modelo */
export const halfH = (zoom: number) => CAM_D * Math.tan((fovOf(zoom) * Math.PI) / 360)
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** projeta um ponto do plano da modelo (x, y em metros) para o quadro: -1..1 (y para cima) */
export function project(cam: CamState, x: number, y: number): [number, number] {
  const h = halfH(cam.zoom)
  return [(x - cam.cx) / (h * ASPECT), (y - cam.cy) / h]
}

// medidas da boneca (m)
export const HEAD_TOP = 1.72
export const EYE_Y = 1.6
export const CHIN_Y = 1.5
const LOW_REF = { close: 1.2, medio: 0.92, corpo: 0 } as const

export type Framing = 'close' | 'medio' | 'corpo'
export type Placement = 'centro' | 'terco_esq' | 'terco_dir'
export const FRAMING_LABEL: Record<Framing, string> = { close: 'Retrato close', medio: 'Plano médio', corpo: 'Corpo inteiro' }
export const PLACEMENT_X: Record<Placement, number> = { centro: 0, terco_esq: -0.34, terco_dir: 0.34 }

interface FrameTarget { span: number; headroom: number }
/** fração da altura do quadro ocupada de (referência baixa) até o topo da cabeça, e folga acima da cabeça */
export const FRAME_TARGET: Record<Framing, FrameTarget> = {
  close: { span: 0.68, headroom: 0.12 },
  medio: { span: 0.8, headroom: 0.09 },
  corpo: { span: 0.86, headroom: 0.065 },
}

/** câmera ideal para um enquadramento (usada pelas guias do modo Fácil e pelos testes) */
export function idealCam(f: Framing, p: Placement): CamState {
  const t = FRAME_TARGET[f]
  const segment = HEAD_TOP - LOW_REF[f]
  const frameH = segment / t.span
  const zoom = CAM_D * Math.tan((FOV0 * Math.PI) / 360) / (frameH / 2)
  const top = HEAD_TOP + t.headroom * frameH
  const cy = top - frameH / 2
  const cx = -PLACEMENT_X[p] * (frameH / 2) * ASPECT
  return { cx, cy, zoom }
}

const sc = (err: number, tol: number) => Math.exp(-0.693 * (err / tol) ** 2)

export interface CompDetail {
  score: number
  size: number
  vertical: number
  horizontal: number
  cropTop: boolean
  cropFeet: boolean
  tooFar: boolean
  tooClose: boolean
  /** erros assinados para as dicas */
  dx: number
  dy: number
}

const POSE_HALF_W: Partial<Record<PoseId, number>> = { vitoria: 0.42, cintura: 0.34, fofa: 0.3, perfil_esq: 0.18, perfil_dir: 0.18, beijo: 0.3 }

export function scoreComposition(cam: CamState, f: Framing, p: Placement, pose: PoseId, tight: number): CompDetail {
  const t = FRAME_TARGET[f]
  const h = halfH(cam.zoom)
  const frameH = 2 * h
  const topNdc = project(cam, 0, HEAD_TOP)[1]
  const lowNdc = project(cam, 0, LOW_REF[f])[1]
  const span = (topNdc - lowNdc) / 2
  const headroom = (1 - topNdc) / 2
  const [cxN] = project(cam, 0, 0)
  const subjectX = cxN // posição horizontal da modelo no quadro (-1..1)
  const sizeErr = (span - t.span) / t.span
  const size = sc(sizeErr, 0.2 * tight)
  const vertical = sc(headroom - t.headroom, 0.07 * tight)
  const dx = subjectX - PLACEMENT_X[p]
  const horizontal = sc(dx, 0.2 * tight)
  const cropTop = topNdc > 0.985
  const lowCut = f === 'corpo' && project(cam, 0, 0)[1] < -0.99
  const hw = POSE_HALF_W[pose] ?? 0.24
  const sideCut = Math.abs(subjectX) + hw / (h * ASPECT) > 1.02
  let score = 0.38 * size + 0.32 * vertical + 0.3 * horizontal
  if (cropTop) score *= 0.35
  if (lowCut) score *= 0.5
  if (sideCut) score *= 0.75
  void frameH
  return { score, size, vertical, horizontal, cropTop, cropFeet: lowCut, tooFar: sizeErr < -0.2, tooClose: sizeErr > 0.2, dx, dy: headroom - t.headroom }
}

// ------------------------------------------------------------------ luz
export interface LightState { kelvin: number; intensity: number; side: LightSide; backdrop: string; gel: string; prop: string }
export const DEFAULT_LIGHT: LightState = { kelvin: 5600, intensity: 1, side: 'esq', backdrop: 'branco', gel: 'nenhum', prop: 'nenhum' }

export function kelvinToRgb(k: number): [number, number, number] {
  const t = clamp(k, 1000, 40000) / 100
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592)
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492)
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307
  return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)]
}
export function kelvinToHex(k: number): string {
  const [r, g, b] = kelvinToRgb(k).map((v) => Math.round(v))
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

const hexRgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
export const luma = (hex: string) => {
  const [r, g, b] = hexRgb(hex)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

/** cor final da luz principal (temperatura x gel) */
export function keyColor(l: LightState): string {
  const base = kelvinToRgb(l.kelvin)
  const gel = hexRgb(GELS.find((g) => g.id === l.gel)?.color ?? '#ffffff')
  return '#' + base.map((v, i) => Math.round((v * gel[i]) / 255).toString(16).padStart(2, '0')).join('')
}

const GEL_SHIFT: Record<string, number> = { ambar: 0.72, gelo: 1.35, magenta: 1, verde: 1, nenhum: 1 }
const SIDE_GAIN: Record<LightSide, number> = { esq: 1, dir: 1, topo: 1.05, tras: 0.78 }
const GEL_GAIN: Record<string, number> = { ambar: 0.85, gelo: 0.85, magenta: 0.8, verde: 0.85, nenhum: 1 }

/** exposição relativa (1 = ideal) */
export function exposure(l: LightState): number {
  const bd = BACKDROPS.find((b) => b.id === l.backdrop)
  const bounce = 0.92 + 0.16 * luma(bd?.color ?? '#888888')
  return l.intensity * SIDE_GAIN[l.side] * (GEL_GAIN[l.gel] ?? 1) * bounce
}

/** histograma simplificado (n barras, 0..1) para o medidor de luz */
export function histogram(l: LightState, n = 28): number[] {
  const E = exposure(l)
  const m = clamp(0.5 + 0.34 * Math.log2(E), 0.04, 0.96)
  const bd = BACKDROPS.find((b) => b.id === l.backdrop)
  const bl = clamp(m + (luma(bd?.color ?? '#888') - 0.5) * 0.55, 0.03, 0.97)
  const w = l.side === 'tras' ? 0.2 : l.side === 'topo' ? 0.13 : 0.1
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) / n
    let v = Math.exp(-(((x - m) / w) ** 2)) * 0.9 + Math.exp(-(((x - bl) / 0.06) ** 2)) * 0.55
    if (l.side === 'tras') v += Math.exp(-(((x - 0.1) / 0.07) ** 2)) * 0.6
    if (E > 1.6) v += Math.exp(-(((x - 0.97) / 0.04) ** 2)) * (E - 1.6)
    if (E < 0.45) v += Math.exp(-(((x - 0.03) / 0.04) ** 2)) * (0.45 - E) * 2
    out.push(clamp(v, 0.03, 1))
  }
  return out
}

export function effectiveKelvin(l: LightState): number {
  return l.kelvin * (GEL_SHIFT[l.gel] ?? 1)
}

export function tempLabelOf(k: number): string {
  if (k < 4200) return 'Quente'
  if (k < 6400) return 'Neutra'
  return 'Fria'
}

// ------------------------------------------------------------------ linha do tempo da modelo
export interface Slot {
  pose: PoseId
  t0: number
  blendEnd: number
  holdEnd: number
  end: number
  blinkAt: number | null
}
export const BLINK_DUR = 0.24

export function buildScript(seed: number, cfg: DiffCfg, favored: PoseId[], count = 60): Slot[] {
  const r = rng(seed)
  const all: PoseId[] = (Object.keys(POSES) as PoseId[]).filter((p) => p !== 'neutra')
  const slots: Slot[] = []
  let t = 0
  let prev = 'neutra' as PoseId
  for (let i = 0; i < count; i++) {
    let pose: PoseId
    if (i % 3 === 1 && favored.length) pose = favored[Math.floor(r() * favored.length)]
    else pose = all[Math.floor(r() * all.length)]
    if (pose === prev) pose = all[(all.indexOf(pose) + 1) % all.length]
    prev = pose
    const def = POSES[pose]
    let blendEnd: number, holdEnd: number, end: number
    if (def.clip) {
      const d = def.clipDur ?? 4
      blendEnd = t + d * (def.peakWin?.[0] ?? 0.4)
      holdEnd = t + d * (def.peakWin?.[1] ?? 0.6)
      end = t + d + 0.2
    } else {
      blendEnd = t + cfg.blendTime
      holdEnd = blendEnd + cfg.hold * (0.85 + 0.3 * r())
      end = holdEnd
    }
    const hold = holdEnd - blendEnd
    const blinkAt = r() < 0.45 ? blendEnd + hold * (0.25 + 0.5 * r()) : null
    slots.push({ pose, t0: t, blendEnd, holdEnd, end, blinkAt })
    t = end
  }
  return slots
}

export interface PoseSample {
  index: number
  /** pose que a modelo está fazendo / indo fazer */
  pose: PoseId
  prev: PoseId
  phase: 'blend' | 'hold'
  /** progresso da transição 0..1 */
  blendP: number
  /** 0..1: pose firme, olhos abertos */
  peak: number
  blink: boolean
  /** segundos desde o início desta pose (clipes são buscados nesse instante) */
  tIn: number
}

export function poseAt(script: Slot[], t: number): PoseSample {
  let i = 0
  while (i < script.length - 1 && t >= script[i].end) i++
  const s = script[i]
  const prev = i > 0 ? script[i - 1].pose : 'neutra'
  const tt = Math.max(0, t)
  if (tt < s.blendEnd) {
    const blendP = clamp((tt - s.t0) / Math.max(0.01, s.blendEnd - s.t0), 0, 1)
    return { index: i, pose: s.pose, prev, phase: 'blend', blendP, peak: 0, blink: false, tIn: tt - s.t0 }
  }
  const inHold = tt < s.holdEnd
  const ramp = 0.28
  const peak = inHold ? clamp(Math.min((tt - s.blendEnd) / ramp, (s.holdEnd - tt) / ramp, 1), 0, 1) : 0
  const blink = s.blinkAt !== null && tt >= s.blinkAt && tt < s.blinkAt + BLINK_DUR
  return { index: i, pose: s.pose, prev, phase: inHold ? 'hold' : 'blend', blendP: 1, peak: blink ? 0.05 : peak, blink, tIn: tt - s.t0 }
}

// ------------------------------------------------------------------ clientes e pedidos
export interface Brief {
  framing: Framing
  placement: Placement
  temp: TempBand
  side?: LightSide
  backdropFamily?: string
  mood: Mood
}
export interface Client {
  id: number
  name: string
  role: string
  /** cor do avatar (cores reais, discretas) */
  tone: string
  brief: Brief
  text: string
  seed: number
}

const NAMES = ['Helena Prado', 'Camila Duarte', 'Joana Reis', 'Marina Costa', 'Bruna Vidal', 'Alice Moreira', 'Sofia Lins', 'Letícia Gama', 'Tereza Nogueira', 'Luiza Ramos', 'Clara Fontes', 'Paula Brandão']
const ROLES = ['Marca de joias', 'Revista Esquina', 'Loja de roupas', 'Perfil de viagem', 'Agência Vértice', 'Ateliê de bolsas', 'Campanha de verão', 'Livro de moda']
const TONES = ['#3c4a5e', '#6b7647', '#a0603f', '#4d4f55', '#8a6a52', '#2f5a5a']

export const SIDE_TEXT: Record<LightSide, string> = { esq: 'vinda da esquerda', dir: 'vinda da direita', topo: 'vinda de cima', tras: 'em contraluz' }

export function briefText(b: Brief): string {
  const parts = [FRAMING_LABEL[b.framing], TEMP_LABEL[b.temp] + (b.side ? ' ' + SIDE_TEXT[b.side] : ''), MOOD_LABEL[b.mood]]
  if (b.backdropFamily) parts.push(BACKDROP_FAMILY_LABEL[b.backdropFamily])
  return parts.join(', ') + '.'
}

export function makeClients(seed: number, difficulty: Difficulty, level: number): Client[] {
  const r = rng(seed)
  const cfg = DIFF[difficulty]
  const names = [...NAMES].sort(() => r() - 0.5)
  const framings: Framing[] = ['close', 'medio', 'corpo']
  const framOrder = [...framings].sort(() => r() - 0.5)
  const moods: Mood[] = ['poderosa', 'fofa', 'charme', 'alegre', 'perfil_esq', 'perfil_dir', 'beijinho']
  const families = [...new Set(BACKDROPS.filter((b) => b.level <= level).map((b) => b.family))]
  const out: Client[] = []
  for (let i = 0; i < cfg.clients; i++) {
    const framing = framOrder[i % 3]
    const mood = moods[Math.floor(r() * moods.length)]
    const temp: TempBand = (['quente', 'neutra', 'fria'] as TempBand[])[Math.floor(r() * 3)]
    const placement: Placement = mood === 'perfil_esq' ? 'terco_dir' : mood === 'perfil_dir' ? 'terco_esq' : framing === 'corpo' && r() < 0.35 ? (r() < 0.5 ? 'terco_esq' : 'terco_dir') : 'centro'
    const brief: Brief = { framing, placement, temp, mood }
    if (difficulty !== 'facil' && (difficulty !== 'normal' || r() < 0.6)) brief.side = (['esq', 'dir', 'topo', 'tras'] as LightSide[])[Math.floor(r() * 4)]
    if ((difficulty === 'dificil' || difficulty === 'estrela') && r() < 0.65) brief.backdropFamily = families[Math.floor(r() * families.length)]
    out.push({ id: i, name: names[i % names.length], role: ROLES[Math.floor(r() * ROLES.length)], tone: TONES[Math.floor(r() * TONES.length)], brief, text: briefText(brief), seed: Math.floor(r() * 1e9) })
  }
  return out
}

// ------------------------------------------------------------------ pontuação da foto
export interface ShotSnapshot {
  cam: CamState
  light: LightState
  pose: PoseId
  peak: number
  blink: boolean
  /** movimento da câmera durante o obturador (0 = parada) */
  motion: number
}

export interface ShotScore {
  composition: number
  light: number
  pose: number
  sharp: number
  creative: number
  total: number
  hints: string[]
  worst: 'composition' | 'light' | 'pose' | 'sharp'
  comp: CompDetail
  propInFrame: boolean
}

const SIDE_SIM: Record<LightSide, Record<LightSide, number>> = {
  esq: { esq: 1, dir: 0.2, topo: 0.55, tras: 0.15 },
  dir: { esq: 0.2, dir: 1, topo: 0.55, tras: 0.15 },
  topo: { esq: 0.5, dir: 0.5, topo: 1, tras: 0.2 },
  tras: { esq: 0.15, dir: 0.15, topo: 0.2, tras: 1 },
}
const FAMILY_SIM: Record<string, Record<string, number>> = {
  claro: { cinza: 0.55, quente: 0.4 },
  cinza: { claro: 0.55, azul: 0.3, escuro: 0.4 },
  azul: { escuro: 0.45, cinza: 0.3 },
  escuro: { azul: 0.45, cinza: 0.4 },
  quente: { claro: 0.4, verde: 0.25 },
  verde: { quente: 0.25 },
}

export function propInFrame(cam: CamState, propId: string): boolean {
  const p = PROPS.find((x) => x.id === propId)
  if (!p || p.id === 'nenhum') return false
  const [x0, y0] = project(cam, p.pos[0] - p.halfW, p.y0)
  const [x1, y1] = project(cam, p.pos[0] + p.halfW, p.y1)
  const ox = Math.max(0, Math.min(1, x1) - Math.max(-1, x0))
  const oy = Math.max(0, Math.min(1, y1) - Math.max(-1, y0))
  const frac = (ox * oy) / Math.max(1e-6, (x1 - x0) * (y1 - y0))
  return frac >= 0.45
}

export function scoreShot(s: ShotSnapshot, brief: Brief, tight: number): ShotScore {
  const hints: string[] = []
  // composição
  const comp = scoreComposition(s.cam, brief.framing, brief.placement, s.pose, tight)
  if (comp.cropTop) hints.push('Você cortou a cabeça da modelo!')
  else if (comp.cropFeet) hints.push('Os pés ficaram fora do quadro.')
  else if (comp.tooFar) hints.push('Chegue mais perto: a modelo ficou pequena no quadro.')
  else if (comp.tooClose) hints.push('Afaste um pouco: o enquadramento ficou apertado.')
  else if (comp.dy > 0.05) hints.push('Muito espaço sobre a cabeça.')
  else if (comp.dy < -0.05) hints.push('Pouca folga sobre a cabeça.')
  else if (Math.abs(comp.dx) > 0.15) hints.push(brief.placement === 'centro' ? 'A modelo saiu do centro do quadro.' : 'Posicione a modelo no terço pedido.')

  // luz
  const E = exposure(s.light)
  const exp = sc(Math.log2(E), 0.6 * tight)
  const kt = sc(Math.log(effectiveKelvin(s.light) / TEMP_K[brief.temp]), 0.24 * tight)
  const side = brief.side ? SIDE_SIM[brief.side][s.light.side] : s.light.side === 'tras' ? 0.55 : 1
  const bdDef = BACKDROPS.find((b) => b.id === s.light.backdrop)
  const bd = brief.backdropFamily ? (bdDef?.family === brief.backdropFamily ? 1 : (FAMILY_SIM[brief.backdropFamily]?.[bdDef?.family ?? ''] ?? 0.1)) : 1
  const wBd = brief.backdropFamily ? 0.15 : 0
  const wSide = brief.side ? 0.25 : 0.1
  const lightScore = (0.3 * kt + wSide * side + 0.25 * exp + wBd * bd + (0.45 - wSide - wBd + 0.0) * 0 + 0) / (0.3 + wSide + 0.25 + wBd)
  if (kt < 0.55) hints.push(effectiveKelvin(s.light) > TEMP_K[brief.temp] ? 'A luz ficou fria demais para o pedido.' : 'A luz ficou quente demais para o pedido.')
  if (brief.side && side < 0.6) hints.push('A luz veio do lado errado.')
  if (exp < 0.6) hints.push(E > 1 ? 'Foto estourada: reduza a intensidade.' : 'Foto escura: aumente a intensidade.')
  if (brief.backdropFamily && bd < 0.6) hints.push('A cor do fundo não é a que o cliente pediu.')

  // pose
  const allowed = MOOD_POSES[brief.mood]
  let poseScore = 0
  if (allowed.includes(s.pose)) {
    poseScore = 0.2 + 0.8 * s.peak
    if (s.blink) poseScore *= 0.4
    if (s.blink) hints.push('Ela piscou na hora do clique!')
    else if (s.peak < 0.5) hints.push('Você pegou a modelo no meio do movimento.')
  } else {
    poseScore = 0.04 * s.peak
    hints.push('Essa não era a pose pedida: espere a pose certa.')
  }

  // nitidez
  const sharp = clamp(1 - s.motion / 0.5, 0, 1)
  if (sharp < 0.6) hints.push('Foto tremida: segure a câmera parada ao clicar.')

  // criatividade
  const inFrame = propInFrame(s.cam, s.light.prop)
  let creative = 0
  if (inFrame) creative += 5
  if (s.light.gel !== 'nenhum') creative += 3
  const base = 0.34 * comp.score + 0.28 * lightScore + 0.38 * poseScore
  creative = Math.round(creative * Math.min(1, base / 0.6))

  const total = clamp(Math.round(100 * base * (0.62 + 0.38 * sharp)) + creative, 0, 100)
  const parts = { composition: comp.score, light: lightScore, pose: poseScore, sharp }
  const worst = (Object.keys(parts) as (keyof typeof parts)[]).reduce((a, k) => (parts[k] < parts[a] ? k : a), 'composition' as keyof typeof parts)
  return { composition: comp.score, light: lightScore, pose: poseScore, sharp, creative, total, hints, worst, comp, propInFrame: inFrame }
}

// ------------------------------------------------------------------ resultado da sessão
export const gradeOf = (t: number) => (t >= 90 ? 'Perfeito!' : t >= 75 ? 'Ótimo!' : t >= 55 ? 'Bom' : t >= 35 ? 'Dá para melhorar' : 'Foto perdida')

export function starsFor(avg: number): number {
  return avg >= 80 ? 3 : avg >= 60 ? 2 : 1
}

export function followersFor(avg: number, difficulty: Difficulty, rewardMult: number): number {
  void difficulty
  return Math.round(Math.pow(Math.max(0, avg), 1.4) * 3.2 * rewardMult) + 25
}

const GOOD = ['Perfeito, era exatamente o que eu queria!', 'Que olhar! Vou usar na campanha inteira.', 'Luz, pose e enquadramento afinados. Amei.', 'Você tem olho de fotógrafa de verdade.']
const OK = ['Ficou bom, mas dava para ir além.', 'Gostei. Só ajustaria um detalhe.', 'Está no caminho certo, repete com mais calma.']
const BAD = ['Não era bem isso que eu pedi...', 'Hmm, vamos tentar de novo?', 'Preciso de mais do que isso para publicar.']

export function clientComment(client: Client, best: ShotScore | null, seed: number): string {
  if (!best) return 'Você não fez nenhuma foto! Fiquei esperando.'
  const r = rng(seed + client.id * 7919)
  const pool = best.total >= 80 ? GOOD : best.total >= 55 ? OK : BAD
  const line = pool[Math.floor(r() * pool.length)]
  const hint = best.total < 80 && best.hints.length ? ' ' + best.hints[0] : ''
  return line + hint
}

export function judgeCritique(shots: ShotScore[]): string {
  if (!shots.length) return 'Sem fotos, sem crítica.'
  const sum = { composition: 0, light: 0, pose: 0, sharp: 0 }
  for (const s of shots) {
    sum.composition += s.composition
    sum.light += s.light
    sum.pose += s.pose
    sum.sharp += s.sharp
  }
  const k = (Object.keys(sum) as (keyof typeof sum)[]).reduce((a, b) => (sum[b] < sum[a] ? b : a), 'composition' as keyof typeof sum)
  return {
    composition: 'Crítica da editora: treine o enquadramento. Folga sobre a cabeça e o terço certo mudam tudo.',
    light: 'Crítica da editora: atenção à luz. Combine a temperatura e o lado com o pedido e cuide da exposição.',
    pose: 'Crítica da editora: o tempo do clique. Espere a modelo parar e abrir os olhos.',
    sharp: 'Crítica da editora: a câmera tremeu. Solte a mão do enquadramento antes de clicar.',
  }[k]
}

export function pointsOf(bests: number[]): number {
  return Math.round(bests.reduce((a, b) => a + b, 0) * 10)
}
