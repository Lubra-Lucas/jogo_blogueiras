import { create } from 'zustand'

export interface NavState {
  active: boolean
  /** id do destino (POI/area) ou null quando e so um clique no chao */
  targetId: string | null
  targetName: string | null
  /** pontos do caminho [x, z] (sem a posicao inicial) */
  waypoints: [number, number][]
  /** 0..1 */
  progress: number
  /** opacidade do fade branco do fast travel (0 ou 1; a transicao e CSS) */
  fade: number
}

export const navStore = create<NavState>()(() => ({
  active: false,
  targetId: null,
  targetName: null,
  waypoints: [],
  progress: 0,
  fade: 0,
}))

/** Estado mutavel compartilhado com o PlayerController / camera (lido dentro do useFrame). */
export const navBridge = {
  /** teletransporte pedido (consumido pelo PlayerController) */
  teleport: null as { x: number; z: number; yaw: number | null } | null,
  /** yaw da camera a aplicar no proximo frame (atras da jogadora); null = nada */
  cameraSnap: null as number | null,
  /** yaw para onde a jogadora deve se virar ao parar (rad); null = nada */
  faceYaw: null as number | null,
}
