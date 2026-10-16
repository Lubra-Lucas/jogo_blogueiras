import type { ReactNode } from 'react'
import { dealsEndAt, useSellables, useStatuses, weeklyExclusives, type Sellable } from '../../game/economy/sellables'
import { formatCountdown } from '../../game/economy/clock'
import type { ShopId } from '../../game/economy/types'
import { GROUPS } from './Catalog'
import { IconClock, IconSparkle, IconTag, IconDiamante } from './icons'
import { ItemCard, useNow, type CardCtx } from './parts'

function Rail({ icon, title, sub, children }: { icon: ReactNode; title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="sh-rail">
      <header>
        <span className="sh-rail__ic">{icon}</span>
        <h3>{title}</h3>
        {sub && <small>{sub}</small>}
      </header>
      <div className="sh-rail__row">{children}</div>
    </section>
  )
}

/** Vitrine: novidades, promoções do dia e exclusivos da semana. */
export function Vitrine({ shop, ctx, onDiamonds }: { shop: ShopId | 'tudo'; ctx: CardCtx; onDiamonds?: () => void }) {
  const all = useSellables()
  const statuses = useStatuses(all)
  const now = useNow(30000)
  const inShop = (s: Sellable) => (shop === 'tudo' ? s.kind === 'hair' || s.kind === 'garment' || s.kind === 'jewelry' : GROUPS[shop][0].test(s))
  const scope = all.filter(inShop)
  const state = (s: Sellable) => statuses.get(s.id)!

  const novidades = scope.filter((s) => s.novo && state(s).state === 'buyable').slice(0, 8)
  const promo = scope.filter((s) => state(s).dealPct && state(s).state === 'buyable')
  const exc = weeklyExclusives(all, now)
  const live = exc.live.filter(inShop)
  const next = exc.next.filter(inShop)

  const card = (s: Sellable) => <ItemCard key={s.id} s={s} st={state(s)} ctx={ctx} />

  return (
    <div className="sh-vit">
      {live.length + next.length > 0 && (
        <Rail icon={<IconDiamante />} title="Exclusivos da semana" sub="Só por Diamantes agora; depois entram na loja de Brilhos por um preço alto.">
          {live.map(card)}
          {next.map(card)}
          {onDiamonds && (
            <button type="button" className="sh-rail__cta" onClick={onDiamonds}>
              <IconDiamante />
              <span>Conseguir Diamantes</span>
            </button>
          )}
        </Rail>
      )}
      {promo.length > 0 && (
        <Rail icon={<IconTag />} title="Em promoção" sub={`Ofertas do dia · renovam em ${formatCountdown(dealsEndAt(now) - now)}`}>
          {promo.map(card)}
        </Rail>
      )}
      {novidades.length > 0 && (
        <Rail icon={<IconSparkle />} title="Novidades">
          {novidades.map(card)}
        </Rail>
      )}
      {live.length + next.length + promo.length + novidades.length === 0 && (
        <div className="sh-empty">
          <IconClock /> Nenhum destaque agora. Veja o catálogo completo.
        </div>
      )}
    </div>
  )
}
