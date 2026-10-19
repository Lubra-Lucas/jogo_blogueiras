// Com Vite dev rodando: EDGE=/caminho/do/chromium node tools/tests/garment-motion.test.mjs
import { strict as assert } from 'node:assert'
import { launch, waitFor } from '../interior-tests/cdp.mjs'

const c = await launch({ url: 'http://localhost:5173/jogo_blogueiras/?offline=1&quality=low', w: 480, h: 640, touch: true })
try {
  await waitFor(c, `!!window.__appearance && !!window.__life && !document.querySelector('.loading')`)
  // Este teste verifica materiais, nao FPS; reduz pixels para o renderer por software.
  await c.ev('window.__life.gl.setPixelRatio(0.25)')
  for (const [id, slot, skirt] of [
    ['skinny_jeans', 'bottom', false],
    ['flare_pants', 'bottom', false],
    ['palazzo', 'bottom', false],
    ['cargo', 'bottom', false],
    ['tailored_trousers', 'bottom', false],
    ['leggings', 'bottom', false],
    ['jumpsuit', 'dress', false],
    ['pencil_skirt', 'bottom', true],
    ['gala_train_gown', 'dress', true],
  ]) {
    await c.ev(`(() => {
      const s = window.__appearance.getState();
      s.setAppearance({ ...s.appearance, gender: 'female', outfit: { ${slot}: { id: '${id}' } }, accessories: [] });
    })()`)
    await waitFor(c, `(() => {
      let n = 0;
      window.__life.scene.traverse(m => { if (m.isSkinnedMesh && m.name.startsWith('${id}_')) n++; });
      return n > 0;
    })()`)
    // Aguarda um ciclo completo do scanner, inclusive em renderer lento (dt limitado a 0,05 s).
    await c.ev(`new Promise(resolve => {
      let elapsed = 0, last = performance.now();
      requestAnimationFrame(function frame(now) {
        elapsed += Math.min((now - last) / 1000, 0.05); last = now;
        if (elapsed >= 1.2) resolve(); else requestAnimationFrame(frame);
      });
    })`)
    const materials = await c.ev(`(() => {
      const rows = [];
      window.__life.scene.traverse(m => {
        if (m.isSkinnedMesh && m.name.startsWith('${id}_')) rows.push({ name: m.material.name, skirt: !!m.material.userData.__sec?.skirt });
      });
      return rows;
    })()`)
    assert.ok(materials.length > 0, `${id}: roupa deve continuar montada`)
    assert.ok(materials.every(m => m.skirt === skirt), `${id}: efeito de saia incorreto: ${JSON.stringify(materials)}`)
    console.log('ok:', id, skirt ? 'balanco de saia preservado em todos os materiais' : 'sem deslocamento de saia nos materiais da calca')
  }
  assert.deepEqual(c.logs.filter(s => s.startsWith('EXC:')), [], 'sem erros JavaScript')
} finally {
  await c.close()
}
