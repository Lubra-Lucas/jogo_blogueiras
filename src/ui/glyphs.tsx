import type { ReactNode, SVGProps } from 'react'
import type { EmoteId } from '../game/character/animation/emoteStore'

/**
 * Conjunto unico de icones de linha (24x24, traco 1.7, pontas redondas) usado no celular, na roda de emotes e no HUD.
 * Nenhum emoji: todos desenhados aqui.
 */
type P = SVGProps<SVGSVGElement>
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
const g = (d: ReactNode) =>
  function Glyph(p: P) {
    return (
      <svg {...base} {...p}>
        {d}
      </svg>
    )
  }

// ---- apps do celular ----
export const GMissions = g(
  <>
    <path d="M6 3.5h9.5L19 7v13.5H6z" />
    <path d="M15 3.5V7.5h4M9 12l1.7 1.7L14.5 10M9 17h6" />
  </>,
)
export const GBlogram = g(
  <>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17" cy="7" r="0.9" fill="currentColor" stroke="none" />
  </>,
)
export const GMessages = g(
  <>
    <path d="M4 5.5h16v10.5H11l-4.500 3.500V16H4z" />
    <path d="M8 9.500h8M8 12.500h5" />
  </>,
)
export const GMap = g(
  <>
    <path d="M3.500 6.500 9 4.500l6 2 5.500-2v13l-5.500 2-6-2-5.500 2z" />
    <path d="M9 4.500v13M15 6.500v13" />
  </>,
)
export const GCamera = g(
  <>
    <path d="M4 8.500h3l1.500-2.500h7L17 8.500h3a.5.5 0 0 1 .5.5v9.500a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V9a.5.5 0 0 1 .5-.5z" />
    <circle cx="12" cy="13.500" r="3.500" />
  </>,
)
export const GWardrobe = g(
  <>
    <path d="M12 7V6a2 2 0 1 1 2 2" />
    <path d="M12 7.500 3.500 14a1.200 1.200 0 0 0 .7 2.200h15.600a1.200 1.200 0 0 0 .7-2.200z" />
    <path d="M5 18.500h14" />
  </>,
)
export const GProfile = g(
  <>
    <circle cx="12" cy="8.500" r="3.800" />
    <path d="M4.500 20c.8-3.800 3.700-5.800 7.500-5.800s6.700 2 7.500 5.800" />
  </>,
)
export const GSettings = g(
  <>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9M4 12h5M13 12h7" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
    <circle cx="11" cy="12" r="2" transform="translate(0 0)" />
  </>,
)
export const GPhone = g(
  <>
    <rect x="6.500" y="2.800" width="11" height="18.400" rx="3" />
    <path d="M10.500 5.500h3M11 18.500h2" />
  </>,
)
export const GWheel = g(
  <>
    <circle cx="12" cy="12" r="8.500" />
    <circle cx="12" cy="12" r="2.600" />
    <path d="M12 3.500v6M12 14.500v6M3.500 12h6M14.500 12h6" strokeDasharray="0.1 0" />
  </>,
)
export const GPin = g(
  <>
    <path d="M12 21s6.500-5.600 6.500-11A6.500 6.500 0 0 0 5.500 10C5.500 15.400 12 21 12 21z" />
    <circle cx="12" cy="10" r="2.300" />
  </>,
)
export const GBolt = g(<path d="M13 3 5.500 13.500H11L10 21l7.500-10.500H12z" />)
export const GStar = g(<path d="m12 3.500 2.600 5.400 5.900.8-4.300 4.100 1 5.900L12 16.900l-5.200 2.800 1-5.900L3.500 9.700l5.900-.8z" />)
export const GCheck = g(<path d="m5 12.500 4.500 4.500L19 7.500" />)
export const GClose = g(<path d="M6 6l12 12M18 6 6 18" />)
export const GBack = g(<path d="M14.500 5 7.500 12l7 7" />)
export const GShutter = g(
  <>
    <circle cx="12" cy="12" r="8.500" />
    <circle cx="12" cy="12" r="5.200" />
  </>,
)

// ---- clima / bateria (barra de status) ----
export const GSun = g(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2.200M12 18.800V21M3 12h2.200M18.800 12H21M5.600 5.600l1.600 1.600M16.800 16.800l1.600 1.600M5.600 18.400l1.600-1.600M16.800 7.200l1.600-1.600" />
  </>,
)
export const GMoon = g(<path d="M19.500 14.500A8 8 0 0 1 9.500 4.500a8 8 0 1 0 10 10z" />)
export const GCloud = g(<path d="M7 18.500a4 4 0 0 1-.4-8A5.500 5.500 0 0 1 17.200 9.500 4.500 4.500 0 0 1 17 18.500z" />)
export const GRain = g(
  <>
    <path d="M7 15.500a4 4 0 0 1-.4-8A5.500 5.500 0 0 1 17.200 7 4.500 4.500 0 0 1 17 15.500z" />
    <path d="M8.500 18.500 7.500 21M12.500 18.500l-1 2.500M16.500 18.500l-1 2.500" />
  </>,
)

// ---- emotes (roda) ----
const EMOTE_GLYPHS: Record<EmoteId, (p: P) => ReactNode> = {
  wave: g(
    <>
      <path d="M9 20.500c-2-1.500-3-3.500-3-6V9.500a1.300 1.300 0 0 1 2.600 0V12M8.600 11V6.500a1.300 1.300 0 0 1 2.600 0V11M11.200 10.500V5.500a1.300 1.300 0 0 1 2.600 0V11M13.800 11V7a1.300 1.300 0 0 1 2.600 0v6.500c0 3.500-2.500 7-7.400 7" />
      <path d="M18.500 4.500a4 4 0 0 1 2 3M20 2.500a6.500 6.500 0 0 1 2.500 4.500" />
    </>,
  ),
  kiss: g(
    <>
      <path d="M3.500 14c2.500-3.200 5-3.800 8.500-1.500 3.500-2.300 6-1.700 8.500 1.500-2.500 3.800-5 4.500-8.500 4.500S6 17.800 3.500 14z" />
      <path d="M3.500 14c3 .8 5.500.5 8.500-1.500 3 2 5.500 2.300 8.500 1.500" />
      <path d="M17 4.500c.8-1.200 2.500-.6 2.500.8 0 1.400-2.500 2.700-2.500 2.700s-2.500-1.300-2.500-2.700c0-1.400 1.700-2 2.500-.8z" />
    </>,
  ),
  bow: g(
    <>
      <circle cx="16.500" cy="8.500" r="2.200" />
      <path d="M14.500 11.500 9 12.500l-2 7M9 12.500 5 9M9 12.500l5 1.500v6.500M4 20.500h16" />
    </>,
  ),
  point: g(
    <>
      <circle cx="7" cy="6.500" r="2.200" />
      <path d="M7 9.500v6M7 15.500 5 21M7 15.500l2 5.500M7 11.500l11-1.500M18 10l-2.500-2M18 10l-2.500 2.200" />
    </>,
  ),
  thankful: g(
    <>
      <path d="M12 20.500 7 15.500c-1.500-1.500-1.200-3.500.5-5L12 6.500" />
      <path d="M12 20.500l5-5c1.500-1.500 1.200-3.500-.5-5L12 6.500" />
      <path d="M12 6.500v14M12 3v1.500M8 4.500l1 1.200M16 4.500l-1 1.200" />
    </>,
  ),
  clap: g(
    <>
      <path d="M8 20c-2-1.500-3-3.500-3-6l2-4a1.300 1.300 0 0 1 2.400.8L8.500 13.500 12 8.500" />
      <path d="M16 20c2-1.500 3-3.500 3-6l-2-4a1.300 1.300 0 0 0-2.400.8l1 2.700L12 8.500" />
      <path d="M12 8.500V4M7.500 5l1.200 1.500M16.500 5l-1.200 1.500" />
    </>,
  ),
  laugh: g(
    <>
      <circle cx="12" cy="12" r="8.500" />
      <path d="M7.500 10c.7-1.300 2-1.300 2.700 0M13.800 10c.7-1.300 2-1.300 2.700 0" />
      <path d="M7.500 13.500h9a4.500 4.500 0 0 1-9 0z" />
    </>,
  ),
  cry: g(
    <>
      <circle cx="12" cy="12" r="8.500" />
      <path d="M8 10.500h2M14 10.500h2M9 16c1.200-1.300 4.800-1.300 6 0" />
      <path d="M9 12.500c-.8 1.800-.8 3 0 3.800.8-.8.8-2 0-3.800z" />
    </>,
  ),
  jump: g(
    <>
      <circle cx="12" cy="5.500" r="2" />
      <path d="M12 8v5M12 13l-3.500 3.500M12 13l3.500 3.500M12 9.500 8 7M12 9.500 16 7M6 20h12" />
    </>,
  ),
  dance: g(
    <>
      <path d="M9 18.500V6l10-2v12.500" />
      <circle cx="6.500" cy="18.500" r="2.500" />
      <circle cx="16.500" cy="16.500" r="2.500" />
      <path d="M9 9.500l10-2" />
    </>,
  ),
  desfile: g(
    <>
      <path d="M9 21 5.500 8M15 21l3.500-13M12 21V14M10.500 11.500h3" />
      <circle cx="12" cy="5" r="2" />
      <path d="M3 21h18" />
    </>,
  ),
  texting: g(
    <>
      <rect x="7.500" y="6.500" width="9" height="15" rx="2.500" />
      <path d="M10.500 9.500h3M11 19h2" />
      <path d="M5 3.500h6v3.200l-1.500-.9H5z" />
    </>,
  ),
}

export function EmoteGlyph({ id, ...p }: { id: EmoteId } & P) {
  return EMOTE_GLYPHS[id](p)
}
