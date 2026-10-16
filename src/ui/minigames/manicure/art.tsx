/** Arte SVG da Manicure Perfeita: ícones de traço, adesivos, unhas e mão estilizada. */
import type { ReactNode } from 'react'
import { POLISHES, POLISH_BY_ID, type DecalKind, type Polish } from '../../../game/minigames/manicure/data'
import { FINGER_PATH, NAIL_PATH } from '../../../game/minigames/manicure/geometry'
import type { Decal, NailDesign } from '../../../game/minigames/manicure/logic'

/** Gradientes e padrões compartilhados (renderizar uma vez por tela). */
export function ManiDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        {POLISHES.map((p) => {
          if (p.kind === 'ombre')
            return (
              <linearGradient key={p.id} id={`mp-${p.id}`} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0.2" stopColor={p.c1} />
                <stop offset="1" stopColor={p.c2} />
              </linearGradient>
            )
          if (p.kind === 'chrome')
            return (
              <linearGradient key={p.id} id={`mp-${p.id}`} x1="0.17" y1="0" x2="0.83" y2="1">
                {[p.c1, p.c2, '#ffffff', p.c1, p.c2, p.c1].map((c, i) => (
                  <stop key={i} offset={[0, 0.28, 0.45, 0.62, 0.85, 1][i]} stopColor={c} />
                ))}
              </linearGradient>
            )
          if (p.kind === 'cateye')
            return (
              <linearGradient key={p.id} id={`mp-${p.id}`} x1="0.25" y1="0.8" x2="0.8" y2="0.15">
                <stop offset="0.3" stopColor={p.c1} stopOpacity="0" />
                <stop offset="0.5" stopColor={p.c2} />
                <stop offset="0.7" stopColor={p.c1} stopOpacity="0" />
              </linearGradient>
            )
          if (p.kind === 'glitter')
            return (
              <pattern key={p.id} id={`mp-${p.id}`} width="17" height="17" patternUnits="userSpaceOnUse">
                <rect x="2" y="3" width="2" height="2" fill={p.c2} />
                <rect x="10" y="1" width="1.4" height="1.4" fill="#fff" />
                <rect x="13" y="9" width="2.2" height="2.2" fill={p.c2} />
                <rect x="5" y="12" width="1.6" height="1.6" fill="#fff" />
                <rect x="8" y="7" width="1.2" height="1.2" fill={p.c2} />
              </pattern>
            )
          return null
        })}
        <linearGradient id="mp-shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="mp-pearl" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#efe6d8" />
          <stop offset="1" stopColor="#b9ab95" />
        </radialGradient>
        <linearGradient id="mp-skin-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.14" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="mp-gloss" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.28" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function polishFill(p: Polish): string {
  return p.kind === 'solid' ? p.c1 : p.kind === 'glitter' || p.kind === 'cateye' ? p.c1 : `url(#mp-${p.id})`
}

/** Preenchimento de uma forma com o acabamento completo (base + brilho/olho de gato). */
export function PolishShape({ d, p, extra }: { d: string; p: Polish; extra?: ReactNode }) {
  return (
    <>
      <path d={d} fill={polishFill(p)} />
      {(p.kind === 'glitter' || p.kind === 'cateye') && <path d={d} fill={`url(#mp-${p.id})`} />}
      {extra}
    </>
  )
}

// ---------------------------------------------------------------- adesivos
const darker = 'rgba(30,20,10,0.35)'
export function DecalGlyph({ kind, color, scale = 1, rot = 0, x = 0, y = 0, ghost = false }: {
  kind: DecalKind; color: string; scale?: number; rot?: number; x?: number; y?: number; ghost?: boolean
}) {
  const t = `translate(${x} ${y}) rotate(${rot}) scale(${scale})`
  let body: ReactNode
  switch (kind) {
    case 'dot':
      body = (
        <>
          <circle r="7.5" fill={color} stroke={darker} strokeWidth="1" />
          <circle cx="-2.5" cy="-2.5" r="2.2" fill="#fff" opacity="0.7" />
        </>
      )
      break
    case 'pearl':
      body = (
        <>
          <circle r="12" fill="url(#mp-pearl)" stroke="rgba(80,60,40,0.4)" strokeWidth="1" />
          <ellipse cx="-4" cy="-5" rx="3.6" ry="2.2" fill="#fff" opacity="0.9" />
        </>
      )
      break
    case 'heart':
      body = (
        <>
          <path d="M0 14 C-26 -4 -11 -22 0 -9 C11 -22 26 -4 0 14 Z" fill={color} stroke={darker} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M-9 -9 C-14 -8 -16 -2 -13 2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.65" />
        </>
      )
      break
    case 'star':
      body = (
        <>
          <path d="M0 -19 L5.6 -6.4 L19 -5.8 L8.6 2.8 L12 16.4 L0 9 L-12 16.4 L-8.6 2.8 L-19 -5.8 L-5.6 -6.4 Z" fill={color} stroke={darker} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M0 -13 L3 -5 L-4 -4 Z" fill="#fff" opacity="0.55" />
        </>
      )
      break
    case 'bow':
      body = (
        <>
          <path d="M0 0 L-22 -12 Q-25 0 -22 12 Z M0 0 L22 -12 Q25 0 22 12 Z" fill={color} stroke={darker} strokeWidth="1.2" strokeLinejoin="round" />
          <circle r="5" fill={color} stroke={darker} strokeWidth="1.2" />
          <path d="M-17 -6 L-8 -2 M17 -6 L8 -2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
        </>
      )
      break
    case 'gem':
      body = (
        <>
          <path d="M-15 -4 L-9 -15 L9 -15 L15 -4 L0 17 Z" fill={color} stroke={darker} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M-15 -4 H15 M-5 -4 L-9 -15 M5 -4 L9 -15 M-5 -4 L0 17 M5 -4 L0 17 M-5 -4 L0 -15 M5 -4 L0 -15" stroke="#fff" strokeWidth="1" opacity="0.7" fill="none" />
          <path d="M-9 -15 L-5 -4 L0 -15 Z" fill="#fff" opacity="0.4" />
        </>
      )
      break
    case 'flower':
      body = (
        <>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx="0" cy="-10" r="7.5" transform={`rotate(${a})`} fill={color} stroke={darker} strokeWidth="1" />
          ))}
          <circle r="5.2" fill="#d8b45a" stroke={darker} strokeWidth="1" />
          <circle cx="-1.5" cy="-1.5" r="1.4" fill="#fff" opacity="0.8" />
        </>
      )
      break
  }
  return (
    <g transform={t} opacity={ghost ? 0.6 : 1}>
      {body}
    </g>
  )
}

// ---------------------------------------------------------------- unha pequena (modelo)
/** Unha do modelo em miniatura: base + ponta + adesivos. viewBox 240x340. */
export function MiniNail({ nail, polish, size = 64, selected = false, decals }: {
  nail: NailDesign; polish: Polish; size?: number; selected?: boolean; decals?: Decal[]
}) {
  return (
    <svg viewBox="20 10 200 300" width={size} height={size * 1.5} className={`mn-mini${selected ? ' mn-mini--on' : ''}`} aria-hidden>
      <clipPath id="mn-clip-nail"><path d={NAIL_PATH} /></clipPath>
      <path d={NAIL_PATH} fill="rgba(255,255,255,0.4)" />
      <PolishShape d={NAIL_PATH} p={polish} />
      {nail.tip && (
        <g clipPath="url(#mn-clip-nail)">
          <path d="M 0 0 H 240 V 78 Q 120 138 0 78 Z" fill={nail.tip} />
        </g>
      )}
      <path d={NAIL_PATH} fill="url(#mp-gloss)" opacity="0.5" />
      <path d={NAIL_PATH} fill="none" stroke="rgba(20,10,20,0.35)" strokeWidth="3" />
      {(decals ?? nail.decals).map((d, i) => (
        <DecalGlyph key={i} {...d} />
      ))}
    </svg>
  )
}

/** Nuance usada no cartão para mostrar o nome da cor. */
export const polishName = (id: string) => POLISH_BY_ID[id]?.name ?? ''

export function Swatch({ p, size = 40 }: { p: Polish; size?: number }) {
  return (
    <svg viewBox="40 20 160 280" width={size} height={size * 1.4} aria-hidden>
      <PolishShape d={NAIL_PATH} p={p} />
      <path d={NAIL_PATH} fill="url(#mp-gloss)" opacity="0.55" />
      <path d={NAIL_PATH} fill="none" stroke="rgba(20,10,20,0.35)" strokeWidth="5" />
    </svg>
  )
}

// ---------------------------------------------------------------- mão estilizada
const HAND_FINGERS = [
  { x: 48, y: 112, w: 36, h: 84, rot: -50 }, // polegar
  { x: 86, y: 28, w: 34, h: 98, rot: -9 }, // indicador
  { x: 130, y: 14, w: 36, h: 108, rot: 0 }, // médio
  { x: 176, y: 26, w: 34, h: 98, rot: 8 }, // anelar
  { x: 218, y: 52, w: 30, h: 80, rot: 17 }, // mindinho
]

export function Hand({ skin, nails, polishFor, done, selected, onPick, working }: {
  skin: string
  nails: NailDesign[]
  polishFor: (n: NailDesign) => Polish | null
  done: boolean[]
  selected: number
  onPick: (i: number) => void
  working: boolean[]
}) {
  const byFinger = new Map(nails.map((n, i) => [n.finger, i]))
  return (
    <svg viewBox="-8 0 296 232" className="mn-hand" role="group" aria-label="Mão da cliente">
      <path d="M60 112 Q58 214 140 224 Q222 222 232 124 Q236 92 200 90 L90 90 Q62 92 60 112 Z" fill={skin} />
      <path d="M60 112 Q58 214 140 224 Q222 222 232 124 Q236 92 200 90 L90 90 Q62 92 60 112 Z" fill="url(#mp-skin-shade)" />
      {HAND_FINGERS.map((f, k) => {
        const idx = byFinger.get(k)
        const active = idx !== undefined
        const cx = f.x + f.w / 2
        const polish = active ? polishFor(nails[idx]) : null
        const nailH = f.w * 1.05
        return (
          <g key={k} transform={`rotate(${f.rot} ${cx} ${f.y + f.h})`}>
            <rect x={f.x} y={f.y} width={f.w} height={f.h + 14} rx={f.w / 2} fill={skin} />
            <rect x={f.x} y={f.y} width={f.w} height={f.h + 14} rx={f.w / 2} fill="url(#mp-skin-shade)" />
            <g transform={`translate(${cx - f.w * 0.36} ${f.y + 4}) scale(${(f.w * 0.72) / 150})`}>
              <g transform="translate(-45 -26)">
                <path d={NAIL_PATH} fill="rgba(255,244,236,0.78)" stroke="rgba(60,30,30,0.3)" strokeWidth="4" />
                {active && done[idx!] && polish && <PolishShape d={NAIL_PATH} p={polish} extra={<path d={NAIL_PATH} fill="url(#mp-gloss)" opacity="0.6" />} />}
              </g>
            </g>
            {active && (
              <rect
                x={f.x - 3} y={f.y - 3} width={f.w + 6} height={nailH * 1.6 + 6} rx={f.w / 2 + 3}
                className={`mn-hand-ring${selected === idx ? ' mn-hand-ring--on' : ''}${working[idx!] ? ' mn-hand-ring--todo' : ''}`}
                fill="transparent"
                onPointerDown={(e) => {
                  e.stopPropagation()
                  onPick(idx!)
                }}
                style={{ cursor: 'pointer' }}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** Base do dedo + leito da unha (camada de baixo do palco de pintura). */
export function FingerBase({ skin }: { skin: string }) {
  return (
    <g>
      <path d={FINGER_PATH} fill={skin} />
      <path d={FINGER_PATH} fill="url(#mp-skin-shade)" />
      <path d="M 30 300 Q 120 330 210 300" fill="none" stroke="rgba(60,30,20,0.18)" strokeWidth="3" strokeLinecap="round" />
      <path d={NAIL_PATH} fill="rgba(255,244,236,0.82)" />
      <path d="M 70 70 Q 120 40 170 70" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
      <path d={NAIL_PATH} fill="none" stroke="rgba(70,30,30,0.28)" strokeWidth="2.5" />
    </g>
  )
}

// ---------------------------------------------------------------- ícones de traço
const I = ({ children, size = 22 }: { children: ReactNode; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)
export const IcClose = () => <I><path d="M6 6l12 12M18 6L6 18" /></I>
export const IcPause = () => <I><path d="M8 5v14M16 5v14" /></I>
export const IcSound = ({ off }: { off?: boolean }) => (
  <I>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    {off ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" />}
  </I>
)
export const IcClock = () => <I><circle cx="12" cy="13" r="7.5" /><path d="M12 9v4.5l3 1.5M9.5 3.5h5" /></I>
export const IcBottle = () => <I><path d="M9.5 3.5h5v4h-5zM8 7.5h8l1 4v8a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 017 19.5v-8z" /><path d="M9 14h6" /></I>
export const IcBrush = () => <I><path d="M20 4c-5 2-8.5 6-10 10l2.5 2.5C16.5 15 19 9.5 20 4zM9.5 14.5c-2.5 0-4 1.5-4 3.5 0 1 .5 2 1.5 2 2.5 0 4-1.5 4-3.5" /></I>
export const IcCheck = () => <I><path d="M5 12.5l4.5 4.5L19 7.5" /></I>
export const IcTrash = () => <I><path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13" /></I>
export const IcRotL = () => <I><path d="M4.5 12a7.5 7.5 0 107.5-7.5H8M8 1.5L5 4.5l3 3" /></I>
export const IcRotR = () => <I><path d="M19.5 12A7.5 7.5 0 1112 4.5h4M16 1.5l3 3-3 3" /></I>
export const IcSpark = () => <I><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" /></I>
export const IcLock = () => <I size={16}><rect x="6" y="11" width="12" height="9" rx="2" /><path d="M8.5 11V8a3.5 3.5 0 017 0v3" /></I>
export const IcHelp = () => <I><circle cx="12" cy="12" r="8.5" /><path d="M9.5 9.5a2.5 2.5 0 114 2c-.8.6-1.5 1-1.5 2M12 16.8v.2" /></I>
export const IcSun = () => <I><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></I>
export const IcFinger = () => <I><path d="M9 20v-9a1.8 1.8 0 013.6 0v4M12.6 13a1.8 1.8 0 013.6 0v2.5a5 5 0 01-5 5H10a4 4 0 01-3-1.3L4.5 16.5a1.6 1.6 0 012.3-2.2L9 16" /></I>

export function HeartIcon({ full, size = 18 }: { full: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M12 21C3 14.5 3 7.5 7.5 6c2-.6 3.7.4 4.5 2 .8-1.6 2.5-2.6 4.5-2C21 7.5 21 14.5 12 21z" fill={full ? '#b5455f' : 'none'} stroke="#b5455f" strokeWidth="1.8" strokeLinejoin="round" opacity={full ? 1 : 0.4} />
    </svg>
  )
}

export function StarIcon({ on, size = 52 }: { on: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id="mn-star-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2d57e" />
          <stop offset="1" stopColor="#b08a3e" />
        </linearGradient>
      </defs>
      <path d="M24 4l5.8 12.4 13.5 1.6-10 9.2 2.7 13.4L24 33.6 12 40.6l2.7-13.4-10-9.2 13.5-1.6z" fill={on ? 'url(#mn-star-g)' : '#d9d3c8'} stroke={on ? '#8a6a24' : '#bdb5a6'} strokeWidth="1.6" strokeLinejoin="round" />
      {on && <path d="M19 12l5-3" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />}
    </svg>
  )
}

export function Coin({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#d9b35f" stroke="#8a6a24" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="#8a6a24" strokeWidth="1.2" />
      <path d="M12 8.5l1.1 2.3 2.5.3-1.8 1.7.5 2.5-2.3-1.3-2.3 1.3.5-2.5-1.8-1.7 2.5-.3z" fill="#8a6a24" />
    </svg>
  )
}
