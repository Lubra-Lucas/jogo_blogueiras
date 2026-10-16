import { useEffect, useState } from 'react'
import { MARKET_CFG } from '../../game/market/cfg'
import { useMarketMeta } from '../../game/market/meta'
import { market } from '../../game/market/service'
import { useProfileStore } from '../../state/profileStore'
import { Detail } from './Detail'
import { SellHost } from './Dialogs'
import { Explore } from './Explore'
import { ago, fmt, useMarketRev } from './format'
import { IcBell, IcCase, IcClose, IcCoin, IcGavel, IcLaurel, IcReceipt, IcShield, IcSwap, IcTag } from './icons'
import { useMarketUi, type MarketTab } from './marketUi'
import { Collections, History, MyPieces, Orders } from './Tabs'
import './market.css'

const TABS: Array<[MarketTab, string, typeof IcGavel]> = [
  ['explorar', 'Mercado', IcGavel],
  ['pecas', 'Minhas peças', IcCase],
  ['ordens', 'Anúncios e ofertas', IcTag],
  ['historico', 'Histórico', IcReceipt],
  ['colecoes', 'Coleções', IcLaurel],
]

function Notes() {
  const notes = useMarketMeta((s) => s.notes)
  const markAll = useMarketMeta((s) => s.markAllRead)
  const setDetail = useMarketUi((s) => s.setDetail)
  const setNotesOpen = useMarketUi((s) => s.setNotesOpen)
  return (
    <div className="mk-notes" role="dialog" aria-label="Notificações">
      <header>
        <b>Notificações</b>
        <button type="button" className="mk-link" onClick={markAll}>
          Marcar como lidas
        </button>
      </header>
      {notes.length === 0 ? (
        <p className="mk-empty mk-empty--s">Nada por aqui ainda. Acompanhe uma edição para receber avisos de preço.</p>
      ) : (
        <ul>
          {notes.map((n) => (
            <li key={n.id} className={`${n.read ? '' : 'is-new'} is-${n.kind}`}>
              <button
                type="button"
                onClick={() => {
                  if (n.editionId) setDetail(n.editionId)
                  setNotesOpen(false)
                }}
              >
                <span>{n.text}</span>
                <small>{ago(Date.now() - n.t)}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Intro() {
  const seen = useMarketMeta((s) => s.seenIntro)
  const setSeen = useMarketMeta((s) => s.setIntroSeen)
  if (seen) return null
  return (
    <aside className="mk-intro">
      <IcShield width={22} height={22} />
      <div>
        <b>Como o mercado funciona</b>
        <p>
          Aqui só circulam <b>Brilhos</b>. Nada vira dinheiro de verdade e Diamantes não entram. Cada venda paga {Math.round(MARKET_CFG.feePct * 100)}% de taxa. {MARKET_CFG.tradeLockMs > 0 ? `Peças novas ficam ${Math.round(MARKET_CFG.tradeLockMs / 3600000)} h travadas para troca.` : ''} Os preços mudam com a oferta, o hype e as aposentadorias.
        </p>
      </div>
      <button type="button" className="mk-btn mk-btn--s" onClick={setSeen}>
        Entendi
      </button>
    </aside>
  )
}

/** Toasts para avisos do mercado (venda, oferta aceita), mesmo com a tela fechada. */
function Toasts() {
  const open = useMarketUi((s) => s.open)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  useEffect(
    () =>
      useMarketMeta.subscribe((s, prev) => {
        const n = s.notes[0]
        if (n && n.id !== prev.notes[0]?.id && (n.kind === 'venda' || n.kind === 'oferta')) setToast({ id: n.id, text: n.text })
      }),
    [],
  )
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 5600)
    return () => window.clearTimeout(t)
  }, [toast])
  if (!toast || open) return null
  return (
    <div className="mk-toast" role="status" key={toast.id}>
      <IcCoin size={22} />
      <span>{toast.text}</span>
    </div>
  )
}

function Screen() {
  useMarketRev()
  const { tab, detail, notesOpen, setTab, closeMarket, setNotesOpen } = useMarketUi()
  const coins = useProfileStore((s) => s.coins)
  const unread = useMarketMeta((s) => s.notes.filter((n) => !n.read).length)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (useMarketUi.getState().detail) useMarketUi.getState().setDetail(null)
        else closeMarket()
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [closeMarket])
  return (
    <div className="mk-root" role="dialog" aria-modal="true" aria-label="Mercado de edições limitadas">
      <div className="mk-shell">
        <header className="mk-head">
          <div className="mk-brand">
            <span className="mk-brand__mark" aria-hidden>
              <IcGavel width={20} height={20} />
            </span>
            <div>
              <h1>Casa de Leilões</h1>
              <small>Edições limitadas · só Brilhos</small>
            </div>
          </div>
          <div className="mk-head__r">
            <span className="mk-wallet" aria-label="Seu saldo">
              <IcCoin size={20} />
              <b>{fmt(coins)}</b>
            </span>
            <button type="button" className="mk-x" onClick={() => setNotesOpen(!notesOpen)} aria-label="Notificações" aria-expanded={notesOpen}>
              <IcBell width={18} height={18} />
              {unread > 0 && <i className="mk-dot">{unread > 9 ? '9+' : unread}</i>}
            </button>
            <button type="button" className="mk-x" onClick={closeMarket} aria-label="Fechar mercado">
              <IcClose width={18} height={18} />
            </button>
          </div>
          {notesOpen && <Notes />}
        </header>
        <nav className="mk-tabs" role="tablist" aria-label="Seções do mercado">
          {TABS.map(([id, label, Icon]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id && !detail} className={tab === id && !detail ? 'is-on' : ''} onClick={() => setTab(id)}>
              <Icon width={16} height={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <main className="mk-body">
          <Intro />
          {detail ? <Detail id={detail} /> : tab === 'explorar' ? <Explore /> : tab === 'pecas' ? <MyPieces /> : tab === 'ordens' ? <Orders /> : tab === 'historico' ? <History /> : <Collections />}
        </main>
        <footer className="mk-foot">
          <IcSwap width={14} height={14} />
          <span>
            Moeda única: Brilhos. Sem conversão para dinheiro real. Taxa de {Math.round(MARKET_CFG.feePct * 100)}% por venda. Mercado simulado: jogadoras ambiente criam oferta e procura.
          </span>
        </footer>
      </div>
      <SellHost />
    </div>
  )
}

/**
 * Monte uma vez em `App.tsx` (dentro de `.ui-layer`). Liga o relogio do mercado, mostra avisos (toasts) e a tela
 * quando aberta por `openMarket()` ou `?market=1`.
 */
export function MarketHost() {
  const open = useMarketUi((s) => s.open)
  useEffect(() => {
    market() // liga o relogio em segundo plano
    if (new URLSearchParams(window.location.search).get('market')) useMarketUi.getState().openMarket()
  }, [])
  return (
    <>
      <Toasts />
      {open && <Screen />}
    </>
  )
}
