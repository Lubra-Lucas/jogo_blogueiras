/** Parametros do ciclo dia/noite e do clima (valores de jogo; ?time, ?weather e ?cycle sobrescrevem). */
export const ENV_CFG = {
  /** minutos REAIS que dura um dia de jogo inteiro (24 h) */
  dayMinutes: 24,
  /** hora de jogo ao abrir: 16:30 = por do sol rosado */
  startHour: 16.5,
  /** segundos reais para o clima mudar de um estado para o outro */
  blendSeconds: 30,
  /** intervalo (horas de jogo) entre trocas aleatorias de clima */
  weatherEveryMin: 2.5,
  weatherEveryMax: 5.5,
  /** chances: limpo 55%, nublado 25%, chuva 20% (60% desta vira chuva forte, 40% garoa) */
  weights: { limpo: 0.55, nublado: 0.25, chuva: 0.2 },
  /** segundos que o arco-iris fica no ceu depois da chuva */
  rainbowSeconds: 50,
} as const

export type Weather = 'limpo' | 'nublado' | 'chuva' | 'garoa'
export const WEATHERS: Weather[] = ['limpo', 'nublado', 'chuva', 'garoa']
export const WEATHER_LABEL: Record<Weather, string> = { limpo: 'Limpo', nublado: 'Nublado', chuva: 'Chuva', garoa: 'Garoa' }

/** Alvos de cada clima: cobertura de nuvens, intensidade de chuva e "fechamento" (cinza/escurece). */
export const WEATHER_TARGET: Record<Weather, { cover: number; rain: number; gloom: number }> = {
  limpo: { cover: 0.3, rain: 0, gloom: 0 },
  nublado: { cover: 0.82, rain: 0, gloom: 0.5 },
  garoa: { cover: 0.9, rain: 0.42, gloom: 0.7 },
  chuva: { cover: 1, rain: 1, gloom: 0.92 },
}

const q = new URLSearchParams(window.location.search)
const t = q.get('time')
const w = q.get('weather')
export const URL_ENV = {
  hour: t !== null && !Number.isNaN(parseFloat(t)) ? ((parseFloat(t) % 24) + 24) % 24 : null,
  weather: (WEATHERS as string[]).includes(w ?? '') ? (w as Weather) : null,
  /** ?cycle=0 congela; ?time=H tambem congela, a menos que ?cycle=1 */
  frozen: q.get('cycle') === '0' || (t !== null && q.get('cycle') !== '1'),
  panel: q.get('env') === '1',
}
