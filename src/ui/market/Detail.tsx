import { useMemo, useState } from 'react'
import { MARKET_CFG } from '../../game/market/cfg'
import { getEdition } from '../../game/market/editions'
import { useInventory } from '../../game/market/inventory'
import { useMarketMeta } from '../../game/market/meta'
import { market } from '../../game/market/service'
import { ORIGIN_LABEL, type Listing } from '../../game/market/types'
import { EditionHero, RarityTag, SerialPlaque, slotName } from './Art'
import { PriceChart } from './Chart'
import { BidDialog, ConfirmDialog, SellDialog, type ConfirmSpec } from './Dialogs'
import { ChangeBadge, SupplyBar } from './Explore'
import { ago, countdown, fmt, useMarketRev, useNow } from './format'
import { IcBack, IcBookmark, IcBookmarkOn, IcCoin, IcGavel, IcTag } from './icons'
import { useMarketUi } from './marketUi'

export function Detail({ id }: { id: string }) {
  const rev = useMarketRev()
  const now = useNow(15000)
  const setDetail = useMarketUi((s) => s.setDetail)
  const def = getEdition(id)
  const watch = useMarketMeta((s) => s.watch.includes(id))
  const toggle = useMarketMeta((s) => s.toggleWatch)
  const instances = useInventory((s) => s.instances)
  const owned = useMemo(() => Object.values(instances).filter((i) => i.editionId === id), [instances, id])
  const [range, setRange] = useState<7 | 30>(30)
  const [book, setBook] = useState<'anuncios' | 'ofertas'>('anuncios')
  const [dlg, setDlg] = useState<null | 'bid' | 'sell'>(null)
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const v = useMemo(() => market().view(id), [rev, id])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pts = useMemo(() => market().history(id, range), [rev, id, range])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bk = useMemo(() => market().book(id), [rev, id])
  if (!def || !v) return null

  const buy = (l: Listing) =>
    setConfirm({
      title: 'Confirmar compra',
      amount: l.price,
      confirmLabel: 'Comprar',
      lines: [
        ['Peça', `${def.name} Nº ${String(l.serial).padStart(3, '0')}/${def.cap}`],
        ['Vendedor', l.seller],
        ['Preço', <span className="mk-money" key="p"><IcCoin size={15} />{fmt(l.price)}</span>],
      ],
      note: `A peça comprada fica com trava de troca de ${Math.round(MARKET_CFG.tradeLockMs / 3600000)} h: você poderá usar, mas não revender antes disso.`,
      run: () => market().buy(l.id),
    })

  const tradable = owned.filter((i) => !i.listingId && now >= i.tradableAt)
  const asks = bk.asks
  const bids = bk.bids

  return (
    <div className="mk-detail">
      <button type="button" className="mk-link mk-back" onClick={() => setDetail(null)}>
        <IcBack width={15} height={15} /> Voltar ao mercado
      </button>
      <div className="mk-detail__cols">
        <div className="mk-detail__left">
          <EditionHero def={def} retired={v.retired} />
          <div className="mk-detail__id">
            <RarityTag r={def.rarity} />
            <h2>{def.name}</h2>
            <p className="mk-origin">
              {ORIGIN_LABEL[def.origin]} · {def.originNote} · {slotName(def)}
            </p>
            <p className="mk-blurb">{def.blurb}</p>
            {v.retired && (
              <p className="mk-retired">
                Edição aposentada. Nenhuma cópia nova será feita, nunca mais.
              </p>
            )}
          </div>
          <SupplyBar v={v} />
          {owned.length > 0 && (
            <div className="mk-own">
              <b>Você tem {owned.length}:</b>
              {owned.map((i) => (
                <SerialPlaque key={i.id} serial={i.serial} cap={def.cap} small />
              ))}
            </div>
          )}
        </div>

        <div className="mk-detail__right">
          <div className="mk-pricehead">
            <div>
              <small>Preço de mercado</small>
              <div className="mk-money mk-money--xl">
                <IcCoin size={26} />
                <b>{fmt(v.price)}</b>
              </div>
            </div>
            <div className="mk-chgs">
              <div>
                <small>24 h</small>
                <ChangeBadge v={v.chg1d} />
              </div>
              <div>
                <small>7 d</small>
                <ChangeBadge v={v.chg7d} long />
              </div>
              <div>
                <small>30 d</small>
                <ChangeBadge v={v.chg30d} />
              </div>
            </div>
            <button type="button" className={`mk-btn mk-btn--ghost${watch ? ' is-on' : ''}`} onClick={() => toggle(id)} aria-pressed={watch}>
              {watch ? <IcBookmarkOn width={15} height={15} /> : <IcBookmark width={15} height={15} />}
              {watch ? 'Acompanhando' : 'Acompanhar'}
            </button>
          </div>

          {v.headline && <p className={`mk-news ${v.hype < 0 ? 'is-neg' : ''}`}>{v.headline}</p>}

          <div className="mk-range" role="tablist" aria-label="Período">
            {([7, 30] as const).map((r) => (
              <button key={r} type="button" role="tab" aria-selected={range === r} className={range === r ? 'is-on' : ''} onClick={() => setRange(r)}>
                {r} dias
              </button>
            ))}
            <small>1 dia de mercado = {Math.round(MARKET_CFG.dayMs / 60000)} min reais</small>
          </div>
          <PriceChart points={pts} />

          <dl className="mk-stats">
            <div>
              <dt>Menor anúncio</dt>
              <dd>{v.bestAsk ? fmt(v.bestAsk) : '—'}</dd>
            </div>
            <div>
              <dt>Maior oferta</dt>
              <dd>{v.bestBid ? fmt(v.bestBid) : '—'}</dd>
            </div>
            <div>
              <dt>Negócios (7 d)</dt>
              <dd>{v.volume7d}</dd>
            </div>
            <div>
              <dt>Ainda cunháveis</dt>
              <dd>{v.retired ? 0 : v.supply - v.minted}</dd>
            </div>
          </dl>

          <div className="mk-actions">
            <button type="button" className="mk-btn mk-btn--ink" onClick={() => setDlg('bid')}>
              <IcGavel width={16} height={16} /> Fazer oferta
            </button>
            <button type="button" className="mk-btn mk-btn--brass" onClick={() => setDlg('sell')} disabled={owned.length === 0} title={owned.length === 0 ? 'Você não tem esta edição' : tradable.length === 0 ? 'Suas cópias estão travadas ou anunciadas' : undefined}>
              <IcTag width={16} height={16} /> Vender a minha
            </button>
          </div>

          <div className="mk-book">
            <div className="mk-range" role="tablist">
              <button type="button" role="tab" aria-selected={book === 'anuncios'} className={book === 'anuncios' ? 'is-on' : ''} onClick={() => setBook('anuncios')}>
                Anúncios ({asks.length})
              </button>
              <button type="button" role="tab" aria-selected={book === 'ofertas'} className={book === 'ofertas' ? 'is-on' : ''} onClick={() => setBook('ofertas')}>
                Ofertas ({bids.length})
              </button>
            </div>
            {book === 'anuncios' ? (
              asks.length === 0 ? (
                <p className="mk-empty mk-empty--s">Nenhum anúncio agora. Faça uma oferta e aguarde.</p>
              ) : (
                <ul className="mk-rows">
                  {asks.slice(0, 12).map((l) => (
                    <li key={l.id} className={l.mine ? 'is-mine' : ''}>
                      <SerialPlaque serial={l.serial} cap={def.cap} small />
                      <span className="mk-rows__who">
                        {l.mine ? 'Você' : l.seller}
                        <small>expira em {countdown(l.expiresMs - Date.now())}</small>
                      </span>
                      <span className="mk-money">
                        <IcCoin size={15} />
                        <b>{fmt(l.price)}</b>
                      </span>
                      {l.mine ? (
                        <button type="button" className="mk-btn mk-btn--s" onClick={() => market().cancelListing(l.id)}>
                          Cancelar
                        </button>
                      ) : (
                        <button type="button" className="mk-btn mk-btn--s mk-btn--ink" onClick={() => buy(l)}>
                          Comprar
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )
            ) : bids.length === 0 ? (
              <p className="mk-empty mk-empty--s">Nenhuma oferta no momento.</p>
            ) : (
              <ul className="mk-rows">
                {bids.slice(0, 12).map((b) => (
                  <li key={b.id} className={b.mine ? 'is-mine' : ''}>
                    <span className="mk-rows__who">
                      {b.mine ? 'Sua oferta' : 'Comprador'}
                      <small>{ago(Date.now() - b.createdMs)}</small>
                    </span>
                    <span className="mk-money">
                      <IcCoin size={15} />
                      <b>{fmt(b.price)}</b>
                    </span>
                    {b.mine && (
                      <button type="button" className="mk-btn mk-btn--s" onClick={() => market().cancelBid(b.id)}>
                        Cancelar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {dlg === 'bid' && <BidDialog editionId={id} onClose={() => setDlg(null)} />}
      {dlg === 'sell' && <SellDialog editionId={id} onClose={() => setDlg(null)} />}
      {confirm && <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />}
    </div>
  )
}
