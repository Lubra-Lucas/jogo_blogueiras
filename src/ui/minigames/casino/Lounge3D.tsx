import { Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import {
  ACESFilmicToneMapping, Color, DoubleSide, MathUtils, PMREMGenerator, RepeatWrapping, SRGBColorSpace, Vector3,
  type Group, type Mesh, type MeshStandardMaterial, type Object3D, type Texture,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { GameId } from '../../../game/casino/chips'
import type { Screen } from './ui'

const BASE = import.meta.env.BASE_URL
const A = (n: string) => `${BASE}assets/casino/${n}`
const PIECES = ['card_table', 'poker_table', 'roulette_table', 'slot_machine', 'chip_stack', 'card_shoe', 'bar_stool', 'chandelier', 'bar_counter', 'lamp_floor', 'pillar']

/** Câmera por foco: posição e alvo. */
const VIEWS: Record<Screen, { p: [number, number, number]; t: [number, number, number] }> = {
  lobby: { p: [0, 3.6, 9.6], t: [0, 1.0, -1.8] },
  blackjack: { p: [-2.4, 2.4, 3.8], t: [-4.5, 0.9, -0.4] },
  poker: { p: [2.4, 2.4, 3.8], t: [4.5, 0.9, -0.4] },
  roleta: { p: [0, 2.6, 1.8], t: [0, 0.8, -3.6] },
  slots: { p: [3.2, 2.0, -1.4], t: [6.4, 1.2, -5.3] },
}

function Env() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pm = new PMREMGenerator(gl)
    const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = tex
    scene.environmentIntensity = 0.55
    return () => {
      scene.environment = null
      tex.dispose()
      pm.dispose()
    }
  }, [gl, scene])
  return null
}

function CameraRig({ focus }: { focus: Screen }) {
  const look = useRef(new Vector3(...VIEWS.lobby.t))
  const tmp = useMemo(() => new Vector3(), [])
  useFrame((st, dt) => {
    const v = VIEWS[focus]
    const k = 1 - Math.exp(-dt * 2.6)
    const sway = Math.sin(st.clock.elapsedTime * 0.25) * (focus === 'lobby' ? 0.5 : 0.08)
    tmp.set(v.p[0] + sway, v.p[1], v.p[2])
    st.camera.position.lerp(tmp, k)
    tmp.set(...v.t)
    look.current.lerp(tmp, k)
    st.camera.lookAt(look.current)
  })
  return null
}

function prepare(scene: Object3D, felt: Texture): Object3D {
  const c = scene.clone(true)
  c.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    const mat = m.material as MeshStandardMaterial
    if (mat?.name === 'felt') {
      const mm = mat.clone()
      mm.map = felt
      mm.color = new Color('#ffffff')
      mm.needsUpdate = true
      m.material = mm
    }
  })
  return c
}

function Piece({ name, position, rotation = 0, scale = 1, felt, onClick, children, spinRotor }: {
  name: string; position: [number, number, number]; rotation?: number; scale?: number; felt: Texture
  onClick?: () => void; children?: ReactNode; spinRotor?: boolean
}) {
  const gltf = useGLTF(A(`${name}.glb`))
  const obj = useMemo(() => prepare(gltf.scene, felt), [gltf.scene, felt])
  const rotor = useMemo(() => (spinRotor ? obj.getObjectByName('wheel_rotor') ?? null : null), [obj, spinRotor])
  useFrame((_, dt) => {
    if (rotor) rotor.rotation.y += dt * 0.35
  })
  return (
    <group
      position={position}
      rotation={[0, rotation, 0]}
      scale={scale}
      onClick={onClick ? (e) => (e.stopPropagation(), onClick()) : undefined}
      onPointerOver={onClick ? (e) => (e.stopPropagation(), (document.body.style.cursor = 'pointer')) : undefined}
      onPointerOut={onClick ? () => (document.body.style.cursor = '') : undefined}
    >
      <primitive object={obj} />
      {children}
    </group>
  )
}

function Room() {
  const carpet = useTexture(A('carpet.png'))
  useMemo(() => {
    carpet.wrapS = carpet.wrapT = RepeatWrapping
    carpet.repeat.set(16, 12)
    carpet.colorSpace = SRGBColorSpace
    carpet.anisotropy = 8
  }, [carpet])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]}>
        <planeGeometry args={[30, 24]} />
        <meshStandardMaterial map={carpet} roughness={0.95} />
      </mesh>
      {/* parede do fundo: lambril lacado, friso de latão e painel de veludo */}
      <mesh position={[0, 2.6, -8.2]}>
        <planeGeometry args={[30, 6.4]} />
        <meshStandardMaterial color="#1a0a10" roughness={0.6} />
      </mesh>
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[-10 + i * 2, 2.1, -8.15]}>
          <boxGeometry args={[1.5, 3.4, 0.08]} />
          <meshStandardMaterial color="#3d0d1d" roughness={0.75} />
        </mesh>
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={'g' + i} position={[-10 + i * 2, 2.1, -8.1]}>
          <boxGeometry args={[1.58, 3.48, 0.02]} />
          <meshStandardMaterial color="#c9a24a" metalness={1} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.3, -8.1]}>
        <boxGeometry args={[30, 0.6, 0.12]} />
        <meshStandardMaterial color="#0b0b0d" roughness={0.2} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.62, -8.04]}>
        <boxGeometry args={[30, 0.04, 0.06]} />
        <meshStandardMaterial color="#c9a24a" metalness={1} roughness={0.25} />
      </mesh>
      <mesh position={[-11, 2.4, -2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[24, 6]} />
        <meshStandardMaterial color="#14080d" roughness={0.7} side={DoubleSide} />
      </mesh>
      <mesh position={[11, 2.4, -2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[24, 6]} />
        <meshStandardMaterial color="#14080d" roughness={0.7} side={DoubleSide} />
      </mesh>
    </group>
  )
}

function Ring({ at, active }: { at: [number, number, number]; active: boolean }) {
  const ref = useRef<Mesh>(null)
  useFrame((st) => {
    const m = ref.current?.material as MeshStandardMaterial | undefined
    if (m) m.emissiveIntensity = MathUtils.lerp(m.emissiveIntensity, active ? 1.4 + Math.sin(st.clock.elapsedTime * 3) * 0.3 : 0.12, 0.1)
  })
  return (
    <mesh ref={ref} position={[at[0], 0.012, at[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[at[1], at[1] + 0.07, 64]} />
      <meshStandardMaterial color="#c9a24a" emissive="#ffcf80" emissiveIntensity={0.12} metalness={1} roughness={0.3} />
    </mesh>
  )
}

function Scene({ focus, onPick, onHover }: { focus: Screen; onPick: (g: GameId) => void; onHover: (g: Screen) => void }) {
  const felt = useTexture(A('felt.png'))
  useMemo(() => {
    felt.wrapS = felt.wrapT = RepeatWrapping
    felt.colorSpace = SRGBColorSpace
    felt.anisotropy = 8
  }, [felt])
  const g = useRef<Group>(null)
  const pick = (id: GameId) => () => onPick(id)
  const over = (id: Screen) => () => onHover(id)
  return (
    <group ref={g}>
      <Room />
      <Env />
      <ambientLight intensity={0.5} color="#ffd7a8" />
      <hemisphereLight args={['#ffe2bd', '#2a0a14', 0.55]} />
      {([[-4.5, -0.4], [4.5, -0.4], [0, -3.6]] as const).map(([x, z], i) => (
        <group key={i}>
          <pointLight position={[x, 3.4, z + 0.6]} intensity={26} distance={11} decay={2} color="#ffc98a" />
        </group>
      ))}
      <pointLight position={[6.4, 2.6, -3.2]} intensity={20} distance={9} decay={2} color="#ff9fb0" />
      <pointLight position={[-6.4, 2.6, -5]} intensity={16} distance={9} decay={2} color="#ffd592" />

      <Ring at={[-4.5, 1.9, -0.4]} active={focus === 'blackjack'} />
      <Ring at={[4.5, 2.0, -0.4]} active={focus === 'poker'} />
      <Ring at={[0, 2.2, -3.6]} active={focus === 'roleta'} />
      <Ring at={[6.3, 2.5, -4.6]} active={focus === 'slots'} />

      <group onPointerOver={over('blackjack')} onPointerOut={over('lobby')}>
        <Piece name="card_table" position={[-4.5, 0, -0.4]} rotation={0.45} felt={felt} onClick={pick('blackjack')}>
          <Piece name="card_shoe" position={[-0.55, 0.86, -0.34]} rotation={0.2} scale={0.9} felt={felt} />
          <Piece name="chip_stack" position={[0.2, 0.86, 0.28]} scale={0.3} felt={felt} />
        </Piece>
      </group>
      <group onPointerOver={over('poker')} onPointerOut={over('lobby')}>
        <Piece name="poker_table" position={[4.5, 0, -0.4]} rotation={-0.4} felt={felt} onClick={pick('poker')}>
          <Piece name="chip_stack" position={[0.1, 0.74, 0.05]} scale={0.34} felt={felt} />
        </Piece>
      </group>
      <group onPointerOver={over('roleta')} onPointerOut={over('lobby')}>
        <Piece name="roulette_table" position={[0, 0, -3.6]} felt={felt} onClick={pick('roleta')} spinRotor />
      </group>
      <group onPointerOver={over('slots')} onPointerOut={over('lobby')}>
        {[4.9, 5.95, 7.0, 8.05].map((x, i) => (
          <Piece key={i} name="slot_machine" position={[x, 0, -5.4 + (i % 2) * 0.1]} rotation={-0.18 - i * 0.04} felt={felt} onClick={pick('slots')} />
        ))}
      </group>

      <Piece name="bar_counter" position={[-6.6, 0, -6.4]} felt={felt} />
      {[-7.8, -6.8, -5.8, -4.8].map((x, i) => <Piece key={i} name="bar_stool" position={[x, 0, -4.8]} rotation={i * 0.7} felt={felt} />)}
      <Piece name="bar_stool" position={[-2.6, 0, 0.9]} rotation={0.6} felt={felt} />
      <Piece name="bar_stool" position={[-6.3, 0, 0.7]} rotation={0.2} felt={felt} />
      <Piece name="bar_stool" position={[2.8, 0, 1.1]} rotation={1.1} felt={felt} />
      <Piece name="bar_stool" position={[6.5, 0, 1.0]} rotation={0.4} felt={felt} />
      {[[-9.6, -7.4], [9.6, -7.4], [-9.6, 2], [9.6, 2]].map(([x, z], i) => <Piece key={i} name="pillar" position={[x, 0, z]} felt={felt} />)}
      <Piece name="lamp_floor" position={[-9.2, 0, -2.4]} felt={felt} />
      <Piece name="lamp_floor" position={[9.2, 0, -2.4]} felt={felt} />
      <Piece name="chandelier" position={[-4.5, 4.7, -0.4]} felt={felt} />
      <Piece name="chandelier" position={[4.5, 4.7, -0.4]} felt={felt} />
      <Piece name="chandelier" position={[0, 4.9, -3.6]} scale={1.15} felt={felt} />
    </group>
  )
}

export function Lounge3D({ focus, onPick, onHover }: { focus: Screen; onPick: (g: GameId) => void; onHover: (g: Screen) => void }) {
  return (
    <Canvas
      className="cz-canvas"
      dpr={[1, 1.6]}
      camera={{ position: VIEWS.lobby.p, fov: 40, near: 0.1, far: 80 }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace, preserveDrawingBuffer: true }}
      onCreated={({ gl, scene }) => {
        gl.toneMappingExposure = 1.05
        scene.background = new Color('#0d0509')
      }}
    >
      <fog attach="fog" args={['#0d0509', 14, 30]} />
      <Suspense fallback={null}>
        <Scene focus={focus} onPick={onPick} onHover={onHover} />
        <CameraRig focus={focus} />
      </Suspense>
    </Canvas>
  )
}

PIECES.forEach((p) => useGLTF.preload(A(`${p}.glb`)))
