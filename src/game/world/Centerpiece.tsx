import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import type { Group } from 'three'

/** Pedestal dourado com uma gema rosa girando (placeholder da futura fonte). */
export function Centerpiece({ shadows }: { shadows: boolean }) {
  const gem = useRef<Group>(null)

  useFrame((state, dt) => {
    if (!gem.current) return
    gem.current.rotation.y += dt * 0.6
    gem.current.position.y = 2.6 + Math.sin(state.clock.elapsedTime * 1.2) * 0.12
  })

  const gold = { color: '#e6b84f', metalness: 0.9, roughness: 0.3 } as const

  return (
    <group>
      {/* colisao do pedestal: cilindro fixo (nao da para atravessar nem subir) */}
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[1, 2.5]} position={[0, 1, 0]} />
      </RigidBody>

      <mesh position={[0, 0.2, 0]} castShadow={shadows} receiveShadow={shadows}>
        <cylinderGeometry args={[2.2, 2.5, 0.4, 48]} />
        <meshStandardMaterial {...gold} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow={shadows} receiveShadow={shadows}>
        <cylinderGeometry args={[1.5, 1.8, 0.6, 48]} />
        <meshStandardMaterial color="#fff2e0" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow={shadows}>
        <cylinderGeometry args={[0.35, 0.6, 0.9, 32]} />
        <meshStandardMaterial {...gold} />
      </mesh>
      <mesh position={[0, 1.95, 0]} rotation-x={Math.PI / 2} castShadow={shadows}>
        <torusGeometry args={[0.55, 0.08, 16, 48]} />
        <meshStandardMaterial {...gold} />
      </mesh>

      <group ref={gem} position={[0, 2.6, 0]}>
        <mesh castShadow={shadows}>
          <octahedronGeometry args={[0.8, 0]} />
          <meshPhysicalMaterial
            color="#ff7eb6"
            roughness={0.08}
            metalness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.05}
            emissive="#ff9ccb"
            emissiveIntensity={0.25}
            flatShading
          />
        </mesh>
      </group>
    </group>
  )
}
