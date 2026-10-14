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

function resolve() {
  // O analogico (joystick do passo 4) tem prioridade sobre o teclado quando em uso.
  const src = stick.x !== 0 || stick.y !== 0 ? stick : keyboard
  intent.move.x = src.x
  intent.move.y = src.y
  intent.run = keyboard.run || stick.run
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

export function setMoveTarget(point: Vector3, run: boolean) {
  targetStore.copy(point)
  intent.target = targetStore
  intent.targetRun = run
  intent.targetSetAt = performance.now()
}

export function clearMoveTarget() {
  intent.target = null
}
