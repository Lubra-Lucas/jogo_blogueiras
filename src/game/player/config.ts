/** Numeros ajustaveis do jogador. */
export const PLAYER = {
  radius: 0.35,
  halfHeight: 0.55, // trecho reto; altura total = 2*(0.55+0.35) = 1.8 m
  spawn: [0, 5] as const, // x, z (y calculado)
  walkSpeed: 3.5,
  runSpeed: 6.5,
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
  // camera (temporaria ate o passo 3)
  cameraFollowRate: 8,
  cameraTargetHeight: 1.2,
} as const
