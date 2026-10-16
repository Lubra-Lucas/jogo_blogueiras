import type { Appearance } from '../../shared/appearance'

const A = `${import.meta.env.BASE_URL}assets/characters/`

/** Bases (malhas) disponiveis: `appearance.base` -> arquivos. */
export const BASES: Record<Appearance['base'], { glb: string; meta: string; mask: string; mask2: string; mask3: string; mask4: string }> = {
  doll: { glb: `${A}doll_base.glb`, meta: `${A}doll_base.json`, mask: `${A}doll_mask.png`, mask2: `${A}doll_mask2.png`, mask3: `${A}doll_mask3.png`, mask4: `${A}doll_mask4.png` },
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
export function loadBaseMeta(base: Appearance['base']): Promise<BaseMeta> {
  const url = BASES[base].meta
  let p = metaCache.get(url)
  if (!p) {
    p = fetch(url).then((r) => r.json() as Promise<BaseMeta>)
    metaCache.set(url, p)
  }
  return p
}
