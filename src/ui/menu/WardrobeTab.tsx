import { useState } from 'react'
import { useAppearanceStore } from '../../state/appearanceStore'
import { SLOT_NAMES, itemsForSlot, useCatalogStore, type CatalogItem, type ItemSlot } from '../../game/character/catalog'
import { equip, equippedRef, isEquipped, recolor, unequip } from '../../game/character/outfit'
import { RARITY_COLORS, RARITY_LABELS, STYLE_LABELS, tagsOf } from '../../game/character/itemTags'
import { FINISH_NAMES } from '../../game/character/fabric'
import { getWearable } from '../../game/character/items'
import { Swatches } from './controls'
import { IconBag, IconCheck, IconLock, IconStar, SLOT_ICONS } from './icons'

/** Categorias do inventario: slot(s) reais + categorias bloqueadas ("Em breve"). */
interface Category {
  id: string
  label: string
  slots: ItemSlot[]
  locked?: boolean
  icon: ItemSlot | 'bag' | 'star'
}
const CATEGORIES: Category[] = [
  { id: 'hair', label: 'Cabelo', slots: ['hair'], icon: 'hair' },
  { id: 'top', label: 'Top', slots: ['top'], icon: 'top' },
  { id: 'bottom', label: 'Saia / Calça', slots: ['bottom'], icon: 'bottom' },
  { id: 'dress', label: 'Vestido', slots: ['dress'], icon: 'dress' },
  { id: 'gloves', label: 'Luvas', slots: ['gloves'], icon: 'gloves' },
  { id: 'legwear', label: 'Meias', slots: ['legwear'], icon: 'legwear' },
  { id: 'shoes', label: 'Sapatos', slots: ['shoes'], icon: 'shoes' },
  { id: 'jewelry', label: 'Joias', slots: ['neck', 'ears', 'head', 'wrist', 'finger'], icon: 'neck' },
  { id: 'acc', label: 'Acessórios', slots: [], locked: true, icon: 'star' },
  { id: 'bag', label: 'Bolsa', slots: [], locked: true, icon: 'bag' },
]

function CategoryIcon({ c }: { c: Category }) {
  if (c.icon === 'bag') return <IconBag />
  if (c.icon === 'star') return <IconStar />
  return <>{SLOT_ICONS[c.icon]({})}</>
}

export function WardrobeTab() {
  const [catId, setCatId] = useState('top')
  const [jewelSlot, setJewelSlot] = useState<ItemSlot | 'all'>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const appearance = useAppearanceStore((s) => s.appearance)
  const setAppearance = useAppearanceStore((s) => s.setAppearance)
  const items = useCatalogStore((s) => s.items)

  const cat = CATEGORIES.find((c) => c.id === catId)!
  const slots = cat.id === 'jewelry' && jewelSlot !== 'all' ? [jewelSlot] : cat.slots
  const list = slots.flatMap((sl) => itemsForSlot(sl, items))
  const hasItems = (c: Category) => c.slots.some((sl) => itemsForSlot(sl, items).length > 0)
  const wornIn = (c: Category) => c.slots.some((sl) => equippedRef(appearance, sl))

  const selItem: CatalogItem | null = selected ? (items[selected] ?? null) : null
  const selRef = selItem ? (selItem.kind === 'garment' ? appearance.outfit[selItem.slot as keyof typeof appearance.outfit] : appearance.accessories.find((r) => r.id === selItem.id)) : null
  const selWorn = !!selRef && selRef.id === selItem?.id

  const click = (id: string, slot: ItemSlot) => {
    if (isEquipped(appearance, id)) setAppearance(unequip(appearance, slot))
    else setAppearance(equip(appearance, id))
    setSelected(id)
  }

  return (
    <div className="wd">
      <div className="wd__rail" role="tablist" aria-label="Categorias">
        {CATEGORIES.map((c) => {
          const locked = c.locked || !hasItems(c)
          return (
            <button key={c.id} type="button" className={`slot${locked ? ' slot--locked' : ''}`} aria-pressed={catId === c.id} title={locked ? `${c.label} (em breve)` : c.label} onClick={() => (setCatId(c.id), setSelected(null))}>
              <CategoryIcon c={c} />
              {locked && <IconLock className="slot__lock" />}
              {!locked && wornIn(c) && <span className="slot__dot" />}
            </button>
          )
        })}
      </div>

      <div className="wd__main">
        <div className="panel">
          <h3>{cat.label}</h3>
          {cat.id === 'jewelry' && (
            <div className="pills">
              <button type="button" className="pill" aria-pressed={jewelSlot === 'all'} onClick={() => setJewelSlot('all')}>
                Todas
              </button>
              {cat.slots.map((sl) => (
                <button key={sl} type="button" className="pill" aria-pressed={jewelSlot === sl} onClick={() => setJewelSlot(sl)}>
                  {SLOT_NAMES[sl]}
                </button>
              ))}
            </div>
          )}

          {list.length === 0 ? (
            <div className="soon">Em breve! Novas peças de {cat.label.toLowerCase()} chegam logo.</div>
          ) : (
            <div className="grid">
              {list.map((it) => {
                const tags = tagsOf(it.id)
                const on = isEquipped(appearance, it.id)
                const slot = (it.item?.slot ?? 'hair') as ItemSlot
                const tint = it.item?.mats[0]?.color ?? getWearable(it.id)?.defaultColor ?? '#c9a8d8'
                return (
                  <button key={it.id} type="button" className="card" style={{ ['--rar' as string]: RARITY_COLORS[tags.rarity] }} aria-pressed={selected === it.id} onClick={() => click(it.id, slot)}>
                    <span className="card__icon">{SLOT_ICONS[slot]({ style: { color: tint } })}</span>
                    {it.label}
                    <span className="card__rar">{RARITY_LABELS[tags.rarity]}</span>
                    {on && (
                      <span className="card__eq" title="Equipado">
                        <IconCheck />
                      </span>
                    )}
                  </button>
                )
              })}
              <button type="button" className="card" disabled aria-label="Em breve">
                <span className="card__icon">
                  <IconLock />
                </span>
                Em breve
              </button>
            </div>
          )}
        </div>

        {selItem && selWorn && (
          <div className="panel">
            <h3>{selItem.label}</h3>
            <div className="row-wrap" style={{ marginBottom: 6 }}>
              <span className="chip" style={{ borderColor: RARITY_COLORS[tagsOf(selItem.id).rarity] }}>
                {RARITY_LABELS[tagsOf(selItem.id).rarity]}
              </span>
              {tagsOf(selItem.id).styles.map((s) => (
                <span key={s} className="chip chip--gold">
                  {STYLE_LABELS[s]}
                </span>
              ))}
            </div>
            {selItem.mats.map((m, i) => (
              <div className="mat-row" key={m.id}>
                <div className="field-label">{m.label}</div>
                <Swatches colors={m.swatches} value={selRef?.colors?.[i] ?? m.color} onChange={(color) => setAppearance(recolor(appearance, selItem, i, { color }))} label={m.label} />
                {m.finishes.length > 1 && (
                  <div className="fin-chips">
                    {m.finishes.map((f) => (
                      <button key={f} type="button" className="pill" aria-pressed={(selRef?.finishes?.[i] ?? m.finish) === f} onClick={() => setAppearance(recolor(appearance, selItem, i, { finish: f }))}>
                        {FINISH_NAMES[f] ?? f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button type="button" className="btn btn--danger" onClick={() => setAppearance(unequip(appearance, selItem.slot))}>
              Retirar
            </button>
          </div>
        )}
        <p style={{ margin: '0 0 8px', font: '600 12px var(--corpo)', color: 'var(--tinta-suave)' }}>As peças equipadas aparecem na personagem ao vivo. Use &quot;Salvar&quot; na aba Aparência para guardar o look.</p>
        <SaveLookBar />
      </div>
    </div>
  )
}

function SaveLookBar() {
  const saved = useAppearanceStore((s) => s.saved)
  const appearance = useAppearanceStore((s) => s.appearance)
  const save = useAppearanceStore((s) => s.save)
  const revert = useAppearanceStore((s) => s.revert)
  const dirty = JSON.stringify(appearance) !== JSON.stringify(saved)
  return (
    <div className="actions">
      <button type="button" className="btn btn--primary" disabled={!dirty} onClick={save}>
        Salvar look
      </button>
      <button type="button" className="btn" disabled={!dirty} onClick={revert}>
        Desfazer
      </button>
      {dirty && <span className="unsaved">Alterações não salvas</span>}
    </div>
  )
}
