import { useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useProfileStore } from '../../state/profileStore'
import { useEconomyStore } from '../../game/economy/economyStore'
import { economy } from '../../game/economy/service'
import { DIAMOND_PACKS, brl, paymentProvider, type DiamondPack } from '../../game/economy/payment'
import { monthKey } from '../../game/economy/clock'
import { IconShield, IconWallet } from './icons'
import { CurrencyIcon, fmt } from './parts'

const portal = (n: ReactNode) => createPortal(n, document.querySelector('.ui-layer') ?? document.body)

const LIMITS: Array<{ v: number | null; label: string }> = [
  { v: 0, label: 'Bloqueado' },
  { v: 25, label: 'R$ 25' },
  { v: 50, label: 'R$ 50' },
  { v: 100, label: 'R$ 100' },
  { v: 200, label: 'R$ 200' },
  { v: null, label: 'Sem limite' },
]

/** Portão parental (placeholder): pergunta de aritmética para adultos. */
function ParentalGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const q = useMemo(() => {
    const a = 12 + Math.floor(Math.random() * 18)
    const b = 11 + Math.floor(Math.random() * 18)
    return { a, b }
  }, [])
  const [v, setV] = useState('')
  const [err, setErr] = useState(false)
  const check = () => {
    if (Number(v) === q.a * 2 + q.b) {
      useEconomyStore.getState().openGate()
      onPass()
    } else {
      setErr(true)
      setV('')
    }
  }
  return portal(
    <div className="sh-dlg-root" role="presentation">
      <div className="sh-dlg" role="dialog" aria-modal="true" aria-label="Verificação para responsáveis">
        <div className="sh-dlg__ok sh-dlg__ok--gate">
          <IconShield />
        </div>
        <h3>Peça a um responsável</h3>
        <p>Compras de Diamantes envolvem dinheiro de verdade. Um adulto precisa autorizar. Para continuar, resolva:</p>
        <label className="sh-gate">
          <span>
            Quanto é 2 × {q.a} + {q.b}?
          </span>
          <input
            inputMode="numeric"
            autoFocus
            value={v}
            onChange={(e) => (setV(e.target.value.replace(/\D/g, '').slice(0, 4)), setErr(false))}
            onKeyDown={(e) => e.key === 'Enter' && check()}
            aria-invalid={err}
            aria-label="Resposta"
          />
        </label>
        {err && <p className="sh-dlg__err">Resposta incorreta. Tente de novo com um responsável.</p>}
        <p className="sh-dlg__fine">Isto é só um protótipo de verificação. Um jogo de verdade precisa de um fluxo parental real.</p>
        <div className="sh-dlg__act">
          <button type="button" className="sh-btn sh-btn--buy" onClick={check} disabled={!v}>
            Continuar
          </button>
          <button type="button" className="sh-btn sh-btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>,
  )
}

type Flow = { t: 'idle' } | { t: 'gate'; pack: DiamondPack; then: 'buy' } | { t: 'gate-limit'; v: number | null } | { t: 'confirm'; pack: DiamondPack } | { t: 'busy' } | { t: 'done'; pack: DiamondPack } | { t: 'blocked'; msg: string }

/** Loja Premium de Diamantes: MODO DE TESTE (nenhuma cobrança real). */
export function PremiumStore({ compact }: { compact?: boolean }) {
  const [flow, setFlow] = useState<Flow>({ t: 'idle' })
  const [view, setView] = useState<'pacotes' | 'historico' | 'extrato'>('pacotes')
  const eco = useEconomyStore()
  const ledger = useProfileStore((s) => s.ledger)
  const spent = useMemo(() => eco.spentThisMonthCents(), [eco.purchases]) // eslint-disable-line react-hooks/exhaustive-deps
  const limitCents = eco.monthlyLimitBrl === null ? Infinity : eco.monthlyLimitBrl * 100
  const provider = paymentProvider()

  const start = (pack: DiamondPack) => {
    if (spent + pack.cents > limitCents) {
      setFlow({ t: 'blocked', msg: limitCents === 0 ? 'Compras estão bloqueadas pelo limite mensal. Um responsável pode alterar nos ajustes abaixo.' : `Esta compra passaria do limite mensal (${brl(limitCents)}). Já gasto neste mês: ${brl(spent)}.` })
      return
    }
    setFlow(eco.gateOpen() ? { t: 'confirm', pack } : { t: 'gate', pack, then: 'buy' })
  }

  const pay = async (pack: DiamondPack) => {
    setFlow({ t: 'busy' })
    const r = await provider.pay(pack)
    if (!r.ok) return setFlow({ t: 'blocked', msg: r.error ?? 'O pagamento não foi concluído.' })
    const total = pack.diamonds + (pack.bonus ?? 0)
    await economy().creditDiamondPack(pack.id, total, r.receiptId)
    useEconomyStore.getState().recordPack({ packId: pack.id, diamonds: total, cents: pack.cents, mode: r.mode })
    setFlow({ t: 'done', pack })
  }

  const changeLimit = (v: number | null) => {
    const cur = eco.monthlyLimitBrl
    const raising = cur !== null && (v === null || v > cur)
    if (raising && !eco.gateOpen()) setFlow({ t: 'gate-limit', v })
    else eco.setMonthlyLimit(v)
  }

  return (
    <div className={`sh-prem${compact ? ' sh-prem--compact' : ''}`}>
      <div className="sh-test" role="status">
        <IconShield />
        <div>
          <b>Modo de teste — nenhuma cobrança real</b>
          <span>Os pacotes abaixo só creditam Diamantes neste aparelho. Os preços em reais são exemplos.</span>
        </div>
      </div>
      <div className="sh-pills" role="tablist">
        {(['pacotes', 'historico', 'extrato'] as const).map((v) => (
          <button key={v} type="button" role="tab" className="sh-pill" aria-selected={view === v} onClick={() => setView(v)}>
            {v === 'pacotes' ? 'Pacotes' : v === 'historico' ? 'Histórico de compras' : 'Extrato'}
          </button>
        ))}
      </div>

      {view === 'pacotes' && (
        <>
          <div className="sh-packs">
            {DIAMOND_PACKS.map((p) => (
              <button key={p.id} type="button" className="sh-pack" onClick={() => start(p)}>
                {p.tag && <span className="sh-pack__tag">{p.tag}</span>}
                <CurrencyIcon currency="diamantes" size={34} />
                <b>{fmt(p.diamonds)}</b>
                <small>{p.bonus ? `+${fmt(p.bonus)} de bônus` : p.label}</small>
                <span className="sh-pack__price">{brl(p.cents)}</span>
              </button>
            ))}
          </div>
          <section className="sh-limit">
            <h4>
              <IconWallet /> Limite mensal de gastos
            </h4>
            <p>
              Neste mês: <b>{brl(spent)}</b> {Number.isFinite(limitCents) ? `de ${brl(limitCents)}` : '(sem limite)'}. Aumentar ou remover o limite exige um responsável.
            </p>
            <div className="sh-pills">
              {LIMITS.map((l) => (
                <button key={l.label} type="button" className="sh-pill" aria-pressed={eco.monthlyLimitBrl === l.v} onClick={() => changeLimit(l.v)}>
                  {l.label}
                </button>
              ))}
            </div>
          </section>
          <p className="sh-fine">Diamantes também podem ser ganhos de graça: recompensa diária, conquistas e níveis. Itens exclusivos passam a ser vendidos por Brilhos depois da primeira semana.</p>
        </>
      )}

      {view === 'historico' && (
        <ul className="sh-list">
          {eco.purchases.length === 0 && <li className="sh-empty">Nenhuma compra de Diamantes ainda.</li>}
          {eco.purchases.map((p) => (
            <li key={p.id}>
              <span>
                <b>+{fmt(p.diamonds)} Diamantes</b>
                <small>
                  {new Date(p.t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {p.mode === 'teste' ? 'teste, sem cobrança' : 'cobrado'}
                </small>
              </span>
              <em>{brl(p.cents)}</em>
            </li>
          ))}
          {eco.purchases.length > 0 && (
            <li className="sh-list__sum">
              <span>Total no mês ({monthKey()})</span>
              <em>{brl(spent)}</em>
            </li>
          )}
        </ul>
      )}

      {view === 'extrato' && (
        <ul className="sh-list">
          {ledger.length === 0 && <li className="sh-empty">Sem movimentações.</li>}
          {ledger.map((e) => (
            <li key={e.id}>
              <span>
                <b>{e.reason}</b>
                <small>{new Date(e.t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small>
              </span>
              <em className={e.amount < 0 ? 'neg' : 'pos'}>
                <CurrencyIcon currency={e.currency} size={13} /> {e.amount > 0 ? '+' : ''}
                {fmt(e.amount)}
              </em>
            </li>
          ))}
          <li className="sh-fine">Mostra as últimas 50 movimentações.</li>
        </ul>
      )}

      {flow.t === 'gate' && <ParentalGate onCancel={() => setFlow({ t: 'idle' })} onPass={() => setFlow({ t: 'confirm', pack: flow.pack })} />}
      {flow.t === 'gate-limit' && (
        <ParentalGate
          onCancel={() => setFlow({ t: 'idle' })}
          onPass={() => {
            eco.setMonthlyLimit(flow.v)
            setFlow({ t: 'idle' })
          }}
        />
      )}
      {(flow.t === 'confirm' || flow.t === 'busy' || flow.t === 'done' || flow.t === 'blocked') &&
        portal(
        <div className="sh-dlg-root" role="presentation">
          <div className="sh-dlg" role="dialog" aria-modal="true" aria-label="Compra de Diamantes">
            {flow.t === 'confirm' && (
              <>
                <h3>Confirmar pacote</h3>
                <dl className="sh-dlg__sum">
                  <div>
                    <dt>Pacote</dt>
                    <dd>
                      <CurrencyIcon currency="diamantes" /> <b>{fmt(flow.pack.diamonds + (flow.pack.bonus ?? 0))}</b> Diamantes
                    </dd>
                  </div>
                  <div>
                    <dt>Preço (exemplo)</dt>
                    <dd>{brl(flow.pack.cents)}</dd>
                  </div>
                  <div>
                    <dt>Cobrança</dt>
                    <dd>Nenhuma: modo de teste</dd>
                  </div>
                </dl>
                <div className="sh-dlg__act">
                  <button type="button" className="sh-btn sh-btn--buy" onClick={() => pay(flow.pack)}>
                    Confirmar (teste)
                  </button>
                  <button type="button" className="sh-btn sh-btn--ghost" onClick={() => setFlow({ t: 'idle' })}>
                    Cancelar
                  </button>
                </div>
              </>
            )}
            {flow.t === 'busy' && <h3>Processando...</h3>}
            {flow.t === 'done' && (
              <>
                <h3>Diamantes creditados</h3>
                <p>
                  +{fmt(flow.pack.diamonds + (flow.pack.bonus ?? 0))} Diamantes adicionados ao seu saldo. Nenhum valor foi cobrado.
                </p>
                <div className="sh-dlg__act">
                  <button type="button" className="sh-btn sh-btn--buy" onClick={() => setFlow({ t: 'idle' })}>
                    Fechar
                  </button>
                </div>
              </>
            )}
            {flow.t === 'blocked' && (
              <>
                <h3>Compra não realizada</h3>
                <p>{flow.msg}</p>
                <div className="sh-dlg__act">
                  <button type="button" className="sh-btn sh-btn--ghost" onClick={() => setFlow({ t: 'idle' })}>
                    Entendi
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        )}
    </div>
  )
}
