/**
 * Intencoes de direcao, independentes do dispositivo (teclado, toque, gamepad).
 * Estado mutavel lido na fisica do carro. steer: +1 = esquerda, -1 = direita.
 */
export interface DriveInput {
  throttle: number
  brake: number
  steer: number
  handbrake: boolean
  boost: boolean
  horn: boolean
  lookBack: boolean
}

export const vin: DriveInput = { throttle: 0, brake: 0, steer: 0, handbrake: false, boost: false, horn: false, lookBack: false }

interface Src {
  throttle: number
  brake: number
  steer: number
  handbrake: boolean
  boost: boolean
  horn: boolean
  lookBack: boolean
}
const mk = (): Src => ({ throttle: 0, brake: 0, steer: 0, handbrake: false, boost: false, horn: false, lookBack: false })
export const kbd = mk()
export const touch = mk()
export const pad = mk()

/** Combina as fontes (a de maior magnitude vence nos eixos; botoes por OU). */
export function resolveInput() {
  const big = (a: number, b: number, c: number) => (Math.abs(a) >= Math.abs(b) && Math.abs(a) >= Math.abs(c) ? a : Math.abs(b) >= Math.abs(c) ? b : c)
  vin.throttle = Math.max(kbd.throttle, touch.throttle, pad.throttle)
  vin.brake = Math.max(kbd.brake, touch.brake, pad.brake)
  vin.steer = big(kbd.steer, touch.steer, pad.steer)
  vin.handbrake = kbd.handbrake || touch.handbrake || pad.handbrake
  vin.boost = kbd.boost || touch.boost || pad.boost
  vin.horn = kbd.horn || touch.horn || pad.horn
  vin.lookBack = kbd.lookBack || touch.lookBack || pad.lookBack
}

export function resetInput() {
  Object.assign(kbd, mk())
  Object.assign(touch, mk())
  Object.assign(pad, mk())
  resolveInput()
}
