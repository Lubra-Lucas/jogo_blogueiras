import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { intent } from '../input/intent'
import { navStore } from '../navigation/navStore'

const POP_SECONDS = 0.3

function easeOutBack(x: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

/** Anel dourado no destino do click-to-move: aparece com "pop" e pulsa suavemente. */
export function DestinationMarker() {
  const group = useRef<Group>(null)

  useFrame(() => {
    const g = group.current
    if (!g) return
    const target = navStore.getState().active ? null : intent.target // durante a navegacao, o marcador e o do NavigationRunner
    g.visible = target !== null
    if (!target) return
    const t = (performance.now() - intent.targetSetAt) / 1000
    const pop = t < POP_SECONDS ? easeOutBack(t / POP_SECONDS) : 1
    const s = Math.max(0.001, pop * (1 + 0.08 * Math.sin(t * 6)))
    g.position.set(target.x, target.y + 0.04, target.z)
    g.scale.set(s, s, s)
  })

  return (
    <group ref={group} visible={false}>
      <mesh rotation-x={-Math.PI / 2} renderOrder={2}>
        <ringGeometry args={[0.3, 0.4, 40]} />
        <meshBasicMaterial color="#ffd36b" toneMapped={false} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} renderOrder={1}>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial color="#fff2c0" toneMapped={false} transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </group>
  )
}
