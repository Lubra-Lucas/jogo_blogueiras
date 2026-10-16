import { Color, MathUtils, Vector3 } from 'three'
import { ENV_CFG, WEATHER_TARGET, type Weather } from './config'

/**
 * Estado calculado do ambiente (hora + clima), preenchido uma vez por quadro por `updateEnv`.
 * Tudo aqui e pre-alocado: nenhum objeto novo por quadro. Sky, luzes, nevoa, chuva e cidade leem `env`.
 */

interface KF {
  h: number
  top: string
  mid: string
  hor: string
  sun: string
  sunI: number
  hemiS: string
  hemiG: string
  hemiI: number
  envI: number
  exp: number
  fog: string
  stars: number
  moon: number
  glow: number
  cLit: string
  cShade: string
}

// Paleta "mundo real": ceu azul natural, luz neutra-quente, nevoa azul-acinzentada que acompanha o horizonte.
// Magenta/laranja so perto do horizonte na hora dourada; noite anil-marinho com luar neutro.
const NIGHT: Omit<KF, 'h'> = {
  top: '#070b1f', mid: '#0e1735', hor: '#1c2b55', sun: '#a9bde6', sunI: 0.3, hemiS: '#6f86b8', hemiG: '#232a45', hemiI: 0.18,
  envI: 0.05, exp: 0.92, fog: '#121a36', stars: 1, moon: 1, glow: 0, cLit: '#6b7aa0', cShade: '#262d4a',
}
const DAY: Omit<KF, 'h'> = {
  top: '#3f86d8', mid: '#7db7ec', hor: '#cfe3f2', sun: '#fff6e8', sunI: 2.4, hemiS: '#dbe8f6', hemiG: '#b8bbbf', hemiI: 0.42,
  envI: 0.42, exp: 0.88, fog: '#c3d6e6', stars: 0, moon: 0, glow: 0.3, cLit: '#ffffff', cShade: '#b6c3d6',
}
const KFS: KF[] = [
  { h: 0, ...NIGHT },
  { h: 5, ...NIGHT },
  // amanhecer: azul-acinzentado esquentando para pessego no horizonte
  { h: 6.4, top: '#5873b0', mid: '#d9a98e', hor: '#ffc994', sun: '#ffd2a6', sunI: 1.6, hemiS: '#ffe4cc', hemiG: '#98a0b2', hemiI: 0.36, envI: 0.36, exp: 0.9, fog: '#cdbfb6', stars: 0, moon: 0, glow: 1, cLit: '#fff0e0', cShade: '#b9a9b4' },
  { h: 8.6, ...DAY },
  { h: 14.6, ...DAY },
  // hora dourada: ceu ainda azul, luz ambar, horizonte laranja-ouro
  { h: 16.5, top: '#5e97d6', mid: '#b9c6d6', hor: '#ffc88a', sun: '#ffe0b0', sunI: 2.2, hemiS: '#fff0dc', hemiG: '#a8abb6', hemiI: 0.36, envI: 0.4, exp: 0.88, fog: '#d9d0c6', stars: 0, moon: 0, glow: 1, cLit: '#ffe9d2', cShade: '#aeb0c4' },
  // por do sol / crepusculo: laranja forte no horizonte, magenta so la, azul profundo acima
  { h: 18.5, top: '#1f3068', mid: '#52508e', hor: '#e8785a', sun: '#ff9a62', sunI: 1.2, hemiS: '#9eaee0', hemiG: '#454870', hemiI: 0.6, envI: 0.32, exp: 0.98, fog: '#4a5278', stars: 0.3, moon: 0.5, glow: 0.6, cLit: '#ffb08c', cShade: '#464c86' },
  { h: 20.6, ...NIGHT },
  { h: 24, ...NIGHT },
]
interface KFc {
  h: number
  top: Color; mid: Color; hor: Color; sun: Color; hemiS: Color; hemiG: Color; fog: Color; cLit: Color; cShade: Color
  sunI: number; hemiI: number; envI: number; exp: number; stars: number; moon: number; glow: number
}
const KC: KFc[] = KFS.map((k) => ({
  h: k.h, top: new Color(k.top), mid: new Color(k.mid), hor: new Color(k.hor), sun: new Color(k.sun), hemiS: new Color(k.hemiS),
  hemiG: new Color(k.hemiG), fog: new Color(k.fog), cLit: new Color(k.cLit), cShade: new Color(k.cShade),
  sunI: k.sunI, hemiI: k.hemiI, envI: k.envI, exp: k.exp, stars: k.stars, moon: k.moon, glow: k.glow,
}))

export const env = {
  hour: ENV_CFG.startHour as number,
  /** 0 = dia ... 1 = noite pela hora (nao depende do clima) */
  night: 0,
  /** 0..1 luzes artificiais (postes, janelas, neon); sobe um pouco em dia fechado */
  lights: 0,
  /** 0..1 sol acima do horizonte e forte (arco-iris) */
  day: 1,
  weather: 'limpo' as Weather,
  cover: 0.3,
  rain: 0,
  gloom: 0,
  wet: 0,
  rainbow: 0,
  stars: 0,
  moonAmt: 0,
  sunGlow: 0,
  sunDir: new Vector3(0.4, 0.7, 0.4),
  moonDir: new Vector3(-0.4, 0.5, -0.4),
  lightDir: new Vector3(0.5, 0.7, 0.4),
  lightColor: new Color(),
  lightI: 2,
  hemiSky: new Color(),
  hemiGnd: new Color(),
  hemiI: 0.4,
  envI: 0.4,
  exposure: 0.88,
  fogColor: new Color(),
  /** multiplicador da distancia da nevoa */
  fogMul: 1,
  skyTop: new Color(),
  skyMid: new Color(),
  skyHor: new Color(),
  cloudLit: new Color(),
  cloudShade: new Color(),
  /** forca das sombras 0..1 */
  shadow: 1,
}

const _a = new Color()
const GREY = new Color(0.8, 0.83, 0.88)
const sstep = (x: number, a: number, b: number) => MathUtils.smoothstep(x, a, b)

/** Dessatura em direcao a um cinza-lilas de mesma luminancia (ceu encoberto), escurecendo por `dark`. */
function overcast(c: Color, k: number, dark: number) {
  if (k <= 0) return
  const lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11
  _a.copy(GREY).multiplyScalar(lum * dark)
  c.lerp(_a, k)
}

// ---- clima (valores suavizados) ----
const wx = { cover: 0.3, rain: 0, gloom: 0, wet: 0 }
let rbTime = 1e9
let wasRaining = false

export function snapWeather(w: Weather) {
  const t = WEATHER_TARGET[w]
  wx.cover = t.cover
  wx.rain = t.rain
  wx.gloom = t.gloom
  wx.wet = t.rain > 0.3 ? 1 : 0
  env.weather = w
}

/** Gancho por cidade (game/travel): ajusta `env` depois do ciclo (ex.: ceu tropical de Miami). */
let envHook: ((e: typeof env, hour: number) => void) | null = null
export function setEnvHook(fn: typeof envHook) {
  envHook = fn
}

/** Interpola entre keyframes e aplica o clima. dt em segundos reais. */
export function updateEnv(hour: number, weather: Weather, dt: number) {
  env.hour = hour
  env.weather = weather
  // ---- clima: aproxima do alvo (constante de tempo ~ blend/3)
  const T = WEATHER_TARGET[weather]
  const k = 1 - Math.exp((-dt * 3) / ENV_CFG.blendSeconds)
  wx.cover += (T.cover - wx.cover) * k
  wx.rain += (T.rain - wx.rain) * k
  wx.gloom += (T.gloom - wx.gloom) * k
  if (Math.abs(wx.rain - T.rain) < 0.003) wx.rain = T.rain
  // o chao molha rapido e seca devagar
  const wetTarget = wx.rain > 0.12 ? 1 : 0
  wx.wet += (wetTarget - wx.wet) * (1 - Math.exp(-dt / (wetTarget ? 14 : 55)))
  env.cover = wx.cover
  env.rain = wx.rain
  env.gloom = wx.gloom
  env.wet = wx.wet < 0.01 ? 0 : wx.wet

  // ---- fase do dia
  let i = 0
  while (i < KC.length - 2 && hour >= KC[i + 1].h) i++
  const a = KC[i]
  const b = KC[i + 1]
  const t = sstep((hour - a.h) / (b.h - a.h), 0, 1)
  env.skyTop.copy(a.top).lerp(b.top, t)
  env.skyMid.copy(a.mid).lerp(b.mid, t)
  env.skyHor.copy(a.hor).lerp(b.hor, t)
  env.lightColor.copy(a.sun).lerp(b.sun, t)
  env.hemiSky.copy(a.hemiS).lerp(b.hemiS, t)
  env.hemiGnd.copy(a.hemiG).lerp(b.hemiG, t)
  env.fogColor.copy(a.fog).lerp(b.fog, t)
  env.cloudLit.copy(a.cLit).lerp(b.cLit, t)
  env.cloudShade.copy(a.cShade).lerp(b.cShade, t)
  let sunI = MathUtils.lerp(a.sunI, b.sunI, t)
  let hemiI = MathUtils.lerp(a.hemiI, b.hemiI, t)
  let envI = MathUtils.lerp(a.envI, b.envI, t)
  const exp = MathUtils.lerp(a.exp, b.exp, t)
  const stars = MathUtils.lerp(a.stars, b.stars, t)
  const moon = MathUtils.lerp(a.moon, b.moon, t)
  const glow = MathUtils.lerp(a.glow, b.glow, t)

  // ---- sol e lua
  const sa = ((hour - 6) / 13) * Math.PI // 6h nasce (leste), 19h se poe
  const sy = Math.sin(sa)
  env.sunDir.set(Math.cos(sa), sy * 0.92 + (sy > 0 ? 0.05 : 0), 0.42).normalize()
  const ma = ((((hour - 19) % 24) + 24) % 24 / 11) * Math.PI // 19h nasce, 6h se poe
  const my = Math.sin(ma)
  env.moonDir.set(-Math.cos(ma), my * 0.55 + (my > 0 ? 0.1 : 0), -0.62).normalize()
  // luz dominante: sol -> lua (elevacao minima para a sombra nao ficar rasante)
  const sy2 = Math.max(env.sunDir.y, 0.34)
  const my2 = Math.max(env.moonDir.y, 0.4)
  env.lightDir
    .set(MathUtils.lerp(env.sunDir.x, env.moonDir.x, moon), MathUtils.lerp(sy2, my2, moon), MathUtils.lerp(env.sunDir.z, env.moonDir.z, moon))
    .normalize()

  // ---- noite / luzes / dia
  env.night = hour > 12 ? sstep(hour, 17.8, 20.2) : 1 - sstep(hour, 5.2, 7)
  env.day = sstep(hour, 6.6, 8.2) * (1 - sstep(hour, 17.4, 18.8))
  const g = wx.gloom
  env.lights = Math.min(1, env.night + g * 0.38 * (1 - env.night))

  // ---- clima aplicado ao ceu / luz
  const oc = g * 0.88
  overcast(env.skyTop, oc, 0.9 - 0.25 * wx.rain)
  overcast(env.skyMid, oc, 0.95 - 0.22 * wx.rain)
  overcast(env.skyHor, oc * 0.9, 1 - 0.18 * wx.rain)
  overcast(env.fogColor, oc * 0.9, 1 - 0.2 * wx.rain)
  overcast(env.cloudLit, g * 0.85, 0.96 - 0.22 * wx.rain)
  overcast(env.cloudShade, g * 0.85, 0.85 - 0.25 * wx.rain)
  sunI *= 1 - 0.72 * g
  hemiI *= 1 + 0.55 * g
  envI *= 1 - 0.25 * g
  env.lightI = sunI
  env.hemiI = hemiI
  env.envI = envI
  env.exposure = exp + 0.05 * g * (1 - env.night)
  env.stars = stars * (1 - Math.min(1, wx.cover * 1.05))
  env.moonAmt = moon * (1 - 0.85 * g)
  env.sunGlow = glow * (1 - 0.85 * g)
  env.fogMul = 1 - 0.4 * wx.rain - 0.14 * wx.cover * (1 - env.night * 0.5)
  env.shadow = Math.min(1, sunI / 1.1) * (1 - 0.6 * g)

  // ---- arco-iris: depois da chuva, de dia
  if (wx.rain > 0.5) wasRaining = true
  if (wasRaining && wx.rain < 0.12 && env.day > 0.5 && weather !== 'chuva' && weather !== 'garoa') {
    wasRaining = false
    rbTime = 0
  }
  if (rbTime < 1e8) rbTime += dt
  const D = ENV_CFG.rainbowSeconds
  env.rainbow = rbTime < D ? sstep(rbTime, 0, 7) * (1 - sstep(rbTime, D - 14, D)) * env.day : 0
  envHook?.(env, hour)
}
