import { useEffect, useRef, useState } from 'react'
import { useChatStore } from '../../state/chatStore'
import { useUiStore } from '../../state/uiStore'
import { CHAT_MAX_LENGTH } from '../../shared/chat'
import { IconChat, IconClose, IconSend } from '../menu/icons'
import '../menu/menu.css'

const fmt = (ts: number) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

/**
 * Chat de texto: botao (com contador de nao lidas) que abre a caixa; Enter abre/foca, Esc fecha.
 * No celular a caixa vira uma folha na parte de baixo. Transporte plugavel em `state/chatStore.ts`.
 */
export function ChatPanel() {
  const open = useUiStore((s) => s.chatOpen)
  const setOpen = useUiStore((s) => s.setChatOpen)
  const menuOpen = useUiStore((s) => s.menuOpen)
  const messages = useChatStore((s) => s.messages)
  const unread = useChatStore((s) => s.unread)
  const notice = useChatStore((s) => s.notice)
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) useChatStore.getState().markRead()
  }, [open, messages.length])

  useEffect(() => {
    const el = list.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useUiStore.getState().menuOpen) return
      if (e.code === 'Enter' && !isTyping(e.target)) {
        e.preventDefault()
        setOpen(true)
        window.setTimeout(() => input.current?.focus(), 30)
      } else if (e.code === 'Escape' && useUiStore.getState().chatOpen) {
        input.current?.blur()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  if (menuOpen) return null

  const submit = () => {
    if (useChatStore.getState().send(text)) setText('')
  }

  if (!open) {
    return (
      <div className="chat">
        <button type="button" className="chat__btn" onClick={() => (setOpen(true), window.setTimeout(() => input.current?.focus(), 30))} aria-label="Abrir chat">
          <IconChat />
          <span>Chat</span>
          {unread > 0 && <span className="chat__badge">{unread > 99 ? '99+' : unread}</span>}
        </button>
      </div>
    )
  }

  return (
    <div className="chat chat--open">
      <div className="chat__box">
        <div className="chat__head">
          <span>Chat</span>
          <button type="button" className="icon-btn" style={{ width: 30, height: 30 }} aria-label="Fechar chat" onClick={() => setOpen(false)}>
            <IconClose width={16} height={16} />
          </button>
        </div>
        <div className="chat__list" ref={list} aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`msg msg--${m.kind}${m.self ? ' msg--self' : ''}`}>
              <time>{fmt(m.ts)}</time>
              {m.kind === 'system' ? m.text : (
                <>
                  <b>{m.author}:</b>
                  {m.text}
                </>
              )}
            </div>
          ))}
        </div>
        <div className="chat__meta">
          <span className={notice ? 'warn' : undefined}>{notice ?? 'Enter envia · Esc fecha'}</span>
          <span>
            {text.length}/{CHAT_MAX_LENGTH}
          </span>
        </div>
        <form
          className="chat__form"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <input ref={input} value={text} maxLength={CHAT_MAX_LENGTH} placeholder="Escreva uma mensagem..." aria-label="Mensagem" autoComplete="off" enterKeyHint="send" onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="icon-btn" aria-label="Enviar">
            <IconSend width={18} height={18} />
          </button>
        </form>
      </div>
    </div>
  )
}
