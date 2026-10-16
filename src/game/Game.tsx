import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { AdaptiveDpr, Environment, Lightformer, Sparkles } from '@react-three/drei'
import { Fog } from 'three'
import { QUALITY_SETTINGS, type QualityTier } from './systems/quality'
import { Ground } from './world/Ground'
import { Sky } from './world/Sky'
import { Centerpiece } from './world/Centerpiece'
import { City } from './world/city/City'
import { MapCamera, SunFollow, StatsProbe } from './world/city/Rig'
import { Physics } from '@react-three/rapier'
import { KeyboardInput } from './input/KeyboardInput'
import { ClickToMove } from './input/ClickToMove'
import { PlayerController } from './player/PlayerController'
import { DestinationMarker } from './player/DestinationMarker'
import { CameraInput } from './input/CameraInput'
import { ThirdPersonCamera } from './camera/ThirdPersonCamera'
import { CharacterViewer, getViewMode } from './character/CharacterViewer'

const VIEW = getViewMode()
const MAP_MODE = new URLSearchParams(window.location.search).get('map') === '1'
const DEBUG_PHYSICS = new URLSearchParams(window.location.search).get('debug') === '1'

export function Game({ tier }: { tier: QualityTier }) {
  const q = QUALITY_SETTINGS[tier]
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    scene.fog = MAP_MODE ? null : new Fog('#f3c4d8', 60, q.fogFar)
    return () => {
      scene.fog = null
    }
  }, [scene, q.fogFar])

  return (
    <>
      <Sky />

      {/* Estudio procedural (sem HDR/CDN): da reflexo para o ouro e a gema */}
      <Environment
        resolution={256}
        frames={1}
        background={false}
        environmentIntensity={0.55}
      >
        <Lightformer form="rect" intensity={2.2} color="#ffc4d8" position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[18, 18, 1]} />
        <Lightformer form="rect" intensity={3.5} color="#ffd36b" position={[9, 3, 2]} rotation-y={-Math.PI / 2} scale={[14, 3, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#c9a6ff" position={[-9, 3, -2]} rotation-y={Math.PI / 2} scale={[14, 5, 1]} />
        <Lightformer form="ring" intensity={2.5} color="#fff2e0" position={[0, 4, -10]} scale={9} />
        <Lightformer form="rect" intensity={1.2} color="#ffe0c0" position={[0, 3, 10]} rotation-y={Math.PI} scale={[12, 4, 1]} />
      </Environment>

      <hemisphereLight args={['#fff1e4', '#d9dcea', 0.85]} />
      <SunFollow castShadow={q.shadows} mapSize={q.shadowMapSize} />

      {VIEW ? (
        <>
          {/* modo de revisao da arte: so a praca + personagem na origem */}
          <Physics timeStep="vary" gravity={[0, -9.81, 0]}>
            <Ground shadows={q.shadows} />
          </Physics>
          <CharacterViewer mode={VIEW} shadows={q.shadows} />
        </>
      ) : (
        <>
          <Physics timeStep="vary" gravity={[0, -9.81, 0]} debug={DEBUG_PHYSICS}>
            <City shadows={q.shadows} propDist={MAP_MODE ? 1e5 : q.propDist} buildingDist={MAP_MODE ? 1e5 : q.buildingDist} />
            <Centerpiece shadows={q.shadows} />
            <PlayerController shadows={q.shadows} />
            {/* depois do PlayerController: useFrame na ordem de montagem */}
            {MAP_MODE ? <MapCamera /> : <ThirdPersonCamera />}
          </Physics>
          <KeyboardInput />
          <ClickToMove />
          <CameraInput />
          <DestinationMarker />
        </>
      )}
      <Sparkles
        count={q.sparkles}
        scale={[9, 5, 9]}
        position={[0, 2.8, 0]}
        size={6}
        speed={0.4}
        color="#ffe9a8"
      />

      <StatsProbe />
      <AdaptiveDpr pixelated={false} />
    </>
  )
}
