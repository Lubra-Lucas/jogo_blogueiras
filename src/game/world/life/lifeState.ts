import { Vector3, Vector4 } from 'three'
import { env } from '../environment/envState'
import { usePlayerStore } from '../../../state/playerStore'

/**
 * Estado global da "vida do mundo", atualizado 1x por quadro por `updateLife` (LifeDriver).
 * Uniformes compartilhados por TODOS os shaders remendados (vento, empurrao do jogador, baloes, sombras de nuvem).
 */

export const wind = {
  /** direcao no plano XZ (unitaria) */
  dx: 1,
  dz: 0,
  /** forca 0..1.6 (brisa ... ventania) */
  strength: 0.3,
  /** 0..1: rajada instantanea */
  gust: 0,
  t: 0,
}

export const lifeU = {
  /** x,z = direcao; y = forca; w = rajada */
  uWind: { value: new Vector4(1, 0, 0.3, 0) },
  uLifeT: { value: 0 },
  /** xyz = peito da jogadora, w = velocidade (m/s) */
  uPlayer: { value: new Vector4(0, -50, 0, 0) },
  /** baloes proximos: xyz = base, w = escala (0 = vazio) */
  uBal0: { value: new Vector4() },
  uBal1: { value: new Vector4() },
  uBal2: { value: new Vector4() },
  uBal3: { value: new Vector4() },
  /** x,y = deslocamento das nuvens (m), z = quanto escurece (0..1), w = escala */
  uCloud: { value: new Vector4(0, 0, 0, 0.018) },
  /** 0..1 piscar dos neons e hora de jogo (janelas) */
  uFlick: { value: 0 },
}

export const life = {
  /** posicao do peito da jogadora (mutavel) */
  player: new Vector3(),
  speed: 0,
  /** tempo acumulado (s) */
  t: 0,
  /** posicao de camera (preenchida pelo driver) */
  cam: new Vector3(),
}

const sstep = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function updateLife(dt: number) {
  life.t += dt
  const t = life.t
  wind.t = t
  // direcao: gira devagar, com pequenas oscilacoes
  const ang = 0.7 + 0.8 * Math.sin(t * 0.011) + 0.35 * Math.sin(t * 0.047 + 1.3)
  wind.dx = Math.cos(ang)
  wind.dz = Math.sin(ang)
  // base cresce com o tempo fechado/chuva; rajadas = soma de senos lentos elevada ao quadrado
  const base = 0.22 + 0.32 * env.gloom + 0.38 * env.rain
  const g = 0.5 + 0.5 * Math.sin(t * 0.37 + Math.sin(t * 0.11) * 2) * Math.sin(t * 0.21 + 0.7)
  wind.gust = g * g
  wind.strength = base * (0.62 + 0.95 * wind.gust)
  lifeU.uWind.value.set(wind.dx, wind.dz, wind.strength, wind.gust)
  lifeU.uLifeT.value = t

  const p = usePlayerStore.getState()
  life.player.set(p.position.x, p.position.y + 0.9, p.position.z)
  life.speed = p.speed
  lifeU.uPlayer.value.set(life.player.x, life.player.y, life.player.z, p.speed)

  // nuvens andam com o vento (devagar); escurecem so com sol e nuvens esparsas
  const u = lifeU.uCloud.value
  u.x += wind.dx * dt * (1.2 + wind.strength * 2.5)
  u.y += wind.dz * dt * (1.2 + wind.strength * 2.5)
  u.z = env.day * (1 - sstep(env.cover, 0.55, 0.95)) * (0.3 + 0.7 * env.cover * 1.2) * 0.34
  lifeU.uFlick.value = env.lights
}
