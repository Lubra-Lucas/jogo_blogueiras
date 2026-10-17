/**
 * Catalogo UNICO das pecas e faixas do rosto/corpo (Appearance v5). Puro: sem three, sem import de jogo.
 *
 * Os ids abaixo sao PROVISORIOS ('eye_1'..): os modelos reais (Blender, Etapa 1) ainda nao existem.
 * Quando existirem, o UNICO ponto de mapeamento e o campo `map` de cada entrada deste arquivo:
 *   - `map.node`   = nome do no/malha da peca no GLB (olhos, cilios, sobrancelhas);
 *   - `map.morphs` = morph targets da base a ligar (nome -> influencia 0..1) para bocas/narizes/rostos.
 * Entradas com `map` vazio ({}) ainda nao tem asset (a interface ja funciona; o personagem ignora).
 * Renomear/remapear ids reais so exige editar este arquivo (+ migracao se o id mudar de nome).
 */

export interface PartMap {
  node?: string
  morphs?: Record<string, number>
}

export interface CatalogEntry {
  id: string
  /** nome mostrado na interface (pt-BR) */
  label: string
  /** mapeamento para o asset/morph real; {} = ainda provisorio */
  map: PartMap
  /** peso no sorteio "Aleatorio" (maior = mais comum) */
  weight: number
  /** olhos: faixa segura de `eyeSize` para este formato (0 = grande/boneca, 1 = natural) */
  sizeRange?: [number, number]
  /** rostos: formato estreito/pequeno (nao combina com olho muito grande) */
  narrow?: boolean
}

const mk = (prefix: string, items: Array<[string, number, Partial<CatalogEntry>?]>): CatalogEntry[] =>
  items.map(([label, weight, extra], i) => ({ id: `${prefix}_${i + 1}`, label, weight, map: {}, ...extra }))

export const EYE_SHAPES: CatalogEntry[] = mk('eye', [
  ['Natural', 3, { sizeRange: [0.45, 1] }],
  ['Amendoado', 3, { sizeRange: [0.4, 0.95] }],
  ['Redondo', 2.5, { sizeRange: [0.3, 0.85] }],
  ['Gatinho', 2, { sizeRange: [0.3, 0.85] }],
  ['Grande', 1.5, { sizeRange: [0.1, 0.6] }],
  ['Boneca', 1, { sizeRange: [0, 0.4] }],
])
export const MOUTH_SHAPES: CatalogEntry[] = mk('mouth', [
  ['Natural', 3],
  ['Cheia', 3],
  ['Delicada', 2.5],
  ['Coração', 2],
  ['Larga', 1.5],
  ['Biquinho', 1],
])
export const NOSE_SHAPES: CatalogEntry[] = mk('nose', [
  ['Delicado', 3],
  ['Reto', 3],
  ['Arrebitado', 2.5],
  ['Redondo', 2],
  ['Largo', 1],
])
export const FACE_SHAPES: CatalogEntry[] = mk('face', [
  ['Oval', 3],
  ['Redondo', 3],
  ['Coração', 2.5],
  ['Fino', 2, { narrow: true }],
  ['Pequeno', 1.2, { narrow: true }],
])
export const LASH_STYLES: CatalogEntry[] = mk('lash', [
  ['Natural', 3],
  ['Curto', 2.5],
  ['Boneca', 2.5],
  ['Volume', 2],
  ['Dramático', 1.5],
  ['Gatinho', 1],
  ['Aranha', 0.7],
  ['Fantasia', 0.5],
])
export const BROW_STYLES: CatalogEntry[] = mk('brow', [
  ['Natural', 3],
  ['Suave', 3],
  ['Reta', 2.5],
  ['Fina', 2],
  ['Arqueada', 1.5],
  ['Grossa', 1.2],
  ['Alta', 0.8],
  ['Fantasia', 0.5],
])

export type FaceListKey = 'eyeShape' | 'mouthShape' | 'noseShape' | 'faceShape' | 'lashStyle' | 'browStyle'
export const FACE_LISTS: Record<FaceListKey, CatalogEntry[]> = {
  eyeShape: EYE_SHAPES,
  mouthShape: MOUTH_SHAPES,
  noseShape: NOSE_SHAPES,
  faceShape: FACE_SHAPES,
  lashStyle: LASH_STYLES,
  browStyle: BROW_STYLES,
}

export const catalogIds = (list: CatalogEntry[]): string[] => list.map((e) => e.id)
export const catalogEntry = (list: CatalogEntry[], id: string): CatalogEntry | undefined => list.find((e) => e.id === id)

/** Bloco de rosto (v5). */
export interface FaceParams {
  eyeShape: string
  /** 0 = olho grande (boneca) .. 1 = natural */
  eyeSize: number
  /** inclinacao do olho: -1 (cantos para baixo) .. 1 (para cima) */
  eyeTilt: number
  lashStyle: string
  browStyle: string
  browColor: string
  /** 0 fina .. 1 grossa */
  browThickness: number
  /** 0 baixa .. 1 alta (0.5 = neutra) */
  browHeight: number
  mouthShape: string
  noseShape: string
  faceShape: string
}

export const DEFAULT_FACE: FaceParams = {
  eyeShape: 'eye_1',
  eyeSize: 0.5,
  eyeTilt: 0,
  lashStyle: 'lash_1',
  browStyle: 'brow_1',
  browColor: '#6d5240',
  browThickness: 0.5,
  browHeight: 0.5,
  mouthShape: 'mouth_1',
  noseShape: 'nose_1',
  faceShape: 'face_1',
}

/** Faixas duras (validacao) dos numeros do rosto. */
export const FACE_RANGES = {
  eyeSize: [0, 1],
  eyeTilt: [-1, 1],
  browThickness: [0, 1],
  browHeight: [0, 1],
} as const
/** Faixas seguras (sorteio): sem extremos feios. */
export const FACE_SAFE = {
  eyeSize: [0.05, 0.95],
  eyeTilt: [-0.5, 0.5],
  browThickness: [0.2, 0.8],
  browHeight: [0.25, 0.75],
} as const

/** Bloco de corpo (v5): todos bipolares -1..1 (0 = neutro). */
export interface BodyParams {
  /** altura total: -1 (~1,45 m) .. 1 (~1,85 m); os ossos mudam de comprimento (ver game/character/proportions.ts) */
  height: number
  shoulders: number
  waist: number
  hips: number
  legs: number
  arms: number
  belly: number
  muscle: number
  bust: number
  butt: number
  weight: number
  /** proporcoes por osso (v5.1): comprimento do tronco, do pescoco, tamanho da cabeca, das maos e dos pes */
  torso: number
  neck: number
  headSize: number
  hands: number
  feet: number
  /** postura: -1 muito ereta .. 1 corcunda (cifose) */
  posture: number
  /** lordose: -1 quadril reto .. 1 quadril para tras */
  lordosis: number
  /** ombros: -1 erguidos .. 1 caidos */
  shouldersSlope: number
}
export type BodyKey = keyof BodyParams

export interface BodyControl {
  id: BodyKey
  label: string
  /** morph que vale quando o valor e negativo / positivo (undefined = ainda nao existe na base) */
  minus?: string
  plus?: string
  /** faixa segura do sorteio */
  safe: [number, number]
}

/** Controles de corpo. Os morphs ja existentes em `src/game/character/morphConfig.ts` estao ligados; os demais aguardam o Blender. */
export const BODY_CONTROLS: BodyControl[] = [
  { id: 'height', label: 'Altura', safe: [-0.85, 0.85] },
  { id: 'shoulders', label: 'Largura dos ombros', minus: 'shouldersNarrow', safe: [-0.7, 0.7] },
  { id: 'waist', label: 'Cintura', minus: 'waistThin', safe: [-0.7, 0.5] },
  { id: 'hips', label: 'Quadril', plus: 'hipsWide', safe: [-0.4, 0.7] },
  { id: 'legs', label: 'Comprimento das pernas', safe: [-0.7, 0.7] },
  { id: 'arms', label: 'Comprimento dos braços', safe: [-0.6, 0.6] },
  { id: 'belly', label: 'Barriga', safe: [-0.3, 0.5] },
  { id: 'muscle', label: 'Músculos', safe: [0, 0.6] },
  { id: 'bust', label: 'Busto', minus: 'bustSmall', plus: 'bustBig', safe: [-0.7, 0.8] },
  { id: 'butt', label: 'Bumbum', minus: 'buttSmall', plus: 'buttBig', safe: [-0.6, 0.8] },
  { id: 'weight', label: 'Peso', minus: 'weightDown', plus: 'weightUp', safe: [-0.5, 0.6] },
  { id: 'torso', label: 'Comprimento do tronco', safe: [-0.6, 0.6] },
  { id: 'neck', label: 'Comprimento do pescoço', safe: [-0.6, 0.6] },
  { id: 'headSize', label: 'Tamanho da cabeça', safe: [-0.6, 0.6] },
  { id: 'hands', label: 'Tamanho das mãos', safe: [-0.6, 0.6] },
  { id: 'feet', label: 'Tamanho dos pés', safe: [-0.6, 0.6] },
  { id: 'posture', label: 'Postura (ereta a corcunda)', safe: [-0.5, 0.9] },
  { id: 'lordosis', label: 'Curvatura da lombar (quadril para trás)', safe: [-0.4, 0.7] },
  { id: 'shouldersSlope', label: 'Ombros caídos', safe: [-0.5, 0.8] },
]
export const BODY_KEYS: BodyKey[] = BODY_CONTROLS.map((c) => c.id)
export const DEFAULT_BODY: BodyParams = { height: 0, shoulders: 0, waist: 0, hips: 0, legs: 0, arms: 0, belly: 0, muscle: 0, bust: 0, butt: 0, weight: 0, torso: 0, neck: 0, headSize: 0, hands: 0, feet: 0, posture: 0, lordosis: 0, shouldersSlope: 0 }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Corpo derivado dos morphs antigos (migracao v4 -> v5). */
export function bodyFromMorphs(morphs: Record<string, number>): BodyParams {
  const out = { ...DEFAULT_BODY }
  for (const c of BODY_CONTROLS) {
    const p = c.plus ? morphs[c.plus] ?? 0 : 0
    const m = c.minus ? morphs[c.minus] ?? 0 : 0
    const v = (Number.isFinite(p) ? p : 0) - (Number.isFinite(m) ? m : 0)
    out[c.id] = clamp(v, -1, 1)
  }
  return out
}

/** Escreve os morphs antigos correspondentes ao corpo (so os que existem hoje); os outros campos de `morphs` ficam intactos. */
export function morphsFromBody(body: BodyParams, morphs: Record<string, number>): Record<string, number> {
  const out = { ...morphs }
  for (const c of BODY_CONTROLS) {
    const v = body[c.id]
    if (c.plus) out[c.plus] = Math.max(0, v)
    if (c.minus) out[c.minus] = Math.max(0, -v)
  }
  return out
}

/** Tamanho do olho e altura da sobrancelha a partir dos morphs antigos `eyesBig` / `browLift` (e o caminho inverso). */
export const eyeSizeFromMorph = (eyesBig: number) => clamp(0.5 - 0.4 * (eyesBig || 0), 0, 1)
export const eyesBigFromSize = (eyeSize: number) => clamp((0.5 - eyeSize) / 0.4, 0, 1)
export const browHeightFromMorph = (browLift: number) => clamp(0.5 + 0.5 * (browLift || 0), 0, 1)
export const browLiftFromHeight = (h: number) => clamp((h - 0.5) * 2, 0, 1)

/** Estilos antigos da maquiagem -> ids provisorios do catalogo (migracao). */
export const LEGACY_LASH_TO_ID: Record<string, string> = { natural: 'lash_1', doll: 'lash_3', dramatic: 'lash_5', spider: 'lash_7' }
export const LEGACY_BROW_TO_ID: Record<string, string> = { painted: 'brow_1', soft: 'brow_2', straight: 'brow_3', thin: 'brow_4', bold: 'brow_6' }
