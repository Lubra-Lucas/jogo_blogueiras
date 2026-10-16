import { forwardRef, Suspense, use, useEffect, useImperativeHandle, useDeferredValue, useMemo } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import { Color, MeshPhysicalMaterial, NoColorSpace, Skeleton, type Bone, type Group, type MeshStandardMaterial, type Object3D, type SkinnedMesh, type Texture } from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { GLTF } from 'three-stdlib'
import type { Appearance } from '../../shared/appearance'
import { BASES, loadBaseMeta } from './assets'
import { applyBodyLook, createBodyMaterial, createHairMaterial } from './dollMaterial'
import { getWearable, itemColor, WEARABLES, type WearableDef } from './items'
import { applyRestPose } from './pose'
import { ensureTangents } from './tangents'

export interface CharacterHandle {
  /** raiz (pes em y=0, olhando para +Z) */
  root: Group
  /** esqueleto da base (nomes `mixamorigHips`...); cabelo e roupa usam estes mesmos ossos */
  skeleton: Skeleton
  bones: Record<string, Bone>
}

export interface CharacterProps {
  appearance: Appearance
  /** projeta sombra (qualidade medium/high) */
  shadows?: boolean
}

interface Rig extends CharacterHandle {
  armature: Object3D
  body: SkinnedMesh
  /** texturas do GLB (atlas baked + normal), reaproveitadas pelo cabelo (mesmo atlas) */
  map: Texture | null
  normalMap: Texture | null
}

function buildRig(scene: Group): Rig {
  const root = cloneSkinned(scene) as Group
  const bones: Record<string, Bone> = {}
  let body: SkinnedMesh | null = null
  root.traverse((o) => {
    if ((o as Bone).isBone) bones[o.name] = o as Bone
    if ((o as SkinnedMesh).isSkinnedMesh && !body) body = o as SkinnedMesh
  })
  const b = body as SkinnedMesh | null
  if (!b) throw new Error('doll_base.glb sem SkinnedMesh')
  ensureTangents(b.geometry) // geometria e compartilhada entre clones; faz uma vez
  const m = b.material as MeshPhysicalMaterial
  return { root, bones, skeleton: b.skeleton, armature: b.parent!, body: b, map: m.map, normalMap: m.normalMap }
}

interface Attachment {
  def: WearableDef
  meshes: SkinnedMesh[]
  material: MeshPhysicalMaterial
  setColor: (c: string) => void
  skeletons: Skeleton[]
}

/**
 * Peca (cabelo/roupa) presa ao MESMO esqueleto do corpo: clona o GLB da peca e recria o `Skeleton` de cada
 * SkinnedMesh usando os ossos do corpo (casados por nome) + as boneInverses originais da peca. Assim a peca
 * segue a animacao dos ossos do corpo sem duplicar a hierarquia (e cada personagem tem seus proprios ossos).
 * Os GLB da peca vem do mesmo pipeline/esqueleto, entao as boneInverses coincidem.
 */
function buildAttachment(rig: Rig, def: WearableDef, gltf: GLTF): Attachment {
  const src = cloneSkinned(gltf.scene) as Group
  const found: SkinnedMesh[] = []
  src.traverse((o) => {
    if ((o as SkinnedMesh).isSkinnedMesh) found.push(o as SkinnedMesh)
  })
  const skeletons: Skeleton[] = []
  const meshes: SkinnedMesh[] = []
  // cabelo com textura propria: baseColor/normal vem do material do proprio GLB (compartilhados no cache, nao descartar)
  const own = def.texture === 'own' ? (found[0]?.material as MeshStandardMaterial | undefined) : undefined
  for (const m of found) {
    ensureTangents(m.geometry)
    const bones = m.skeleton.bones.map((b) => rig.bones[b.name])
    if (bones.some((b) => !b)) continue
    const skel = new Skeleton(bones, m.skeleton.boneInverses.map((x) => x.clone()))
    m.removeFromParent()
    m.bind(skel, m.bindMatrix)
    m.frustumCulled = false
    skeletons.push(skel)
    meshes.push(m)
  }
  let material: MeshPhysicalMaterial
  let setColor: (c: string) => void
  if (def.kind === 'hair') {
    const h = own ? createHairMaterial(own.map, own.normalMap, def.refLum) : createHairMaterial(rig.map, rig.normalMap)
    material = h.material
    setColor = (c) => {
      ;(h.uniforms.uHair.value as Color).set(c)
      material.sheenColor.set(c).lerp(new Color('#ffffff'), 0.25).multiplyScalar(0.7)
    }
  } else {
    material = new MeshPhysicalMaterial({ roughness: 0.38, metalness: 0, sheen: 0.8, sheenRoughness: 0.4 })
    setColor = (c) => material.color.set(c)
  }
  for (const m of meshes) m.material = material
  return { def, meshes, material, setColor, skeletons }
}

function applyMorphs(mesh: SkinnedMesh, morphs: Record<string, number>) {
  const dict = mesh.morphTargetDictionary
  const inf = mesh.morphTargetInfluences
  if (!dict || !inf) return
  for (const name in dict) inf[dict[name]] = morphs[name] ?? 0
}

function CharacterImpl({ appearance, shadows = false, handle }: CharacterProps & { handle: React.Ref<CharacterHandle> }) {
  use(loadBaseMeta(appearance.base))
  const base = BASES[appearance.base]
  // useDeferredValue: ao trocar o cabelo (GLB carregado sob demanda) o anterior fica ate o novo estar pronto, sem suspender o personagem
  const hairId = useDeferredValue(appearance.hair.id)
  const hairDef = getWearable(hairId)
  const o = appearance.outfit
  const itemRefs = o.dress ? [o.dress, o.shoes] : [o.top, o.bottom, o.shoes]
  const defs: Array<{ def: WearableDef; color: string }> = []
  if (hairDef) defs.push({ def: hairDef, color: appearance.hair.color })
  for (const r of itemRefs) {
    const d = r && WEARABLES[r.id]
    if (r && d) defs.push({ def: d, color: itemColor(r, d) })
  }
  const gltfs = useGLTF([base.glb, ...defs.map((d) => d.def.glb)]) as GLTF[]
  const masks = useTexture([base.mask, base.mask2])

  // ---- esqueleto + malha do corpo (clone por instancia) ----
  const rig = useMemo(() => buildRig(gltfs[0].scene), [gltfs[0]]) // eslint-disable-line react-hooks/exhaustive-deps
  useImperativeHandle(handle, () => rig, [rig])
  useEffect(() => {
    applyRestPose(rig.bones, rig.root)
  }, [rig])

  // mascaras: dados lineares, UV do glTF (sem flip)
  useMemo(() => {
    for (const t of masks) {
      t.flipY = false
      t.colorSpace = NoColorSpace
      t.anisotropy = 4
      t.needsUpdate = true
    }
  }, [masks])

  // ---- material do corpo (um por instancia) ----
  const bodyMat = useMemo(() => createBodyMaterial(rig.map, rig.normalMap, masks[0], masks[1]), [rig, masks])
  useEffect(() => {
    rig.body.material = bodyMat.material
    rig.body.frustumCulled = false
    return () => bodyMat.material.dispose()
  }, [rig, bodyMat])

  const lookKey = JSON.stringify([appearance.skin, appearance.suit, appearance.lips, appearance.hair.color])
  useEffect(() => {
    applyBodyLook(bodyMat, { skin: appearance.skin.tone, suit: appearance.suit.color, finish: appearance.suit.finish, lips: appearance.lips, hair: appearance.hair.color })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyMat, lookKey])

  // ---- cabelo e roupa: presos ao mesmo esqueleto ----
  const attachKey = defs.map((d) => d.def.id).join('|')
  const attachments = useMemo(
    () => defs.map((d, i) => buildAttachment(rig, d.def, gltfs[i + 1])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rig, attachKey, gltfs.length],
  )
  useEffect(() => {
    for (const a of attachments) for (const m of a.meshes) rig.armature.add(m)
    return () => {
      for (const a of attachments) {
        for (const m of a.meshes) m.removeFromParent()
        a.material.dispose()
        for (const s of a.skeletons) s.dispose()
      }
    }
  }, [rig, attachments])

  const colorKey = defs.map((d) => d.color).join('|')
  useEffect(() => {
    attachments.forEach((a, i) => a.setColor(defs[i].color))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments, colorKey])

  // ---- morphs (corpo e cabelo compartilham os nomes) ----
  const morphKey = JSON.stringify(appearance.morphs)
  useEffect(() => {
    applyMorphs(rig.body, appearance.morphs)
    for (const a of attachments) for (const m of a.meshes) applyMorphs(m, appearance.morphs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig, attachments, morphKey])

  // ---- sombras ----
  useEffect(() => {
    rig.body.castShadow = shadows
    for (const a of attachments) for (const m of a.meshes) m.castShadow = shadows
  }, [rig, attachments, shadows])

  useEffect(
    () => () => {
      rig.skeleton.dispose()
    },
    [rig],
  )

  return <primitive object={rig.root} />
}

/**
 * Personagem: base GLB (esqueleto Mixamo + corpo com textura baked) + cabelo/roupas presos ao mesmo
 * esqueleto, tudo a partir do JSON `appearance` (morphs, pele, macacao, labios, cabelo). Um clone por instancia.
 * O `ref` expoe `{ root, skeleton, bones }` para a animacao.
 */
export const Character = forwardRef<CharacterHandle, CharacterProps>(function Character(props, ref) {
  return (
    <Suspense fallback={null}>
      <CharacterImpl {...props} handle={ref} />
    </Suspense>
  )
})

// pre-carrega os GLB e mascaras (cache do drei)
// so a base e o cabelo padrao sao pre-carregados; os demais carregam sob demanda ao selecionar
const DEFAULT_HAIR_ID = 'hair.meshyUpdo'
useGLTF.preload([BASES.doll.glb, ...Object.values(WEARABLES).filter((w) => w.kind !== 'hair' || w.id === DEFAULT_HAIR_ID).map((w) => w.glb)])
useTexture.preload([BASES.doll.mask, BASES.doll.mask2])
void loadBaseMeta('doll')
