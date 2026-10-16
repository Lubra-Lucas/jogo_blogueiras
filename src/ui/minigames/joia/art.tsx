/** Ícones SVG da Joalheria: pedras lapidadas, pérolas, elos, pingentes e ícones de interface. */
import {
  GEM_COLORS, GEM_DARK, GEM_HEX, GEM_LIGHT, METALS, METAL_DEEP, METAL_HEX, PEARLS, PEARL_HEX,
  type GemColor, type GemShape, type Metal,
} from '../../../game/minigames/joia/data'
import type { Spec } from '../../../game/minigames/joia/logic'

const STAR_PTS = Array.from({ length: 10 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 10 - Math.PI / 2
  const r = i % 2 === 0 ? 17 : 7.6
  return `${(20 + Math.cos(a) * r).toFixed(2)},${(21 + Math.sin(a) * r).toFixed(2)}`
}).join(' ')

const SHAPE_D: Record<GemShape, string> = {
  redondo: 'M20 3.5 L31.7 8.3 L36.5 20 L31.7 31.7 L20 36.5 L8.3 31.7 L3.5 20 L8.3 8.3Z',
  gota: 'M20 3 C27 13 34 19 34 26 A14 14 0 0 1 6 26 C6 19 13 13 20 3Z',
  quadrado: 'M11 5 H29 L35 11 V29 L29 35 H11 L5 29 V11Z',
  coracao: 'M20 35 C6 25 3 15.5 8 10.5 C13 5.5 19 8.5 20 12.5 C21 8.5 27 5.5 32 10.5 C37 15.5 34 25 20 35Z',
  estrela: `M${STAR_PTS.split(' ').join(' L')}Z`,
}

/** Gradientes compartilhados: renderizar uma vez dentro do elemento raiz. */
export function JoiaDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
      <defs>
        {GEM_COLORS.map((c) => (
          <linearGradient key={c} id={`jg-${c}`} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor={GEM_LIGHT[c]} />
            <stop offset="0.5" stopColor={GEM_HEX[c]} />
            <stop offset="1" stopColor={GEM_DARK[c]} />
          </linearGradient>
        ))}
        {METALS.map((m) => (
          <linearGradient key={m} id={`jm-${m}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="0.28" stopColor={METAL_HEX[m]} />
            <stop offset="0.7" stopColor={METAL_HEX[m]} />
            <stop offset="1" stopColor={METAL_DEEP[m]} />
          </linearGradient>
        ))}
        {PEARLS.map((p) => (
          <radialGradient key={p} id={`jp-${p}`} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.35" stopColor={PEARL_HEX[p]} />
            <stop offset="1" stopColor={p === 'preta' ? '#0c0b0e' : '#b9a58c'} />
          </radialGradient>
        ))}
        <linearGradient id="jg-fake" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8d8a86" />
          <stop offset="1" stopColor="#4d4a48" />
        </linearGradient>
        <linearGradient id="jg-champ" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6e3b0" />
          <stop offset="0.5" stopColor="#d9b866" />
          <stop offset="1" stopColor="#8c6a1f" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function Gem({ color, shape }: { color: GemColor; shape: GemShape }) {
  const d = SHAPE_D[shape]
  return (
    <>
      <path d={d} fill={`url(#jg-${color})`} stroke="rgba(0,0,0,0.35)" strokeWidth="1" strokeLinejoin="round" />
      <path d={d} transform="translate(20 20) scale(.56) translate(-20 -20)" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.65)" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M11 11 L17 8.5" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" />
    </>
  )
}

function Charm({ shape, metal }: { shape: string; metal: Metal }) {
  const fill = `url(#jm-${metal})`
  const stroke = METAL_DEEP[metal]
  if (shape === 'estrela') return <polygon points={STAR_PTS} fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
  if (shape === 'laco')
    return (
      <>
        <path d="M20 20 L5 9 V31Z M20 20 L35 9 V31Z" fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="20" cy="20" r="4.2" fill={fill} stroke={stroke} strokeWidth="1.2" />
      </>
    )
  return <path d={SHAPE_D.coracao} fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
}

/** Um componente de joia (viewBox 40x40). */
export function Item({ spec, size = 44, ghost = false }: { spec: Spec; size?: number; ghost?: boolean }) {
  let body
  switch (spec.kind) {
    case 'pearl':
      body = (
        <>
          <circle cx="20" cy="20" r="14" fill={`url(#jp-${spec.tone})`} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
          <ellipse cx="14.5" cy="13.5" rx="4.2" ry="2.6" fill="rgba(255,255,255,0.75)" transform="rotate(-30 14.5 13.5)" />
        </>
      )
      break
    case 'gem':
      body = <Gem color={spec.tone as GemColor} shape={spec.shape as GemShape} />
      break
    case 'link':
      body = (
        <>
          <ellipse cx="20" cy="20" rx="14" ry="8.5" fill="none" stroke={METAL_DEEP[spec.tone as Metal]} strokeWidth="6" />
          <ellipse cx="20" cy="20" rx="14" ry="8.5" fill="none" stroke={`url(#jm-${spec.tone})`} strokeWidth="4" />
        </>
      )
      break
    case 'charm':
      body = <Charm shape={spec.shape} metal={spec.tone as Metal} />
      break
    default:
      body = (
        <>
          <path d={SHAPE_D[spec.shape as GemShape] ?? SHAPE_D.redondo} fill="url(#jg-fake)" stroke="rgba(0,0,0,0.4)" strokeWidth="1" strokeLinejoin="round" />
          <path d="M14 10 L22 22 L17 30" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.3" strokeLinecap="round" />
        </>
      )
  }
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} style={ghost ? { opacity: 0.4, filter: 'grayscale(1) brightness(1.4)' } : undefined} aria-hidden>
      {body}
    </svg>
  )
}

/** Silhueta de um componente (fantasma no molde, sem cor). */
export function Silhouette({ spec, size }: { spec: Spec; size: number }) {
  const d = spec.kind === 'gem' || spec.kind === 'fake' ? SHAPE_D[spec.shape as GemShape] : null
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      {spec.kind === 'pearl' && <circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 3" />}
      {d && <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 3" strokeLinejoin="round" />}
      {spec.kind === 'link' && <ellipse cx="20" cy="20" rx="13" ry="7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 3" />}
      {spec.kind === 'charm' && <path d={spec.shape === 'estrela' ? SHAPE_D.estrela : SHAPE_D.coracao} fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 3" strokeLinejoin="round" />}
    </svg>
  )
}

// ---------------------------------------------------------------- ícones de interface
const ico = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const IcoClose = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...ico}><path d="M6 6 L18 18 M18 6 L6 18" /></svg>
)
export const IcoPause = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="6" y="5" width="4.2" height="14" rx="1.6" /><rect x="13.8" y="5" width="4.2" height="14" rx="1.6" /></svg>
)
export const IcoSound = ({ off }: { off: boolean }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...ico}>
    <path d="M4 9.5 H8 L13 5.5 V18.5 L8 14.5 H4Z" />
    {off ? <path d="M16.5 9.5 L21 14.5 M21 9.5 L16.5 14.5" /> : <path d="M16.5 9 C18.5 11 18.5 13 16.5 15 M19 6.5 C22.5 10 22.5 14 19 17.5" />}
  </svg>
)
export const IcoBrush = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...ico}>
    <path d="M14.5 4 L20 9.5 L11 18.5 L5.5 13Z" />
    <path d="M5.5 13 C4 16 3.5 19 3 21 C6 20.5 9 20 11 18.5" />
  </svg>
)
export const IcoClock = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...ico}><circle cx="12" cy="13" r="8" /><path d="M12 8.5 V13 L15 15 M9.5 3 H14.5" /></svg>
)
export const IcoHelp = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...ico}><circle cx="12" cy="12" r="9" /><path d="M9.2 9.3 C9.4 7.6 10.6 6.8 12 6.8 C13.6 6.8 14.8 7.8 14.8 9.2 C14.8 11.2 12 11.3 12 13.6 M12 16.6 V17" /></svg>
)
export const IcoLock = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" {...ico}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11 V8 A4 4 0 0 1 16 8 V11" /></svg>
)
export const IcoGive = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...ico}><path d="M4 12 L9.5 17.5 L20 6.5" /></svg>
)
export const IcoTweezers = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...ico}><path d="M5 3.5 L12 20.5 M19 3.5 L12 20.5 M7 8.5 H17" /></svg>
)
export const StarIcon = ({ on, size = 54 }: { on: boolean; size?: number }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
    <polygon points={STAR_PTS} fill={on ? 'url(#jg-champ)' : 'rgba(255,255,255,0.07)'} stroke={on ? '#f6e3b0' : 'rgba(246,227,176,0.3)'} strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
)
export const CoinIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
    <circle cx="12" cy="12" r="10" fill="url(#jg-champ)" stroke="#8c6a1f" strokeWidth="1.2" />
    <path d="M12 6.2 L15.4 12 L12 17.8 L8.6 12Z" fill="rgba(255,255,255,0.55)" stroke="#8c6a1f" strokeWidth="0.9" strokeLinejoin="round" />
  </svg>
)

/** Rosto estilizado da cliente. */
export function ClientFace({ hair, skin, accent, size = 46 }: { hair: string; skin: string; accent: string; size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="23" fill={accent} />
      <path d="M8 40 C10 32 16 30 24 30 C32 30 38 32 40 40 C34 46 14 46 8 40Z" fill="#14100f" />
      <path d="M12 26 C10 12 17 7 24 7 C31 7 38 12 36 26 C35 20 30 17 24 17 C18 17 13 20 12 26Z" fill={hair} />
      <ellipse cx="24" cy="24" rx="9" ry="10.5" fill={skin} />
      <path d="M15 22 C16 14 22 13 26 14 C31 15 34 18 33 23 C30 18 21 17 15 22Z" fill={hair} />
      <circle cx="20.3" cy="24.5" r="1.2" fill="#2b1d1a" />
      <circle cx="27.7" cy="24.5" r="1.2" fill="#2b1d1a" />
      <path d="M21 29.5 C23 31 25 31 27 29.5" fill="none" stroke="#8c3b3b" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="24" cy="38" r="2" fill="url(#jg-champ)" />
    </svg>
  )
}
