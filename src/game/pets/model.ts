import {
  AnimationMixer,
  Bone,
  CylinderGeometry,
  DoubleSide,
  Group,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type Material,
} from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { PET_ACCESSORIES } from '../economy/prices'
import type { PetBreed, PetClip } from './catalog'
import type { PetEquip } from './petStore'

export const PET_CLIPS: PetClip[] = ['idle', 'walk', 'run', 'sit', 'lie', 'happy', 'eat']

export interface PetModel {
  scene: Group
  mixer: AnimationMixer
  actions: Partial<Record<PetClip, AnimationAction>>
  bones: Record<string, Bone>
}

const slotOf = (name: string) => name.split('.')[0]

/** Clona o GLB do pet (esqueleto proprio) e pinta cada slot de material com as cores da pelagem. */
export function createPetModel(gltf: { scene: Object3D; animations: AnimationClip[] }, colors: Record<string, string>): PetModel {
  const scene = cloneSkinned(gltf.scene) as Group
  const mats = new Map<string, Material>()
  scene.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    m.castShadow = true
    m.frustumCulled = false
    const fix = (src: Material) => {
      let c = mats.get(src.name)
      if (!c) {
        c = src.clone()
        const std = c as MeshStandardMaterial
        const col = colors[slotOf(src.name)]
        if (col && std.color) std.color.set(col)
        if (slotOf(src.name) === 'glint' && std.emissive) std.emissive.set('#ffffff')
        mats.set(src.name, c)
      }
      return c
    }
    m.material = Array.isArray(m.material) ? m.material.map(fix) : fix(m.material)
  })
  const mixer = new AnimationMixer(scene)
  const actions: PetModel['actions'] = {}
  for (const clip of gltf.animations) {
    if (!PET_CLIPS.includes(clip.name as PetClip)) continue
    const a = mixer.clipAction(clip)
    a.setLoop(LoopRepeat, Infinity)
    actions[clip.name as PetClip] = a
  }
  const bones: Record<string, Bone> = {}
  scene.traverse((o) => {
    if ((o as Bone).isBone) bones[o.name] = o as Bone
  })
  return { scene, mixer, actions, bones }
}

/** Coleira, laco e roupinha presos aos ossos. Devolve a funcao que remove tudo. */
export function attachAccessories(model: PetModel, breed: PetBreed, equip: PetEquip | undefined): () => void {
  const made: Object3D[] = []
  const m = breed.meta
  const colorOf = (accId?: string) => PET_ACCESSORIES.find((a) => a.id === accId)?.color
  const mat = (c: string) => new MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.1 })
  const put = (boneName: string, obj: Object3D) => {
    model.scene.add(obj)
    obj.updateMatrixWorld(true)
    model.bones[boneName]?.attach(obj)
    made.push(obj)
  }
  const e = equip ?? {}
  const col = colorOf(e.collar)
  if (col) {
    const n0 = new Vector3(...m.n0)
    const hn = new Vector3(...m.hn)
    const pos = n0.clone().lerp(hn, 0.55)
    const ring = new Mesh(new TorusGeometry(m.neckR * 1.04, m.hr * 0.11, 8, 20), mat(col))
    ring.position.copy(pos)
    ring.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), hn.clone().sub(n0).normalize())
    put('neck', ring)
    const tag = new Mesh(new SphereGeometry(m.hr * 0.16, 8, 6), new MeshStandardMaterial({ color: '#d4af37', metalness: 0.9, roughness: 0.25 }))
    tag.position.copy(pos).add(new Vector3(0, -m.neckR * 1.02, m.neckR * 0.25))
    put('neck', tag)
  }
  const bowC = colorOf(e.bow)
  if (bowC) {
    const bow = new Group()
    for (const sx of [1, -1]) {
      const w = new Mesh(new SphereGeometry(m.hr * 0.26, 10, 8), mat(bowC))
      w.scale.set(1.2, 0.8, 0.5)
      w.position.set(sx * m.hr * 0.26, 0, 0)
      w.rotation.z = sx * 0.3
      bow.add(w)
    }
    bow.add(new Mesh(new SphereGeometry(m.hr * 0.1, 8, 6), mat(bowC)))
    bow.position.set(m.hc[0] + m.hr * 0.62, m.hc[1] + m.hr * 0.82, m.hc[2] + m.hr * 0.12)
    bow.rotation.z = -0.4
    put('head', bow)
  }
  const outC = colorOf(e.outfit)
  if (outC) {
    const grp = new Group()
    const stripes = !!e.outfit?.includes('listrada')
    const n = stripes ? 5 : 1
    const len = m.L * 0.5
    for (let i = 0; i < n; i++) {
      const seg = new Mesh(
        new CylinderGeometry(1, 1, (len / n) * 1.02, 16, 1, true),
        new MeshStandardMaterial({ color: stripes && i % 2 ? '#efe6d4' : outC, roughness: 0.75, side: DoubleSide }),
      )
      seg.rotation.x = Math.PI / 2
      seg.scale.set(m.bw * 1.12, 1, m.bh * 1.12)
      seg.position.set(0, 0, -len / 2 + (i + 0.5) * (len / n))
      grp.add(seg)
    }
    grp.position.set(0, m.zc + m.bh * 0.02, -m.L * 0.02)
    put('spine', grp)
  }
  return () => {
    for (const o of made) o.removeFromParent()
  }
}
