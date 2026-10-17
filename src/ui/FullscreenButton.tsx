import { useEffect, useState } from 'react'
import { loadJson, saveJson } from '../shared/storage'

const SUGGEST_KEY = 'jb.fsask.v1'
const isStandalone = () => window.matchMedia?.('(display-mode: fullscreen), (display-mode: standalone)').matches

/**
 * Sugestao unica de tela cheia ao iniciar no celular (Android/Chrome: a API exige um toque; este botao e o toque).
 * No iPhone nao existe a API: o jogo so fica sem barras se for adicionado a Tela de Inicio (PWA); explicado em Ajustes.
 */
function FullscreenSuggest({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (loadJson<boolean>(SUGGEST_KEY) || isStandalone() || document.fullscreenElement) return
    const dismiss = () => {
      saveJson(SUGGEST_KEY, true)
      setShow(false)
    }
    const t = window.setTimeout(() => setShow(true), 2000)
    const u = window.setTimeout(dismiss, 14000)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(u)
    }
  }, [])
  if (!show) return null
  const close = () => {
    saveJson(SUGGEST_KEY, true)
    setShow(false)
    onDone()
  }
  return (
    <div className="fs-ask glass" role="dialog" aria-label="Tela cheia">
      <span>Jogar em tela cheia?</span>
      <button
        type="button"
        className="fs-ask__go"
        onClick={() => {
          void document.documentElement.requestFullscreen().catch(() => {})
          close()
        }}
      >
        Sim
      </button>
      <button type="button" className="fs-ask__no" onClick={close}>
        Agora não
      </button>
    </div>
  )
}

/** Botao de tela cheia (so aparece onde a Fullscreen API existe; iPhone Safari nao tem). */
export function FullscreenButton() {
  const [full, setFull] = useState(!!document.fullscreenElement)
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  if (!document.fullscreenEnabled) return null
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    else void document.documentElement.requestFullscreen().catch(() => {})
  }
  return (
    <>
      <button className="fs-btn" type="button" onClick={toggle} aria-label={full ? 'Sair da tela cheia' : 'Tela cheia'}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {full ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
        </svg>
      </button>
      {!full && <FullscreenSuggest onDone={() => {}} />}
    </>
  )
}
