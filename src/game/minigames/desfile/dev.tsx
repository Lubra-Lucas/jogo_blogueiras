/** Harness de desenvolvimento (desfile-dev.html): monta só o minijogo, sem a cidade. `?poses=1` = varredura de quadros de pose. */
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import '../../../index.css'
import { DesfileGame } from '../../../ui/minigames/desfile/DesfileGame'
import { Doll, StudioEnv } from './sceneKit'
import { useAppearanceStore } from '../../../state/appearanceStore'
import type { PoseId } from './bonePoses'
import type { ClipName } from '../../character/animation/animator'

const q = new URLSearchParams(location.search)

function Scan() {
  const spec = (q.get('poses') ?? '').split(',').filter((s) => s.includes(':') )
  const items = spec.map((s) => {
    const [c, t] = s.split(':')
    return c === 'pose' ? { pose: t as PoseId } : { clip: c as ClipName, t: Number(t) }
  })
  const app = useAppearanceStore.getState().appearance
  return (
    <Canvas camera={{ position: [0, 0.9, 5.2 + items.length * 0.45], fov: 30 }} onCreated={({ camera }) => camera.lookAt(0, 0.85, 0)} style={{ position: 'fixed', inset: 0, background: '#ddd' }}>
      <StudioEnv />
      <hemisphereLight args={['#fff', '#ccc', 0.8]} />
      <directionalLight position={[2, 4, 4]} intensity={1.5} />
      {items.map((it, i) => (
        <Doll key={i} appearance={app} clip={'clip' in it ? it.clip : undefined} t={'t' in it ? it.t : undefined} pose={'pose' in it ? it.pose : undefined} position={[(i - (items.length - 1) / 2) * 1.1, 0, 0]} />
      ))}
    </Canvas>
  )
}

createRoot(document.getElementById('root')!).render(q.get('poses') ? <Scan /> : <DesfileGame onExit={() => console.log('exit')} />)
