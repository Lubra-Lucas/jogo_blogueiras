import { useMemo, useState, type ReactNode } from 'react'
import { useCatalogStore } from '../../../game/character/catalog'
import { playSfx } from '../../../game/minigames/audio'
import { catalogByCategory, catalogItem } from '../../../game/minigames/desfile/adapters'
import { TAG_LABEL, type CatalogItem, type Look } from '../../../game/minigames/desfile/types'
import { getProfessionXp } from '../../../game/minigames/rewards'
import { lookCost, isUnlocked, priceOf, tierOf, TIER_XP } from '../../../game/minigames/estilista/logic'
import { colorName, GARMENT_SWATCHES, HAIR_SWATCHES, SUIT_SWATCHES } from '../../../game/minigames/estilista/palette'
import { useEstilistaStore } from '../../../game/minigames/estilista/store'
import { QUESTIONS, type Client, type QuestionId } from '../../../game/minigames/estilista/types'
import { ItemThumb } from '../../shop/thumbs/ItemThumb'
import { IcoAsk, IcoCheck, IcoCoin, IcoGem, IcoHair, IcoLock, IcoPalette, IcoSkirt, IcoStar, IcoTiara, IcoTop, SlotIcon } from './icons'

type Tab = 'pedido' | 'hair' | 'top' | 'bottom' | 'accessory' | 'jewelry' | 'colors'

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'pedido', label: 'Pedido', icon: <IcoAsk size={20} /> },
  { id: 'hair', label: 'Cabelo', icon: <IcoHair size={20} /> },
  { id: 'top', label: 'Top', icon: <IcoTop size={20} /> },
  { id: 'bottom', label: 'Saia', icon: <IcoSkirt size={20} /> },
  { id: 'accessory', label: 'Extras', icon: <IcoTiara size={20} /> },
  { id: 'jewelry', label: 'Joias', icon: <IcoGem size={20} /> },
  { id: 'colors', label: 'Cores', icon: <IcoPalette size={20} /> },
]

const FINISH: { id: Look['suitFinish']; label: string }[] = [
  { id: 'matte', label: 'Fosco' },
  { id: 'satin', label: 'Cetim' },
  { id: 'latex', label: 'Brilho' },
]

const DEFAULT_GARMENT = '#1c1b1f'
const isGarment = (it: CatalogItem) => ['top', 'bottom', 'dress', 'gloves', 'legwear'].includes(it.slot)

/** Resposta da cliente a uma pergunta. */
export function answerText(client: Client, q: QuestionId): string {
  if (q === 'style') {
    const tags = client.hintTags.map((t) => TAG_LABEL[t]).join(' e ')
    const f = client.formality
    const word = f >= 0.8 ? 'bem formal' : f >= 0.55 ? 'arrumado' : f >= 0.3 ? 'descontraído' : 'bem casual'
    return `Penso em algo ${word}, com ar ${tags}.`
  }
  if (q === 'budget') return client.budget === null ? 'Sem limite: o que importa é ficar bem.' : `No máximo ${client.budget} Brilhos.`
  return client.secret ? client.secret.text : 'Nada em especial, confio em você.'
}

export function Questions({ client }: { client: Client }) {
  const asked = useEstilistaStore((s) => s.asked)
  const ask = useEstilistaStore((s) => s.ask)
  return (
    <div className="es-questions">
      <div className="es-sub">{asked ? 'Sua pergunta' : 'Faça 1 pergunta (escolha bem)'}</div>
      {QUESTIONS.map((q) => (
        <button
          key={q.id}
          className={`es-q${asked === q.id ? ' on' : ''}`}
          disabled={!!asked && asked !== q.id}
          onClick={() => (playSfx('tap'), ask(q.id))}
        >
          <IcoAsk size={18} />
          <span>{q.text}</span>
          {asked === q.id && <IcoCheck size={18} />}
        </button>
      ))}
      {asked && (
        <div className="es-answer" role="status">
          <b>{client.name}:</b> {answerText(client, asked)}
        </div>
      )}
    </div>
  )
}

function Swatches({ colors, value, onPick, label }: { colors: string[]; value: string; onPick: (c: string) => void; label: string }) {
  return (
    <div className="es-colorrow" role="group" aria-label={label}>
      {colors.map((c) => (
        <button key={c} className={`es-dot${c.toLowerCase() === value.toLowerCase() ? ' on' : ''}`} style={{ background: c }} onClick={() => (playSfx('tap'), onPick(c))} aria-label={colorName(c)} title={colorName(c)} />
      ))}
    </div>
  )
}

function ItemBtn({ item, on, locked, match, showTags, onClick }: { item: CatalogItem | null; on: boolean; locked: boolean; match: boolean; showTags: boolean; onClick: () => void }) {
  if (!item)
    return (
      <button className={`es-item none${on ? ' on' : ''}`} onClick={onClick}>
        <span className="es-item-ico">∅</span>
        <span className="es-item-name">Nenhum</span>
      </button>
    )
  return (
    <button className={`es-item${on ? ' on' : ''}${locked ? ' locked' : ''}${match ? ' match' : ''}`} onClick={onClick} disabled={locked} aria-label={`${item.label}, ${priceOf(item)} Brilhos`}>
      <span className="es-item-ico">{locked ? <IcoLock size={24} /> : <ItemThumb id={item.id} fallback={<SlotIcon slot={item.slot} size={26} />} />}</span>
      <span className="es-item-name">{item.label}</span>
      {showTags && <span className="es-item-tags">{item.tags.slice(0, 2).map((t) => TAG_LABEL[t]).join(' · ')}</span>}
      <span className="es-item-price">
        <IcoCoin size={13} /> {priceOf(item)}
      </span>
      {match && !locked && <span className="es-item-flag">combina</span>}
      {locked && <span className="es-item-flag lock">libera com mais XP</span>}
    </button>
  )
}

/** Painel de montagem: abas de peças + cores + pedido, e o rodapé com total e entrega. */
export function StylingPanel({ client, secondsLeft, paused }: { client: Client; secondsLeft: number; paused: boolean }) {
  const look = useEstilistaStore((s) => s.look)
  const patch = useEstilistaStore((s) => s.patchLook)
  const difficulty = useEstilistaStore((s) => s.difficulty)
  const asked = useEstilistaStore((s) => s.asked)
  const loaded = useCatalogStore((s) => s.loaded)
  const [tab, setTab] = useState<Tab>('pedido')
  const [active, setActive] = useState<string | null>(null)

  const xp = getProfessionXp('Estilista')
  const tier = tierOf(xp)
  const showTags = difficulty !== 'estrela'
  const hint = difficulty === 'facil'

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => (tab === 'pedido' || tab === 'colors' ? [] : catalogByCategory(tab)), [tab, loaded])
  const matchOf = (it: CatalogItem) => hint && it.tags.some((t) => (client.tags[t] ?? 0) >= 0.9)
  const cost = lookCost(look, client)
  const budgetKnown = client.budget !== null && (hint || asked === 'budget')
  const over = client.budget !== null && cost > client.budget

  const toggleList = (key: 'jewelry' | 'accessories', it: CatalogItem) => {
    playSfx('tap')
    const list = look[key]
    if (list.some((x) => x.id === it.id)) {
      patch({ [key]: list.filter((x) => x.id !== it.id) } as Partial<Look>)
      if (active === it.id) setActive(null)
      return
    }
    const next = list.filter((x) => catalogItem(x.id)?.slot !== it.slot)
    const color = isGarment(it) ? DEFAULT_GARMENT : it.color
    patch({ [key]: [...next, { id: it.id, color }] } as Partial<Look>)
    setActive(it.id)
  }
  const recolorList = (key: 'jewelry' | 'accessories', id: string, color: string) => patch({ [key]: look[key].map((x) => (x.id === id ? { ...x, color } : x)) } as Partial<Look>)

  const gridItem = (it: CatalogItem, on: boolean, onClick: () => void) => (
    <ItemBtn key={it.id} item={it} on={on} locked={!isUnlocked(it, tier)} match={matchOf(it)} showTags={showTags} onClick={() => (playSfx('tap'), onClick())} />
  )

  let body: ReactNode = null
  if (tab === 'pedido') {
    body = (
      <>
        <p className="es-brief-mini">{client.brief}</p>
        {hint && (
          <div className="es-hintbox">
            <IcoStar size={16} filled /> Dica: {client.hintTags.map((t) => TAG_LABEL[t]).join(' · ')}
            {client.budget !== null && <> · até {client.budget} Brilhos</>}
          </div>
        )}
        <Questions client={client} />
      </>
    )
  } else if (tab === 'hair') {
    body = (
      <div className="es-grid">
        {items.map((it) =>
          gridItem(it, look.hairId === it.id, () => patch({ hairId: it.id, hairColor: it.id === client.look0.hairId ? client.look0.hairColor : it.color })),
        )}
      </div>
    )
  } else if (tab === 'top' || tab === 'bottom') {
    const key = tab
    body = (
      <div className="es-grid">
        <ItemBtn item={null} on={!look[key] && !look.dress} locked={false} match={false} showTags={false} onClick={() => (playSfx('tap'), patch({ [key]: null } as Partial<Look>))} />
        {items.map((it) =>
          gridItem(it, look[key]?.id === it.id || look.dress?.id === it.id, () => {
            if (it.slot === 'dress') patch({ dress: { id: it.id, color: DEFAULT_GARMENT }, top: null, bottom: null })
            else patch({ [key]: { id: it.id, color: look[key]?.id === it.id ? look[key]!.color : DEFAULT_GARMENT }, dress: null } as Partial<Look>)
          }),
        )}
      </div>
    )
  } else if (tab === 'accessory' || tab === 'jewelry') {
    const key = tab === 'jewelry' ? 'jewelry' : 'accessories'
    const list = look[key]
    const act = list.find((x) => x.id === active)
    const actItem = catalogItem(act?.id)
    body = (
      <>
        <div className="es-grid">{items.map((it) => gridItem(it, list.some((x) => x.id === it.id), () => toggleList(key, it)))}</div>
        {act && actItem && (
          <>
            <div className="es-sub">Cor de {actItem.label.toLowerCase()}</div>
            <Swatches colors={isGarment(actItem) ? GARMENT_SWATCHES : (actItem.swatches ?? [])} value={act.color} onPick={(c) => recolorList(key, act.id, c)} label="Cor da peça" />
          </>
        )}
      </>
    )
  } else {
    const worn: { key: string; label: string; color: string; onPick: (c: string) => void; swatches: string[] }[] = []
    if (look.dress) worn.push({ key: 'dress', label: 'Vestido', color: look.dress.color, swatches: GARMENT_SWATCHES, onPick: (c) => patch({ dress: { ...look.dress!, color: c } }) })
    if (look.top) worn.push({ key: 'top', label: 'Top', color: look.top.color, swatches: GARMENT_SWATCHES, onPick: (c) => patch({ top: { ...look.top!, color: c } }) })
    if (look.bottom) worn.push({ key: 'bottom', label: 'Saia', color: look.bottom.color, swatches: GARMENT_SWATCHES, onPick: (c) => patch({ bottom: { ...look.bottom!, color: c } }) })
    for (const p of look.accessories) {
      const it = catalogItem(p.id)
      if (it && (it.slot === 'gloves' || it.slot === 'legwear')) worn.push({ key: p.id, label: it.label, color: p.color, swatches: GARMENT_SWATCHES, onPick: (c) => recolorList('accessories', p.id, c) })
    }
    worn.push({ key: 'hair', label: 'Cabelo', color: look.hairColor, swatches: HAIR_SWATCHES, onPick: (c) => patch({ hairColor: c }) })
    body = (
      <>
        {worn.map((w) => (
          <div key={w.key}>
            <div className="es-sub">
              {w.label} <em>{colorName(w.color)}</em>
            </div>
            <Swatches colors={w.swatches} value={w.color} onPick={w.onPick} label={`Cor: ${w.label}`} />
          </div>
        ))}
        <div className="es-sub">
          Base (macacão) <em>{colorName(look.suitColor)}</em>
        </div>
        <Swatches colors={SUIT_SWATCHES} value={look.suitColor} onPick={(c) => patch({ suitColor: c })} label="Cor da base" />
        <div className="es-seg" role="group" aria-label="Acabamento da base">
          {FINISH.map((f) => (
            <button key={f.id} className={look.suitFinish === f.id ? 'on' : ''} onClick={() => (playSfx('tap'), patch({ suitFinish: f.id }))}>
              {f.label}
            </button>
          ))}
        </div>
      </>
    )
  }

  return (
    <aside className="es-panel" data-paused={paused}>
      <nav className="es-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => (playSfx('click'), setTab(t.id))}>
            {t.icon}
            <b>{t.label}</b>
          </button>
        ))}
      </nav>
      <div className="es-panel-body">{body}</div>
      <footer className="es-foot">
        <div className={`es-total${over && (budgetKnown || difficulty === 'facil') ? ' over' : ''}`}>
          <span className="es-total-row">
            <IcoCoin size={16} /> <b>{cost}</b>
            {budgetKnown ? <span> / {client.budget} Brilhos</span> : <span> Brilhos</span>}
          </span>
          {budgetKnown && <i style={{ width: `${Math.min(100, (cost / (client.budget || 1)) * 100)}%` }} />}
        </div>
        <button className="es-btn primary" onClick={() => (playSfx('done'), useEstilistaStore.getState().submit(false))} disabled={paused || secondsLeft <= 0}>
          Entregar look
        </button>
      </footer>
      {tier < 2 && <div className="es-xp-note">Estoque ampliado com {TIER_XP[tier + 1]} XP de Estilista</div>}
    </aside>
  )
}
