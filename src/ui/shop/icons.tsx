import type { ReactNode, SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const line = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
const make = (d: ReactNode) =>
  function Icon(p: P) {
    return (
      <svg {...line} {...p}>
        {d}
      </svg>
    )
  }

/** Brilhos: moeda dourada com faísca. */
export function IconBrilho(p: P) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...p}>
      <defs>
        <radialGradient id="g-brilho" cx="35%" cy="28%" r="80%">
          <stop offset="0" stopColor="#fff3b8" />
          <stop offset="0.55" stopColor="#e5b440" />
          <stop offset="1" stopColor="#b98418" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#g-brilho)" stroke="#a97812" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="7.3" fill="none" stroke="#fff3b8" strokeOpacity="0.65" strokeWidth="0.8" />
      <path d="M12 6.4c.4 3.2 1.6 4.8 5.2 5.6-3.6.8-4.8 2.4-5.2 5.6-.4-3.2-1.6-4.8-5.2-5.6 3.6-.8 4.8-2.4 5.2-5.6z" fill="#fffbe6" stroke="#a97812" strokeWidth="0.5" strokeLinejoin="round" />
    </svg>
  )
}

/** Diamantes: gema lapidada azul-petróleo. */
export function IconDiamante(p: P) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...p}>
      <defs>
        <linearGradient id="g-diam" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bdf1ff" />
          <stop offset="0.5" stopColor="#3aa8d4" />
          <stop offset="1" stopColor="#1b6f99" />
        </linearGradient>
      </defs>
      <path d="M6.2 3.5h11.6l4 5.2L12 21 2.2 8.7z" fill="url(#g-diam)" stroke="#14577a" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M2.2 8.7h19.6M9 3.5 7.4 8.7 12 21l4.6-12.3L15 3.5M7.4 8.7h9.2" fill="none" stroke="#e8fbff" strokeOpacity="0.8" strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  )
}

export const IconTag = make(
  <>
    <path d="M3 12.2V4.5A1.5 1.5 0 0 1 4.5 3h7.7a1.5 1.5 0 0 1 1.06.44l7.3 7.3a1.5 1.5 0 0 1 0 2.12l-7.7 7.7a1.5 1.5 0 0 1-2.12 0l-7.3-7.3A1.5 1.5 0 0 1 3 12.2z" />
    <circle cx="8" cy="8" r="1.4" />
  </>,
)
export const IconClock = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.4 2" />
  </>,
)
export const IconShield = make(
  <>
    <path d="M12 3 4.5 6v5.5c0 4.5 3.1 8 7.5 9.5 4.4-1.5 7.5-5 7.5-9.5V6z" />
    <path d="m8.8 12.2 2.4 2.4 4.2-4.6" />
  </>,
)
export const IconGift = make(
  <>
    <rect x="3.5" y="9" width="17" height="11" rx="1.5" />
    <path d="M3.5 13h17M12 9v11M12 9c-1.5-4-5.5-4.5-5.5-1.8C6.5 9 12 9 12 9zm0 0c1.5-4 5.5-4.5 5.5-1.8C17.5 9 12 9 12 9z" />
  </>,
)
export const IconCar = make(
  <>
    <path d="M4 16.5V13l1.8-4.6A2 2 0 0 1 7.7 7h8.6a2 2 0 0 1 1.9 1.4L20 13v3.5" />
    <path d="M3 16.5h18v2H3zM4 13h16" />
    <circle cx="7.5" cy="16.5" r="1.4" />
    <circle cx="16.5" cy="16.5" r="1.4" />
  </>,
)
export const IconHouse = make(
  <>
    <path d="m3.5 11.2 8.5-7.4 8.5 7.4" />
    <path d="M5.5 10v9.5h13V10M10 19.5v-5h4v5" />
  </>,
)
export const IconScissors = make(
  <>
    <circle cx="6" cy="6.5" r="2.6" />
    <circle cx="6" cy="17.5" r="2.6" />
    <path d="m8 8 12.5 9M8 16 20.5 7" />
  </>,
)
export const IconSparkle = make(
  <>
    <path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" />
    <path d="M19 15.5c.2 1.5.8 2.1 2.3 2.3-1.5.2-2.1.8-2.3 2.3-.2-1.5-.8-2.1-2.3-2.3 1.5-.2 2.1-.8 2.3-2.3z" />
  </>,
)
export const IconEye = make(
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </>,
)
export const IconWallet = make(
  <>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
    <rect x="3.5" y="7.5" width="17" height="12" rx="2.2" />
    <circle cx="16.5" cy="13.5" r="1.2" />
  </>,
)
export const IconFlame = make(<path d="M12 3c.5 3.2 4.5 5.2 4.5 10a4.5 4.5 0 0 1-9 0c0-2 1-3 2-4 .3 1.2.9 1.8 1.6 2 .1-3.2 0-5 .9-8z" />)
export const IconTrophy = make(
  <>
    <path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0zM7.5 6H4.5c0 3 1.2 4.4 3.2 4.8M16.5 6h3c0 3-1.2 4.4-3.2 4.8M12 13.5V17M8.5 20h7M10 17h4" />
  </>,
)
export const IconLockSmall = make(
  <>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </>,
)
