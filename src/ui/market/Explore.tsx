import { useMemo, useState } from 'react'
import { ORIGIN_LABEL, type Origin } from '../../game/market/types'
import type { EditionView } from '../../game/market/service'
import { useMarketMeta } from '../../game/market/meta'
import { EditionArt, RarityTag } from './Art'
import { fmt, pct, useEditions } from './format'
import { IcArrowDown, IcArrowUp, IcBookmark, IcBookmarkOn, IcCoin, IcSearch } from './icons'
import { useMarketUi } from './marketUi'

export function ChangeBadge({ v, long }: { v: number; long?: boolean }) {
  const flat = Math.abs(v) < 0.005
  const up = v > 0
  return (
    <span className={`mk-chg ${flat ? 'is-flat' : up ? 'is-up' : 'is-down'}`}>
      {!flat && (up ? <IcArrowUp width={13} height={13} /> : <IcArrowDown width={13} height={13} />)}
      {long ? (flat ? 'Estável' : up ? 'Valorizou' : 'Desvalorizou') + ' ' : ''}
      {flat ? (long ? '' : '0,0%') : pct(v)}
    </span>
  )
}

export function SupplyBar({ v }: { v: EditionView }) {
  const p = Math.min(1, v.minted / v.supply)
  return (
    <div className="mk-supply" title={`${v.minted} de ${v.supply} cunhadas`}>
      <div className="mk-supply__bar">
        <i style={{ width: `${p * 100}%` }} />
      </div>
      <span>{v.retired ? `Aposentada · ${v.supply} cópias no total` : `${v.minted} de ${v.supply} cunhadas`}</span>
    </div>
  )
}

export function LotCard({ v }: { v: EditionView }) {
  const setDetail = useMarketUi((s) => s.setDetail)
  const watch = useMarketMeta((s) => s.watch.includes(v.def.id))
  const toggle = useMarketMeta((s) => s.toggleWatch)
  return (
    <article className={`mk-lot${v.retired ? ' is-retired' : ''}`}>
      <button type="button" className="mk-lot__main" onClick={() => setDetail(v.def.id)} aria-label={`Abrir ${v.def.name}`}>
        <EditionArt def={v.def} retired={v.retired} />
        <div className="mk-lot__body">
          <div className="mk-lot__meta">
            <RarityTag r={v.def.rarity} />
            <span>{ORIGIN_LABEL[v.def.origin]} · {v.def.originNote}</span>
          </div>
          <h3>{v.def.name}</h3>
          <div className="mk-lot__price">
            <span className="mk-money">
              <IcCoin size={17} />
              <b>{fmt(v.price)}</b>
            </span>
            <ChangeBadge v={v.chg7d} />
          </div>
          <SupplyBar v={v} />
          <div className="mk-lot__foot">
            <span>{v.bestAsk ? `Menor anúncio ${fmt(v.bestAsk)}` : 'Sem anúncios'}</span>
            {v.owned > 0 && <em>Você tem {v.owned}</em>}
          </div>
        </div>
      </button>
      <button type="button" className={`mk-watch${watch ? ' is-on' : ''}`} onClick={() => toggle(v.def.id)} aria-pressed={watch} aria-label={watch ? 'Remover dos favoritos' : 'Acompanhar'} title={watch ? 'Acompanhando' : 'Acompanhar'}>
        {watch ? <IcBookmarkOn width={17} height={17} /> : <IcBookmark width={17} height={17} />}
      </button>
    </article>
  )
}

type Sort = 'alta' | 'queda' | 'menor' | 'maior' | 'volume' | 'raras'
const SORTS: Array<[Sort, string]> = [
  ['alta', 'Maior valorização'],
  ['queda', 'Maior queda'],
  ['menor', 'Menor preço'],
  ['maior', 'Maior preço'],
  ['volume', 'Mais negociadas'],
  ['raras', 'Mais raras'],
]
const KINDS: Array<['todas' | 'jewelry' | 'garment' | 'hair', string]> = [
  ['todas', 'Tudo'],
  ['jewelry', 'Joias'],
  ['garment', 'Roupas'],
  ['hair', 'Cabelos'],
]

export function Explore() {
  const all = useEditions()
  const watch = useMarketMeta((s) => s.watch)
  const setDetail = useMarketUi((s) => s.setDetail)
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'todas' | 'jewelry' | 'garment' | 'hair'>('todas')
  const [origin, setOrigin] = useState<Origin | 'todas'>('todas')
  const [state, setState] = useState<'todas' | 'ativas' | 'aposentadas' | 'favoritas'>('todas')
  const [sort, setSort] = useState<Sort>('alta')

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase()
    const out = all.filter(
      (v) =>
        (kind === 'todas' || v.def.kind === kind) &&
        (origin === 'todas' || v.def.origin === origin) &&
        (state === 'todas' || (state === 'ativas' ? !v.retired : state === 'aposentadas' ? v.retired : watch.includes(v.def.id))) &&
        (!ql || v.def.name.toLowerCase().includes(ql) || v.def.originNote.toLowerCase().includes(ql)),
    )
    const by: Record<Sort, (a: EditionView, b: EditionView) => number> = {
      alta: (a, b) => b.chg7d - a.chg7d,
      queda: (a, b) => a.chg7d - b.chg7d,
      menor: (a, b) => a.price - b.price,
      maior: (a, b) => b.price - a.price,
      volume: (a, b) => b.volume7d - a.volume7d,
      raras: (a, b) => a.supply - b.supply,
    }
    return out.sort(by[sort])
  }, [all, q, kind, origin, state, sort, watch])

  const gain = [...all].sort((a, b) => b.chg7d - a.chg7d)[0]
  const loss = [...all].sort((a, b) => a.chg7d - b.chg7d)[0]
  const hot = [...all].sort((a, b) => b.volume7d - a.volume7d)[0]
  const index = all.reduce((s, v) => s + v.chg7d, 0) / Math.max(1, all.length)

  return (
    <div className="mk-explore">
      <section className="mk-ticker" aria-label="Destaques da semana">
        <div>
          <small>Índice do mercado · 7 dias</small>
          <ChangeBadge v={index} />
        </div>
        {[
          ['Em alta', gain],
          ['Em queda', loss],
          ['Mais negociada', hot],
        ].map(([label, v]) =>
          v ? (
            <button key={label as string} type="button" onClick={() => setDetail((v as EditionView).def.id)}>
              <small>{label as string}</small>
              <b>{(v as EditionView).def.name}</b>
              {label === 'Mais negociada' ? <span>{(v as EditionView).volume7d} negócios</span> : <ChangeBadge v={(v as EditionView).chg7d} />}
            </button>
          ) : null,
        )}
      </section>

      <div className="mk-filters">
        <label className="mk-search">
          <IcSearch width={16} height={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar edição ou origem" aria-label="Buscar" />
        </label>
        <div className="mk-chips" role="group" aria-label="Tipo">
          {KINDS.map(([k, label]) => (
            <button key={k} type="button" className={`mk-chip${kind === k ? ' is-on' : ''}`} onClick={() => setKind(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className="mk-chips" role="group" aria-label="Situação">
          {(['todas', 'ativas', 'aposentadas', 'favoritas'] as const).map((k) => (
            <button key={k} type="button" className={`mk-chip${state === k ? ' is-on' : ''}`} onClick={() => setState(k)}>
              {k === 'todas' ? 'Todas' : k === 'ativas' ? 'Em cunhagem' : k === 'aposentadas' ? 'Aposentadas' : 'Favoritas'}
            </button>
          ))}
        </div>
        <select className="mk-select" value={origin} onChange={(e) => setOrigin(e.target.value as Origin | 'todas')} aria-label="Origem">
          <option value="todas">Todas as origens</option>
          {(Object.keys(ORIGIN_LABEL) as Origin[]).map((o) => (
            <option key={o} value={o}>
              {ORIGIN_LABEL[o]}
            </option>
          ))}
        </select>
        <select className="mk-select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar">
          {SORTS.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {list.length === 0 ? (
        <p className="mk-empty">Nenhuma edição encontrada com esses filtros.</p>
      ) : (
        <div className="mk-grid">
          {list.map((v) => (
            <LotCard key={v.def.id} v={v} />
          ))}
        </div>
      )}
    </div>
  )
}
