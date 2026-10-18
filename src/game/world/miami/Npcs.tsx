import { Component, Suspense, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { Character } from '../../character/Character'
import { DEFAULT_APPEARANCE, type Appearance } from '../../../shared/appearance'
import { npcAppearance } from '../../../shared/randomAppearance'
import { usePlayerStore } from '../../../state/playerStore'
import { getQuality } from '../../systems/quality'
import type { ClipName } from '../../character/animation/animator'
import { PIER, PROMENADE_X, BIKE_X } from './layout'

/**
 * Passeantes de Miami Beach: bonecas que andam em vai-e-vem por caminhos fixos (calcadao, ciclovia, Lincoln Road, beira do mar,
 * pier, calcada da Ocean Drive) ou ficam paradas (salva-vidas). Sao so visuais (sem colisor); ficam montadas apenas perto da jogadora.
 */
interface NpcSpec {
  id: string
  path: [number, number][]
  speed: number
  clip: ClipName
  hair: string
  hairColor: string
  skin: string
  suit: string
  top?: string
  bottom?: string
  dress?: string
  shoes?: string
  /** deslocamento do inicio ao longo do caminho (0..1) */
  phase: number
}

/** um passeante que falha ao carregar (modelo, cabelo...) nao derruba o mundo: some e pronto */
class NpcBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    /* silencioso */
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

const WALK = 1.03 // m/s: casa com o clipe walk_normal
const RUN = 2.3

const SPECS: NpcSpec[] = [
  { id: 'calcadao-a', path: [[PROMENADE_X - 1, -110], [PROMENADE_X - 1, 110]], speed: WALK, clip: 'walk_normal', hair: 'hair.chestnutWaves', hairColor: '#3a2417', skin: '#efcdbd', suit: '#f3e7d0', top: 'kaftan', bottom: 'denim_shorts', shoes: 'beach_wedges', phase: 0.1 },
  { id: 'calcadao-b', path: [[PROMENADE_X + 1, 100], [PROMENADE_X + 1, -100]], speed: WALK * 0.9, clip: 'walk_normal', hair: 'hair.caramelCurls', hairColor: '#8a5a3c', skin: '#b57e5b', suit: '#e9856b', dress: 'romper', phase: 0.55 },
  { id: 'ciclovia-corredora', path: [[BIKE_X, -120], [BIKE_X, 120]], speed: RUN, clip: 'run', hair: 'hair.meshyUpdo', hairColor: '#2a1a12', skin: '#d9a98a', suit: '#35c0bd', top: 'tank', bottom: 'cycling_shorts', phase: 0.3 },
  { id: 'lincoln-a', path: [[-100, 2.2], [-10, 2.2]], speed: WALK, clip: 'walk_normal', hair: 'hair.platinumUndercut', hairColor: '#e8d9b0', skin: '#f3d9c8', suit: '#a8d0ea', dress: 'tshirt_dress', phase: 0.2 },
  { id: 'lincoln-b', path: [[-12, -2.2], [-100, -2.2]], speed: WALK * 1.1, clip: 'walk_normal', hair: 'hair.chestnutWaves', hairColor: '#5a3a24', skin: '#8a5a3c', suit: '#f6c6a2', top: 'tee', bottom: 'tailored_shorts', phase: 0.7 },
  { id: 'mar-beira', path: [[93.4, -90], [93.6, 90]], speed: WALK * 0.8, clip: 'walk_normal', hair: 'hair.caramelCurls', hairColor: '#816b58', skin: '#efcdbd', suit: '#fbf7ee', top: 'kaftan', bottom: 'denim_shorts', phase: 0.4 },
  { id: 'pier', path: [[PIER.x0 + 2, PIER.z + 1], [PIER.x0 + 62, PIER.z + 1]], speed: WALK * 0.85, clip: 'walk_normal', hair: 'hair.meshyUpdo', hairColor: '#d8b46e', skin: '#efcdbd', suit: '#f08a73', dress: 'romper', phase: 0.15 },
  { id: 'ocean-calcada', path: [[0.8, 110], [0.8, -110]], speed: WALK, clip: 'walk_normal', hair: 'hair.platinumUndercut', hairColor: '#3a2417', skin: '#d9a98a', suit: '#8fd6d2', top: 'tank', bottom: 'denim_shorts', phase: 0.6 },
  // paradas: salva-vidas na base de duas torres
  { id: 'salva-vidas-a', path: [[74.4, -78]], speed: 0, clip: 'idle', hair: 'hair.meshyUpdo', hairColor: '#2a1a12', skin: '#b57e5b', suit: '#e9553b', top: 'tank', bottom: 'tailored_shorts', phase: 0 },
  { id: 'salva-vidas-b', path: [[74.4, 34]], speed: 0, clip: 'idle', hair: 'hair.chestnutWaves', hairColor: '#c9a15a', skin: '#efcdbd', suit: '#e9553b', top: 'tank', bottom: 'tailored_shorts', phase: 0 },
]

/** fracao das NPCs de rua que sao masculinas (so a boxer: ainda nao ha roupas masculinas) */
const NPC_MALE_CHANCE = 0.3
const HAIRS = ['hair.meshyUpdo', 'hair.chestnutWaves', 'hair.platinumUndercut', 'hair.caramelCurls']
function appearanceOf(n: NpcSpec): Appearance {
  // rosto e corpo variados e estaveis por NPC (seed = id); gerado uma vez e guardado em cache
  return npcAppearance(n.id, {
    ...DEFAULT_APPEARANCE,
    skin: { tone: n.skin, finish: 'natural' },
    suit: { color: n.suit, finish: 'satin', base: 'auto' },
    lips: { color: '#b4606f', gloss: 0.5 },
    hair: { id: HAIRS.includes(n.hair) ? n.hair : HAIRS[0], color: n.hairColor },
    morphs: { waistThin: 0.4, bustBig: 0.3 },
    outfit: {
      ...(n.top ? { top: { id: n.top } } : {}),
      ...(n.bottom ? { bottom: { id: n.bottom } } : {}),
      ...(n.dress ? { dress: { id: n.dress } } : {}),
      ...(n.shoes ? { shoes: { id: n.shoes } } : {}),
    },
  }, NPC_MALE_CHANCE)
}

function pathLen(p: [number, number][]) {
  let l = 0
  for (let i = 0; i < p.length - 1; i++) l += Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1])
  return l
}

function Walker({ n }: { n: NpcSpec }) {
  const g = useRef<Group>(null)
  const app = useMemo(() => appearanceOf(n), [n])
  const total = useMemo(() => pathLen(n.path), [n])
  const s = useRef(n.phase * total)
  const dir = useRef(1)
  useFrame((_, dt0) => {
    const o = g.current
    if (!o) return
    const dt = Math.min(dt0, 0.1)
    if (n.path.length === 1) {
      o.position.set(n.path[0][0], 0, n.path[0][1])
      o.rotation.y = -Math.PI / 2
      return
    }
    s.current += dir.current * n.speed * dt
    if (s.current > total) {
      s.current = total
      dir.current = -1
    } else if (s.current < 0) {
      s.current = 0
      dir.current = 1
    }
    // posicao no caminho (so ha 1 segmento por NPC: ida e volta)
    const a = n.path[0]
    const b = n.path[n.path.length - 1]
    const u = total > 0 ? s.current / total : 0
    o.position.set(a[0] + (b[0] - a[0]) * u, 0, a[1] + (b[1] - a[1]) * u)
    o.rotation.y = Math.atan2((b[0] - a[0]) * dir.current, (b[1] - a[1]) * dir.current)
  })
  return (
    <group ref={g} position={[n.path[0][0], 0, n.path[0][1]]}>
      <Character appearance={app} anim={{ clip: n.clip }} shadows={false} />
    </group>
  )
}

/** monta so quem esta a menos de 60 m (histerese ate 75 m) e os N mais proximos (N por qualidade); o resto fica fora da cena */
export function MiamiNpcs() {
  const [on, setOn] = useState<string[]>([])
  const acc = useRef(0)
  const max = getQuality() === 'low' ? 1 : getQuality() === 'medium' ? 3 : 5 // cada boneca custa ~60 mil triangulos
  useFrame((_, dt) => {
    acc.current += dt
    if (acc.current < 0.6) return
    acc.current = 0
    const p = usePlayerStore.getState().position
    const next: { id: string; d: number }[] = []
    for (const n of SPECS) {
      const a = n.path[0]
      const b = n.path[n.path.length - 1]
      // distancia da jogadora ao ponto mais proximo do segmento
      const dx = b[0] - a[0]
      const dz = b[1] - a[1]
      const l2 = dx * dx + dz * dz || 1
      const t = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.z - a[1]) * dz) / l2))
      const d = Math.hypot(p.x - (a[0] + dx * t), p.z - (a[1] + dz * t))
      const lim = on.includes(n.id) ? 75 : 60
      if (d < lim) next.push({ id: n.id, d })
    }
    next.sort((x, y) => x.d - y.d)
    const ids = next.slice(0, max).map((x) => x.id)
    if (ids.length !== on.length || ids.some((x, i) => x !== on[i])) setOn(ids)
  })
  return (
    <>
      {SPECS.filter((n) => on.includes(n.id)).map((n) => (
        <NpcBoundary key={n.id}>
          <Suspense fallback={null}>
            <Walker n={n} />
          </Suspense>
        </NpcBoundary>
      ))}
    </>
  )
}
