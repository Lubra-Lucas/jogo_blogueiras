import { useMemo, useState } from 'react'
import { SLOT_NAMES } from '../../game/character/catalog'
import { RARITY_LABELS, STYLE_LABELS, type Rarity, type StyleTag } from '../../game/character/itemTags'
import { useSellables, useStatuses, type Sellable } from '../../game/economy/sellables'
import type { ItemStatus, ShopId } from '../../game/economy/types'
import { ItemCard, type CardCtx } from './parts'

export interface Group {
  id: string
  label: string
  test: (s: Sellable) => boolean
}

const slotGroup = (slot: string): Group => ({ id: slot, label: SLOT_NAMES[slot as keyof typeof SLOT_NAMES], test: (s) => s.slot === slot })

export const GROUPS: Record<ShopId | 'tudo', Group[]> = {
  boutique: [{ id: 'all', label: 'Tudo', test: (s) => s.kind === 'garment' }, ...['top', 'bottom', 'dress', 'gloves', 'legwear', 'shoes'].map(slotGroup)],
  joalheria: [{ id: 'all', label: 'Tudo', test: (s) => s.kind === 'jewelry' }, ...['neck', 'ears', 'head', 'wrist', 'finger'].map(slotGroup)],
  salao: [{ id: 'all', label: 'Cabelos', test: (s) => s.kind === 'hair' }],
  concessionaria: [{ id: 'all', label: 'Carros', test: (s) => s.kind === 'car' }],
  imobiliaria: [{ id: 'all', label: 'Casas', test: (s) => s.kind === 'house' }],
  petshop: [{ id: 'all', label: 'Pets', test: () => false }],
  tudo: [
    { id: 'roupas', label: 'Roupas', test: (s) => s.kind === 'garment' },
    { id: 'joias', label: 'Joias', test: (s) => s.kind === 'jewelry' },
    { id: 'cabelos', label: 'Cabelos', test: (s) => s.kind === 'hair' },
    { id: 'carros', label: 'Carros', test: (s) => s.kind === 'car' },
    { id: 'casas', label: 'Casas', test: (s) => s.kind === 'house' },
  ],
}

const priceKey = (st: ItemStatus) => {
  const o = st.offers[0]
  return o ? (o.currency === 'diamantes' ? o.price * 13 : o.price) : 1e9
}

type Sort = 'novos' | 'menor' | 'maior' | 'raridade'
const RARITY_ORDER: Rarity[] = ['comum', 'raro', 'epico', 'lendario']

/** Catalogo com categorias e filtros (estilo, cor, raridade, preço). */
export function Catalog({ shop, ctx, compact }: { shop: ShopId | 'tudo'; ctx: CardCtx; compact?: boolean }) {
  const groups = GROUPS[shop]
  const [gid, setGid] = useState(groups[0].id)
  const [style, setStyle] = useState<StyleTag | ''>('')
  const [color, setColor] = useState('')
  const [rar, setRar] = useState<Rarity | ''>('')
  const [sort, setSort] = useState<Sort>('novos')
  const [hideOwned, setHideOwned] = useState(false)
  const all = useSellables()
  const statuses = useStatuses(all)
  const group = groups.find((g) => g.id === gid) ?? groups[0]

  const inGroup = useMemo(() => all.filter(group.test), [all, group])
  const colors = useMemo(() => [...new Set(inGroup.flatMap((s) => s.colors))].sort(), [inGroup])
  const styles = useMemo(() => [...new Set(inGroup.flatMap((s) => s.styles))], [inGroup])

  const list = useMemo(() => {
    const out = inGroup.filter((s) => (!style || s.styles.includes(style)) && (!color || s.colors.includes(color)) && (!rar || s.rarity === rar) && !(hideOwned && statuses.get(s.id)?.state === 'owned'))
    const key = (s: Sellable) => statuses.get(s.id)!
    out.sort((a, b) => {
      if (sort === 'menor') return priceKey(key(a)) - priceKey(key(b))
      if (sort === 'maior') return priceKey(key(b)) - priceKey(key(a))
      if (sort === 'raridade') return RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity)
      // novidades: novos e promocoes primeiro, possuidos por ultimo
      const score = (s: Sellable) => (key(s).state === 'owned' ? -2 : 0) + (s.novo ? 1 : 0) + (key(s).dealPct ? 1 : 0)
      return score(b) - score(a)
    })
    return out
  }, [inGroup, style, color, rar, sort, hideOwned, statuses])

  return (
    <div className={`sh-cat${compact ? ' sh-cat--compact' : ''}`}>
      {groups.length > 1 && (
        <div className="sh-pills" role="tablist">
          {groups.map((g) => (
            <button key={g.id} type="button" role="tab" className="sh-pill" aria-selected={gid === g.id} onClick={() => setGid(g.id)}>
              {g.label}
            </button>
          ))}
        </div>
      )}
      <div className="sh-filters">
        <label>
          <span>Estilo</span>
          <select value={style} onChange={(e) => setStyle(e.target.value as StyleTag | '')}>
            <option value="">Todos</option>
            {styles.map((s) => (
              <option key={s} value={s}>
                {STYLE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Cor</span>
          <select value={color} onChange={(e) => setColor(e.target.value)}>
            <option value="">Todas</option>
            {colors.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Raridade</span>
          <select value={rar} onChange={(e) => setRar(e.target.value as Rarity | '')}>
            <option value="">Todas</option>
            {RARITY_ORDER.map((r) => (
              <option key={r} value={r}>
                {RARITY_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Ordem</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="novos">Novidades</option>
            <option value="menor">Menor preço</option>
            <option value="maior">Maior preço</option>
            <option value="raridade">Raridade</option>
          </select>
        </label>
        <label className="sh-check">
          <input type="checkbox" checked={hideOwned} onChange={(e) => setHideOwned(e.target.checked)} />
          <span>Ocultar o que já tenho</span>
        </label>
      </div>
      {list.length === 0 ? (
        <div className="sh-empty">Nada por aqui com esses filtros.</div>
      ) : (
        <div className="sh-grid">
          {list.map((s) => (
            <ItemCard key={s.id} s={s} st={statuses.get(s.id)!} ctx={ctx} />
          ))}
        </div>
      )}
    </div>
  )
}
