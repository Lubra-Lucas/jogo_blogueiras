import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import {
  BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, MeshStandardMaterial, SpotLight, Vector3,
  type Material, type Object3D, type PerspectiveCamera,
} from 'three'
import { ALT_APPEARANCE } from '../../../shared/appearance'
import { useAppearanceStore } from '../../../state/appearanceStore'
import { BACKDROPS, DIFF, MOOD_POSES, POSES, PROPS, type LightSide, type PoseId } from './data'
import { live } from './live'
import { buildScript, CAM_D, ASPECT, DEFAULT_CAM, fovOf, halfH, keyColor, poseAt, type Slot } from './logic'
import { PoseDoll } from './PoseDoll'
import { useFotoStore } from './store'

const BASE = import.meta.env.BASE_URL
const glbUrl = (file: string) => `${BASE}assets/interiors/estudio/${file}.glb`

// ------------------------------------------------------------------ paleta realista para as peças de interior
interface SlotStyle { color: string; rough?: number; metal?: number; emissive?: boolean }
const REAL: Record<string, SlotStyle> = {
  base: { color: '#2c2e33' },
  accent: { color: '#e9e4d9' },
  accent2: { color: '#b4694b' },
  soft: { color: '#cdd0d3' },
  deep: { color: '#1a1b1e' },
  white: { color: '#f2f0ec' },
  fabric: { color: '#39424f', rough: 0.7 },
  trim: { color: '#d6d9df', metal: 1, rough: 0.16 },
  glass: { color: '#cfd8de' },
  leaf: { color: '#66763f' },
  glow: { color: '#fff1da', emissive: true },
  glow2: { color: '#ff9a4d', emissive: true },
}

/** Peça do estúdio (GLB) com os slots de material recoloridos em cores do mundo real. */
function Piece({ file, position = [0, 0, 0], rotY = 0, rotX = 0, glow, scale = 1, override }: {
  file: string; position?: [number, number, number]; rotY?: number; rotX?: number; glow?: string; scale?: number; override?: Record<string, string>
}) {
  const gltf = useGLTF(glbUrl(file))
  const { obj, glows } = useMemo(() => {
    const obj = gltf.scene.clone(true)
    const glows: MeshStandardMaterial[] = []
    const cache = new Map<Material, Material>()
    obj.traverse((o: Object3D) => {
      const m = o as Mesh
      if (!m.isMesh) return
      m.castShadow = true
      m.receiveShadow = true
      const conv = (mat: Material): Material => {
        const hit = cache.get(mat)
        if (hit) return hit
        const c = mat.clone() as MeshStandardMaterial
        const slot = (mat.name ?? '').split('.')[0]
        const style = REAL[slot]
        if (style && c.color) {
          c.color.set(override?.[slot] ?? style.color)
          if (style.rough !== undefined) c.roughness = style.rough
          if (style.metal !== undefined) c.metalness = style.metal
          if (style.emissive) {
            c.emissive = new Color(override?.[slot] ?? style.color)
            c.emissiveIntensity = 1.3
            if (slot === 'glow') glows.push(c)
          }
        }
        cache.set(mat, c)
        return c
      }
      m.material = Array.isArray(m.material) ? m.material.map(conv) : conv(m.material)
    })
    return { obj, glows }
  }, [gltf, file, override])
  useEffect(() => {
    for (const g of glows) {
      g.color.set(glow ?? '#fff1da')
      g.emissive.set(glow ?? '#fff1da')
    }
  }, [glows, glow])
  return <primitive object={obj} position={position} rotation={[rotX, rotY, 0]} scale={scale} />
}

// ------------------------------------------------------------------ papel de fundo (ciclorama)
const ZW = -1.4 // parede de papel
const R_ARC = 0.55
function cycGeometry(width = 9, zFront = 6.5, height = 4.2): BufferGeometry {
  const zf = ZW + R_ARC
  const floorLen = zFront - zf
  const arc = (Math.PI / 2) * R_ARC
  const wall = height - R_ARC
  const total = floorLen + arc + wall
  const N = 56
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * total
    let z: number, y: number
    if (s < floorLen) {
      z = zFront - s
      y = 0
    } else if (s < floorLen + arc) {
      const th = (s - floorLen) / R_ARC
      z = zf - R_ARC * Math.sin(th)
      y = R_ARC - R_ARC * Math.cos(th)
    } else {
      z = ZW
      y = R_ARC + (s - floorLen - arc)
    }
    pos.push(-width / 2, y, z, width / 2, y, z)
    if (i < N) {
      const a = i * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function Backdrop() {
  const geo = useMemo(() => cycGeometry(), [])
  const mat = useRef<MeshStandardMaterial>(null)
  const roll = useRef<MeshStandardMaterial>(null)
  const want = useMemo(() => new Color(), [])
  useFrame((_, dt) => {
    const id = useFotoStore.getState().light.backdrop
    want.set(BACKDROPS.find((b) => b.id === id)?.color ?? '#efede8')
    const k = 1 - Math.exp(-dt * 8)
    mat.current?.color.lerp(want, k)
    roll.current?.color.lerp(want, k)
  })
  return (
    <group>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial ref={mat} color="#efede8" roughness={0.88} side={DoubleSide} />
      </mesh>
      {/* rolo de papel no alto */}
      <mesh position={[0, 4.05, ZW - 0.05]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 9, 20]} />
        <meshStandardMaterial ref={roll} color="#efede8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 4.05, ZW - 0.05]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 9.4, 12]} />
        <meshStandardMaterial color="#d6d9df" metalness={1} roughness={0.2} />
      </mesh>
      {/* estúdio ao redor */}
      <mesh position={[0, 3, -3.1]}>
        <planeGeometry args={[40, 12]} />
        <meshStandardMaterial color="#222327" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 2]}>
        <planeGeometry args={[40, 30]} />
        <meshStandardMaterial color="#3b3d42" roughness={0.45} metalness={0.1} />
      </mesh>
    </group>
  )
}

// ------------------------------------------------------------------ luzes
const KEY_POS: Record<LightSide, [number, number, number]> = {
  esq: [-1.7, 1.5, 0.9],
  dir: [1.7, 1.5, 0.9],
  topo: [0, 3.0, 0.7],
  tras: [0, 1.7, -1.1],
}
const AIM = new Vector3(0, 1.1, 0)

function KeyLight() {
  const spot = useRef<SpotLight>(null)
  const pos = useMemo(() => new Vector3(-1.7, 1.5, 0.9), [])
  const col = useMemo(() => new Color(), [])
  useLayoutEffect(() => {
    const s = spot.current
    if (s) {
      s.target.position.copy(AIM)
      s.target.updateMatrixWorld()
    }
  }, [])
  useFrame((_, dt) => {
    const l = useFotoStore.getState().light
    const s = spot.current
    if (!s) return
    const k = 1 - Math.exp(-dt * 7)
    pos.lerp(new Vector3(...KEY_POS[l.side]), k)
    s.position.copy(pos)
    col.set(keyColor(l))
    s.color.lerp(col, k)
    s.intensity += (l.intensity * (l.side === 'tras' ? 3.4 : 3) - s.intensity) * k
  })
  return (
    <>
      <spotLight ref={spot} position={[-1.7, 1.5, 0.9]} angle={0.75} penumbra={0.85} decay={0} intensity={3} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-radius={5} />
    </>
  )
}

function Fixtures() {
  const side = useFotoStore((s) => s.light.side)
  const l = useFotoStore((s) => s.light)
  const glow = keyColor(l)
  const dim = '#6e6a64'
  const aim = (p: [number, number]) => Math.atan2(-p[0], -p[1])
  return (
    <group>
      <Piece file="softbox_light_stand" position={[-1.3, 0, 0.1]} rotY={aim([-1.3, 0.1])} glow={side === 'esq' ? glow : dim} />
      <Piece file="umbrella_reflector_stand" position={[1.3, 0, 0.1]} rotY={aim([1.3, 0.1])} glow={side === 'dir' ? glow : dim} />
      {side === 'tras' && <Piece file="ring_light_stand" position={[0.0, 0, -1.0]} glow={glow} />}
      {side === 'topo' && <Piece file="softbox_light_stand" position={[0, 3.1, -1.5]} rotX={Math.PI / 2} glow={glow} />}
    </group>
  )
}

function Props() {
  const id = useFotoStore((s) => s.light.prop)
  const p = PROPS.find((x) => x.id === id)
  if (!p || !p.file) return null
  const override = p.id === 'baloes' ? { accent2: '#b4694b', soft: '#d8c7a6', accent: '#ece7dd', fabric: '#6a7648', white: '#f1ede4' } : undefined
  return <Piece file={p.file} position={p.pos} rotY={p.rotY ?? 0} override={override} />
}

// ------------------------------------------------------------------ diretora (câmera, relógio, linha do tempo, foto)
function Director() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const handled = useRef(useFotoStore.getState().shotReq)
  const script = useRef<{ key: string; slots: Slot[] }>({ key: '', slots: [] })
  const prevCam = useRef({ ...DEFAULT_CAM })

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const s = useFotoStore.getState()

    // ---- relógio do jogo e linha do tempo da modelo
    const playing = s.phase === 'shoot' && !s.paused
    const client = s.clients[s.ci]
    const sk = `${s.resetKey}:${s.ci}`
    if (client && script.current.key !== sk) {
      script.current = { key: sk, slots: buildScript(client.seed, DIFF[s.difficulty], MOOD_POSES[client.brief.mood]) }
      live.t = 0
    }
    if (playing) {
      live.t += dt
      s.tick(dt)
    }
    if (live.force) live.sample = { index: 0, pose: live.force, prev: live.force, phase: 'hold', blendP: 1, peak: 1, blink: false, tIn: live.forceT || (POSES[live.force].clipDur ?? 0) * 0.5 }
    else if (client && s.phase === 'shoot') live.sample = poseAt(script.current.slots, live.t)
    else live.sample = { index: 0, pose: 'neutra', prev: 'neutra', phase: 'hold', blendP: 1, peak: 0, blink: false, tIn: 0 }

    // ---- câmera suavizada
    const target = s.cam
    const k = 1 - Math.exp(-dt * 13)
    const c = live.cam
    c.cx += (target.cx - c.cx) * k
    c.cy += (target.cy - c.cy) * k
    c.zoom += (target.zoom - c.zoom) * k
    const h = halfH(c.zoom)
    const p = prevCam.current
    const v = (Math.abs(c.cx - p.cx) / (2 * h * ASPECT) + Math.abs(c.cy - p.cy) / (2 * h) + Math.abs(c.zoom - p.zoom) / c.zoom) / Math.max(dt, 1e-3)
    live.speed += (v - live.speed) * (1 - Math.exp(-dt * 18))
    if (live.speed > live.peakSpeed) live.peakSpeed = live.speed
    live.recent = Math.max(live.speed, live.recent * Math.exp(-dt / 0.25))
    p.cx = c.cx
    p.cy = c.cy
    p.zoom = c.zoom
    camera.position.set(c.cx, c.cy, CAM_D)
    camera.rotation.set(0, 0, 0)
    const fov = fovOf(c.zoom)
    if (Math.abs(camera.fov - fov) > 1e-4) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }

    // ---- pedido de foto
    if (s.shotReq !== handled.current) {
      handled.current = s.shotReq
      gl.render(scene, camera)
      const src = gl.domElement
      const W = 360
      const H = Math.round((W * src.height) / src.width)
      const cv = document.createElement('canvas')
      cv.width = W
      cv.height = H
      cv.getContext('2d')?.drawImage(src, 0, 0, W, H)
      const smp = live.sample
      const moving = smp.phase === 'blend'
      const pose: PoseId = moving ? (smp.blendP > 0.75 ? smp.pose : smp.prev) : smp.pose
      s.commitShot(cv.toDataURL('image/jpeg', 0.82), pose, moving ? 0 : smp.peak, smp.blink)
    }
  })
  return null
}

/** Modelo: o look da jogadora nos clientes pares e um look alternativo nos ímpares. */
function Model() {
  const ci = useFotoStore((s) => s.ci)
  const mine = useAppearanceStore((s) => s.appearance)
  const app = ci % 2 === 0 ? mine : ALT_APPEARANCE
  return <PoseDoll appearance={app} />
}

export function PhotoStudio3D() {
  return (
    <>
      <color attach="background" args={['#202125']} />
      <Environment resolution={128} frames={1} background={false} environmentIntensity={0.2}>
        <Lightformer form="rect" intensity={2} color="#ffffff" position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[10, 8, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#e8edf3" position={[4, 2, 4]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1} color="#f5efe6" position={[-4, 2, 4]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
      </Environment>
      <hemisphereLight args={['#e4e8ee', '#5b5852', 0.42]} />
      <directionalLight position={[0.4, 1.6, 5]} intensity={0.3} color="#f4f6fa" />
      <Backdrop />
      <KeyLight />
      <Suspense fallback={null}>
        <Fixtures />
        <Props />
        <Model />
      </Suspense>
      <Director />
    </>
  )
}
