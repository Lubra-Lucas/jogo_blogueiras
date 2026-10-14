import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react'
import { Color, Mesh, MeshPhysicalMaterial, type Material, type Object3D } from 'three'
import type { Appearance, ItemRef } from '../../shared/appearance'
import { buildBody } from './body'
import { createFaceDecalGeometry, FaceTexture } from './face'
import { buildItem, type BuiltPart } from './items'
import { ALBEDO, skinGlow, skinMaterial } from './materials'
import { createRig, type CharacterRig } from './rig'

export type { CharacterRig } from './rig'
export { JOINT_NAMES, type JointName } from './joints'

export interface CharacterProps {
  appearance: Appearance
  /** projeta sombra (qualidade medium/high) */
  shadows?: boolean
}

function setShadows(o: Object3D, on: boolean) {
  o.traverse((c) => {
    if ((c as Mesh).isMesh) c.castShadow = on
  })
}

function disposeObject(o: Object3D) {
  o.traverse((c) => {
    const m = c as Mesh & { dispose?: () => void }
    if (!m.isMesh) return
    m.geometry.dispose()
    const mat = m.material as Material | Material[]
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
    else mat.dispose()
    m.dispose?.() // InstancedMesh
  })
}

/** Cria/atualiza as partes de um grupo de itens; descarta tudo ao mudar a chave ou desmontar. */
function useBuilt(rig: CharacterRig, key: string, make: () => BuiltPart[], shadows: boolean) {
  useEffect(() => {
    const parts = make()
    for (const p of parts) {
      rig.joints[p.joint].add(p.object)
      setShadows(p.object, shadows)
    }
    return () => {
      for (const p of parts) {
        p.object.removeFromParent()
        disposeObject(p.object)
      }
    }
    // `make` e recriada a cada render; so reconstruimos quando a chave (JSON do trecho) muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig, key, shadows])
}

const FACE_DECAL_ORDER = 2

/**
 * Boneca: rig rigido + corpo + rosto (decalque 2D) + cabelo + roupas + acessorios, tudo a partir
 * do JSON `appearance`. Troca de skinTone/rosto so redesenha; cabelo/roupa/acessorios sao
 * reconstruidos por trecho. O `ref` expoe o `CharacterRig` (juntas) para animacao.
 */
export const Character = forwardRef<CharacterRig, CharacterProps>(function Character(
  { appearance, shadows = false },
  ref,
) {
  const rig = useMemo(() => createRig(), [])
  const skin = useMemo(() => skinMaterial('#f6d7c3'), [])
  const face = useMemo(() => new FaceTexture(), [])
  useImperativeHandle(ref, () => rig, [rig])

  // corpo + decalque do rosto (geometria fixa)
  useEffect(() => {
    const body = buildBody(rig, skin)
    const decalMat = new MeshPhysicalMaterial({
      map: face.texture,
      color: new Color('#ffffff').multiplyScalar(ALBEDO),
      transparent: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      roughness: 0.55,
      metalness: 0,
      clearcoat: 0.12,
      clearcoatRoughness: 0.5,
    })
    const decal = new Mesh(createFaceDecalGeometry(), decalMat)
    decal.name = 'face'
    decal.renderOrder = FACE_DECAL_ORDER
    decal.position.y = 0.17
    rig.joints.head.add(decal)
    for (const m of body.meshes) m.castShadow = shadows
    return () => {
      for (const m of body.meshes) {
        m.removeFromParent()
        m.geometry.dispose()
      }
      decal.removeFromParent()
      decal.geometry.dispose()
      decalMat.dispose()
    }
  }, [rig, skin, face, shadows])

  // tom de pele + rosto
  const faceKey = JSON.stringify([appearance.face, appearance.skinTone])
  useEffect(() => {
    skin.color.set(appearance.skinTone).multiplyScalar(ALBEDO)
    skin.sheenColor = new Color(appearance.skinTone).lerp(new Color('#ffffff'), 0.4)
    skin.emissive.copy(skinGlow(new Color(appearance.skinTone)))
    face.redraw(appearance.face, appearance.skinTone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skin, face, faceKey])

  useBuilt(rig, JSON.stringify(appearance.hair), () => buildItem({ id: appearance.hair.id }, [appearance.hair.color, appearance.hair.color2 ?? appearance.hair.color]), shadows)

  const o = appearance.outfit
  const outfitRefs: Array<ItemRef | undefined> = o.dress ? [o.dress, o.shoes] : [o.top, o.bottom, o.shoes]
  useBuilt(rig, JSON.stringify(outfitRefs), () => outfitRefs.flatMap((r) => buildItem(r)), shadows)

  useBuilt(rig, JSON.stringify(appearance.accessories), () => appearance.accessories.flatMap((r) => buildItem(r)), shadows)

  // libera a textura/materiais ao desmontar
  useEffect(
    () => () => {
      face.dispose()
      skin.dispose()
    },
    [face, skin],
  )

  return <primitive object={rig.root} />
})
