import { Vector3 } from 'three'

/**
 * Intencao do jogador, independente do dispositivo (teclado, joystick, toque, gamepad).
 * Estado mutavel lido dentro do useFrame: NAO causa re-render do React.
 *
 * - move: eixos "de analogico", -1..1, relativos a camera. x = direita, y = frente.
 * - run: correr.
 * - target: destino do click-to-move (null = sem destino).
 */
export interface Intent {
  readonly move: { x: number; y: number }
  run: boolean
  target: Vector3 | null
  targetRun: boolean
  /** performance.now() de quando o destino atual foi definido. */
  targetSetAt: number
}

export const intent: Intent = {
  move: { x: 0, y: 0 },
  run: false,
  target: null,
  targetRun: false,
  targetSetAt: 0,
}

interface Source {
  x: number
  y: number
  run: boolean
}
const keyboard: Source = { x: 0, y: 0, run: false }
const stick: Source = { x: 0, y: 0, run: false }
const targetStore = new Vector3()
/** botao "Correr" do toque: trava o modo corrida (alem do joystick no limite). */
let runLatch = false

function resolve() {
  // O analogico (joystick do passo 4) tem prioridade sobre o teclado quando em uso.
  const src = stick.x !== 0 || stick.y !== 0 ? stick : keyboard
  intent.move.x = src.x
  intent.move.y = src.y
  intent.run = keyboard.run || stick.run || runLatch
}

function write(s: Source, x: number, y: number, run: boolean) {
  const len = Math.hypot(x, y)
  const k = len > 1 ? 1 / len : 1
  s.x = x * k
  s.y = y * k
  s.run = run
  resolve()
}

export function setKeyboardAxis(x: number, y: number, run: boolean) {
  write(keyboard, x, y, run)
}

/** Para o joystick virtual (passo 4). */
export function setStickAxis(x: number, y: number, run: boolean) {
  write(stick, x, y, run)
}

export function setRunLatch(v: boolean) {
  runLatch = v
  resolve()
}
export const isRunLatched = () => runLatch

export function setMoveTarget(point: Vector3, run: boolean) {
  targetStore.copy(point)
  intent.target = targetStore
  intent.targetRun = run
  intent.targetSetAt = performance.now()
}

export function clearMoveTarget() {
  intent.target = null
}

/**
 * Intencao da camera. Fontes (mouse, toque, teclado) ACUMULAM; a ThirdPersonCamera consome e zera
 * a cada frame. Convencao: yawDelta > 0 gira a camera no sentido anti-horario visto de cima
 * (a visao vira para a esquerda); pitchDelta > 0 sobe a camera (olhar mais para baixo);
 * zoomDelta e logaritmico (distancia *= exp(zoomDelta); > 0 afasta).
 */
export const cameraIntent = {
  yawDelta: 0,
  pitchDelta: 0,
  zoomDelta: 0,
  /** giro continuo do teclado, -1..1 (Q = +1 esquerda, E = -1 direita); multiplicado por rad/s e dt. */
  keyYaw: 0,
}

/** Giro continuo do teclado (Q/E). */
export function setKeyboardCameraYaw(v: number) {
  cameraIntent.keyYaw = v
}

// ---- Posse de ponteiros: controles (ex.: joystick do passo 4) "reservam" um pointerId para a
// camera e o click-to-move ignorarem aquele dedo. ----
const claimed = new Set<number>()
export function claimPointer(id: number) {
  claimed.add(id)
}
export function releasePointer(id: number) {
  claimed.delete(id)
}
export function isPointerClaimed(id: number) {
  return claimed.has(id)
}
