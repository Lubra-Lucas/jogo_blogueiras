import { useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { BufferGeometry, CanvasTexture, Color, DoubleSide, Float32BufferAttribute, PlaneGeometry, RepeatWrapping, SRGBColorSpace } from 'three'
import { ROAD_SPEC } from '../city/layout'
import { merge, paint, ribbon } from '../city/geo'
import { registerWet } from '../environment/registry'
import { LAND_W, MIAMI, MIAMI_ROADS, SAND_X, SEA, seaFloorY } from './layout'
import { MeshPhysicalMaterial } from 'three'

const WALK = { walkable: true }
const ZH = 150 // meia-extensao do terreno em z
const SIDEWALK = '#efe6d2'
const CURB = '#d6cdb9'
const ASPHALT = '#585b63'

/** Superficies do terreno de Miami: camadas finas (como a cidade) com offset de poligono contra z-fighting. */
interface Layer {
  geoms: BufferGeometry[]
  rough: number
  coat: number
}

function strip(x0: number, x1: number, y: number, color: string, z0 = -ZH, z1 = ZH): BufferGeometry {
  const g = new PlaneGeometry(x1 - x0, z1 - z0)
  g.rotateX(-Math.PI / 2)
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2)
  return paint(g, color)
}

function dashes(points: readonly (readonly [number, number])[], width: number, len: number, gap: number, y: number, color: string): BufferGeometry[] {
  // linha reta apenas (as vias de Miami sao retas)
  const a = points[0]
  const b = points[points.length - 1]
  const L = Math.hypot(b[0] - a[0], b[1] - a[1])
  const dx = (b[0] - a[0]) / L
  const dz = (b[1] - a[1]) / L
  const out: BufferGeometry[] = []
  for (let s = 1; s + len < L; s += len + gap) {
    const p0: [number, number] = [a[0] + dx * s, a[1] + dz * s]
    const p1: [number, number] = [a[0] + dx * (s + len), a[1] + dz * (s + len)]
    out.push(paint(ribbon([p0, p1], width, y), color))
  }
  return out
}

function buildLayers(): Layer[] {
  const L: Layer[] = [0, 1, 2, 3, 4, 5, 6, 7].map(() => ({ geoms: [], rough: 0.85, coat: 0.1 }))
  // 0: chao base da ilha (calcada creme) e gramado do Lummus Park
  L[0].geoms.push(strip(LAND_W - 120, SAND_X + 0.5, 0, '#ebe2cc', -ZH - 120, ZH + 120))
  L[1].geoms.push(strip(17, SAND_X + 0.5, 0.003, '#86c970'))
  L[1].geoms.push(strip(LAND_W - 120, LAND_W + 10, 0.003, '#a9cf8a', -ZH - 120, ZH + 120))
  // 2-4: vias (calcada, meio-fio, asfalto)
  for (const r of MIAMI_ROADS) {
    if (r.kind === 'path') continue
    const sp = ROAD_SPEC[r.kind]
    L[2].geoms.push(paint(ribbon(r.points, r.width, 0.006), SIDEWALK))
    L[3].geoms.push(paint(ribbon(r.points, r.width - sp.sidewalk * 2 + 0.5, 0.009), CURB))
    L[4].geoms.push(paint(ribbon(r.points, r.width - sp.sidewalk * 2, 0.012), ASPHALT))
  }
  // 5: caminhos de pedestres: Lincoln Road (terrazzo claro), calcadao (bege rosado), ciclovia (terracota), acessos a praia, pier
  for (const r of MIAMI_ROADS) {
    if (r.kind !== 'path') continue
    const col = r.id === 'lincoln' ? '#eadcc2' : r.id === 'calcadao' ? '#f0d7bf' : r.id === 'ciclovia' ? '#cf7358' : r.id === 'pier' ? '#b88a5c' : '#e9d9b6'
    if (r.id === 'pier') continue // o deck vem do kit
    L[5].geoms.push(paint(ribbon(r.points, r.width, 0.015), col))
  }
  // 6: faixas: bordas do calcadao e da ciclovia, linha central da ciclovia, centro das avenidas, faixas de pedestre
  L[6].geoms.push(
    paint(ribbon([[26 - 2.35, -ZH], [26 - 2.35, ZH]], 0.16, 0.018), '#fff3e0'),
    paint(ribbon([[26 + 2.35, -ZH], [26 + 2.35, ZH]], 0.16, 0.018), '#fff3e0'),
    paint(ribbon([[31.5 - 1.6, -ZH], [31.5 - 1.6, ZH]], 0.14, 0.018), '#fbf7ee'),
    paint(ribbon([[31.5 + 1.6, -ZH], [31.5 + 1.6, ZH]], 0.14, 0.018), '#fbf7ee'),
    paint(ribbon([[-116, -6.6], [8, -6.6]], 0.2, 0.018), '#d9c9a8'),
    paint(ribbon([[-116, 6.6], [8, 6.6]], 0.2, 0.018), '#d9c9a8'),
  )
  for (const g of dashes([[31.5, -ZH], [31.5, ZH]], 0.14, 1.4, 2.0, 0.019, '#fbf7ee')) L[6].geoms.push(g)
  for (const r of MIAMI_ROADS) {
    if (r.id === 'ocean-drive' || r.id === 'collins') {
      for (const g of dashes(r.points, 0.2, 3, 3, 0.016, '#f2d36b')) L[6].geoms.push(g)
    } else if (r.kind === 'street' && r.id !== 'washington') {
      for (const g of dashes(r.points, 0.15, 2.4, 3, 0.016, '#fbf7ee')) L[6].geoms.push(g)
    }
  }
  // 7: areia -> varias faixas de cor (duna seca, areia media, areia molhada)
  return L
}

/** textura de areia: grao fino em tons de creme (repete a cada 8 m) */
function sandTexture(): CanvasTexture {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#f2dfb4'
  g.fillRect(0, 0, S, S)
  let seed = 7
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let i = 0; i < 5200; i++) {
    const t = rnd()
    g.fillStyle = t < 0.4 ? 'rgba(214,186,128,0.22)' : t < 0.75 ? 'rgba(255,246,222,0.28)' : 'rgba(176,146,96,0.16)'
    const r = 0.5 + rnd() * 1.6
    g.fillRect(rnd() * S, rnd() * S, r, r)
  }
  // ondulacoes suaves
  for (let i = 0; i < 14; i++) {
    g.strokeStyle = 'rgba(205,176,120,0.10)'
    g.lineWidth = 2 + rnd() * 4
    g.beginPath()
    const y0 = rnd() * S
    g.moveTo(0, y0)
    g.bezierCurveTo(S * 0.3, y0 + 14, S * 0.6, y0 - 14, S, y0)
    g.stroke()
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** Fundo do mar (visual): faixa em declive com cor de areia molhada -> turquesa -> azul profundo. */
function seabed(): BufferGeometry {
  const xs = [SEA.shoreX, SEA.shoreX + 3.5, SEA.shoreX + 8, SEA.shoreX + 17, SEA.shoreX + 30, SEA.shoreX + 70, SEA.shoreX + 140, SEA.farX]
  const zs = [-700, -ZH - 20, -60, 0, 60, ZH + 20, 700]
  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []
  const c = new Color()
  const wet = new Color('#d9c28d')
  const shallow = new Color('#9fd1c0')
  const deep = new Color('#2d86a8')
  for (const x of xs) {
    for (const z of zs) {
      const y = seaFloorY(x)
      pos.push(x, y, z)
      const d = Math.max(0, SEA.waterY - y)
      if (d < 0.5) c.copy(wet).lerp(shallow, d / 0.5)
      else c.copy(shallow).lerp(deep, Math.min(1, (d - 0.5) / 4))
      col.push(c.r, c.g, c.b)
    }
  }
  const nz = zs.length
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < nz - 1; j++) {
      const a = i * nz + j
      idx.push(a, a + 1, a + nz, a + 1, a + nz + 1, a + nz)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/**
 * Terreno de Miami Beach: chao, vias, calcadao, ciclovia, gramado, areia (textura de grao) e fundo do mar em declive
 * (colisor em rampa: a jogadora desce devagar ate a agua na cintura, onde ha um muro invisivel).
 */
export function MiamiGround({ shadows }: { shadows: boolean }) {
  const layers = useMemo(() => buildLayers().filter((l) => l.geoms.length > 0).map((l) => ({ geo: merge(l.geoms), rough: l.rough, coat: l.coat })), [])
  const sand = useMemo(() => {
    const g = new PlaneGeometry(SEA.shoreX - SAND_X + 1, ZH * 2 + 40, 1, 1)
    g.rotateX(-Math.PI / 2)
    g.translate((SEA.shoreX + SAND_X + 1) / 2 - 0.5, 0.004, 0)
    const uv = g.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ((SEA.shoreX - SAND_X) / 8), uv.getY(i) * ((ZH * 2 + 40) / 8))
    return g
  }, [])
  const sandTex = useMemo(() => sandTexture(), [])
  const bed = useMemo(() => seabed(), [])
  // rampa do fundo: caixa fina rotacionada que acompanha a linha de (shoreX, 0) ate (wallX, floor)
  const ramp = useMemo(() => {
    const x1 = SEA.wallX + 1.5
    const y1 = seaFloorY(x1)
    const len = Math.hypot(x1 - SEA.shoreX, y1)
    const ang = Math.atan2(y1, x1 - SEA.shoreX) // negativo (desce)
    const th = 0.6
    const mx = (SEA.shoreX + x1) / 2
    const my = y1 / 2
    // centro da caixa = ponto medio da linha de topo menos meia espessura ao longo da normal
    const nx = -Math.sin(ang)
    const ny = Math.cos(ang)
    return { len, ang, pos: [mx - nx * th, my - ny * th, 0] as [number, number, number], th }
  }, [])

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {/* chao: caixa fina cobrindo a ilha (topo em y = 0) */}
        <CuboidCollider args={[(SEA.shoreX - (LAND_W - 20)) / 2, 0.5, ZH + 40]} position={[(SEA.shoreX + LAND_W - 20) / 2, -0.5, 0]} />
        {/* declive do mar */}
        <CuboidCollider args={[ramp.len / 2 + 0.2, ramp.th, ZH + 40]} position={ramp.pos} rotation={[0, 0, ramp.ang]} />
        {/* limites invisiveis: muro do mar, bordas da ilha */}
        {MIAMI.walls.map((w, i) => (
          <CuboidCollider key={i} args={[w[3], w[4], w[5]]} position={[w[0], w[1], w[2]]} />
        ))}
      </RigidBody>

      {layers.map((l, i) => (
        <mesh key={i} geometry={l.geo} receiveShadow={shadows} userData={WALK} renderOrder={i}>
          <GroundMat i={i} rough={l.rough} coat={l.coat} />
        </mesh>
      ))}

      {/* areia */}
      <mesh geometry={sand} receiveShadow={shadows} userData={WALK} renderOrder={1}>
        <meshStandardMaterial map={sandTex} color="#fff3d6" roughness={0.95} metalness={0} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      {/* fundo do mar: dentro do muro e andavel; alem dele so visual */}
      <mesh geometry={bed} receiveShadow={shadows} userData={WALK}>
        <meshStandardMaterial vertexColors roughness={0.9} side={DoubleSide} />
      </mesh>
    </group>
  )
}

function GroundMat({ i, rough, coat }: { i: number; rough: number; coat: number }) {
  return (
    <meshPhysicalMaterial
      ref={(m: MeshPhysicalMaterial | null) => {
        if (m) registerWet(m, i < 2 ? { roughWet: 0.5, ccWet: 0.4, dark: 0.1 } : { roughWet: 0.3, ccWet: 0.9, dark: 0.2 })
      }}
      vertexColors
      roughness={rough}
      clearcoat={coat}
      clearcoatRoughness={0.4}
      polygonOffset
      polygonOffsetFactor={-i - 1}
      polygonOffsetUnits={-i - 1}
    />
  )
}
