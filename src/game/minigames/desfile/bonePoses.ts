import { Quaternion, Vector3, type Bone, type Object3D } from 'three'

/**
 * Poses de passarela por ossos (sem clipe): partem da pose de repouso capturada e giram os ossos "no mundo"
 * (mesma técnica de `character/pose.ts`: aponta o eixo osso->filho para uma direção). A boneca olha para +Z,
 * então +X do mundo é o lado ESQUERDO dela (`s = +1`). Roupas e cabelo seguem porque usam os mesmos ossos.
 */
export type PoseId = 'cintura' | 'cabelo' | 'vitoria'

export const POSE_LABEL: Record<PoseId, string> = { cintura: 'Mãos na cintura', cabelo: 'Charme no cabelo', vitoria: 'Braços para o alto' }

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
const sign = (s: Side) => (s === 'Left' ? 1 : -1)

function arm(bones: Record<string, Bone>, side: Side, upper: [number, number, number], fore: [number, number, number]) {
  const a = bones[`mixamorig${side}Arm`]
  const f = bones[`mixamorig${side}ForeArm`]
  const h = bones[`mixamorig${side}Hand`]
  if (!a || !f || !h) return
  const s = sign(side)
  aim(a, f, _t.set(s * upper[0], upper[1], upper[2]))
  aim(f, h, _t.set(s * fore[0], fore[1], fore[2]))
}

function leg(bones: Record<string, Bone>, side: Side, dir: [number, number, number]) {
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

/** Aplica a pose (os ossos já devem estar na pose de repouso). */
export function applyBonePose(id: PoseId, bones: Record<string, Bone>, root: Object3D) {
  root.updateWorldMatrix(true, true)
  if (id === 'cintura') {
    arm(bones, 'Left', [0.62, -0.7, -0.3], [-0.55, -0.55, 0.62])
    arm(bones, 'Right', [0.62, -0.7, -0.3], [-0.55, -0.55, 0.62])
    leg(bones, 'Left', [0.16, -0.98, 0.1])
    leg(bones, 'Right', [-0.1, -0.98, -0.05])
    tilt(bones.mixamorigHips, 'z', 0.07)
  } else if (id === 'cabelo') {
    arm(bones, 'Left', [0.78, 0.4, 0.05], [-0.62, 0.7, 0.35])
    arm(bones, 'Right', [0.62, -0.7, -0.3], [-0.55, -0.55, 0.62])
    leg(bones, 'Left', [-0.12, -0.98, 0.14])
    leg(bones, 'Right', [-0.14, -0.98, -0.05])
    tilt(bones.mixamorigHips, 'z', -0.06)
    tilt(bones.mixamorigHead, 'z', 0.12)
  } else {
    arm(bones, 'Left', [0.72, 0.6, 0.05], [0.45, 0.88, 0.1])
    arm(bones, 'Right', [0.72, 0.6, 0.05], [0.45, 0.88, 0.1])
    leg(bones, 'Left', [0.24, -0.97, 0])
    leg(bones, 'Right', [0.24, -0.97, 0])
    tilt(bones.mixamorigSpine1, 'x', -0.08)
  }
  root.updateWorldMatrix(true, true)
}
