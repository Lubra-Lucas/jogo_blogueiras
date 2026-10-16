import type { ReactNode } from 'react'
import type { AccId, StyleId } from '../../../game/minigames/salao/data'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const Svg = ({ children, size = 24, vb = '0 0 24 24' }: { children: ReactNode; size?: number; vb?: string }) => (
  <svg viewBox={vb} width={size} height={size} aria-hidden>{children}</svg>
)

export const IcoClose = () => <Svg size={20}><path {...S} strokeWidth={2.6} d="M6 6 L18 18 M18 6 L6 18" /></Svg>
export const IcoPause = () => <Svg size={20}><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" /></Svg>
export const IcoSound = ({ on }: { on: boolean }) => (
  <Svg size={20}>
    <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor" />
    {on ? <path {...S} d="M15.5 9c1.4 1.7 1.4 4.3 0 6M18 6.5c2.8 3.2 2.8 8.8 0 12" /> : <path {...S} d="M16 9l5 6M21 9l-5 6" />}
  </Svg>
)
export const IcoScissors = () => (
  <Svg><circle {...S} cx="6.5" cy="17.5" r="2.7" /><circle {...S} cx="6.5" cy="6.5" r="2.7" /><path {...S} d="M8.6 8.2L20 17M8.6 15.8L20 7" /></Svg>
)
export const IcoDrop = () => <Svg><path {...S} d="M12 3.5C8 8.5 6 11.5 6 14.5a6 6 0 0012 0c0-3-2-6-6-11z" /></Svg>
export const IcoBrush = () => (
  <Svg><rect {...S} x="5" y="3" width="8" height="10" rx="3" /><path {...S} d="M7.5 6v4M10.5 6v4M9 13v8" /><path {...S} d="M16 6h4M16 10h4" opacity=".5" /></Svg>
)
export const IcoDryer = () => (
  <Svg><path {...S} d="M3.5 8.5a5 5 0 015-5h5.5a4 4 0 010 8H8.5a5 5 0 01-5-3z" /><path {...S} d="M9 11.5L8 21h4l.8-9.5" /><path {...S} d="M19 5.5l2-1M19.5 9l2.2.4" opacity=".6" /></Svg>
)
export const IcoSpark = ({ size = 24 }: { size?: number }) => (
  <Svg size={size}><path d="M12 2.5c.8 4.4 2.6 6.7 7 7.5-4.4.8-6.2 3.1-7 7.5-.8-4.4-2.6-6.7-7-7.5 4.4-.8 6.2-3.1 7-7.5z" fill="currentColor" /><path d="M19 15.5c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5z" fill="currentColor" opacity=".7" /></Svg>
)
export const IcoLock = () => <Svg size={16}><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" /><path {...S} d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" /></Svg>
export const IcoEye = () => <Svg size={20}><path {...S} d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle {...S} cx="12" cy="12" r="3" /></Svg>
export const IcoCoin = ({ size = 24 }: { size?: number }) => (
  <Svg size={size}><circle cx="12" cy="12" r="9" fill="#d3b062" /><circle cx="12" cy="12" r="6.4" fill="none" stroke="#fff7dc" strokeWidth="1.5" opacity=".8" /><path d="M12 8.4l1.1 2.3 2.5.3-1.8 1.7.5 2.5-2.3-1.3-2.3 1.3.5-2.5-1.8-1.7 2.5-.3z" fill="#fff7dc" /></Svg>
)
export const IcoStar = ({ on, size = 50 }: { on: boolean; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
    <path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill={on ? 'url(#sl-gold)' : 'rgba(80,66,52,.16)'} stroke={on ? '#8f6e24' : 'rgba(80,66,52,.25)'} strokeWidth="1" strokeLinejoin="round" />
  </svg>
)
export const SalaoDefs = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
    <defs>
      <linearGradient id="sl-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f1d789" /><stop offset="1" stopColor="#b08d4a" /></linearGradient>
    </defs>
  </svg>
)

/** Silhuetas de penteado: cabeça neutra com a forma do cabelo. */
export function HairSil({ id, size = 64 }: { id: StyleId; size?: number }) {
  const hair = 'currentColor'
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      {id === 'hair.chestnutWaves' && (
        <path d="M32 9c-10 0-17 7-17 17 0 8-2 12-1 18 1 6-3 8-2 11 5 1 9-1 11-4 2 3 5 4 9 4s7-1 9-4c2 3 6 5 11 4 1-3-3-5-2-11 1-6-1-10-1-18 0-10-7-17-17-17z" fill={hair} />
      )}
      {id === 'hair.meshyUpdo' && (
        <>
          <circle cx="32" cy="10" r="8" fill={hair} />
          <path d="M16 30c0-9 7-16 16-16s16 7 16 16c-4-4-9-7-16-7s-12 3-16 7z" fill={hair} />
        </>
      )}
      {id === 'hair.caramelCurls' && (
        <g fill={hair}>
          {[[14, 24], [20, 14], [32, 9], [44, 14], [50, 24], [12, 38], [52, 38], [17, 50], [47, 50]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="8" />
          ))}
          <rect x="18" y="14" width="28" height="14" rx="6" />
        </g>
      )}
      {id === 'hair.platinumUndercut' && (
        <>
          <path d="M16 31c-1-11 6-18 17-18 8 0 13 3 16 9 2 4 1 8 1 9-2-4-5-6-9-6-6 0-13-1-17 4-3 3-4 4-8 2z" fill={hair} />
          <path d="M16 31c0 2 1 4 2 5-1-3 0-5 0-5z" fill={hair} opacity=".5" />
        </>
      )}
      <ellipse cx="32" cy="36" rx="12.5" ry="15" fill="var(--sl-skin, #e8cdb8)" />
      {/* franja por cima do rosto para dar leitura de penteado */}
      {id === 'hair.chestnutWaves' && <path d="M19.5 33c4-9 15-14 25 0-4-5-9-7-12.500-7S23 28 19.500 33z" fill={hair} />}
      {id === 'hair.caramelCurls' && <path d="M20 30c3-7 21-7 24 0-5-3-19-3-24 0z" fill={hair} />}
      {id === 'hair.meshyUpdo' && <path d="M20 30c3-6 21-6 24 0-4-2.500-20-2.500-24 0z" fill={hair} />}
      {id === 'hair.platinumUndercut' && <path d="M20 30c3-5 12-7 24-1-6-1-17-1-24 1z" fill={hair} />}
      <circle cx="27.500" cy="37" r="1.300" fill="#4a3a32" />
      <circle cx="36.500" cy="37" r="1.300" fill="#4a3a32" />
      <path d="M28.500 43c2 1.600 5 1.600 7 0" fill="none" stroke="#a8665a" strokeWidth="1.400" strokeLinecap="round" />
    </svg>
  )
}

export function AccIcon({ id, size = 44, color = 'currentColor' }: { id: AccId; size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      {id === 'hair_bow' && (
        <g fill={color} stroke="rgba(0,0,0,.18)" strokeWidth="1">
          <path d="M24 24C16 14 6 12 5 20c-1 8 9 11 19 4zM24 24c8-10 18-12 19-4 1 8-9 11-19 4z" />
          <circle cx="24" cy="24" r="4.500" />
          <path d="M22 28l-4 11 6-3 3 6 1-14z" opacity=".85" />
        </g>
      )}
      {id === 'star_pins' && (
        <g>
          <path d="M16 6l3.200 6.600 7.200 1-5.300 5 1.300 7.200L16 22.400 9.600 25.800l1.300-7.200-5.300-5 7.200-1z" fill="#d3b062" stroke="#8f6e24" strokeWidth="1" strokeLinejoin="round" />
          <path d="M33 22l2.400 5 5.400.7-4 3.800 1 5.400L33 34.400 28.200 37l1-5.400-4-3.800 5.400-.7z" fill={color} stroke="rgba(0,0,0,.2)" strokeWidth="1" strokeLinejoin="round" />
        </g>
      )}
      {id === 'tiara' && (
        <g stroke="#8f6e24" strokeWidth="1.200" strokeLinejoin="round">
          <path d="M5 34c4-14 10-19 19-19s15 5 19 19z" fill="none" />
          <path d="M5 34L10 16l8 9 6-13 6 13 8-9 5 18z" fill="#d3b062" />
          <circle cx="24" cy="10.500" r="2.400" fill="#f7f3ea" />
          <circle cx="10" cy="14" r="2" fill="#f7f3ea" />
          <circle cx="38" cy="14" r="2" fill="#f7f3ea" />
          <rect x="5" y="34" width="38" height="4" rx="2" fill="#b08d4a" />
        </g>
      )}
    </svg>
  )
}
