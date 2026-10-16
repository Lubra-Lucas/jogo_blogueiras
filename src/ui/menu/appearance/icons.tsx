import type { ReactNode, SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
const make = (d: ReactNode) =>
  function Icon(p: P) {
    return (
      <svg {...base} {...p}>
        {d}
      </svg>
    )
  }

export const CIconLooks = make(
  <>
    <rect x="4" y="3.500" width="16" height="17" rx="2.500" />
    <circle cx="12" cy="10" r="2.800" />
    <path d="M7 18c.8-2.500 2.600-3.800 5-3.800s4.200 1.300 5 3.800" />
  </>,
)
export const CIconFace = make(
  <>
    <path d="M12 3.500c-4 0-6.500 3-6.500 7.500 0 4.600 3 8.500 6.500 9.500 3.500-1 6.500-4.900 6.500-9.500 0-4.500-2.500-7.500-6.500-7.500z" />
    <path d="M9.500 11h.01M14.500 11h.01M10 15.500c1.200.8 2.800.8 4 0" />
  </>,
)
export const CIconEye = make(
  <>
    <path d="M2.500 12C5 7.500 8.500 5.500 12 5.500s7 2 9.500 6.500c-2.500 4.500-6 6.500-9.500 6.500S5 16.500 2.500 12z" />
    <circle cx="12" cy="12" r="3" />
  </>,
)
export const CIconBrow = make(
  <>
    <path d="M3 14C6 8 14 6.500 21 11" strokeWidth={2.600} />
    <path d="M6 18.500c3-1.500 9-1.500 12 0" opacity=".45" />
  </>,
)
export const CIconLips = make(
  <>
    <path d="M2.500 12C6 8 9 8.500 12 10.500 15 8.500 18 8 21.500 12 18 17.500 6 17.500 2.500 12z" />
    <path d="M3 12c3 1.200 15 1.200 18 0" />
  </>,
)
export const CIconMakeup = make(
  <>
    <path d="M9 3h6v7H9z" />
    <path d="M7.500 10h9v3h-9zM8 13h8v8H8z" />
    <path d="M12 3V1.500" />
  </>,
)
export const CIconSkin = make(
  <>
    <path d="M12 3C8.500 8 6 10.500 6 14.500a6 6 0 0 0 12 0C18 10.500 15.500 8 12 3z" />
    <path d="M9 15.500a3 3 0 0 0 3 2.500" />
  </>,
)
export const CIconBody = make(
  <>
    <circle cx="12" cy="4.500" r="2" />
    <path d="M8.500 9.500C9.500 8.500 10.700 8 12 8s2.500.5 3.500 1.500c.4 2-.4 3.200-1.200 4.300.5 2 1.500 3.500 1.500 7.200h-2.600L12 16.500 10.800 21H8.200c0-3.700 1-5.200 1.500-7.200C8.900 12.700 8.100 11.500 8.500 9.500z" />
  </>,
)
export const CIconHair = make(<path d="M12 3c-4.500 0-7 3-7 7 0 3 1 5 .5 8 1.500-1 2.500-3 2.500-5 3 0 6-1.500 7-5 1 2 2 4 3 5 0-4-.5-6-1-8-.8-1.800-2.500-2-5-2z" />)
export const CIconNail = make(
  <>
    <path d="M8.500 21v-8.500a3.500 3.500 0 0 1 7 0V21" />
    <path d="M9.800 12.200c.5-1.600 1.300-2.400 2.200-2.400s1.700.8 2.200 2.400" />
    <path d="M12 3.500V6M8 5l1 1.800M16 5l-1 1.800" />
  </>,
)
export const CIconUndo = make(<path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />)
export const CIconRedo = make(<path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />)
export const CIconDice = make(
  <>
    <rect x="4" y="4" width="16" height="16" rx="3.500" />
    <path d="M8.500 8.500h.01M15.500 8.500h.01M12 12h.01M8.500 15.500h.01M15.500 15.500h.01" strokeWidth={2.600} />
  </>,
)
export const CIconCompare = make(
  <>
    <rect x="3.500" y="4" width="17" height="16" rx="2.500" />
    <path d="M12 4v16M7 9.500l-2 2.500 2 2.500M17 9.500l2 2.500-2 2.500" />
  </>,
)
