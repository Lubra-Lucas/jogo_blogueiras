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
  Skeleton,
  SkinnedMesh,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type Material,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { PET_ACCESSORIES, type PetAccDef } from '../economy/prices'
import { PET_BASE, type PetBreed, type PetClip } from './catalog'
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

const accLoader = new GLTFLoader()
const accCache = new Map<string, Promise<Object3D>>()
/** Carrega (uma vez por arquivo) um GLB de acessorio; devolve a cena original, que deve ser clonada. */
function loadAccGlb(file: string): Promise<Object3D> {
  let p = accCache.get(file)
  if (!p) {
    p = accLoader.loadAsync(`${PET_BASE}${file}`).then((g) => g.scene)
    p.catch(() => accCache.delete(file))
    accCache.set(file, p)
  }
  return p
}

/** Clona o material (para nao tingir o cache) e pinta so o slot tingivel. */
function cloneAccMaterials(root: Object3D, tint: string | undefined, color: string, owned: Material[]) {
  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.frustumCulled = false
    const fix = (src: Material) => {
      const c = src.clone()
      if (tint && src.name === tint) (c as MeshStandardMaterial).color?.set(color)
      owned.push(c)
      return c
    }
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(fix) : fix(mesh.material)
  })
}

/** Liga a polo (skin nos ossos da propria raca) ao esqueleto do pet, pelo nome dos ossos. */
function bindToPet(model: PetModel, polo: Object3D): SkinnedMesh[] {
  const meshes: SkinnedMesh[] = []
  polo.traverse((o) => {
    if ((o as SkinnedMesh).isSkinnedMesh) meshes.push(o as SkinnedMesh)
  })
  let host: Object3D = model.scene
  model.scene.traverse((o) => {
    if ((o as SkinnedMesh).isSkinnedMesh && host === model.scene) host = o.parent ?? model.scene
  })
  for (const sm of meshes) {
    const bones = sm.skeleton.bones.map((b) => model.bones[b.name])
    if (bones.some((b) => !b)) {
      console.warn('[pets] polo: osso ausente no pet', sm.skeleton.bones.map((b) => b.name).filter((n) => !model.bones[n]))
      continue
    }
    const skel = new Skeleton(bones, sm.skeleton.boneInverses.map((m) => m.clone()))
    sm.removeFromParent()
    host.add(sm)
    host.updateMatrixWorld(true)
    sm.bind(skel, sm.bindMatrix.clone())
    sm.frustumCulled = false
  }
  return meshes
}

function attachGlbAccessory(model: PetModel, breed: PetBreed, def: PetAccDef, put: (bone: string, o: Object3D) => void, own: (o: Object3D, mats: Material[]) => void, alive: () => boolean) {
  const m = breed.meta
  const file = def.file ?? def.files?.[breed.id]
  if (!file) return
  loadAccGlb(file)
    .then((src) => {
      if (!alive()) return
      const mats: Material[] = []
      if (def.files) {
        const polo = cloneSkinned(src)
        cloneAccMaterials(polo, def.tint, def.color, mats)
        const meshes = bindToPet(model, polo)
        for (const sm of meshes) own(sm, mats)
        return
      }
      const obj = cloneSkinned(src)
      cloneAccMaterials(obj, def.tint, def.color, mats)
      const holder = new Group()
      holder.add(obj)
      if (def.slot === 'collar') {
        const n0 = new Vector3(...m.n0)
        const hn = new Vector3(...m.hn)
        holder.position.copy(n0.clone().lerp(hn, 0.55))
        holder.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), hn.clone().sub(n0).normalize())
        holder.scale.setScalar(m.neckR * 1.04)
        put('neck', holder)
      } else {
        const up = breed.species === 'cat' ? 0.82 : 0.48 // ajuste por especie: no cao o laco assentava flutuando
        holder.position.set(m.hc[0] + m.hr * (breed.species === 'cat' ? 0.62 : 0.5), m.hc[1] + m.hr * up, m.hc[2] + m.hr * 0.12)
        holder.rotation.z = -0.4
        holder.scale.setScalar(m.hr * 0.5)
        put('head', holder)
      }
      own(holder, mats)
    })
    .catch((err) => console.warn('[pets] acessorio GLB falhou', file, err))
}

/** Coleira, laco e roupinha presos aos ossos. Devolve a funcao que remove tudo. */
export function attachAccessories(model: PetModel, breed: PetBreed, equip: PetEquip | undefined): () => void {
  const made: Object3D[] = []
  const mine: Material[] = []
  let dead = false
  const m = breed.meta
  const defOf = (id?: string) => PET_ACCESSORIES.find((a) => a.id === id)
  const glbDef = (id?: string) => {
    const d = defOf(id)
    return d && (d.file || (d.files && d.files[breed.id])) ? d : undefined
  }
  const own = (o: Object3D, mats: Material[]) => {
    if (!made.includes(o)) made.push(o)
    mine.push(...mats)
  }
  const glb = (d: PetAccDef) =>
    attachGlbAccessory(model, breed, d, (bone, o) => {
      model.scene.add(o)
      o.updateMatrixWorld(true)
      model.bones[bone]?.attach(o)
    }, own, () => !dead)
  const colorOf = (accId?: string) => PET_ACCESSORIES.find((a) => a.id === accId)?.color
  const mat = (c: string) => new MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.1 })
  const put = (boneName: string, obj: Object3D) => {
    model.scene.add(obj)
    obj.updateMatrixWorld(true)
    model.bones[boneName]?.attach(obj)
    made.push(obj)
  }
  const e = equip ?? {}
  const collarGlb = glbDef(e.collar)
  if (collarGlb) glb(collarGlb)
  const col = collarGlb ? undefined : colorOf(e.collar)
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
  const bowGlb = glbDef(e.bow)
  if (bowGlb) glb(bowGlb)
  const bowC = bowGlb ? undefined : colorOf(e.bow)
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
  const outDef = defOf(e.outfit)
  const outGlb = glbDef(e.outfit)
  if (outGlb) glb(outGlb)
  // roupa so com GLB (polo) e sem arquivo para a raca: nao veste nada
  const outC = outGlb || outDef?.files ? undefined : colorOf(e.outfit)
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
    dead = true
    for (const o of made) {
      o.removeFromParent()
      if ((o as SkinnedMesh).isSkinnedMesh) (o as SkinnedMesh).skeleton?.dispose()
    }
    for (const mt of mine) mt.dispose()
  }
}
