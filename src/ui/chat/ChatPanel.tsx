import { useEffect, useRef, useState } from 'react'
import { useChatStore } from '../../state/chatStore'
import { useUiStore } from '../../state/uiStore'
import { CHAT_MAX_LENGTH } from '../../shared/chat'
import { setTypingPose } from '../../game/character/animation/emoteStore'
import './chat.css'

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
const VISIBLE = 6
const ACTIVE_MS = 6000

/**
 * Chat sempre visivel: painel fosco com as ultimas mensagens, que esmaece quando ocioso e fica opaco ao passar o
 * mouse, ao focar ou quando chega mensagem. Enter foca o campo, Esc sai. Slot de abas (Geral / Sussurro) para depois.
 * Transporte plugavel em `state/chatStore.ts`; reacoes do personagem em `game/character/animation/emoteStore.ts`.
 */
export function ChatPanel() {
  const messages = useChatStore((s) => s.messages)
  const notice = useChatStore((s) => s.notice)
  const wantFocus = useUiStore((s) => s.chatOpen)
  const menuOpen = useUiStore((s) => s.menuOpen)
  const [text, setText] = useState('')
  const [active, setActive] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  // mensagem nova: painel fica opaco por alguns segundos
  const last = messages[messages.length - 1]?.id
  useEffect(() => {
    if (!last) return
    setActive(true)
    const t = window.setTimeout(() => setActive(false), ACTIVE_MS)
    return () => window.clearTimeout(t)
  }, [last])

  // pedidos de foco vindos de outras telas (celular > Mensagens)
  useEffect(() => {
    if (!wantFocus) return
    useUiStore.getState().setChatOpen(false)
    input.current?.focus()
  }, [wantFocus])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUiStore.getState()
      if (ui.menuOpen || ui.phoneOpen || ui.emoteWheel) return
      if (e.code === 'Enter' && !isTyping(e.target)) {
        e.preventDefault()
        input.current?.focus()
      } else if (e.code === 'Escape' && document.activeElement === input.current) {
        input.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => () => setTypingPose(false), [])

  if (menuOpen) return null

  return (
    <div className={`chat${active ? ' chat--active' : ''}`}>
      <div className="chat__panel">
        <div className="chat__tabs" role="tablist" aria-label="Canais">
          <button type="button" role="tab" className="chat__tab" aria-selected="true">
            Geral
          </button>
          <button type="button" role="tab" className="chat__tab" aria-selected="false" disabled title="Em breve">
            Sussurro
          </button>
        </div>
        <div className="chat__list" aria-live="polite">
          {messages.slice(-VISIBLE).map((m) => (
            <div key={m.id} className={`msg msg--${m.kind}${m.self ? ' msg--self' : ''}`}>
              {m.kind === 'system' ? (
                m.text
              ) : (
                <>
                  <b>{m.author}</b>
                  {m.text}
                </>
              )}
            </div>
          ))}
        </div>
        {notice && <div className="chat__notice">{notice}</div>}
        <form
          className="chat__bar"
          onSubmit={(e) => {
            e.preventDefault()
            if (useChatStore.getState().send(text)) setText('')
          }}
        >
          <input
            ref={input}
            value={text}
            maxLength={CHAT_MAX_LENGTH}
            placeholder="Enter para conversar"
            aria-label="Mensagem"
            autoComplete="off"
            enterKeyHint="send"
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setTypingPose(true)}
            onBlur={() => setTypingPose(false)}
          />
          {text.length > 0 && (
            <span className="chat__count">
              {text.length}/{CHAT_MAX_LENGTH}
            </span>
          )}
        </form>
      </div>
    </div>
  )
}
