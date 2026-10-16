import { useMemo } from 'react'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { BufferGeometry, DoubleSide, LatheGeometry, RingGeometry, Vector2 } from 'three'
import { CITY, ROAD_SPEC } from './layout'
import { flatShape, merge, paint, ribbon } from './geo'

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
    if (r.kind === 'path') {
      L[4].geoms.push(paint(ribbon(r.points, r.width, 0.04), '#ecd9b9'))
      continue
    }
    L[2].geoms.push(paint(ribbon(r.points, r.width, 0.02), '#f6ece2'))
    L[3].geoms.push(paint(ribbon(r.points, r.width - spec.sidewalk * 2 + 0.5, 0.03), '#cfc6c4'))
    L[4].geoms.push(paint(ribbon(r.points, r.width - spec.sidewalk * 2, 0.04), r.id === 'boulevard' ? '#5f5b7c' : '#9b9aa9'))
  }

  // 5: pracas
  for (const a of CITY.areas) {
    if (a.kind === 'praca') L[5].geoms.push(paint(flatShape(a.bounds, 0.05, 96), a.color))
  }

  // 6: detalhes da praca central (aneis) + reserva da fonte
  L[6].geoms.push(
    ringAt(0, 0, 36.6, 38, 0.06, '#e6b84f'),
    ringAt(0, 0, 24, 24.8, 0.06, '#e6b84f'),
    ringAt(0, 0, 14, 22, 0.06, '#d4e9fb'),
    ringAt(0, 0, 8.6, 9.2, 0.06, '#e6b84f'),
    ringAt(0, 0, 0.1, 8.6, 0.06, '#fff3c4'),
    ringAt(0, -90, 0.1, 5, 0.06, '#cfe6f6'),
    ringAt(0, -90, 5, 5.5, 0.06, '#e6b84f'),
    ringAt(0, -150, 3, 3.4, 0.06, '#e6b84f'),
    ringAt(150, 0, 3, 3.4, 0.06, '#35e8ff'),
    ringAt(150, 0, 6, 6.3, 0.06, '#ff3fb4'),
    ringAt(0, 158, 3, 3.4, 0.06, '#e8a3b8'),
  )
  return L
}

export function Surfaces({ shadows }: { shadows: boolean }) {
  const meshes = useMemo(() => buildLayers().map((l) => ({ y: l.y, geo: merge(l.geoms) })), [])
  const rim = useMemo(() => {
    const r = CITY.lake.r
    const pts = [new Vector2(r - 0.2, 0), new Vector2(r - 0.2, 0.45), new Vector2(r + 1.3, 0.45), new Vector2(r + 1.5, 0.3), new Vector2(r + 1.5, 0)]
    return new LatheGeometry(pts, 64)
  }, [])
  const L = CITY.lake

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {/* chao: caixa fina (topo em y=0) cobrindo toda a cidade */}
        <CuboidCollider args={[CITY.half + 5, 0.5, CITY.half + 5]} position={[0, -0.5, 0]} />
        {/* lago: cilindro alto (nao da para entrar na agua) */}
        <CylinderCollider args={[0.75, L.r + 0.6]} position={[L.cx, 0.75, L.cz]} />
      </RigidBody>

      {meshes.map((m, i) => (
        <mesh key={i} geometry={m.geo} receiveShadow={shadows} userData={WALK} renderOrder={i}>
          <meshPhysicalMaterial
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

      {/* lago: agua brilhante + borda de pedra (nao caminhavel) */}
      <mesh position={[L.cx, 0.2, L.cz]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[L.r, 64]} />
        <meshPhysicalMaterial
          color="#3fa7e0"
          roughness={0.12}
          metalness={0}
          clearcoat={0.5}
          clearcoatRoughness={0.03}
          envMapIntensity={0.35}
          side={DoubleSide}
        />
      </mesh>
      <mesh geometry={rim} position={[L.cx, 0, L.cz]} receiveShadow={shadows}>
        <meshStandardMaterial color="#e9dccf" roughness={0.7} side={DoubleSide} />
      </mesh>
    </group>
  )
}
