import { useEffect, useState } from 'react'
import { useDeviceStore } from '../../game/systems/device'

/** Minijogos que ficam melhores na horizontal (cena larga). Os demais funcionam nas duas posicoes. */
const PREFER_LANDSCAPE = new Set(['volei', 'procura'])

/** Aviso suave "gire o celular": so no toque, so em retrato, some sozinho e pode ser dispensado. */
export function RotateHint({ id }: { id: string }) {
  const isTouch = useDeviceStore((s) => s.isTouch)
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth)
  const [gone, setGone] = useState(false)
  useEffect(() => {
    const on = () => setPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  useEffect(() => {
    setGone(false)
    const t = window.setTimeout(() => setGone(true), 7000)
    return () => window.clearTimeout(t)
  }, [id])
  if (!isTouch || !portrait || gone || !PREFER_LANDSCAPE.has(id)) return null
  return (
    <button type="button" className="rot-hint" onClick={() => setGone(true)} aria-label="Dispensar aviso">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="7" y="3" width="10" height="18" rx="2.5" />
        <path d="M20.5 8.5a9 9 0 0 1 0 7M18.6 14.6l1.9 1.4 1.4-1.9" />
      </svg>
      Gire o celular para jogar melhor
    </button>
  )
}
