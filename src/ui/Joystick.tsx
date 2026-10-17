import { useEffect, useRef } from 'react'
import { claimPointer, releasePointer, setStickAxis } from '../game/input/intent'
import { uiScale, useUiPrefs } from './uiPrefs'

const BASE_R0 = 58 // raio da base (px) em tamanho M
const DEAD = 0.12
const RUN_ON = 0.85
const RUN_OFF = 0.78

/**
 * Joystick virtual, dois modos (Ajustes > Interface):
 * - fixo: a base fica sempre no canto inferior esquerdo; so o toque sobre ela (com folga) o aciona, o resto da tela
 *   e da camera/toque no chao;
 * - dinamico: a base aparece sob o dedo dentro da zona (40% esquerdo, 65% de baixo).
 * Reserva o ponteiro (claimPointer) para a camera e o click-to-move ignorarem aquele dedo.
 * Atualiza o DOM direto (sem re-render por movimento).
 */
export function Joystick() {
  const zone = useRef<HTMLDivElement>(null)
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const mode = useUiPrefs((p) => p.joy)
  const size = useUiPrefs((p) => p.size)

  useEffect(() => {
    const BASE_R = BASE_R0 * uiScale(size)
    const fixed = mode === 'fixed'
    const z = zone.current!
    const b = base.current!
    const k = knob.current!
    let id: number | null = null
    let cx = 0
    let cy = 0
    let run = false

    const setKnob = (x: number, y: number) => {
      k.style.transform = `translate(${x}px, ${y}px)`
    }
    const end = () => {
      if (id === null) return
      releasePointer(id)
      id = null
      run = false
      setStickAxis(0, 0, false)
      b.classList.remove('joy-base--active', 'joy-base--run')
      if (!fixed) {
        b.style.left = ''
        b.style.top = ''
      }
      setKnob(0, 0)
    }
    const update = (px: number, py: number) => {
      const dx = px - cx
      const dy = py - cy
      const len = Math.hypot(dx, dy)
      const norm = Math.min(len / BASE_R, 1)
      const kk = len > BASE_R ? BASE_R / len : 1
      setKnob(dx * kk, dy * kk)
      run = norm > (run ? RUN_OFF : RUN_ON)
      b.classList.toggle('joy-base--run', run)
      const m = norm < DEAD ? 0 : run ? 1 : (norm - DEAD) / (1 - DEAD)
      const ux = len > 0 ? dx / len : 0
      const uy = len > 0 ? dy / len : 0
      setStickAxis(ux * m, -uy * m, run)
    }

    const onDown = (e: PointerEvent) => {
      if (id !== null || e.pointerType === 'mouse') return
      e.preventDefault()
      id = e.pointerId
      claimPointer(id)
      try {
        z.setPointerCapture(id)
      } catch {
        /* ponteiro ja inativo */
      }
      const r = z.getBoundingClientRect()
      if (fixed) {
        const br = b.getBoundingClientRect()
        cx = br.left + br.width / 2
        cy = br.top + br.height / 2
      } else {
        cx = Math.min(Math.max(e.clientX, r.left + BASE_R), r.right - BASE_R)
        cy = Math.min(Math.max(e.clientY, r.top + BASE_R), r.bottom - BASE_R)
        b.style.left = `${cx - r.left - BASE_R}px`
        b.style.top = `${cy - r.top - BASE_R}px`
      }
      b.classList.add('joy-base--active')
      update(e.clientX, e.clientY)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId === id) update(e.clientX, e.clientY)
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === id) end()
    }

    z.addEventListener('pointerdown', onDown)
    z.addEventListener('pointermove', onMove)
    z.addEventListener('pointerup', onUp)
    z.addEventListener('pointercancel', onUp)
    z.addEventListener('lostpointercapture', onUp)
    window.addEventListener('blur', end)
    window.addEventListener('resize', end)
    return () => {
      z.removeEventListener('pointerdown', onDown)
      z.removeEventListener('pointermove', onMove)
      z.removeEventListener('pointerup', onUp)
      z.removeEventListener('pointercancel', onUp)
      z.removeEventListener('lostpointercapture', onUp)
      window.removeEventListener('blur', end)
      window.removeEventListener('resize', end)
      end()
    }
  }, [mode, size])

  return (
    <div ref={zone} className={`joy-zone joy-zone--${mode}`}>
      <div ref={base} className="joy-base">
        <div ref={knob} className="joy-knob" />
      </div>
    </div>
  )
}
