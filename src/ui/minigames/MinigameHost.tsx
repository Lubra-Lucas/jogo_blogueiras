import { playEmote } from '../../game/character/animation/emoteStore'
import { useCafeStore } from '../../game/minigames/cafe/store'
import { useEffect } from 'react'
import { clearMoveTarget, setKeyboardAxis, setKeyboardCameraYaw, setStickAxis } from '../../game/input/intent'
import { useMinigameStore } from '../../game/minigames/minigameStore'
import { CafeGame } from './cafe/CafeGame'
import { DesfileGame } from './desfile/DesfileGame'

const DEV_OPEN = new URLSearchParams(window.location.search).get('minigame')

/**
 * Hospeda o minijogo aberto em tela cheia. Enquanto ha um aberto: o overlay cobre o canvas (nenhum
 * toque chega ao mundo), as teclas de jogo (WASD, Q/E, emotes...) sao engolidas na captura e o
 * movimento fica zerado. Ao sair tudo volta ao normal sozinho.
 * Dev: `?minigame=cafe` abre direto.
 */
export function MinigameHost() {
  const active = useMinigameStore((s) => s.active)

  useEffect(() => {
    if (DEV_OPEN === 'cafe') useMinigameStore.getState().open('cafe')
    if (DEV_OPEN === 'desfile') useMinigameStore.getState().open('desfile')
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

  if (active === 'cafe') {
    return (
      <CafeGame
        onExit={() => {
          // saiu com 2+ estrelas: a personagem no mundo agradece
          const stars = useCafeStore.getState().results?.stars ?? 0
          useMinigameStore.getState().close()
          if (stars >= 2) setTimeout(() => playEmote('thankful', { once: true, silent: true }), 500)
        }}
      />
    )
  }
  if (active === 'desfile') return <DesfileGame onExit={() => useMinigameStore.getState().close()} />
  return null
}
