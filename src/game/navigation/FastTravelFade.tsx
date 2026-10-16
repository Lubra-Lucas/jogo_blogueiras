import { navStore } from './navStore'

/** Fade para branco-perola do fast travel (a transicao e CSS; navStore.fade = 0 | 1). */
export function FastTravelFade() {
  const fade = navStore((s) => s.fade)
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        pointerEvents: fade > 0 ? 'auto' : 'none',
        opacity: fade,
        transition: `opacity ${fade > 0 ? 190 : 240}ms ease-in-out`,
        background: 'radial-gradient(ellipse at center, #ffffff 0%, #fdf6f4 55%, #f6e9f1 100%)',
      }}
    />
  )
}
