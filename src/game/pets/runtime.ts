/** Estado mutavel do pet em cena (lido pela UI e por outros sistemas, sem re-render). */
export const petRuntime = {
  id: '' as string,
  x: 0,
  z: 0,
  /** distancia ate a jogadora (m) */
  dist: 99,
  height: 0.4,
}
