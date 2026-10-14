import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { CAMERA_INPUT as K } from '../camera/config'
import { cameraIntent, isPointerClaimed } from './intent'

interface Ptr {
  id: number
  touch: boolean
  sx: number
  sy: number
  x: number
  y: number
  dragging: boolean
}

/**
 * Mouse / toque -> cameraIntent (nao renderiza nada).
 * - Mouse: arrastar com botao esquerdo ou direito gira. O esquerdo so comeca a girar apos passar
 *   de 6 px (para nao estragar o click-to-move); o direito gira de imediato.
 * - Roda do mouse: zoom. Um dedo arrastando: gira (mesmo limite de 6 px, para o toque ainda
 *   funcionar como click-to-move). Dois dedos: pinca = zoom.
 * - Ponteiros reservados por outro controle (claimPointer) sao ignorados.
 * Sem pointer lock (quebraria o click-to-move); usa pointer capture para o arrasto continuar
 * fora do canvas.
 */
export function CameraInput() {
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    const el = gl.domElement
    const ptrs = new Map<number, Ptr>()
    let pinchDist = 0

    const touches = () => {
      const out: Ptr[] = []
      ptrs.forEach((p) => {
        if (p.touch) out.push(p)
      })
      return out
    }
    const measurePinch = () => {
      const t = touches()
      return t.length >= 2 ? Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y) : 0
    }

    const onDown = (e: PointerEvent) => {
      if (isPointerClaimed(e.pointerId)) return
      const touch = e.pointerType !== 'mouse'
      if (!touch && e.button !== 0 && e.button !== 2) return
      if (!touch && ptrs.size > 0) return // um botao de mouse por vez
      ptrs.set(e.pointerId, {
        id: e.pointerId,
        touch,
        sx: e.clientX,
        sy: e.clientY,
        x: e.clientX,
        y: e.clientY,
        dragging: !touch && e.button === 2,
      })
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* ponteiro ja inativo */
      }
      if (touch) {
        const t = touches()
        if (t.length >= 2) t.forEach((p) => (p.dragging = true))
        pinchDist = measurePinch()
      }
      if (e.button === 2) e.preventDefault()
    }

    const onMove = (e: PointerEvent) => {
      const p = ptrs.get(e.pointerId)
      if (!p) return
      if (isPointerClaimed(e.pointerId)) {
        ptrs.delete(e.pointerId)
        return
      }
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY

      if (p.touch && touches().length >= 2) {
        const d = measurePinch()
        if (pinchDist > 1 && d > 1) cameraIntent.zoomDelta += Math.log(pinchDist / d) * K.pinchZoom
        pinchDist = d
        return
      }

      if (!p.dragging) {
        if (Math.hypot(p.x - p.sx, p.y - p.sy) <= K.dragThresholdPx) return
        p.dragging = true // comeca a girar a partir daqui (sem salto)
        el.style.cursor = 'grabbing'
        return
      }
      const s = p.touch ? K.touchRotate : K.mouseRotate
      cameraIntent.yawDelta -= dx * s
      cameraIntent.pitchDelta += dy * s
    }

    const onEnd = (e: PointerEvent) => {
      const p = ptrs.get(e.pointerId)
      if (!p) return
      ptrs.delete(e.pointerId)
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      if (ptrs.size === 0) el.style.cursor = ''
      if (p.touch) {
        pinchDist = measurePinch()
        // um dedo restante (apos pinca) continua girando, sem salto
        touches().forEach((t) => (t.dragging = true))
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1
      cameraIntent.zoomDelta += e.deltaY * unit * K.wheelZoom
    }
    const onContextMenu = (e: Event) => e.preventDefault()

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onEnd)
    el.addEventListener('pointercancel', onEnd)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('contextmenu', onContextMenu)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onEnd)
      el.removeEventListener('pointercancel', onEnd)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('contextmenu', onContextMenu)
      el.style.cursor = ''
    }
  }, [gl])

  return null
}
