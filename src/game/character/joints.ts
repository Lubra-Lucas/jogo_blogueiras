/** Juntas do rig rigido (estilo R15). Hierarquia e offsets locais de repouso. */
export const JOINT_NAMES = [
  'root',
  'hips',
  'spine',
  'neck',
  'head',
  'shoulderL',
  'shoulderR',
  'upperArmL',
  'upperArmR',
  'elbowL',
  'elbowR',
  'lowerArmL',
  'lowerArmR',
  'wristL',
  'wristR',
  'handL',
  'handR',
  'hipL',
  'hipR',
  'upperLegL',
  'upperLegR',
  'kneeL',
  'kneeR',
  'lowerLegL',
  'lowerLegR',
  'ankleL',
  'ankleR',
  'footL',
  'footR',
] as const

export type JointName = (typeof JOINT_NAMES)[number]

/** Pai de cada junta (root nao tem). */
export const JOINT_PARENT: Record<JointName, JointName | null> = {
  root: null,
  hips: 'root',
  spine: 'hips',
  neck: 'spine',
  head: 'neck',
  shoulderL: 'spine',
  shoulderR: 'spine',
  upperArmL: 'shoulderL',
  upperArmR: 'shoulderR',
  elbowL: 'upperArmL',
  elbowR: 'upperArmR',
  lowerArmL: 'elbowL',
  lowerArmR: 'elbowR',
  wristL: 'lowerArmL',
  wristR: 'lowerArmR',
  handL: 'wristL',
  handR: 'wristR',
  hipL: 'hips',
  hipR: 'hips',
  upperLegL: 'hipL',
  upperLegR: 'hipR',
  kneeL: 'upperLegL',
  kneeR: 'upperLegR',
  lowerLegL: 'kneeL',
  lowerLegR: 'kneeR',
  ankleL: 'lowerLegL',
  ankleR: 'lowerLegR',
  footL: 'ankleL',
  footR: 'ankleR',
}

/** Medidas (m). Corpo ~1,745 m sem cabelo, pes em y=0, olhando para +Z. */
export const BODY = {
  hipsY: 0.93, // altura da junta hips (centro da pelve)
  waistUp: 0.075, // hips -> spine
  neckUp: 0.36, // spine -> neck (base do pescoco)
  headUp: 0.055, // neck -> head (topo do pescoco)
  headCenter: 0.17, // head -> centro da cabeca
  shoulderX: 0.12,
  shoulderUp: 0.3, // spine -> ombro
  armX: 0.04, // shoulder -> upperArm
  upperArm: 0.27,
  lowerArm: 0.24,
  hipX: 0.075,
  hipDown: 0.03,
  upperLeg: 0.42,
  lowerLeg: 0.38,
  ankleY: 0.1, // altura do tornozelo (salto alto)
} as const

/** Elipsoide da cabeca (m). */
export const HEAD = { rx: 0.148, ry: 0.158, rz: 0.15 } as const

/** Offset local de cada junta em relacao ao pai, na pose de repouso. */
export const JOINT_OFFSET: Record<JointName, readonly [number, number, number]> = {
  root: [0, 0, 0],
  hips: [0, BODY.hipsY, 0],
  spine: [0, BODY.waistUp, 0],
  neck: [0, BODY.neckUp, 0],
  head: [0, BODY.headUp, 0],
  shoulderL: [BODY.shoulderX, BODY.shoulderUp, 0],
  shoulderR: [-BODY.shoulderX, BODY.shoulderUp, 0],
  upperArmL: [BODY.armX, 0, 0],
  upperArmR: [-BODY.armX, 0, 0],
  elbowL: [0, -BODY.upperArm, 0],
  elbowR: [0, -BODY.upperArm, 0],
  lowerArmL: [0, 0, 0],
  lowerArmR: [0, 0, 0],
  wristL: [0, -BODY.lowerArm, 0],
  wristR: [0, -BODY.lowerArm, 0],
  handL: [0, 0, 0],
  handR: [0, 0, 0],
  hipL: [BODY.hipX, -BODY.hipDown, 0],
  hipR: [-BODY.hipX, -BODY.hipDown, 0],
  upperLegL: [0, 0, 0],
  upperLegR: [0, 0, 0],
  kneeL: [0, -BODY.upperLeg, 0],
  kneeR: [0, -BODY.upperLeg, 0],
  lowerLegL: [0, 0, 0],
  lowerLegR: [0, 0, 0],
  ankleL: [0, -BODY.lowerLeg, 0],
  ankleR: [0, -BODY.lowerLeg, 0],
  footL: [0, 0, 0],
  footR: [0, 0, 0],
}

/** Pose de repouso estatica (Euler XYZ, rad): A-pose relaxada. O passo 5b anima a partir daqui. */
export const REST_POSE: Partial<Record<JointName, readonly [number, number, number]>> = {
  head: [0.03, -0.05, 0.04],
  upperArmL: [0.05, 0, 0.3],
  upperArmR: [-0.04, 0, -0.32],
  elbowL: [-0.3, 0, 0],
  elbowR: [-0.5, 0, 0],
  wristL: [0, 0, 0.1],
  wristR: [-0.1, 0.45, -0.18],
  hipL: [0, 0, -0.015],
  hipR: [0, 0, 0.015],
  ankleL: [0, 0.12, 0],
  ankleR: [0, -0.12, 0],
}
