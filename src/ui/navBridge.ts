/**
 * Ponte para a navegacao automatica (`src/game/navigation/navigation.ts`, feita por outro modulo).
 * Usa import.meta.glob para o build nao quebrar enquanto o arquivo nao existir; sem ele, avisa no console.
 * Contrato: navigateTo(poiId) -> 'arrived' | 'cancelled' | 'failed'; fastTravelTo(poiId); isNavigating(); cancelNavigation().
 */
type NavMod = {
  navigateTo?: (poi: string) => Promise<'arrived' | 'cancelled' | 'failed'>
  fastTravelTo?: (poi: string) => void
  isNavigating?: () => boolean
  cancelNavigation?: () => void
}
const mods = import.meta.glob('/src/game/navigation/navigation.ts', { eager: true }) as Record<string, NavMod>
const nav: NavMod = Object.values(mods)[0] ?? {}

export function navigateTo(poi: string): Promise<'arrived' | 'cancelled' | 'failed'> {
  if (nav.navigateTo) return nav.navigateTo(poi)
  console.warn('[navegacao] modulo ausente: navigateTo("%s")', poi)
  return Promise.resolve('failed')
}
export function fastTravelTo(poi: string): void {
  if (nav.fastTravelTo) nav.fastTravelTo(poi)
  else console.warn('[navegacao] modulo ausente: fastTravelTo("%s")', poi)
}
export const isNavigating = () => nav.isNavigating?.() ?? false
export const cancelNavigation = () => nav.cancelNavigation?.()
