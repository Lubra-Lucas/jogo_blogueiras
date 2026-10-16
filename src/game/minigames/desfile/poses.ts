import { POSE_LABEL, type PoseId } from './bonePoses'

/** Poses seguradas no fim da passarela (por ossos, ver bonePoses.ts), na ordem das 3 batidas. */
export const POSE_FRAMES: { id: PoseId; name: string }[] = (['cintura', 'cabelo', 'vitoria'] as const).map((id) => ({ id, name: POSE_LABEL[id] }))
