import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { Game } from './game/Game'
import { getQuality, QUALITY_SETTINGS } from './game/systems/quality'
import { initDeviceDetection, useDeviceStore } from './game/systems/device'
import { Hud } from './ui/Hud'
import { Joystick } from './ui/Joystick'
import { Dock } from './ui/EmoteWheel'
import { CameraOverlay, Phone, TravelFade } from './ui/phone/Phone'
import { FullscreenButton } from './ui/FullscreenButton'
import { CharacterMenu } from './ui/menu/CharacterMenu'
import { useUiStore } from './state/uiStore'
import { MinigameHost } from './ui/minigames/MinigameHost'
import { InteractionPrompt } from './ui/minigames/InteractionPrompt'
import { SitPrompt } from './ui/sit/SitPrompt'
import { VehicleUi } from './ui/vehicles/VehicleUi'
import { useVehicleStore } from './game/vehicles/driveStore'
import { EnvironmentHud } from './ui/environment/EnvironmentHud'
import { ShopHost } from './ui/shop/ShopHost'
import { useShopStore } from './ui/shop/shopStore'
import { MarketHost, useMarketUi } from './ui/market'
import { FastTravelFade } from './game/navigation/FastTravelFade'
import { InteriorUi } from './ui/interiors/InteriorUi'

const tier = getQuality()
const settings = QUALITY_SETTINGS[tier]

export default function App() {
  const isTouch = useDeviceStore((s) => s.isTouch)
  const driving = useVehicleStore((s) => s.drivingUid !== null)
  // menu aberto: o mundo 3D pausa (economiza GPU; o menu tem seu proprio visualizador)
  const uiMenu = useUiStore((s) => s.menuOpen)
  const shopOpen = useShopStore((s) => !!s.open)
  const marketOpen = useMarketUi((s) => s.open)
  const menuOpen = uiMenu || shopOpen || marketOpen
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
        <EnvironmentHud />
        {!new URLSearchParams(window.location.search).get('view') && <Dock />}
        <Phone />
        <CameraOverlay />
        <TravelFade />
        <CharacterMenu />
        {isTouch && <FullscreenButton />}
        {isTouch && !driving && <Joystick />}
        <InteractionPrompt />
        <SitPrompt />
        <InteriorUi />
        <VehicleUi />
        <MinigameHost />
        <ShopHost />
        <MarketHost />
        <FastTravelFade />
      </div>
    </div>
  )
}
