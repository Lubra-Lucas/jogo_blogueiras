/** Clube "Palco Neon" em 3D: palco com cabine, painéis de LED, globo, caixas, pista de dança e plateia de bonecas. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import { Color, InstancedMesh, ShaderMaterial, MathUtils, Mesh, Object3D, PerspectiveCamera, type Group, type Material, type PointLight } from 'three'
import { DEFAULT_APPEARANCE, type Appearance } from '../../../shared/appearance'
import { Character } from '../../character/Character'
import type { ClipName } from '../../character/animation/animator'
import { rng } from '../shared/competition'
import { getSpectrum, spectrumSize } from './engine'
import { live } from './controller'

const BASE = import.meta.env.BASE_URL
const url = (n: string) => `${BASE}assets/interiors/palco/${n}.glb`

/** Tira o rosa-bala dos módulos do Palco Neon: tons rosados viram violeta (clube noturno, não doceria). */
const hsl = { h: 0, s: 0, l: 0 }
const TINT = new Color(0.45, 0.62, 1.0)
function recolor(root: Object3D, dim = 1) {
  const fix = (m: Material): Material => {
    const mat = m.clone() as Material & { color?: Color; emissive?: Color }
    if (/^glow/.test(m.name) && typeof (mat as Material & { emissiveIntensity?: number }).emissiveIntensity === 'number') (mat as Material & { emissiveIntensity: number }).emissiveIntensity *= 0.55
    for (const key of ['color', 'emissive'] as const) {
      const c = mat[key]
      if (!c) continue
      if (key === 'color' && ((mat as Material & { map?: unknown }).map || (mat as Material & { emissiveMap?: unknown }).emissiveMap)) c.multiply(TINT)
      if (key === 'emissive' && (mat as Material & { emissiveMap?: unknown }).emissiveMap) c.multiply(TINT)
      c.getHSL(hsl)
      if (hsl.s > 0.12 && (hsl.h > 0.76 || hsl.h < 0.04)) c.setHSL(0.73, Math.min(1, hsl.s * 1.05), hsl.l * 0.95)
    }
    if (dim !== 1) {
      mat.color?.multiplyScalar(dim)
      mat.emissive?.multiplyScalar(dim)
    }
    return mat
  }
  root.traverse((n) => {
    const mesh = n as Mesh
    if (!mesh.isMesh) return
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(fix) : fix(mesh.material)
  })
}

function Piece({ name, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, refGroup, dim = 1 }: {
  dim?: number
  name: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  refGroup?: React.Ref<Group>
}) {
  const gltf = useGLTF(url(name))
  const obj = useMemo(() => {
    const o = gltf.scene.clone(true)
    recolor(o, dim)
    return o
  }, [gltf, dim])
  return (
    <group ref={refGroup} position={position} rotation={rotation} scale={scale}>
      <primitive object={obj} />
    </group>
  )
}

const STAGE_Z = -4.6
const STAGE_TOP = 0.615

/** Painel de LED próprio (por cima do módulo): células que piscam no ritmo, só nas cores do clube. */
function LedWall({ colors }: { colors: [string, string, string] }) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uT: { value: 0 }, uK: { value: 0 }, c0: { value: new Color() }, c1: { value: new Color() }, c2: { value: new Color() } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `varying vec2 vUv; uniform float uT; uniform float uK; uniform vec3 c0; uniform vec3 c1; uniform vec3 c2;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
          void main(){
            vec2 g = vec2(30.0, 10.0);
            vec2 id = floor(vUv * g);
            vec2 f = fract(vUv * g);
            float m = step(0.12, f.x) * step(0.12, f.y) * step(f.x, 0.88) * step(f.y, 0.88);
            float tt = floor(uT * 2.5 + id.x * 0.13);
            float r = h(id + tt);
            float on = step(0.5 - uK * 0.3, r);
            vec3 col = r < 0.66 ? c0 : (r < 0.86 ? c1 : c2);
            float wave = 0.5 + 0.5 * sin(uT * 2.0 + id.x * 0.4 + id.y * 0.7);
            vec3 base = vec3(0.015, 0.025, 0.06);
            vec3 outc = mix(base, col * (0.35 + 0.65 * wave + uK * 0.8), on * m);
            gl_FragColor = vec4(outc, 1.0);
          }`,
      }),
    [],
  )
  useFrame(({ clock }) => {
    mat.uniforms.uT.value = clock.elapsedTime
    mat.uniforms.uK.value = live.kick
    mat.uniforms.c0.value.set(colors[0])
    mat.uniforms.c1.value.set(colors[1])
    mat.uniforms.c2.value.set(colors[2])
  })
  return (
    <mesh position={[0, 1.58, STAGE_Z - 1.47]} material={mat}>
      <planeGeometry args={[6.1, 2.05]} />
    </mesh>
  )
}

function Lights({ colors }: { colors: [string, string, string] }) {
  const l0 = useRef<PointLight>(null)
  const l1 = useRef<PointLight>(null)
  const l2 = useRef<PointLight>(null)
  const c = useMemo(() => colors.map((x) => new Color(x)), [colors])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const k = live.kick
    const f = live.fever ? 1.5 : 1
    if (l0.current) {
      l0.current.color.copy(c[0])
      l0.current.intensity = (9 + k * 26) * f
      l0.current.position.set(Math.sin(t * 0.8) * 3, 3.4, -2.6)
    }
    if (l1.current) {
      l1.current.color.copy(c[1])
      l1.current.intensity = (9 + k * 22) * f
      l1.current.position.set(Math.cos(t * 0.6) * 3.2, 3, 0)
    }
    if (l2.current) {
      l2.current.color.copy(c[2])
      l2.current.intensity = (10 + k * 26) * f
      l2.current.position.set(Math.sin(t * 0.5 + 2) * 2, 2.4, -5.4)
    }
  })
  return (
    <>
      <pointLight ref={l0} distance={11} decay={1.6} />
      <pointLight ref={l1} distance={11} decay={1.6} />
      <pointLight ref={l2} distance={9} decay={1.6} />
    </>
  )
}

/** Barras de LED na frente do palco, dançando com o espectro real do áudio. */
function EqBars({ colors }: { colors: [string, string, string] }) {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const spec = useRef(new Uint8Array(64))
  const N = 28
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const t = clock.elapsedTime
    if (spec.current.length < spectrumSize()) spec.current = new Uint8Array(spectrumSize())
    const ok = getSpectrum(spec.current)
    for (let i = 0; i < N; i++) {
      const bin = Math.min(spec.current.length - 1, Math.floor((i / N) * 28))
      const v = ok ? spec.current[bin] / 255 : 0.15 + 0.1 * Math.sin(t * 2 + i)
      const hgt = 0.06 + v * 0.55 + live.kick * 0.05
      dummy.position.set((i - (N - 1) / 2) * 0.17, STAGE_TOP + hgt / 2 - 0.02, STAGE_Z + 1.5)
      dummy.scale.set(0.11, hgt, 0.08)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      m.setColorAt(i, new Color(colors[i % 3]).multiplyScalar(0.6 + v * 1.4))
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}>
      <boxGeometry />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}

/** Feixes de laser varrendo a pista. */
function Lasers({ colors, count }: { colors: [string, string, string]; count: number }) {
  const g = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    g.current?.children.forEach((ch, i) => {
      const s = (i % 2 ? 1 : -1) * (0.5 + (i % 3) * 0.2)
      ch.rotation.z = Math.sin(t * s + i) * 0.9
      ch.rotation.x = Math.cos(t * 0.7 * s + i * 2) * 0.35
      const mat = (ch as unknown as { children: { material: { opacity: number } }[] }).children[0].material
      mat.opacity = (live.fever ? 0.5 : 0.22) + live.kick * 0.25
    })
  })
  return (
    <group ref={g} position={[0, 3.4, STAGE_Z + 0.6]}>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} position={[(i - (count - 1) / 2) * 1.1, 0, 0]}>
          <mesh position={[0, -3.2, 0]}>
            <cylinderGeometry args={[0.012, 0.03, 6.4, 6, 1, true]} />
            <meshBasicMaterial color={colors[i % 3]} transparent opacity={0.3} depthWrite={false} blending={2} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const SKIN = ['#efcdbd', '#d9a98a', '#b57e5b', '#8a5a3c', '#5d3a25', '#f3d9c8']
const HAIR_ID = ['hair.meshyUpdo', 'hair.chestnutWaves', 'hair.platinumUndercut', 'hair.caramelCurls']
const HAIR_COL = ['#16141a', '#3a2417', '#816b58', '#c08a4e', '#e8dcc8', '#2a1a40', '#15233f']
const SUIT = ['#1f2a5c', '#2a2d3a', '#137a63', '#5c1f3a', '#5b3fb0', '#e8e4dc', '#0e5a73', '#7a5a1f']

function crowdAppearance(i: number): Appearance {
  const r = rng(9100 + i * 131)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  return {
    ...DEFAULT_APPEARANCE,
    skin: { tone: pick(SKIN) },
    suit: { color: pick(SUIT), finish: 'satin' },
    lips: { color: pick(['#a8566e', '#da7076', '#7a2a3a', '#c45a50']), gloss: 0.5 },
    hair: { id: pick(HAIR_ID), color: pick(HAIR_COL) },
    morphs: { bustBig: r() * 0.6, hipsWide: r() * 0.6, waistThin: r() * 0.6 },
  }
}

const HOMES: [number, number][] = [
  [0, -1.6], [-1.7, -2.2], [1.7, -2.2], [-2.9, -1.2], [2.9, -1.2], [-1.1, -0.5], [1.1, -0.5], [0, 0.2],
]
const DANCES: ClipName[] = ['dance_twerk', 'jump', 'clap', 'dance_twerk', 'wave', 'clap', 'jump', 'dance_twerk']

function CrowdDoll({ index, total }: { index: number; total: number }) {
  const appearance = useMemo(() => crowdAppearance(index), [index])
  const home = HOMES[index]
  const side = index % 2 ? 1 : -1
  const exit: [number, number] = [side * 6.4, 2.6]
  const g = useRef<Group>(null)
  const present = useRef(false)
  const [clip, setClip] = useState<ClipName>('idle')
  const moving = useRef(false)

  useFrame((_, dt) => {
    const node = g.current
    if (!node) return
    const want = index < Math.round(live.energySmooth * (total + 0.4))
    const target = want ? home : exit
    const dx = target[0] - node.position.x
    const dz = target[1] - node.position.z
    const d = Math.hypot(dx, dz)
    const mv = d > 0.06
    if (mv) {
      const step = Math.min(d, dt * 1.5)
      node.position.x += (dx / d) * step
      node.position.z += (dz / d) * step
      node.rotation.y = MathUtils.lerp(node.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 8))
    } else {
      node.rotation.y = MathUtils.lerp(node.rotation.y, Math.PI + Math.sin(index) * 0.25, Math.min(1, dt * 5))
    }
    present.current = want
    node.visible = want || mv
    if (mv !== moving.current) {
      moving.current = mv
      setClip(mv ? 'walk_normal' : DANCES[index % DANCES.length])
    }
  })
  useEffect(() => {
    setClip(DANCES[index % DANCES.length])
  }, [index])

  // começa já na pista se a energia inicial a chama
  const startsIn = index < Math.round(0.3 * (total + 0.4))
  return (
    <group ref={g} position={[startsIn ? home[0] : exit[0], 0, startsIn ? home[1] : exit[1]]} rotation={[0, Math.PI, 0]} visible={startsIn}>
      <Character appearance={appearance} anim={{ clip }} />
    </group>
  )
}

function Rig() {
  const { camera, size } = useThree()
  useFrame(({ clock }) => {
    const cam = camera as PerspectiveCamera
    const portrait = size.width / size.height < 0.9
    const t = clock.elapsedTime
    cam.fov = portrait ? 66 : 44
    cam.position.set(Math.sin(t * 0.25) * 0.5, (portrait ? 3.1 : 2.9) - live.kick * 0.03, portrait ? 4.9 : 3.9)
    cam.lookAt(0, portrait ? 1.9 : 1.15, STAGE_Z + 1.2)
    cam.updateProjectionMatrix()
  })
  return null
}

function Dj({ app }: { app: Appearance }) {
  const [clip, setClip] = useState<ClipName>('idle')
  const last = useRef(false)
  useFrame(() => {
    if (live.fever !== last.current) {
      last.current = live.fever
      setClip(live.fever ? 'dance_twerk' : 'idle')
    }
  })
  return (
    <group position={[0, STAGE_TOP, STAGE_Z - 0.75]}>
      <Character appearance={app} anim={{ clip }} />
    </group>
  )
}
export function DjScene3D({ crowdMax, appearance, colors }: { crowdMax: number; appearance: Appearance; colors: [string, string, string] }) {
  const ball = useRef<Group>(null)
  const spk = useRef<Group[]>([])
  useFrame(({ clock }) => {
    if (ball.current) ball.current.rotation.y = clock.elapsedTime * 0.5
    spk.current.forEach((s) => s && s.scale.setScalar(1 + live.kick * 0.035))
  })
  return (
    <>
      <color attach="background" args={['#05060d']} />
      <fog attach="fog" args={['#05060d', 9, 22]} />
      <ambientLight intensity={0.35} color="#8aa0ff" />
      <Environment resolution={128} frames={1} background={false} environmentIntensity={0.4}>
        <Lightformer form="rect" intensity={3} color="#34e0ff" position={[-6, 3, 0]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={3} color="#8f6bff" position={[6, 3, 0]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={2} color="#ffb340" position={[0, 5, 4]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} />
        <Lightformer form="ring" intensity={2} color="#ffffff" position={[0, 3, -8]} scale={4} />
      </Environment>
      <Rig />
      <Lights colors={colors} />

      {/* piso */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, -2]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0a0d18" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* pista de dança 3 x 2 ladrilhos */}
      {[-2, 0, 2].flatMap((x) => [-1.7, 0.3].map((z) => <Piece key={`${x}${z}`} name="floor_dance_grid" position={[x, 0, z]} dim={0.5} />))}

      {/* palco */}
      <Piece name="stage_platform_4m" position={[0, 0, STAGE_Z]} />
      <Piece name="dj_booth_neon" position={[0, STAGE_TOP, STAGE_Z - 0.1]} />
      <Dj app={appearance} />
      {[-1.03 * 2, 0, 1.03 * 2].map((x) => (
        <Piece key={x} name="led_wall_panel_2m" position={[x, -0.3, STAGE_Z - 1.55]} />
      ))}
      <LedWall colors={colors} />
      <Piece name="truss_lights_rig" position={[0, 3.55, STAGE_Z + 0.2]} />
      <Piece name="speaker_stack_neon" position={[-2.9, STAGE_TOP, STAGE_Z - 0.2]} refGroup={(r) => void (r && (spk.current[0] = r))} />
      <Piece name="speaker_stack_neon" position={[2.9, STAGE_TOP, STAGE_Z - 0.2]} refGroup={(r) => void (r && (spk.current[1] = r))} />
      <Piece name="disco_ball_mirrored" position={[0, 4.4, -1.6]} refGroup={ball} />
      <Piece name="bar_counter_neon" position={[-5.2, 0, -1.6]} rotation={[0, Math.PI / 2, 0]} />
      <Piece name="sofa_lounge_curved" position={[5.1, 0, -1.4]} rotation={[0, -Math.PI / 2, 0]} />
      <Piece name="table_lounge_glow" position={[4.1, 0, -1.4]} />

      <EqBars colors={colors} />
      <Lasers colors={colors} count={crowdMax > 4 ? 7 : 4} />

      {Array.from({ length: crowdMax }, (_, i) => (
        <CrowdDoll key={i} index={i} total={crowdMax} />
      ))}
    </>
  )
}

for (const n of ['floor_dance_grid', 'stage_platform_4m', 'dj_booth_neon', 'led_wall_panel_2m', 'truss_lights_rig', 'speaker_stack_neon', 'disco_ball_mirrored', 'bar_counter_neon', 'sofa_lounge_curved', 'table_lounge_glow']) {
  useGLTF.preload(url(n))
}
