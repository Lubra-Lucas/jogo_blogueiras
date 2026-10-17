import { spawnFor } from '../world/city/layout'

/** Numeros ajustaveis do jogador. */
export const PLAYER = {
  radius: 0.28,
  halfHeight: 0.545, // trecho reto; altura total = 2*(0.545+0.28) = 1.65 m (boneca: corpo 1,60 m, coque ate ~1,70 m)
  spawn: spawnFor(new URLSearchParams(window.location.search).get('spawn')), // x, z (y calculado); ?spawn=<id>
  walkSpeed: 1.5, // ~1.46x o passo do clipe Female Walk (1,03 m/s a 1x); ver animation/animator.ts
  runSpeed: 3.6, // trote (~13 km/h); clipe `run` Mixamo cobre 4,79 m/s a 1x (ver CLIP_SPEED.run em animation/animator.ts)
  accel: 10, // 1/s, amortecimento exponencial ao acelerar
  decel: 13, // 1/s, ao frear
  turnRate: 14, // 1/s, giro suave do corpo
  gravity: 25,
  maxFallSpeed: 30,
  respawnBelowY: -20,
  controllerOffset: 0.02,
  autostepHeight: 0.35,
  autostepMinWidth: 0.2,
  snapToGround: 0.3,
  maxClimbAngleDeg: 45,
  minSlideAngleDeg: 50,
  // click-to-move
  arriveDistance: 0.15,
  arriveGain: 6, // velocidade desejada = distancia * ganho (limitada) -> desacelera ao chegar
  stuckSeconds: 0.8,
  stuckProgress: 0.02, // m de progresso minimo para nao contar como preso
} as const
