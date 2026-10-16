import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { PerspectiveCamera } from 'three'
import type { Appearance } from '../../../shared/appearance'
import type { ClipName } from '../../character/animation/animator'
import { Doll, GradientBackdrop, StudioEnv } from '../desfile/sceneKit'

const BACK: [number, string][] = [[0, '#e9e3d6'], [0.55, '#f6f1e7'], [1, '#dfe9f2']]

/** Provador da boutique: marfim, carvalho claro, champanhe e toques azul-céu. A cliente gira na plataforma. */
export function Stage3D({ appearance, clip = 'idle' }: { appearance: Appearance; clip?: ClipName }) {
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera) as PerspectiveCamera

  // paisagem: boneca à esquerda (painel à direita); retrato: boneca pequena no alto (painel embaixo)
  useLayoutEffect(() => {
    const w = size.width
    const h = size.height
    const wide = w > h * 1.1
    camera.position.set(0, wide ? 1.2 : 1.3, wide ? 3.9 : 8)
    camera.fov = 38
    if (wide) camera.setViewOffset(w, h, w * 0.17, 0, w, h)
    else camera.setViewOffset(w, h, 0, h * 0.17, w, h)
    camera.updateProjectionMatrix()
    return () => camera.clearViewOffset()
  }, [camera, size.width, size.height])

  return (
    <>
      <GradientBackdrop stops={BACK} />
      <StudioEnv />
      <hemisphereLight args={['#fff8ec', '#d6cdb8', 0.7]} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.4} color="#fff3e0" />
      <directionalLight position={[-3, 2, -2]} intensity={0.55} color="#cfe0f2" />

      {/* plataforma de carvalho claro com friso champanhe */}
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.82, 0.88, 0.12, 48]} />
        <meshPhysicalMaterial color="#cfae82" roughness={0.45} clearcoat={0.6} clearcoatRoughness={0.25} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.75, 64]} />
        <meshStandardMaterial color="#d9c39a" metalness={0.9} roughness={0.28} />
      </mesh>
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[14, 48]} />
        <meshPhysicalMaterial color="#e8e0d0" roughness={0.35} clearcoat={0.7} />
      </mesh>

      {/* espelho de pé com moldura de carvalho */}
      <group position={[-1.9, 1.15, -1.7]} rotation={[0, 0.45, 0]}>
        <mesh>
          <boxGeometry args={[0.95, 2.3, 0.06]} />
          <meshStandardMaterial color="#b99468" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <planeGeometry args={[0.8, 2.15]} />
          <meshPhysicalMaterial color="#dfe9f2" metalness={0.6} roughness={0.08} clearcoat={1} />
        </mesh>
      </group>

      {/* arara de roupas ao fundo (haste champanhe, cabides de carvalho) */}
      <group position={[2.1, 0, -2.1]} rotation={[0, -0.35, 0]}>
        <mesh position={[0, 1.55, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 1.7, 12]} />
          <meshStandardMaterial color="#d9c39a" metalness={0.85} roughness={0.3} />
        </mesh>
        {[-0.8, 0.8].map((x) => (
          <mesh key={x} position={[x, 0.78, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 1.56, 12]} />
            <meshStandardMaterial color="#d9c39a" metalness={0.85} roughness={0.3} />
          </mesh>
        ))}
        {[
          [-0.55, '#1f2e4f'], [-0.3, '#f3eddc'], [-0.05, '#b07a45'], [0.2, '#8fbbe0'], [0.45, '#1c1b1f'], [0.68, '#6b6b3a'],
        ].map(([x, c]) => (
          <mesh key={String(x)} position={[x as number, 1.15, 0]}>
            <boxGeometry args={[0.1, 0.78, 0.38]} />
            <meshStandardMaterial color={c as string} roughness={0.7} />
          </mesh>
        ))}
      </group>

      <Doll appearance={appearance} clip={clip} />

      <OrbitControls
        makeDefault
        target={[0, 0.88, 0]}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI * 0.38}
        maxPolarAngle={Math.PI * 0.55}
      />
    </>
  )
}
