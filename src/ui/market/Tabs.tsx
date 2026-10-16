import { useState } from 'react'
import { claimCompleted, collectionProgress } from '../../game/market/collections'
import { getEdition } from '../../game/market/editions'
import { tradeLockLeft, useInventory } from '../../game/market/inventory'
import { useMarketMeta } from '../../game/market/meta'
import { market } from '../../game/market/service'
import { ORIGIN_LABEL } from '../../game/market/types'
import { EditionArt, SerialPlaque } from './Art'
import { ConfirmDialog, type ConfirmSpec } from './Dialogs'
import { ago, countdown, fmt, useMarketRev, useNow } from './format'
import { IcCase, IcCoin, IcLaurel, IcLock, IcTag } from './icons'
import { useMarketUi } from './marketUi'
import { MARKET_CFG } from '../../game/market/cfg'

/* ------------------------------------------------------------------ minhas pecas */

export function MyPieces() {
  useMarketRev()
  const now = useNow(1000)
  const inv = useInventory()
  const setDetail = useMarketUi((s) => s.setDetail)
  const setSellFor = useMarketUi((s) => s.setSellFor)
  const list = Object.values(inv.instances).sort((a, b) => a.editionId.localeCompare(b.editionId) || a.serial - b.serial)
  const slots = Array.from({ length: MARKET_CFG.maxVitrine }, (_, i) => inv.instances[inv.vitrine[i]] ?? null)
  const toggleVit = (id: string) => inv.setVitrine(inv.vitrine.includes(id) ? inv.vitrine.filter((x) => x !== id) : [...inv.vitrine, id])

  return (
    <div className="mk-pane">
      <section className="mk-showcase" aria-label="Vitrine do perfil">
        <header>
          <h3>
            <IcCase width={18} height={18} /> Vitrine do perfil
          </h3>
          <small>Até {MARKET_CFG.maxVitrine} peças com número de série em destaque no seu perfil.</small>
        </header>
        <div className="mk-showcase__row">
          {slots.map((i, k) => {
            const d = i ? getEdition(i.editionId) : null
            return (
              <div key={k} className={`mk-vslot${i ? ' is-full' : ''}`}>
                {i && d ? (
                  <>
                    <EditionArt def={d} retired={market().view(d.id)?.retired} className="mk-art--mini" />
                    <SerialPlaque serial={i.serial} cap={d.cap} small />
                    <span>{d.name}</span>
                  </>
                ) : (
                  <span className="mk-vslot__empty">Vaga {k + 1}</span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {list.length === 0 ? (
        <p className="mk-empty">
          Você ainda não tem edições limitadas. Elas chegam por eventos, temporadas, rankings e missões difíceis, ou pelo mercado.
        </p>
      ) : (
        <div className="mk-grid mk-grid--s">
          {list.map((i) => {
            const d = getEdition(i.editionId)!
            const v = market().view(d.id)
            const lock = tradeLockLeft(i, now)
            const inVit = inv.vitrine.includes(i.id)
            return (
              <article key={i.id} className={`mk-lot mk-lot--mine${v?.retired ? ' is-retired' : ''}`}>
                <div className="mk-lot__main">
                  <EditionArt def={d} retired={v?.retired} />
                  <div className="mk-lot__body">
                    <SerialPlaque serial={i.serial} cap={d.cap} />
                    <h3>{d.name}</h3>
                    <div className="mk-lot__meta">
                      <span>{i.via === 'mint' ? `Recebida · ${ORIGIN_LABEL[i.origin as keyof typeof ORIGIN_LABEL] ?? 'Evento'}` : 'Comprada no mercado'}</span>
                    </div>
                    <div className="mk-lot__price">
                      <span className="mk-money">
                        <IcCoin size={16} />
                        <b>{v ? fmt(v.price) : '—'}</b>
                      </span>
                      <small>valor de mercado</small>
                    </div>
                    {i.listingId ? (
                      <span className="mk-state is-listed">
                        <IcTag width={13} height={13} /> Anunciada
                      </span>
                    ) : lock > 0 ? (
                      <span className="mk-state is-lock">
                        <IcLock width={13} height={13} /> Troca liberada em {countdown(lock)}
                      </span>
                    ) : (
                      <span className="mk-state is-ok">Disponível para venda</span>
                    )}
                  </div>
                </div>
                <div className="mk-lot__acts">
                  <button type="button" className="mk-btn mk-btn--s mk-btn--brass" disabled={!!i.listingId || lock > 0} onClick={() => setSellFor(i.id)}>
                    Vender
                  </button>
                  <button type="button" className={`mk-btn mk-btn--s${inVit ? ' is-on' : ''}`} onClick={() => toggleVit(i.id)} disabled={!inVit && inv.vitrine.length >= MARKET_CFG.maxVitrine}>
                    {inVit ? 'Tirar da vitrine' : 'Pôr na vitrine'}
                  </button>
                  <button type="button" className="mk-link" onClick={() => setDetail(d.id)}>
                    Ver mercado
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ anuncios e ofertas */

export function Orders() {
  useMarketRev()
  const now = useNow(5000)
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
  const setDetail = useMarketUi((s) => s.setDetail)
  const ls = market().myListings()
  const bs = market().myBids()

  const cancelL = (id: string, name: string) =>
    setConfirm({ title: 'Cancelar anúncio', amount: 0, confirmLabel: 'Cancelar anúncio', lines: [['Peça', name]], note: 'A peça volta para a sua coleção.', run: () => market().cancelListing(id) })
  const cancelB = (id: string, name: string, price: number) =>
    setConfirm({ title: 'Cancelar oferta', amount: 0, confirmLabel: 'Cancelar oferta', lines: [['Edição', name], ['Devolução', <span className="mk-money" key="m"><IcCoin size={15} />{fmt(price)}</span>]], run: () => market().cancelBid(id) })

  return (
    <div className="mk-pane">
      <h3 className="mk-h3">Meus anúncios</h3>
      {ls.length === 0 ? (
        <p className="mk-empty mk-empty--s">Você não tem anúncios ativos. Escolha uma peça em &quot;Minhas peças&quot; para vender.</p>
      ) : (
        <ul className="mk-rows mk-rows--card">
          {ls.map((l) => {
            const d = getEdition(l.editionId)!
            const q = market().quoteSale(l.price)
            return (
              <li key={l.id}>
                <button type="button" className="mk-rows__art" onClick={() => setDetail(d.id)}>
                  <EditionArt def={d} className="mk-art--mini" />
                </button>
                <span className="mk-rows__who">
                  {d.name}
                  <small>
                    Nº {String(l.serial).padStart(3, '0')}/{d.cap} · expira em {countdown(l.expiresMs - now)}
                  </small>
                </span>
                <span className="mk-money">
                  <IcCoin size={15} />
                  <b>{fmt(l.price)}</b>
                  <small>líquido {fmt(q.net)}</small>
                </span>
                <button type="button" className="mk-btn mk-btn--s" onClick={() => cancelL(l.id, d.name)}>
                  Cancelar
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <h3 className="mk-h3">Minhas ofertas</h3>
      {bs.length === 0 ? (
        <p className="mk-empty mk-empty--s">Nenhuma oferta ativa. Abra uma edição e toque em &quot;Fazer oferta&quot;.</p>
      ) : (
        <ul className="mk-rows mk-rows--card">
          {bs.map((b) => {
            const d = getEdition(b.editionId)!
            const v = market().view(d.id)
            return (
              <li key={b.id}>
                <button type="button" className="mk-rows__art" onClick={() => setDetail(d.id)}>
                  <EditionArt def={d} className="mk-art--mini" />
                </button>
                <span className="mk-rows__who">
                  {d.name}
                  <small>
                    mercado {v ? fmt(v.price) : '—'} · expira em {countdown(b.expiresMs - now)}
                  </small>
                </span>
                <span className="mk-money">
                  <IcCoin size={15} />
                  <b>{fmt(b.price)}</b>
                  <small>reservado</small>
                </span>
                <button type="button" className="mk-btn mk-btn--s" onClick={() => cancelB(b.id, d.name, b.price)}>
                  Cancelar
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {confirm && <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />}
    </div>
  )
}

/* ------------------------------------------------------------------ historico */

export function History() {
  const log = useMarketMeta((s) => s.log)
  const now = useNow(30000)
  const bought = log.filter((l) => l.side === 'compra')
  const sold = log.filter((l) => l.side === 'venda')
  const fees = sold.reduce((s, l) => s + l.fee, 0)
  return (
    <div className="mk-pane">
      <dl className="mk-stats mk-stats--4">
        <div>
          <dt>Compras</dt>
          <dd>{bought.length}</dd>
        </div>
        <div>
          <dt>Vendas</dt>
          <dd>{sold.length}</dd>
        </div>
        <div>
          <dt>Gasto em compras</dt>
          <dd>{fmt(bought.reduce((s, l) => s + l.price, 0))}</dd>
        </div>
        <div>
          <dt>Taxas pagas</dt>
          <dd>{fmt(fees)}</dd>
        </div>
      </dl>
      {log.length === 0 ? (
        <p className="mk-empty">Seu histórico de negociações aparece aqui.</p>
      ) : (
        <table className="mk-table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Operação</th>
              <th>Peça</th>
              <th className="r">Preço</th>
              <th className="r">Taxa</th>
            </tr>
          </thead>
          <tbody>
            {log.map((l, i) => (
              <tr key={i}>
                <td>{ago(now - l.t)}</td>
                <td>
                  <span className={`mk-tag ${l.side === 'venda' ? 'is-sell' : 'is-buy'}`}>{l.side === 'venda' ? 'Venda' : 'Compra'}</span>
                </td>
                <td>
                  {getEdition(l.editionId)?.name} <small>Nº {String(l.serial).padStart(3, '0')}</small>
                </td>
                <td className="r">{fmt(l.price)}</td>
                <td className="r">{l.fee ? `−${fmt(l.fee)}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ colecoes */

export function Collections() {
  useMarketRev()
  const inv = useInventory()
  const progress = collectionProgress()
  const setDetail = useMarketUi((s) => s.setDetail)
  return (
    <div className="mk-pane">
      <p className="mk-hint">
        Complete um conjunto para ganhar um título e um emblema no perfil. Colecionar não gera Brilhos: é prestígio.
        {progress.some((p) => p.complete && !p.claimed) && (
          <button type="button" className="mk-btn mk-btn--s mk-btn--brass" onClick={() => claimCompleted()}>
            Resgatar conjuntos completos
          </button>
        )}
      </p>
      <div className="mk-cols">
        {progress.map((p) => (
          <article key={p.def.id} className={`mk-col${p.complete ? ' is-done' : ''}`}>
            <header>
              <IcLaurel width={22} height={22} />
              <div>
                <h3>{p.def.name}</h3>
                <small>{p.def.blurb}</small>
              </div>
              <b>
                {p.have.length}/{p.def.editions.length}
              </b>
            </header>
            <ul>
              {p.def.editions.map((e) => {
                const d = getEdition(e)!
                const has = p.have.includes(e)
                return (
                  <li key={e} className={has ? 'is-have' : ''}>
                    <button type="button" onClick={() => setDetail(e)}>
                      <i aria-hidden />
                      {d.name}
                    </button>
                  </li>
                )
              })}
            </ul>
            <footer>
              <span>
                Título: <b>{p.def.title}</b>
              </span>
              <span>
                Emblema: <b>{p.def.badge}</b>
              </span>
              {p.claimed && (
                <button type="button" className={`mk-chip${inv.equippedTitle === p.def.title ? ' is-on' : ''}`} onClick={() => inv.equipTitle(inv.equippedTitle === p.def.title ? null : p.def.title)}>
                  {inv.equippedTitle === p.def.title ? 'Título em uso' : 'Usar título'}
                </button>
              )}
              {p.complete && !p.claimed && <em>Pronto para resgatar</em>}
            </footer>
          </article>
        ))}
      </div>
    </div>
  )
}
