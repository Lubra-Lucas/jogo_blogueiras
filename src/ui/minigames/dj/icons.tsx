import type { ReactNode } from 'react'

/** Ícones do DJ da Noite: traço de 1.8px, cantos arredondados, sem emoji. */
function Svg({ children, size = 22, fill = 'none' }: { children: ReactNode; size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}
type P = { size?: number }

export const IcPlay = ({ size }: P) => (
  <Svg size={size} fill="currentColor">
    <path d="M8 5.5v13l11-6.5z" />
  </Svg>
)
export const IcPause = ({ size }: P) => (
  <Svg size={size}>
    <path d="M9 5v14M15 5v14" strokeWidth="2.6" />
  </Svg>
)
export const IcClose = ({ size }: P) => (
  <Svg size={size}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)
export const IcSound = ({ size, off }: P & { off?: boolean }) => (
  <Svg size={size}>
    <path d="M4 10v4h3.5L12 18V6L7.5 10z" />
    {off ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <path d="M15.5 9a4 4 0 010 6M18 6.5a8 8 0 010 11" />}
  </Svg>
)
export const IcHelp = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.4a2.6 2.6 0 114 2.2c-.9.6-1.6 1.1-1.6 2.2M12 17.2v.1" />
  </Svg>
)
export const IcSliders = ({ size }: P) => (
  <Svg size={size}>
    <path d="M5 6h14M5 12h14M5 18h14" />
    <circle cx="9" cy="6" r="2" fill="#0b0f1e" />
    <circle cx="15" cy="12" r="2" fill="#0b0f1e" />
    <circle cx="8" cy="18" r="2" fill="#0b0f1e" />
  </Svg>
)
export const IcCrowd = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="12" cy="8" r="2.6" />
    <path d="M6.8 19c0-3 2.3-5 5.2-5s5.2 2 5.2 5" />
    <circle cx="5.2" cy="10" r="1.8" />
    <circle cx="18.8" cy="10" r="1.8" />
  </Svg>
)
export const IcVinyl = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 12h.01M6.2 8.4A7 7 0 0112 5" />
  </Svg>
)
export const IcStar = ({ size = 22, on = true }: P & { on?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.6 6.8 19.4l1-5.9-4.3-4.1 5.9-.8z"
      fill={on ? '#ffb340' : 'none'}
      stroke={on ? '#ffd88a' : '#4a5278'}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
)
export const IcArrow = ({ dir, size }: P & { dir: -1 | 1 }) => (
  <Svg size={size}>
    <path d={dir === -1 ? 'M19 12H5M11 6l-6 6 6 6' : 'M5 12h14M13 6l6 6-6 6'} />
  </Svg>
)
export const IcLock = ({ size }: P) => (
  <Svg size={size}>
    <rect x="5.5" y="11" width="13" height="9" rx="2" />
    <path d="M8.5 11V8.5a3.5 3.5 0 017 0V11" />
  </Svg>
)
export const IcCalendar = ({ size }: P) => (
  <Svg size={size}>
    <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
  </Svg>
)
export const IcNote = ({ size }: P) => (
  <Svg size={size}>
    <path d="M9 17.5V6l9-2v11.5" />
    <circle cx="6.8" cy="17.5" r="2.4" />
    <circle cx="15.8" cy="15.5" r="2.4" />
  </Svg>
)
export const IcHand = ({ size }: P) => (
  <Svg size={size}>
    <path d="M9 11V5.5a1.5 1.5 0 013 0V10m0-1.5a1.5 1.5 0 013 0V11m0-1a1.5 1.5 0 013 0v5a6 6 0 01-6 6h-1a6 6 0 01-5-2.7L4.5 14a1.4 1.4 0 012.3-1.6L9 15" />
  </Svg>
)
