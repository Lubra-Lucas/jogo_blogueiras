import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { findPath } from '../navigation/pathfinder'
import { resolveDestination } from '../navigation/destinations'
import { cancelNavigation } from '../navigation/navigation'
import { navStore } from '../navigation/navStore'
import { drive, driveBridge, useVehicleStore } from './driveStore'

/**
 * GPS do carro: ao pedir "Ir ate la" no celular dirigindo, o caminho a pe e cancelado e vira uma linha de rota na pista
 * (pathfinder da navegacao, somente leitura). Recalcula a ~0,8 Hz e some ao chegar a menos de 12 m.
 */
export function GpsRoute() {
  const [pts, setPts] = useState<[number, number, number][] | null>(null)
  const acc = useRef(0)
  const lastDest = useRef<string | null>(null)

  useFrame((_, dt) => {
    const st = useVehicleStore.getState()
    // pedido de navegacao a pe feito dentro do carro vira GPS
    if (driveBridge.active) {
      const ns = navStore.getState()
      if (ns.active && ns.targetId) {
        st.setGps(ns.targetId, ns.targetName)
        cancelNavigation()
      }
    }
    const id = st.gpsTo
    if (!id || !driveBridge.active) {
      if (pts) setPts(null)
      lastDest.current = null
      return
    }
    acc.current += dt
    if (acc.current < 0.8 && lastDest.current === id) return
    acc.current = 0
    lastDest.current = id
    const d = resolveDestination(id)
    if (!d) return
    const dist = Math.hypot(d.x - drive.pos.x, d.z - drive.pos.z)
    if (dist < 12) {
      st.setGps(null)
      setPts(null)
      return
    }
    const path = findPath(drive.pos.x, drive.pos.z, d.x, d.z)
    if (!path || path.length === 0) {
      setPts([
        [drive.pos.x, 0.2, drive.pos.z],
        [d.x, 0.2, d.z],
      ])
      return
    }
    setPts([[drive.pos.x, 0.2, drive.pos.z], ...path.map(([x, z]) => [x, 0.2, z] as [number, number, number])])
  })

  if (!pts || pts.length < 2) return null
  return <Line points={pts} color="#ffe08a" lineWidth={5} transparent opacity={0.9} renderOrder={5} />
}
