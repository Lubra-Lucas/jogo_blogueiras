import { useEffect, useState } from 'react'
import { EMOTES, useEmoteStore } from '../game/character/animation/emoteStore'
import { useDeviceStore } from '../game/systems/device'
import './emotes.css'

/** Botao de emotes (canto inferior direito) + lista; atalhos 1/2/3 ficam no KeyboardInput. Aviso com o nome do emote. */
export function EmoteMenu() {
  const [open, setOpen] = useState(false)
  const isTouch = useDeviceStore((s) => s.isTouch)
  const emote = useEmoteStore((s) => s.emote)
  const desfile = useEmoteStore((s) => s.desfile)
  const toast = useEmoteStore((s) => s.toast)
  const trigger = useEmoteStore((s) => s.trigger)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.code === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const active = (id: string) => (id === 'desfile' ? desfile : emote === (id === 'dance' ? 'dance' : id))
  return (
    <>
      {toast && (
        <div key={toast.id} className="emote-toast" role="status">
          {toast.text}
        </div>
      )}
      <div className={`emote-wrap${isTouch ? ' emote-wrap--touch' : ''}`}>
        {open && (
          <ul className="emote-list" role="menu">
            {EMOTES.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  role="menuitem"
                  className={`emote-item${active(e.id) ? ' emote-item--on' : ''}`}
                  onClick={() => {
                    trigger(e.id)
                    setOpen(false)
                  }}
                >
                  <span className="emote-icon">{e.icon}</span>
                  <span>{e.label}</span>
                  {!isTouch && <kbd>{e.key}</kbd>}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="emote-btn" aria-label="Emotes" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span aria-hidden="true">✨</span>
          {!isTouch && <span className="emote-btn-label">Emotes</span>}
        </button>
      </div>
    </>
  )
}
