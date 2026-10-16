import type { SVGProps } from 'react'

/** Icone de carro (linha 24x24) para o app do celular. */
export function GCar(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
      <path d="M4 16.5V13l1.7-4.2A2 2 0 0 1 7.6 7.5h8.8a2 2 0 0 1 1.9 1.3L20 13v3.5" />
      <path d="M3.5 16.5h17M7 16.5v1.8M17 16.5v1.8M5.6 13h12.8" />
      <circle cx="8" cy="13" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="16" cy="13" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

const BODY: Record<string, { body: string; glass: string }> = {
  compacto: {
    body: 'M14 58 L14 46 Q14 40 22 38 L40 36 Q46 20 62 16 L120 16 Q138 18 146 34 L172 38 Q182 40 184 48 L184 58 Z',
    glass: 'M50 35 Q54 24 64 21 L92 21 L92 35 Z M98 21 L120 21 Q131 22 137 34 L98 35 Z',
  },
  conversivel: {
    body: 'M8 58 L8 46 Q8 40 20 38 L86 36 L102 25 L112 25 L120 36 L170 38 Q190 40 192 48 L192 58 Z',
    glass: 'M90 35 L103 27 L108 27 L110 35 Z',
  },
  suv: {
    body: 'M12 58 L12 44 Q12 38 20 36 L34 34 L44 18 L150 18 L166 34 L184 38 Q192 42 192 50 L192 58 Z',
    glass: 'M50 33 L56 22 L94 22 L94 33 Z M100 22 L146 22 L158 33 L100 33 Z',
  },
  esportivo: {
    body: 'M6 58 L6 48 Q8 42 24 40 L70 36 Q90 22 116 24 Q136 26 146 36 L184 40 Q196 44 196 52 L196 58 Z',
    glass: 'M80 35 Q94 26 112 27 Q128 28 136 35 Z',
  },
  van: {
    body: 'M10 58 L10 24 Q10 16 20 16 L140 16 Q152 16 160 28 L184 40 Q192 44 192 50 L192 58 Z',
    glass: 'M128 22 L142 22 L154 33 L128 33 Z',
  },
}

/** Silhueta lateral estilizada do carro, na cor escolhida. */
export function CarSilhouette({ slug, body, rim, width = 200 }: { slug: string; body: string; rim: string; width?: number }) {
  const d = BODY[slug] ?? BODY.compacto
  return (
    <svg viewBox="0 0 200 80" width={width} height={(width * 80) / 200} role="img" aria-label="Carro">
      <ellipse cx="100" cy="72" rx="86" ry="5" fill="rgba(70,48,76,0.18)" />
      <path d={d.body} fill={body} stroke="rgba(40,26,44,0.5)" strokeWidth="1.4" strokeLinejoin="round" />
      <path d={d.glass} fill="#3b475a" opacity="0.85" />
      <path d="M16 52 L188 52" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      {[50, 148].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="60" r="13" fill="#1d1e23" />
          <circle cx={cx} cy="60" r="7.5" fill={rim} stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
          <circle cx={cx} cy="60" r="2" fill="rgba(0,0,0,0.35)" />
        </g>
      ))}
      <rect x="182" y="42" width="6" height="5" rx="2" fill="#fff6d8" />
      <rect x="12" y="43" width="4" height="5" rx="1.5" fill="#c4332b" />
    </svg>
  )
}
