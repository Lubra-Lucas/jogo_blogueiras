import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import { AnimationClip, AnimationMixer, Box3, Color, MeshStandardMaterial, NoColorSpace, PerspectiveCamera, TextureLoader, Vector3, type Bone, type Group, type SkinnedMesh } from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { DEFAULT_APPEARANCE } from '../../shared/appearance'
import { Character } from './Character'
import { CORE_URL } from './animation/animator'
import { createMaleMaterial, type MaleBodyMaterial } from './maleMaterial'
import { DEFAULT_MALE_FACE, mergeFace, preloadKit, type MaleFace } from './maleFace'

/**
 * Tela de teste do rosto masculino por camadas (`?maletest=1`). Parametros:
 *   scene=grid|six|doll|swap|skin   (grid: corpo inteiro, 6 rostos + a boneca; six: so cabecas; doll: rosto "perto da boneca" ao lado da boneca;
 *                                    swap: o mesmo rosto com os 3 estilos de olho; skin: textura original do Meshy x pele limpa)
 *   view=front|q34 (rosto de frente ou 3/4)   t=<s> (congela o idle)   cam=<distancia>  fov=<graus>  w/h do viewport vem da janela
 * Hips da animacao escalado por hipsHeight/0.8436 (a trilha e absoluta, em metros da boneca): `window.__maletest` traz o ponto mais baixo (deve ser ~0).
 */
export const MALETEST = new URLSearchParams(window.location.search).has('maletest')
const Q = new URLSearchParams(window.location.search)
const BASE = import.meta.env.BASE_URL
const MALE_GLB = `${BASE}assets/characters/male/male_base.glb`
const MASK_URL = `${BASE}assets/characters/male/male_mask.png`
const ORIG_GLB = `${BASE}assets/characters/male/_orig_tex.glb`
const DOLL_HIPS = 0.8436

interface Spec {
  name: string
  skin: string
  suit: string
  face: MaleFace
}
const F = (p: Parameters<typeof mergeFace>[1]) => mergeFace(DEFAULT_MALE_FACE, p)

const SIX: Spec[] = [
  { name: 'Executivo', skin: '#d8a688', suit: '#2a4fa8', face: F({ eye: { style: 'natural', lash: 'natural', iris: '#6b4a32', scale: 1.2 }, brow: { style: 'thick', color: '#3e2c22' }, mouth: { style: 'natural', color: '#b06a62', gloss: 0.15 } }) },
  { name: 'Esportista', skin: '#9b6a48', suit: '#1f6f5c', face: F({ eye: { style: 'almond', lash: 'none', iris: '#3f6b3f', scale: 1.25, tilt: 3 }, brow: { style: 'arched', color: '#2a1d16', tilt: 3 }, mouth: { style: 'thin', color: '#8a5048', gloss: 0 } }) },
  { name: 'Jovem', skin: '#f0c9b2', suit: '#8a2f4f', face: F({ eye: { style: 'natural', lash: 'natural', iris: '#4e86b8', scale: 1.3, gap: 0.002 }, brow: { style: 'thin', color: '#8a6a4a', gap: 0.002 }, mouth: { style: 'natural', color: '#c97c78', gloss: 0.3 } }) },
  { name: 'Intenso', skin: '#6d4130', suit: '#222831', face: F({ eye: { style: 'almond', lash: 'natural', iris: '#4a4a46', scale: 1.15, gap: -0.003, tilt: -3, y: -0.001 }, brow: { style: 'thick', color: '#1c1512', tilt: -4, y: -0.002 }, mouth: { style: 'thin', color: '#6a3e38', gloss: 0.05 } }) },
  { name: 'Suave', skin: '#e8b898', suit: '#6a5aa8', face: F({ eye: { style: 'doll', lash: 'natural', iris: '#8a6a3a', scale: 0.8, gap: 0.001, y: -0.001 }, brow: { style: 'arched', color: '#6a4a32', opacity: 0.8 }, mouth: { style: 'natural', color: '#c8756c', gloss: 0.55 }, blush: { amount: 0.25, scale: 0.9 } }) },
  { name: 'Maduro', skin: '#bb8765', suit: '#7a7a72', face: F({ eye: { style: 'natural', lash: 'none', iris: '#5a5048', scale: 1.05, gap: -0.002, y: -0.001, tilt: -2, linerAmt: 0.5 }, brow: { style: 'thick', color: '#6a6a66', scale: 1.1, y: -0.003, tilt: -2 }, mouth: { style: 'thin', color: '#8e5a52', gloss: 0 } }) },
]

/** Combinacao que chega o mais perto possivel do visual da boneca: olhos grandes e afastados, cilios de boneca, boca glossy, blush. */
export const DOLLISH: Spec = {
  name: 'Visual de boneca',
  skin: '#f3d2c2',
  suit: '#2a4fa8',
  face: F({
    eye: { style: 'doll', lash: 'doll', iris: '#5aa0d6', liner: '#1c1618', lashColor: '#1a1416', scale: 1.4, gap: 0.0085, y: 0.0015, tilt: 2, linerAmt: 1 },
    brow: { style: 'arched', color: '#7a5a42', opacity: 0.85, gap: 0.0045, y: 0.004, tilt: 4, scale: 0.95 },
    mouth: { style: 'doll', color: '#e0707c', gloss: 1, scale: 1.05, y: 0.001, opacity: 0.95 },
    blush: { amount: 0.55, color: '#f08a96', scale: 1.15, y: -0.002 },
  }),
}

function useRig(face: MaleFace, skin: string, suit: string, bare: boolean) {
  const gltf = useGLTF(MALE_GLB)
  const coreGltf = useGLTF(CORE_URL)
  const mask = useMemo(() => {
    const t = new TextureLoader().load(MASK_URL)
    t.flipY = false
    t.colorSpace = NoColorSpace
    t.anisotropy = 8
    return t
  }, [])
  const rig = useMemo(() => {
    const root = cloneSkinned(gltf.scene) as Group
    let body: SkinnedMesh | undefined
    const bones: Record<string, Bone> = {}
    root.traverse((o) => {
      if ((o as SkinnedMesh).isSkinnedMesh) body = o as SkinnedMesh
      if ((o as Bone).isBone) bones[o.name] = o as Bone
    })
    const map = (body!.material as MeshStandardMaterial).map
    const mat: MaleBodyMaterial = createMaleMaterial(map, mask, face)
    body!.material = mat.material
    body!.frustumCulled = false
    return { root, body: body!, bones, mat }
  }, [gltf, mask]) // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    rig.mat.setFace(face)
    rig.mat.setLook(skin, suit)
    rig.mat.uniforms.uFaceOn.value = bare ? 0 : 1
  }, [rig, face, skin, suit, bare])
  // animacao: idle do Mixamo, Hips escalado pela altura do quadril masculino
  const mixer = useMemo(() => {
    const m = new AnimationMixer(rig.root)
    const src = coreGltf.animations.find((a) => a.name === 'idle')!
    const clip: AnimationClip = src.clone()
    const hips = rig.bones.mixamorigHips
    const ratio = hips.position.y / DOLL_HIPS
    for (const tr of clip.tracks) if (tr.name === 'mixamorigHips.position') for (let i = 0; i < tr.values.length; i++) tr.values[i] *= ratio
    if (!REST) m.clipAction(clip).play()
    return m
  }, [rig, coreGltf])
  return { rig, mixer }
}

const T = Q.get('t') !== null ? Number(Q.get('t')) : 2.0
const REST = Q.get('rest') === '1'
const ONLY = Q.get('only') !== null ? Number(Q.get('only')) : -1

function Male({ spec, x, yaw, bare = false, report }: { spec: Spec; x: number; yaw: number; bare?: boolean; report?: boolean }) {
  const { rig, mixer } = useRig(spec.face, spec.skin, spec.suit, bare)
  const frames = useRef(0)
  useFrame(() => {
    if (!REST) mixer.setTime(T)
    else mixer.setTime(0)
    if (!report) return
    frames.current++
    if (frames.current !== 6) return
    rig.root.updateWorldMatrix(true, true)
    rig.body.skeleton.update()
    const v = new Vector3()
    let minY = Infinity
    let maxY = -Infinity
    const pos = rig.body.geometry.getAttribute('position')
    for (let k = 0; k < pos.count; k++) {
      rig.body.getVertexPosition(k, v)
      v.applyMatrix4(rig.body.matrixWorld)
      minY = Math.min(minY, v.y)
      maxY = Math.max(maxY, v.y)
    }
    const hp = new Vector3()
    rig.bones.mixamorigHips.getWorldPosition(hp)
    const rep = { minY: +minY.toFixed(4), maxY: +maxY.toFixed(3), hipsY: +hp.y.toFixed(3) }
    ;(window as unknown as { __maletest: unknown }).__maletest = rep
    console.info('[MALETEST]', JSON.stringify(rep))
  })
  return (
    <group position={[x, 0, 0]} rotation={[0, yaw, 0]}>
      <primitive object={rig.root} />
    </group>
  )
}

/** Boneca atual (para comparar), com o idle do jogo. */
function Doll({ x, yaw, dy = 0 }: { x: number; yaw: number; dy?: number }) {
  return (
    <group position={[x, dy, 0]} rotation={[0, yaw, 0]}>
      <Suspense fallback={null}>
        <Character appearance={DEFAULT_APPEARANCE} anim={REST ? undefined : { clip: 'idle', t: T }} />
      </Suspense>
    </group>
  )
}

/** Modelo texturizado ORIGINAL do Meshy (so para a comparacao "antes x depois" da pele). Copiado para public/ so durante a captura. */
function OriginalMeshy({ x, yaw }: { x: number; yaw: number }) {
  const gltf = useGLTF(ORIG_GLB)
  const obj = useMemo(() => gltf.scene.clone(true), [gltf])
  const k = 1.75 / 0.9497
  const box = useMemo(() => new Box3().setFromObject(obj), [obj])
  return (
    <group position={[x, 0, 0]} rotation={[0, yaw, 0]}>
      <group scale={k} position={[0, -box.min.y * k, 0]}>
        <primitive object={obj} />
      </group>
    </group>
  )
}

function Cam({ target, dist, fov, yaw = 0 }: { target: [number, number, number]; dist: number; fov: number; yaw?: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  useEffect(() => {
    camera.fov = fov
    camera.near = 0.05
    camera.far = 80
    camera.position.set(target[0] + Math.sin(yaw) * dist, target[1], target[2] + Math.cos(yaw) * dist)
    camera.lookAt(target[0], target[1], target[2])
    camera.updateProjectionMatrix()
    document.querySelectorAll<HTMLElement>('.ui-layer').forEach((e) => (e.style.display = 'none'))
  }, [camera, target, dist, fov, yaw])
  return null
}

function Lights() {
  return (
    <>
      <color attach="background" args={['#e9e4f1']} />
      <Environment resolution={128} frames={1} background={false} environmentIntensity={0.6}>
        <Lightformer form="rect" intensity={2.4} color="#ffffff" position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[14, 14, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#fff0e0" position={[6, 2, 4]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#dde6ff" position={[-6, 2, 4]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#ffffff" position={[0, 2, 8]} rotation-y={Math.PI} scale={[12, 5, 1]} />
      </Environment>
      <hemisphereLight args={['#fff4ea', '#c9c0e8', 0.6]} />
      <directionalLight position={[2.5, 5, 6]} intensity={1.5} color="#fff1e4" />
    </>
  )
}

export function MaleTest() {
  const scene = Q.get('scene') ?? 'grid'
  const view = Q.get('view') ?? 'front'
  const yaw = view === 'q34' ? 0.6 : 0
  const fov = Number(Q.get('fov')) || 8
  useEffect(() => preloadKit(), [])
  useEffect(() => {
    document.querySelectorAll<HTMLElement>('.ui-layer').forEach((e) => (e.style.display = 'none'))
  }, [])
  const floor = (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#d8d2e4" roughness={1} />
    </mesh>
  )
  const rowX = (i: number, n: number, gap: number) => (i - (n - 1) / 2) * gap

  let content: React.ReactNode
  if (scene === 'grid') {
    const n = SIX.length + 2
    content = (
      <>
        <Cam target={[0, 0.88, 0]} dist={Number(Q.get('cam')) || 10} fov={Number(Q.get('fov')) || 21} />
        {SIX.map((s, i) => (
          <Male key={s.name} spec={s} x={rowX(i, n, 1.2)} yaw={0} report={i === 0} />
        ))}
        <Male spec={DOLLISH} x={rowX(6, n, 1.2)} yaw={0} />
        <Doll x={rowX(7, n, 1.2)} yaw={0} />
        {floor}
      </>
    )
  } else if (scene === 'six') {
    const d = Number(Q.get('cam')) || 6
    content = (
      <>
        <Cam target={[0, 1.54, 0]} dist={d} fov={fov} />
        {SIX.map((s, i) => (ONLY >= 0 && ONLY !== i ? null : <Male key={s.name} spec={s} x={ONLY >= 0 ? 0 : rowX(i, 6, 0.4)} yaw={view === 'q34' ? 0.5 : 0} />))}
      </>
    )
  } else if (scene === 'doll') {
    const d = Number(Q.get('cam')) || 5
    content = (
      <>
        <Cam target={[0, 1.55, 0]} dist={d} fov={fov} />
        <Doll x={-0.3} yaw={yaw * 0.8} dy={0.2} />
        <Male spec={DOLLISH} x={0.3} yaw={yaw * 0.8} />
      </>
    )
  } else if (scene === 'swap') {
    const d = Number(Q.get('cam')) || 5
    const base = DOLLISH.face
    const three = (['natural', 'almond', 'doll'] as const).map((st) => ({ ...DOLLISH, name: st, face: mergeFace(base, { eye: { style: st, scale: st === 'doll' ? 1.4 : 1.4, gap: st === 'doll' ? 0.0085 : 0.003 }, blush: { amount: 0.25 } }) }))
    content = (
      <>
        <Cam target={[0, 1.55, 0]} dist={d} fov={fov} />
        {three.map((s, i) => (
          <Male key={s.name} spec={{ ...s, face: mergeFace(s.face, { mouth: { style: 'natural', gloss: 0.3 }, brow: { style: 'thick' }, eye: { lash: 'natural', iris: '#4e86b8' } }) }} x={rowX(i, 3, 0.4)} yaw={view === 'q34' ? 0.5 : 0} />
        ))}
      </>
    )
  } else {
    // skin: original do Meshy x pele limpa (sem camadas) x pele limpa com um rosto
    const d = Number(Q.get('cam')) || 5
    content = (
      <>
        <Cam target={[0, 1.55, 0]} dist={d} fov={fov} />
        <Suspense fallback={null}>
          <OriginalMeshy x={-0.3} yaw={view === 'q34' ? 0.5 : 0} />
        </Suspense>
        <Male spec={SIX[0]} x={0.3} yaw={view === 'q34' ? 0.5 : 0} bare />
      </>
    )
  }
  return (
    <>
      <Lights />
      <Suspense fallback={null}>{content}</Suspense>
    </>
  )
}

// evita aviso de import nao usado quando so alguns cenarios usam
void Color
