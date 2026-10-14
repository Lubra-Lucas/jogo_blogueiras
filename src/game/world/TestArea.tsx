import { Edges } from '@react-three/drei'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { MathUtils } from 'three'

/**
 * AREA DE TESTE da fisica (passo 2). Arquivo removivel: apague este arquivo e a linha
 * `<TestArea />` em Game.tsx quando a praca/ruas finais existirem.
 * Fica fora do anel da praca (raio ~11), em x = 14..22.
 */

const LILAC = '#cdb8f0'
const MINT = '#bfead6'
const CREAM = '#fff2e0'
const GOLD = '#e6b84f'

interface BlockProps {
  /** centro (x, y, z) */
  position: [number, number, number]
  size: [number, number, number]
  color: string
  rotationZ?: number
  walkable?: boolean
  shadows: boolean
}

function Block({ position, size, color, rotationZ = 0, walkable = true, shadows }: BlockProps) {
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, 0, rotationZ]}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
      <mesh castShadow={shadows} receiveShadow={shadows} userData={walkable ? { walkable: true } : undefined}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.55} />
        <Edges color={GOLD} />
      </mesh>
    </RigidBody>
  )
}

/** Rampa: superficie comeca em (x0, 0, z) e sobe no sentido +X com o angulo dado. */
function Ramp({
  x0,
  z,
  length,
  width,
  angleDeg,
  color,
  walkable,
  shadows,
}: {
  x0: number
  z: number
  length: number
  width: number
  angleDeg: number
  color: string
  walkable: boolean
  shadows: boolean
}) {
  const th = MathUtils.degToRad(angleDeg)
  const t = 0.4
  const cx = x0 + (length / 2) * Math.cos(th) + (t / 2) * Math.sin(th)
  const cy = (length / 2) * Math.sin(th) - (t / 2) * Math.cos(th)
  return (
    <Block
      position={[cx, cy, z]}
      size={[length, t, width]}
      rotationZ={th}
      color={color}
      walkable={walkable}
      shadows={shadows}
    />
  )
}

function Column({ x, z, shadows }: { x: number; z: number; shadows: boolean }) {
  const h = 3.2
  return (
    <RigidBody type="fixed" colliders={false} position={[x, h / 2, z]}>
      <CylinderCollider args={[h / 2, 0.45]} />
      <mesh castShadow={shadows} receiveShadow={shadows}>
        <cylinderGeometry args={[0.4, 0.45, h, 32]} />
        <meshStandardMaterial color={CREAM} roughness={0.5} />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <torusGeometry args={[0.42, 0.05, 12, 32]} />
        <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.3} />
      </mesh>
    </RigidBody>
  )
}

export function TestArea({ shadows }: { shadows: boolean }) {
  const steps = 8
  const stepH = 0.25
  const stepD = 0.6
  const stairX = 14
  const stairZ = 14
  const platformTop = steps * stepH

  return (
    <group>
      {/* caixas de tamanhos diferentes */}
      <Block position={[14, 0.25, -9]} size={[2, 0.5, 2]} color={LILAC} shadows={shadows} />
      <Block position={[17.5, 0.5, -9]} size={[1.5, 1, 1.5]} color={MINT} shadows={shadows} />
      <Block position={[21, 0.9, -9]} size={[1, 1.8, 1]} color={CREAM} shadows={shadows} />

      {/* colunas */}
      <Column x={14} z={-4.5} shadows={shadows} />
      <Column x={14} z={-1.5} shadows={shadows} />

      {/* rampa suave (~20 graus): deve subir */}
      <Ramp x0={16} z={2} length={6} width={3} angleDeg={20} color={MINT} walkable shadows={shadows} />

      {/* rampa ingreme (~55 graus): NAO deve subir */}
      <Ramp x0={16} z={8} length={3.5} width={3} angleDeg={55} color={LILAC} walkable={false} shadows={shadows} />

      {/* escada (degraus de 0.25 m) ate uma plataforma elevada */}
      {Array.from({ length: steps }, (_, i) => {
        const h = stepH * (i + 1)
        return (
          <Block
            key={i}
            position={[stairX + stepD * (i + 0.5), h / 2, stairZ]}
            size={[stepD, h, 2.5]}
            color={i % 2 === 0 ? CREAM : LILAC}
            shadows={shadows}
          />
        )
      })}
      <Block
        position={[stairX + stepD * steps + 2, platformTop / 2, stairZ]}
        size={[4, platformTop, 4]}
        color={MINT}
        shadows={shadows}
      />
    </group>
  )
}
