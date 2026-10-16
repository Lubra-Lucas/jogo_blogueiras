import { useMemo } from 'react'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type BufferGeometry, type Matrix4 } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { CITY } from './layout'
import { merge, paint, place, placement } from './geo'
import { Cull, chunkKey, useCullDist } from './cull'

const rbox = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.01, d / 2 - 0.01, h / 2 - 0.01))

/** O Centro usa o kit Y2K (centro.ts / kit.tsx); os demais bairros seguem com o esboco de caixas. */
const BLOCKS = CITY.blocks.filter((b) => b.district !== 'centro')

interface Parts {
  body: BufferGeometry[]
  glass: BufferGeometry[]
  neon: BufferGeometry[]
}

function buildParts(blocks: typeof CITY.blocks): Parts {
  const body: BufferGeometry[] = []
  const glass: BufferGeometry[] = []
  const neon: BufferGeometry[] = []
  const dmap = new Map(CITY.districts.map((d) => [d.id, d]))

  for (const b of blocks) {
    const d = dmap.get(b.district)!
    const M: Matrix4 = placement(b.x, 0, b.z, b.rot)
    const col = d.palette[b.colorIdx % d.palette.length]
    const acc = d.accent[b.accentIdx % d.accent.length]
    const add = (list: BufferGeometry[], g: BufferGeometry, color: string, lx: number, ly: number, lz: number) => {
      paint(g, color)
      place(g, M, lx, ly, lz)
      list.push(g)
    }
    const { w, h, d: dp } = b

    if (b.shape === 'cyl') {
      const r = w / 2
      add(body, new CylinderGeometry(r, r, h, 28), col, 0, h / 2, 0)
      const dome = new SphereGeometry(r, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2)
      dome.scale(1, 0.55, 1)
      add(body, dome, '#fdfbff', 0, h, 0)
      add(body, new TorusGeometry(r + 0.05, 0.4, 8, 28).rotateX(Math.PI / 2), '#fdfbff', 0, h * 0.62, 0)
      if (b.colorIdx % 2 === 0) add(neon, new TorusGeometry(r + 0.12, 0.09, 4, 32).rotateX(Math.PI / 2), '#9fe9ff', 0, h * 0.62, 0)
    } else if (d.style === 'y2k') {
      add(body, rbox(w, h, dp, 2.6), col, 0, h / 2, 0)
      add(body, rbox(w * 0.7, 1.6, dp * 0.7, 0.8), '#fdfbff', 0, h + 0.7, 0)
      add(body, rbox(w + 0.5, 1.1, dp + 0.5, 0.5), '#fdfbff', 0, h * 0.5, 0)
      if (b.colorIdx % 3 === 0) add(neon, new BoxGeometry(w + 0.9, 0.1, dp + 0.9), '#9fe9ff', 0, h * 0.5 + 0.7, 0)
    } else if (d.style === 'luxo') {
      add(body, rbox(w + 2, 3.2, dp + 2, 0.4), '#f7f0e6', 0, 1.6, 0)
      add(body, rbox(w, h, dp, 0.5), col, 0, h / 2, 0)
      for (let k = 1; k <= 5; k++) add(glass, new BoxGeometry(w + 0.2, 1.8, dp + 0.2), acc, 0, 3.2 + ((h - 4) * k) / 6, 0)
      add(glass, new BoxGeometry(2.4, h * 0.88, 0.2), '#7fb8e6', 0, h * 0.46, dp / 2 + 0.1)
    } else if (d.style === 'neon') {
      add(body, rbox(w, h, dp, 0.5), col, 0, h / 2, 0)
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(neon, new BoxGeometry(0.35, h * 0.92, 0.35), acc, (sx * w) / 2, h * 0.5, (sz * dp) / 2)
      add(neon, new BoxGeometry(w + 0.15, 0.3, dp + 0.15), acc, 0, h * 0.5, 0)
      add(neon, new BoxGeometry(w + 0.15, 0.3, dp + 0.15), acc, 0, h + 0.05, 0)
    } else {
      // romantico: casa baixa com telhado de quatro aguas
      add(body, rbox(w, h, dp, 0.3), col, 0, h / 2, 0)
      const rh = 3.2
      const roof = new ConeGeometry(1, 1, 4, 1)
      roof.rotateY(Math.PI / 4)
      roof.scale((w + 1.4) / Math.SQRT2, rh, (dp + 1.4) / Math.SQRT2)
      add(body, roof, acc, 0, h + rh / 2, 0)
      add(body, new BoxGeometry(1, 2.2, 1), '#c9a9a0', w * 0.25, h + rh * 0.55, dp * 0.15)
      add(body, new BoxGeometry(1.3, 2.3, 0.2), '#e8b4c0', 0, 1.15, dp / 2 + 0.05)
      if (b.shopId === 'casa-sonhos') {
        for (const sx of [-1, 1]) {
          add(body, new CylinderGeometry(2.6, 2.6, h + 5, 20), '#ffd1dc', (sx * w) / 2, (h + 5) / 2, -dp / 2 + 1)
          add(body, new ConeGeometry(3.2, 4.5, 20), '#ff9ccb', (sx * w) / 2, h + 5 + 2.25, -dp / 2 + 1)
        }
      }
    }

    // portas das lojas: faixa luminosa + toldo na cor da loja
    if (b.shopId) {
      const poi = CITY.pois.find((p) => p.id === b.shopId)!
      add(neon, new BoxGeometry(2.4, 3.4, 0.3), poi.color, 0, 1.7, dp / 2 + 0.2)
      add(body, new BoxGeometry(5, 0.35, 2.4), poi.color, 0, 3.9, dp / 2 + 1.2)
    }
  }
  return { body, glass, neon }
}

export function Buildings({ shadows }: { shadows: boolean }) {
  const dist = useCullDist()
  const chunks = useMemo(() => {
    const map = new Map<number, typeof CITY.blocks>()
    for (const b of BLOCKS) {
      const k = chunkKey(b.x, b.z)
      const l = map.get(k)
      if (l) l.push(b)
      else map.set(k, [b])
    }
    return [...map.values()].map((blocks) => {
      const p = buildParts(blocks)
      const cx = blocks.reduce((a, b) => a + b.x, 0) / blocks.length
      const cz = blocks.reduce((a, b) => a + b.z, 0) / blocks.length
      const r = Math.max(...blocks.map((b) => Math.hypot(b.x - cx, b.z - cz) + Math.hypot(b.w, b.d))) + 4
      return { body: merge(p.body), glass: p.glass.length ? merge(p.glass) : null, neon: p.neon.length ? merge(p.neon) : null, cx, cz, r }
    })
  }, [])

  return (
    <group>
      {chunks.map((c, i) => (
        <Cull key={i} cx={c.cx} cz={c.cz} r={c.r} max={dist.buildings}>
          <mesh geometry={c.body} castShadow={shadows} receiveShadow={shadows}>
            <meshPhysicalMaterial vertexColors roughness={0.3} clearcoat={0.8} clearcoatRoughness={0.2} />
          </mesh>
          {c.glass && <mesh geometry={c.glass} castShadow={shadows}>
            <meshPhysicalMaterial vertexColors roughness={0.1} metalness={0.4} clearcoat={0.8} clearcoatRoughness={0.1} envMapIntensity={1.1} />
          </mesh>}
          {c.neon && (
            <mesh geometry={c.neon}>
              <meshBasicMaterial vertexColors toneMapped={false} />
            </mesh>
          )}
        </Cull>
      ))}

      <RigidBody type="fixed" colliders={false}>
        {BLOCKS.map((b) =>
          b.shape === 'cyl' ? (
            <CylinderCollider key={b.id} args={[b.h / 2, b.w / 2]} position={[b.x, b.h / 2, b.z]} />
          ) : (
            <CuboidCollider key={b.id} args={[b.w / 2, b.h / 2, b.d / 2]} position={[b.x, b.h / 2, b.z]} rotation={[0, b.rot, 0]} />
          ),
        )}
      </RigidBody>
    </group>
  )
}
