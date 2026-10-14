import { Group } from 'three'
import { JOINT_NAMES, JOINT_OFFSET, JOINT_PARENT, REST_POSE, type JointName } from './joints'

/**
 * Rig rigido (sem SkinnedMesh): hierarquia de `Group`s, uma por junta, com o pivo na junta.
 * Cada parte do corpo/roupa e uma malha filha da junta; animar = girar as juntas.
 * `root` tem os pes em y=0 e olha para +Z.
 */
export interface CharacterRig {
  root: Group
  joints: Record<JointName, Group>
}

export function createRig(): CharacterRig {
  const joints = {} as Record<JointName, Group>
  for (const name of JOINT_NAMES) {
    const g = new Group()
    g.name = name
    const o = JOINT_OFFSET[name]
    g.position.set(o[0], o[1], o[2])
    joints[name] = g
  }
  for (const name of JOINT_NAMES) {
    const parent = JOINT_PARENT[name]
    if (parent) joints[parent].add(joints[name])
  }
  applyRestPose({ root: joints.root, joints })
  return { root: joints.root, joints }
}

/** Volta todas as juntas a pose de repouso (A-pose relaxada). */
export function applyRestPose(rig: CharacterRig): void {
  for (const name of JOINT_NAMES) {
    const r = REST_POSE[name]
    if (r) rig.joints[name].rotation.set(r[0], r[1], r[2])
    else rig.joints[name].rotation.set(0, 0, 0)
  }
}
