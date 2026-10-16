import { lazy, Suspense, useState, type CSSProperties } from 'react'
import { getCatalogItem, SLOT_NAMES, useCatalogStore, type ItemSlot } from '../../game/character/catalog'
import { RARITY_LABELS } from '../../game/character/itemTags'
import { SLOT_ICONS } from '../menu/icons'
import type { EditionDef } from '../../game/market/types'
import { SealRetired } from './icons'
import { serialFmt } from './format'

const Jewel3D = lazy(() => import('./Jewel3D'))

export const RARITY_INK: Record<EditionDef['rarity'], string> = { comum: '#8b8579', raro: '#2f6b86', epico: '#6b3f7a', lendario: '#a67c1a' }

export function slotOfEdition(d: EditionDef): ItemSlot {
  if (d.kind === 'hair') return 'hair'
  return getCatalogItem(d.itemId)?.slot ?? (d.kind === 'jewelry' ? 'neck' : 'top')
}

/** Arte 2D do lote: placa de leilao com simbolo da peca, brilho e guilhoche. */
export function EditionArt({ def, retired, className = '' }: { def: EditionDef; retired?: boolean; className?: string }) {
  useCatalogStore((st) => st.loaded) // re-renderiza quando o catalogo carrega
  const Icon = SLOT_ICONS[slotOfEdition(def)]
  const c0 = def.colorway?.colors[0] ?? def.tint
  return (
    <div className={`mk-art ${className}`} style={{ ['--tint' as string]: def.tint, ['--c0' as string]: c0 } as CSSProperties}>
      <span className="mk-art__guil" aria-hidden />
      <span className="mk-art__ic">{Icon({})}</span>
      <span className="mk-art__sheen" aria-hidden />
      {retired && <SealRetired className="mk-art__seal" size={42} />}
    </div>
  )
}

/** Peca grande: 3D (joias) com alternancia para a placa; demais itens usam a placa. */
export function EditionHero({ def, retired }: { def: EditionDef; retired?: boolean }) {
  const item = useCatalogStore((s) => s.items[def.itemId])
  const [flat, setFlat] = useState(false)
  const can3d = def.kind === 'jewelry' && !!item
  return (
    <div className="mk-hero">
      {can3d && !flat ? (
        <div className="mk-hero__3d" style={{ ['--tint' as string]: def.tint } as CSSProperties}>
          <Suspense fallback={<span className="mk-hero__load">Polindo a peça…</span>}>
            <Jewel3D def={def} glb={item.glb} />
          </Suspense>
          {retired && <SealRetired className="mk-art__seal" size={52} />}
        </div>
      ) : (
        <EditionArt def={def} retired={retired} className="mk-art--big" />
      )}
      {can3d && (
        <button type="button" className="mk-link mk-hero__toggle" onClick={() => setFlat((f) => !f)}>
          {flat ? 'Ver em 3D' : 'Ver placa'}
        </button>
      )}
    </div>
  )
}

/** Placa numerada "Nº 037 / 500". */
export function SerialPlaque({ serial, cap, small }: { serial: number; cap: number; small?: boolean }) {
  return (
    <span className={`mk-plaque${small ? ' mk-plaque--s' : ''}`}>
      <small>Nº</small>
      <b>{serialFmt(serial)}</b>
      <i>/ {cap}</i>
    </span>
  )
}

export function RarityTag({ r }: { r: EditionDef['rarity'] }) {
  return (
    <span className="mk-rar" style={{ color: RARITY_INK[r] }}>
      {RARITY_LABELS[r]}
    </span>
  )
}

export const slotName = (d: EditionDef) => SLOT_NAMES[slotOfEdition(d)]

