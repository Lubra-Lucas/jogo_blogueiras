import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'

const WALK = { walkable: true }

export function Ground({ shadows }: { shadows: boolean }) {
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {/* chao: caixa fina (topo em y=0); praca: disco de 3 cm (topo em y=0.03) */}
        <CuboidCollider args={[150, 0.5, 150]} position={[0, -0.5, 0]} />
        <CylinderCollider args={[0.015, 11]} position={[0, 0.015, 0]} />
      </RigidBody>

      {/* Chao grande rosa/creme */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow={shadows} userData={WALK}>
        <circleGeometry args={[200, 64]} />
        <meshStandardMaterial color="#f7c6d9" roughness={0.95} />
      </mesh>

      {/* Praca: disco de pedra creme */}
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2} receiveShadow={shadows} userData={WALK}>
        <circleGeometry args={[11, 96]} />
        <meshStandardMaterial color="#fff2e0" roughness={0.6} />
      </mesh>

      {/* Anel dourado externo */}
      <mesh position={[0, 0.05, 0]} rotation-x={-Math.PI / 2} receiveShadow={shadows} userData={WALK}>
        <ringGeometry args={[10.2, 11, 96]} />
        <meshStandardMaterial color="#e6b84f" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* Anel dourado interno */}
      <mesh position={[0, 0.05, 0]} rotation-x={-Math.PI / 2} userData={WALK}>
        <ringGeometry args={[5.2, 5.4, 96]} />
        <meshStandardMaterial color="#e6b84f" metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  )
}
