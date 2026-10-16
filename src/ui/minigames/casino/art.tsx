import type { CSSProperties, ReactNode } from 'react'
import { SUIT_RED, rankLabel, type Card, type Suit as SuitT } from '../../../game/minigames/casino/cards'
import type { SymbolId } from '../../../game/minigames/casino/slots'
import type { Expression } from '../../../game/minigames/casino/pokerEngine'
import { BOT_STYLES } from '../../../game/minigames/casino/pokerBots'

/* ---------------------------------------------------------------- icones de linha */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const Svg = ({ children, size = 22 }: { children: ReactNode; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>{children}</svg>
)
export const IcoClose = () => <Svg size={20}><path {...S} strokeWidth={2.6} d="M6 6 L18 18 M18 6 L6 18" /></Svg>
export const IcoBack = () => <Svg size={20}><path {...S} strokeWidth={2.4} d="M14.5 5.5 L8 12 l6.5 6.5" /></Svg>
export const IcoSound = ({ on }: { on: boolean }) => (
  <Svg size={20}>
    <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor" />
    {on ? <path {...S} d="M15.5 9c1.4 1.7 1.4 4.3 0 6M18 6.5c2.8 3.2 2.8 8.8 0 12" /> : <path {...S} d="M16 9l5 6M21 9l-5 6" />}
  </Svg>
)
export const IcoHelp = () => <Svg size={20}><circle {...S} cx="12" cy="12" r="9" /><path {...S} d="M9.6 9.4a2.6 2.6 0 015 .9c0 1.7-2.6 2-2.6 3.6" /><circle cx="12" cy="17.4" r="1.2" fill="currentColor" /></Svg>
export const IcoTrophy = () => <Svg><path {...S} d="M7 4h10v5a5 5 0 01-10 0z" /><path {...S} d="M7 6H4c0 3 1.2 4.5 3.2 4.8M17 6h3c0 3-1.2 4.5-3.2 4.8M12 14v4M8.5 20h7" /></Svg>
export const IcoGift = () => <Svg><rect {...S} x="4" y="10" width="16" height="10" rx="1.5" /><path {...S} d="M3 7h18v3H3zM12 7v13M12 7c-1-3-5-3.5-5-1.2C7 7 9 7 12 7zm0 0c1-3 5-3.5 5-1.2C17 7 15 7 12 7z" /></Svg>
export const IcoUndo = () => <Svg><path {...S} d="M9 7L4.5 11.5 9 16M5 11.5h9a5 5 0 010 10" transform="translate(0 -3)" /></Svg>
export const IcoClear = () => <Svg><path {...S} d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></Svg>
export const IcoRepeat = () => <Svg><path {...S} d="M4 11a7 7 0 0112-4.6L19 9M20 13a7 7 0 01-12 4.6L5 15M19 4v5h-5M5 20v-5h5" /></Svg>
export const IcoPause = () => <Svg size={20}><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" /></Svg>
export const IcoBulb = () => <Svg><path {...S} d="M9 18h6M10 21h4M12 3a6 6 0 00-3.6 10.8c.4.4.6.9.6 1.4V16h6v-.8c0-.5.2-1 .6-1.4A6 6 0 0012 3z" /></Svg>
export const IcoCrown = ({ size = 22 }: { size?: number }) => <Svg size={size}><path {...S} d="M3.5 18.5l-1-11 5 4 4.5-7 4.5 7 5-4-1 11z" /></Svg>
export const IcoInfo = () => <Svg size={18}><circle {...S} cx="12" cy="12" r="9" /><path {...S} d="M12 11v6" /><circle cx="12" cy="7.6" r="1.2" fill="currentColor" /></Svg>

/* ---------------------------------------------------------------- naipes e cartas */
export const SUIT_PATH: Record<SuitT, ReactNode> = {
  2: <path d="M12 21C5 15.5 2.5 12 2.5 8.3 2.5 5.5 4.6 3.5 7.2 3.5c2 0 3.8 1.1 4.8 3.1 1-2 2.8-3.1 4.8-3.1 2.6 0 4.7 2 4.7 4.8 0 3.700-2.500 7.200-9.500 12.700z" />,
  1: <path d="M12 2l8.500 10L12 22 3.500 12z" />,
  3: <path d="M12 2.200C16 7 21 10 21 14.200c0 2.800-2.100 4.600-4.500 4.600-1.500 0-2.900-.6-3.700-1.800.2 2.300 1 3.600 2.400 4.800H8.800c1.400-1.200 2.200-2.500 2.400-4.800-.8 1.200-2.200 1.800-3.700 1.800C5.100 18.800 3 17 3 14.200 3 10 8 7 12 2.200z" />,
  0: (
    <>
      <circle cx="12" cy="7.600" r="4.600" />
      <circle cx="6.800" cy="14" r="4.600" />
      <circle cx="17.200" cy="14" r="4.600" />
      <path d="M12 12c0 5-.8 7.500-3 9.800h6C12.800 19.500 12 17 12 12z" />
    </>
  ),
}
const RED = '#a3182a'
const BLK = '#15151b'
export const Suit = ({ s, size = 16, color }: { s: SuitT; size?: number; color?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={color ?? (SUIT_RED(s) ? RED : BLK)} aria-hidden>{SUIT_PATH[s]}</svg>
)

const PIPX = [28, 50, 72]
const PIPS: Record<number, [number, number][]> = {
  2: [[1, 30], [1, 110]],
  3: [[1, 30], [1, 70], [1, 110]],
  4: [[0, 30], [2, 30], [0, 110], [2, 110]],
  5: [[0, 30], [2, 30], [1, 70], [0, 110], [2, 110]],
  6: [[0, 30], [2, 30], [0, 70], [2, 70], [0, 110], [2, 110]],
  7: [[0, 30], [2, 30], [1, 50], [0, 70], [2, 70], [0, 110], [2, 110]],
  8: [[0, 30], [2, 30], [1, 50], [0, 70], [2, 70], [1, 90], [0, 110], [2, 110]],
  9: [[0, 30], [2, 30], [0, 57], [2, 57], [1, 70], [0, 83], [2, 83], [0, 110], [2, 110]],
  10: [[0, 30], [2, 30], [1, 44], [0, 57], [2, 57], [0, 83], [2, 83], [1, 96], [0, 110], [2, 110]],
}

export function CardFace({ card, width = 70, style, className }: { card: Card; width?: number; style?: CSSProperties; className?: string }) {
  const red = SUIT_RED(card.s)
  const ink = red ? RED : BLK
  const lab = rankLabel(card.r)
  const face = card.r >= 11 && card.r <= 13
  return (
    <svg viewBox="0 0 100 140" width={width} height={(width * 140) / 100} className={className} style={style} role="img" aria-label={`${lab} de ${['paus', 'ouros', 'copas', 'espadas'][card.s]}`}>
      <defs>
        <linearGradient id="cz-ivory" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fbf6e8" /><stop offset="1" stopColor="#e9dfc7" /></linearGradient>
      </defs>
      <rect x="1.500" y="1.500" width="97" height="137" rx="9" fill="url(#cz-ivory)" stroke="#b9a066" strokeWidth="1.200" />
      <rect x="6" y="6" width="88" height="128" rx="6" fill="none" stroke={ink} strokeOpacity=".12" strokeWidth=".8" />
      <text x="13" y="26" fontFamily="'Playfair Display','Times New Roman',serif" fontWeight="700" fontSize={lab.length > 1 ? 21 : 24} fill={ink} textAnchor="middle">{lab}</text>
      <g transform="translate(6.500 29) scale(.62)">{<Suit s={card.s} size={24} />}</g>
      <g transform="rotate(180 50 70)">
        <text x="13" y="26" fontFamily="'Playfair Display','Times New Roman',serif" fontWeight="700" fontSize={lab.length > 1 ? 21 : 24} fill={ink} textAnchor="middle">{lab}</text>
        <g transform="translate(6.500 29) scale(.62)"><Suit s={card.s} size={24} /></g>
      </g>
      {card.r === 14 && <g transform="translate(26 46) scale(2)"><Suit s={card.s} size={24} /></g>}
      {face && (
        <g>
          <rect x="24" y="30" width="52" height="80" rx="5" fill="none" stroke="#b08d4a" strokeWidth="1.400" />
          <rect x="28" y="34" width="44" height="72" rx="3" fill={ink} fillOpacity=".06" />
          <path d="M50 38 l5 8 h-10z M50 102 l5 -8 h-10z" fill="#b08d4a" />
          <text x="50" y="82" fontFamily="'Playfair Display','Times New Roman',serif" fontStyle="italic" fontWeight="700" fontSize="38" fill={ink} textAnchor="middle">{lab}</text>
          <g transform="translate(40 88) scale(.8)"><Suit s={card.s} size={24} /></g>
        </g>
      )}
      {card.r >= 2 && card.r <= 10 && PIPS[card.r].map(([c, y], i) => (
        <g key={i} transform={`translate(${PIPX[c] - 8} ${y - 8})${y > 70 ? ' rotate(180 8 8)' : ''}`}><Suit s={card.s} size={16} /></g>
      ))}
    </svg>
  )
}

export function CardBack({ width = 70, style, className }: { width?: number; style?: CSSProperties; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" width={width} height={(width * 140) / 100} className={className} style={style} aria-hidden>
      <defs>
        <pattern id="cz-lat" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0H10M0 0V10" stroke="#c9a24a" strokeOpacity=".5" strokeWidth=".7" />
        </pattern>
        <linearGradient id="cz-wine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7a1630" /><stop offset="1" stopColor="#470b19" /></linearGradient>
      </defs>
      <rect x="1.500" y="1.500" width="97" height="137" rx="9" fill="#efe6d2" stroke="#b9a066" strokeWidth="1.200" />
      <rect x="7" y="7" width="86" height="126" rx="5" fill="url(#cz-wine)" />
      <rect x="7" y="7" width="86" height="126" rx="5" fill="url(#cz-lat)" />
      <rect x="7" y="7" width="86" height="126" rx="5" fill="none" stroke="#e1c577" strokeWidth="1" />
      <g transform="translate(50 70)">
        <path d="M0 -24 L16 0 L0 24 L-16 0Z" fill="#470b19" stroke="#e1c577" strokeWidth="1.400" />
        <path d="M0 -12 L8 0 L0 12 L-8 0Z" fill="#e1c577" />
      </g>
    </svg>
  )
}

/* ---------------------------------------------------------------- fichas */
export const CHIP_VALUES = [10, 50, 100, 500, 1000] as const
const CHIP_STYLE: Record<number, { base: string; edge: string; ink: string }> = {
  10: { base: '#d8ccb0', edge: '#8c7e5e', ink: '#2c2a24' },
  50: { base: '#a3182a', edge: '#efe6d2', ink: '#fbf1dd' },
  100: { base: '#17171d', edge: '#c9a24a', ink: '#f2e3b8' },
  500: { base: '#1c3f7a', edge: '#efe6d2', ink: '#f6efdb' },
  1000: { base: '#b38b2a', edge: '#4a350a', ink: '#2a1d04' },
}
export function ChipArt({ value, size = 48, label }: { value: number; size?: number; label?: string }) {
  const c = CHIP_STYLE[value] ?? CHIP_STYLE[10]
  const txt = label ?? (value >= 1000 ? `${value / 1000}k` : String(value))
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <circle cx="50" cy="50" r="47" fill={c.base} stroke="#00000055" strokeWidth="2" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="43" y="3" width="14" height="15" rx="2" fill={c.edge} transform={`rotate(${i * 45} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="30" fill="none" stroke={c.edge} strokeWidth="2" strokeDasharray="3 3" opacity=".9" />
      <circle cx="50" cy="50" r="26" fill={c.base} stroke="#00000033" />
      <text x="50" y="58" textAnchor="middle" fontFamily="'Playfair Display',serif" fontWeight="700" fontSize={txt.length > 3 ? 20 : 25} fill={c.ink}>{txt}</text>
    </svg>
  )
}

/** Pilha pequena de fichas (para pote/aposta). */
export function ChipStack({ amount, size = 34 }: { amount: number; size?: number }) {
  const parts: number[] = []
  let rest = amount
  for (const v of [...CHIP_VALUES].reverse()) {
    let n = 0
    while (rest >= v && n < 4) {
      rest -= v
      n++
      parts.push(v)
    }
  }
  const shown = parts.slice(0, 8)
  return (
    <span className="cz-stack" style={{ height: size + shown.length * 4, width: size }} aria-hidden>
      {shown.map((v, i) => (
        <span key={i} style={{ position: 'absolute', bottom: i * 4, left: 0 }}><ChipArt value={v} size={size} label="" /></span>
      ))}
    </span>
  )
}

/* ---------------------------------------------------------------- simbolos do caca-niqueis */
export function SlotSymbol({ id, size = 64 }: { id: SymbolId; size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id="zs-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6e2a0" /><stop offset=".55" stopColor="#c9a24a" /><stop offset="1" stopColor="#8a6a22" /></linearGradient>
        <linearGradient id="zs-red" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d4283f" /><stop offset="1" stopColor="#7e0f22" /></linearGradient>
        <linearGradient id="zs-blk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3a3a44" /><stop offset="1" stopColor="#0c0c10" /></linearGradient>
        <linearGradient id="zs-wine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8a2040" /><stop offset="1" stopColor="#4b0c1f" /></linearGradient>
        <linearGradient id="zs-ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f4fbff" /><stop offset="1" stopColor="#8fbbd6" /></linearGradient>
      </defs>
      {id === 'batom' && (
        <g>
          <rect x="22" y="36" width="20" height="22" rx="2.500" fill="url(#zs-gold)" stroke="#6d5116" />
          <rect x="22" y="31" width="20" height="6" fill="#1a1a20" />
          <path d="M25 31V16c0-3 3-5 7-8 4 3 7 5 7 8v15z" fill="url(#zs-red)" stroke="#5c0a18" />
          <path d="M28 14c1-2 2-3 4-4" stroke="#ffffff88" strokeWidth="1.600" fill="none" strokeLinecap="round" />
          <rect x="25" y="40" width="3" height="14" rx="1.500" fill="#ffffff66" />
        </g>
      )}
      {id === 'salto' && (
        <g>
          <path d="M8 40 C14 38 20 34 24 26 L32 28 C36 34 44 40 54 38 C58 38 59 43 56 45 L50 45 L47 56 L43 56 L43 47 C34 48 20 49 12 47 C8 46 7 41 8 40z" fill="url(#zs-blk)" stroke="#000" />
          <path d="M24 26 L32 28 C34 31 37 34 40 36" stroke="#ffffff55" strokeWidth="1.600" fill="none" strokeLinecap="round" />
          <rect x="44" y="44" width="3.500" height="14" rx="1" fill="url(#zs-gold)" />
          <path d="M10 47 C20 50 34 49 43 47" stroke="#b81d33" strokeWidth="2.400" fill="none" />
          <circle cx="14" cy="43" r="2" fill="url(#zs-gold)" />
        </g>
      )}
      {id === 'bolsa' && (
        <g>
          <path d="M22 24c0-9 4-13 10-13s10 4 10 13" fill="none" stroke="url(#zs-gold)" strokeWidth="3.200" strokeLinecap="round" />
          <path d="M12 26h40l4 28c.3 2-1 4-3 4H11c-2 0-3.300-2-3-4z" fill="url(#zs-wine)" stroke="#2e0612" />
          <path d="M12 26h40l1 7H11z" fill="#ffffff22" />
          <rect x="28" y="30" width="8" height="9" rx="1.800" fill="url(#zs-gold)" stroke="#6d5116" />
          <circle cx="32" cy="35" r="1.400" fill="#4b0c1f" />
          <path d="M14 52h36" stroke="#e1c57788" strokeWidth="1" strokeDasharray="2 2" />
        </g>
      )}
      {id === 'diamante' && (
        <g>
          <path d="M16 22 L24 10 H40 L48 22 L32 56 Z" fill="url(#zs-ice)" stroke="#4f7893" strokeWidth="1.200" strokeLinejoin="round" />
          <path d="M16 22H48M24 10L28 22L32 10L36 22L40 10M28 22L32 56L36 22" fill="none" stroke="#4f7893" strokeWidth="1" strokeLinejoin="round" />
          <path d="M20 22L28 22L32 56z" fill="#ffffff55" />
          <path d="M49 6l1.500 3.500L54 11l-3.500 1.500L49 16l-1.500-3.500L44 11l3.500-1.500z" fill="#fff" />
        </g>
      )}
      {id === 'coroa' && (
        <g>
          <path d="M9 48L6 20l13 11 13-19 13 19 13-11-3 28z" fill="url(#zs-gold)" stroke="#6d5116" strokeLinejoin="round" />
          <rect x="9" y="48" width="46" height="7" rx="1.500" fill="url(#zs-gold)" stroke="#6d5116" />
          <circle cx="32" cy="14" r="3" fill="#d4283f" stroke="#6d5116" />
          <circle cx="6" cy="19" r="2.400" fill="#d4283f" stroke="#6d5116" />
          <circle cx="58" cy="19" r="2.400" fill="#d4283f" stroke="#6d5116" />
          <circle cx="20" cy="51.500" r="1.800" fill="#1c3f7a" />
          <circle cx="32" cy="51.500" r="1.800" fill="#d4283f" />
          <circle cx="44" cy="51.500" r="1.800" fill="#1c3f7a" />
        </g>
      )}
      {id === 'estrela' && (
        <g>
          <path d="M32 5l7.500 17 18.500 2-14 12.500 4 18.500L32 46l-16 9 4-18.500L6 24l18.500-2z" fill="url(#zs-gold)" stroke="#6d5116" strokeLinejoin="round" />
          <path d="M32 12l5 12.500-5 4-5-4z" fill="#ffffff55" />
          <text x="32" y="40" textAnchor="middle" fontFamily="'Playfair Display',serif" fontWeight="700" fontSize="11" fill="#5b4210">W</text>
        </g>
      )}
      {id === 'coracao' && (
        <g>
          <path d="M32 56C12 41 6 31 6 22c0-7 5-12 11.500-12 5 0 11 3 14.500 9 3.500-6 9.500-9 14.500-9C53 10 58 15 58 22c0 9-6 19-26 34z" fill="url(#zs-red)" stroke="#5c0a18" strokeLinejoin="round" />
          <path d="M14 20c1-4 4-6 8-6" stroke="#ffffff88" strokeWidth="2.400" fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  )
}

/* ---------------------------------------------------------------- avatares do poker */
const SKIN = ['#e9c5a6', '#c8916a', '#f0cdb0', '#a56b4a', '#dcb08c']

export function Avatar({ styleIdx, expr = 'neutral', size = 64, folded }: { styleIdx: number; expr?: Expression; size?: number; folded?: boolean }) {
  const st = BOT_STYLES[styleIdx % BOT_STYLES.length]
  const skin = SKIN[styleIdx % SKIN.length]
  const hair = st.hair
  const idx = styleIdx % BOT_STYLES.length
  const eyeY = 44
  const look = expr === 'thinking' ? 2.500 : 0
  const brow = {
    neutral: [0, 0], confident: [-1.500, 1.500], worried: [2.500, -2.500], happy: [-1, -1], thinking: [-2.500, 1], sad: [3, -3],
  }[expr]
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ opacity: folded ? 0.45 : 1, filter: folded ? 'grayscale(.5)' : undefined }} aria-hidden>
      <path d="M12 100c2-18 16-26 38-26s36 8 38 26z" fill={st.accent} />
      <path d="M40 76l10 10 10-10" fill="none" stroke="#efe6d2" strokeWidth="2.500" />
      <rect x="43" y="60" width="14" height="18" rx="5" fill={skin} />
      {idx === 2 && <path d="M18 44c-4 18 0 38 8 44l10-4-6-30z M82 44c4 18 0 38-8 44l-10-4 6-30z" fill={hair} />}
      {idx === 0 && <circle cx="50" cy="12" r="10" fill={hair} />}
      <ellipse cx="50" cy="44" rx="23" ry="26" fill={skin} />
      {idx === 0 && <path d="M26 42c0-20 10-27 24-27s24 7 24 27c-4-10-12-16-24-16s-20 6-24 16z" fill={hair} />}
      {idx === 1 && <path d="M27 38c1-14 10-20 23-20s22 6 23 20c-5-6-12-9-23-9s-18 3-23 9z" fill={hair} />}
      {idx === 2 && <path d="M25 46c-2-24 8-32 25-32s27 8 25 32c-3-10-8-18-17-20-6 6-18 8-33 20z" fill={hair} />}
      {idx === 3 && <path d="M24 44c-6-6-3-16 4-19-2-8 6-13 12-9 3-5 12-5 15 0 6-4 14 1 12 9 7 3 10 13 4 19-2-8-8-12-14-13-8 4-22 4-33 13z" fill={hair} />}
      {idx === 4 && <path d="M28 40c0-13 9-21 22-21s22 8 22 21c-3-5-6-8-12-9-8 4-20 3-32 9z" fill={hair} />}
      {idx === 3 && (
        <g fill="none" stroke="#6b5a2b" strokeWidth="1.800"><circle cx="40" cy={eyeY} r="7" /><circle cx="60" cy={eyeY} r="7" /><path d={`M47 ${eyeY}h6`} /></g>
      )}
      {/* sobrancelhas */}
      <path d={`M31 ${eyeY - 9 + brow[0]} L46 ${eyeY - 9 + brow[1]}`} stroke={hair} strokeWidth="2.600" strokeLinecap="round" />
      <path d={`M54 ${eyeY - 9 + brow[1]} L69 ${eyeY - 9 + brow[0]}`} stroke={hair} strokeWidth="2.600" strokeLinecap="round" />
      {/* olhos */}
      <ellipse cx={40 + look} cy={eyeY} rx="3.200" ry={expr === 'happy' ? 1.600 : 3.800} fill="#1b1b22" />
      <ellipse cx={60 + look} cy={eyeY} rx="3.200" ry={expr === 'happy' ? 1.600 : 3.800} fill="#1b1b22" />
      {/* boca */}
      {expr === 'neutral' && <path d="M42 66h16" stroke="#7b3a3a" strokeWidth="2.600" strokeLinecap="round" />}
      {expr === 'confident' && <path d="M40 65q10 6 20-2" fill="none" stroke="#7b2f35" strokeWidth="2.800" strokeLinecap="round" />}
      {expr === 'happy' && <path d="M38 63q12 12 24 0" fill="#fff7ee" stroke="#7b2f35" strokeWidth="2.400" strokeLinejoin="round" />}
      {expr === 'worried' && <path d="M41 68q4-3 9 0t9 0" fill="none" stroke="#7b3a3a" strokeWidth="2.400" strokeLinecap="round" />}
      {expr === 'thinking' && <path d="M43 66h10" stroke="#7b3a3a" strokeWidth="2.600" strokeLinecap="round" />}
      {expr === 'sad' && <path d="M40 69q10-7 20 0" fill="none" stroke="#7b3a3a" strokeWidth="2.600" strokeLinecap="round" />}
      {idx === 1 && <path d="M38 61q12-4 24 0q-2 4-12 3.500q-10 .5-12-3.500z" fill={hair} />}
      {idx === 2 && <ellipse cx="50" cy="66" rx="8" ry="3" fill="#b4223d" opacity=".0" />}
    </svg>
  )
}

export function Brand() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M12 2l3 6.500 7 1-5.200 4.800 1.400 7L12 17.800 5.800 21.300l1.400-7L2 9.500l7-1z" fill="none" stroke="currentColor" strokeWidth="1.800" strokeLinejoin="round" />
    </svg>
  )
}
