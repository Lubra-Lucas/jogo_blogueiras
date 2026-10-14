import { useEffect } from 'react'
import { setKeyboardAxis } from './intent'

const KEY_MAP: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
}

/** Teclado (WASD / setas, Shift = correr) -> intencao. Nao renderiza nada. */
export function KeyboardInput() {
  useEffect(() => {
    const down = { up: false, down: false, left: false, right: false }
    let shift = false

    const apply = () => {
      const x = (down.right ? 1 : 0) - (down.left ? 1 : 0)
      const y = (down.up ? 1 : 0) - (down.down ? 1 : 0)
      setKeyboardAxis(x, y, shift)
    }
    const reset = () => {
      down.up = down.down = down.left = down.right = false
      shift = false
      apply()
    }
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target
      return t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      const dir = KEY_MAP[e.code]
      if (dir) e.preventDefault()
      if (e.repeat) return
      if (dir) down[dir] = true
      else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shift = true
      else return
      apply()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.code]
      if (dir) down[dir] = false
      else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shift = false
      else return
      apply()
    }
    const onVisibility = () => {
      if (document.hidden) reset()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', reset)
      document.removeEventListener('visibilitychange', onVisibility)
      reset()
    }
  }, [])
  return null
}
