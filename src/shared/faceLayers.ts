
/**
 * Rosto masculino MONTADO POR CAMADAS, em tempo real (nada e assado na textura da pele).
 * Cada grupo (olho, cilios, sobrancelha, boca, blush) e um PNG com alfa gerado por `tools/blender/male/make_face_kit.py`
 * (public/assets/characters/male/face/). O shader (maleMaterial.ts) projeta de frente no espaco de repouso da malha (x, y),
 * entao a camada acompanha morphs e skinning. Olho e sobrancelha sao espelhados: um unico conjunto de parametros vale para os dois lados.
 * Posicoes sao DESLOCAMENTOS (metros) a partir dos pontos de referencia do modelo (`FACE_REF`).
 */

export type LayerEyeStyle = 'natural' | 'almond' | 'doll' | 'dolla' | 'classic'
export type LayerLashStyle = 'none' | 'natural' | 'doll' | 'dolla' | 'classic'
export type LayerBrowStyle = 'thick' | 'arched' | 'thin' | 'soft' | 'classic'
export type LayerMouthStyle = 'natural' | 'thin' | 'doll' | 'dollg' | 'classic'
export type LayerBeardStyle = 'none' | 'stubble' | 'mustache' | 'goatee' | 'full'

export const EYE_STYLES: Array<{ id: LayerEyeStyle; label: string }> = [
  { id: 'natural', label: 'Natural' },
  { id: 'almond', label: 'Amendoado' },
  { id: 'doll', label: 'Boneca (grande)' },
  { id: 'dolla', label: 'Boneca pintada' },
  { id: 'classic', label: 'Classico (pintura original)' },
]
export const LASH_STYLES: Array<{ id: LayerLashStyle; label: string }> = [
  { id: 'none', label: 'Sem cilios' },
  { id: 'natural', label: 'Natural' },
  { id: 'doll', label: 'Boneca (volumosos)' },
  { id: 'dolla', label: 'Boneca pintada (pretos)' },
  { id: 'classic', label: 'Classicos (tufos)' },
]
export const BROW_STYLES: Array<{ id: LayerBrowStyle; label: string }> = [
  { id: 'thick', label: 'Reta grossa' },
  { id: 'arched', label: 'Arqueada' },
  { id: 'thin', label: 'Fina natural' },
  { id: 'soft', label: 'Macia (boneca)' },
  { id: 'classic', label: 'Classica (pintura original)' },
]
export const MOUTH_STYLES: Array<{ id: LayerMouthStyle; label: string }> = [
  { id: 'natural', label: 'Natural masculina' },
  { id: 'thin', label: 'Fina' },
  { id: 'doll', label: 'Boneca glossy' },
  { id: 'dollg', label: 'Boneca cheia glossy' },
  { id: 'classic', label: 'Tinta sobre os labios esculpidos' },
]

export const BEARD_STYLES: Array<{ id: LayerBeardStyle; label: string }> = [
  { id: 'none', label: 'Sem barba' },
  { id: 'stubble', label: 'Por fazer' },
  { id: 'mustache', label: 'Bigode' },
  { id: 'goatee', label: 'Cavanhaque' },
  { id: 'full', label: 'Barba cheia curta' },
]

export interface FaceLayers {
  eye: {
    style: LayerEyeStyle
    lash: LayerLashStyle
    /** cor da iris, do delineado e dos cilios */
    iris: string
    liner: string
    lashColor: string
    /** 1 = tamanho do estilo */
    scale: number
    /** deslocamento da metade da distancia entre os olhos (m; + afasta) */
    gap: number
    /** deslocamento vertical (m) */
    y: number
    /** inclinacao em graus (+ = canto externo para cima) */
    tilt: number
    /** intensidade do delineado e dos cilios (0..1) */
    linerAmt: number
  }
  brow: { style: LayerBrowStyle; color: string; scale: number; gap: number; y: number; tilt: number; opacity: number }
  mouth: { style: LayerMouthStyle; color: string; gloss: number; scale: number; y: number; opacity: number }
  /** shade: usa o "sombreado da pele" extraido da pintura original (blush, bochechas, testa, rosado dos olhos) em vez do blush simples */
  blush: { amount: number; color: string; scale: number; gap: number; y: number; shade?: boolean }
  /** barba: cor tingivel + densidade (0..1) */
  beard: { style: LayerBeardStyle; color: string; amount: number }
  /** olheira e linhas de expressao leves (0..1) */
  detail: { bags: number; lines: number }
}

/** Pontos de referencia de um modelo (m, espaco de repouso, y para cima). Cada modelo (masculino, boneca) tem os seus. */
export interface FaceRef { eyeX: number; eyeY: number; browY: number; browX: number; mouthY: number; noseY: number; chinY: number; blushX: number; blushY: number }
export const MALE_REF: FaceRef = { eyeX: 0.0485, eyeY: 1.5827, browY: 1.609, browX: 0.0545, mouthY: 1.5019, noseY: 1.5423, chinY: 1.4552, blushX: 0.058, blushY: 1.5527 }
/** Boneca feminina (doll_layers.glb): medidas da pintura original (projecao frontal do atlas). */
/** Camada "classica": projecao frontal inteira (1024 px = 0,22 m) centrada neste ponto; cores medias da pintura original (classic_defaults.json). */
export const CLASSIC_CANVAS = { center: [0, 1.39], size: 0.22 } as const
export const CLASSIC_DEFAULTS = { iris: '#799aad', brow: '#a68672', lips: '#e68288' } as const
export const DOLL_REF: FaceRef = { eyeX: 0.0585, eyeY: 1.390, browY: 1.434, browX: 0.0560, mouthY: 1.318, noseY: 1.352, chinY: 1.272, blushX: 0.0702, blushY: 1.352 }
export const FACE_REF = MALE_REF
export const CLASSIC_FACE_ID = "classic"

/** Camadas de rosto inteiro (coordenadas absolutas do espaco de repouso): tamanho e centro. */
export const BEARD_CANVAS = { size: [0.2, 0.17], center: [0, 1.495] } as const
export const LINES_CANVAS = { size: [0.2, 0.2], center: [0, 1.59] } as const

/** Canvas unico de barba + linhas + olheiras (detail_<barba>.png). */
export const DETAIL_CANVAS = { size: [0.2, 0.28], center: [0, 1.55] } as const

/** Tamanho fisico (m) de cada canvas de camada (igual ao kit.json). */
export const KIT_CANVAS = { eye: [0.1, 0.09], brow: [0.09, 0.034], mouth: [0.09, 0.052], blush: [0.1, 0.075] } as const

export const DEFAULT_FACE_LAYERS: FaceLayers = {
  eye: { style: 'natural', lash: 'natural', iris: '#6b4a32', liner: '#2a201e', lashColor: '#1c1514', scale: 1, gap: 0, y: 0, tilt: 0, linerAmt: 1 },
  brow: { style: 'thick', color: '#4a3326', scale: 1, gap: 0, y: 0, tilt: 0, opacity: 0.92 },
  mouth: { style: 'natural', color: '#b87068', gloss: 0.2, scale: 1, y: 0, opacity: 0.9 },
  blush: { amount: 0, color: '#e0707c', scale: 1, gap: 0, y: 0 },
  beard: { style: 'none', color: '#2c211b', amount: 1 },
  detail: { bags: 0, lines: 0 },
}

export function mergeFace(base: FaceLayers, p: DeepPartial<FaceLayers>): FaceLayers {
  return {
    eye: { ...base.eye, ...p.eye },
    brow: { ...base.brow, ...p.brow },
    mouth: { ...base.mouth, ...p.mouth },
    blush: { ...base.blush, ...p.blush },
    beard: { ...base.beard, ...p.beard },
    detail: { ...base.detail, ...p.detail },
  }
}
type DeepPartial<T> = { [K in keyof T]?: Partial<T[K]> }


// ------------------------------------------------------------------ genero e formatos (morphs f_*)
export type Gender = 'female' | 'male'

/** Controle de formato: `plus` (0..1) sozinho, ou par bipolar (-1 = minus, +1 = plus). */
export interface ShapeControl {
  id: string
  label: string
  plus: string
  minus?: string
}
export interface ShapeGroup {
  id: string
  label: string
  controls: ShapeControl[]
}

const SC = (id: string, label: string, plus: string, minus?: string): ShapeControl => ({ id, label, plus, minus })

export const MALE_SHAPE_GROUPS: ShapeGroup[] = [
  { id: 'jaw', label: 'Mandíbula e queixo', controls: [SC('jaw', 'Mandíbula (suave ↔ larga)', 'f_jawWide', 'f_jawSoft'), SC('jawAng', 'Mandíbula marcada', 'f_jawAngular'), SC('chinW', 'Queixo (fino ↔ largo)', 'f_chinWide', 'f_chinPointed'), SC('chinD', 'Queixo (atrás ↔ frente)', 'f_chinForward', 'f_chinBack'), SC('cleft', 'Covinha no queixo', 'f_chinCleft')] },
  { id: 'cheek', label: 'Maçãs e bochechas', controls: [SC('bone', 'Maçãs altas', 'f_cheekboneHigh'), SC('cheek', 'Bochechas (fundas ↔ cheias)', 'f_cheekFull', 'f_cheekHollow')] },
  { id: 'nose', label: 'Nariz', controls: [SC('noseW', 'Largura', 'f_noseWide'), SC('noseL', 'Comprimento', 'f_noseLong'), SC('noseB', 'Ponte', 'f_noseBridge')] },
  { id: 'lips', label: 'Lábios', controls: [SC('lips', 'Lábios (finos ↔ cheios)', 'f_lipsFull', 'f_lipsThin')] },
  { id: 'face', label: 'Testa e rosto', controls: [SC('brow', 'Relevo da sobrancelha', 'f_browRidge'), SC('fore', 'Testa (baixa ↔ alta)', 'f_foreheadHigh', 'f_foreheadLow'), SC('faceL', 'Rosto (curto ↔ longo)', 'f_faceLong', 'f_faceShort'), SC('faceW', 'Rosto largo', 'f_faceWide')] },
  { id: 'neck', label: 'Pescoço e orelhas', controls: [SC('neck', 'Pescoço grosso', 'f_neckThick'), SC('adam', 'Pomo de adão', 'f_adamsApple'), SC('ears', 'Orelhas (pequenas ↔ grandes)', 'f_earsBig', 'f_earsSmall')] },
]
export const FEMALE_SHAPE_GROUPS: ShapeGroup[] = [
  { id: 'jaw', label: 'Mandíbula e queixo', controls: [SC('jaw', 'Mandíbula (suave ↔ larga)', 'f_jawWide', 'f_jawSoft'), SC('chinW', 'Queixo (fino ↔ largo)', 'f_chinWide', 'f_chinPointed')] },
  { id: 'cheek', label: 'Maçãs e bochechas', controls: [SC('cheek', 'Bochechas (fundas ↔ cheias)', 'f_cheekFull', 'f_cheekHollow')] },
  { id: 'nose', label: 'Nariz', controls: [SC('nose', 'Nariz (fino ↔ largo)', 'f_noseWide', 'f_noseNarrow')] },
  { id: 'lips', label: 'Lábios', controls: [SC('lips', 'Lábios (finos ↔ cheios)', 'f_lipsFull', 'f_lipsThin')] },
  { id: 'face', label: 'Rosto', controls: [SC('faceL', 'Rosto (curto ↔ longo)', 'f_faceLong', 'f_faceShort')] },
]
export const shapeGroups = (g: Gender): ShapeGroup[] => (g === 'male' ? MALE_SHAPE_GROUPS : FEMALE_SHAPE_GROUPS)
export const shapeNames = (g: Gender): string[] => {
  const out: string[] = []
  for (const gr of shapeGroups(g)) for (const c of gr.controls) { out.push(c.plus); if (c.minus) out.push(c.minus) }
  return out
}
/** Morph aplicado sempre ao masculino (rosto masculino base), a menos que o perfil o sobrescreva. */
export const MALE_BASE_SHAPE = 'f_maleBase'

/** Valor do controle (-1..1 para pares, 0..1 para simples) a partir dos pesos. */
export function shapeControlValue(shape: Record<string, number>, c: ShapeControl): number {
  const p = shape[c.plus] ?? 0
  return c.minus ? p - (shape[c.minus] ?? 0) : p
}
/** Grava o valor do controle nos pesos (devolve novo objeto). */
export function setShapeControl(shape: Record<string, number>, c: ShapeControl, v: number): Record<string, number> {
  const o = { ...shape }
  if (c.minus) { o[c.plus] = Math.max(0, v); o[c.minus] = Math.max(0, -v) } else o[c.plus] = Math.max(0, v)
  for (const k of [c.plus, c.minus]) if (k && !o[k]) delete o[k]
  return o
}

// ------------------------------------------------------------------ validacao
const HEXRE = /^#[0-9a-f]{6}$/i
const nm = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d)
const hx = (v: unknown, d: string) => (typeof v === 'string' && HEXRE.test(v) ? v.toLowerCase() : d)
const pk = <T extends string>(v: unknown, list: Array<{ id: string }>, d: T): T => (typeof v === 'string' && list.some((x) => x.id === v) ? (v as T) : d)

export function sanitizeFaceLayers(raw: unknown, fallback: FaceLayers = DEFAULT_FACE_LAYERS): FaceLayers {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, Record<string, unknown> | undefined>
  const e = r.eye ?? {}, b = r.brow ?? {}, m = r.mouth ?? {}, bl = r.blush ?? {}, bd = r.beard ?? {}, dt = r.detail ?? {}
  const f = fallback
  return {
    eye: {
      style: pk(e.style, EYE_STYLES, f.eye.style), lash: pk(e.lash, LASH_STYLES, f.eye.lash),
      iris: hx(e.iris, f.eye.iris), liner: hx(e.liner, f.eye.liner), lashColor: hx(e.lashColor, f.eye.lashColor),
      scale: nm(e.scale, 0.5, 2.4, f.eye.scale), gap: nm(e.gap, -0.01, 0.012, f.eye.gap), y: nm(e.y, -0.006, 0.006, f.eye.y),
      tilt: nm(e.tilt, -12, 12, f.eye.tilt), linerAmt: nm(e.linerAmt, 0, 1, f.eye.linerAmt),
    },
    brow: { style: pk(b.style, BROW_STYLES, f.brow.style), color: hx(b.color, f.brow.color), scale: nm(b.scale, 0.6, 1.6, f.brow.scale), gap: nm(b.gap, -0.01, 0.012, f.brow.gap), y: nm(b.y, -0.008, 0.008, f.brow.y), tilt: nm(b.tilt, -12, 12, f.brow.tilt), opacity: nm(b.opacity, 0, 1, f.brow.opacity) },
    mouth: { style: pk(m.style, MOUTH_STYLES, f.mouth.style), color: hx(m.color, f.mouth.color), gloss: nm(m.gloss, 0, 1, f.mouth.gloss), scale: nm(m.scale, 0.7, 1.5, f.mouth.scale), y: nm(m.y, -0.006, 0.006, f.mouth.y), opacity: nm(m.opacity, 0, 1, f.mouth.opacity) },
    blush: { amount: nm(bl.amount, 0, 1, f.blush.amount), color: hx(bl.color, f.blush.color), scale: nm(bl.scale, 0.6, 2.4, f.blush.scale), gap: nm(bl.gap, -0.02, 0.02, f.blush.gap), y: nm(bl.y, -0.02, 0.02, f.blush.y), ...(bl.shade === true ? { shade: true } : {}) },
    beard: { style: pk(bd.style, BEARD_STYLES, f.beard.style), color: hx(bd.color, f.beard.color), amount: nm(bd.amount, 0, 1, f.beard.amount) },
    detail: { bags: nm(dt.bags, 0, 1, f.detail.bags), lines: nm(dt.lines, 0, 1, f.detail.lines) },
  }
}

export function sanitizeShape(raw: unknown, g: Gender): Record<string, number> {
  const out: Record<string, number> = {}
  if (!raw || typeof raw !== 'object') return out
  const allowed = new Set(shapeNames(g))
  if (g === 'male') allowed.add(MALE_BASE_SHAPE)
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (allowed.has(k)) { const x = nm(v, 0, 1, 0); if (x > 0.001) out[k] = x }
  return out
}
