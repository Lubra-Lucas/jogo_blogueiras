import { useEffect, useMemo, useState } from 'react'
import { useProfileStore } from '../../state/profileStore'
import { useUiStore } from '../../state/uiStore'
import { useAppearanceStore } from '../../state/appearanceStore'
import { equip, isEquipped } from '../../game/character/outfit'
import { RARITY_COLORS, RARITY_LABELS } from '../../game/character/itemTags'
import { economy } from '../../game/economy/service'
import { useEconomyStore } from '../../game/economy/economyStore'
import { buildSellables, type Sellable } from '../../game/economy/sellables'
import { useCatalogStore } from '../../game/character/catalog'
import type { Currency, ItemStatus } from '../../game/economy/types'
import { IconCheck } from '../menu/icons'
import { IconShield } from './icons'
import { CurrencyIcon, ItemArt, fmt } from './parts'
import { useShopStore, type ConfirmRequest } from './shopStore'
import { commitTried } from './tryon'

type Phase = { t: 'ask' } | { t: 'busy' } | { t: 'done'; message: string } | { t: 'fail'; message: string; saldo?: boolean }

const CUR_NAME: Record<Currency, string> = { brilhos: 'Brilhos', diamantes: 'Diamantes' }

/** Janela de confirmacao: preço exato, saldo atual e saldo depois; resultado da compra. */
export function PurchaseDialog() {
  const req = useShopStore((s) => s.confirm)
  if (!req) return null
  return <Dialog key={req.kind === 'item' ? req.id : req.label} req={req} />
}

function Dialog({ req }: { req: ConfirmRequest }) {
  const dismiss = useShopStore((s) => s.dismiss)
  const coins = useProfileStore((s) => s.coins)
  const diamonds = useProfileStore((s) => s.diamonds)
  const items = useCatalogStore((s) => s.items)
  const [phase, setPhase] = useState<Phase>({ t: 'ask' })

  const sellable: Sellable | null = useMemo(() => (req.kind === 'item' ? (buildSellables(items).find((x) => x.id === req.id) ?? null) : null), [req, items])
  const status: ItemStatus | null = useMemo(() => (req.kind === 'item' ? economy().quote(req.id) : null), [req])
  const offers = req.kind === 'item' ? (status?.offers ?? []) : [{ currency: req.kind === 'service' ? req.currency : ('brilhos' as Currency), price: req.price }]
  const [cur, setCur] = useState<Currency>(offers[0]?.currency ?? 'brilhos')
  const offer = offers.find((o) => o.currency === cur) ?? offers[0]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.stopPropagation()
        dismiss()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [dismiss])

  if (!offer) return null
  const balance = cur === 'brilhos' ? coins : diamonds
  const after = balance - offer.price
  const title = req.kind === 'item' ? (sellable?.label ?? req.id) : req.label

  const getDiamonds = () => {
    dismiss()
    if (useUiStore.getState().phoneOpen) useShopStore.getState().setPhoneTab('diamantes')
    else if (useShopStore.getState().open) useShopStore.getState().setTab('diamantes')
    else {
      useUiStore.getState().openPhone()
      useUiStore.getState().setPhoneApp('loja')
      useShopStore.getState().setPhoneTab('diamantes')
    }
  }

  const confirm = async () => {
    setPhase({ t: 'busy' })
    if (req.kind === 'item') {
      const r = await economy().purchaseItem(req.id, cur)
      if (r.ok) {
        commitTried(req.id)
        setPhase({ t: 'done', message: r.message })
      } else setPhase({ t: 'fail', message: r.message, saldo: r.reason === 'saldo' })
    } else {
      const label = req.kind === 'finish' ? `Acabamento: ${req.label}` : req.label
      const r = await economy().purchaseService(label, cur, offer.price)
      if (r.ok) {
        if (req.kind === 'finish') useEconomyStore.getState().unlockFinish(req.finish)
        req.onDone?.()
        setPhase({ t: 'done', message: req.kind === 'finish' ? `Acabamento ${req.label.toLowerCase()} liberado.` : (req.doneMessage ?? r.message) })
      } else setPhase({ t: 'fail', message: r.message, saldo: r.reason === 'saldo' })
    }
  }

  const wearNow = () => {
    if (req.kind !== 'item') return
    const a = useAppearanceStore.getState()
    if (!isEquipped(a.appearance, req.id)) a.setAppearance(equip(a.appearance, req.id))
    dismiss()
  }
  const canWear = req.kind === 'item' && req.canWear && !isEquipped(useAppearanceStore.getState().appearance, req.id)

  return (
    <div className="sh-dlg-root" role="presentation" onPointerDown={(e) => e.target === e.currentTarget && phase.t !== 'busy' && dismiss()}>
      <div className="sh-dlg" role="dialog" aria-modal="true" aria-label={`Confirmar compra: ${title}`}>
        {phase.t === 'done' ? (
          <>
            <div className="sh-dlg__ok">
              <IconCheck />
            </div>
            <h3>Compra concluída</h3>
            <p>{phase.message}</p>
            <div className="sh-dlg__bal">
              Saldo agora: <CurrencyIcon currency={cur} /> <b>{fmt(cur === 'brilhos' ? coins : diamonds)}</b> {CUR_NAME[cur]}
            </div>
            <div className="sh-dlg__act">
              {canWear && (
                <button type="button" className="sh-btn sh-btn--buy" onClick={wearNow}>
                  Vestir agora
                </button>
              )}
              <button type="button" className="sh-btn sh-btn--ghost" onClick={dismiss}>
                Fechar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="sh-dlg__head">
              {sellable && (
                <div className="sh-dlg__art" style={{ ['--rar' as string]: RARITY_COLORS[sellable.rarity] }}>
                  <ItemArt s={sellable} />
                </div>
              )}
              <div>
                <h3>{title}</h3>
                {sellable && <span className="sh-dlg__rar">{RARITY_LABELS[sellable.rarity]}</span>}
              </div>
            </div>
            {offers.length > 1 && (
              <div className="sh-pills" role="radiogroup" aria-label="Pagar com">
                {offers.map((o) => (
                  <button key={o.currency} type="button" role="radio" aria-checked={cur === o.currency} className="sh-pill" aria-selected={cur === o.currency} onClick={() => setCur(o.currency)}>
                    <CurrencyIcon currency={o.currency} /> {fmt(o.price)} {CUR_NAME[o.currency]}
                  </button>
                ))}
              </div>
            )}
            <dl className="sh-dlg__sum">
              <div>
                <dt>Preço</dt>
                <dd>
                  <CurrencyIcon currency={cur} /> <b>{fmt(offer.price)}</b> {CUR_NAME[cur]}
                  {offer.original && <s> {fmt(offer.original)}</s>}
                </dd>
              </div>
              <div>
                <dt>Seu saldo</dt>
                <dd>
                  {fmt(balance)} {CUR_NAME[cur]}
                </dd>
              </div>
              <div className={after < 0 ? 'is-neg' : ''}>
                <dt>Saldo depois</dt>
                <dd>{after < 0 ? `faltam ${fmt(-after)}` : `${fmt(after)} ${CUR_NAME[cur]}`}</dd>
              </div>
            </dl>
            {phase.t === 'fail' && <p className="sh-dlg__err">{phase.message}</p>}
            <p className="sh-dlg__fine">
              <IconShield /> Sem sorteios: você paga o preço mostrado e leva a peça.
            </p>
            <div className="sh-dlg__act">
              {after < 0 && cur === 'diamantes' ? (
                <button type="button" className="sh-btn sh-btn--buy" onClick={getDiamonds}>
                  Conseguir Diamantes
                </button>
              ) : (
                <button type="button" className="sh-btn sh-btn--buy" disabled={after < 0 || phase.t === 'busy'} onClick={confirm}>
                  {phase.t === 'busy' ? 'Comprando...' : after < 0 ? 'Saldo insuficiente' : 'Confirmar compra'}
                </button>
              )}
              <button type="button" className="sh-btn sh-btn--ghost" onClick={dismiss} disabled={phase.t === 'busy'}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
