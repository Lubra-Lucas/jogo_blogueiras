/** Arte em SVG inline do Cafe Rose: copo, ingredientes, doces e rostos de bonecas. */
import type { CSSProperties } from 'react'
import { BASE_COLOR, type Base, type Size, type Sweet, type Topping } from '../../../game/minigames/cafe/data'
import type { Look, Tray } from '../../../game/minigames/cafe/logic'

export type Mood = 'waiting' | 'happy' | 'angry'

/** Gradientes compartilhados (referenciados por id; renderizado uma vez no overlay). */
export function CafeDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <linearGradient id="cf-gloss" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="cf-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#dff0ff" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="cf-cream" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f6e9ef" />
        </linearGradient>
        <linearGradient id="cf-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </linearGradient>
      </defs>
    </svg>
  )
}

const CUP_PATH = 'M26 62 L114 62 L99 170 Q97 180 87 180 L53 180 Q43 180 41 170 Z'
const SIZE_SCALE: Record<Size, number> = { P: 0.7, M: 0.85, G: 1 }

const SPRINKLES: [number, number, number, string][] = [
  [58, 0, 20, '#ff8fb8'], [66, -5, -30, '#7fd6c2'], [76, 1, 40, '#ffd95e'], [84, -4, -10, '#8fb8ff'],
  [62, -9, 60, '#ffd95e'], [72, -8, -50, '#ff8fb8'], [80, -10, 25, '#7fd6c2'], [68, 3, 80, '#b79cf5'], [89, 2, -35, '#ff8fb8'],
]

/** Copo grande de preparo; reage ao que esta na bandeja. */
export function Cup({ tray, steam = true }: { tray: Tray; steam?: boolean }) {
  const { size, base, toppings, sweet } = tray
  const hasCream = toppings.includes('chantilly')
  const top = hasCream ? 22 : 56
  const color = base ? BASE_COLOR[base] : '#ffffff'
  const scale = SIZE_SCALE[size ?? 'G']
  return (
    <svg viewBox="0 0 200 200" className="cf-cup" aria-hidden>
      <ellipse cx="82" cy="186" rx="64" ry="8" fill="#000" opacity=".1" />
      <g style={{ transform: `scale(${scale})`, transformOrigin: '70px 182px', transition: 'transform .35s cubic-bezier(.3,1.6,.5,1)' }}>
        <ellipse cx="70" cy="182" rx="52" ry="7" fill="#fff" stroke="#e8dcec" strokeWidth="2" />
        {/* corpo de vidro */}
        <path d={CUP_PATH} fill="url(#cf-glass)" stroke="#c9b9d8" strokeWidth="2.5" strokeLinejoin="round" />
        <clipPath id="cf-clip">
          <path d={CUP_PATH} />
        </clipPath>
        <g clipPath="url(#cf-clip)">
          <rect
            x="20" y="62" width="100" height="120" fill={color}
            style={{
              transformOrigin: '70px 182px',
              transform: `scaleY(${base ? 0.86 : 0})`,
              transition: 'transform .55s cubic-bezier(.3,1.3,.5,1), fill .3s',
            }}
          />
          {base === 'milkshake' && <rect x="20" y="62" width="100" height="14" fill="#fff" opacity=".35" />}
          <rect x="20" y="62" width="100" height="120" fill="url(#cf-shade)" opacity={base ? 0.8 : 0} />
        </g>
        <path d="M34 70 L44 168" stroke="url(#cf-gloss)" strokeWidth="7" strokeLinecap="round" fill="none" />
        <ellipse cx="70" cy="62" rx="44" ry="7" fill="#fff" opacity=".45" stroke="#c9b9d8" strokeWidth="2" />
        {base === 'cha' && (
          <g>
            <path d="M92 60 Q104 52 110 44" stroke="#c9a37a" strokeWidth="1.6" fill="none" />
            <rect x="106" y="34" width="14" height="12" rx="2" fill="#ffe08a" stroke="#d9b45a" />
          </g>
        )}
        {base === 'milkshake' && toppings.length === 0 && (
          <path d="M92 66 L112 8" stroke="#ff8fb8" strokeWidth="6" strokeLinecap="round" />
        )}

        {/* coberturas */}
        {hasCream && (
          <g className="cf-pop" key="cream">
            <ellipse cx="70" cy="58" rx="40" ry="12" fill="url(#cf-cream)" stroke="#eadbe4" />
            <ellipse cx="70" cy="46" rx="31" ry="11" fill="url(#cf-cream)" stroke="#eadbe4" />
            <ellipse cx="70" cy="35" rx="21" ry="9" fill="url(#cf-cream)" stroke="#eadbe4" />
            <path d="M70 18 Q80 24 70 29 Q64 24 70 18Z" fill="#fff" stroke="#eadbe4" />
          </g>
        )}
        {toppings.includes('caramelo') && (
          <path
            className="cf-pop" key="caramel"
            d={hasCream ? 'M42 52 Q55 40 62 50 T82 38 T98 50' : 'M38 62 Q52 54 62 62 T86 58 T102 63'}
            stroke="#d98a2b" strokeWidth="5" strokeLinecap="round" fill="none"
          />
        )}
        {toppings.includes('granulado') && (
          <g className="cf-pop" key="spr" transform={`translate(0 ${hasCream ? -22 : 0})`}>
            {SPRINKLES.map(([x, y, r, c], i) => (
              <rect key={i} x={x - 3} y={y + 55 - 1.4} width="6.5" height="2.8" rx="1.4" fill={c} transform={`rotate(${r} ${x} ${y + 55})`} />
            ))}
          </g>
        )}
        {toppings.includes('morango') && (
          <g className="cf-pop" key="straw" transform={`translate(${hasCream ? 70 : 92} ${top - (hasCream ? 4 : 2)})`}>
            <Strawberry r={13} />
          </g>
        )}
      </g>
      {/* doce no pratinho */}
      {sweet && (
        <g className="cf-pop" key={sweet} transform="translate(138 126) scale(.9)">
          <ellipse cx="22" cy="54" rx="30" ry="6" fill="#fff" stroke="#e8dcec" strokeWidth="2" />
          <SweetShape id={sweet} />
        </g>
      )}
      {steam && base && base !== 'milkshake' && (
        <g className="cf-steam" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" style={{ transform: `translateY(${hasCream ? -26 : 0}px)` }}>
          <path d="M58 40 Q52 30 58 20 Q64 10 58 2" />
          <path d="M80 40 Q74 30 80 20 Q86 10 80 2" />
        </g>
      )}
    </svg>
  )
}

function Strawberry({ r = 12 }: { r?: number }) {
  return (
    <g>
      <path d={`M0 ${r} C${-r * 1.3} ${r * 0.1} ${-r} ${-r} 0 ${-r * 0.8} C${r} ${-r} ${r * 1.3} ${r * 0.1} 0 ${r}Z`} fill="#f4476b" stroke="#c92a4d" strokeWidth="1.2" />
      <path d={`M${-r * 0.7} ${-r * 0.8} L0 ${-r * 1.25} L${r * 0.7} ${-r * 0.8} L0 ${-r * 0.55}Z`} fill="#6fcf7c" stroke="#3f9f4e" strokeWidth="1" />
      {[[-4, -2], [4, -3], [0, 2], [-5, 4], [5, 3], [0, 7]].map(([x, y], i) => (
        <ellipse key={i} cx={x * (r / 12)} cy={y * (r / 12)} rx=".9" ry="1.4" fill="#ffe9a8" />
      ))}
      <ellipse cx={-r * 0.45} cy={-r * 0.2} rx={r * 0.18} ry={r * 0.32} fill="#fff" opacity=".6" />
    </g>
  )
}

function SweetShape({ id }: { id: Sweet }) {
  if (id === 'cupcake') {
    return (
      <g transform="translate(0 -8)">
        <path d="M6 30 L38 30 L33 52 L11 52Z" fill="#ffd6a8" stroke="#e6a96b" strokeWidth="1.5" />
        <path d="M14 31 L16 51 M22 31 L22 51 M30 31 L28 51" stroke="#e6a96b" strokeWidth="1.2" />
        <path d="M4 31 Q4 18 14 18 Q14 8 24 10 Q32 4 36 16 Q42 22 38 31Z" fill="#bcd9f7" stroke="#8fb7e6" strokeWidth="1.5" />
        <circle cx="22" cy="6" r="4.5" fill="#f4476b" />
        <ellipse cx="20.5" cy="4.5" rx="1.3" ry="1.8" fill="#fff" opacity=".7" />
      </g>
    )
  }
  return (
    <g transform="translate(0 -4)">
      <path d="M4 38 Q4 24 22 24 Q40 24 40 38Z" fill="#c9b8f5" stroke="#a691e6" strokeWidth="1.5" />
      <rect x="5" y="37" width="34" height="6" rx="3" fill="#fff4d6" stroke="#e6d6a6" />
      <path d="M4 44 Q4 54 22 54 Q40 54 40 44Z" fill="#c9b8f5" stroke="#a691e6" strokeWidth="1.5" />
      <path d="M11 30 Q16 26 22 26" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".7" />
    </g>
  )
}

// ---------------------------------------------------------------- icones pequenos (botoes e pedidos)
export function BaseIcon({ id }: { id: Base }) {
  const c = BASE_COLOR[id]
  return (
    <svg viewBox="0 0 48 48" className="cf-icon" aria-hidden>
      <path d="M9 14 L39 14 L34 41 Q33 44 30 44 L18 44 Q15 44 14 41Z" fill="#fff" stroke="#c9b9d8" strokeWidth="2" strokeLinejoin="round" />
      <path d="M11 22 L37 22 L34 41 Q33 44 30 44 L18 44 Q15 44 14 41Z" fill={c} />
      <path d="M13 17 L16 38" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".7" />
      {id === 'cafe' && <ellipse cx="24" cy="31" rx="4.2" ry="2.8" fill="#4e2f1d" transform="rotate(-30 24 31)" />}
      {id === 'cha' && <path d="M24 34 Q18 28 25 24 Q29 30 24 34Z" fill="#8cc56b" />}
      {id === 'milkshake' && <path d="M32 18 L39 4" stroke="#ff8fb8" strokeWidth="3.5" strokeLinecap="round" />}
      {id === 'matcha' && <path d="M18 30 Q24 24 30 30 M20 35 Q24 31 28 35" stroke="#e9f6dc" strokeWidth="1.8" strokeLinecap="round" fill="none" />}
    </svg>
  )
}

export function ToppingIcon({ id }: { id: Topping }) {
  return (
    <svg viewBox="0 0 48 48" className="cf-icon" aria-hidden>
      {id === 'chantilly' && (
        <g stroke="#e3d2dc" strokeWidth="1.6">
          <ellipse cx="24" cy="34" rx="16" ry="7" fill="#fff" />
          <ellipse cx="24" cy="25" rx="11.5" ry="6.5" fill="#fff" />
          <ellipse cx="24" cy="17" rx="7" ry="5" fill="#fff" />
          <path d="M24 6 Q30 10 24 13 Q20 10 24 6Z" fill="#fff" />
        </g>
      )}
      {id === 'granulado' && (
        <g>
          {SPRINKLES.slice(0, 8).map(([x, y, r, c], i) => (
            <rect key={i} x={(x - 55) * 1.15 + 5} y={y * 1.6 + 24 + (i % 3) * 5 - 6} width="9" height="3.6" rx="1.8" fill={c} transform={`rotate(${r} ${(x - 55) * 1.15 + 9} ${y * 1.6 + 26 + (i % 3) * 5 - 6})`} />
          ))}
        </g>
      )}
      {id === 'morango' && (
        <g transform="translate(24 27)">
          <Strawberry r={15} />
        </g>
      )}
      {id === 'caramelo' && (
        <g>
          <path d="M24 6 C14 20 11 26 11 31 A13 13 0 0 0 37 31 C37 26 34 20 24 6Z" fill="#e39a3b" stroke="#b86f1c" strokeWidth="2" />
          <path d="M17 29 Q16 35 21 38" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".65" />
        </g>
      )}
    </svg>
  )
}

export function SweetIcon({ id }: { id: Sweet }) {
  return (
    <svg viewBox="0 0 48 48" className="cf-icon" aria-hidden>
      <g transform="translate(2 -2) scale(1)">
        <SweetShape id={id} />
      </g>
    </svg>
  )
}

export function SizeIcon({ id }: { id: Size }) {
  const s = SIZE_SCALE[id]
  return (
    <svg viewBox="0 0 48 48" className="cf-icon" aria-hidden>
      <g transform={`translate(24 44) scale(${s * 0.95}) translate(-24 -44)`}>
        <path d="M7 12 L41 12 L35 41 Q34 44 31 44 L17 44 Q14 44 13 41Z" fill="#fff" stroke="#9db4d9" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M12 17 L15 38" stroke="#bcd9f7" strokeWidth="3" strokeLinecap="round" />
      </g>
      <text x="24" y="33" textAnchor="middle" fontSize="15" fontWeight="800" fill="#5b6fa0" fontFamily="system-ui,sans-serif">
        {id}
      </text>
    </svg>
  )
}

// ---------------------------------------------------------------- rosto das bonecas
const HAIR_SHADE = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.max(0, Math.round(v * 0.82))
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`
}

export function Face({ look, mood, blink = false }: { look: Look; mood: Mood; blink?: boolean }) {
  const { skin, hair, hairStyle, shirt, accessory } = look
  const dark = HAIR_SHADE(hair)
  const happy = mood === 'happy'
  const angry = mood === 'angry'
  return (
    <svg viewBox="0 0 100 124" className="cf-face" aria-hidden>
      {/* cabelo de tras */}
      {hairStyle === 'bob' && <path d="M12 58 Q10 14 50 14 Q90 14 88 58 L90 88 Q70 96 50 90 Q30 96 10 88Z" fill={hair} />}
      {hairStyle === 'long' && <path d="M12 56 Q10 12 50 12 Q90 12 88 56 L96 112 Q70 118 50 106 Q30 118 4 112Z" fill={hair} />}
      {hairStyle === 'bun' && (
        <g>
          <circle cx="50" cy="12" r="12" fill={hair} />
          <circle cx="46" cy="9" r="3.4" fill="#fff" opacity=".28" />
        </g>
      )}
      {hairStyle === 'puffs' && (
        <g fill={hair}>
          <circle cx="17" cy="34" r="16" />
          <circle cx="83" cy="34" r="16" />
          <circle cx="12" cy="30" r="3.5" fill="#fff" opacity=".22" />
        </g>
      )}
      {/* camisa */}
      <path d="M8 124 Q10 92 34 88 L66 88 Q90 92 92 124Z" fill={shirt} />
      <path d="M36 88 Q50 104 64 88" fill="none" stroke="#fff" strokeWidth="3" opacity=".6" />
      {/* pescoco e cabeca */}
      <rect x="42" y="76" width="16" height="16" rx="6" fill={skin} />
      <rect x="42" y="76" width="16" height="7" fill="#000" opacity=".08" />
      <ellipse cx="50" cy="52" rx="33" ry="35" fill={skin} />
      <ellipse cx="17" cy="56" rx="4" ry="6" fill={skin} />
      <ellipse cx="83" cy="56" rx="4" ry="6" fill={skin} />
      {/* franja */}
      {hairStyle === 'bob' && <path d="M17 52 Q14 16 50 17 Q86 16 83 52 Q74 30 50 32 Q26 30 17 52Z" fill={hair} />}
      {hairStyle === 'long' && <path d="M17 54 Q16 16 50 17 Q84 16 83 54 Q66 38 52 28 Q40 40 17 54Z" fill={hair} />}
      {hairStyle === 'bun' && <path d="M17 50 Q16 18 50 18 Q84 18 83 50 Q70 30 50 33 Q30 30 17 50Z" fill={hair} />}
      {hairStyle === 'puffs' && <path d="M18 48 Q20 18 50 18 Q80 18 82 48 Q66 32 50 34 Q34 32 18 48Z" fill={hair} />}
      {hairStyle === 'bangs' && (
        <g fill={hair}>
          <path d="M16 56 Q8 16 50 15 Q92 16 84 56 Q82 40 74 38 L26 38 Q18 40 16 56Z" />
          <path d="M20 40 Q30 46 50 36 Q68 46 80 40 Q76 28 50 26 Q24 28 20 40Z" fill={dark} opacity=".5" />
          <path d="M16 54 L16 76 Q22 72 24 60Z M84 54 L84 76 Q78 72 76 60Z" />
        </g>
      )}
      <path d="M30 24 Q40 16 52 18" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" fill="none" opacity=".35" />
      {/* rosto */}
      <ellipse cx="29" cy="62" rx="7" ry="4.4" fill="#ff8fa8" opacity=".38" />
      <ellipse cx="71" cy="62" rx="7" ry="4.4" fill="#ff8fa8" opacity=".38" />
      {happy || blink ? (
        <g stroke="#3a2530" strokeWidth="2.8" strokeLinecap="round" fill="none">
          <path d="M31 53 Q37 46 43 53" />
          <path d="M57 53 Q63 46 69 53" />
        </g>
      ) : (
        <g>
          <ellipse cx="37" cy="53" rx="5.6" ry="7" fill="#3a2530" />
          <ellipse cx="63" cy="53" rx="5.6" ry="7" fill="#3a2530" />
          <circle cx="35" cy="50" r="2.2" fill="#fff" />
          <circle cx="61" cy="50" r="2.2" fill="#fff" />
          <circle cx="39" cy="56" r="1.1" fill="#fff" opacity=".8" />
          <circle cx="65" cy="56" r="1.1" fill="#fff" opacity=".8" />
        </g>
      )}
      {angry && (
        <g stroke="#3a2530" strokeWidth="2.6" strokeLinecap="round">
          <path d="M29 42 L44 46" />
          <path d="M71 42 L56 46" />
        </g>
      )}
      {mood === 'waiting' && (
        <g stroke={HAIR_SHADE(hair)} strokeWidth="2.4" strokeLinecap="round" opacity=".7">
          <path d="M31 42 Q37 39 43 42" fill="none" />
          <path d="M57 42 Q63 39 69 42" fill="none" />
        </g>
      )}
      {happy ? (
        <path d="M40 68 Q50 80 60 68 Z" fill="#c9455f" stroke="#c9455f" strokeWidth="2" strokeLinejoin="round" />
      ) : angry ? (
        <path d="M42 74 Q50 66 58 74" stroke="#c9455f" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M43 69 Q50 75 57 69" stroke="#c9455f" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      )}
      {/* acessorios */}
      {accessory === 'glasses' && (
        <g stroke="#6a5a8a" strokeWidth="2.2" fill="#fff" fillOpacity=".18">
          <circle cx="37" cy="53" r="9.5" />
          <circle cx="63" cy="53" r="9.5" />
          <path d="M46.5 52 L53.5 52" fill="none" />
        </g>
      )}
      {accessory === 'bow' && (
        <g transform="translate(74 24)">
          <path d="M0 0 L-12 -8 L-12 8Z M0 0 L12 -8 L12 8Z" fill="#ff8fb8" stroke="#e5628f" strokeWidth="1.6" strokeLinejoin="round" />
          <circle r="4" fill="#ffc2d8" stroke="#e5628f" strokeWidth="1.4" />
        </g>
      )}
      {accessory === 'flower' && (
        <g transform="translate(24 24)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-6" rx="3.8" ry="5.6" fill="#fff4b0" stroke="#f0cf63" strokeWidth="1" transform={`rotate(${a})`} />
          ))}
          <circle r="3.6" fill="#ffb347" />
        </g>
      )}
    </svg>
  )
}

export function Heart({ full, size = 18 }: { full: boolean; size?: number }) {
  const style: CSSProperties = { width: size, height: size }
  return (
    <svg viewBox="0 0 24 22" style={style} aria-hidden className={full ? 'cf-heart' : 'cf-heart cf-heart--off'}>
      <path
        d="M12 21 C5 15 1.5 11.5 1.5 7.2 C1.5 3.8 4 1.5 7 1.5 C9.2 1.5 11 2.7 12 4.6 C13 2.7 14.8 1.5 17 1.5 C20 1.5 22.5 3.8 22.5 7.2 C22.5 11.5 19 15 12 21Z"
        fill={full ? '#ff6f9f' : '#e9dfe8'}
        stroke={full ? '#d94a7c' : '#cfc2cf'}
        strokeWidth="1.6"
      />
      {full && <ellipse cx="7" cy="6" rx="2.4" ry="1.6" fill="#fff" opacity=".7" transform="rotate(-30 7 6)" />}
    </svg>
  )
}

export function Star({ on, size = 56 }: { on: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <path
        d="M24 3 L30 17 L45 18.5 L34 28.5 L37.5 43.5 L24 35.5 L10.5 43.5 L14 28.5 L3 18.5 L18 17Z"
        fill={on ? '#ffd95e' : '#ece3ea'}
        stroke={on ? '#e8a92a' : '#d3c7d1'}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {on && <path d="M17 14 L21 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8" />}
    </svg>
  )
}

export function Coin({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#ffd95e" stroke="#d9a21f" strokeWidth="2" />
      <path d="M12 5 L13.8 9.6 L18.5 10 L14.9 13 L16 17.8 L12 15.2 L8 17.8 L9.1 13 L5.5 10 L10.2 9.6Z" fill="#fff4c4" />
    </svg>
  )
}
