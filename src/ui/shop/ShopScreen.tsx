import { Suspense, useEffect, useRef } from 'react'
import { clearMoveTarget, setKeyboardAxis, setKeyboardCameraYaw, setStickAxis } from '../../game/input/intent'
import { useCatalogStore } from '../../game/character/catalog'
import { dayKey } from '../../game/economy/clock'
import { useEconomyStore } from '../../game/economy/economyStore'
import { CharacterPreview } from '../menu/CharacterPreview'
import { IconClose } from '../menu/icons'
import { Catalog } from './Catalog'
import { DailyPanel } from './DailyPanel'
import { PremiumStore } from './PremiumStore'
import { SalonServices } from './SalonServices'
import { Vitrine } from './Vitrine'
import { WalletChips } from './parts'
import { getShop } from './registry'
import { useShopStore, type ShopTab } from './shopStore'
import { endTryOn, useTryStore } from './tryon'
import { IconBrilho } from './icons'

const stopMoving = () => {
  setKeyboardAxis(0, 0, false)
  setStickAxis(0, 0, false)
  setKeyboardCameraYaw(0)
  clearMoveTarget()
}

const TAB_LABEL: Record<ShopTab, string> = { vitrine: 'Vitrine', catalogo: 'Catálogo', servicos: 'Serviços', diamantes: 'Diamantes', diario: 'Diário' }

/** Loja da cidade em tela cheia: vitrine, catálogo, serviços, Diamantes e diário; personagem 3D para provar. */
export function ShopScreen() {
  const open = useShopStore((s) => s.open)
  const tab = useShopStore((s) => s.tab)
  const setTab = useShopStore((s) => s.setTab)
  const close = useShopStore((s) => s.closeShop)
  const shop = getShop(open)
  const tried = useTryStore((s) => s.tried)
  const items = useCatalogStore((s) => s.items)
  const rot = useRef({ yaw: 0 })
  const drag = useRef<{ x: number; yaw: number } | null>(null)

  useEffect(() => {
    if (!open) return
    stopMoving()
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        // a janela de confirmacao fecha primeiro
        if (useShopStore.getState().confirm) return
        e.stopPropagation()
        close()
        return
      }
      const t = e.target
      if (t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    const timer = window.setInterval(stopMoving, 150)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.clearInterval(timer)
      stopMoving()
      endTryOn()
    }
  }, [open, close])

  if (!open || !shop || open === 'petshop') return null
  const tabs: ShopTab[] = open === 'salao' ? ['vitrine', 'catalogo', 'servicos', 'diamantes', 'diario'] : ['vitrine', 'catalogo', 'diamantes', 'diario']
  const ctx = { stage: true }
  const names = tried.map((id) => ({ id, label: items[id]?.label ?? id }))

  return (
    <div className="sh-root" role="dialog" aria-modal="true" aria-label={shop.title} data-shop={open}>
      <div className="sh-shell">
        <div className="sh-inner">
          <header className="sh-head">
            <div>
              <h2>{shop.title}</h2>
              <small>{shop.blurb}</small>
            </div>
            <WalletChips onDiamonds={() => setTab('diamantes')} />
            <button type="button" className="sh-x" aria-label="Fechar loja" onClick={close}>
              <IconClose width={18} height={18} />
            </button>
          </header>
          <div className="sh-tabs" role="tablist">
            {tabs.map((t) => (
              <button key={t} type="button" role="tab" className="sh-tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                {t === 'diario' && <DailyDot />}
                {TAB_LABEL[t]}
              </button>
            ))}
          </div>
          <div className="sh-body">
            <div
              className="sh-stage"
              onPointerDown={(e) => {
                drag.current = { x: e.clientX, yaw: rot.current.yaw }
                e.currentTarget.setPointerCapture(e.pointerId)
              }}
              onPointerMove={(e) => {
                if (drag.current) rot.current.yaw = drag.current.yaw + (e.clientX - drag.current.x) * 0.012
              }}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
            >
              <Suspense fallback={<div className="sh-stage__load">Carregando...</div>}>
                <CharacterPreview focus="body" rot={rot} />
              </Suspense>
              <div className="sh-stage__tip">Arraste para girar</div>
              {names.length > 0 && (
                <div className="sh-tray" onPointerDown={(e) => e.stopPropagation()}>
                  <b>Provando</b>
                  {names.map((n) => (
                    <button key={n.id} type="button" className="sh-tray__chip" onClick={() => useShopStore.getState().ask({ kind: 'item', id: n.id, canWear: true })}>
                      {n.label} · Comprar
                    </button>
                  ))}
                  <button type="button" className="sh-tray__clear" onClick={endTryOn}>
                    Tirar provas
                  </button>
                </div>
              )}
            </div>
            <div className="sh-content">
              {tab === 'vitrine' && <Vitrine shop={open} ctx={ctx} onDiamonds={() => setTab('diamantes')} />}
              {tab === 'catalogo' && <Catalog shop={open} ctx={ctx} />}
              {tab === 'servicos' && <SalonServices />}
              {tab === 'diamantes' && <PremiumStore />}
              {tab === 'diario' && <DailyPanel />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DailyDot() {
  const last = useEconomyStore((s) => s.lastClaim)
  return last !== dayKey() ? <IconBrilho className="sh-tab__dot" width={12} height={12} /> : null
}
