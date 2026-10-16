import { create } from 'zustand'
import { clearMoveTarget } from '../input/intent'
import { isFree } from '../navigation/probe'
import { navBridge } from '../navigation/navStore'
import { usePlayerStore } from '../../state/playerStore'
import { drive, driveBridge, useVehicleStore } from './driveStore'
import { resetInput } from './vehicleInput'

/** Contador da transicao (fade curto) ao entrar/sair do carro. */
export const useCarFade = create<{ n: number }>()(() => ({ n: 0 }))
const bump = () => useCarFade.setState((s) => ({ n: s.n + 1 }))

type Listener = () => void
const listeners = new Set<Listener>()
export interface ExitInfo {
  x: number
  z: number
  yaw: number
  halfW: number
  halfL: number
}

/** Pedido de saida: o carro freia e, ao parar, chama `finish` com a pose. */
export const requestExit = {
  subscribe(fn: Listener) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
  trigger() {
    listeners.forEach((l) => l())
  },
  finish(info: ExitInfo) {
    finishExit(info)
  },
}

/** Sobe no carro `uid`. */
export function enterCar(uid: string) {
  const st = useVehicleStore.getState()
  const inst = st.cars.find((c) => c.uid === uid)
  if (!inst || st.drivingUid) return
  resetInput()
  clearMoveTarget()
  bump()
  driveBridge.active = true
  driveBridge.yaw = inst.yaw
  driveBridge.seatPos.set(inst.x, 0.8, inst.z)
  drive.speed = 0
  useVehicleStore.setState({ drivingUid: uid, nearbyUid: null, garageOpen: false })
}

/** Comeca a sair (freia e sai). */
export function exitCar() {
  if (!useVehicleStore.getState().drivingUid) return
  requestExit.trigger()
}

function finishExit(info: ExitInfo) {
  const st = useVehicleStore.getState()
  const uid = st.drivingUid
  if (!uid) return
  const sn = Math.sin(info.yaw)
  const cs = Math.cos(info.yaw)
  // local (x esquerda, z frente) -> mundo
  const at = (lx: number, lz: number): [number, number] => [info.x + lx * cs + lz * sn, info.z - lx * sn + lz * cs]
  const cand: Array<[number, number]> = [
    at(info.halfW + 0.95, 0.2),
    at(-(info.halfW + 0.95), 0.2),
    at(info.halfW + 0.95, -1.2),
    at(0, -(info.halfL + 1.1)),
    at(info.halfW + 1.8, 0.2),
    at(-(info.halfW + 1.8), 0.2),
    at(0, info.halfL + 1.1),
  ]
  let spot = cand[0]
  for (const c of cand) {
    if (isFree(c[0], c[1], 0.33)) {
      spot = c
      break
    }
  }
  st.patchCar(uid, { x: info.x, z: info.z, yaw: info.yaw })
  bump()
  driveBridge.active = false
  driveBridge.exitAt = { x: spot[0], z: spot[1], yaw: info.yaw + Math.PI / 2 }
  navBridge.cameraSnap = info.yaw + Math.PI
  usePlayerStore.getState().position.set(spot[0], 0.9, spot[1])
  resetInput()
  useVehicleStore.setState({ drivingUid: null })
}
