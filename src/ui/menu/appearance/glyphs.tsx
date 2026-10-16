import type { ReactNode, SVGProps } from 'react'

/**
 * Icones desenhados para as opcoes do criador (olho, sobrancelha, labios...). Traco fino `currentColor`,
 * preenchimentos com opacidade para sugerir a maquiagem. Tudo vetorial, 28x20.
 */
type P = SVGProps<SVGSVGElement>
const svg = (children: ReactNode, p: P = {}) => (
  <svg viewBox="0 0 28 20" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden width={28} height={20} {...p}>
    {children}
  </svg>
)
const EYE = <path d="M3 12.500C7 7.500 21 7.500 25 12.500C21 16.500 7 16.500 3 12.500Z" />
const IRIS = <circle cx="14" cy="12.200" r="2.300" fill="currentColor" stroke="none" />

const eye = (extra: ReactNode) =>
  svg(
    <>
      {extra}
      {EYE}
      {IRIS}
    </>,
  )

const GLYPHS: Record<string, Record<string, ReactNode>> = {
  shadow: {
    none: eye(null),
    wash: eye(<path d="M4 11C8 4.500 20 4.500 24 11C20 8.600 8 8.600 4 11Z" fill="currentColor" fillOpacity=".22" stroke="none" />),
    smoky: eye(<path d="M3 12C7 3.500 21 3.500 25 12C21 8 7 8 3 12Z" fill="currentColor" fillOpacity=".55" stroke="none" />),
    cut: eye(
      <>
        <path d="M4.500 10C9 6.500 19 6.500 23.500 10" />
        <path d="M5 11C9 9.200 19 9.200 23 11C19 10.200 9 10.200 5 11Z" fill="currentColor" fillOpacity=".5" stroke="none" />
      </>,
    ),
    halo: eye(
      <>
        <circle cx="6.500" cy="11.500" r="2.400" fill="currentColor" fillOpacity=".5" stroke="none" />
        <circle cx="21.500" cy="11.500" r="2.400" fill="currentColor" fillOpacity=".5" stroke="none" />
      </>,
    ),
    graphic: eye(<path d="M3.500 8C8 2.500 20 2.500 24.500 8" strokeWidth={3} />),
  },
  liner: {
    none: eye(null),
    tight: eye(<path d="M4 12C8 8.500 20 8.500 24 12" strokeWidth={1} />),
    classic: eye(<path d="M3.500 12C8 7.500 20 7.500 24.500 12" strokeWidth={2.400} />),
    wing: eye(<path d="M3 12C8 7.500 20 7.500 25 12L27 7.500" strokeWidth={2.200} />),
    graphic: eye(
      <>
        <path d="M4 12C8 8.500 20 8.500 24 12" strokeWidth={1.200} />
        <path d="M5 6.500C10 3.500 18 3.500 23 6.500" strokeWidth={1.600} />
      </>,
    ),
    color: eye(<path d="M3.500 12C8 7.500 20 7.500 24.500 12" strokeWidth={2.400} strokeDasharray="0.1 3.200" />),
  },
  lashes: {
    natural: svg(
      <>
        {EYE}
        <path d="M6 10.500 4.500 8.500M10 8.800 9 6.500M14 8 14 5.500M18 8.800 19 6.500M22 10.500 23.500 8.500" strokeWidth={1} />
      </>,
    ),
    doll: svg(
      <>
        {EYE}
        <path d="M5 11 3.500 8M7 9.500 5.500 6.500M9 8.700 8 5.500M11 8.200 10.500 5M13 8 13 4.800M15 8 15.500 4.800M17 8.200 18 5M19 8.700 20.500 5.500M21 9.500 23 6.500M23 11 24.800 8" strokeWidth={1} />
      </>,
    ),
    dramatic: svg(
      <>
        {EYE}
        <path d="M5 11 1.800 7.500M8 9 5.500 4.500M11 8.200 9.500 3M14 8 14 2.500M17 8.200 19.500 3.500M20 9 24 5.500" strokeWidth={1.200} />
      </>,
    ),
    spider: svg(
      <>
        {EYE}
        <path d="M6 10.500 2.800 5.500M10 8.800 8 2.500M14 8 14 1.500M18 8.800 20 2.500M22 10.500 25.200 5.500M8 15 6.800 18.500M14 16 14 19.500M20 15 21.200 18.500" strokeWidth={0.9} />
      </>,
    ),
  },
  brow: {
    painted: svg(<path d="M3 13C8 8.500 18 7.500 25 11" strokeWidth={2.200} opacity=".55" />),
    soft: svg(<path d="M3 14C7 7.500 17 5.500 25 12" strokeWidth={2.600} />),
    straight: svg(<path d="M3 11.500C10 10 18 10 25 11.500" strokeWidth={2.800} />),
    thin: svg(<path d="M3 15C8 6.500 17 4 25 13" strokeWidth={1.100} />),
    bold: svg(<path d="M3 14C7 6.500 17 5 25 12" strokeWidth={4.800} />),
  },
  blush: {
    none: svg(<circle cx="14" cy="10" r="5" strokeDasharray="1 3" />),
    apple: svg(<circle cx="14" cy="10" r="6.500" fill="currentColor" fillOpacity=".3" stroke="none" />),
    draping: svg(<ellipse cx="14" cy="10" rx="10" ry="3.200" transform="rotate(-18 14 10)" fill="currentColor" fillOpacity=".3" stroke="none" />),
    sunkissed: svg(
      <>
        <ellipse cx="14" cy="9" rx="12" ry="3.200" fill="currentColor" fillOpacity=".25" stroke="none" />
        <circle cx="14" cy="13.500" r="2.800" fill="currentColor" fillOpacity=".35" stroke="none" />
      </>,
    ),
  },
  lip: {
    matte: svg(<path d="M3 10C8 5.500 11 6.500 14 8.500C17 6.500 20 5.500 25 10C20 16 8 16 3 10Z" fill="currentColor" fillOpacity=".4" />),
    satin: svg(
      <>
        <path d="M3 10C8 5.500 11 6.500 14 8.500C17 6.500 20 5.500 25 10C20 16 8 16 3 10Z" fill="currentColor" fillOpacity=".4" />
        <path d="M9 11.500C12 13 16 13 19 11.500" strokeWidth={0.9} opacity=".7" />
      </>,
    ),
    gloss: svg(
      <>
        <path d="M3 10C8 5.500 11 6.500 14 8.500C17 6.500 20 5.500 25 10C20 16 8 16 3 10Z" fill="currentColor" fillOpacity=".4" />
        <path d="M8 11.500C11 10.300 13 10.300 15 10.800" strokeWidth={1.800} stroke="#fff" opacity=".85" />
      </>,
    ),
    metallic: svg(
      <>
        <path d="M3 10C8 5.500 11 6.500 14 8.500C17 6.500 20 5.500 25 10C20 16 8 16 3 10Z" fill="currentColor" fillOpacity=".55" />
        <path d="m20 3 .8 1.700 1.700.8-1.700.8L20 8l-.8-1.700-1.700-.8 1.700-.8z" fill="currentColor" stroke="none" />
      </>,
    ),
  },
}

/** Icone de estilo: `kind` = shadow | liner | lashes | brow | blush | lip. */
export function StyleGlyph({ kind, id }: { kind: keyof typeof GLYPHS; id: string }) {
  return <>{GLYPHS[kind]?.[id] ?? null}</>
}
