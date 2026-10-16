import { useInteractionStore } from '../../game/interaction/interactionStore'
import { useSitStore } from '../../game/sit/sitStore'
import { useDeviceStore } from '../../game/systems/device'
import './sit.css'

/** "Sentar [E]" (desktop) / botao "Sentar" (mobile) perto de um banco; sentada: dica para levantar. */
export function SitPrompt() {
  const nearest = useSitStore((s) => s.nearest)
  const seat = useSitStore((s) => s.seat)
  const stacked = useInteractionStore((s) => s.nearby !== null)
  const isTouch = useDeviceStore((s) => s.isTouch)
  if (seat) {
    return (
      <div className={`sit-prompt sit-prompt--hint${stacked ? ' sit-prompt--stacked' : ''}`} role="status">
        <span className="sit-sub">{isTouch ? 'Mova o joystick para levantar' : 'Mova-se (WASD) para levantar'}</span>
      </div>
    )
  }
  if (!nearest) return null
  return (
    <div className={`sit-prompt${stacked ? ' sit-prompt--stacked' : ''}`} key={nearest.id} role="status">
      <span className="sit-name">Banco</span>
      {isTouch ? (
        <button type="button" className="sit-btn" onClick={() => useSitStore.getState().sitDown(nearest)}>
          Sentar
        </button>
      ) : (
        <span className="sit-sub">
          <span className="sit-key">E</span> Sentar
        </span>
      )}
    </div>
  )
}
