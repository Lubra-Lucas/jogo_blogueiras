/**
 * Viewport do celular: expoe em <html> o que o CSS precisa e que media queries nao dao.
 * - --vvh: altura visivel de verdade (visualViewport; diminui quando o teclado virtual abre);
 * - --kb: altura do teclado virtual (px), 0 quando fechado;
 * - data-orient="portrait|landscape" e data-compact (landscape baixo, ex.: 844x390);
 * - o `window.scrollTo(0,0)` mantem o jogo parado: no iOS o Safari rola a pagina para mostrar o campo focado.
 * O index.html usa interactive-widget=overlays-content (Chrome): o layout NAO encolhe com o teclado.
 */
const root = document.documentElement

function update() {
  const vv = window.visualViewport
  const h = vv ? vv.height : window.innerHeight
  const kb = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0
  // teclados pequenos (barras do navegador) nao contam: so acima de 120 px
  root.style.setProperty('--vvh', `${Math.round(h)}px`)
  root.style.setProperty('--kb', `${kb > 120 ? kb : 0}px`)
  root.dataset.keyboard = kb > 120 ? '1' : '0'
  const landscape = window.innerWidth > window.innerHeight
  root.dataset.orient = landscape ? 'landscape' : 'portrait'
  root.dataset.compact = landscape && window.innerHeight <= 520 ? '1' : '0'
}

function lockScroll() {
  if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0)
}

update()
window.addEventListener('resize', update)
window.addEventListener('orientationchange', () => window.setTimeout(update, 120))
window.visualViewport?.addEventListener('resize', update)
window.visualViewport?.addEventListener('scroll', () => {
  update()
  lockScroll()
})
window.addEventListener('scroll', lockScroll, { passive: true })
