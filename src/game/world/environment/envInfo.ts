import { useEnvStore } from './envStore'
import { WEATHER_LABEL, type Weather } from './config'

/** API estavel para a UI (celular, HUD...): hora, "HH:MM", fase do dia e clima em pt-BR. */
export type DayPhase = 'Amanhecer' | 'Dia' | 'Entardecer' | 'Noite'

export function phaseOf(h: number): DayPhase {
  if (h >= 5 && h < 8) return 'Amanhecer'
  if (h >= 8 && h < 16.5) return 'Dia'
  if (h >= 16.5 && h < 19.5) return 'Entardecer'
  return 'Noite'
}
export function formatHour(h: number): string {
  return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`
}
export interface EnvInfo {
  /** hora de jogo 0..24 (atualiza a cada minuto de jogo ~ 1 s real) */
  hour: number
  /** "HH:MM" */
  time: string
  phase: DayPhase
  weather: Weather
  /** "Limpo" | "Nublado" | "Chuva" | "Garoa" */
  weatherLabel: string
  isNight: boolean
}

/** Hook reativo (re-renderiza a cada minuto de jogo). */
export function useEnvInfo(): EnvInfo {
  const hour = useEnvStore((s) => s.hour)
  const weather = useEnvStore((s) => s.weather)
  return { hour, time: formatHour(hour), phase: phaseOf(hour), weather, weatherLabel: WEATHER_LABEL[weather], isNight: hour >= 19.5 || hour < 5.5 }
}
/** Leitura pontual (fora do React). */
export function getEnvInfo(): EnvInfo {
  const { hour, weather } = useEnvStore.getState()
  return { hour, time: formatHour(hour), phase: phaseOf(hour), weather, weatherLabel: WEATHER_LABEL[weather], isNight: hour >= 19.5 || hour < 5.5 }
}
