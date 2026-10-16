import { useEffect, useState } from 'react'
import { dayKey } from '../../game/economy/clock'
import { useEconomyStore } from '../../game/economy/economyStore'
import { useProfileStore } from '../../state/profileStore'
import { useUiStore } from '../../state/uiStore'
import { useMinigameStore } from '../../game/minigames/minigameStore'
import { IconCheck } from '../menu/icons'
import { IconGift, IconDiamante } from './icons'
import { PurchaseDialog } from './PurchaseDialog'
import { ShopScreen } from './ShopScreen'
import { useShopStore } from './shopStore'
import './shop.css'

/** Aviso discreto de conquista/nivel (Diamantes ganhos). */
function Notice() {
  const n = useEconomyStore((s) => s.notice)
  useEffect(() => {
    if (!n) return
    const t = window.setTimeout(() => useEconomyStore.getState().dismissNotice(), 4200)
    return () => window.clearTimeout(t)
  }, [n])
  if (!n) return null
  return (
    <div className="sh-notice glass" key={n.id} role="status">
      <IconDiamante width={26} height={26} />
      <span>
        <b>{n.text}</b>
        {n.sub && <small>{n.sub}</small>}
      </span>
    </div>
  )
}

/** Convite da recompensa diária (uma vez por dia, some quando resgatada ou dispensada). */
function DailyInvite() {
  const last = useEconomyStore((s) => s.lastClaim)
  const claim = useEconomyStore((s) => s.claimDaily)
  const named = useProfileStore((s) => s.named)
  const busy = useUiStore((s) => s.menuOpen || s.phoneOpen || s.cameraMode)
  const shop = useShopStore((s) => s.open)
  const mg = useMinigameStore((s) => s.active)
  const [hide, setHide] = useState(false)
  const [got, setGot] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 6000)
    return () => window.clearTimeout(t)
  }, [])
  useEffect(() => {
    if (!got) return
    const t = window.setTimeout(() => setGot(null), 3500)
    return () => window.clearTimeout(t)
  }, [got])
  const pending = last !== dayKey()
  if (got)
    return (
      <div className="sh-daily-invite glass" role="status">
        <IconCheck /> <b>{got}</b>
      </div>
    )
  if (!ready || hide || !pending || !named || busy || shop || mg) return null
  return (
    <div className="sh-daily-invite glass" role="status">
      <IconGift />
      <span>Recompensa diária disponível</span>
      <button
        type="button"
        className="sh-btn sh-btn--buy sh-btn--sm"
        onClick={() => {
          const r = claim()
          if (r) setGot(`+${r.brilhos} Brilhos${r.diamantes ? ` e +${r.diamantes} Diamantes` : ''} · dia ${r.streak}`)
        }}
      >
        Resgatar
      </button>
      <button type="button" className="sh-link" onClick={() => setHide(true)}>
        Depois
      </button>
    </div>
  )
}

/** Hospeda a loja da cidade, a janela de compra, o convite diário e os avisos da economia. */
export function ShopHost() {
  return (
    <>
      <ShopScreen />
      <DailyInvite />
      <Notice />
      <PurchaseDialog />
    </>
  )
}
