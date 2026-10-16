import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D, SpotLight } from 'three'
import { usePlayerStore } from '../../state/playerStore'
import { useUiStore } from '../../state/uiStore'
import { useMinigameStore } from '../minigames/minigameStore'
import { env } from '../world/environment/envState'
import { carBySlug } from './catalog'
import { drive, driveBridge, useVehicleStore, type CarInst } from './driveStore'
import { enterCar, exitCar } from './enterExit'
import { DrivenCar } from './DrivenCar'
import { ParkedCar } from './ParkedCar'
import { VehicleCamera } from './VehicleCamera'
import { VehicleEffects } from './effects'
import { Knockables } from './Knockables'
import { GpsRoute } from './GpsRoute'
import { placeStartCars } from './spawn'
import { pad, kbd, resetInput, resolveInput, touch, vin } from './vehicleInput'
import { setRadioStation, vehicleAudio } from './vehicleAudio'
import { useCarAsset } from './useCarAsset'
import { useQualityShadows } from './useQuality'

const NEAR = 2.6 // m da borda do carro para aparecer "Dirigir"

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

/** Teclado de direcao (so quando dentro do carro) + F/V/R/K de qualquer lugar. */
function VehicleKeys() {
  useEffect(() => {
    const blocked = () => {
      const ui = useUiStore.getState()
      return ui.menuOpen || ui.chatOpen || !!useMinigameStore.getState().active
    }
    const setK = (code: string, down: boolean): boolean => {
      switch (code) {
        case 'KeyW':
        case 'ArrowUp':
          kbd.throttle = down ? 1 : 0
          return true
        case 'KeyS':
        case 'ArrowDown':
          kbd.brake = down ? 1 : 0
          return true
        case 'KeyA':
        case 'ArrowLeft':
          kbd.steer = down ? 1 : kbdRight ? -1 : 0
          kbdLeft = down
          return true
        case 'KeyD':
        case 'ArrowRight':
          kbd.steer = down ? -1 : kbdLeft ? 1 : 0
          kbdRight = down
          return true
        case 'Space':
          kbd.handbrake = down
          return true
        case 'ShiftLeft':
        case 'ShiftRight':
          kbd.boost = down
          return true
        case 'KeyH':
          kbd.horn = down
          return true
        case 'KeyB':
          kbd.lookBack = down
          return true
        default:
          return false
      }
    }
    let kbdLeft = false
    let kbdRight = false
    const onDown = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      const st = useVehicleStore.getState()
      if (e.code === 'KeyF' && !e.repeat) {
        if (blocked()) return
        if (st.drivingUid) exitCar()
        else if (st.nearbyUid) {
          enterCar(st.nearbyUid)
          vehicleAudio.door()
        }
        e.preventDefault()
        return
      }
      if (e.code === 'KeyK' && !e.repeat && !st.drivingUid && !blocked()) {
        st.setGarage(!st.garageOpen)
        return
      }
      if (!driveBridge.active) return
      if (e.code === 'KeyV' && !e.repeat) {
        st.cycleCam()
        return
      }
      if (e.code === 'KeyR' && !e.repeat) {
        const n = (st.station + 1) % 4
        st.setStation(n)
        setRadioStation(n)
        e.stopImmediatePropagation()
        return
      }
      if (e.code === 'Escape' && st.garageOpen) return
      if (setK(e.code, true)) {
        e.preventDefault()
        // WASD/Shift tambem andam a boneca: dirigindo, so o carro ouve
        e.stopImmediatePropagation()
        resolveInput()
      }
    }
    const onUp = (e: KeyboardEvent) => {
      if (setK(e.code, false)) resolveInput()
    }
    const reset = () => {
      kbdLeft = kbdRight = false
      resetInput()
    }
    window.addEventListener('keydown', onDown, true)
    window.addEventListener('keyup', onUp, true)
    window.addEventListener('blur', reset)
    return () => {
      window.removeEventListener('keydown', onDown, true)
      window.removeEventListener('keyup', onUp, true)
      window.removeEventListener('blur', reset)
      reset()
    }
  }, [])
  return null
}

/** Gamepad opcional: gatilhos = acelerar/frear, analogico esquerdo = direcao, A = nitro, B/RB = freio de mao, X = buzina, Y = sair. */
function usePad() {
  const prevY = useRef(false)
  useFrame(() => {
    const gp = navigator.getGamepads?.().find((g) => g && g.connected)
    if (!gp || !driveBridge.active) {
      if (pad.throttle || pad.brake || pad.steer) Object.assign(pad, { throttle: 0, brake: 0, steer: 0, handbrake: false, boost: false, horn: false })
      return
    }
    const ax = gp.axes[0] ?? 0
    pad.steer = Math.abs(ax) > 0.12 ? -ax : 0
    pad.throttle = gp.buttons[7]?.value ?? 0
    pad.brake = gp.buttons[6]?.value ?? 0
    pad.boost = !!gp.buttons[0]?.pressed
    pad.handbrake = !!(gp.buttons[1]?.pressed || gp.buttons[5]?.pressed)
    pad.horn = !!gp.buttons[2]?.pressed
    const y = !!gp.buttons[3]?.pressed
    if (y && !prevY.current) exitCar()
    prevY.current = y
  })
}

/** Mais proximo carro ao alcance (distancia a caixa orientada). */
function nearestCar(cars: CarInst[], px: number, pz: number): string | null {
  let best: string | null = null
  let bd = NEAR
  for (const c of cars) {
    const dx = px - c.x
    const dz = pz - c.z
    const sn = Math.sin(c.yaw)
    const cs = Math.cos(c.yaw)
    const lx = dx * cs - dz * sn
    const lz = dx * sn + dz * cs
    const spec = carBySlug(c.slug)
    const halfW = spec.slug === 'van' ? 1.0 : 0.95
    const halfL = spec.slug === 'compacto' ? 1.8 : 2.4
    const d = Math.hypot(Math.max(Math.abs(lx) - halfW, 0), Math.max(Math.abs(lz) - halfL, 0))
    if (d < bd) {
      bd = d
      best = c.uid
    }
  }
  return best
}

function CarSlot({ inst, driven, shadows }: { inst: CarInst; driven: boolean; shadows: boolean }) {
  const asset = useCarAsset(inst.slug)
  if (!asset) return null
  return driven ? <DrivenCar inst={inst} asset={asset} shadows={shadows} /> : <ParkedCar inst={inst} asset={asset} shadows={shadows} />
}

/** Farois sempre montados (numero de luzes constante evita recompilar shaders ao entrar no carro). */
function Headlights() {
  const L = useMemo(() => {
    const mk = () => {
      const l = new SpotLight('#fff1d2', 0, 34, 0.55, 0.55, 1.4)
      l.castShadow = false
      const t = new Object3D()
      l.target = t
      return { l, t }
    }
    return [mk(), mk()]
  }, [])
  useFrame(() => {
    const on = driveBridge.active && drive.lights
    for (let i = 0; i < 2; i++) {
      const { l, t } = L[i]
      if (!on) {
        l.intensity = 0
        continue
      }
      const side = i === 0 ? 1 : -1
      const sn = Math.sin(drive.yaw)
      const cs = Math.cos(drive.yaw)
      l.position.set(drive.pos.x + sn * 1.8 + cs * 0.6 * side, drive.pos.y + 0.15, drive.pos.z + cs * 1.8 - sn * 0.6 * side)
      t.position.set(drive.pos.x + sn * 14 + cs * 0.4 * side, 0, drive.pos.z + cs * 14 - sn * 0.4 * side)
      t.updateMatrixWorld()
      l.intensity = 38 * Math.max(0.5, env.night)
    }
  })
  return (
    <>
      {L.map((x, i) => (
        <group key={i}>
          <primitive object={x.l} />
          <primitive object={x.t} />
        </group>
      ))}
    </>
  )
}

/** Dentro do <Physics>: carros, entrada/saida, camera, efeitos, objetos derrubaveis, GPS, audio. */
export function VehicleSystem() {
  const cars = useVehicleStore((s) => s.cars)
  const drivingUid = useVehicleStore((s) => s.drivingUid)
  const shadows = useQualityShadows()
  usePad()
  useEffect(() => {
    // dev/testes: window.__veh (estado dos carros)
    if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('cars')) (window as unknown as Record<string, unknown>).__veh = { store: useVehicleStore, drive, bridge: driveBridge, enterCar, exitCar, vin, kbd }
  }, [])

  // carros iniciais: espera as colisoes da cidade existirem
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (useVehicleStore.getState().cars.length === 0) placeStartCars()
    }, 900)
    return () => {
      window.clearTimeout(t)
      useVehicleStore.setState({ cars: [], drivingUid: null, nearbyUid: null })
      driveBridge.active = false
    }
  }, [])

  // "Dirigir [F]": a ~8 Hz acha o carro mais proximo
  const acc = useRef(0)
  useFrame((_, dt) => {
    acc.current += dt
    if (acc.current >= 0.12) {
      acc.current = 0
      const st = useVehicleStore.getState()
      let near: string | null = null
      if (!st.drivingUid) {
        const p = usePlayerStore.getState().position
        near = nearestCar(st.cars, p.x, p.z)
      }
      if (near !== st.nearbyUid) useVehicleStore.setState({ nearbyUid: near })
    }
    // audio do motor
    if (driveBridge.active) vehicleAudio.update(drive.rpm, drive.throttle, Math.abs(drive.speed))
  })

  // reset do toque ao sair
  useEffect(() => {
    if (!drivingUid) {
      Object.assign(touch, { throttle: 0, brake: 0, steer: 0, handbrake: false, boost: false, horn: false, lookBack: false })
      resetInput()
    }
  }, [drivingUid])

  return (
    <>
      <VehicleKeys />
      {cars.map((c) => (
        <CarSlot key={c.uid} inst={c} driven={c.uid === drivingUid} shadows={shadows} />
      ))}
      <VehicleCamera />
      <VehicleEffects />
      <Headlights />
      <GpsRoute />
      <Knockables />
    </>
  )
}
