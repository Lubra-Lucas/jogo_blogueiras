import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Fog, HemisphereLight } from 'three'
import { getQuality, QUALITY_SETTINGS } from '../../systems/quality'
import { ENV_CFG, WEATHERS, type Weather } from './config'
import { clock, setWeather, useEnvStore } from './envStore'
import { env, snapWeather, updateEnv } from './envState'
import { applyRegistries } from './registry'

if (import.meta.env.DEV) (window as unknown as { __env: typeof env }).__env = env

const HOURS_PER_SEC = 24 / (ENV_CFG.dayMinutes * 60)

function pickWeather(prev: Weather): Weather {
  const W = ENV_CFG.weights
  const r = Math.random() * (W.limpo + W.nublado + W.chuva)
  if (r < W.limpo) return 'limpo'
  if (r < W.limpo + W.nublado) return 'nublado'
  const w: Weather = Math.random() < 0.4 ? 'garoa' : 'chuva'
  return w === prev ? 'chuva' : w
}

/**
 * Motor do ambiente: avanca o relogio e o clima, calcula `env` e aplica nas luzes, na nevoa, no tone mapping
 * e nos materiais registrados. Montado ANTES de Sky/Rain/SunFollow para que eles leiam o `env` do quadro atual.
 */
export function EnvironmentDriver() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const hemi = useRef<HemisphereLight>(null)
  const q = useMemo(() => QUALITY_SETTINGS[getQuality()], [])
  const s = useRef({ gameT: 0, next: 3, minute: -1, init: false })

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.1)
    const st = useEnvStore.getState()
    const S = s.current
    if (!st.frozen) {
      const dh = dt * HOURS_PER_SEC
      clock.hour = (clock.hour + dh) % 24
      S.gameT += dh
      if (!st.weatherLocked && S.gameT >= S.next) {
        S.next = S.gameT + ENV_CFG.weatherEveryMin + Math.random() * (ENV_CFG.weatherEveryMax - ENV_CFG.weatherEveryMin)
        const w = pickWeather(st.weather)
        if (w !== st.weather) setWeather(w, false)
      }
    }
    if (!S.init) {
      S.init = true
      snapWeather(st.weather)
    }
    const weather = useEnvStore.getState().weather
    if (!(WEATHERS as string[]).includes(weather)) return
    updateEnv(clock.hour, weather, dt)
    applyRegistries()

    const min = Math.floor(clock.hour * 60)
    if (min !== S.minute) {
      S.minute = min
      if (Math.abs(useEnvStore.getState().hour - clock.hour) > 1e-6) useEnvStore.setState({ hour: clock.hour })
    }

    gl.toneMappingExposure = env.exposure
    scene.environmentIntensity = env.envI
    const fog = scene.fog as Fog | null
    if (fog) {
      fog.color.copy(env.fogColor)
      fog.near = Math.min(135, q.fogFar * 0.58) * env.fogMul
      fog.far = q.fogFar * env.fogMul
    }
    const h = hemi.current
    if (h) {
      h.color.copy(env.hemiSky)
      h.groundColor.copy(env.hemiGnd)
      h.intensity = env.hemiI
    }
  })

  return <hemisphereLight ref={hemi} args={['#fff4ea', '#b4bcd8', 0.36]} />
}
