import { interact, useInteractionStore } from '../../game/interaction/interactionStore'
import { useMinigameStore } from '../../game/minigames/minigameStore'
import { useDeviceStore } from '../../game/systems/device'
import './cafe/cafe.css'

const KEYS = ['E', 'R', 'T']

/** Aviso na parte de baixo da tela quando o jogador chega perto de uma porta. */
export function InteractionPrompt() {
  const nearby = useInteractionStore((s) => s.nearby)
  const active = useMinigameStore((s) => s.active)
  const isTouch = useDeviceStore((s) => s.isTouch)
  if (!nearby || active) return null
  if (nearby.minigames.length === 0) {
    return (
      <div className="ia-prompt ia-prompt--soon" key={nearby.id} role="status">
        <span className="ia-name">{nearby.name}</span>
        <span className="ia-sub">Em breve</span>
      </div>
    )
  }
  const single = nearby.minigames.length === 1
  return (
    <div className="ia-prompt" key={nearby.id} role="status">
      <span className="ia-name">{nearby.name}</span>
      {nearby.minigames.map((g, i) =>
        isTouch || !single ? (
          <button className="ia-btn" key={g.id} onClick={() => interact(i)}>
            {!isTouch && KEYS[i] && <span className="ia-key">{KEYS[i]}</span>} {single ? 'Jogar' : g.label}
          </button>
        ) : (
          <span className="ia-sub" key={g.id}>
            <span className="ia-key">E</span> Jogar
          </span>
        ),
      )}
    </div>
  )
}
