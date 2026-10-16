import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { Game } from './game/Game'
import { getQuality, QUALITY_SETTINGS } from './game/systems/quality'
import { initDeviceDetection, useDeviceStore } from './game/systems/device'
import { Hud } from './ui/Hud'
import { Joystick } from './ui/Joystick'
import { FullscreenButton } from './ui/FullscreenButton'
import { EditorPanel, editorEnabled } from './ui/EditorPanel'

const tier = getQuality()
const settings = QUALITY_SETTINGS[tier]

export default function App() {
  const isTouch = useDeviceStore((s) => s.isTouch)
  useEffect(() => initDeviceDetection(), [])
  return (
    <div className="app">
      <Suspense fallback={<div className="loading">Carregando...</div>}>
        <Canvas
          dpr={settings.dpr}
          shadows={settings.shadows}
          camera={{ position: [0, 4.5, 11], fov: 50, near: 0.1, far: 400 }}
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
        {editorEnabled() && <EditorPanel />}
        {isTouch && <FullscreenButton />}
        {isTouch && <Joystick />}
      </div>
    </div>
  )
}
