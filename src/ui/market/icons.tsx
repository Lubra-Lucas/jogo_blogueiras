import type { ReactNode, SVGProps } from 'react'

/** Icones do mercado: tracos finos, desenhados no projeto (sem emoji). */
type P = SVGProps<SVGSVGElement>
const line = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
const make = (d: ReactNode) =>
  function Icon(p: P) {
    return (
      <svg {...line} {...p}>
        {d}
      </svg>
    )
  }

export const IcGavel = make(
  <>
    <path d="m13.500 4.500 6 6-3 3-6-6z" />
    <path d="m9 9-5.500 5.500a1.700 1.700 0 0 0 2.400 2.400L11.500 11.500" />
    <path d="M4 20.500h9" />
  </>,
)
export const IcBell = make(
  <>
    <path d="M6 16.500V11a6 6 0 0 1 12 0v5.500l1.500 1.500h-15z" />
    <path d="M10 20.500a2 2 0 0 0 4 0" />
  </>,
)
export const IcBookmark = make(<path d="M7 3.500h10v17l-5-4-5 4z" />)
export const IcBookmarkOn = (p: P) => (
  <svg {...line} {...p} fill="currentColor">
    <path d="M7 3.500h10v17l-5-4-5 4z" />
  </svg>
)
export const IcClose = make(<path d="M6 6l12 12M18 6 6 18" />)
export const IcBack = make(<path d="M14.500 5 7.500 12l7 7" />)
export const IcLock = make(
  <>
    <rect x="5.500" y="10.500" width="13" height="9.500" rx="2" />
    <path d="M8.500 10.500V8a3.500 3.500 0 0 1 7 0v2.500" />
  </>,
)
export const IcTag = make(
  <>
    <path d="M3.500 12.500V4.500h8l9 9-8 8z" />
    <circle cx="8" cy="9" r="1.100" />
  </>,
)
export const IcReceipt = make(
  <>
    <path d="M6 3.500h12v17l-2-1.300-2 1.300-2-1.300-2 1.300-2-1.300-2 1.300z" />
    <path d="M9 8.500h6M9 12h6M9 15.500h3.500" />
  </>,
)
export const IcCase = make(
  <>
    <rect x="3.500" y="5" width="17" height="14" rx="1.500" />
    <path d="M3.500 9.500h17M9 5v14M15 5v14" />
  </>,
)
export const IcLaurel = make(
  <>
    <path d="M12 20c-4.500-.5-7-3.500-7-8" />
    <path d="M12 20c4.500-.5 7-3.500 7-8" />
    <path d="M5.500 14c-2-.3-2.800-2-2.500-3.500 1.800-.2 3 .8 3.600 2.200M18.500 14c2-.3 2.800-2 2.500-3.500-1.800-.2-3 .8-3.600 2.200" />
    <path d="M7 9c-1.600-.9-1.800-2.600-1.200-3.800 1.600.4 2.400 1.600 2.600 3M17 9c1.600-.9 1.800-2.600 1.200-3.800-1.600.4-2.400 1.600-2.600 3" />
    <path d="m12 6.500.9 1.900 2 .3-1.500 1.400.4 2-1.800-1-1.800 1 .4-2-1.500-1.400 2-.3z" />
  </>,
)
export const IcSearch = make(
  <>
    <circle cx="10.500" cy="10.500" r="5.500" />
    <path d="m15 15 5 5" />
  </>,
)
export const IcArrowUp = make(<path d="m6 14 6-6 6 6" />)
export const IcArrowDown = make(<path d="m6 10 6 6 6-6" />)
export const IcInfo = make(
  <>
    <circle cx="12" cy="12" r="8.500" />
    <path d="M12 11v5M12 7.800v.2" />
  </>,
)
export const IcShield = make(
  <>
    <path d="M12 3.500 5 6v5.500c0 4 3 7.200 7 9 4-1.800 7-5 7-9V6z" />
    <path d="m9 12 2.200 2.200L15.500 10" />
  </>,
)
export const IcGrid = make(
  <>
    <rect x="4" y="4" width="6.500" height="6.500" rx="1" />
    <rect x="13.500" y="4" width="6.500" height="6.500" rx="1" />
    <rect x="4" y="13.500" width="6.500" height="6.500" rx="1" />
    <rect x="13.500" y="13.500" width="6.500" height="6.500" rx="1" />
  </>,
)
export const IcSwap = make(
  <>
    <path d="M4 8.500h14l-3-3M20 15.500H6l3 3" />
  </>,
)

/** Moeda Brilhos: latao com faisca. */
export function IcCoin({ size = 16, ...p }: P & { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden {...p}>
      <defs>
        <linearGradient id="mk-coin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3e2a6" />
          <stop offset="0.55" stopColor="#c59a3a" />
          <stop offset="1" stopColor="#8d6a1f" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#mk-coin)" stroke="#6f5217" strokeWidth="1" />
      <circle cx="12" cy="12" r="7.300" fill="none" stroke="#fff6d4" strokeOpacity="0.6" strokeWidth="0.8" />
      <path d="M12 6.800c.4 3 1.500 4.400 4.800 5.200-3.300.8-4.400 2.200-4.800 5.200-.4-3-1.500-4.400-4.800-5.200 3.300-.8 4.400-2.200 4.800-5.200z" fill="#fff9e6" stroke="#6f5217" strokeWidth="0.5" strokeLinejoin="round" />
    </svg>
  )
}

/** Selo dourado de "aposentado" (rosa dos ventos com anel). */
export function SealRetired({ size = 44, ...p }: P & { size?: number }) {
  const pts: string[] = []
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const r = i % 2 ? 19 : 22
    pts.push(`${(24 + Math.cos(a) * r).toFixed(1)},${(24 + Math.sin(a) * r).toFixed(1)}`)
  }
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-label="Aposentada" role="img" {...p}>
      <defs>
        <radialGradient id="mk-seal" cx="35%" cy="28%" r="85%">
          <stop offset="0" stopColor="#fbefc2" />
          <stop offset="0.5" stopColor="#d3a93f" />
          <stop offset="1" stopColor="#8a6518" />
        </radialGradient>
      </defs>
      <polygon points={pts.join(' ')} fill="url(#mk-seal)" stroke="#6f5217" strokeWidth="0.8" />
      <circle cx="24" cy="24" r="14.500" fill="none" stroke="#fff3c4" strokeOpacity="0.8" strokeWidth="1" />
      <circle cx="24" cy="24" r="12" fill="none" stroke="#6f5217" strokeOpacity="0.55" strokeWidth="0.6" strokeDasharray="1.400 1.800" />
      <path d="m24 14.500 2.700 5.600 6.100.8-4.500 4.200 1.100 6-5.400-3-5.400 3 1.100-6-4.500-4.200 6.100-.8z" fill="#fff8dc" stroke="#6f5217" strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  )
}
