/** Vitrine 3D: a peça pronta (GLB real de assets/jewelry, recolorida) numa bandeja de veludo bordô. */
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, Sparkles, useGLTF } from '@react-three/drei'
import {
  ACESFilmicToneMapping, Box3, Color, DoubleSide, Mesh, MeshPhysicalMaterial, SRGBColorSpace, Vector3,
  type Group, type Material,
} from 'three'
import type { PieceType } from './data'
import { GEM_HEX, METAL_HEX, PEARL_HEX, type Metal, type GemColor, type PearlColor } from './data'

const BASE = `${import.meta.env.BASE_URL}assets/jewelry/`
const url = (id: string) => `${BASE}${id}.glb`

export interface ShowcaseProps {
  model: string
  type: PieceType
  metal: Metal
  gem: GemColor
  pearl: PearlColor
}

const slotOf = (m: Material | Material[]) => (Array.isArray(m) ? m[0] : m).name.replace(/\.\d+$/, '')

function makeMat(slot: string, p: ShowcaseProps): MeshPhysicalMaterial {
  const c = new Color()
  switch (slot) {
    case 'metal':
      return new MeshPhysicalMaterial({ color: c.set(METAL_HEX[p.metal]), metalness: 1, roughness: 0.16, clearcoat: 0.4, envMapIntensity: 1.6 })
    case 'gem':
      return new MeshPhysicalMaterial({
        color: c.set(GEM_HEX[p.gem]), metalness: 0.1, roughness: 0.04, clearcoat: 1, ior: 1.9, specularIntensity: 1,
        envMapIntensity: 2.4, emissive: new Color(GEM_HEX[p.gem]).multiplyScalar(p.gem === 'diamante' ? 0.05 : 0.18),
      })
    case 'pearl':
      return new MeshPhysicalMaterial({ color: c.set(PEARL_HEX[p.pearl]), metalness: 0.1, roughness: 0.22, clearcoat: 0.8, sheen: 1, sheenColor: new Color('#ffe9e0'), envMapIntensity: 1.2 })
    case 'ribbon':
      return new MeshPhysicalMaterial({ color: c.set('#1a1417'), roughness: 0.5, sheen: 1, sheenColor: new Color('#7a1a2e'), side: DoubleSide })
    default:
      return new MeshPhysicalMaterial({ color: c.set(METAL_HEX[p.metal]), metalness: 1, roughness: 0.2 })
  }
}

const TILT: Record<PieceType, [number, number]> = {
  colar: [-0.5, 0],
  pulseira: [-0.9, 0],
  anel: [-0.5, 0],
  tiara: [-0.35, 0],
}

function Jewel(p: ShowcaseProps) {
  const gltf = useGLTF(url(p.model))
  const ref = useRef<Group>(null)
  const { obj, mats, scale, offset } = useMemo(() => {
    const o = gltf.scene.clone(true)
    const cache = new Map<string, MeshPhysicalMaterial>()
    const list: MeshPhysicalMaterial[] = []
    o.traverse((n) => {
      const m = n as Mesh
      if (!m.isMesh) return
      const slot = slotOf(m.material)
      let mat = cache.get(slot)
      if (!mat) {
        mat = makeMat(slot, p)
        cache.set(slot, mat)
        list.push(mat)
      }
      m.material = mat
    })
    const box = new Box3().setFromObject(o)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const k = 2.5 / Math.max(size.x, size.y, size.z, 1e-4)
    return { obj: o, mats: list, scale: k, offset: center.multiplyScalar(-k) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf, p.model, p.metal, p.gem, p.pearl])
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats])
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.5
  })
  const [tx, tz] = TILT[p.type]
  return (
    <group position={[0, 1.15, 0]} rotation={[tx, 0, tz]}>
      <group ref={ref}>
        <group position={offset} scale={scale}>
          <primitive object={obj} />
        </group>
      </group>
    </group>
  )
}

function Tray() {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[2.2, 2.3, 0.3, 64]} />
        <meshPhysicalMaterial color="#2e0610" roughness={0.98} sheen={0.6} sheenColor={new Color('#7a1a2e')} sheenRoughness={0.4} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.22, 0.07, 16, 96]} />
        <meshStandardMaterial color="#d9b866" metalness={1} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.215, 0]}>
        <cylinderGeometry args={[1.5, 1.7, 0.08, 48]} />
        <meshPhysicalMaterial color="#3d0916" roughness={1} sheen={0.6} sheenColor={new Color('#8a1c35')} />
      </mesh>
    </group>
  )
}

/** Se o modelo falhar ao carregar, a bandeja continua e o resto do jogo não cai. */
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function Showcase3D(props: ShowcaseProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 3.1, 6.2], fov: 34 }}
      gl={{ antialias: true, alpha: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace, preserveDrawingBuffer: true }}
      onCreated={({ gl, camera }) => {
        gl.toneMappingExposure = 1.0
        camera.lookAt(0, 0.9, 0)
      }}
    >
      <Environment resolution={256} frames={1} background={false} environmentIntensity={0.9}>
        <Lightformer form="rect" intensity={3} color="#fff4e0" position={[0, 8, 2]} rotation-x={Math.PI / 2} scale={[14, 10, 1]} />
        <Lightformer form="rect" intensity={3.2} color="#ffe3b8" position={[6, 3, 3]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#dfe9ff" position={[-6, 3, 2]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="ring" intensity={2.6} color="#ffffff" position={[0, 3, -7]} scale={6} />
      </Environment>
      <ambientLight intensity={0.25} />
      <spotLight position={[3, 7, 4]} angle={0.5} penumbra={0.8} intensity={90} color="#fff1d6" />
      <Tray />
      <Boundary>
        <Suspense fallback={null}>
          <Jewel key={props.model} {...props} />
        </Suspense>
      </Boundary>
      <ContactShadows position={[0, 0.27, 0]} opacity={0.5} scale={6} blur={2.4} far={2} />
      <Sparkles count={36} scale={[4.2, 2.8, 4.2]} position={[0, 1.4, 0]} size={3.4} speed={0.35} color="#ffe9b0" opacity={0.9} />
    </Canvas>
  )
}
