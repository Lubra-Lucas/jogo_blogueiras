import { useEffect, useMemo } from 'react'
import { RigidBody, RoundCuboidCollider } from '@react-three/rapier'
import { createCarVisual, type CarAsset } from './carModel'
import { colliderBoxes } from './useCarAsset'
import { paintOf, useVehicleStore, type CarInst } from './driveStore'

/** Carro estacionado: modelo estatico + colisor fixo. Vira DrivenCar quando a jogadora entra. */
export function ParkedCar({ inst, asset, shadows }: { inst: CarInst; asset: CarAsset; shadows: boolean }) {
  const vis = useMemo(() => {
    const p = inst.kind === 'mine' ? paintOf(inst.slug) : { body: inst.body, rim: inst.rim }
    return createCarVisual(asset, p.body, p.rim, shadows)
  }, [asset, inst.kind, inst.slug, inst.body, inst.rim, shadows])
  useEffect(() => () => vis.dispose(), [vis])
  // tinta ao vivo (garagem)
  const paint = useVehicleStore((s) => s.paint[inst.slug])
  useEffect(() => {
    if (inst.kind === 'mine') {
      const p = paintOf(inst.slug)
      vis.setColors(p.body, p.rim)
    }
  }, [paint, vis, inst.kind, inst.slug])
  const boxes = useMemo(() => colliderBoxes(asset, inst.slug), [asset, inst.slug])
  return (
    <>
      <group position={[inst.x, 0, inst.z]} rotation={[0, inst.yaw, 0]}>
        <primitive object={vis.root} />
      </group>
      <RigidBody type="fixed" colliders={false} position={[inst.x, 0, inst.z]} rotation={[0, inst.yaw, 0]}>
        {boxes.map((b, i) => (
          <RoundCuboidCollider key={i} args={[b.h[0] - 0.05, b.h[1] - 0.05, b.h[2] - 0.05, 0.05]} position={b.c} friction={0.2} />
        ))}
      </RigidBody>
    </>
  )
}
