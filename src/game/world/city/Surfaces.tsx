import { useMemo } from 'react'
import { CanvasTexture, CircleGeometry, SRGBColorSpace } from 'three'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { BufferGeometry, RingGeometry } from 'three'
import { CITY, ROAD_SPEC } from './layout'
import { flatShape, merge, paint, ribbon } from './geo'
import { CENTRO_ITEMS } from './centro'
import { registerGlowEmissive, registerWet } from '../environment/registry'

const WALK = { walkable: true }

interface Layer {
  y: number
  geoms: BufferGeometry[]
}

function ringAt(cx: number, cz: number, r0: number, r1: number, y: number, color: string): BufferGeometry {
  const g = new RingGeometry(r0, r1, 96)
  g.rotateX(-Math.PI / 2)
  g.translate(cx, y, cz)
  return paint(g, color)
}

function buildLayers(): Layer[] {
  const L: Layer[] = [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06].map((y) => ({ y, geoms: [] }))
  const H = CITY.half + 5

  // 0: chao base
  L[0].geoms.push(paint(flatShape({ t: 'rect', x0: -H, z0: -H, x1: H, z1: H }, 0), CITY.ground))

  // 1: tintas dos bairros e parque
  for (const d of CITY.districts) L[1].geoms.push(paint(flatShape(d.bounds, 0.01, 96), d.ground))
  for (const a of CITY.areas) if (a.kind === 'parque') L[1].geoms.push(paint(flatShape(a.bounds, 0.012), a.color))

  // 2-4: calcada, meio-fio, pista (ordem: pista por cima nos cruzamentos)
  for (const r of CITY.roads) {
    const spec = ROAD_SPEC[r.kind]
    if (r.kind === 'path') continue // trilhas do parque: ladrilho pastel em ParqueDeco.tsx
    L[2].geoms.push(paint(ribbon(r.points, r.width, 0.02), '#d8d3c7'))
    L[3].geoms.push(paint(ribbon(r.points, r.width - spec.sidewalk * 2 + 0.5, 0.03), '#b8b3a8'))
    L[4].geoms.push(paint(ribbon(r.points, r.width - spec.sidewalk * 2, 0.04), r.id === 'boulevard' ? '#3b3d44' : '#4a4d55'))
  }

  // 5: pracas
  for (const a of CITY.areas) {
    if (a.kind === 'praca' && a.id !== 'praca' && a.id !== 'praca-jardim') L[5].geoms.push(paint(flatShape(a.bounds, 0.05, 96), a.color))
  }

  // 6: detalhes da praca central (aneis) + reserva da fonte
  L[6].geoms.push(
    ringAt(0, -90, 0.1, 5, 0.06, '#cdd3d8'),
    ringAt(0, -90, 5, 5.5, 0.06, '#c9a15a'),
    ringAt(0, -150, 3, 3.4, 0.06, '#c9a15a'),
    ringAt(150, 0, 3, 3.4, 0.06, '#35e8ff'),
    ringAt(150, 0, 6, 6.3, 0.06, '#ff3fb4'),
  )
  return L
}

/** Piso da Praca Central (r = 38 m): pavimento Y2K em perola / azul bebe / lilas / menta com linhas que brilham de leve. */
function plazaTextures(): { map: CanvasTexture; glow: CanvasTexture } {
  const S = 2048
  const R = 38
  const px = S / (R * 2)
  const mk = () => {
    const c = document.createElement('canvas')
    c.width = c.height = S
    return c
  }
  const a = mk()
  const b = mk()
  const g = a.getContext('2d')!
  const e = b.getContext('2d')!
  e.fillStyle = '#000'
  e.fillRect(0, 0, S, S)
  g.fillStyle = '#d9d5cc'
  g.fillRect(0, 0, S, S)
  const C = S / 2
  const ang = (i: number, n: number) => (i / n) * Math.PI * 2
  const sector = (ctx: CanvasRenderingContext2D, r0: number, r1: number, a0: number, a1: number, col: string) => {
    ctx.beginPath()
    ctx.arc(C, C, r1 * px, a0, a1)
    ctx.arc(C, C, r0 * px, a1, a0, true)
    ctx.closePath()
    ctx.fillStyle = col
    ctx.fill()
  }
  // coroa de ladrilhos em leque alternando lilas / azul bebe / menta
  const fan = ['#b5b0a4', '#a2adb6', '#b2b8a4', '#c2a894']
  for (const [r0, r1, n] of [[12.2, 17.4, 24], [17.8, 23.4, 36], [24.8, 30, 48]] as const) {
    for (let i = 0; i < n; i++) sector(g, r0, r1, ang(i, n) + 0.012, ang(i + 1, n) - 0.012, fan[(i + (r0 > 20 ? 1 : 0)) % fan.length])
  }
  // faixa perolada e miolo
  sector(g, 30.4, 36.2, 0, Math.PI * 2, '#d9d5cc')
  sector(g, 0, 11.8, 0, Math.PI * 2, '#c8c4bb')
  for (let i = 0; i < 16; i++) sector(g, 6.6, 11.4, ang(i, 16) + 0.02, ang(i + 1, 16) - 0.02, i % 2 ? '#b9c5cd' : '#d4cfc4')
  // linhas luminosas (cor no mapa; mesmo desenho no mapa de emissao)
  const ring = (r: number, col: string, w: number) => {
    for (const ctx of [g, e]) {
      ctx.beginPath()
      ctx.arc(C, C, r * px, 0, Math.PI * 2)
      ctx.lineWidth = w * px
      ctx.strokeStyle = col
      ctx.stroke()
    }
  }
  ring(12, '#ffffff', 0.26)
  ring(17.6, '#ffffff', 0.18)
  ring(24.4, '#ffffff', 0.22)
  ring(30.2, '#e8dcb4', 0.18)
  ring(36.4, '#c9a15a', 0.3)
  ring(36.9, '#ffffff', 0.12)
  for (let i = 0; i < 24; i++) {
    const t = ang(i, 24)
    for (const ctx of [g, e]) {
      ctx.beginPath()
      ctx.moveTo(C + Math.cos(t) * 12.2 * px, C + Math.sin(t) * 12.2 * px)
      ctx.lineTo(C + Math.cos(t) * 30 * px, C + Math.sin(t) * 30 * px)
      ctx.lineWidth = 0.1 * px
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
    }
  }
  // sombras de contato baked sob os objetos da praca (assentam tudo no chao)
  for (const it of CENTRO_ITEMS) {
    const d = Math.hypot(it.x, it.z)
    if (d > R - 1) continue
    const base: Record<string, number> = { plaza_centerpiece: 4.6, planter_orb: 1.0, floating_platform: 1.9, kiosk_pod: 1.9, canopy_curved: 0, bench_bubble: 1.3, lamp_futuristic: 0.7 }
    const rr = (base[it.piece] ?? 0) * (it.s ?? 1)
    if (!rr) continue
    const x = C + it.x * px
    const y = C + it.z * px
    const gr = g.createRadialGradient(x, y, rr * px * 0.55, x, y, rr * px * 1.5)
    gr.addColorStop(0, 'rgba(70,45,110,0.32)')
    gr.addColorStop(1, 'rgba(70,45,110,0)')
    g.fillStyle = gr
    g.fillRect(x - rr * px * 1.6, y - rr * px * 1.6, rr * px * 3.2, rr * px * 3.2)
  }
  const map = new CanvasTexture(a)
  map.colorSpace = SRGBColorSpace
  map.anisotropy = 8
  const glow = new CanvasTexture(b)
  glow.colorSpace = SRGBColorSpace
  return { map, glow }
}

export function Surfaces({ shadows }: { shadows: boolean }) {
  const meshes = useMemo(() => buildLayers().map((l) => ({ y: l.y, geo: merge(l.geoms) })), [])
  const plaza = useMemo(() => ({ tex: plazaTextures(), geo: new CircleGeometry(38, 128).rotateX(-Math.PI / 2) }), [])

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {/* chao: caixa fina (topo em y=0) cobrindo toda a cidade */}
        <CuboidCollider args={[CITY.half + 5, 0.5, CITY.half + 5]} position={[0, -0.5, 0]} />
      </RigidBody>

      {meshes.map((m, i) => (
        <mesh key={i} geometry={m.geo} receiveShadow={shadows} userData={WALK} renderOrder={i}>
          <meshPhysicalMaterial
            ref={(m) => {
              // chuva: ruas e pracas ficam molhadas (mais lisas, mais escuras, com verniz)
              if (m) registerWet(m, i === 1 ? { roughWet: 0.3, ccWet: 0.6, dark: 0.1 } : i < 5 ? { roughWet: 0.34, ccWet: 0.95, dark: 0.22 } : { roughWet: 0.16, ccWet: 1, dark: 0.12 })
            }}
            vertexColors
            roughness={i === 1 ? 0.45 : i >= 5 ? 0.35 : 0.9}
            clearcoat={i === 1 ? 0.3 : i >= 5 ? 0.8 : 0.1}
            clearcoatRoughness={i >= 5 ? 0.25 : 0.4}
            polygonOffset
            polygonOffsetFactor={-i}
            polygonOffsetUnits={-i}
          />
        </mesh>
      ))}

      <mesh geometry={plaza.geo} position={[0, 0.058, 0]} receiveShadow={shadows} userData={WALK} renderOrder={6}>
        <meshPhysicalMaterial
          ref={(m) => {
            if (!m) return
            registerWet(m, { roughWet: 0.14, ccWet: 1, dark: 0.12 })
            registerGlowEmissive(m, 0.3, 1.5) // as linhas da praca acendem a noite
          }}
          map={plaza.tex.map}
          emissiveMap={plaza.tex.glow}
          emissive="#ffffff"
          emissiveIntensity={0.35}
          roughness={0.5}
          clearcoat={0.35}
          clearcoatRoughness={0.2}
          polygonOffset
          polygonOffsetFactor={-7}
          polygonOffsetUnits={-7}
        />
      </mesh>

    </group>
  )
}
