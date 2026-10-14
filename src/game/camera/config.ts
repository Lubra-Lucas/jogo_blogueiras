/** Numeros ajustaveis da camera em terceira pessoa e do input de camera. */
export const CAMERA = {
  pivotHeight: 1.5, // m acima dos pes do jogador (altura do ombro/cabeca)
  defaultPitchDeg: 18, // camera acima do pivo olhando levemente para baixo
  minPitchDeg: -10, // camera abaixo do pivo (olhando um pouco para cima)
  maxPitchDeg: 70, // quase de cima
  defaultDistance: 6.5,
  minDistance: 2.5,
  maxDistance: 14,
  zoomSmooth: 10, // 1/s
  followRateXZ: 30, // 1/s: lag ~ velocidade/30 (~0.2 m a correr)
  followRateY: 6, // 1/s: mais suave para nao balancar em escadas
  // colisao
  collisionRadius: 0.3, // esfera lancada do pivo ate a camera
  collisionMargin: 0.05, // folga extra alem do raio
  collisionOutRate: 2.5, // 1/s: volta devagar quando o obstaculo some (para dentro e instantaneo)
  minCameraY: 0.3, // nunca abaixo do chao (y = 0) + 0.3
  // fade da capsula quando a camera chega muito perto
  fadeStart: 1.2,
  fadeEnd: 0.6,
  // recentralizar atras do jogador (Roblox padrao: desligado)
  autoRecenter: false,
  recenterRate: 1.5, // 1/s
  keyRotateSpeed: 2.2, // rad/s com Q / E
} as const

/** Sensibilidades (rad por pixel; zoom em unidades logaritmicas). */
export const CAMERA_INPUT = {
  mouseRotate: 0.0045,
  touchRotate: 0.006,
  wheelZoom: 0.0012, // por pixel de deltaY (um "tick" tipico = 100 px)
  pinchZoom: 1.0, // multiplicador de ln(distAnterior / distAtual)
  dragThresholdPx: 6, // igual ao limite de clique do ClickToMove
} as const
