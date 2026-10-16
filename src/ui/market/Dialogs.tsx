import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { MARKET_CFG } from '../../game/market/cfg'
import { getEdition } from '../../game/market/editions'
import { isTradable, tradeLockLeft, useInventory } from '../../game/market/inventory'
import { market } from '../../game/market/service'
import type { EditionInstance, Result } from '../../game/market/types'
import { useProfileStore } from '../../state/profileStore'
import { EditionArt, SerialPlaque } from './Art'
import { countdown, fmt, useMarketRev, useNow } from './format'
import { IcClose, IcCoin, IcInfo, IcLock } from './icons'
import { useMarketUi } from './marketUi'

/* ------------------------------------------------------------------ confirmacao em dois passos */

export interface ConfirmSpec {
  title: string
  lines: Array<[string, ReactNode]>
  note?: ReactNode
  /** valor total envolvido (Brilhos): acima do limite, pede um segundo passo */
  amount: number
  confirmLabel: string
  tone?: 'buy' | 'sell' | 'plain'
  run: () => Promise<Result<unknown>>
}

export function ConfirmDialog({ spec, onClose }: { spec: ConfirmSpec; onClose: () => void }) {
  const balance = useProfileStore((s) => s.coins)
  const high = spec.amount >= MARKET_CFG.highValue || spec.amount >= balance * 0.5
  const [step, setStep] = useState<1 | 2>(1)
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<Result<unknown> | null>(null)
  const [arm, setArm] = useState(false)

  useEffect(() => {
    if (step !== 2) return
    const t = window.setTimeout(() => setArm(true), 1100)
    return () => window.clearTimeout(t)
  }, [step])

  const go = async () => {
    if (busy) return
    setBusy(true)
    try {
      setRes(await spec.run())
    } catch (e) {
      setRes({ ok: false, message: e instanceof Error ? e.message : 'Algo deu errado.' })
    }
    setBusy(false)
  }

  if (res) {
    return (
      <Modal onClose={onClose} label={res.ok ? 'Concluído' : 'Não foi possível'}>
        <div className={`mk-result ${res.ok ? 'is-ok' : 'is-bad'}`}>
          <h3>{res.ok ? 'Tudo certo' : 'Não deu certo'}</h3>
          <p>{res.message}</p>
        </div>
        <div className="mk-dlg__foot">
          <button type="button" className="mk-btn mk-btn--ink" onClick={onClose}>
            Fechar
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} label={spec.title}>
      <h3 className="mk-dlg__title">{step === 1 ? spec.title : 'Confirme mais uma vez'}</h3>
      {step === 1 ? (
        <>
          <dl className="mk-lines">
            {spec.lines.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {spec.note && <p className="mk-note">{spec.note}</p>}
          <div className="mk-dlg__foot">
            <button type="button" className="mk-btn" onClick={onClose}>
              Voltar
            </button>
            <button type="button" className={`mk-btn mk-btn--${spec.tone === 'sell' ? 'brass' : 'ink'}`} onClick={() => (high ? setStep(2) : go())} disabled={busy}>
              {high ? 'Continuar' : spec.confirmLabel}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mk-big">
            <IcCoin size={26} />
            <b>{fmt(spec.amount)}</b>
            <span>Brilhos</span>
          </div>
          <p className="mk-note mk-note--warn">
            <IcInfo width={16} height={16} /> Este é um valor alto. Negociações no mercado não podem ser desfeitas depois de concluídas.
          </p>
          <div className="mk-dlg__foot">
            <button type="button" className="mk-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className={`mk-btn mk-btn--${spec.tone === 'sell' ? 'brass' : 'ink'}`} onClick={go} disabled={!arm || busy}>
              {arm ? `Sim, ${spec.confirmLabel.toLowerCase()}` : 'Aguarde…'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

export function Modal({ children, onClose, label }: { children: ReactNode; onClose: () => void; label: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [onClose])
  return (
    <div className="mk-dlg-root" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mk-dlg" role="dialog" aria-modal="true" aria-label={label}>
        <button type="button" className="mk-x mk-dlg__x" onClick={onClose} aria-label="Fechar">
          <IcClose width={16} height={16} />
        </button>
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ campos */

function PriceField({ value, onChange, band, ref0 }: { value: string; onChange: (v: string) => void; band: [number, number]; ref0: number }) {
  const n = parsePrice(value)
  const bad = n !== null && (n < band[0] || n > band[1])
  const step = (pctv: number) => onChange(String(Math.max(MARKET_CFG.minPrice, Math.round(ref0 * (1 + pctv)))))
  return (
    <div className="mk-field">
      <label htmlFor="mk-price">Preço (Brilhos)</label>
      <div className={`mk-input${bad ? ' is-bad' : ''}`}>
        <IcCoin size={18} />
        <input id="mk-price" inputMode="numeric" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))} />
      </div>
      <div className="mk-quick">
        <button type="button" onClick={() => step(-0.1)}>
          −10%
        </button>
        <button type="button" onClick={() => step(-0.03)}>
          −3%
        </button>
        <button type="button" onClick={() => step(0)}>
          Preço de mercado
        </button>
        <button type="button" onClick={() => step(0.05)}>
          +5%
        </button>
        <button type="button" onClick={() => step(0.15)}>
          +15%
        </button>
      </div>
      <small className={bad ? 'mk-err' : ''}>
        Faixa permitida: {fmt(band[0])} a {fmt(band[1])} Brilhos (protege contra golpes e erros de digitação).
      </small>
    </div>
  )
}

const parsePrice = (v: string): number | null => {
  const n = Number(v)
  return v !== '' && Number.isFinite(n) && n > 0 ? Math.floor(n) : null
}

function DurationField({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="mk-field">
      <label>{label}</label>
      <div className="mk-seg" role="radiogroup">
        {MARKET_CFG.durations.map((d) => (
          <button key={d.id} type="button" role="radio" aria-checked={value === d.ms} className={value === d.ms ? 'is-on' : ''} onClick={() => onChange(d.ms)}>
            {d.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ vender */

export function SellDialog({ editionId, instanceId, onClose }: { editionId: string; instanceId?: string; onClose: () => void }) {
  useMarketRev()
  const now = useNow(1000)
  const def = getEdition(editionId)!
  const view = market().view(editionId)!
  const instances = useInventory((s) => s.instances)
  const mine = useMemo(() => Object.values(instances).filter((i) => i.editionId === editionId), [instances, editionId])
  const [sel, setSel] = useState<string | undefined>(instanceId ?? mine.find((i) => isTradable(i, now))?.id ?? mine[0]?.id)
  const inst = sel ? instances[sel] : undefined
  const [price, setPrice] = useState(String(view.price))
  const [dur, setDur] = useState<number>(MARKET_CFG.durations[1].ms)
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
  const band = market().priceBand(editionId)
  const n = parsePrice(price)
  const quote = n ? market().quoteSale(n) : null
  const lock = inst ? tradeLockLeft(inst, now) : 0
  const okPrice = n !== null && n >= band[0] && n <= band[1]
  const can = !!inst && isTradable(inst, now) && okPrice

  const submit = () => {
    if (!inst || !n || !quote) return
    setConfirm({
      title: 'Confirmar anúncio',
      amount: n,
      tone: 'sell',
      confirmLabel: 'Publicar anúncio',
      lines: [
        ['Peça', `${def.name} Nº ${String(inst.serial).padStart(3, '0')}/${def.cap}`],
        ['Preço pedido', <span className="mk-money" key="p"><IcCoin size={15} />{fmt(n)}</span>],
        [`Taxa do mercado (${Math.round(MARKET_CFG.feePct * 100)}%)`, <span className="mk-money mk-neg" key="f">− {fmt(quote.fee)}</span>],
        ['Você recebe', <span className="mk-money mk-strong" key="n"><IcCoin size={15} />{fmt(quote.net)}</span>],
        ['Anúncio válido por', MARKET_CFG.durations.find((d) => d.ms === dur)?.label ?? ''],
      ],
      note: 'A peça fica em custódia enquanto estiver anunciada. Você pode cancelar a qualquer momento antes da venda.',
      run: () => market().list(inst.id, n, dur),
    })
  }

  return (
    <>
      <Modal onClose={onClose} label="Vender peça">
        <h3 className="mk-dlg__title">Vender {def.name}</h3>
        <div className="mk-sell">
          <EditionArt def={def} retired={view.retired} className="mk-art--thumb" />
          <div>
            {mine.length > 1 && (
              <div className="mk-field">
                <label>Qual cópia?</label>
                <div className="mk-chips">
                  {mine.map((i) => (
                    <button key={i.id} type="button" className={`mk-chip${sel === i.id ? ' is-on' : ''}`} onClick={() => setSel(i.id)} disabled={!!i.listingId}>
                      Nº {String(i.serial).padStart(3, '0')}
                      {i.listingId ? ' (anunciada)' : !isTradable(i, now) ? ' (travada)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {inst && <SerialPlaque serial={inst.serial} cap={def.cap} />}
            {inst && lock > 0 && (
              <p className="mk-note mk-note--warn">
                <IcLock width={15} height={15} /> Trava de troca: libera em {countdown(lock)}.
              </p>
            )}
            <p className="mk-hint">
              Preço de mercado hoje: <b>{fmt(view.price)}</b> Brilhos · menor anúncio: <b>{view.bestAsk ? fmt(view.bestAsk) : '—'}</b>
            </p>
          </div>
        </div>
        <PriceField value={price} onChange={setPrice} band={band} ref0={view.price} />
        <DurationField value={dur} onChange={setDur} label="Duração do anúncio" />
        {quote && (
          <div className="mk-quote">
            <span>Taxa {Math.round(MARKET_CFG.feePct * 100)}%: −{fmt(quote.fee)}</span>
            <b>
              Você recebe <IcCoin size={15} /> {fmt(quote.net)}
            </b>
          </div>
        )}
        <div className="mk-dlg__foot">
          <button type="button" className="mk-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="mk-btn mk-btn--brass" disabled={!can} onClick={submit}>
            Revisar anúncio
          </button>
        </div>
      </Modal>
      {confirm && (
        <ConfirmDialog
          spec={confirm}
          onClose={() => {
            setConfirm(null)
            onClose()
          }}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------------------ oferta */

export function BidDialog({ editionId, onClose }: { editionId: string; onClose: () => void }) {
  useMarketRev()
  const def = getEdition(editionId)!
  const view = market().view(editionId)!
  const coins = useProfileStore((s) => s.coins)
  const [price, setPrice] = useState(String(Math.max(MARKET_CFG.minPrice, Math.round(view.price * 0.95))))
  const [dur, setDur] = useState<number>(MARKET_CFG.durations[1].ms)
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
  const band = market().priceBand(editionId)
  const n = parsePrice(price)
  const okPrice = n !== null && n >= band[0] && n <= band[1]
  const enough = n !== null && coins >= n
  const instant = n !== null && view.bestAsk !== null && view.bestAsk <= n

  const submit = () => {
    if (!n) return
    setConfirm({
      title: instant ? 'Confirmar compra imediata' : 'Confirmar oferta',
      amount: instant ? (view.bestAsk ?? n) : n,
      confirmLabel: instant ? 'Comprar agora' : 'Fazer oferta',
      lines: [
        ['Edição', def.name],
        [instant ? 'Menor anúncio (você paga)' : 'Sua oferta', <span className="mk-money" key="p"><IcCoin size={15} />{fmt(instant ? (view.bestAsk ?? n) : n)}</span>],
        ['Saldo depois', <span className="mk-money" key="s"><IcCoin size={15} />{fmt(coins - (instant ? (view.bestAsk ?? n) : n))}</span>],
        ...(instant ? [] : ([['Validade', MARKET_CFG.durations.find((d) => d.ms === dur)?.label ?? '']] as Array<[string, ReactNode]>)),
      ],
      note: instant ? `Como a sua oferta cobre o menor anúncio, a compra é feita na hora. A peça nova fica com trava de troca de ${Math.round(MARKET_CFG.tradeLockMs / 3600000)} h.` : 'O valor da oferta fica reservado até ela ser aceita, cancelada ou expirar. Se aceita por menos, o troco volta para você.',
      run: () => market().placeBid(editionId, n, dur),
    })
  }

  return (
    <>
      <Modal onClose={onClose} label="Fazer oferta">
        <h3 className="mk-dlg__title">Oferta por {def.name}</h3>
        <p className="mk-hint">
          Qualquer cópia da edição serve. Preço de mercado: <b>{fmt(view.price)}</b> · maior oferta: <b>{view.bestBid ? fmt(view.bestBid) : '—'}</b>
        </p>
        <PriceField value={price} onChange={setPrice} band={band} ref0={view.price} />
        <DurationField value={dur} onChange={setDur} label="Validade da oferta" />
        <p className="mk-hint">
          Saldo: <b>{fmt(coins)}</b> Brilhos {n && !enough && <span className="mk-err">— insuficiente</span>}
        </p>
        <div className="mk-dlg__foot">
          <button type="button" className="mk-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="mk-btn mk-btn--ink" disabled={!okPrice || !enough} onClick={submit}>
            Revisar
          </button>
        </div>
      </Modal>
      {confirm && (
        <ConfirmDialog
          spec={confirm}
          onClose={() => {
            setConfirm(null)
            onClose()
          }}
        />
      )}
    </>
  )
}

/** Host das janelas globais (venda aberta por outras telas). */
export function SellHost() {
  const sellFor = useMarketUi((s) => s.sellFor)
  const setSellFor = useMarketUi((s) => s.setSellFor)
  const inst: EditionInstance | undefined = useInventory((s) => (sellFor ? s.instances[sellFor] : undefined))
  if (!sellFor || !inst) return null
  return <SellDialog editionId={inst.editionId} instanceId={inst.id} onClose={() => setSellFor(null)} />
}

