import type { ReactNode, SVGProps } from 'react'
import type { ItemSlot } from '../../game/character/catalog'

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

export const IconUser = make(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1-4.5 4-6.5 8-6.5s7 2 8 6.5" />
  </>,
)
export const IconBrush = make(
  <>
    <path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L11 15.8 7.8 16.2 8.2 13z" />
    <path d="M7.8 16.2C7.8 19 6 21 3 21c2-1 1-3.5 2.5-4.5.8-.5 1.8-.5 2.3-.3" />
  </>,
)
export const IconHanger = make(
  <>
    <path d="M12 7V5.5a2.5 2.5 0 1 1 2.5 2.5" />
    <path d="M12 7 2.5 15a1.5 1.5 0 0 0 1 2.6h17a1.5 1.5 0 0 0 1-2.6z" />
  </>,
)
export const IconScroll = make(
  <>
    <path d="M7 3h11a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-1h4" />
    <path d="M7 3a2 2 0 0 0-2 2v12" />
    <path d="M10 9h7M10 13h7" />
  </>,
)
export const IconGear = make(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </>,
)
export const IconClose = make(<path d="M6 6l12 12M18 6 6 18" />)
export const IconCheck = make(<path d="m5 12.5 4.5 4.5L19 7.5" />)
export const IconLock = make(
  <>
    <rect x="5" y="11" width="14" height="9" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>,
)
export const IconChat = make(<path d="M21 12a8 8 0 0 1-11.7 7.1L3 21l1.9-5.5A8 8 0 1 1 21 12z" />)
export const IconSend = make(<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" />)
export const IconPencil = make(<path d="M4 20l1-4L17 4a2 2 0 0 1 3 3L8 19zM14 7l3 3" />)
export const IconStar = make(<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />)
export const IconPin = make(
  <>
    <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </>,
)
export const IconUndo = make(<path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />)
export const IconSave = make(
  <>
    <path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M8 3v5h7V3M8 21v-7h8v7" />
  </>,
)
export const IconCamera = make(
  <>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </>,
)
export const IconBag = make(
  <>
    <path d="M5 8h14l1 12H4z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </>,
)

// ---- slots de equipamento ----
const IconHair = make(<path d="M12 3c-4.5 0-7 3-7 7 0 3 1 5 .5 8 1.5-1 2.5-3 2.5-5 3 0 6-1.5 7-5 1 2 2 4 3 5 0-4-.5-6-1-8-.8-1.8-2.5-2-5-2z" />)
const IconTop = make(<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3c-.5 1.8-2 3-4 3S8.500 4.800 8 3z" />)
const IconSkirt = make(<path d="M8 4h8l1 3 4 13H3L7 7zM8 4l1 3M16 4l-1 3" />)
const IconDress = make(<path d="M9 3 8 8l-2 3 2 1-3 9h14l-3-9 2-1-2-3-1-5M9 3c1 2 5 2 6 0" />)
const IconGloves = make(<path d="M8 21v-6L5 9.500a1.300 1.300 0 0 1 2.300-1L9 11V4a1.300 1.300 0 0 1 2.600 0v5V3a1.300 1.300 0 0 1 2.600 0v6V4.500a1.300 1.300 0 0 1 2.600 0V14l1-2a1.300 1.300 0 0 1 2.300 1l-2 6z" />)
const IconLegs = make(<path d="M8 3h8l1 8-2 10h-3l-.5-9h-1L10 21H7l-2-10z" />)
const IconShoe = make(<path d="M3 16c4 0 6-3 6-9l3 3c1 1 3 1.500 6 2.500 2 .7 3 1.500 3 3.500v1H3z" />)
const IconNeck = make(
  <>
    <path d="M5 6c1 8 3 11 7 11s6-3 7-11" />
    <circle cx="12" cy="19.500" r="1.600" />
  </>,
)
const IconEar = make(
  <>
    <circle cx="12" cy="6" r="1.500" />
    <path d="M12 7.500v5" />
    <path d="m12 13 2.500 3-2.500 4-2.500-4z" />
  </>,
)
const IconCrown = make(<path d="m3 8 4.500 4L12 5l4.500 7L21 8l-2 11H5z" />)
const IconWrist = make(
  <>
    <ellipse cx="12" cy="12" rx="8" ry="4.500" />
    <ellipse cx="12" cy="12" rx="8" ry="4.500" transform="translate(0 -3)" opacity=".5" />
  </>,
)
const IconRing = make(
  <>
    <circle cx="12" cy="15" r="5.500" />
    <path d="m9 6.500 3-3.500 3 3.500-3 2.500z" />
  </>,
)

const IconHat = make(
  <>
    <path d="M7 13c0-4 2-7 5-7s5 3 5 7" />
    <path d="M2.500 16c0-1.800 4-3 9.500-3s9.500 1.200 9.500 3c0 1.600-4 2.600-9.500 2.600S2.500 17.600 2.500 16z" />
    <path d="M7.200 12.200c3 1 7 1 9.600 0" />
  </>,
)
const IconGlasses = make(
  <>
    <circle cx="7" cy="14" r="3.800" />
    <circle cx="17" cy="14" r="3.800" />
    <path d="M10.800 13.500c.8-.8 1.600-.8 2.400 0M3.200 13 2 9.500M20.800 13 22 9.500" />
  </>,
)
const IconHandbag = make(
  <>
    <path d="M4.500 9h15l1.200 11H3.300z" />
    <path d="M8.500 9V7a3.500 3.500 0 0 1 7 0v2" />
    <path d="M10 13.500h4" />
  </>,
)
const IconBelt = make(
  <>
    <path d="M2.500 9.500h19v5h-19z" />
    <rect x="9.500" y="8" width="5" height="8" rx="1.200" />
    <path d="M12 12h.01M5 12h.01M19 12h.01" />
  </>,
)
const IconScarf = make(<path d="M5 4c3 2 11 2 14 0v5c-3 2-11 2-14 0zM9 11l-1 9 3-2 1 3 1-12M15 12l1 8 3-2" />)
const IconAnklet = make(
  <>
    <path d="M7 4v8c0 3 1 5 2 8h6c1-3 2-5 2-8V4" />
    <path d="M7.500 15.500c3 1.500 6 1.500 9 0" />
    <circle cx="12" cy="18.200" r="1.200" />
  </>,
)
const IconBrooch = make(
  <>
    <path d="m12 3 2.200 4.600 5 .7-3.600 3.500.9 5L12 14.400 7.500 16.800l.9-5L4.800 8.300l5-.7z" />
    <path d="M12 17v4" />
  </>,
)

export const SLOT_ICONS: Record<ItemSlot, (p: P) => ReactNode> = {
  hair: IconHair,
  top: IconTop,
  bottom: IconSkirt,
  dress: IconDress,
  gloves: IconGloves,
  legwear: IconLegs,
  shoes: IconShoe,
  neck: IconNeck,
  ears: IconEar,
  head: IconCrown,
  wrist: IconWrist,
  finger: IconRing,
  hat: IconHat,
  glasses: IconGlasses,
  bag: IconHandbag,
  belt: IconBelt,
  scarf: IconScarf,
  anklet: IconAnklet,
  brooch: IconBrooch,
}
