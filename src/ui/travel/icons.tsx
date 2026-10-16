import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

/** Icones de linha do sistema de viagem (mesmo traco dos glifos do celular). Nenhum emoji. */
export function IPlane(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M21 14.5 13.5 10V4.8a1.5 1.5 0 0 0-3 0V10L3 14.5v1.8l7.500-2.100v3.900l-2 1.500v1.400L12 20l3.500 1v-1.400l-2-1.500v-3.900l7.500 2.100z" />
    </svg>
  )
}

export function ILock(p: P) {
  return (
    <svg {...base} {...p}>
      <rect x="5" y="10.500" width="14" height="9.500" rx="2.600" />
      <path d="M8.200 10.500V8a3.800 3.800 0 0 1 7.600 0v2.500" />
      <circle cx="12" cy="15.200" r="1.300" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IPin(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M12 21s6.500-5.800 6.500-11A6.500 6.500 0 0 0 5.500 10c0 5.200 6.500 11 6.500 11z" />
      <circle cx="12" cy="10" r="2.300" />
    </svg>
  )
}

export function IClose(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function ICheck(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="m5 12.500 4.500 4.500L19 7.500" />
    </svg>
  )
}

export function ISpark(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M12 3.500 13.700 10l6.300 2-6.300 2L12 20.500 10.300 14 4 12l6.300-2z" />
    </svg>
  )
}
