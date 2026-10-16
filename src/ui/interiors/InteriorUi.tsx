import { useInteriorStore } from '../../game/interiors/interiorStore'
import { triggerPrompt } from '../../game/interiors/actions'
import { ROOMS_BY_ID } from '../../game/interiors/rooms'
import { useDeviceStore } from '../../game/systems/device'
import { useMinigameStore } from '../../game/minigames/minigameStore'
import { useShopStore } from '../shop/shopStore'
import { useSitStore } from '../../game/sit/sitStore'
import './interiors.css'

const DoorIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21" />
    <path d="M3.5 21h17" />
    <circle cx="14.5" cy="12.5" r="0.9" fill="currentColor" />
  </svg>
)

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
)

/** Interface dos interiores: nome da sala, aviso de uso/saida, mensagens e o escurecer do sono. */
export function InteriorUi() {
  const roomId = useInteriorStore((s) => s.roomId)
  const prompt = useInteriorStore((s) => s.prompt)
  const msg = useInteriorStore((s) => s.msg)
  const dark = useInteriorStore((s) => s.dark)
  const isTouch = useDeviceStore((s) => s.isTouch)
  const mg = useMinigameStore((s) => s.active)
  const shop = useShopStore((s) => s.open)
  const seated = useSitStore((s) => s.seat !== null)
  const room = roomId ? ROOMS_BY_ID[roomId] : null

  return (
    <>
      {room && (
        <div className="in-label glass" role="status">
          <PinIcon />
          <span>{room.label}</span>
        </div>
      )}
      {room && prompt && !mg && !shop && !seated && (
        <div className="in-prompt" key={prompt.key} role="status">
          {isTouch ? (
            <button type="button" className="in-btn" onClick={() => triggerPrompt()}>
              {prompt.spot.action === 'exit' && <DoorIcon />} {prompt.label}
            </button>
          ) : (
            <span className="in-text">
              <span className="in-key">E</span> {prompt.spot.action === 'exit' && <DoorIcon />} {prompt.label}
            </span>
          )}
        </div>
      )}
      {msg && (
        <div className="in-msg glass" key={msg.id} role="status" aria-live="polite">
          <b>{msg.text}</b>
          {msg.sub && <span>{msg.sub}</span>}
        </div>
      )}
      <div className="in-dark" aria-hidden style={{ opacity: dark, pointerEvents: dark > 0 ? 'auto' : 'none' }} />
    </>
  )
}
