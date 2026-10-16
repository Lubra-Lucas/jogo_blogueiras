import type { VehicleSim } from './vehiclePhysics'

/** Controle do carro dirigido agora (dev/testes: `?cartest=1` e window.__veh). */
export const carTestHook: { current: VehicleSim | null } = { current: null }
