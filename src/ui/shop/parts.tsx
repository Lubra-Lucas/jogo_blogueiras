import { useEffect, useState, type CSSProperties } from 'react'
import { useProfileStore } from '../../state/profileStore'
import { useAppearanceStore } from '../../state/appearanceStore'
import { isEquipped, equip, unequip } from '../../game/character/outfit'
import { RARITY_COLORS, RARITY_LABELS } from '../../game/character/itemTags'
import { economyNow, formatCountdown } from '../../game/economy/clock'
import type { Sellable } from '../../game/economy/sellables'
import type { Currency, ItemStatus, Offer } from '../../game/economy/types'
import { SLOT_ICONS, IconCheck } from '../menu/icons'
import { IconBrilho, IconCar, IconClock, IconDiamante, IconEye, IconHouse, IconLockSmall } from './icons'
import { useShopStore } from './shopStore'
import { useUiStore } from '../../state/uiStore'
import { openMarket } from '../market/marketUi'
import { toggleTry, useTryStore } from './tryon'

/** Relogio que se atualiza a cada `ms` (contagens regressivas). */
export function useNow(ms = 30000): number {
  const [n, setN] = useState(economyNow())
  useEffect(() => {
    const t = window.setInterval(() => setN(economyNow()), ms)
    return () => window.clearInterval(t)
  }, [ms])
  return n
}

export const fmt = (n: number) => n.toLocaleString('pt-BR')

export function CurrencyIcon({ currency, size = 16 }: { currency: Currency; size?: number }) {
  const C = currency === 'brilhos' ? IconBrilho : IconDiamante
  return <C width={size} height={size} className="sh-cur" />
}

export function Money({ offer, big }: { offer: Offer; big?: boolean }) {
  return (
    <span className={`sh-money sh-money--${offer.currency}${big ? ' sh-money--big' : ''}`} title={offer.currency === 'brilhos' ? 'Brilhos' : 'Diamantes'}>
      <CurrencyIcon currency={offer.currency} size={big ? 20 : 15} />
      {offer.original && <s>{fmt(offer.original)}</s>}
      <b>{fmt(offer.price)}</b>
    </span>
  )
}

/** Saldos da jogadora (Brilhos + Diamantes). */
export function WalletChips({ onDiamonds }: { onDiamonds?: () => void }) {
  const coins = useProfileStore((s) => s.coins)
  const diamonds = useProfileStore((s) => s.diamonds)
  return (
    <div className="sh-wallet" aria-label="Saldo">
      <span className="sh-wchip">
        <CurrencyIcon currency="brilhos" size={18} />
        <b>{fmt(coins)}</b>
      </span>
      <button type="button" className="sh-wchip sh-wchip--d" onClick={onDiamonds} disabled={!onDiamonds} title="Diamantes">
        <CurrencyIcon currency="diamantes" size={18} />
        <b>{fmt(diamonds)}</b>
        {onDiamonds && <i>+</i>}
      </button>
    </div>
  )
}

/** Icones sao tracos: cores quase brancas (ex.: Saia de baile rococo #fff0f6) somem no cartao claro; escurece ate dar contraste. */
export function iconTint(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const lum = (0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]) / 255
  if (lum < 0.72) return hex
  const t = Math.min(0.75, (lum - 0.6) * 2.2) // quanto mais claro, mais mistura com o rosa-escuro da interface
  const dark = [168, 98, 140]
  return '#' + ch.map((c, i) => Math.round(c + (dark[i] - c) * t).toString(16).padStart(2, '0')).join('')
}

export function ItemArt({ s }: { s: Sellable }) {
  const tint = iconTint(s.tint)
  if (s.kind === 'car') return <IconCar style={{ color: tint }} />
  if (s.kind === 'house') return <IconHouse style={{ color: tint }} />
  const Icon = SLOT_ICONS[s.slot ?? 'top']
  return <>{Icon({ style: { color: tint } })}</>
}

export interface CardCtx {
  /** loja com personagem 3D: mostra "Provar" e "Vestir" */
  stage: boolean
}

/** Cartao de produto: arte, nome, raridade, preco e acoes. */
export function ItemCard({ s, st, ctx }: { s: Sellable; st: ItemStatus; ctx: CardCtx }) {
  const now = useNow(60000)
  const ask = useShopStore((s2) => s2.ask)
  const appearance = useAppearanceStore((a) => a.appearance)
  const setAppearance = useAppearanceStore((a) => a.setAppearance)
  const tried = useTryStore((t) => t.tried.includes(s.id))
  const worn = ctx.stage && isEquipped(appearance, s.id)
  const rar = RARITY_COLORS[s.rarity]
  const wearable = s.kind === 'hair' || s.kind === 'garment' || s.kind === 'jewelry'
  const timer = st.windowEndsAt ? `Diamantes por mais ${formatCountdown(st.windowEndsAt - now)}` : st.releasesAt ? `Chega em ${formatCountdown(st.releasesAt - now)}` : null

  return (
    <div className={`sh-card${st.state === 'owned' ? ' is-owned' : ''}${tried ? ' is-tried' : ''}`} style={{ ['--rar' as string]: rar } as CSSProperties}>
      <div className="sh-card__art">
        <ItemArt s={s} />
        {st.dealPct && <span className="sh-badge sh-badge--deal">-{st.dealPct}%</span>}
        {st.availability === 'exclusivo' && st.state !== 'owned' && <span className="sh-badge sh-badge--exc">Exclusivo</span>}
        {s.novo && st.state === 'buyable' && !st.dealPct && st.availability !== 'exclusivo' && <span className="sh-badge sh-badge--new">Novo</span>}
        {st.state === 'owned' && (
          <span className="sh-badge sh-badge--own">
            <IconCheck /> Sua
          </span>
        )}
      </div>
      <div className="sh-card__name">{s.label}</div>
      <div className="sh-card__rar">{RARITY_LABELS[s.rarity]}</div>
      {st.state === 'buyable' && (
        <div className="sh-card__prices">
          {st.offers.map((o) => (
            <Money key={o.currency} offer={o} />
          ))}
        </div>
      )}
      {timer && (
        <div className="sh-card__timer">
          <IconClock /> {timer}
        </div>
      )}
      {st.state === 'upcoming' && st.offers[0] && (
        <div className="sh-card__prices">
          <Money offer={st.offers[0]} />
        </div>
      )}
      {st.state === 'locked' &&
        (st.soon ? (
          <>
            <div className="sh-card__prices">
              {st.offers.map((o) => (
                <Money key={o.currency} offer={o} />
              ))}
            </div>
            <div className="sh-card__note">
              <IconLockSmall /> Em breve
            </div>
          </>
        ) : (
          <div className="sh-card__note">
            <IconLockSmall /> {st.note}
          </div>
        ))}
      {st.state === 'locked' && st.marketEdition && (
        <div className="sh-card__act">
          <button
            type="button"
            className="sh-btn sh-btn--buy"
            onClick={() => {
              useShopStore.getState().closeShop()
              useUiStore.getState().closePhone()
              openMarket({ edition: st.marketEdition })
            }}
          >
            Ver no Mercado
          </button>
        </div>
      )}
      <div className="sh-card__act">
        {st.state === 'buyable' && (
          <>
            {ctx.stage && wearable && (
              <button type="button" className={`sh-btn sh-btn--ghost${tried ? ' is-on' : ''}`} onClick={() => toggleTry(s.id)} aria-pressed={tried}>
                <IconEye /> {tried ? 'Provando' : 'Provar'}
              </button>
            )}
            <button type="button" className="sh-btn sh-btn--buy" onClick={() => ask({ kind: 'item', id: s.id, canWear: ctx.stage && wearable })}>
              Comprar
            </button>
          </>
        )}
        {st.state === 'owned' && ctx.stage && wearable && (
          <button type="button" className="sh-btn sh-btn--ghost" onClick={() => setAppearance(worn ? unequip(appearance, s.slot!) : equip(appearance, s.id))}>
            {worn ? 'Tirar' : 'Vestir'}
          </button>
        )}
      </div>
    </div>
  )
}
