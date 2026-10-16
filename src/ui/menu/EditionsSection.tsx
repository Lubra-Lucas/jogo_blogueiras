import type { CSSProperties } from 'react'
import { useAppearanceStore } from '../../state/appearanceStore'
import { getCatalogItem, type ItemSlot } from '../../game/character/catalog'
import { equip, unequip } from '../../game/character/outfit'
import type { Appearance, ItemRef } from '../../shared/appearance'
import { editionItemRef, getEdition, serialLabel, useInventory, getVitrine } from '../../game/market/api'
import { market } from '../../game/market/service'
import type { EditionInstance } from '../../game/market/types'
import { RARITY_INK, slotOfEdition } from '../market/Art'
import { SealRetired } from '../market/icons'
import { openMarket } from '../market/marketUi'
import { useUiStore } from '../../state/uiStore'
import { IconCheck, SLOT_ICONS } from './icons'

/** veste a peca da edicao com as cores exclusivas (id do item-base + colorway) */
export function equipEdition(a: Appearance, inst: EditionInstance): Appearance {
  const ref = editionItemRef(inst)
  if (!ref) return a
  const next = equip(a, ref.id)
  if (next.hair.id === ref.id) return ref.colors?.[0] ? { ...next, hair: { ...next.hair, color: ref.colors[0] } } : next
  const patch = (r: ItemRef): ItemRef => (r.id === ref.id ? { ...r, colors: ref.colors ?? r.colors, finishes: ref.finishes ?? r.finishes } : r)
  return { ...next, outfit: Object.fromEntries(Object.entries(next.outfit).map(([k, r]) => [k, r ? patch(r) : r])) as Appearance['outfit'], accessories: next.accessories.map(patch) }
}

export function isEditionWorn(a: Appearance, inst: EditionInstance): boolean {
  const ref = editionItemRef(inst)
  if (!ref) return false
  const refs: Array<ItemRef | undefined> = [a.hair.id ? { id: a.hair.id, colors: [a.hair.color] } : undefined, ...Object.values(a.outfit), ...a.accessories]
  return refs.some((r) => r?.id === ref.id && (!ref.colors?.[0] || r.colors?.[0]?.toLowerCase() === ref.colors[0].toLowerCase()))
}

const useRetired = (editionId: string): boolean => {
  useInventory((s) => s.instances) // so reavalia quando a bolsa muda
  return !!market().view(editionId)?.retired
}

/** Selo numerado "#037/500" */
export function SerialBadge({ inst }: { inst: EditionInstance }) {
  return (
    <span className="ed-serial" style={{ font: '800 10px var(--corpo)', letterSpacing: '0.04em', padding: '1px 6px', borderRadius: 999, background: '#2a2236', color: '#f5e2a1' }}>
      {serialLabel(inst)}
    </span>
  )
}

function EditionCard({ inst, worn, onClick }: { inst: EditionInstance; worn?: boolean; onClick?: () => void }) {
  const d = getEdition(inst.editionId)
  const retired = useRetired(inst.editionId)
  if (!d) return null
  const Icon = SLOT_ICONS[slotOfEdition(d) as ItemSlot]
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className="card"
      style={{ ['--rar' as string]: RARITY_INK[d.rarity], position: 'relative' } as CSSProperties}
      aria-pressed={onClick ? !!worn : undefined}
      onClick={onClick}
      title={onClick ? (worn ? 'Tirar' : 'Vestir') : d.name}
    >
      <span className="card__icon">{Icon({ style: { color: d.colorway?.colors[0] ?? d.tint } })}</span>
      {d.name}
      <SerialBadge inst={inst} />
      {retired && <SealRetired size={22} style={{ position: 'absolute', left: 4, top: 4 }} />}
      {worn && <span className="card__eq" title="Equipado"><IconCheck /></span>}
    </Tag>
  )
}

/** Guarda-roupa: edicoes limitadas que a jogadora possui. */
export function EditionsSection() {
  const instances = useInventory((s) => s.instances)
  const appearance = useAppearanceStore((s) => s.appearance)
  const setAppearance = useAppearanceStore((s) => s.setAppearance)
  const list = Object.values(instances).sort((a, b) => b.acquiredAt - a.acquiredAt)
  return (
    <div className="panel">
      <h3>Edições</h3>
      {list.length === 0 ? (
        <div className="soon">
          Você ainda não tem edições limitadas.{' '}
          <button
            type="button"
            className="btn"
            onClick={() => {
              useUiStore.getState().closeMenu()
              openMarket()
            }}
          >
            Abrir o Mercado
          </button>
        </div>
      ) : (
        <div className="grid">
          {list.map((inst) => {
            const worn = isEditionWorn(appearance, inst)
            return (
              <EditionCard
                key={inst.id}
                inst={inst}
                worn={worn}
                onClick={() => {
                  const d = getEdition(inst.editionId)
                  if (worn) {
                    const slot = (d ? getCatalogItem(d.itemId)?.slot ?? (d.kind === 'hair' ? 'hair' : null) : null) as ItemSlot | null
                    if (slot) setAppearance(unequip(appearance, slot))
                  } else setAppearance(equipEdition(appearance, inst))
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Perfil: vitrine (ate 6 copias em destaque) e titulo. */
export function VitrinePanel() {
  useInventory((s) => s.vitrine)
  useInventory((s) => s.instances)
  const title = useInventory((s) => s.equippedTitle)
  const list = getVitrine()
  return (
    <div className="panel">
      <h3>Vitrine</h3>
      {title && (
        <div className="row-wrap" style={{ marginBottom: 8 }}>
          <span className="chip chip--gold">{title}</span>
        </div>
      )}
      {list.length === 0 ? (
        <div className="soon">Sua vitrine está vazia. Destaque edições limitadas pelo Mercado.</div>
      ) : (
        <div className="grid">
          {list.map((inst) => (
            <EditionCard key={inst.id} inst={inst} />
          ))}
        </div>
      )}
    </div>
  )
}
