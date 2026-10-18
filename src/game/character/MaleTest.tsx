import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import { AnimationClip, AnimationMixer, Box3, NoColorSpace, Plane, TextureLoader, Vector3, type Bone, type Group, type MeshStandardMaterial, type PerspectiveCamera, type SkinnedMesh } from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { DEFAULT_APPEARANCE, type Appearance } from '../../shared/appearance'
import { randomAppearance } from '../../shared/randomAppearance'
import { BEARD_STYLES, BROW_STYLES, CONTOUR_STYLES, EYE_STYLES, FRECKLE_STYLES, LASH_STYLES, MOUTH_STYLES, NOSE_STYLES, PAINT_STYLES, forGender, type StyleOpt } from '../../shared/faceLayers'
import { KIT_CONTOUR, KIT_FRECKLES, KIT_NOSE, KIT_PAINT } from '../../shared/faceKit.generated'
import { Character } from './Character'
import { CORE_URL } from './animation/animator'
import { createMaleMaterial, type MaleBodyMaterial } from './maleMaterial'
import { DEFAULT_MALE_FACE, mergeFace, preloadKit, type MaleFace } from './maleFace'
import { attachMaleHair, maleHairUrl, MALE_HAIRS, type MaleHairId } from './maleHair'
import { DOLL_REPLICA, DOLLISH, FEM_SIX, SHAPE_MORPHS, SIX, TWELVE, type FemLook, type MaleLook } from './maleLooks'

/**
 * Tela de teste do masculino (`?maletest=1`): rosto por camadas + formato (morphs f_*) + cabelo curto. Parametros:
 *   scene=grid     corpo inteiro: 6 looks + visual de boneca + a boneca atual (idle; pes no chao com o fix do Hips)
 *   scene=sheet    um rosto da folha de 12 (only=0..11, view=front|q34); close
 *   scene=morphs   um morph de formato (morph=f_jawWide) em 0, 0.5 e 1, sem camadas, de frente e 3/4
 *   scene=hair     os 3 cabelos em 2 cores, de frente (view=front|q34)
 *   scene=six|doll|swap|skin   etapa anterior
 *   rest=1 (pose de repouso)   t=<s>   cam=<distancia> fov=<graus>
 * Hips da animacao escalado por hipsHeight/0.8436 (a trilha e absoluta, em metros da boneca): `window.__maletest` traz o ponto mais baixo (~0).
 */
export const MALETEST = new URLSearchParams(window.location.search).has('maletest')
const Q = new URLSearchParams(window.location.search)
const BASE = import.meta.env.BASE_URL
const MALE_GLB = `${BASE}assets/characters/male/male_base.glb`
const MASK_URL = `${BASE}assets/characters/male/male_mask.png`
const ORIG_GLB = `${BASE}assets/characters/male/_orig_tex.glb`
const DOLL_HIPS = 0.8436
const T = Q.get('t') !== null ? Number(Q.get('t')) : 2.0
const REST = Q.get('rest') === '1'
const ONLY = Q.get('only') !== null ? Number(Q.get('only')) : -1

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
    rig.mat.uniforms.uFlFaceOn.value = bare ? 0 : 1
  }, [rig, face, skin, suit, bare])
  const mixer = useMemo(() => {
    const m = new AnimationMixer(rig.root)
    const src = coreGltf.animations.find((a) => a.name === 'idle')!
    const clip: AnimationClip = src.clone()
    const ratio = rig.bones.mixamorigHips.position.y / DOLL_HIPS
    for (const tr of clip.tracks) if (tr.name === 'mixamorigHips.position') for (let i = 0; i < tr.values.length; i++) tr.values[i] *= ratio
    if (!REST) m.clipAction(clip).play()
    return m
  }, [rig, coreGltf])
  return { rig, mixer }
}

function HairAttach({ rig, id, color, gloss }: { rig: ReturnType<typeof useRig>['rig']; id: MaleHairId; color: string; gloss?: number }) {
  const gltf = useGLTF(maleHairUrl(id))
  const att = useMemo(() => attachMaleHair(gltf.scene as Group, rig.bones, rig.root, color, gloss), [gltf, rig]) // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    att.material.color.set(color)
    att.material.sheenColor.set(color).lerp(att.material.color.clone().set('#ffffff'), 0.3)
  }, [att, color])
  useLayoutEffect(() => () => att.dispose(), [att])
  return null
}

interface MaleProps {
  look: MaleLook
  x?: number
  dy?: number
  yaw?: number
  bare?: boolean
  report?: boolean
  /** corta o corpo abaixo do pescoco (cabecas flutuantes para folhas) */
  cut?: boolean
  /** substitui os morphs do look (morph=peso); sem f_maleBase por padrao */
  shape?: Record<string, number>
  noHair?: boolean
}

function Male({ look, x = 0, dy = 0, yaw = 0, bare = false, report = false, cut = false, shape, noHair = false }: MaleProps) {
  const { rig, mixer } = useRig(look.face, look.skin, look.suit, bare)
  const gl = useThree((s) => s.gl)
  const frames = useRef(0)
  const weights = useMemo(() => shape ?? { f_maleBase: 1, ...look.shape }, [shape, look])
  useLayoutEffect(() => {
    const dict = rig.body.morphTargetDictionary ?? {}
    const inf = rig.body.morphTargetInfluences
    if (!inf) return
    inf.fill(0)
    for (const [k, v] of Object.entries(weights)) if (dict[k] !== undefined) inf[dict[k]] = v
  }, [rig, weights])
  useLayoutEffect(() => {
    if (cut) {
      gl.localClippingEnabled = true
      rig.mat.material.clippingPlanes = [new Plane(new Vector3(0, 1, 0), -(1.335 + dy))]
      rig.mat.material.needsUpdate = true
    }
  }, [cut, dy, gl, rig])
  useFrame(() => {
    mixer.setTime(REST ? 0 : T)
    if (!report) return
    frames.current++
    if (frames.current !== 6) return
    rig.root.updateWorldMatrix(true, true)
    rig.body.skeleton.update()
    const v = new Vector3()
    let minY = Infinity
    const pos = rig.body.geometry.getAttribute('position')
    for (let k = 0; k < pos.count; k++) {
      rig.body.getVertexPosition(k, v)
      v.applyMatrix4(rig.body.matrixWorld)
      minY = Math.min(minY, v.y)
    }
    const hp = new Vector3()
    rig.bones.mixamorigHips.getWorldPosition(hp)
    const rep = { minY: +minY.toFixed(4), hipsY: +hp.y.toFixed(3), morphs: Object.keys(rig.body.morphTargetDictionary ?? {}).length }
    ;(window as unknown as { __maletest: unknown }).__maletest = rep
    console.info('[MALETEST]', JSON.stringify(rep))
  })
  return (
    <group position={[x, dy, 0]} rotation={[0, yaw, 0]}>
      <primitive object={rig.root} />
      {look.hair && !noHair && (
        <Suspense fallback={null}>
          <HairAttach rig={rig} id={look.hair.id.replace('hair.m.', '') as MaleHairId} color={look.hair.color} gloss={look.hair.gloss} />
        </Suspense>
      )}
    </group>
  )
}

function Doll({ x, yaw, dy = 0 }: { x: number; yaw: number; dy?: number }) {
  return (
    <group position={[x, dy, 0]} rotation={[0, yaw, 0]}>
      <Suspense fallback={null}>
        <Character appearance={DEFAULT_APPEARANCE} anim={REST ? undefined : { clip: 'idle', t: T }} />
      </Suspense>
    </group>
  )
}


/** Boneca NOVA: doll_layers.glb (rosto limpo) + camadas; e o mesmo Character (cabelo, roupas, morphs), so com o corpo trocado. */
function DollNew({ x, yaw, dy = 0, look = DOLL_REPLICA, outfit }: { x: number; yaw: number; dy?: number; look?: FemLook; outfit?: Appearance['outfit'] }) {
  const app = useMemo<Appearance>(
    () => ({ ...DEFAULT_APPEARANCE, skin: { ...DEFAULT_APPEARANCE.skin, tone: look.skin }, hair: { ...DEFAULT_APPEARANCE.hair, id: look.hair.id, color: look.hair.color }, faceLayers: look.face, shape: look.shape, ...(outfit ? { outfit } : {}) }),
    [look, outfit],
  )
  return (
    <group position={[x, dy, 0]} rotation={[0, yaw, 0]}>
      <Suspense fallback={null}>
        <Character appearance={app} anim={REST ? undefined : { clip: 'idle', t: T }} />
      </Suspense>
    </group>
  )
}

function MixRand({ seed, gender, x, yaw }: { seed: string; gender: 'female' | 'male' | 'any'; x: number; yaw: number }) {
  const app = useMemo(() => randomAppearance(seed, { gender }), [seed, gender])
  return (
    <group position={[x, 0, 0]} rotation={[0, yaw, 0]}>
      <Suspense fallback={null}>
        <Character appearance={app} anim={REST ? undefined : { clip: 'idle', t: T }} />
      </Suspense>
    </group>
  )
}

function MixChar({ seed, gender, x }: { seed: string; gender: 'female' | 'male'; x: number }) {
  const app = useMemo(() => randomAppearance(seed, { gender, profile: 'npc' }), [seed, gender])
  return (
    <group position={[x, 0, 0]}>
      <Suspense fallback={null}>
        <Character appearance={app} anim={REST ? undefined : { clip: 'idle', t: T }} />
      </Suspense>
    </group>
  )
}

/** Modelo texturizado ORIGINAL do Meshy (so para a comparacao "antes x depois" da pele; arquivo copiado para public/ so durante a captura). */
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

function Cam({ target, dist, fov }: { target: [number, number, number]; dist: number; fov: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  useEffect(() => {
    camera.fov = fov
    camera.near = 0.05
    camera.far = 80
    camera.position.set(target[0], target[1], target[2] + dist)
    camera.lookAt(target[0], target[1], target[2])
    camera.updateProjectionMatrix()
    document.querySelectorAll<HTMLElement>('.ui-layer').forEach((e) => (e.style.display = 'none'))
  }, [camera, target, dist, fov])
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

const rowX = (i: number, n: number, gap: number) => (i - (n - 1) / 2) * gap
const CLAY: MaleLook = { name: 'clay', skin: '#d9baa6', suit: '#2a4fa8', face: DEFAULT_MALE_FACE, shape: {}, hair: null }

export function MaleTest() {
  const scene = Q.get('scene') ?? 'grid'
  const view = Q.get('view') ?? 'front'
  const yaw34 = view === 'q34' ? 0.5 : view === 'side' ? 1.45 : 0
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

  let content: React.ReactNode
  if (scene === 'grid') {
    const looks = [...SIX.slice(0, 5), TWELVE[7], DOLLISH]
    const n = looks.length + 1
    content = (
      <>
        <Cam target={[0, 0.88, 0]} dist={Number(Q.get('cam')) || 10} fov={Number(Q.get('fov')) || 21} />
        {looks.map((s, i) => (
          <Male key={s.name + i} look={s} x={rowX(i, n, 1.2)} report={i === 0} />
        ))}
        <Doll x={rowX(looks.length, n, 1.2)} yaw={0} />
        {floor}
      </>
    )
  } else if (scene === 'sheet') {
    const i = Math.max(0, ONLY)
    content = (
      <>
        <Cam target={[0, 1.55, 0]} dist={Number(Q.get('cam')) || 3} fov={Number(Q.get('fov')) || 7} />
        <Male look={TWELVE[i]} yaw={yaw34} />
      </>
    )
  } else if (scene === 'cat') {
    // folha de estilos de uma categoria (cat=eyes|lashes|brows|mouths|beards|nose|freckles|contour|paint, g=male|female, from, count)
    const cat = Q.get('cat') ?? 'eyes'
    const fem = Q.get('g') === 'female'
    const lists: Record<string, StyleOpt[]> = { eyes: EYE_STYLES, lashes: LASH_STYLES, brows: BROW_STYLES, mouths: MOUTH_STYLES, beards: BEARD_STYLES, nose: NOSE_STYLES, freckles: FRECKLE_STYLES, contour: CONTOUR_STYLES, paint: PAINT_STYLES }
    const all = forGender(lists[cat], fem ? 'female' : 'male').filter((x) => !x.hidden || cat === 'eyes').filter((x) => x.id !== 'none')
    const from = Number(Q.get('from') ?? 0)
    const count = Number(Q.get('count') ?? 7)
    const items = all.slice(from, from + count)
    const baseFace = fem ? FEM_SIX[1].face : mergeFace(TWELVE[2].face, { beard: { style: 'none' } })
    const meta: Record<string, { k: string; amt?: number; col?: string }> = {
      nose: { k: 'nose', amt: 0.9 }, freckles: { k: 'freckles', amt: 0.9 }, contour: { k: 'contour', amt: 0.9 }, paint: { k: 'paint', amt: 1 },
    }
    const colorOf2 = (l: Array<{ id: string; color?: string }>, id: string) => l.find((x) => x.id === id)?.color
    const lookFor = (it: StyleOpt): MaleLook & FemLook => {
      let face = baseFace
      if (cat === 'eyes') face = mergeFace(baseFace, { eye: { style: it.id, lash: it.id === 'classic' ? 'classic' : baseFace.eye.lash === 'classic' ? 'natural' : baseFace.eye.lash } })
      else if (cat === 'lashes') face = mergeFace(baseFace, { eye: { lash: it.id, lashColor: it.group === 'fun' ? '#ffffff' : baseFace.eye.lashColor } })
      else if (cat === 'brows') face = mergeFace(baseFace, { brow: { style: it.id, color: it.group === 'fun' ? '#ffffff' : baseFace.brow.color, opacity: 1 } })
      else if (cat === 'mouths') face = mergeFace(baseFace, { mouth: { style: it.id, opacity: 1 } })
      else if (cat === 'beards') face = mergeFace(baseFace, { beard: { style: it.id, color: '#3a2a20' } })
      else {
        const m = meta[cat]; const src = cat === 'nose' ? KIT_NOSE : cat === 'freckles' ? KIT_FRECKLES : cat === 'contour' ? KIT_CONTOUR : KIT_PAINT
        face = mergeFace(baseFace, { extras: { [m.k]: { style: it.id, amount: m.amt ?? 0.8, color: colorOf2(src, it.id) ?? '#8a5a48' } } as never })
      }
      return { name: it.label, skin: fem ? '#f0cdb8' : '#e3b08f', suit: '#2a4fa8', face, shape: {}, hair: null as never }
    }
    content = (
      <>
        <Cam target={[0, fem ? 1.4 : 1.57, 0]} dist={Number(Q.get('cam')) || 5} fov={Number(Q.get('fov')) || 8} />
        {items.map((it, i) => {
          const lk = lookFor(it)
          return fem ? (
            <DollNew key={it.id} x={rowX(i, count, 0.34)} yaw={yaw34} look={{ ...lk, hair: { id: null as unknown as string, color: '#000' } }} />
          ) : (
            <Male key={it.id} look={lk} x={rowX(i, count, 0.34)} yaw={yaw34} shape={{ f_maleBase: 1 }} cut noHair />
          )
        })}
      </>
    )
  } else if (scene === 'fun8') {
    // 8 rostos extravagantes (4 femininos, 4 masculinos) montados so com camadas
    const base = (fem: boolean) => (fem ? FEM_SIX[1].face : mergeFace(TWELVE[2].face, { beard: { style: 'none' } }))
    const mk = (fem: boolean, name: string, skin: string, patch: Parameters<typeof mergeFace>[1], hairColor: string): MaleLook & FemLook => ({ name, skin, suit: '#2a4fa8', face: mergeFace(base(fem), patch), shape: fem ? {} : { f_maleBase: 1 }, hair: { id: fem ? 'hair.meshyUpdo' : 'hair.m.quiff', color: hairColor } as never })
    const F4 = [
      mk(true, 'Coracao', '#f3d2c2', { eye: { style: 'heart', lash: 'rainbow', iris: '#ff5f9f', lashColor: '#ffffff', scale: 1.15 }, brow: { style: 'glitter', color: '#ffffff' }, mouth: { style: 'classic', color: '#ff3d8a', gloss: 1 }, extras: { paint: { style: 'hearts', amount: 1, color: '#ff6f9f' }, freckles: { style: 'hearts', amount: 0.9, color: '#e8607f' } }, blush: { amount: 1, shade: true } }, '#f283ad'),
      mk(true, 'Estrela', '#e6b896', { eye: { style: 'star', lash: 'glitter', iris: '#ffd45a', lashColor: '#ffffff', scale: 1.15 }, brow: { style: 'dots', color: '#6a3fb0' }, mouth: { style: 'twotone', color: '#7a3fd0', color2: '#ff6fb0', gloss: 1 }, extras: { paint: { style: 'eyestars', amount: 1, color: '#c79bff' }, freckles: { style: 'stars', amount: 0.9, color: '#e8b43a' } } }, '#b98bf0'),
      mk(true, 'Gatinha', '#a86d4a', { eye: { style: 'slit', lash: 'cat', iris: '#6fe0a0', scale: 1.1 }, brow: { style: 'rainbow', color: '#ffffff' }, mouth: { style: 'glitter', color: '#ff8a5a', gloss: 1 }, extras: { paint: { style: 'cat', amount: 1, color: '#4a3a3a' } } }, '#ff8a3d'),
      mk(true, 'Anime', '#f0cdb8', { eye: { style: 'anime', lash: 'feather', iris: '#4fa3e8', lashColor: '#ffffff', scale: 1.0 }, brow: { style: 'uni', color: '#3a2a22' }, mouth: { style: 'bigsmile', color: '#e8606f', gloss: 0.6 }, extras: { paint: { style: 'glitter', amount: 1, color: '#ffe08a' }, nose: { style: 'blush', amount: 0.9, color: '#ee8a86' } } }, '#4fa3e8'),
    ]
    const M4 = [
      mk(false, 'Palhaco', '#e3b08f', { eye: { style: 'cartoon', lash: 'none', iris: '#3b2517', scale: 0.55 }, brow: { style: 'dots', color: '#c0172f' }, mouth: { style: 'bigsmile', color: '#e8252e', gloss: 0.5 }, extras: { paint: { style: 'clown', amount: 1, color: '#e8252e' } } }, '#ff8a3d'),
      mk(false, 'Espiral', '#d4a075', { eye: { style: 'spiral', lash: 'none', iris: '#26b9b0', scale: 0.7 }, brow: { style: 'rainbow', color: '#ffffff' }, mouth: { style: 'tongue', color: '#c9707a', gloss: 0.5 }, extras: { paint: { style: 'bolt', amount: 1, color: '#ffdc3a' } } }, '#3fc5c0'),
      mk(false, 'Brincalhao', '#f1d3c2', { eye: { style: 'heart', lash: 'spider', iris: '#ee7fae', scale: 0.7 }, brow: { style: 'uni', color: '#2a1d16' }, mouth: { style: 'gap', color: '#b06a62', gloss: 0.3 }, extras: { paint: { style: 'stars', amount: 1, color: '#ffd45a' }, freckles: { style: 'hearts', amount: 0.9, color: '#e8607f' } } }, '#f7b5cd'),
      mk(false, 'Gato', '#855236', { eye: { style: 'slit', lash: 'long', iris: '#e2b53a', scale: 0.7 }, brow: { style: 'glitter', color: '#ffffff' }, mouth: { style: 'glitter', color: '#8a3f3c', gloss: 1 }, extras: { paint: { style: 'cat', amount: 1, color: '#2a2020' }, contour: { style: 'highlight', amount: 0.6, color: '#fff0dc' } }, beard: { style: 'drawn', color: '#2a2020', amount: 1 } }, '#c0172f'),
    ]
    const row = Number(Q.get('row') ?? 0)
    const list = row === 0 ? F4 : M4
    content = (
      <>
        <Cam target={[0, row === 0 ? 1.42 : 1.58, 0]} dist={Number(Q.get('cam')) || 5} fov={Number(Q.get('fov')) || 7} />
        {list.map((lk, i) =>
          row === 0 ? <DollNew key={i} x={rowX(i, 4, 0.5)} yaw={yaw34} look={lk as FemLook} /> : <Male key={i} look={lk as MaleLook} x={rowX(i, 4, 0.5)} yaw={yaw34} shape={{ f_maleBase: 1 }} cut />,
        )}
      </>
    )
  } else if (scene === 'rand') {
    const g = Q.get('g') === 'male' ? 'male' : Q.get('g') === 'female' ? 'female' : 'any'
    const start = Number(Q.get('from') ?? 0)
    content = (
      <>
        <Cam target={[0, 1.5, 0]} dist={Number(Q.get('cam')) || 7} fov={Number(Q.get('fov')) || 8} />
        {Array.from({ length: 6 }, (_, i) => (
          <MixRand key={i} seed={`rnd${start + i}`} gender={g} x={rowX(i, 6, 0.55)} yaw={yaw34} />
        ))}
      </>
    )
  } else if (scene === 'reft') {
    // preset Referencia editado: olho e sobrancelha trocados (prova que e editavel)
    const r = TWELVE[12]
    const variants: MaleLook[] = [r, { ...r, face: mergeFace(r.face, { eye: { style: 'almond', iris: '#5f9a6a' }, brow: { style: 'arched', color: '#2a1d16' } }) }, { ...r, face: mergeFace(r.face, { eye: { style: 'natural', iris: '#6b4527', lash: 'none' }, brow: { style: 'thin', color: '#8a6a4a' }, mouth: { style: 'natural' } }) }]
    content = (
      <>
        <Cam target={[0, 1.55, 0]} dist={Number(Q.get('cam')) || 3} fov={Number(Q.get('fov')) || 9} />
        {variants.map((v, i) => (
          <Male key={i} look={v} x={rowX(i, 3, 0.4)} yaw={yaw34} />
        ))}
      </>
    )
  } else if (scene === 'morphs') {
    const name = Q.get('morph') ?? 'f_jawWide'
    const base = (w: number): Record<string, number> => ({ [name]: w })
    const ws = [0, 0.5, 1]
    const views = [0, 0.6]
    content = (
      <>
        <Cam target={[0, 1.3, 0]} dist={Number(Q.get('cam')) || 5} fov={Number(Q.get('fov')) || 11} />
        {views.map((vy, r) =>
          ws.map((w, c) => <Male key={`${r}${c}`} look={CLAY} x={rowX(c, 3, 0.36)} dy={-r * 0.46} yaw={vy} shape={base(w)} cut bare noHair />),
        )}
      </>
    )
  } else if (scene === 'hair') {
    const cols = ['#241b16', '#c1802f']
    const hairs = MALE_HAIRS
    const face = TWELVE[2].face
    const base: MaleLook = { name: 'h', skin: '#e3b08f', suit: '#2a4fa8', face, shape: { f_chinWide: 0.2 }, hair: null }
    content = (
      <>
        <Cam target={[0, 1.31, 0]} dist={Number(Q.get('cam')) || 5} fov={Number(Q.get('fov')) || 12} />
        {cols.map((c, r) =>
          hairs.map((h, k) => <Male key={`${r}${k}`} look={{ ...base, hair: { id: h.id, color: c } }} x={rowX(k, 3, 0.42)} dy={-r * 0.46} yaw={yaw34} cut />),
        )}
      </>
    )
  } else if (scene === 'mix') {
    // 6 personagens de generos misturados pelo mesmo caminho do jogo (Character + Appearance aleatoria), na mesma cena
    const seeds = ['a1', 'b2', 'c3', 'd4', 'e5', 'f6']
    const genders: Array<'female' | 'male'> = ['female', 'male', 'female', 'male', 'male', 'female']
    const close = Q.get('close') === '1'
    content = (
      <>
        <Cam target={close ? [0, 1.5, 0] : [0, 0.88, 0]} dist={Number(Q.get('cam')) || (close ? 5 : 11)} fov={Number(Q.get('fov')) || (close ? 14 : 22)} />
        {seeds.map((sd, i) => (
          <MixChar key={sd} seed={sd} gender={genders[i]} x={rowX(i, 6, close ? 0.62 : 1.25)} />
        ))}
        {!close && floor}
      </>
    )
  } else if (scene === 'dcmp' || scene === 'dbody') {
    // (1) boneca antiga, (2) boneca nova com camadas, (3) masculino (Quadrado + raspado); olhos alinhados na altura
    const body = scene === 'dbody'
    const hide = (Q.get('hide') ?? '').split(',').map(Number)
    const mdy = body ? 0 : 1.39 - 1.5827
    const gap = body ? 0.9 : 0.4
    content = (
      <>
        <Cam target={body ? [0, 0.88, 0] : [0, 1.43, 0]} dist={Number(Q.get('cam')) || (body ? 7 : 5)} fov={Number(Q.get('fov')) || (body ? 20 : 10)} />
        {!hide.includes(0) && <Doll x={-gap} yaw={body ? 0 : yaw34} />}
        {!hide.includes(1) && <DollNew x={0} yaw={body ? 0 : yaw34} />}
        {!hide.includes(2) && <Male look={TWELVE[0]} x={gap} dy={mdy} yaw={body ? 0 : yaw34} report={body} />}
        {body && floor}
      </>
    )
  } else if (scene === 'dswap') {
    const eyes = [['classic', 1], ['natural', 1.9], ['almond', 1.75], ['doll', 1.35]] as const
    content = (
      <>
        <Cam target={[0, 1.43, 0]} dist={Number(Q.get('cam')) || 5} fov={Number(Q.get('fov')) || 10} />
        {eyes.map(([st, sc], i) => (
          <DollNew key={st} x={(i - 1.5) * 0.4} yaw={yaw34} look={{ ...DOLL_REPLICA, name: st, face: mergeFace(DOLL_REPLICA.face, { eye: { style: st, scale: sc, lash: st === 'classic' ? 'classic' : st === 'doll' ? 'doll' : 'natural' } }) }} />
        ))}
      </>
    )
  } else if (scene === 'dsix') {
    const i = Math.max(0, ONLY)
    content = (
      <>
        <Cam target={[0, 1.43, 0]} dist={Number(Q.get('cam')) || 4} fov={Number(Q.get('fov')) || 7} />
        <DollNew x={0} yaw={yaw34} look={FEM_SIX[i]} />
      </>
    )
  } else if (scene === 'deyes') {
    content = (
      <>
        <Cam target={[0.02, 1.39, 0]} dist={Number(Q.get('cam')) || 4} fov={Number(Q.get('fov')) || 5} />
        <DollNew x={0} yaw={Number(Q.get('yaw')) || 0.8} />
      </>
    )
  } else if (scene === 'ext') {
    // extremos de formato em perfil: kind=doll|male; cada cabeca = um conjunto de morphs no maximo
    const kind = Q.get('kind') ?? 'doll'
    const sets: Array<Record<string, number>> =
      kind === 'doll'
        ? [{}, { f_chinPointed: 1 }, { f_chinWide: 1 }, { f_jawWide: 1 }, { f_jawSoft: 1 }, { f_chinPointed: 1, f_faceLong: 1 }, { f_jawWide: 1, f_chinWide: 1 }, { f_cheekHollow: 1, f_chinPointed: 1 }]
        : [{ f_maleBase: 1 }, { f_maleBase: 1, f_chinPointed: 1 }, { f_maleBase: 1, f_chinWide: 1 }, { f_maleBase: 1, f_jawWide: 1 }, { f_maleBase: 1, f_jawAngular: 1 }, { f_maleBase: 1, f_chinPointed: 1, f_faceLong: 1 }, { f_maleBase: 1, f_jawWide: 1, f_jawAngular: 1 }, { f_maleBase: 1, f_chinForward: 1, f_chinWide: 1 }]
    content = (
      <>
        <Cam target={[0, kind === 'doll' ? 1.38 : 1.55, 0]} dist={Number(Q.get('cam')) || 5} fov={Number(Q.get('fov')) || 8} />
        {sets.map((sh, i) =>
          kind === 'doll' ? (
            <DollNew key={i} x={rowX(i, sets.length, 0.3)} yaw={yaw34} look={{ ...DOLL_REPLICA, hair: { id: null as unknown as string, color: '#000' }, shape: sh }} />
          ) : (
            <Male key={i} look={{ ...CLAY, face: TWELVE[2].face }} x={rowX(i, sets.length, 0.3)} yaw={yaw34} shape={sh} cut noHair />
          ),
        )}
      </>
    )
  } else if (scene === 'mside') {
    const idx = [0, 7, 11, 6]
    content = (
      <>
        <Cam target={[0, 1.55, 0]} dist={Number(Q.get('cam')) || 5} fov={Number(Q.get('fov')) || 9} />
        {idx.map((k, i) => (
          <Male key={k} look={TWELVE[k]} x={rowX(i, idx.length, 0.36)} yaw={yaw34} />
        ))}
      </>
    )
  } else if (scene === 'six') {
    content = (
      <>
        <Cam target={[0, 1.54, 0]} dist={Number(Q.get('cam')) || 6} fov={fov} />
        {SIX.map((s, i) => (ONLY >= 0 && ONLY !== i ? null : <Male key={s.name} look={s} x={ONLY >= 0 ? 0 : rowX(i, 6, 0.4)} yaw={yaw34} />))}
      </>
    )
  } else if (scene === 'doll') {
    content = (
      <>
        <Cam target={[0, 1.55, 0]} dist={Number(Q.get('cam')) || 5} fov={fov} />
        <Doll x={-0.3} yaw={yaw34 * 0.8} dy={0.2} />
        <Male look={DOLLISH} x={0.3} yaw={yaw34 * 0.8} />
      </>
    )
  } else if (scene === 'swap') {
    const base = DOLLISH.face
    const three = (['natural', 'almond', 'doll'] as const).map((st) => ({
      ...DOLLISH,
      name: st,
      face: mergeFace(base, { eye: { style: st, scale: 1.4, gap: st === 'doll' ? 0.0085 : 0.003, iris: '#4e86b8', lash: 'natural' }, blush: { amount: 0.25 }, mouth: { style: 'natural', gloss: 0.3 }, brow: { style: 'thick' } }),
    }))
    content = (
      <>
        <Cam target={[0, 1.55, 0]} dist={Number(Q.get('cam')) || 5} fov={fov} />
        {three.map((s, i) => (
          <Male key={s.name} look={s} x={rowX(i, 3, 0.4)} yaw={yaw34} />
        ))}
      </>
    )
  } else {
    content = (
      <>
        <Cam target={[0, 1.55, 0]} dist={Number(Q.get('cam')) || 5} fov={fov} />
        <Suspense fallback={null}>
          <OriginalMeshy x={-0.3} yaw={yaw34} />
        </Suspense>
        <Male look={SIX[0]} x={0.3} yaw={yaw34} bare noHair />
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

void SHAPE_MORPHS
