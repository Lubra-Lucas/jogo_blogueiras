import { useAppearanceStore } from '../../state/appearanceStore'
import { SALON_COLORS } from '../../game/economy/prices'
import { useProfileStore } from '../../state/profileStore'
import { CurrencyIcon, fmt } from './parts'
import { useShopStore } from './shopStore'

/** Serviços do salão: coloração premium (sumidouro de Brilhos). Aplica a cor ao cabelo vestido. */
export function SalonServices() {
  const hair = useAppearanceStore((s) => s.appearance.hair)
  const setAppearance = useAppearanceStore((s) => s.setAppearance)
  const ask = useShopStore((s) => s.ask)
  const coins = useProfileStore((s) => s.coins)

  return (
    <div className="sh-salon">
      <p className="sh-fine">
        Escolha uma coloração para o cabelo que você está usando{hair.id ? '' : ' (vista um cabelo primeiro)'}. O serviço é cobrado em Brilhos e a cor fica aplicada no seu look.
      </p>
      <div className="sh-grid sh-grid--svc">
        {SALON_COLORS.map((c) => {
          const same = hair.color.toLowerCase() === c.color.toLowerCase()
          return (
            <div className="sh-card sh-card--svc" key={c.id}>
              <span className="sh-swatch" style={{ background: c.color }} aria-hidden />
              <div className="sh-card__name">{c.label}</div>
              <div className="sh-card__note">{c.blurb}</div>
              <div className="sh-card__prices">
                <span className="sh-money sh-money--brilhos">
                  <CurrencyIcon currency="brilhos" size={15} />
                  <b>{fmt(c.price)}</b>
                </span>
              </div>
              <div className="sh-card__act">
                <button
                  type="button"
                  className="sh-btn sh-btn--buy"
                  disabled={!hair.id || same || coins < c.price}
                  onClick={() =>
                    ask({
                      kind: 'service',
                      label: `Salão: ${c.label}`,
                      currency: 'brilhos',
                      price: c.price,
                      onDone: () => {
                        const a = useAppearanceStore.getState().appearance
                        setAppearance({ ...a, hair: { ...a.hair, color: c.color } })
                      },
                    })
                  }
                >
                  {same ? 'Cor atual' : coins < c.price ? 'Saldo insuficiente' : 'Aplicar'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
