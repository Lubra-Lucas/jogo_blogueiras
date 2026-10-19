// Com Vite dev rodando: EDGE=/caminho/do/chromium node tools/tests/minimap.test.mjs [--url=http://localhost:5173/jogo_blogueiras/?offline=1&quality=low]
import { strict as assert } from 'node:assert'
import { launch, sleep, waitFor } from '../interior-tests/cdp.mjs'

const url = (process.argv.find((a) => a.startsWith('--url=')) ?? '--url=http://localhost:5173/jogo_blogueiras/?offline=1&quality=low').slice(6)
const c = await launch({ url, w: 480, h: 360, touch: true })
const failures = []
try {
  await waitFor(c, `!!window.__mg && !!window.__life && !document.querySelector('.loading') && !!document.querySelector('.minimap canvas')`)
  await c.ev(`(async () => {
    window.__mapUi = (await import('/jogo_blogueiras/src/state/uiStore.ts')).useUiStore;
    window.__mapDraws = { mini: 0, big: 0 };
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      if (this.canvas.closest('.minimap')) window.__mapDraws.mini++;
      if (this.canvas.matches('.bigmap__canvas')) window.__mapDraws.big++;
      return original.apply(this, args);
    };
  })()`)

  async function check(label, action, mini, big = false) {
    await c.ev(`(async () => { ${action}; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); })()`)
    const before = await c.ev('({...window.__mapDraws})')
    // Renderizacao por software pode levar mais de 600 ms por quadro ao remontar a cidade.
    if (mini || big) await waitFor(c, `${mini ? `window.__mapDraws.mini > ${before.mini}` : 'true'} && ${big ? `window.__mapDraws.big > ${before.big}` : 'true'}`, 15000, 100)
    else await sleep(600)
    const after = await c.ev('({...window.__mapDraws})')
    const delta = { mini: after.mini - before.mini, big: after.big - before.big }
    try {
      assert.equal(delta.mini > 0, mini, `${label}: desenhos do minimapa = ${delta.mini}`)
      assert.equal(delta.big > 0, big, `${label}: desenhos do mapa grande = ${delta.big}`)
      console.log('ok:', label, delta)
    } catch (error) { failures.push(error.message); console.error(error.message) }
  }

  await check('cidade visivel', '', true)
  await check('minijogo encobre o mapa', `window.__mg.getState().open('memoria')`, false)
  await check('cidade volta depois do minijogo', 'window.__mg.getState().close()', true)
  await waitFor(c, `!document.querySelector('.loading') && !!window.__life.scene.children.length`)
  await check('menu encobre o mapa', `window.__mapUi.getState().openMenu('config')`, false)
  await check('mapa grande visivel acima do menu', 'window.__mapUi.getState().setBigMap(true)', false, true)
  await check('fechar mapa grande mantem pausa atras do menu', 'window.__mapUi.getState().setBigMap(false)', false)
  await check('fechar menu retoma o minimapa', 'window.__mapUi.getState().closeMenu()', true)
  await check('mapa grande pausa somente o minimapa', 'window.__mapUi.getState().setBigMap(true)', false, true)
  // Simula a notificacao do navegador sem congelar o processo que mede os desenhos.
  await check('aba oculta pausa os dois mapas', `Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'))`, false)
  await check('aba visivel retoma o mapa grande', `delete document.hidden; document.dispatchEvent(new Event('visibilitychange'))`, false, true)
  await check('fechar mapa grande retoma o minimapa', 'window.__mapUi.getState().setBigMap(false)', true)
  assert.deepEqual(c.logs.filter((s) => s.startsWith('EXC:')), [], 'nao deve haver erros JavaScript')
  assert.deepEqual(failures, [], 'regressoes do minimapa')
} finally {
  await c.close()
}
