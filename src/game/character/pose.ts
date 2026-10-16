import { Quaternion, Vector3, type Bone, type Object3D } from 'three'

/**
 * Pose de repouso: a boneca vem em A-pose (bracos ~42 graus do corpo); aqui os bracos descem para ~12 graus
 * do corpo, com cotovelo levemente dobrado. E feita no espaco do mundo (rotaciona cada osso ate a direcao
 * desejada), entao independe dos eixos locais dos ossos. A etapa de animacao substitui esta funcao
 * (ou parte do clipe de idle).
 */
const _a = new Vector3()
const _b = new Vector3()
const _d = new Vector3()
const _t = new Vector3()
const _q = new Quaternion()
const _wq = new Quaternion()
const _pq = new Quaternion()

/** Gira `bone` (no mundo) para que o eixo osso->filho aponte para `dir` (normalizado). */
function aim(bone: Bone, child: Bone, dir: Vector3) {
  bone.updateWorldMatrix(true, false)
  child.updateWorldMatrix(true, false)
  bone.getWorldPosition(_a)
  child.getWorldPosition(_b)
  _d.subVectors(_b, _a).normalize()
  _q.setFromUnitVectors(_d, dir)
  bone.getWorldQuaternion(_wq).premultiply(_q)
  bone.parent!.getWorldQuaternion(_pq)
  bone.quaternion.copy(_pq.invert().multiply(_wq))
  bone.updateWorldMatrix(false, true)
}

/** Bracos: angulo do braco em relacao ao corpo (graus) e dobra do antebraco. */
export const REST_POSE = { armAngleDeg: 12, forearmInDeg: 4, forearmForward: 0.28 }

export function applyRestPose(bones: Record<string, Bone>, root: Object3D) {
  root.updateWorldMatrix(true, true)
  const a = (REST_POSE.armAngleDeg * Math.PI) / 180
  for (const side of ['Left', 'Right'] as const) {
    const arm = bones[`mixamorig${side}Arm`]
    const fore = bones[`mixamorig${side}ForeArm`]
    const hand = bones[`mixamorig${side}Hand`]
    if (!arm || !fore || !hand) continue
    // +X do mundo e o lado esquerdo da personagem (ela olha para +Z)
    const s = side === 'Left' ? 1 : -1
    aim(arm, fore, _t.set(s * Math.sin(a), -Math.cos(a), -0.02).normalize())
    const fi = (REST_POSE.forearmInDeg * Math.PI) / 180
    aim(fore, hand, _t.set(s * Math.sin(a - fi), -0.94, REST_POSE.forearmForward).normalize())
  }
}
