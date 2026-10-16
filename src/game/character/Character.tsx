import { forwardRef, Suspense, use, useEffect, useImperativeHandle, useDeferredValue, useMemo } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import { Color, MeshPhysicalMaterial, Vector3, type Material, NoColorSpace, Skeleton, type Bone, type Group, type MeshStandardMaterial, type Object3D, type SkinnedMesh, type Texture } from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { GLTF } from 'three-stdlib'
import type { Appearance, ItemRef } from '../../shared/appearance'
import { BASES, loadBaseMeta } from './assets'
import { applyBodyLook, createBodyMaterial, createHairMaterial } from './dollMaterial'
import { getWearable, WEARABLES, type WearableDef } from './items'
import { getCatalogItem, hairFit, loadCatalog, type CatalogItem } from './catalog'
import { applyFinish, applyJewelMaterial, onFabricTextureLoad } from './fabric'
import { morphInfluence } from './morphConfig'
import { applyRestPose } from './pose'
import { ensureTangents } from './tangents'
import { CharacterAnimation, type AnimDriver } from './animation/CharacterAnimation'

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
  /** animacao: 'player' (estados do jogo) ou { clip, t } (visualizador); omitido = so a pose de repouso */
  anim?: AnimDriver
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

/** Peca a montar: cabelo (registro estatico) ou roupa (catalogo de manifesto). */
interface Part {
  key: string
  glb: string
  hair?: WearableDef
  item?: CatalogItem
  ref?: ItemRef
  color: string
}

interface Attachment {
  part: Part
  meshes: SkinnedMesh[]
  materials: MeshPhysicalMaterial[]
  /** cabelo: cor; roupa: aplica cores/acabamentos do ItemRef */
  apply: (p: Part) => void
  skeletons: Skeleton[]
}

const slotOf = (m: Material | Material[]): string => (Array.isArray(m) ? m[0] : m).name.replace(/\.\d+$/, '')

/**
 * Peca (cabelo/roupa) presa ao MESMO esqueleto do corpo: clona o GLB da peca e recria o `Skeleton` de cada
 * SkinnedMesh usando os ossos do corpo (casados por nome) + as boneInverses originais da peca. Assim a peca
 * segue a animacao dos ossos do corpo sem duplicar a hierarquia (e cada personagem tem seus proprios ossos).
 * Os GLB da peca vem do mesmo pipeline/esqueleto, entao as boneInverses coincidem.
 * Roupas: um material por slot (base/trim/accent/lining, pelo nome do material no GLB), recolorido pelo ItemRef.
 */
function buildAttachment(rig: Rig, part: Part, gltf: GLTF): Attachment {
  const src = cloneSkinned(gltf.scene) as Group
  const found: SkinnedMesh[] = []
  src.traverse((o) => {
    if ((o as SkinnedMesh).isSkinnedMesh) found.push(o as SkinnedMesh)
  })
  const skeletons: Skeleton[] = []
  const meshes: SkinnedMesh[] = []
  const def = part.hair
  // cabelo com textura propria: baseColor/normal vem do material do proprio GLB (compartilhados no cache, nao descartar)
  const own = def?.texture === 'own' ? (found[0]?.material as MeshStandardMaterial | undefined) : undefined
  const slotMats = new Map<string, MeshPhysicalMaterial>()
  for (const m of found) {
    ensureTangents(m.geometry)
    const bones = m.skeleton.bones.map((b) => rig.bones[b.name])
    if (bones.some((b) => !b)) continue
    const skel = new Skeleton(bones, m.skeleton.boneInverses.map((x) => x.clone()))
    const slot = def ? '' : slotOf(m.material)
    m.removeFromParent()
    m.bind(skel, m.bindMatrix)
    m.frustumCulled = false
    skeletons.push(skel)
    meshes.push(m)
    if (!def) {
      let mat = slotMats.get(slot)
      if (!mat) slotMats.set(slot, (mat = new MeshPhysicalMaterial({ name: slot })))
      m.material = mat
    }
  }
  if (def) {
    const h = def.kind === 'hair' && own ? createHairMaterial(own.map, own.normalMap, def.refLum) : createHairMaterial(rig.map, rig.normalMap)
    const material = h.material
    for (const m of meshes) m.material = material
    const apply = (p: Part) => {
      ;(h.uniforms.uHair.value as Color).set(p.color)
      material.sheenColor.set(p.color).lerp(new Color('#ffffff'), 0.25).multiplyScalar(0.7)
    }
    return { part, meshes, materials: [material], apply, skeletons }
  }
  const item = part.item!
  const apply = (p: Part) => {
    item.mats.forEach((ms, i) => {
      const mat = slotMats.get(ms.id)
      if (mat) applyFinish(mat, p.ref?.finishes?.[i] ?? ms.finish, p.ref?.colors?.[i] ?? ms.color)
    })
  }
  return { part, meshes, materials: [...slotMats.values()], apply, skeletons }
}

interface Jewel {
  item: CatalogItem
  roots: Array<{ bone: Bone; obj: Group }>
  materials: Array<{ slot: string; mat: MeshPhysicalMaterial }>
}

/** Joia rigida: um clone por ponto de fixacao, preso ao osso com o offset do manifesto (pose de repouso). */
function buildJewel(rig: Rig, item: CatalogItem, gltf: GLTF, hairFile: string | null): Jewel {
  const roots: Jewel['roots'] = []
  const materials: Jewel['materials'] = []
  for (const at of item.attachments ?? []) {
    const bone = rig.bones[at.bone.replace(':', '')]
    if (!bone) continue
    const obj = gltf.scene.clone(true)
    obj.position.set(...at.position)
    const dir = hairFit.mountDir[item.id]
    const lift = hairFile ? hairFit.lift[hairFile]?.[item.id] : undefined
    if (dir && lift) obj.position.add(new Vector3(dir[0], dir[1], dir[2]).multiplyScalar(lift))
    obj.quaternion.set(...at.quaternion)
    obj.scale.set(...at.scale)
    const byName = new Map<string, MeshPhysicalMaterial>()
    obj.traverse((o) => {
      const mesh = o as import('three').Mesh
      if (!mesh.isMesh) return
      const slot = slotOf(mesh.material)
      let mat = byName.get(slot)
      if (!mat) {
        byName.set(slot, (mat = new MeshPhysicalMaterial({ name: slot })))
        materials.push({ slot, mat })
      }
      mesh.material = mat
      mesh.castShadow = false
    })
    roots.push({ bone, obj })
  }
  return { item, roots, materials }
}

function applyMorphs(mesh: SkinnedMesh, morphs: Record<string, number>) {
  const dict = mesh.morphTargetDictionary
  const inf = mesh.morphTargetInfluences
  if (!dict || !inf) return
  for (const name in dict) inf[dict[name]] = morphInfluence(name, morphs[name] ?? 0)
}

function CharacterImpl({ appearance, shadows = false, anim, handle }: CharacterProps & { handle: React.Ref<CharacterHandle> }) {
  use(loadBaseMeta(appearance.base))
  const base = BASES[appearance.base]
  // useDeferredValue: ao trocar o cabelo (GLB carregado sob demanda) o anterior fica ate o novo estar pronto, sem suspender o personagem
  const hairId = useDeferredValue(appearance.hair.id)
  const hairDef = getWearable(hairId)
  use(loadCatalog())
  const o = useDeferredValue(appearance.outfit)
  const accessories = useDeferredValue(appearance.accessories)
  const parts: Part[] = []
  if (hairDef) parts.push({ key: hairDef.id, glb: hairDef.glb, hair: hairDef, color: appearance.hair.color })
  for (const r of [o.dress ?? o.top, o.dress ? undefined : o.bottom, o.gloves, o.legwear, o.shoes]) {
    const item = getCatalogItem(r?.id)
    if (r && item && item.kind === 'garment') parts.push({ key: item.id, glb: item.glb, item, ref: r, color: '' })
  }
  const jewels: Array<{ item: CatalogItem; ref: ItemRef }> = []
  for (const r of accessories) {
    const item = getCatalogItem(r.id)
    if (item && item.kind === 'jewelry') jewels.push({ item, ref: r })
  }
  const gltfs = useGLTF([base.glb, ...parts.map((d) => d.glb), ...jewels.map((j) => j.item.glb)]) as GLTF[]
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
  const attachKey = parts.map((d) => d.key).join('|')
  const attachments = useMemo(
    () => parts.map((d, i) => buildAttachment(rig, d, gltfs[i + 1])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rig, attachKey, gltfs.length],
  )
  useEffect(() => {
    for (const a of attachments) for (const m of a.meshes) rig.armature.add(m)
    return () => {
      for (const a of attachments) {
        for (const m of a.meshes) m.removeFromParent()
        for (const mat of a.materials) mat.dispose()
        for (const s of a.skeletons) s.dispose()
      }
    }
  }, [rig, attachments])

  const colorKey = JSON.stringify(parts.map((d) => [d.color, d.ref]))
  useEffect(() => {
    attachments.forEach((a, i) => a.apply(parts[i]))
    return onFabricTextureLoad(() => attachments.forEach((a, i) => parts[i] && a.apply(parts[i])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments, colorKey])

  // ---- joias rigidas presas aos ossos ----
  const hairFile = hairDef ? (hairDef.glb.split('/').pop() ?? '').replace('.glb', '') : null
  const jewelKey = jewels.map((j) => j.item.id).join('|') + '@' + hairFile
  const jewelObjs = useMemo(
    () => jewels.map((j, i) => buildJewel(rig, j.item, gltfs[1 + parts.length + i], hairFile)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rig, jewelKey, gltfs.length],
  )
  useEffect(() => {
    for (const j of jewelObjs) for (const r of j.roots) r.bone.add(r.obj)
    return () => {
      for (const j of jewelObjs) {
        for (const r of j.roots) r.bone.remove(r.obj)
        for (const m of j.materials) m.mat.dispose()
      }
    }
  }, [jewelObjs])
  const jewelColorKey = JSON.stringify(jewels.map((j) => j.ref))
  useEffect(() => {
    jewelObjs.forEach((j, i) => {
      for (const { slot, mat } of j.materials) {
        const idx = j.item.mats.findIndex((m) => m.id === slot)
        const ms = j.item.mats[idx]
        applyJewelMaterial(mat, slot, jewels[i]?.ref.colors?.[idx] ?? ms?.color ?? '#ffffff')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jewelObjs, jewelColorKey])

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

  return (
    <>
      <primitive object={rig.root} />
      {anim && <CharacterAnimation rig={rig} driver={anim} />}
    </>
  )
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
useGLTF.preload([BASES.doll.glb, ...Object.values(WEARABLES).filter((w) => w.id === DEFAULT_HAIR_ID).map((w) => w.glb)])
useTexture.preload([BASES.doll.mask, BASES.doll.mask2])
void loadBaseMeta('doll')
