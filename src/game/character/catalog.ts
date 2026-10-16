import { create } from 'zustand'
import { WEARABLES } from './items'

/**
 * Catalogo de itens vestiveis, guiado por dados: le `assets/garments/garments.json` e
 * `assets/jewelry/jewelry.json` (gerados pelo pipeline Blender). Manifesto ausente = categoria vazia.
 * Cabelos continuam no registro estatico `items.ts`.
 */
export type ItemKind = 'hair' | 'garment' | 'jewelry'
export type ItemSlot = 'hair' | 'top' | 'bottom' | 'dress' | 'gloves' | 'legwear' | 'shoes' | 'neck' | 'ears' | 'head' | 'wrist' | 'finger'

/** Um "slot de material" da peca (base/trim/accent/lining; metal/gem/pearl/ribbon). */
export interface MatSlot {
  id: string
  label: string
  /** cor padrao */
  color: string
  /** acabamento padrao e os suportados (garment) */
  finish: string
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

export interface CatalogItem {
  id: string
  kind: 'garment' | 'jewelry'
  slot: ItemSlot
  label: string
  glb: string
  mats: MatSlot[]
  /** joias: onde prender (um por osso; pulseira/anel vem em par) */
  attachments?: Attach[]
}

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
const JEWEL_LABELS: Record<string, string> = { metal: 'Metal', gem: 'Cristal', pearl: 'Pérola', ribbon: 'Fita' }
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
  }>
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
    materials: Record<string, { default: string }>
    defaultMetal?: string
  }>
}

function parseGarments(j: GarmentJson): CatalogItem[] {
  return j.items.map((g) => ({
    id: g.id,
    kind: 'garment' as const,
    slot: g.slot,
    label: labelOf(g.id, g.label),
    glb: `${A}garments/${g.file}`,
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

function parseJewelry(j: JewelryJson): CatalogItem[] {
  const metals = j.metals ?? { gold: '#f2c14e' }
  return j.pieces.map((p) => ({
    id: p.id,
    kind: 'jewelry' as const,
    slot: p.slot,
    label: labelOf(p.id, p.label),
    glb: `${A}${p.file}`,
    attachments: p.attachments,
    mats: Object.entries(p.materials).map(([id, m]) => ({
      id,
      label: JEWEL_LABELS[id] ?? id,
      color: id === 'metal' ? (metals[p.defaultMetal ?? 'gold'] ?? m.default) : m.default,
      finish: id === 'metal' ? 'metal' : id === 'ribbon' ? 'satin' : id,
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
export const JEWELRY_SLOTS: ItemSlot[] = ['neck', 'ears', 'head', 'wrist', 'finger']

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
