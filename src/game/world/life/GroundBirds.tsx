import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ConeGeometry, DoubleSide, InstancedMesh, Matrix4, MeshStandardMaterial, Object3D, SphereGeometry, type BufferGeometry } from 'three'
import { LIFE } from './lifeQuality'
import { life, wind } from './lifeState'
import { mergeGeo, paintGeo, xform } from './geoUtil'
import { CITY } from '../city/layout'

/**
 * Pombos e pardais no chao das pracas e do parque: ciscam, andam em passinhos e, quando a jogadora chega perto,
 * saem voando para longe (batendo asa) e pousam mais adiante. Uma malha instanciada para corpos e outra para asas.
 */

const L = CITY.lake
// pontos onde ficam (centro, raio min/max)
const HOMES: [number, number, number, number][] = [
  [0, 0, 12, 34],
  [0, 158, 9.5, 15],
  [L.cx, L.cz, L.r + 2.5, L.r + 7],
  [0, -90, 4, 12],
  [150, 0, 10, 15],
  [0, -150, 4, 9],
]

function bodyGeo(pigeon: boolean): BufferGeometry {
  const parts: BufferGeometry[] = []
  const body = pigeon ? '#8c929b' : '#9b7a58'
  const belly = pigeon ? '#b3b8c0' : '#d6c7aa'
  parts.push(paintGeo(xform(new SphereGeometry(0.1, 10, 8), [0, 0.12, 0], [0, 0, 0], [0.85, 0.8, 1.25]), body))
  parts.push(paintGeo(xform(new SphereGeometry(0.085, 8, 6), [0, 0.1, 0.01], [0, 0, 0], [0.8, 0.5, 1.1]), belly))
  parts.push(paintGeo(xform(new SphereGeometry(0.058, 8, 6), [0, 0.2, 0.11]), pigeon ? '#4f7b82' : '#7a5c40'))
  parts.push(paintGeo(xform(new ConeGeometry(0.014, 0.04, 5), [0, 0.195, 0.17], [Math.PI / 2, 0, 0]), '#d9a64a'))
  parts.push(paintGeo(xform(new ConeGeometry(0.05, 0.14, 6), [0, 0.1, -0.15], [-Math.PI / 2 - 0.2, 0, 0]), pigeon ? '#6b7079' : '#6b4f38'))
  // perninhas
  for (const s of [-1, 1]) parts.push(paintGeo(xform(new SphereGeometry(0.012, 4, 3), [s * 0.03, 0.025, 0.02], [0, 0, 0], [1, 2.2, 1]), '#c97d6a'))
  return mergeGeo(parts)
}
function wingGeo(): BufferGeometry {
  const g = new SphereGeometry(0.1, 8, 5)
  xform(g, [0.09, 0, 0], [0, 0, 0], [1.1, 0.16, 0.7])
  return paintGeo(g, '#7e848d')
}

type Mode = 'ground' | 'fly'
interface Bird {
  home: number
  x: number
  z: number
  y: number
  yaw: number
  mode: Mode
  peck: number
  walk: number
  walkDir: number
  nextAct: number
  tx: number
  tz: number
  vx: number
  vz: number
  vy: number
  scale: number
  pigeon: boolean
  tFly: number
  wait: number
}

function pickSpot(home: number, rnd = Math.random) {
  const [cx, cz, r0, r1] = HOMES[home]
  const a = rnd() * Math.PI * 2
  const r = r0 + rnd() * (r1 - r0)
  return [cx + Math.cos(a) * r, cz + Math.sin(a) * r] as const
}

export function GroundBirds() {
  const n = LIFE.groundBirds
  const bodyRef = useRef<InstancedMesh>(null)
  const wingRef = useRef<InstancedMesh>(null)
  const geos = useMemo(() => ({ pigeon: bodyGeo(true), sparrow: bodyGeo(false), wing: wingGeo() }), [])
  const mats = useMemo(
    () => ({ body: new MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), wing: new MeshStandardMaterial({ color: '#7e848d', roughness: 0.7, side: DoubleSide }) }),
    [],
  )
  const birds = useMemo<Bird[]>(
    () =>
      Array.from({ length: n }, (_, i) => {
        const home = i % HOMES.length
        const [x, z] = pickSpot(home)
        return { home, x, z, y: 0.03, yaw: Math.random() * 6.28, mode: 'ground', peck: Math.random() * 6, walk: 0, walkDir: 0, nextAct: Math.random() * 2, tx: x, tz: z, vx: 0, vz: 0, vy: 0, scale: i % 3 === 2 ? 0.62 : 1, pigeon: i % 3 !== 2, tFly: 0, wait: 0 }
      }),
    [n],
  )
  // um InstancedMesh por tipo (pombo/pardal) nao compensa para tao poucos: usa so o corpo de pombo recolorido por instancia
  const root = useMemo(() => new Object3D(), [])
  const wl = useMemo(() => new Object3D(), [])
  const wr = useMemo(() => new Object3D(), [])
  const tmp = useMemo(() => new Matrix4(), [])
  useEffect(() => {
    root.add(wl)
    root.add(wr)
  }, [root, wl, wr])

  useFrame((_, dt0) => {
    const body = bodyRef.current
    const wing = wingRef.current
    if (!body || !wing || !n) return
    const dt = Math.min(dt0, 0.1)
    const t = life.t
    const px = life.player.x
    const pz = life.player.z
    for (let i = 0; i < n; i++) {
      const b = birds[i]
      const dxp = b.x - px
      const dzp = b.z - pz
      const dp = Math.hypot(dxp, dzp)
      const near = Math.hypot(b.x - life.cam.x, b.z - life.cam.z) < 90
      if (b.mode === 'ground') {
        if (near) {
          const spook = dp < 3.2 + (life.speed > 2.4 ? 1.5 : 0)
          if (spook) {
            b.mode = 'fly'
            const away = Math.atan2(dxp, dzp) + (Math.random() - 0.5) * 1.1
            const [nx, nz] = pickSpot(b.home)
            const far = 11 + Math.random() * 8
            b.tx = b.x + Math.sin(away) * far * 0.6 + (nx - b.x) * 0.15
            b.tz = b.z + Math.cos(away) * far * 0.6 + (nz - b.z) * 0.15
            b.tFly = 0
            b.vy = 3.4
            const d = Math.hypot(b.tx - b.x, b.tz - b.z)
            const T = 1.6 + d / 7
            b.vx = (b.tx - b.x) / T
            b.vz = (b.tz - b.z) / T
            b.wait = T
            b.yaw = Math.atan2(b.vx, b.vz)
          } else {
            b.nextAct -= dt
            if (b.nextAct <= 0) {
              b.walk = Math.random() < 0.5 ? 0.5 + Math.random() * 1.2 : 0
              b.walkDir = b.yaw + (Math.random() - 0.5) * 2
              b.nextAct = 1.2 + Math.random() * 3
            }
            if (b.walk > 0) {
              b.walk -= dt
              const k = Math.min(1, dt * 4)
              b.yaw += Math.atan2(Math.sin(b.walkDir - b.yaw), Math.cos(b.walkDir - b.yaw)) * k
              b.x += Math.sin(b.yaw) * 0.32 * dt
              b.z += Math.cos(b.yaw) * 0.32 * dt
            }
            b.peck += dt * (b.walk > 0 ? 7 : 3.2)
          }
        }
      } else {
        b.tFly += dt
        // sobe, plana e desce suave ate o ponto de pouso
        const u = Math.min(1, b.tFly / b.wait)
        b.x += b.vx * dt
        b.z += b.vz * dt
        b.vy += (-6.4 * (u < 0.35 ? 0.4 : 1.0) + (u > 0.7 ? 1.8 : 0)) * dt
        b.y = Math.max(0.03, b.y + b.vy * dt)
        // asas na rajada ficam mais abertas: pouso levemente contra o vento
        b.x += wind.dx * wind.strength * 0.2 * dt
        if (b.tFly >= b.wait || b.y <= 0.031 && b.tFly > 0.4) {
          b.mode = 'ground'
          b.y = 0.03
          b.vy = 0
          b.nextAct = 0.5
          b.walk = 0
        }
      }
      // matrizes
      root.position.set(b.x, b.y, b.z)
      const flying = b.mode === 'fly'
      const pitch = flying ? -0.35 : 0.45 * Math.max(0, Math.sin(b.peck)) * (b.walk > 0 ? 0.4 : 1)
      root.rotation.set(pitch, b.yaw, 0)
      root.scale.setScalar(b.scale)
      root.updateMatrix()
      body.setMatrixAt(i, root.matrix)
      const flap = flying ? Math.sin(t * 34 + i) * 0.9 : -0.1
      wl.position.set(-0.05, 0.16, 0)
      wl.rotation.set(0, 0, 0)
      wl.rotation.z = flying ? flap : 0.35
      wl.scale.set(-1, 1, 1)
      wr.position.set(0.05, 0.16, 0)
      wr.rotation.z = flying ? -flap : -0.35
      wr.scale.set(1, 1, 1)
      wl.updateMatrix()
      wr.updateMatrix()
      const m = root.matrix
      wing.setMatrixAt(i * 2, tmp.multiplyMatrices(m, wl.matrix))
      wing.setMatrixAt(i * 2 + 1, tmp.multiplyMatrices(m, wr.matrix))
    }
    body.instanceMatrix.needsUpdate = true
    wing.instanceMatrix.needsUpdate = true
  })

  if (!n) return null
  return (
    <>
      <instancedMesh ref={bodyRef} args={[geos.pigeon, mats.body, n]} frustumCulled={false} castShadow />
      <instancedMesh ref={wingRef} args={[geos.wing, mats.wing, n * 2]} frustumCulled={false} />
    </>
  )
}
