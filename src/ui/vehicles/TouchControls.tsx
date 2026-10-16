import { useEffect, useRef } from 'react'
import { claimPointer, releasePointer } from '../../game/input/intent'
import { touch, resolveInput } from '../../game/vehicles/vehicleInput'
import { exitCar } from '../../game/vehicles/enterExit'
import { setRadioStation } from '../../game/vehicles/vehicleAudio'
import { useVehicleStore } from '../../game/vehicles/driveStore'

type Flag = 'throttle' | 'brake' | 'handbrake' | 'boost' | 'horn'

/** Botao segurado (pedais, freio de mao, nitro, buzina). */
function Hold({ flag, cls, children, label }: { flag: Flag; cls: string; children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const el = ref.current!
    let id: number | null = null
    const set = (v: boolean) => {
      if (flag === 'throttle' || flag === 'brake') touch[flag] = v ? 1 : 0
      else touch[flag] = v
      resolveInput()
      el.classList.toggle('on', v)
    }
    const down = (e: PointerEvent) => {
      if (id !== null) return
      e.preventDefault()
      id = e.pointerId
      claimPointer(id)
      try {
        el.setPointerCapture(id)
      } catch {
        /* ponteiro inativo */
      }
      set(true)
    }
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return
      releasePointer(id)
      id = null
      set(false)
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('lostpointercapture', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('lostpointercapture', up)
      if (id !== null) releasePointer(id)
      set(false)
    }
  }, [flag])
  return (
    <button ref={ref} type="button" className={`tc-btn ${cls}`} aria-label={label}>
      {children}
    </button>
  )
}

/** Volante virtual: arraste na area da esquerda; o desvio horizontal vira a direcao (-1..1). */
function Wheel() {
  const zone = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const z = zone.current!
    const k = knob.current!
    let id: number | null = null
    let cx = 0
    const R = 70
    const set = (v: number) => {
      touch.steer = -v // arrastar para a direita = virar a direita (steer negativo)
      resolveInput()
      k.style.transform = `translateX(${v * R}px) rotate(${v * 55}deg)`
    }
    const down = (e: PointerEvent) => {
      if (id !== null) return
      e.preventDefault()
      id = e.pointerId
      claimPointer(id)
      cx = e.clientX
      try {
        z.setPointerCapture(id)
      } catch {
        /* ignore */
      }
      z.classList.add('on')
    }
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return
      const v = Math.max(-1, Math.min(1, (e.clientX - cx) / R))
      set(Math.abs(v) < 0.06 ? 0 : v)
    }
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return
      releasePointer(id)
      id = null
      z.classList.remove('on')
      set(0)
    }
    z.addEventListener('pointerdown', down)
    z.addEventListener('pointermove', move)
    z.addEventListener('pointerup', up)
    z.addEventListener('pointercancel', up)
    return () => {
      z.removeEventListener('pointerdown', down)
      z.removeEventListener('pointermove', move)
      z.removeEventListener('pointerup', up)
      z.removeEventListener('pointercancel', up)
      if (id !== null) releasePointer(id)
      set(0)
    }
  }, [])
  return (
    <div ref={zone} className="tc-wheel" aria-label="Direção">
      <div ref={knob} className="tc-wheel__knob">
        <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden>
          <circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeWidth="5" />
          <circle cx="32" cy="32" r="6" fill="currentColor" />
          <path d="M32 32 L8 36 M32 32 L56 36 M32 32 L32 58" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
      <span className="tc-wheel__hint">Arraste</span>
    </div>
  )
}

const I = {
  gas: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 4v13M6 11l6-7 6 7" />
    </svg>
  ),
  brake: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20V7M6 13l6 7 6-7" />
    </svg>
  ),
}

/** Controles de toque: volante (esquerda), pedais e botoes (direita), atalhos (camera, radio, buzina, sair). */
export function TouchControls() {
  const station = useVehicleStore((s) => s.station)
  const camMode = useVehicleStore((s) => s.camMode)
  return (
    <div className="tc">
      <Wheel />
      <div className="tc-right">
        <div className="tc-row">
          <Hold flag="handbrake" cls="tc-small" label="Freio de mão">
            <b>Freio</b>
            <i>de mão</i>
          </Hold>
          <Hold flag="boost" cls="tc-small tc-boost" label="Nitro">
            <b>Nitro</b>
          </Hold>
        </div>
        <div className="tc-row">
          <Hold flag="brake" cls="tc-pedal tc-brake" label="Frear / ré">
            {I.brake}
            <i>Freio</i>
          </Hold>
          <Hold flag="throttle" cls="tc-pedal tc-gas" label="Acelerar">
            {I.gas}
            <i>Acelerar</i>
          </Hold>
        </div>
      </div>
      <div className="tc-side">
        <button type="button" className="tc-mini" onClick={exitCar} aria-label="Sair do carro">
          Sair
        </button>
        <button type="button" className="tc-mini" onClick={() => useVehicleStore.getState().cycleCam()} aria-label="Trocar câmera">
          Câmera {camMode + 1}
        </button>
        <button
          type="button"
          className={`tc-mini${station ? ' on' : ''}`}
          onClick={() => {
            const n = (station + 1) % 4
            useVehicleStore.getState().setStation(n)
            setRadioStation(n)
          }}
          aria-label="Rádio"
        >
          Rádio
        </button>
        <Hold flag="horn" cls="tc-mini" label="Buzina">
          Buzina
        </Hold>
      </div>
    </div>
  )
}
