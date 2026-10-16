import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { Game } from './game/Game'
import { getQuality, QUALITY_SETTINGS } from './game/systems/quality'
import { initDeviceDetection, useDeviceStore } from './game/systems/device'
import { Hud } from './ui/Hud'
import { Joystick } from './ui/Joystick'
import { EmoteMenu } from './ui/EmoteMenu'
import { FullscreenButton } from './ui/FullscreenButton'
import { CharacterMenu } from './ui/menu/CharacterMenu'
import { useUiStore } from './state/uiStore'
import { MinigameHost } from './ui/minigames/MinigameHost'
import { InteractionPrompt } from './ui/minigames/InteractionPrompt'
import { SitPrompt } from './ui/sit/SitPrompt'

const tier = getQuality()
const settings = QUALITY_SETTINGS[tier]

export default function App() {
  const isTouch = useDeviceStore((s) => s.isTouch)
  // menu aberto: o mundo 3D pausa (economiza GPU; o menu tem seu proprio visualizador)
  const menuOpen = useUiStore((s) => s.menuOpen)
  useEffect(() => initDeviceDetection(), [])
  return (
    <div className="app">
      <Suspense fallback={<div className="loading">Carregando...</div>}>
        <Canvas
          frameloop={menuOpen ? 'never' : 'always'}
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
        {!new URLSearchParams(window.location.search).get('view') && <EmoteMenu />}
        <CharacterMenu />
        {isTouch && <FullscreenButton />}
        {isTouch && <Joystick />}
        <InteractionPrompt />
        <SitPrompt />
        <MinigameHost />
      </div>
    </div>
  )
}
