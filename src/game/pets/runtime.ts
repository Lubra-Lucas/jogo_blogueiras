/** Estado mutavel do pet em cena (lido pela UI e por outros sistemas, sem re-render). */
export const petRuntime = {
  id: '' as string,
  x: 0,
  z: 0,
  /** distancia ate a jogadora (m) */
  dist: 99,
  height: 0.4,
  /** modo e clipe atuais (depuracao) */
  mode: 'follow' as string,
  clip: 'idle' as string,
  /** posicao do corpo do pet na tela (px CSS, so com ?petdebug=1) */
  sx: 0,
  sy: 0,
}
if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('petdebug')) (window as unknown as { __petRt: typeof petRuntime }).__petRt = petRuntime
