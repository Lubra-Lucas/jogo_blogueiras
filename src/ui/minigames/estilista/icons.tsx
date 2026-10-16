/** Ícones SVG do Estilista Personal (traço único de 1,7 px, sem emoji). */
import type { ReactNode } from 'react'

type P = { size?: number; className?: string }

function Ico({ size = 22, className, children, fill = 'none' }: P & { children: ReactNode; fill?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  )
}

export const IcoHanger = (p: P) => (
  <Ico {...p}>
    <path d="M12 7.5a2.2 2.2 0 1 0-2.2-2.2" />
    <path d="M12 7.5v2L3.2 15.6a1.4 1.4 0 0 0 .8 2.6h16a1.4 1.4 0 0 0 .8-2.6L12 9.5" />
  </Ico>
)
export const IcoTag = (p: P) => (
  <Ico {...p}>
    <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7a1 1 0 0 1 .7.3l7.3 7.3a1 1 0 0 1 0 1.4l-7.4 7.4a1 1 0 0 1-1.4 0l-7.2-7.2a1 1 0 0 1-.3-.7z" />
    <circle cx="8" cy="8" r="1.3" />
  </Ico>
)
export const IcoClock = (p: P) => (
  <Ico {...p}>
    <circle cx="12" cy="13" r="7.5" />
    <path d="M12 8.8V13l2.8 1.8M9.5 3h5" />
  </Ico>
)
export const IcoStar = ({ size = 22, className, filled }: P & { filled?: boolean }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden>
    <path d="m12 3.4 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.7l6-.8z" />
  </svg>
)
export const IcoCoin = (p: P) => (
  <Ico {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7.5v9M9.6 9.6c.4-.8 1.2-1.1 2.4-1.1 1.4 0 2.4.6 2.4 1.6 0 2.2-4.8.9-4.8 3.1 0 1 1 1.700 2.400 1.700 1.200 0 2-.4 2.400-1.200" />
  </Ico>
)
export const IcoAsk = (p: P) => (
  <Ico {...p}>
    <path d="M4 5.5A1.500 1.500 0 0 1 5.500 4h13A1.500 1.500 0 0 1 20 5.500v9a1.500 1.500 0 0 1-1.500 1.500H10l-4.500 4v-4H5.500A1.500 1.500 0 0 1 4 14.500z" />
    <path d="M9.800 8.800a2.200 2.200 0 1 1 3 2.100c-.6.300-.8.700-.8 1.300M12 13.900v.1" />
  </Ico>
)
export const IcoClose = (p: P) => (
  <Ico {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Ico>
)
export const IcoSound = ({ muted, ...p }: P & { muted?: boolean }) => (
  <Ico {...p}>
    <path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500z" />
    {muted ? <path d="m16 9.500 5 5M21 9.500l-5 5" /> : <path d="M15.500 9a4.200 4.200 0 0 1 0 6M18 6.500a8 8 0 0 1 0 11" />}
  </Ico>
)
export const IcoPause = (p: P) => (
  <Ico {...p}>
    <path d="M9 6v12M15 6v12" />
  </Ico>
)
export const IcoPlay = (p: P) => (
  <Ico {...p}>
    <path d="m8 5.500 11 6.500-11 6.500z" />
  </Ico>
)
export const IcoLock = (p: P) => (
  <Ico {...p}>
    <rect x="5" y="10.500" width="14" height="9.500" rx="2" />
    <path d="M8.500 10.500V8a3.500 3.500 0 0 1 7 0v2.500" />
  </Ico>
)
export const IcoCheck = (p: P) => (
  <Ico {...p}>
    <path d="m5 12.500 4.500 4.500L19 7.500" />
  </Ico>
)
export const IcoHelp = (p: P) => (
  <Ico {...p}>
    <circle cx="12" cy="12" r="8.500" />
    <path d="M9.700 9.600a2.400 2.400 0 1 1 3.400 2.200c-.700.400-1.100.800-1.100 1.600M12 16.300v.1" />
  </Ico>
)
export const IcoCrown = (p: P) => (
  <Ico {...p}>
    <path d="m4 17 1.500-9 4.500 4 2-6 2 6 4.500-4L20 17zM4.500 20h15" />
  </Ico>
)
export const IcoFlame = (p: P) => (
  <Ico {...p}>
    <path d="M12 3c.5 3-3.500 4.800-3.500 9a3.500 3.500 0 0 0 7 0c0-1.300-.500-2.300-1-3 .1 1.200-.7 2-1.500 2 .8-2.200.5-5.800-1-8z" />
    <path d="M12 21a4 4 0 0 0 4-4" opacity="0" />
  </Ico>
)
export const IcoPalette = (p: P) => (
  <Ico {...p}>
    <path d="M12 3.500a8.500 8.500 0 1 0 0 17c1.300 0 2-.800 2-1.700 0-1.500-1.400-1.700-1.400-3 0-.900.700-1.600 1.600-1.600H17a3.500 3.500 0 0 0 3.500-3.500C20.500 6.800 16.800 3.500 12 3.500z" />
    <circle cx="8" cy="11" r="1" /><circle cx="11" cy="7.500" r="1" /><circle cx="15.500" cy="8.500" r="1" />
  </Ico>
)

// ----- peças (por lugar do corpo)
export const IcoHair = (p: P) => (
  <Ico {...p}>
    <path d="M6 20c-1-5-.5-9 2-12 1.500-2 3.500-3 6-2.500 2.500.5 4 3 4 6.500 0 3-.5 5.500-1.500 8" />
    <path d="M9 20c.5-3 .5-6 2-9 1.500 1.500 3.500 2 5.500 2" />
  </Ico>
)
export const IcoTop = (p: P) => (
  <Ico {...p}>
    <path d="M8 4 4 7.500l2 3 2-1V20h8V9.500l2 1 2-3L16 4c0 1.500-1.800 2.500-4 2.500S8 5.500 8 4z" />
  </Ico>
)
export const IcoSkirt = (p: P) => (
  <Ico {...p}>
    <path d="M8.500 4h7l1 4L21 20H3L7.500 8z" />
    <path d="M8 8.500h8M9.500 13l-1.200 7M14.500 13l1.200 7" />
  </Ico>
)
export const IcoGlove = (p: P) => (
  <Ico {...p}>
    <path d="M7 21v-5.500L5 11V8.500a1.200 1.200 0 0 1 2.400 0V11M7.400 11V5.500a1.200 1.200 0 0 1 2.400 0V10M9.800 10V4.500a1.200 1.200 0 0 1 2.400 0V10M12.200 10V5.500a1.200 1.200 0 0 1 2.400 0V13l2-2a1.300 1.300 0 0 1 2 1.700L15 17.500V21z" />
  </Ico>
)
export const IcoSock = (p: P) => (
  <Ico {...p}>
    <path d="M8.500 3h6v9l5 3.500c1.200.900 1 2.700-.4 3.400L16 21l-3-1.500-4.500-3z" />
    <path d="M8.500 7h6" />
  </Ico>
)
export const IcoTiara = (p: P) => (
  <Ico {...p}>
    <path d="M3.500 17.500h17M4.500 17.500 6 9l3.500 4L12 5.500 14.500 13 18 9l1.500 8.500" />
    <circle cx="12" cy="4" r="0.800" />
  </Ico>
)
export const IcoGem = (p: P) => (
  <Ico {...p}>
    <path d="m7 4-4 5.500L12 20l9-10.500L17 4zM3 9.500h18M9.500 4 8 9.500 12 20l4-10.500L14.500 4" />
  </Ico>
)
export const IcoEar = (p: P) => (
  <Ico {...p}>
    <circle cx="12" cy="6" r="1.800" />
    <path d="M12 8v3M12 11l-3 4.500 3 3.500 3-3.500z" />
  </Ico>
)
export const IcoNecklace = (p: P) => (
  <Ico {...p}>
    <path d="M5 4c0 8 3 12 7 12s7-4 7-12" />
    <circle cx="12" cy="18.500" r="2" />
  </Ico>
)
export const IcoBracelet = (p: P) => (
  <Ico {...p}>
    <ellipse cx="12" cy="12" rx="8" ry="4.500" />
    <ellipse cx="12" cy="12" rx="5.500" ry="2.700" />
  </Ico>
)
export const IcoRing = (p: P) => (
  <Ico {...p}>
    <circle cx="12" cy="14.500" r="5.500" />
    <path d="m9.500 6.500 1.500-3h2l1.500 3-2.500 2z" />
  </Ico>
)

import type { ItemSlot } from '../../../game/character/catalog'
export function SlotIcon({ slot, size = 28 }: { slot: ItemSlot; size?: number }) {
  const m: Partial<Record<ItemSlot, (p: P) => ReactNode>> = {
    hair: IcoHair, top: IcoTop, bottom: IcoSkirt, dress: IcoSkirt, gloves: IcoGlove, legwear: IcoSock,
    head: IcoTiara, ears: IcoEar, neck: IcoNecklace, wrist: IcoBracelet, finger: IcoRing,
  }
  const C = m[slot] ?? IcoGem
  return <>{C({ size })}</>
}

/** Rosto de reação da cliente. */
export function Face({ mood, size = 44 }: { mood: 'happy' | 'neutral' | 'unhappy'; size?: number }) {
  const col = mood === 'happy' ? '#4f8a64' : mood === 'neutral' ? '#a98748' : '#a8453f'
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label={mood === 'happy' ? 'Satisfeita' : mood === 'neutral' ? 'Indecisa' : 'Insatisfeita'} role="img">
      <circle cx="24" cy="24" r="21" fill="#fbf8f1" stroke={col} strokeWidth="2.500" />
      <circle cx="24" cy="24" r="21" fill={col} opacity="0.12" />
      {mood === 'happy' ? (
        <>
          <path d="M14.500 20c1-2 3.500-2 4.500 0M29 20c1-2 3.500-2 4.500 0" stroke={col} strokeWidth="2.500" fill="none" strokeLinecap="round" />
          <path d="M14 28c2.500 7 17.500 7 20 0z" fill={col} />
        </>
      ) : mood === 'neutral' ? (
        <>
          <circle cx="17" cy="20" r="2.400" fill={col} /><circle cx="31" cy="20" r="2.400" fill={col} />
          <path d="M16 32h16" stroke={col} strokeWidth="2.800" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="17" cy="21" r="2.400" fill={col} /><circle cx="31" cy="21" r="2.400" fill={col} />
          <path d="M15.500 14.500 20 16.500M32.500 14.500 28 16.500" stroke={col} strokeWidth="2.200" strokeLinecap="round" />
          <path d="M16 35c2.500-5 13.500-5 16 0" stroke={col} strokeWidth="2.800" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
