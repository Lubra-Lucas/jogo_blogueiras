import { useCallback, useEffect, useRef, useState } from 'react'
import { CATEGORY_LABEL, EMOTES, useEmoteStore, type EmoteCategory, type EmoteDef } from '../game/character/animation/emoteStore'
import { useDeviceStore } from '../game/systems/device'
import { useUiStore } from '../state/uiStore'
import { EmoteGlyph, GChat, GPhone, GRun, GWheel } from './glyphs'
import { useShopStore } from './shop/shopStore'
import { useMinigameStore } from '../game/minigames/minigameStore'
import { useMarketUi } from './market/marketUi'
import { focusChatInput } from './chat/ChatPanel'
import { isRunLatched, setRunLatch } from '../game/input/intent'
import './emotes.css'
import './phone/phone.css'

const CATS: EmoteCategory[] = ['social', 'reacoes', 'diversao']
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

const R_OUT = 190
const R_IN = 78

/** Setor anular (viewBox -200..200) entre os angulos a0..a1 (rad, 0 = topo, sentido horario). */
function sector(a0: number, a1: number): string {
  const p = (r: number, a: number) => `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${p(R_IN, a0)} L ${p(R_OUT, a0)} A ${R_OUT} ${R_OUT} 0 ${large} 1 ${p(R_OUT, a1)} L ${p(R_IN, a1)} A ${R_IN} ${R_IN} 0 ${large} 0 ${p(R_IN, a0)} Z`
}

/**
 * Roda de emotes: segure o botao (ou a tecla G) e solte sobre um setor; ou toque para abrir e toque no setor.
 * Paginas por categoria (Social / Reacoes / Diversao). Atalhos numericos continuam no KeyboardInput.
 */
function Wheel() {
  const [cat, setCat] = useState<EmoteCategory>('social')
  const [hot, setHot] = useState(-1)
  const wheel = useRef<HTMLDivElement>(null)
  const hotRef = useRef(-1)
  const emote = useEmoteStore((s) => s.emote)
  const desfile = useEmoteStore((s) => s.desfile)
  const list = EMOTES.filter((e) => e.cat === cat)
  const n = list.length
  const close = useCallback(() => useUiStore.getState().setEmoteWheel(false), [])

  const pick = useCallback(
    (items: readonly EmoteDef[], idx: number) => {
      const e = items[idx]
      if (!e) return false
      useEmoteStore.getState().trigger(e.id)
      close()
      return true
    },
    [close],
  )

  const locate = (x: number, y: number) => {
    const r = wheel.current?.getBoundingClientRect()
    if (!r) return -1
    const dx = x - (r.left + r.width / 2)
    const dy = y - (r.top + r.height / 2)
    const scale = r.width / (R_OUT * 2)
    const dist = Math.hypot(dx, dy) / scale
    if (dist < R_IN || dist > R_OUT * 1.25) return -1
    const a = (Math.atan2(dx, -dy) + Math.PI * 2 + Math.PI / n) % (Math.PI * 2)
    return Math.floor(a / ((Math.PI * 2) / n)) % n
  }
  const track = (x: number, y: number) => {
    const i = locate(x, y)
    hotRef.current = i
    setHot(i)
    return i
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => e.code === 'Escape' && close()
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'KeyG') return
      if (!pick(list, hotRef.current)) close()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [close, pick, list])

  const cur = list[hot]
  return (
    <div
      className="ew"
      onPointerMove={(e) => track(e.clientX, e.clientY)}
      onPointerDown={(e) => {
        const i = track(e.clientX, e.clientY)
        if (i < 0 && !(e.target as HTMLElement).closest('.ew__page')) close()
      }}
      onPointerUp={(e) => {
        const i = track(e.clientX, e.clientY)
        if (i >= 0) pick(list, i)
      }}
    >
      <div className="ew__wheel" ref={wheel}>
        <svg className="ew__svg" viewBox="-200 -200 400 400" aria-hidden>
          {list.map((e, i) => {
            const half = Math.PI / n
            const a = (i * Math.PI * 2) / n
            const on = e.id === 'desfile' ? desfile : emote === e.id
            return <path key={e.id} d={sector(a - half + 0.012, a + half - 0.012)} className={`ew__sec${hot === i ? ' ew__sec--hot' : ''}${on ? ' ew__sec--on' : ''}`} />
          })}
          <circle r={R_IN - 6} className="ew__hub" />
        </svg>
        {list.map((e, i) => {
          const a = (i * Math.PI * 2) / n
          const rr = ((R_IN + R_OUT) / 2 / (R_OUT * 2)) * 100
          return (
            <span key={e.id} className={`ew__icon${hot === i ? ' ew__icon--hot' : ''}`} style={{ left: `${50 + Math.sin(a) * rr}%`, top: `${50 - Math.cos(a) * rr}%` }}>
              <EmoteGlyph id={e.id} />
              <em>{e.label}</em>
            </span>
          )
        })}
        <div className="ew__center">
          {cur ? (
            <>
              <b>{cur.label}</b>
              {cur.key && <kbd>{cur.key}</kbd>}
            </>
          ) : (
            <>
              <b>Emotes</b>
              <span>{CATEGORY_LABEL[cat]}</span>
            </>
          )}
        </div>
        <div className="ew__pages" onPointerUp={(e) => e.stopPropagation()}>
          {CATS.map((c) => (
            <button key={c} type="button" className="ew__page" aria-pressed={cat === c} onPointerDown={(e) => e.stopPropagation()} onClick={() => (setCat(c), setHot(-1), (hotRef.current = -1))}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Botoes do canto inferior direito: celular e emotes (+ a roda quando aberta e o aviso do emote). */
export function Dock() {
  const open = useUiStore((s) => s.emoteWheel)
  const phone = useUiStore((s) => s.phoneOpen)
  const isTouch = useDeviceStore((s) => s.isTouch)
  const toast = useEmoteStore((s) => s.toast)
  const [run, setRun] = useState(isRunLatched)
  // telas cheias (menu, loja, mercado, minijogo, mapa): o HUD de baixo some (CSS usa data-overlay)
  const overlay = useUiStore((s) => s.menuOpen || s.bigMapOpen) || !!useShopStore((s) => s.open) || !!useMarketUi((s) => s.open) || useMinigameStore((s) => s.active !== null)
  useEffect(() => {
    document.documentElement.dataset.overlay = overlay ? '1' : '0'
  }, [overlay])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyG' || e.repeat || isTyping(e.target) || e.ctrlKey || e.metaKey) return
      const ui = useUiStore.getState()
      if (ui.menuOpen || ui.phoneOpen) return
      ui.setEmoteWheel(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      {toast && (
        <div key={toast.id} className="emote-toast" role="status">
          {toast.text}
        </div>
      )}
      <div className={`dock${isTouch ? ' dock--touch' : ''}`}>
        <button type="button" className="dock__btn" aria-label="Celular" aria-pressed={phone} onClick={() => (phone ? useUiStore.getState().closePhone() : useUiStore.getState().openPhone())}>
          <GPhone />
          {!isTouch && <span className="dock__key">P</span>}
        </button>
        <button type="button" className="dock__btn" aria-label="Emotes" aria-pressed={open} onPointerDown={() => useUiStore.getState().setEmoteWheel(true)}>
          <GWheel />
          {!isTouch && <span className="dock__key">G</span>}
        </button>
        {isTouch && (
          <button type="button" className="dock__btn dock__btn--sm" aria-label="Conversar" onClick={focusChatInput}>
            <GChat />
          </button>
        )}
        {isTouch && (
          <button type="button" className="dock__btn dock__btn--sm" aria-label="Correr" aria-pressed={run} onClick={() => (setRunLatch(!run), setRun(!run))}>
            <GRun />
          </button>
        )}
      </div>
      {open && <Wheel />}
    </>
  )
}
