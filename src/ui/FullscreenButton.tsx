import { useEffect, useState } from 'react'

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
    <button className="fs-btn" type="button" onClick={toggle} aria-label={full ? 'Sair da tela cheia' : 'Tela cheia'}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {full ? (
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        ) : (
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        )}
      </svg>
    </button>
  )
}
