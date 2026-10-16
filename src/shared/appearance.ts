/**
 * Aparencia de um personagem: JSON puro (sem tipos do three), versionado (`v: 4`).
 * Salvar, enviar pela rede ou trocar de look e so trocar este objeto.
 * Cores sao strings CSS hex ("#ffb3d1"). Ids de itens apontam para o registro em
 * `src/game/character/items.ts` (id desconhecido e ignorado sem erro; nomes de morph desconhecidos tambem).
 *
 * v4 (personalizacao): `makeup` (camadas de maquiagem), `eyes`, acabamento da pele, base do corpo (`suit.base`),
 * cabelo bicolor/ombre/mechas/brilho, unhas e padroes de roupa (`ItemRef.pattern`). Todos os campos novos sao
 * opcionais ou ganham padrao em `normalizeAppearance`, entao v3 salvo (e looks de NPC/minijogos) continuam validos.
 */

export interface ItemRef {
  id: string
  /** cores do item, na ordem dos slots de material do manifesto (base/trim/accent...; metal/gem/...) */
  colors?: string[]
  /** acabamentos por slot de material (mesma ordem de `colors`) */
  finishes?: string[]
  /** parametros numericos do item */
  params?: Record<string, number>
  /** id do padrao (estampa) escolhido, para pecas que declaram `patterns` no manifesto */
  pattern?: string
}

/** Acabamento do macacao pintado: latex (brilho de espelho), cetim (brilho suave) ou fosco. */
export type SuitFinish = 'latex' | 'satin' | 'matte'
/** Acabamento da pele. */
export type SkinFinish = 'matte' | 'natural' | 'dewy' | 'porcelain'
export type LipFinish = 'matte' | 'satin' | 'gloss' | 'metallic'
export type BlushStyle = 'none' | 'apple' | 'draping' | 'sunkissed'
export type ShadowStyle = 'none' | 'wash' | 'smoky' | 'cut' | 'halo' | 'graphic'
export type LinerStyle = 'none' | 'tight' | 'classic' | 'wing' | 'graphic' | 'color'
export type LashStyle = 'natural' | 'doll' | 'dramatic' | 'spider'
export type BrowStyle = 'painted' | 'soft' | 'straight' | 'thin' | 'bold'
export type MarkSpot = 'cheek' | 'lip' | 'chin' | 'brow' | 'nose'
export type GemStyle = 'none' | 'cheek' | 'liner' | 'temple' | 'tear' | 'brow'
export type GemKind = 'star' | 'heart' | 'pearl' | 'crystal'
export type TattooStyle = 'none' | 'hearts' | 'stars' | 'moon' | 'butterfly'
export type NailStyle = 'none' | 'solid' | 'french' | 'ombre' | 'glitter'
export type HairStyleMode = 'solid' | 'ombre' | 'highlights' | 'twotone'
/**
 * Base do corpo (sempre recatada): 'auto' (padrao) = collant/maio inteiro seamless na cor `suit.color` (NUDE_UNDER = acompanha a pele);
 * onde uma peca cobre (top/vestido, saia/calca) a base vira cor de pele, para a borda da roupa nao mostrar o collant;
 * 'under' = o mesmo collant sempre visivel; 'color' = macacao inteiro (legado/NPC). Nao existe corpo "sem nada".
 */
export type BodyBase = 'auto' | 'under' | 'color'

export interface Makeup {
  /** base: cobertura (esconde o blush pintado), ajuste de tom (-1 mais escuro .. 1 mais claro) */
  foundation: { coverage: number; shift: number }
  contour: number
  highlighter: { amount: number; color: string }
  blush: { style: BlushStyle; color: string; amount: number }
  freckles: number
  marks: MarkSpot[]
  glitter: { amount: number; color: string }
  eyeshadow: { style: ShadowStyle; c1: string; c2: string; shimmer: number; intensity: number }
  eyeliner: { style: LinerStyle; color: string; thickness: number }
  lashes: { style: LashStyle; color: string; length: number }
  brows: { style: BrowStyle; color: string; thickness: number }
  lips: { finish: LipFinish; liner: string | null; ombre: string | null }
  gems: { style: GemStyle; kind: GemKind; color: string }
  tattoo: { style: TattooStyle; color: string }
  nails: { style: NailStyle; color: string; color2: string; finish: 'gloss' | 'matte' | 'chrome' }
}

export interface Appearance {
  /** versao do formato (para migracoes futuras) */
  v: 4
  /** qual malha base (GLB) */
  base: 'doll'
  /** nome do morph target -> 0..1 (corpo e rosto); nomes desconhecidos sao ignorados */
  morphs: Record<string, number>
  /** pele nua (rosto, pescoco, maos, pes): tom, acabamento, sardas/pintas no corpo */
  skin: { tone: string; finish?: SkinFinish; bodyFreckles?: number }
  /** macacao pintado na textura (ver `BodyBase`); 'color' usa `color`+`finish` no corpo todo */
  suit: { color: string; finish: SuitFinish; base?: BodyBase }
  /** batom: cor dos labios (+ brilho 0..1); sem isto usa a cor pintada original */
  lips?: { color: string; gloss: number }
  /** olhos: cor da iris (null = pintada original), segundo olho (heterocromia), anel limbal 0..1 */
  eyes?: { color: string | null; colorR?: string | null; ring: number }
  /** maquiagem (camadas projetadas no rosto) */
  makeup?: Makeup
  /** id do cabelo (null = careca), cor, e opcionais de coloracao */
  hair: { id: string | null; color: string; color2?: string; mode?: HairStyleMode; amount?: number; gloss?: number }
  outfit: { top?: ItemRef; bottom?: ItemRef; dress?: ItemRef; shoes?: ItemRef; gloves?: ItemRef; legwear?: ItemRef }
  /** joias e acessorios rigidos (um item por slot: neck/ears/head/wrist/finger/hat/glasses/bag/belt/scarf/anklet/brooch) */
  accessories: ItemRef[]
}

/** Cor padrao da base: nude que acompanha o tom da pele. */
export const NUDE_UNDER = '#d9bba8'

export const DEFAULT_MAKEUP: Makeup = {
  foundation: { coverage: 0, shift: 0 },
  contour: 0,
  highlighter: { amount: 0, color: '#fff1dc' },
  blush: { style: 'none', color: '#e8808a', amount: 0.5 },
  freckles: 0,
  marks: [],
  glitter: { amount: 0, color: '#ffe9c4' },
  eyeshadow: { style: 'none', c1: '#b9788a', c2: '#e6b8a8', shimmer: 0, intensity: 0.7 },
  eyeliner: { style: 'none', color: '#1c1417', thickness: 0.5 },
  lashes: { style: 'natural', color: '#1a1214', length: 0.5 },
  brows: { style: 'painted', color: '#6d5240', thickness: 0.5 },
  lips: { finish: 'satin', liner: null, ombre: null },
  gems: { style: 'none', kind: 'pearl', color: '#fff6ee' },
  tattoo: { style: 'none', color: '#3b2a2e' },
  nails: { style: 'solid', color: '#e9a3b5', color2: '#ffffff', finish: 'gloss' },
}

/** Look padrao: porcelana, base do corpo na cor da pele, labios rosados, cabelo loiro preso. */
export const DEFAULT_APPEARANCE: Appearance = {
  v: 4,
  base: 'doll',
  morphs: {},
  skin: { tone: '#efcdbd', finish: 'natural' },
  suit: { color: '#16141a', finish: 'satin', base: 'auto' },
  lips: { color: '#da7076', gloss: 0.5 },
  eyes: { color: null, ring: 0.35 },
  makeup: DEFAULT_MAKEUP,
  hair: { id: 'hair.meshyUpdo', color: '#d8b46e' },
  outfit: { top: { id: 'tee' }, bottom: { id: 'aline' } },
  accessories: [],
}

/** Look de teste alternativo (?look=2): pele escura, macacao preto, labios malva, cabelo castanho escuro, morphs marcados. */
export const ALT_APPEARANCE: Appearance = {
  v: 4,
  base: 'doll',
  morphs: { bustBig: 0.5, buttBig: 0.6, hipsWide: 0.5, waistThin: 0.6, lipsFull: 0.7 },
  skin: { tone: '#6b4128', finish: 'dewy' },
  suit: { color: '#16141a', finish: 'latex', base: 'color' },
  lips: { color: '#a8566e', gloss: 0.7 },
  eyes: { color: null, ring: 0.35 },
  makeup: DEFAULT_MAKEUP,
  hair: { id: 'hair.meshyUpdo', color: '#3a2417' },
  outfit: {},
  accessories: [],
}

/** Rotulos (pt) dos acabamentos, para a UI. */
export const FINISH_LABELS: Record<SuitFinish, string> = { latex: 'Látex', satin: 'Cetim', matte: 'Fosco' }

/** Mescla profunda de makeup parcial sobre o padrao (campos ausentes/invalidos ganham o padrao). */
export function normalizeMakeup(m: unknown): Makeup {
  const src = (m && typeof m === 'object' ? m : {}) as Record<string, unknown>
  const out: Record<string, unknown> = { ...DEFAULT_MAKEUP }
  for (const k of Object.keys(DEFAULT_MAKEUP) as Array<keyof Makeup>) {
    const d: unknown = DEFAULT_MAKEUP[k]
    const v = src[k]
    if (Array.isArray(d)) out[k] = Array.isArray(v) ? v.filter((x) => typeof x === 'string') : d
    else if (typeof d === 'object') out[k] = v && typeof v === 'object' ? { ...(d as object), ...(v as object) } : d
    else out[k] = typeof v === typeof d ? v : d
  }
  return out as unknown as Makeup
}

/** Valores antigos ('nude', 'skin') viram 'auto'. */
function legacyBase(b: unknown): BodyBase | undefined {
  if (b === 'nude' || b === 'skin') return 'auto'
  return b === 'auto' || b === 'under' || b === 'color' ? b : undefined
}

/**
 * Normaliza qualquer aparencia (v3 salvo, v4 parcial, look de NPC) para v4 completa.
 * v3 -> v4: ganha `makeup` padrao, `eyes` padrao, acabamento natural e `suit.base = 'color'` (o look salvo nao muda).
 */
export function normalizeAppearance(a: Partial<Omit<Appearance, 'v'>> & { v?: number }): Appearance {
  const fromV3 = a.v !== 4
  return {
    ...DEFAULT_APPEARANCE,
    ...a,
    v: 4,
    skin: { ...DEFAULT_APPEARANCE.skin, ...a.skin },
    suit: { ...DEFAULT_APPEARANCE.suit, ...a.suit, base: legacyBase(a.suit?.base) ?? (fromV3 ? 'color' : 'auto') },
    eyes: { ...DEFAULT_APPEARANCE.eyes!, ...a.eyes },
    makeup: normalizeMakeup(a.makeup),
    hair: { ...DEFAULT_APPEARANCE.hair, ...a.hair },
    morphs: a.morphs ?? {},
    outfit: a.outfit ?? {},
    accessories: Array.isArray(a.accessories) ? a.accessories : [],
  }
}

/** Esta maquiagem tem algo a desenhar? (sem camadas = sem textura extra, barato para NPCs) */
export function makeupIsEmpty(m: Makeup | undefined): boolean {
  if (!m) return true
  return (
    m.foundation.coverage <= 0.01 &&
    m.foundation.shift === 0 &&
    m.contour <= 0.01 &&
    m.highlighter.amount <= 0.01 &&
    m.blush.style === 'none' &&
    m.freckles <= 0.01 &&
    m.marks.length === 0 &&
    m.glitter.amount <= 0.01 &&
    m.eyeshadow.style === 'none' &&
    m.eyeliner.style === 'none' &&
    m.lashes.style === 'natural' &&
    m.brows.style === 'painted' &&
    !m.lips.liner &&
    !m.lips.ombre &&
    m.lips.finish === 'satin' &&
    m.gems.style === 'none' &&
    m.tattoo.style === 'none'
  )
}

// ---------- validacao de dados nao confiaveis (codigo de compartilhamento, rede) ----------
const HEX = /^#[0-9a-f]{6}$/i
const ENUMS: Record<string, readonly string[]> = {
  'blush.style': ['none', 'apple', 'draping', 'sunkissed'],
  'eyeshadow.style': ['none', 'wash', 'smoky', 'cut', 'halo', 'graphic'],
  'eyeliner.style': ['none', 'tight', 'classic', 'wing', 'graphic', 'color'],
  'lashes.style': ['natural', 'doll', 'dramatic', 'spider'],
  'brows.style': ['painted', 'soft', 'straight', 'thin', 'bold'],
  'lips.finish': ['matte', 'satin', 'gloss', 'metallic'],
  'gems.style': ['none', 'cheek', 'liner', 'temple', 'tear', 'brow'],
  'gems.kind': ['star', 'heart', 'pearl', 'crystal'],
  'tattoo.style': ['none', 'hearts', 'stars', 'moon', 'butterfly'],
  'nails.style': ['none', 'solid', 'french', 'ombre', 'glitter'],
  'nails.finish': ['gloss', 'matte', 'chrome'],
}
const MARKS: readonly string[] = ['cheek', 'lip', 'chin', 'brow', 'nose']
const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d)
const hex = (v: unknown, d: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : d)
const pick = <T extends string>(v: unknown, list: readonly string[], d: T): T => (typeof v === 'string' && list.includes(v) ? (v as T) : d)

/** Maquiagem de origem desconhecida: so valores validos passam (cores hex, enumeracoes, numeros 0..1). */
export function sanitizeMakeup(raw: unknown): Makeup {
  const m = normalizeMakeup(raw) as unknown as Record<string, Record<string, unknown>>
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(DEFAULT_MAKEUP) as Array<keyof Makeup>) {
    const d = DEFAULT_MAKEUP[k] as unknown
    const v = m[k] as unknown
    if (Array.isArray(d)) {
      out[k] = (Array.isArray(v) ? v : []).filter((x) => typeof x === 'string' && MARKS.includes(x)).slice(0, 5)
      continue
    }
    if (typeof d === 'number') {
      out[k] = num(v, 0, 1, d)
      continue
    }
    const o: Record<string, unknown> = {}
    for (const f of Object.keys(d as object)) {
      const dv = (d as Record<string, unknown>)[f]
      const path = `${k}.${f}`
      const val = (v as Record<string, unknown>)[f]
      if (ENUMS[path]) o[f] = pick(val, ENUMS[path], dv as string)
      else if (typeof dv === 'number') o[f] = num(val, f === 'shift' ? -1 : 0, 1, dv)
      else if (typeof dv === 'string' || dv === null) o[f] = val === null ? null : hex(val, (dv as string) ?? '#000000')
      else o[f] = dv
    }
    out[k] = o
  }
  const lp = out.lips as { liner: string | null; ombre: string | null }
  if (!(m.lips as { liner?: unknown }).liner) lp.liner = null
  if (!(m.lips as { ombre?: unknown }).ombre) lp.ombre = null
  return out as unknown as Makeup
}

/** Aparencia de origem desconhecida -> aparencia v4 valida (itens por id nao sao verificados aqui). */
export function sanitizeAppearance(raw: unknown): Appearance | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.hair !== 'object' || !r.hair) return null
  const n = normalizeAppearance(r as Partial<Appearance>)
  const morphs: Record<string, number> = {}
  for (const [k, v] of Object.entries(n.morphs)) if (/^[a-zA-Z]{2,24}$/.test(k)) morphs[k] = num(v, 0, 1, 0)
  const ref = (x: unknown): ItemRef | null => {
    if (!x || typeof x !== 'object') return null
    const o = x as Record<string, unknown>
    if (typeof o.id !== 'string' || !/^[a-zA-Z0-9_.-]{1,48}$/.test(o.id)) return null
    const out: ItemRef = { id: o.id }
    if (Array.isArray(o.colors)) out.colors = o.colors.slice(0, 6).map((c) => hex(c, '#808080'))
    if (Array.isArray(o.finishes)) out.finishes = o.finishes.slice(0, 6).map((f) => (typeof f === 'string' ? f.slice(0, 16).replace(/[^a-z]/g, '') : 'satin'))
    if (typeof o.pattern === 'string') out.pattern = o.pattern.slice(0, 24).replace(/[^a-z]/g, '')
    return out
  }
  const outfit: Appearance['outfit'] = {}
  for (const k of ['top', 'bottom', 'dress', 'shoes', 'gloves', 'legwear'] as const) {
    const x = ref((n.outfit as Record<string, unknown>)[k])
    if (x) outfit[k] = x
  }
  const hairId = n.hair.id
  const e = n.eyes ?? DEFAULT_APPEARANCE.eyes!
  return {
    v: 4,
    base: 'doll',
    morphs,
    skin: { tone: hex(n.skin.tone, '#efcdbd'), finish: pick(n.skin.finish, ['matte', 'natural', 'dewy', 'porcelain'], 'natural'), bodyFreckles: num(n.skin.bodyFreckles, 0, 1, 0) },
    suit: { color: hex(n.suit.color, '#f39ab3'), finish: pick(n.suit.finish, ['latex', 'satin', 'matte'], 'satin'), base: pick(n.suit.base, ['auto', 'under', 'color'], 'auto') },
    lips: n.lips ? { color: hex(n.lips.color, '#da7076'), gloss: num(n.lips.gloss, 0, 1, 0.5) } : undefined,
    eyes: { color: e.color ? hex(e.color, '#5a9fd4') : null, colorR: e.colorR ? hex(e.colorR, '#5a9fd4') : null, ring: num(e.ring, 0, 1, 0.35) },
    makeup: sanitizeMakeup(n.makeup),
    hair: {
      id: typeof hairId === 'string' && /^[a-zA-Z0-9_.-]{1,48}$/.test(hairId) ? hairId : null,
      color: hex(n.hair.color, '#d8b46e'),
      color2: n.hair.color2 ? hex(n.hair.color2, '#d8b46e') : undefined,
      mode: pick(n.hair.mode, ['solid', 'ombre', 'highlights', 'twotone'], 'solid'),
      amount: num(n.hair.amount, 0, 1, 0.5),
      gloss: num(n.hair.gloss, 0, 1, 0.5),
    },
    outfit,
    accessories: n.accessories.map(ref).filter((x): x is ItemRef => !!x).slice(0, 14),
  }
}
