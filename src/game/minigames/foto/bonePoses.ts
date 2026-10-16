import { Quaternion, Vector3, type Bone, type Object3D } from 'three'
import type { PoseId } from './data'

/**
 * Poses de ensaio por ossos (mesma técnica de `desfile/bonePoses.ts`: aponta o eixo osso->filho para uma direção
 * no mundo). A boneca olha para +Z, então +X do mundo é o lado ESQUERDO dela (`s = +1`).
 */
const _a = new Vector3()
const _b = new Vector3()
const _d = new Vector3()
const _t = new Vector3()
const _q = new Quaternion()
const _wq = new Quaternion()
const _pq = new Quaternion()

function aim(bone: Bone, child: Bone, dir: Vector3) {
  bone.updateWorldMatrix(true, false)
  child.updateWorldMatrix(true, false)
  bone.getWorldPosition(_a)
  child.getWorldPosition(_b)
  _d.subVectors(_b, _a).normalize()
  _q.setFromUnitVectors(_d, dir.normalize())
  bone.getWorldQuaternion(_wq).premultiply(_q)
  bone.parent!.getWorldQuaternion(_pq)
  bone.quaternion.copy(_pq.invert().multiply(_wq))
  bone.updateWorldMatrix(false, true)
}

type Side = 'Left' | 'Right'
type V3 = [number, number, number]
const sign = (s: Side) => (s === 'Left' ? 1 : -1)

function arm(bones: Record<string, Bone>, side: Side, upper: V3, fore: V3) {
  const a = bones[`mixamorig${side}Arm`]
  const f = bones[`mixamorig${side}ForeArm`]
  const h = bones[`mixamorig${side}Hand`]
  if (!a || !f || !h) return
  const s = sign(side)
  aim(a, f, _t.set(s * upper[0], upper[1], upper[2]))
  aim(f, h, _t.set(s * fore[0], fore[1], fore[2]))
}

function leg(bones: Record<string, Bone>, side: Side, dir: V3) {
  const u = bones[`mixamorig${side}UpLeg`]
  const l = bones[`mixamorig${side}Leg`]
  const f = bones[`mixamorig${side}Foot`]
  if (!u || !l || !f) return
  const s = sign(side)
  aim(u, l, _t.set(s * dir[0], dir[1], dir[2]))
  aim(l, f, _t.set(s * dir[0] * 0.6, dir[1], dir[2] * 0.4))
}

function tilt(bone: Bone | undefined, axis: 'x' | 'y' | 'z', angle: number) {
  if (!bone) return
  bone.quaternion.premultiply(_q.setFromAxisAngle(_t.set(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0), angle))
}

/** Aplica a pose (os ossos já devem estar na pose de repouso). Poses de clipe e `neutra` ficam no repouso. */
export function applyShootPose(id: PoseId, bones: Record<string, Bone>, root: Object3D) {
  root.updateWorldMatrix(true, true)
  if (id === 'cintura') {
    arm(bones, 'Left', [0.62, -0.7, -0.3], [-0.55, -0.55, 0.62])
    arm(bones, 'Right', [0.62, -0.7, -0.3], [-0.55, -0.55, 0.62])
    leg(bones, 'Left', [0.2, -0.98, 0.1])
    leg(bones, 'Right', [-0.16, -0.98, -0.05])
    tilt(bones.mixamorigHips, 'z', 0.09)
    tilt(bones.mixamorigHead, 'x', -0.05)
  } else if (id === 'cabelo') {
    arm(bones, 'Left', [0.78, 0.4, 0.05], [-0.62, 0.7, 0.35])
    arm(bones, 'Right', [0.62, -0.7, -0.3], [-0.55, -0.55, 0.62])
    leg(bones, 'Left', [-0.12, -0.98, 0.14])
    leg(bones, 'Right', [-0.14, -0.98, -0.05])
    tilt(bones.mixamorigHips, 'z', -0.06)
    tilt(bones.mixamorigHead, 'z', 0.12)
  } else if (id === 'fofa') {
    // mãos junto às bochechas, cabeça inclinada, joelhos juntos
    arm(bones, 'Left', [0.35, -0.88, 0.3], [-0.5, 0.8, 0.3])
    arm(bones, 'Right', [0.35, -0.88, 0.3], [-0.5, 0.8, 0.3])
    leg(bones, 'Left', [0.02, -1, 0.08])
    leg(bones, 'Right', [-0.02, -1, 0.08])
    tilt(bones.mixamorigHead, 'z', 0.2)
    tilt(bones.mixamorigSpine1, 'z', -0.05)
  } else if (id === 'vitoria') {
    arm(bones, 'Left', [0.72, 0.6, 0.05], [0.45, 0.88, 0.1])
    arm(bones, 'Right', [0.72, 0.6, 0.05], [0.45, 0.88, 0.1])
    leg(bones, 'Left', [0.24, -0.97, 0])
    leg(bones, 'Right', [0.24, -0.97, 0])
    tilt(bones.mixamorigSpine1, 'x', -0.08)
    tilt(bones.mixamorigHead, 'x', -0.1)
  } else if (id === 'perfil_esq' || id === 'perfil_dir') {
    // corpo girado pelo grupo; braços soltos com uma mão na cintura e cabeça de volta para a câmera
    arm(bones, 'Left', [0.5, -0.8, -0.2], [-0.35, -0.65, 0.65])
    arm(bones, 'Right', [0.2, -0.97, 0.1], [0.1, -0.9, 0.4])
    leg(bones, 'Left', [0.1, -1, 0.1])
    leg(bones, 'Right', [-0.12, -1, -0.04])
    tilt(bones.mixamorigHead, 'y', id === 'perfil_esq' ? 0.45 : -0.45)
    tilt(bones.mixamorigHead, 'x', -0.06)
  } else {
    // pose natural: um pouco de quadril
    leg(bones, 'Left', [0.14, -1, 0.05])
    leg(bones, 'Right', [-0.1, -1, 0])
    tilt(bones.mixamorigHips, 'z', 0.04)
  }
  root.updateWorldMatrix(true, true)
}

/** Ossos que recebem um leve balanço de respiração (somado por cima da pose). */
export const SWAY_BONES = ['mixamorigHips', 'mixamorigSpine', 'mixamorigSpine1', 'mixamorigSpine2', 'mixamorigHead'] as const
