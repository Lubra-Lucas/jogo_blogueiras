import type { Appearance } from '../../shared/appearance'

const A = `${import.meta.env.BASE_URL}assets/characters/`

/** Bases (malhas) disponiveis: `appearance.base` -> arquivos. */
export const BASES: Record<Appearance['base'], { glb: string; meta: string; mask: string; mask2: string; mask3: string; mask4: string }> = {
  doll: { glb: `${A}doll_base.glb`, meta: `${A}doll_base.json`, mask: `${A}doll_mask.png`, mask2: `${A}doll_mask2.png`, mask3: `${A}doll_mask3.png`, mask4: `${A}doll_mask4.png` },
}

/** Modo antigo (rosto pintado, doll_base.glb) para comparar/fallback: `?oldface=1`. */
export const OLD_FACE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('oldface')

export interface BodyAssets {
  glb: string
  meta: string
  mask: string
  mask2: string
  mask3?: string
  mask4?: string
  /** true = rosto por camadas (doll_layers.glb / male_base.glb) */
  layers: boolean
}
const M = `${A}male/`
/** Arquivos do corpo por genero. Feminino: doll_layers.glb (mesmo corpo/morphs, rosto limpo + camadas); doll_base.glb fica como fallback. */
export function bodyAssets(g: 'female' | 'male'): BodyAssets {
  if (g === 'male') return { glb: `${M}male_base.glb`, meta: `${M}male_base.json`, mask: `${M}male_mask.png`, mask2: `${M}male_mask.png`, layers: true }
  if (OLD_FACE) return { ...BASES.doll, layers: false }
  return { glb: `${A}doll_layers.glb`, meta: `${A}doll_layers.json`, mask: `${A}doll_layers_masks.png`, mask2: `${A}doll_layers_masks.png`, layers: true }
}

export interface MorphMeta {
  name: string
  label: string
  group: string
  min: number
  max: number
}

export interface BaseMeta {
  heightMeters: number
  morphs: MorphMeta[]
}

const metaCache = new Map<string, Promise<BaseMeta>>()

/** Para uso com `use()` do React: suspende ate o JSON de metadados carregar (cache global). */
export function loadBaseMeta(base: Appearance['base'], gender: 'female' | 'male' = 'female'): Promise<BaseMeta> {
  void base
  const url = bodyAssets(gender).meta
  let p = metaCache.get(url)
  if (!p) {
    p = fetch(url).then((r) => r.json() as Promise<BaseMeta>)
    metaCache.set(url, p)
  }
  return p
}
