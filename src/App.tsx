import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { Game } from './game/Game'
import { getQuality, QUALITY_SETTINGS } from './game/systems/quality'
import { Hud } from './ui/Hud'

const tier = getQuality()
const settings = QUALITY_SETTINGS[tier]

export default function App() {
  return (
    <div className="app">
      <Suspense fallback={<div className="loading">Carregando...</div>}>
        <Canvas
          dpr={settings.dpr}
          shadows={settings.shadows}
          camera={{ position: [7, 4.5, 9], fov: 50, near: 0.1, far: 400 }}
          gl={{
            antialias: tier !== 'low',
            powerPreference: 'high-performance',
            toneMapping: ACESFilmicToneMapping,
            outputColorSpace: SRGBColorSpace,
          }}
        >
          <Game tier={tier} />
        </Canvas>
      </Suspense>
      <div className="ui-layer">
        <Hud />
      </div>
    </div>
  )
}
