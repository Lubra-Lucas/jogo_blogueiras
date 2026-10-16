import { create } from 'zustand'
import { ENV_CFG, URL_ENV, type Weather } from './config'

/**
 * Estado "lento" do ambiente, lido pela UI (hora no minuto de jogo ~1 Hz, clima).
 * O cenario NAO le daqui por quadro: usa `env` (envState.ts), preenchido pelo EnvironmentDriver.
 */
interface EnvStore {
  /** hora de jogo (0..24), atualizada a cada minuto de jogo */
  hour: number
  weather: Weather
  frozen: boolean
  /** clima fixado (nao sorteia mais) */
  weatherLocked: boolean
}

export const useEnvStore = create<EnvStore>(() => ({
  hour: URL_ENV.hour ?? ENV_CFG.startHour,
  weather: URL_ENV.weather ?? 'limpo',
  frozen: URL_ENV.frozen,
  weatherLocked: URL_ENV.weather !== null,
}))

/** Relogio de jogo em alta resolucao (nao reativo). */
export const clock = { hour: URL_ENV.hour ?? ENV_CFG.startHour, snap: true }

export function setHour(h: number) {
  clock.hour = ((h % 24) + 24) % 24
  clock.snap = false
  useEnvStore.setState({ hour: clock.hour })
}
export function setWeather(w: Weather, lock = true) {
  useEnvStore.setState({ weather: w, weatherLocked: lock })
}
export function setFrozen(f: boolean) {
  useEnvStore.setState({ frozen: f })
}
export function setWeatherLocked(l: boolean) {
  useEnvStore.setState({ weatherLocked: l })
}
