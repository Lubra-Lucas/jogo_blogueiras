import type { Resolved } from './resolve'

/** Estado mutavel lido nos useFrame (camera, navegacao). Arquivo leve: sem dependencias de runtime. */
export const interiorBridge = {
  active: false,
  /** pe-direito da sala atual (m) */
  ceiling: 3.2,
  /** distancia maxima da camera */
  maxDist: 4.4,
  /** zoom inicial a aplicar no proximo frame da camera (consumido) */
  snapZoom: null as number | null,
  /** sala resolvida atual */
  room: null as Resolved | null,
  /** posicao da porta na cidade (minimapa) enquanto dentro */
  mapPos: null as { x: number; z: number } | null,
  /** dev/capturas: camera livre [x,y,z, alvoX,alvoY,alvoZ] em coordenadas locais da sala; null = normal */
  overview: null as number[] | null,
}
