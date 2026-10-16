import type { SVGProps } from 'react'

/** Patinha (traço único, 24px). */
export function IconPaw(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
      <ellipse cx="6.2" cy="10.2" rx="1.9" ry="2.5" />
      <ellipse cx="10.4" cy="6.2" rx="1.9" ry="2.6" />
      <ellipse cx="15.6" cy="6.2" rx="1.9" ry="2.6" />
      <ellipse cx="19.2" cy="10.4" rx="1.9" ry="2.5" />
      <path d="M12.9 11.2c-2.7 0-5.6 3-5.6 5.6 0 1.8 1.4 2.7 3 2.5 1-.1 1.6-.5 2.6-.5s1.6.4 2.6.5c1.6.2 3-.7 3-2.5 0-2.6-2.9-5.6-5.6-5.6z" />
    </svg>
  )
}

export function IconBowl(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
      <path d="M3.5 12h17l-1.8 6.2a2 2 0 0 1-1.9 1.4H7.2a2 2 0 0 1-1.9-1.4z" />
      <path d="M7 12c.4-2.6 2.4-4 5-4s4.6 1.4 5 4" />
    </svg>
  )
}

export function IconHeart(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
      <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />
    </svg>
  )
}

export function IconClose(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
