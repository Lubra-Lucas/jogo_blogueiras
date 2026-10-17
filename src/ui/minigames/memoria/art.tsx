import { useEffect, useState } from 'react'
import { peekThumb, requestThumb, thumbKey } from '../../shop/thumbs/thumbRenderer'
import { thumbSpec, type Piece, type PieceSlot } from '../../../game/minigames/memoria/logic'

/** Ícones de reserva (se a miniatura 3D não ficar pronta), um por categoria, na cor da peça. */
export function SlotIcon({ slot, color = '#c9b79c', size = 40 }: { slot: PieceSlot; color?: string; size?: number }) {
  const common = { fill: color, stroke: 'rgba(20,14,18,0.55)', strokeWidth: 1.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  let body: React.ReactNode
  switch (slot) {
    case 'top':
      body = <path d="M16 8l-9 6 4 8 4-2v20h20V20l4 2 4-8-9-6c-1 3-4 5-8 5s-7-2-8-5z" {...common} />
      break
    case 'bottom':
      body = <path d="M15 9h18l7 31H8z" {...common} />
      break
    case 'dress':
      body = <path d="M18 6h12l1 12 10 22H7l10-22z" {...common} />
      break
    case 'shoes':
      body = <path d="M9 10h9v16c3 2 8 4 20 6 3 1 3 6 0 6H10c-2 0-3-1-3-3z" {...common} />
      break
    case 'hat':
      body = (
        <>
          <ellipse cx="24" cy="30" rx="20" ry="6" {...common} />
          <path d="M12 29c0-12 6-18 12-18s12 6 12 18z" {...common} />
        </>
      )
      break
    case 'glasses':
      body = (
        <>
          <circle cx="14" cy="26" r="8" {...common} fill="rgba(180,215,235,0.55)" />
          <circle cx="34" cy="26" r="8" {...common} fill="rgba(180,215,235,0.55)" />
          <path d="M22 25h4M6 24l-3-4M42 24l3-4" stroke={common.stroke} strokeWidth={2} fill="none" />
        </>
      )
      break
    case 'bag':
      body = (
        <>
          <path d="M16 18c0-12 16-12 16 0" fill="none" stroke={common.stroke} strokeWidth={2.4} />
          <rect x="8" y="18" width="32" height="22" rx="4" {...common} />
        </>
      )
      break
    case 'neck':
      body = (
        <>
          <path d="M8 10c0 22 32 22 32 0" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
          <circle cx="24" cy="30" r="4.5" {...common} />
        </>
      )
      break
    case 'hair':
      body = <path d="M24 6c-10 0-15 8-14 18 0 6-3 8-3 14 4 2 8 0 9-6 2 4 10 4 12 0 1 6 5 8 9 6 0-6-3-8-3-14C35 14 32 6 24 6z" {...common} />
      break
    case 'scarf':
      body = <path d="M8 12c10 8 22 8 32 0l2 8c-4 3-8 5-12 5l4 17h-9l-3-15c-6 0-10-2-14-5z" {...common} />
      break
    case 'head':
      body = <path d="M6 34l5-20 6 10 7-14 7 14 6-10 5 20z" {...common} />
      break
    case 'wrist':
      body = <ellipse cx="24" cy="26" rx="15" ry="9" fill="none" stroke={color} strokeWidth={6} />
      break
  }
  return <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>{body}</svg>
}

/** Miniatura da peça: usa a imagem 3D renderizada (cache compartilhado) e cai no ícone enquanto não está pronta. */
export function PieceImg({ piece, size }: { piece: Piece; size?: number }) {
  const spec = thumbSpec(piece)
  const key = thumbKey(spec)
  const [url, setUrl] = useState<string | null>(() => peekThumb(key) ?? null)
  useEffect(() => {
    const hit = peekThumb(key)
    if (hit) return setUrl(hit)
    setUrl(null)
    return requestThumb(spec, (u) => setUrl(u))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  if (url) return <img className="mm-img" src={url} alt="" draggable={false} />
  return <span className="mm-fallback"><SlotIcon slot={piece.slot} color={piece.hex} size={size ?? 40} /></span>
}

/** Pré-carrega miniaturas; resolve quando todas chegam (ou no tempo limite). */
export function preloadPieces(pieces: Piece[], timeoutMs = 9000): Promise<void> {
  const seen = new Set<string>()
  const jobs: Array<Promise<void>> = []
  for (const p of pieces) {
    const spec = thumbSpec(p)
    const k = thumbKey(spec)
    if (seen.has(k) || peekThumb(k)) continue
    seen.add(k)
    jobs.push(new Promise((res) => void requestThumb(spec, () => res())))
  }
  if (!jobs.length) return Promise.resolve()
  return Promise.race([Promise.all(jobs).then(() => undefined), new Promise<void>((res) => window.setTimeout(res, timeoutMs))])
}

/** Verso das cartas: laca azul-marinho com losangos dourados e brilho de vinil. */
export function CardBack() {
  return (
    <svg className="mm-back" viewBox="0 0 80 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="mm-lac" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#27406e" /><stop offset="1" stopColor="#0f1b34" /></linearGradient>
        <linearGradient id="mm-gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.28" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="80" height="100" fill="url(#mm-lac)" />
      <rect x="6" y="6" width="68" height="88" rx="6" fill="none" stroke="#d4b06a" strokeWidth="1.2" />
      {Array.from({ length: 5 }, (_, r) => Array.from({ length: 4 }, (_, c) => (
        <path key={`${r}-${c}`} d={`M${16 + c * 16} ${20 + r * 15}l5 7-5 7-5-7z`} fill="none" stroke="#d4b06a" strokeOpacity="0.55" strokeWidth="0.9" />
      )))}
      <path d="M40 38l9 12-9 12-9-12z" fill="#d4b06a" stroke="#f4e2b4" strokeWidth="0.8" />
      <path d="M6 6h68v34C50 36 28 36 6 44z" fill="url(#mm-gloss)" />
    </svg>
  )
}

export const IcoLook = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 4l-5 3 2 4 2-1v10h10V10l2 1 2-4-5-3c-.5 1.6-1.8 2.6-3 2.6S9.5 5.6 9 4z" />
  </svg>
)
