import { interact, useInteractionStore } from '../../game/interaction/interactionStore'
import { useMinigameStore } from '../../game/minigames/minigameStore'
import { useShopStore } from '../shop/shopStore'
import { useDeviceStore } from '../../game/systems/device'
import './cafe/cafe.css'

const KEYS = ['E', 'R', 'T', 'Y']

/** Aviso na parte de baixo da tela quando o jogador chega perto de uma porta. */
export function InteractionPrompt() {
  const nearby = useInteractionStore((s) => s.nearby)
  const active = useMinigameStore((s) => s.active)
  const isTouch = useDeviceStore((s) => s.isTouch)
  const shopOpen = useShopStore((s) => s.open)
  if (!nearby || active || shopOpen) return null
  const shops = nearby.shops ?? []
  if (nearby.minigames.length === 0 && shops.length === 0) {
    return (
      <div className="ia-prompt ia-prompt--soon" key={nearby.id} role="status">
        <span className="ia-name">{nearby.name}</span>
        <span className="ia-sub">Em breve</span>
      </div>
    )
  }
  const entries = [...nearby.minigames.map((g) => ({ id: g.id, label: g.label })), ...shops.map((s) => ({ id: `shop:${s.id}`, label: s.label }))]
  const single = entries.length === 1
  return (
    <div className="ia-prompt" key={nearby.id} role="status">
      <span className="ia-name">{nearby.name}</span>
      {entries.map((g, i) =>
        isTouch || !single ? (
          <button className="ia-btn" key={g.id} onClick={() => interact(i)}>
            {!isTouch && KEYS[i] && <span className="ia-key">{KEYS[i]}</span>} {single ? (nearby.minigames.length ? 'Jogar' : g.label) : g.label}
          </button>
        ) : (
          <span className="ia-sub" key={g.id}>
            <span className="ia-key">E</span> {nearby.minigames.length ? 'Jogar' : g.label}
          </span>
        ),
      )}
    </div>
  )
}
