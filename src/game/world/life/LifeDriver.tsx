import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { CITY } from '../city/layout'
import { ROMANTIC_ALL } from '../city/romantic'
import { CENTRO_ITEMS } from '../city/centro'
import { navBridge } from '../../navigation/navStore'
import { usePlayerStore } from '../../../state/playerStore'
import { FxLayer } from './FxLayer'
import { FallingLeaves } from './FallingLeaves'
import { Fountains } from './Fountains'
import { LakeLife } from './LakeLife'
import { Impacts } from './Impacts'
import { GroundBirds } from './GroundBirds'
import { LifeAudio } from './LifeAudio'
import { Ambient } from './Ambient'
import { StageBeams } from './StageBeams'
import { SunShafts } from './SunShafts'
import { Bunting } from './Bunting'
import { CharacterSecondary } from '../../character/secondary/CharacterSecondary'
import { LIFE, LIFE_OFF } from './lifeQuality'
import { life, lifeU, updateLife, wind } from './lifeState'
import { scanScene } from './scanner'

void CITY

/** baloes do kit (posicao + escala) para o empurrao/balanco no shader */
const BALLOONS = [...ROMANTIC_ALL, ...CENTRO_ITEMS].filter((i) => i.piece.includes('balloon')).map((i) => ({ x: i.x, y: i.y ?? 0, z: i.z, s: i.s ?? 1 }))

/**
 * Motor da "vida do mundo": atualiza vento/uniformes por quadro, remenda materiais (scanner) e monta os efeitos.
 * Montar UMA vez, depois do PlayerController (le a posicao da jogadora do mesmo quadro).
 */
export function LifeDriver({ children }: { children?: React.ReactNode }) {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const acc = useRef(0)
  const tmp = useMemo(() => new Vector3(), [])

  useEffect(() => {
    if (LIFE_OFF) return
    scanScene(scene)
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__life = {
        wind,
        life,
        nav: navBridge,
        scene,
        gl,
        tp: (x: number, z: number) => {
          navBridge.teleport = { x, z, yaw: null }
        },
        player: usePlayerStore,
      }
    }
  }, [scene, gl])

  useFrame((_, dt0) => {
    if (LIFE_OFF) return
    const dt = Math.min(dt0, 0.1)
    updateLife(dt)
    life.cam.copy(camera.position)
    // baloes mais proximos da jogadora (ate 8) para o shader
    const px = life.player.x
    const pz = life.player.z
    const arr = [lifeU.uBal0.value, lifeU.uBal1.value, lifeU.uBal2.value, lifeU.uBal3.value]
    let k = 0
    for (let i = 0; i < BALLOONS.length && k < 4; i++) {
      const b = BALLOONS[i]
      if (Math.abs(b.x - px) < 30 && Math.abs(b.z - pz) < 30) arr[k++].set(b.x, b.y, b.z, b.s)
    }
    for (; k < 4; k++) arr[k].set(0, 0, 0, 0)
    // varre a cena de tempos em tempos (celulas novas montam durante o jogo)
    acc.current += dt
    if (acc.current > 1.5) {
      acc.current = 0
      scanScene(scene)
    }
    void tmp
  })

  if (LIFE_OFF) return null
  void LIFE
  return (
    <>
      <FxLayer />
      <FallingLeaves />
      <Fountains />
      <LakeLife />
      <Impacts />
      <GroundBirds />
      <LifeAudio />
      <Ambient />
      <StageBeams />
      <SunShafts />
      <Bunting />
      <CharacterSecondary />
      {children}
    </>
  )
}
