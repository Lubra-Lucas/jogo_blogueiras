import type { ReactNode } from 'react'

/** Ícones do Ensaio Fotográfico: traço fino de 1,8, pontas redondas, 24x24 (sem emoji). */
function Svg({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}
type P = { size?: number }

export const IcCamera = ({ size }: P) => (
  <Svg size={size}>
    <path d="M4 8.5h3l1.4-2.2h7.2L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13.4" r="3.6" />
  </Svg>
)
export const IcTemp = ({ size }: P) => (
  <Svg size={size}>
    <path d="M10 14.2V5a2 2 0 1 1 4 0v9.2a4 4 0 1 1-4 0Z" />
    <path d="M12 9v7" />
  </Svg>
)
export const IcBulb = ({ size }: P) => (
  <Svg size={size}>
    <path d="M9 17.5h6M10 20.5h4" />
    <path d="M12 3.5a6 6 0 0 0-3.4 10.9c.6.5.9 1.1.9 1.8V17h5v-.8c0-.7.3-1.3.9-1.8A6 6 0 0 0 12 3.5Z" />
  </Svg>
)
export const IcSideLeft = ({ size }: P) => (
  <Svg size={size}>
    <rect x="2.8" y="7" width="4.4" height="10" rx="1" />
    <path d="M10 9.5l1.6 1.5M10.4 12h3.2M10 14.5l1.6-1.5" />
    <circle cx="17.4" cy="12" r="3.2" />
  </Svg>
)
export const IcSideRight = ({ size }: P) => (
  <Svg size={size}>
    <rect x="16.8" y="7" width="4.4" height="10" rx="1" />
    <path d="M14 9.5l-1.6 1.5M13.6 12h-3.2M14 14.5l-1.6-1.5" />
    <circle cx="6.6" cy="12" r="3.2" />
  </Svg>
)
export const IcSideTop = ({ size }: P) => (
  <Svg size={size}>
    <rect x="7" y="2.8" width="10" height="4.4" rx="1" />
    <path d="M9.5 10l1.5 1.6M12 10.4v3.2M14.5 10L13 11.6" />
    <circle cx="12" cy="18" r="3" />
  </Svg>
)
export const IcSideBack = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="12" cy="9" r="3.2" />
    <path d="M12 3v-.5M5.6 5.6l-.4-.4M18.4 5.6l.4-.4M4 12h-.5M20.5 12H20" />
    <path d="M5.5 21c.4-3.4 2.9-5.6 6.5-5.6s6.100 2.200 6.500 5.600" />
  </Svg>
)
export const IcBackdrop = ({ size }: P) => (
  <Svg size={size}>
    <path d="M4 4h16" />
    <path d="M6 4v9c0 3 2 4 2 7M18 4v9c0 3-2 4-2 7" />
    <rect x="6" y="4" width="12" height="9" rx="1" />
  </Svg>
)
export const IcGel = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="9.4" cy="9.6" r="5" />
    <circle cx="14.6" cy="9.6" r="5" />
    <circle cx="12" cy="14.6" r="5" />
  </Svg>
)
export const IcProp = ({ size }: P) => (
  <Svg size={size}>
    <path d="M12 3.5 20 8v8l-8 4.500L4 16V8Z" />
    <path d="M4 8l8 4.500L20 8M12 12.500v8" />
  </Svg>
)
export const IcTimer = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="12" cy="13.200" r="7.200" />
    <path d="M12 9.500v4l2.400 1.600M9.600 3h4.800" />
  </Svg>
)
export const IcFilm = ({ size }: P) => (
  <Svg size={size}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M7 5v14M17 5v14M3 9.500h4M3 14.500h4M17 9.500h4M17 14.500h4" />
  </Svg>
)
export const IcLock = ({ size }: P) => (
  <Svg size={size}>
    <rect x="5" y="10.500" width="14" height="9.500" rx="2" />
    <path d="M8 10.500V8a4 4 0 0 1 8 0v2.500" />
  </Svg>
)
export const IcCheck = ({ size }: P) => (
  <Svg size={size}>
    <path d="m5 12.500 4.500 4.500L19 7.500" />
  </Svg>
)
export const IcStar = ({ size, filled }: P & { filled?: boolean }) => (
  <svg width={size ?? 22} height={size ?? 22} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden="true">
    <path d="m12 3.500 2.600 5.400 5.900.8-4.300 4.100 1 5.800L12 16.800l-5.200 2.800 1-5.800-4.300-4.100 5.900-.8Z" />
  </svg>
)
export const IcHelp = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.500 9.500a2.500 2.500 0 1 1 3.600 2.200c-.7.400-1.100.9-1.100 1.800M12 16.800v.1" />
  </Svg>
)
export const IcSound = ({ size, off }: P & { off?: boolean }) => (
  <Svg size={size}>
    <path d="M4 9.500h3.500L12 5.500v13l-4.500-4H4Z" />
    {off ? <path d="m16 9.500 4 5M20 9.500l-4 5" /> : <path d="M15.500 9a4 4 0 0 1 0 6M18 6.500a7.500 7.500 0 0 1 0 11" />}
  </Svg>
)
export const IcClose = ({ size }: P) => (
  <Svg size={size}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
)
export const IcPause = ({ size }: P) => (
  <Svg size={size}>
    <path d="M8.500 5.500v13M15.500 5.500v13" />
  </Svg>
)
export const IcPlus = ({ size }: P) => (
  <Svg size={size}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
export const IcMinus = ({ size }: P) => (
  <Svg size={size}>
    <path d="M5 12h14" />
  </Svg>
)
export const IcPeople = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="9" cy="8.500" r="3.200" />
    <path d="M3 19.500c.4-3.300 2.800-5.200 6-5.200s5.600 1.900 6 5.200" />
    <path d="M16 5.700a3 3 0 0 1 0 5.600M18.500 14.600c1.400.8 2.300 2.300 2.500 4.400" />
  </Svg>
)
export const IcTrophy = ({ size }: P) => (
  <Svg size={size}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0Z" />
    <path d="M8 6H4.500c0 3 1.500 4.500 3.600 4.800M16 6h3.500c0 3-1.500 4.500-3.600 4.800M12 13v4M8.500 20h7M10 17h4" />
  </Svg>
)
export const IcSkip = ({ size }: P) => (
  <Svg size={size}>
    <path d="M6 6l7 6-7 6ZM17 6v12" />
  </Svg>
)
