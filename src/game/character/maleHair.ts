import { Color, MeshPhysicalMaterial, Skeleton, type Bone, type Group, type SkinnedMesh } from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

/**
 * Cabelos curtos masculinos (estilo "vinil": mechas lisas esculpidas, glossy, sem fios). GLBs de tools/blender/male/make_hair_male.py:
 * casca sobre o cranio masculino, peso 100% no osso Head, mesmo esqueleto de 52 ossos. Aqui so religamos ao esqueleto do personagem
 * (como o Character faz com o cabelo da boneca) e tingimos: a cor de vertice (COLOR_0) traz o sombreamento dos sulcos e da raiz.
 */
export type MaleHairId = 'buzz' | 'quiff' | 'sidepart'
export const MALE_HAIRS: Array<{ id: MaleHairId; label: string }> = [
  { id: 'buzz', label: 'Raspado' },
  { id: 'quiff', label: 'Topete curto' },
  { id: 'sidepart', label: 'Curto com risca' },
]
const BASE = import.meta.env.BASE_URL
export const maleHairUrl = (id: MaleHairId) => `${BASE}assets/characters/male/hair_${id}.glb`

export function createMaleHairMaterial(color: string, gloss = 0.7): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: new Color(color),
    vertexColors: true,
    roughness: 0.55 - 0.3 * gloss,
    metalness: 0,
    clearcoat: 0.9 * gloss,
    clearcoatRoughness: 0.28,
    sheen: 0.5,
    sheenRoughness: 0.5,
    sheenColor: new Color(color).lerp(new Color('#ffffff'), 0.3),
  })
}

/** Clona o GLB do cabelo e o liga aos ossos do personagem (por nome); devolve a malha e o material (para trocar a cor). */
export function attachMaleHair(gltfScene: Group, bones: Record<string, Bone>, parent: Group, color: string, gloss = 0.7) {
  const src = cloneSkinned(gltfScene) as Group
  const found: SkinnedMesh[] = []
  src.traverse((o) => {
    if ((o as SkinnedMesh).isSkinnedMesh) found.push(o as SkinnedMesh)
  })
  const material = createMaleHairMaterial(color, gloss)
  const meshes: SkinnedMesh[] = []
  for (const m of found) {
    const bs = m.skeleton.bones.map((b) => bones[b.name.replace(/:/g, '')] ?? bones[b.name])
    if (bs.some((b) => !b)) continue
    const skel = new Skeleton(bs, m.skeleton.boneInverses.map((x) => x.clone()))
    m.removeFromParent()
    m.bind(skel, m.bindMatrix)
    m.frustumCulled = false
    m.material = material
    parent.add(m)
    meshes.push(m)
  }
  const dispose = () => {
    for (const m of meshes) m.removeFromParent()
    material.dispose()
  }
  return { meshes, material, dispose }
}
