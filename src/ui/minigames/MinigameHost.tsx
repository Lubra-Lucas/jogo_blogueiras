import { Suspense, useEffect } from 'react'
import { clearMoveTarget, setKeyboardAxis, setKeyboardCameraYaw, setStickAxis } from '../../game/input/intent'
import { useMinigameStore } from '../../game/minigames/minigameStore'
import { getMinigame } from './registry'

const DEV_OPEN = new URLSearchParams(window.location.search).get('minigame')

/**
 * Hospeda o minijogo aberto em tela cheia. Enquanto ha um aberto: o overlay cobre o canvas (nenhum
 * toque chega ao mundo), as teclas de jogo (WASD, Q/E, emotes...) sao engolidas na captura e o
 * movimento fica zerado. Ao sair tudo volta ao normal sozinho.
 * Dev: `?minigame=<id>` abre direto. Minijogos vêm do registro (./registry.ts).
 */
export function MinigameHost() {
  const active = useMinigameStore((s) => s.active)

  useEffect(() => {
    if (DEV_OPEN && getMinigame(DEV_OPEN)) useMinigameStore.getState().open(DEV_OPEN)
  }, [])

  useEffect(() => {
    if (!active) return
    const swallow = (e: KeyboardEvent) => {
      // Esc/numeros/etc. chegam aos atalhos do proprio minijogo (mesmo alvo, ja registrados antes);
      // o resto do jogo nao ve nenhuma tecla pressionada.
      e.stopPropagation()
    }
    const stop = () => {
      setKeyboardAxis(0, 0, false)
      setStickAxis(0, 0, false)
      setKeyboardCameraYaw(0)
      clearMoveTarget()
    }
    window.addEventListener('keydown', swallow, true)
    const timer = window.setInterval(stop, 120)
    stop()
    return () => {
      window.removeEventListener('keydown', swallow, true)
      window.clearInterval(timer)
      stop()
    }
  }, [active])

  const def = getMinigame(active)
  if (!def) return null
  const Game = def.component
  return (
    <Suspense fallback={null}>
      <Game
        onExit={() => {
          useMinigameStore.getState().close()
          def.afterExit?.()
        }}
      />
    </Suspense>
  )
}
