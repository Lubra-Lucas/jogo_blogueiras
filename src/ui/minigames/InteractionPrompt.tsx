import { interact, useInteractionStore } from '../../game/interaction/interactionStore'
import { useMinigameStore } from '../../game/minigames/minigameStore'
import { useDeviceStore } from '../../game/systems/device'
import './cafe/cafe.css'

/** Aviso na parte de baixo da tela quando o jogador chega perto de uma porta. */
export function InteractionPrompt() {
  const nearby = useInteractionStore((s) => s.nearby)
  const active = useMinigameStore((s) => s.active)
  const isTouch = useDeviceStore((s) => s.isTouch)
  if (!nearby || active) return null
  if (!nearby.minigame) {
    return (
      <div className="ia-prompt ia-prompt--soon" key={nearby.id} role="status">
        <span className="ia-name">{nearby.name}</span>
        <span className="ia-sub">Em breve</span>
      </div>
    )
  }
  return (
    <div className="ia-prompt" key={nearby.id} role="status">
      <span className="ia-name">{nearby.name}</span>
      {isTouch ? (
        <button className="ia-btn" onClick={interact}>
          Jogar
        </button>
      ) : (
        <span className="ia-sub">
          <span className="ia-key">E</span> Jogar
        </span>
      )}
    </div>
  )
}
