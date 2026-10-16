import { useEffect, useMemo, useState } from 'react'
import { useCatalogStore } from '../../../game/character/catalog'
import { catalogByCategory, catalogItem } from '../../../game/minigames/desfile/adapters'
import { CAMARIM_SECONDS, useDesfileStore } from '../../../game/minigames/desfile/store'
import { TAG_LABEL, type CatalogItem, type Look, type StyleTag } from '../../../game/minigames/desfile/types'
import { playSfx } from '../../../game/minigames/audio'

type Tab = 'hair' | 'top' | 'bottom' | 'jewelry' | 'accessory' | 'colors' | 'makeup'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'hair', label: 'Cabelo', icon: '💇‍♀️' },
  { id: 'top', label: 'Top', icon: '👚' },
  { id: 'bottom', label: 'Saia/Vestido', icon: '👗' },
  { id: 'jewelry', label: 'Joias', icon: '💎' },
  { id: 'accessory', label: 'Acessórios', icon: '👑' },
  { id: 'colors', label: 'Cores', icon: '🎨' },
  { id: 'makeup', label: 'Maquiagem', icon: '💄' },
]

const SUIT_COLORS = ['#f39ab3', '#ff3f8e', '#fff1f6', '#f6e7c8', '#b9e4ff', '#c8a4ff', '#bfe8d6', '#fff0b0', '#ffd9c2', '#16141a', '#7d1d3f', '#2d4a7a']
const LIPS = ['#da7076', '#c0394f', '#ff8fb8', '#7d1d3f', '#e8a090', '#b05a7a', '#ff5a5a', '#4a1d2a']

function useCountdown(endsAt: number) {
  const [left, setLeft] = useState(CAMARIM_SECONDS)
  useEffect(() => {
    const id = window.setInterval(() => setLeft(Math.max(0, Math.ceil((endsAt - performance.now()) / 1000))), 200)
    return () => window.clearInterval(id)
  }, [endsAt])
  return left
}

function Swatches({ colors, value, onPick, label }: { colors: string[]; value: string; onPick: (c: string) => void; label: string }) {
  return (
    <div className="dz-colorrow" role="group" aria-label={label}>
      {colors.map((c) => (
        <button key={c} className={`dz-dot${c.toLowerCase() === value.toLowerCase() ? ' on' : ''}`} style={{ background: c }} onClick={() => (playSfx('tap'), onPick(c))} aria-label={`Cor ${c}`} />
      ))}
    </div>
  )
}

function ItemBtn({ item, on, onClick, themeTags }: { item: CatalogItem | null; on: boolean; onClick: () => void; themeTags: Partial<Record<StyleTag, number>> }) {
  if (!item)
    return (
      <button className={`dz-item none${on ? ' on' : ''}`} onClick={onClick}>
        <span className="dz-item-ico">∅</span>
        <span className="dz-item-name">Nenhum</span>
      </button>
    )
  const match = item.tags.some((t) => (themeTags[t] ?? 0) >= 0.9)
  return (
    <button className={`dz-item${on ? ' on' : ''}`} onClick={onClick} title={item.tags.map((t) => TAG_LABEL[t]).join(' · ')}>
      <span className="dz-item-ico">{item.icon}</span>
      <span className="dz-item-name">{item.label}</span>
      <span className="dz-item-tags">{item.tags.slice(0, 2).map((t) => TAG_LABEL[t]).join(' · ')}</span>
      {match && <span className="dz-item-star">★ tema</span>}
      {item.rarity >= 3 && <span className="dz-item-rare">raro</span>}
    </button>
  )
}

/** Camarim: abas de categorias + grade de peças + cores. Edita `look` (rascunho), nunca o look salvo. */
export function CamarimUI() {
  const theme = useDesfileStore((s) => s.theme)
  const look = useDesfileStore((s) => s.look)
  const endsAt = useDesfileStore((s) => s.camarimEndsAt)
  const patch = useDesfileStore((s) => s.patchLook)
  const [tab, setTab] = useState<Tab>('hair')
  const [active, setActive] = useState<string | null>(null)
  const left = useCountdown(endsAt)
  const catalogLoaded = useCatalogStore((s) => s.loaded)

  useEffect(() => {
    if (left <= 0) useDesfileStore.getState().finishCamarim()
  }, [left])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => (tab === 'colors' || tab === 'makeup' ? [] : catalogByCategory(tab)), [tab, catalogLoaded])
  const themeTags = theme.tags

  const toggleList = (key: 'jewelry' | 'accessories', it: CatalogItem) => {
    playSfx('tap')
    const list = look[key]
    if (list.some((x) => x.id === it.id)) {
      patch({ [key]: list.filter((x) => x.id !== it.id) } as Partial<Look>)
      if (active === it.id) setActive(null)
      return
    }
    // uma peça por lugar do corpo (brincos, colar, cabeça, luvas...)
    const next = list.filter((x) => catalogItem(x.id)?.slot !== it.slot)
    patch({ [key]: [...next, { id: it.id, color: it.color }] } as Partial<Look>)
    setActive(it.id)
  }

  const recolorList = (key: 'jewelry' | 'accessories', id: string, color: string) => patch({ [key]: look[key].map((x) => (x.id === id ? { ...x, color } : x)) } as Partial<Look>)

  const catItem = (id: string | null) => items.find((i) => i.id === id)

  let body: React.ReactNode = null
  if (tab === 'hair') {
    const cur = catItem(look.hairId)
    body = (
      <>
        <div className="dz-grid">
          {items.map((it) => (
            <ItemBtn key={it.id} item={it} on={look.hairId === it.id} themeTags={themeTags} onClick={() => (playSfx('tap'), patch({ hairId: it.id, hairColor: it.color }))} />
          ))}
        </div>
        <div className="dz-sub">Cor do cabelo</div>
        <Swatches colors={cur?.swatches ?? []} value={look.hairColor} onPick={(c) => patch({ hairColor: c })} label="Cor do cabelo" />
      </>
    )
  } else if (tab === 'top' || tab === 'bottom') {
    const slotKey = tab === 'top' ? 'top' : 'bottom'
    const sel = look[slotKey]
    body = (
      <>
        <div className="dz-grid">
          <ItemBtn item={null} on={!sel} themeTags={themeTags} onClick={() => (playSfx('tap'), patch({ [slotKey]: null } as Partial<Look>))} />
          {items.map((it) => (
            <ItemBtn
              key={it.id}
              item={it}
              on={sel?.id === it.id || look.dress?.id === it.id}
              themeTags={themeTags}
              onClick={() => {
                playSfx('tap')
                if (it.slot === 'dress') patch({ dress: { id: it.id, color: it.color }, top: null, bottom: null })
                else patch({ [slotKey]: { id: it.id, color: it.color }, dress: null } as Partial<Look>)
              }}
            />
          ))}
        </div>
        {sel && (
          <>
            <div className="dz-sub">Cor da peça</div>
            <Swatches colors={catItem(sel.id)?.swatches ?? []} value={sel.color} onPick={(c) => patch({ [slotKey]: { ...sel, color: c } } as Partial<Look>)} label="Cor da peça" />
          </>
        )}
      </>
    )
  } else if (tab === 'jewelry' || tab === 'accessory') {
    const key = tab === 'jewelry' ? 'jewelry' : 'accessories'
    const list = look[key]
    const act = list.find((x) => x.id === active)
    body = (
      <>
        <div className="dz-grid">
          {items.map((it) => (
            <ItemBtn key={it.id} item={it} on={list.some((x) => x.id === it.id)} themeTags={themeTags} onClick={() => toggleList(key, it)} />
          ))}
        </div>
        {act && (
          <>
            <div className="dz-sub">Cor / metal</div>
            <Swatches colors={catItem(act.id)?.swatches ?? []} value={act.color} onPick={(c) => recolorList(key, act.id, c)} label="Cor da joia" />
          </>
        )}
      </>
    )
  } else if (tab === 'colors') {
    body = (
      <>
        <div className="dz-sub">Cor do macacão</div>
        <Swatches colors={SUIT_COLORS} value={look.suitColor} onPick={(c) => patch({ suitColor: c })} label="Cor do macacão" />
        <div className="dz-sub">Acabamento</div>
        <div className="dz-seg">
          {(['latex', 'satin', 'matte'] as const).map((f) => (
            <button key={f} className={look.suitFinish === f ? 'on' : ''} onClick={() => (playSfx('tap'), patch({ suitFinish: f }))}>
              {f === 'latex' ? 'Látex' : f === 'satin' ? 'Cetim' : 'Fosco'}
            </button>
          ))}
        </div>
      </>
    )
  } else {
    body = (
      <>
        <div className="dz-sub">Batom</div>
        <Swatches colors={LIPS} value={look.lipsColor} onPick={(c) => patch({ lipsColor: c })} label="Cor do batom" />
        <div className="dz-sub">Brilho</div>
        <input className="dz-range" type="range" min={0} max={1} step={0.05} value={look.lipsGloss} onChange={(e) => patch({ lipsGloss: Number(e.target.value) })} aria-label="Brilho do batom" />
      </>
    )
  }

  return (
    <>
      <div className="dz-theme-pill" style={{ ['--g1' as string]: theme.gradient[0], ['--g2' as string]: theme.gradient[1] }}>
        <span>{theme.icon}</span> {theme.name}
        <em>{(Object.keys(theme.tags) as StyleTag[]).slice(0, 2).map((t) => TAG_LABEL[t]).join(' · ')}</em>
      </div>
      <div className={`dz-timer${left <= 15 ? ' low' : ''}`} role="timer">
        <span>⏱</span> {left}s
        <i style={{ width: `${(left / CAMARIM_SECONDS) * 100}%` }} />
      </div>
      <aside className="dz-panel">
        <nav className="dz-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => (playSfx('click'), setTab(t.id))}>
              <span>{t.icon}</span>
              <b>{t.label}</b>
            </button>
          ))}
        </nav>
        <div className="dz-panel-body">{body}</div>
        <button
          className="dz-btn primary dz-ready"
          onClick={() => {
            playSfx('done')
            useDesfileStore.getState().finishCamarim()
          }}
        >
          Pronta! ✨
        </button>
      </aside>
    </>
  )
}
