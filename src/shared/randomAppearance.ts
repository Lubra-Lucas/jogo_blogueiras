/**
 * Gerador "Aleatorio" coerente e deterministico (mesma seed = mesma aparencia). Puro: roda no navegador e em node.
 *
 * Regras (ver tambem `appearanceIssues`, que o teste usa para validar):
 * - formatos (olho/boca/nariz/rosto/cilios/sobrancelha) sorteados com os pesos do catalogo (`faceCatalog.ts`);
 * - todo numero fica dentro da faixa SEGURA do catalogo; `eyeSize` ainda respeita a faixa do formato do olho;
 * - combinacoes proibidas sao rejeitadas (ate 24 tentativas; depois o corpo/rosto e puxado para o neutro);
 * - cores: cabelo natural combina com o tom de pele; sobrancelha fica perto da cor do cabelo (90% dos casos, o resto
 *   fica um tom acima/abaixo); cabelo de fantasia usa sobrancelha escura natural; olhos escuros para peles profundas.
 * Nao mexe em roupas, no id do cabelo nem na maquiagem (custo de textura das NPCs).
 */
import { DEFAULT_APPEARANCE, normalizeAppearance, type Appearance } from './appearance'
import {
  BODY_CONTROLS,
  BROW_STYLES,
  DEFAULT_BODY,
  EYE_SHAPES,
  FACE_SAFE,
  FACE_SHAPES,
  LASH_STYLES,
  MOUTH_SHAPES,
  NOSE_SHAPES,
  browLiftFromHeight,
  catalogEntry,
  eyesBigFromSize,
  morphsFromBody,
  type BodyParams,
  type CatalogEntry,
  type FaceParams,
} from './faceCatalog'
import { hash, mulberry32, type Rng } from '../game/market/rng.ts'

// ---------- paletas (hex iguais as do criador em `ui/menu/appearance/data.ts`) ----------
/** tons de pele do claro (0) ao profundo (12) */
export const SKIN_HEX = ['#f8e4da', '#f1d3c2', '#ecc9a8', '#e2b48f', '#d4a075', '#c89d73', '#b88a5c', '#b6764a', '#a2653f', '#855236', '#6a3f2a', '#4a2c1f', '#341d15']
export const HAIR_NATURAL_HEX = ['#e8dcc8', '#f0d78c', '#d8b46e', '#a8916a', '#c0653a', '#8f3a22', '#8b6a4d', '#5b4030', '#3a2417', '#16110e', '#b9b6b4', '#f1efec']
export const HAIR_FANTASY_HEX = ['#f283ad', '#f7b5cd', '#b98bf0', '#4fa3e8', '#3fc5c0', '#8fe3c0', '#c0172f', '#ff8a3d', '#c9ccd6']
export const EYE_NATURAL_HEX = ['#5a9fd4', '#7f9cb8', '#5f9a6a', '#8f7a45', '#b07a35', '#6b4527', '#3b2517', '#8c949c', '#c4781d']
export const EYE_FANTASY_HEX = ['#8a5bd6', '#ee7fae', '#e2b53a', '#26b9b0', '#b8222d']
/** cores de sobrancelha naturais (mais claro -> mais escuro) */
export const BROW_NATURAL_HEX = ['#a88a62', '#7a5a42', '#5b4332', '#3a2a22', '#17110f']
export const BROW_OTHER_HEX = ['#8a4a2a', '#4d4a4e', '#d76a98']
export const BROW_ALL_HEX = [...BROW_NATURAL_HEX, ...BROW_OTHER_HEX]

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
}

/** Distancia maxima de luminosidade aceita entre cabelo natural e sobrancelha. */
export const BROW_HAIR_MAX_DELTA = 0.4

// ---------- opcoes ----------
export interface RandomOptions {
  /** aparencia de partida (roupas, cabelo, maquiagem ficam como estao). Padrao: look padrao */
  base?: Appearance
  /** 'player' (botao Aleatorio) ou 'npc' (variacao mais contida e cores quase sempre naturais) */
  profile?: 'player' | 'npc'
  /** o que sortear (tudo ligado por padrao) */
  skin?: boolean
  eyes?: boolean
  hair?: boolean
  face?: boolean
  body?: boolean
}

// ---------- utilidades ----------
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function seedToNumber(seed: number | string): number {
  return typeof seed === 'number' ? seed >>> 0 : hash(seed)
}

function weighted(r: Rng, list: CatalogEntry[], ok?: (e: CatalogEntry) => boolean): CatalogEntry {
  const items = ok ? list.filter(ok) : list
  const pool = items.length ? items : list
  const total = pool.reduce((s, e) => s + e.weight, 0)
  let x = r() * total
  for (const e of pool) {
    x -= e.weight
    if (x <= 0) return e
  }
  return pool[pool.length - 1]
}

/** numero em [lo,hi] com tendencia ao centro (media de dois sorteios) */
const centered = (r: Rng, lo: number, hi: number) => lo + ((r() + r()) / 2) * (hi - lo)
const pickOf = <T>(r: Rng, l: readonly T[]): T => l[Math.floor(r() * l.length) % l.length]

// ---------- regras de coerencia ----------
/** Problemas de uma aparencia (lista vazia = ok). Mensagens em ingles curto, so para teste/debug. */
export function appearanceIssues(a: Appearance): string[] {
  const out: string[] = []
  const { face: f, body: b } = a
  const eye = catalogEntry(EYE_SHAPES, f.eyeShape)
  const faceShape = catalogEntry(FACE_SHAPES, f.faceShape)
  if (eye?.sizeRange && (f.eyeSize < eye.sizeRange[0] - 1e-9 || f.eyeSize > eye.sizeRange[1] + 1e-9)) out.push('eyeSize fora da faixa do formato do olho')
  if (f.eyeSize < 0.2 && faceShape?.narrow) out.push('olho muito grande em rosto estreito')
  if (f.eyeSize < 0.2 && (a.morphs.faceThin ?? 0) > 0.6) out.push('olho muito grande com rosto muito fino')
  if (f.eyeSize < 0.15 && f.browThickness < 0.25) out.push('olho enorme com sobrancelha quase invisivel')
  if (b.waist < -0.6 && b.hips > 0.6) out.push('cintura minima com quadril maximo')
  if (b.waist < -0.6 && b.belly > 0.3) out.push('cintura minima com barriga')
  if (b.height < -0.4 && b.legs > 0.5) out.push('baixa com pernas grossas demais')
  if (b.muscle > 0.4 && b.weight < -0.3) out.push('musculo com peso minimo')
  if (b.bust > 0.6 && b.shoulders < -0.5) out.push('busto grande com ombros estreitos')
  if (b.butt > 0.7 && b.hips < -0.2) out.push('bumbum grande com quadril estreito')
  if (b.weight > 0.4 && b.waist < -0.5) out.push('peso alto com cintura minima')
  // cores: sobrancelha perto do cabelo natural
  if (HAIR_NATURAL_HEX.includes(a.hair.color) && Math.abs(luminance(f.browColor) - luminance(a.hair.color)) > BROW_HAIR_MAX_DELTA) out.push('sobrancelha longe da cor do cabelo')
  return out
}

// ---------- sorteios ----------
function rollFace(r: Rng, npc: boolean, hairHex: string): FaceParams {
  const eye = weighted(r, EYE_SHAPES)
  const lo = Math.max(eye.sizeRange![0], FACE_SAFE.eyeSize[0])
  const hi = Math.min(eye.sizeRange![1], FACE_SAFE.eyeSize[1])
  const face: FaceParams = {
    eyeShape: eye.id,
    eyeSize: round(centered(r, lo, hi)),
    eyeTilt: round(centered(r, FACE_SAFE.eyeTilt[0], FACE_SAFE.eyeTilt[1])),
    lashStyle: weighted(r, LASH_STYLES, npc ? (e) => e.weight >= 1 : undefined).id,
    browStyle: weighted(r, BROW_STYLES, npc ? (e) => e.weight >= 1 : undefined).id,
    browColor: browColorFor(r, hairHex),
    browThickness: round(centered(r, FACE_SAFE.browThickness[0], FACE_SAFE.browThickness[1])),
    browHeight: round(centered(r, FACE_SAFE.browHeight[0], FACE_SAFE.browHeight[1])),
    mouthShape: weighted(r, MOUTH_SHAPES).id,
    noseShape: weighted(r, NOSE_SHAPES).id,
    faceShape: weighted(r, FACE_SHAPES).id,
  }
  return face
}

function rollBody(r: Rng, npc: boolean): BodyParams {
  const k = npc ? 0.85 : 1
  const out = { ...DEFAULT_BODY }
  for (const c of BODY_CONTROLS) out[c.id] = round(clamp(centered(r, c.safe[0] * k, c.safe[1] * k), c.safe[0], c.safe[1]))
  return out
}

const round = (v: number) => Math.round(v * 1000) / 1000 + 0 // + 0 evita -0

/** cor de sobrancelha perto da do cabelo (natural) ou escura (fantasia) */
function browColorFor(r: Rng, hairHex: string): string {
  const isNatural = HAIR_NATURAL_HEX.includes(hairHex)
  if (!isNatural) {
    if (r() < 0.12) return pickOf(r, BROW_OTHER_HEX)
    return pickOf(r, BROW_NATURAL_HEX.slice(2))
  }
  // sobrancelha costuma ser 1 tom mais escura que o cabelo: alvo = luminosidade do cabelo * 0.85
  const target = luminance(hairHex) * 0.85
  const ranked = BROW_NATURAL_HEX.map((h) => ({ h, d: Math.abs(luminance(h) - target) })).sort((x, y) => x.d - y.d)
  const idx = r() < 0.9 ? 0 : Math.min(ranked.length - 1, 1 + Math.floor(r() * 1.99))
  return ranked[idx].h
}

function rollHair(r: Rng, skinIdx: number, npc: boolean): string {
  const fantasy = r() < (npc ? 0.03 : 0.2)
  if (fantasy) return pickOf(r, HAIR_FANTASY_HEX)
  // pele profunda: cabelo escuro quase sempre; pele clara: todos os tons
  const deep = skinIdx >= 9
  const pool = deep ? HAIR_NATURAL_HEX.slice(6, 10) : skinIdx >= 6 ? HAIR_NATURAL_HEX.slice(2, 10) : HAIR_NATURAL_HEX
  return pickOf(r, r() < (deep ? 0.97 : 0.88) ? pool : HAIR_NATURAL_HEX)
}

function rollSkin(r: Rng): number {
  // mais peso nos tons medios; todos possiveis
  const w = [1, 1.4, 1.6, 1.6, 1.6, 1.4, 1.4, 1.4, 1.3, 1.2, 1, 0.7, 0.5]
  let x = r() * w.reduce((s, v) => s + v, 0)
  for (let i = 0; i < w.length; i++) {
    x -= w[i]
    if (x <= 0) return i
  }
  return 6
}

function nearestSkin(hex: string): number {
  const l = luminance(/^#[0-9a-f]{6}$/i.test(hex) ? hex : SKIN_HEX[0])
  let best = 0
  SKIN_HEX.forEach((h, i) => {
    if (Math.abs(luminance(h) - l) < Math.abs(luminance(SKIN_HEX[best]) - l)) best = i
  })
  return best
}

function rollEyeColor(r: Rng, skinIdx: number, npc: boolean): string {
  if (r() < (npc ? 0.01 : 0.1)) return pickOf(r, EYE_FANTASY_HEX)
  const deep = skinIdx >= 8
  // pele profunda: olhos escuros; pele clara: todos, com azul/verde mais comuns
  if (deep && r() < 0.9) return pickOf(r, EYE_NATURAL_HEX.slice(4, 7))
  return pickOf(r, skinIdx <= 3 ? [...EYE_NATURAL_HEX, EYE_NATURAL_HEX[0], EYE_NATURAL_HEX[2], EYE_NATURAL_HEX[5]] : EYE_NATURAL_HEX)
}

/**
 * Aparencia aleatoria coerente. Determinista: `randomAppearance(s)` e igual para a mesma seed `s` (numero ou texto).
 * Sempre devolve uma aparencia v5 normalizada; `morphs` recebe os morphs antigos correspondentes (corpo, olho, sobrancelha).
 */
export function randomAppearance(seed: number | string, opts: RandomOptions = {}): Appearance {
  const base = normalizeAppearance(opts.base ?? DEFAULT_APPEARANCE)
  const npc = opts.profile === 'npc'
  const r = mulberry32(seedToNumber(seed))
  // ordem fixa dos sorteios: a mesma seed gera sempre o mesmo resultado, independente das opcoes ligadas
  const rolledSkin = rollSkin(r)
  // sem sortear a pele, cabelo/olhos acompanham o tom de pele real do `base`
  const skinIdx = opts.skin === false ? nearestSkin(base.skin.tone) : rolledSkin
  const hairHex = rollHair(r, skinIdx, npc)
  const eyeHex = rollEyeColor(r, skinIdx, npc)
  const faceSeed = r() * 4294967296
  const bodySeed = r() * 4294967296

  let out: Appearance = base
  if (opts.skin !== false) out = { ...out, skin: { ...out.skin, tone: SKIN_HEX[rolledSkin] } }
  if (opts.eyes !== false) out = { ...out, eyes: { ...out.eyes!, color: eyeHex, colorR: null } }
  if (opts.hair !== false) {
    const mode = hairHex === base.hair.color ? 'solid' : out.hair.mode
    out = { ...out, hair: { ...out.hair, color: hairHex, mode, color2: undefined } }
  }
  const hairNow = out.hair.color

  let face = out.face
  let body = out.body
  for (let attempt = 0; attempt < 24; attempt++) {
    const rf = mulberry32((faceSeed + attempt * 7919) >>> 0)
    const rb = mulberry32((bodySeed + attempt * 104729) >>> 0)
    face = opts.face !== false ? rollFace(rf, npc, hairNow) : opts.hair !== false ? { ...out.face, browColor: browColorFor(rf, hairNow) } : out.face
    body = opts.body !== false ? rollBody(rb, npc) : out.body
    const cand = withFaceBody(out, face, body)
    if (appearanceIssues(cand).length === 0) return cand
  }
  // plano B (raro): puxa corpo e rosto para o neutro ate nao haver problema
  let cand = withFaceBody(out, face, body)
  for (let s = 0.8; s >= 0 && appearanceIssues(cand).length; s -= 0.2) {
    const nb = { ...body }
    for (const c of BODY_CONTROLS) nb[c.id] = round(body[c.id] * s)
    const nf = { ...face, eyeShape: 'eye_1', faceShape: 'face_1', eyeSize: clamp(face.eyeSize, 0.5, 0.9), browThickness: clamp(face.browThickness, 0.3, 0.7) }
    cand = withFaceBody(out, nf, nb)
  }
  return cand
}

/** Monta a aparencia com face/body e sincroniza os morphs antigos (corpo, eyesBig, browLift). */
function withFaceBody(a: Appearance, face: FaceParams, body: BodyParams): Appearance {
  let morphs = morphsFromBody(body, a.morphs)
  morphs = { ...morphs, eyesBig: round(eyesBigFromSize(face.eyeSize)), browLift: round(browLiftFromHeight(face.browHeight)) }
  return { ...a, face, body, morphs }
}

// ---------- NPCs ----------
const npcCache = new Map<string, Appearance>()

/**
 * Aparencia de uma NPC: seed estavel (`npc:<chave>`), gerada UMA vez e guardada em cache (nada de recalculo por frame).
 * Mantem roupas, cabelo (estilo e cor), tom de pele, cor dos olhos e macacao do `base`; sorteia rosto e corpo.
 * Nao cria malhas/materiais: so muda numeros e morphs que a boneca ja tem.
 */
export function npcAppearance(key: string, base: Appearance): Appearance {
  const ck = `${key}|${base.skin.tone}|${base.hair.id}|${base.hair.color}|${base.suit.color}|${Object.values(base.outfit).map((o) => o?.id).join(',')}`
  const hit = npcCache.get(ck)
  if (hit) return hit
  const out = randomAppearance(`npc:${key}`, { base, profile: 'npc', skin: false, hair: false, eyes: false })
  npcCache.set(ck, out)
  return out
}
