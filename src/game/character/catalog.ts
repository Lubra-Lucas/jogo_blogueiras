import { create } from 'zustand'
import { WEARABLES } from './items'

/**
 * Catalogo de itens vestiveis, guiado por dados: le `assets/garments/garments.json` e
 * `assets/jewelry/jewelry.json` (gerados pelo pipeline Blender). Manifesto ausente = categoria vazia.
 * Cabelos continuam no registro estatico `items.ts`.
 */
export type ItemKind = 'hair' | 'garment' | 'jewelry'
export type ItemSlot =
  | 'hair'
  | 'top'
  | 'bottom'
  | 'dress'
  | 'gloves'
  | 'legwear'
  | 'shoes'
  | 'neck'
  | 'ears'
  | 'head'
  | 'wrist'
  | 'finger'
  | 'hat'
  | 'glasses'
  | 'bag'
  | 'belt'
  | 'scarf'
  | 'anklet'
  | 'brooch'

/** Um "slot de material" da peca (base/trim/accent/lining; metal/gem/pearl/ribbon). */
export interface MatSlot {
  id: string
  label: string
  /** cor padrao */
  color: string
  /** acabamento padrao e os suportados (garment) */
  finish: string
  /** joias/acessorios: parametros de material por slot do manifesto (rough, coat, sheen, ...) */
  fin?: Record<string, number | string>
  finishes: string[]
  /** amostras de cor sugeridas */
  swatches: string[]
  /** metal: o slot escolhe entre metais nomeados */
  metal?: boolean
}

export interface Attach {
  bone: string
  position: [number, number, number]
  quaternion: [number, number, number, number]
  scale: [number, number, number]
}

/** Estampa de uma peca (`patterns` no manifesto): id conhecido (gerado por canvas) ou textura propria. */
export interface PatternDef {
  id: string
  label: string
  /** arquivo de textura (relativo a assets/garments/tex/); sem ele usa o gerador procedural pelo id */
  texture?: string
  /** repeticoes da estampa no UV */
  scale?: number
}

/** Elipsoide do cabelo escondido sob um chapeu/penteado (espaco da malha do corpo em repouso). */
export interface HairClip {
  center: [number, number, number]
  radii: [number, number, number]
  minY: number
  /** faixa (m) acima de minY em que a compressao entra suave */
  soft: number
}

export interface CatalogItem {
  id: string
  kind: 'garment' | 'jewelry'
  slot: ItemSlot
  label: string
  glb: string
  mats: MatSlot[]
  /** joias/acessorios: onde prender (um por osso; pulseira/anel vem em par) */
  attachments?: Attach[]
  /** roupas: estampas disponiveis */
  patterns?: PatternDef[]
  /** roupas: o que a peca esconde (`top`, `bottom`, `legs` = meias, ...) */
  hides?: string[]
  /** sapatos: elevacao (m) a aplicar ao personagem */
  lift?: number
  /** chapeus que cobrem: o cabelo acima de minY e comprimido para dentro deste elipsoide */
  hairClip?: HairClip
  /** bolsas: como carrega (hand | body | back) */
  carry?: string
  /** descricao do manifesto (regras de esconder por heuristica) */
  notes?: string
}

import { registerManifestTags } from './itemTags'

const A = `${import.meta.env.BASE_URL}assets/`

/** Rotulos com acento (os manifestos vem sem); id -> nome exibido. */
const LABEL_OVERRIDES: Record<string, string> = {
  pearl_choker: 'Gargantilha de pérolas com coração',
  ribbon_choker: 'Gargantilha de fita com laço',
  pearl_studs: 'Brincos de pérola',
  heart_hoops: 'Argolas com coração',
  hair_bow: 'Laço de cabelo',
  heart_ring: 'Anel de coração',
  chandelier_drops: 'Brincos chandelier de cristal',
  tennis_bracelet: 'Pulseira tênis de cristais',
  bangle_stack: 'Pulseiras bangle empilhadas',
}
const labelOf = (id: string, raw: string) => LABEL_OVERRIDES[id] ?? raw

const GARMENT_SWATCHES = ['#ff6fa5', '#ffb3d1', '#fff1f6', '#c8a4ff', '#b6e3ff', '#9ff0d0', '#ffe9a8', '#e8b84a', '#1d1b22', '#ff3b3b']
const JEWEL_LABELS: Record<string, string> = { metal: 'Metal', gem: 'Cristal', pearl: 'Pérola', ribbon: 'Fita', lens: 'Lente', leather: 'Couro', fabric: 'Tecido', strap: 'Alça', frame: 'Armação' }
const SLOT_LABELS: Record<string, string> = { base: 'Base', trim: 'Detalhe', accent: 'Acento', lining: 'Forro' }

interface GarmentJson {
  items: Array<{
    id: string
    label: string
    slot: ItemSlot
    slots: string[]
    palette: Record<string, string>
    finish: Record<string, string>
    finishesSupported: Record<string, string[]>
    file: string
    hides?: string[]
    lift?: number
    patterns?: Array<string | { id: string; label?: string; texture?: string; file?: string; scale?: number }>
  }>
  /** definicoes globais de estampa (opcional) */
  patterns?: Record<string, { label?: string; texture?: string; file?: string; scale?: number }> | Array<{ id: string; label?: string; texture?: string; file?: string; scale?: number }>
}
interface JewelryJson {
  metals?: Record<string, string>
  slots?: Record<string, { default?: string; suggested?: string[] }>
  hairFit?: { mountDir: Record<string, [number, number, number]>; lift: Record<string, Record<string, number>> }
  pieces: Array<{
    id: string
    label: string
    slot: ItemSlot
    file: string
    attachments: Attach[]
    carry?: string
    notes?: string
    materials: Record<string, { default: string; label?: string; finish?: Record<string, number | string> | string }>
    defaultMetal?: string
    hairClip?: { bind?: { center: [number, number, number]; radii: [number, number, number]; minY: number; soft?: number }; soft?: number; center?: [number, number, number]; radii?: [number, number, number]; minY?: number }
  }>
}

const PATTERN_LABELS: Record<string, string> = {
  stripes: 'Listras',
  dots: 'Poá',
  plaid: 'Xadrez',
  gingham: 'Vichy',
  floral: 'Floral',
  houndstooth: 'Pied-de-poule',
  leopard: 'Onça',
  hearts: 'Corações',
  stars: 'Estrelas',
  checker: 'Tabuleiro',
  none: 'Liso',
}
/** Normaliza nomes de estampa dos manifestos (pt/en) para ids conhecidos. */
export function canonPattern(id: string): string {
  const k = id.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '')
  const map: Record<string, string> = { listras: 'stripes', stripe: 'stripes', poa: 'dots', bolinhas: 'dots', polka: 'dots', polkadot: 'dots', xadrez: 'plaid', tartan: 'plaid', vichy: 'gingham', flores: 'floral', onca: 'leopard', animalprint: 'leopard', coracoes: 'hearts', estrelas: 'stars', tabuleiro: 'checker', pieddepoule: 'houndstooth' }
  return map[k] ?? k
}
function parsePatterns(item: GarmentJson['items'][number], global: GarmentJson['patterns']): PatternDef[] | undefined {
  if (!Array.isArray(item.patterns) || !item.patterns.length) return undefined
  const gl: Record<string, { label?: string; texture?: string; file?: string; scale?: number }> = Array.isArray(global) ? Object.fromEntries(global.map((g) => [g.id, g])) : (global ?? {})
  return item.patterns
    .map((p) => {
      const o = typeof p === 'string' ? { id: p } : p
      const id = canonPattern(o.id)
      const g = gl[o.id] ?? gl[id] ?? {}
      const x = o as { texture?: string; file?: string; label?: string; scale?: number }
      return { id, label: x.label ?? g.label ?? PATTERN_LABELS[id] ?? o.id, texture: x.texture ?? x.file ?? g.texture ?? g.file, scale: x.scale ?? g.scale } as PatternDef
    })
    .filter((p) => !!p.id)
}

function parseGarments(j: GarmentJson): CatalogItem[] {
  return j.items.map((g) => ({
    id: g.id,
    kind: 'garment' as const,
    slot: g.slot,
    label: labelOf(g.id, g.label),
    glb: `${A}garments/${g.file}`,
    patterns: parsePatterns(g, j.patterns),
    hides: Array.isArray(g.hides) && g.hides.length ? g.hides : undefined,
    lift: typeof g.lift === 'number' ? g.lift : undefined,
    mats: g.slots.map((s) => ({
      id: s,
      label: SLOT_LABELS[s] ?? s,
      color: g.palette[s] ?? '#ffffff',
      finish: g.finish[s] ?? 'satin',
      finishes: g.finishesSupported[s] ?? [g.finish[s] ?? 'satin'],
      swatches: GARMENT_SWATCHES,
    })),
  }))
}

function parseHairClip(h: JewelryJson['pieces'][number]['hairClip']): HairClip | undefined {
  const b = h?.bind ?? (h?.center && h.radii && typeof h.minY === 'number' ? { center: h.center, radii: h.radii, minY: h.minY } : null)
  return b ? { center: b.center, radii: b.radii, minY: b.minY, soft: (b as { soft?: number }).soft ?? h?.soft ?? 0.02 } : undefined
}

/** O manifesto usa 'ankle'; o codigo usa 'anklet' (aceita os dois). */
function normSlot(s: string): ItemSlot {
  return (s === 'ankle' ? 'anklet' : s) as ItemSlot
}

function parseJewelry(j: JewelryJson): CatalogItem[] {
  const metals = j.metals ?? { gold: '#f2c14e' }
  return j.pieces.map((p) => ({
    id: p.id,
    kind: 'jewelry' as const,
    slot: normSlot(p.slot),
    carry: p.carry,
    notes: p.notes,
    label: labelOf(p.id, p.label),
    glb: `${A}${p.file}`,
    attachments: p.attachments,
    hairClip: parseHairClip(p.hairClip),
    mats: Object.entries(p.materials).map(([id, m]) => ({
      id,
      label: JEWEL_LABELS[id] ?? m.label ?? id,
      color: id === 'metal' ? (metals[p.defaultMetal ?? 'gold'] ?? m.default) : m.default,
      finish: id === 'metal' ? 'metal' : id === 'ribbon' ? 'satin' : id,
      fin: m.finish && typeof m.finish === 'object' ? m.finish : undefined,
      finishes: [],
      swatches: id === 'metal' ? Object.values(metals) : (j.slots?.[id]?.suggested ?? [m.default]),
      metal: id === 'metal',
    })),
  }))
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

/** Ajuste de pecas de cabeca ao volume do cabelo: lift (m) por (arquivo do cabelo, peca) ao longo de mountDir. */
export const hairFit: { mountDir: Record<string, [number, number, number]>; lift: Record<string, Record<string, number>> } = { mountDir: {}, lift: {} }

interface CatalogState {
  loaded: boolean
  items: Record<string, CatalogItem>
}
export const useCatalogStore = create<CatalogState>()(() => ({ loaded: false, items: {} }))

let pending: Promise<void> | null = null
/** Carrega os manifestos uma vez (para `use()` do React ou `await`). Nunca rejeita. */
export function loadCatalog(): Promise<void> {
  pending ??= Promise.all([fetchJson<GarmentJson>(`${A}garments/garments.json`), fetchJson<JewelryJson>(`${A}jewelry/jewelry.json`)]).then(([g, j]) => {
    const items: Record<string, CatalogItem> = {}
    if (j?.hairFit) Object.assign(hairFit, j.hairFit)
    for (const raw of [...((g as unknown as { items?: unknown[] })?.items ?? []), ...((j as unknown as { pieces?: unknown[] })?.pieces ?? [])]) {
      const r = raw as Record<string, unknown>
      if (typeof r.id === 'string') registerManifestTags(r.id, r)
    }
    for (const it of [...(g ? parseGarments(g) : []), ...(j ? parseJewelry(j) : [])]) items[it.id] = it
    useCatalogStore.setState({ loaded: true, items })
  })
  return pending
}
void loadCatalog()

export function getCatalogItem(id: string | undefined | null): CatalogItem | null {
  return id ? (useCatalogStore.getState().items[id] ?? null) : null
}

export const GARMENT_SLOTS: ItemSlot[] = ['top', 'bottom', 'dress', 'gloves', 'legwear', 'shoes']
/** Joias e acessorios rigidos (presos a ossos). */
export const JEWELRY_SLOTS: ItemSlot[] = ['neck', 'ears', 'head', 'wrist', 'finger', 'anklet', 'brooch', 'hat', 'glasses', 'bag', 'belt', 'scarf']

export const SLOT_NAMES: Record<ItemSlot, string> = {
  hair: 'Cabelo',
  top: 'Top',
  bottom: 'Saia / Calça',
  dress: 'Vestido',
  gloves: 'Luvas',
  legwear: 'Meias',
  shoes: 'Sapatos',
  neck: 'Pescoço',
  ears: 'Orelhas',
  head: 'Cabeça',
  wrist: 'Pulsos',
  finger: 'Dedos',
  hat: 'Chapéus',
  glasses: 'Óculos',
  bag: 'Bolsas',
  belt: 'Cintos',
  scarf: 'Lenços',
  anklet: 'Tornozeleiras',
  brooch: 'Broches',
}

/** Todos os itens de um slot (cabelos vem do registro estatico). */
export function itemsForSlot(slot: ItemSlot, items: Record<string, CatalogItem>): Array<{ id: string; label: string; item?: CatalogItem }> {
  if (slot === 'hair')
    return Object.values(WEARABLES)
      .filter((w) => w.slot === 'hair')
      .map((w) => ({ id: w.id, label: w.label }))
  return Object.values(items)
    .filter((i) => i.slot === slot)
    .map((i) => ({ id: i.id, label: i.label, item: i }))
}

if (import.meta.env.DEV) (window as unknown as { __catalog: typeof useCatalogStore }).__catalog = useCatalogStore
