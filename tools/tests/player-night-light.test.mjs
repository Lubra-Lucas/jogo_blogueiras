// Com Vite dev rodando: EDGE=/caminho/do/chromium node tools/tests/player-night-light.test.mjs
import { strict as assert } from 'node:assert'
import { launch, waitFor } from '../interior-tests/cdp.mjs'

const c = await launch({ url: 'http://localhost:5173/jogo_blogueiras/?offline=1&quality=low&time=0', w: 480, h: 640, touch: true })
try {
  await waitFor(c, `!!window.__life && !!window.__env && !document.querySelector('.loading')`)
  const exists = await c.ev(`!!window.__life.scene.getObjectByName('player-night-light')`)
  assert.equal(exists, true, 'personagem deve ter sua luz noturna')
  await c.ev('window.__life.gl.setPixelRatio(0.25)')
  await c.ev(`(async () => { window.__testClock = (await import('/jogo_blogueiras/src/game/world/environment/envStore.ts')).setHour; })()`)
  const sample = () => c.ev(`(() => {
    const l = window.__life.scene.getObjectByName('player-night-light');
    const p = window.__life.player.getState().position;
    return { intensity: l.intensity, visible: l.visible, shadows: l.castShadow, range: l.distance, x: l.position.x, z: l.position.z, distance: Math.hypot(l.position.x - p.x, l.position.z - p.z) };
  })()`)
  const night = await sample()
  assert.ok(night.visible && night.intensity > 0 && night.intensity <= 3, 'luz suave durante a noite')
  assert.equal(night.shadows, false, 'sem custo de sombras adicionais')
  assert.ok(night.range <= 4 && night.distance < 2, 'luz de curto alcance proxima da personagem')
  console.log('ok: luz noturna local, suave e sem sombras')

  const brightness = await c.ev(`(async () => {
    const { WebGLRenderTarget } = await import('/jogo_blogueiras/node_modules/.vite/deps/three.js');
    const { scene, gl, player } = window.__life;
    const camera = scene.__cam, light = scene.getObjectByName('player-night-light');
    const p = player.getState();
    const center = p.position.clone();
    center.y += -0.825 + p.fit.height * 0.55;
    center.project(camera);
    const target = new WebGLRenderTarget(192, 256);
    const previous = gl.getRenderTarget(), visible = light.visible;
    const pixels = new Uint8Array(192 * 256 * 4);
    const measure = () => {
      gl.setRenderTarget(target); gl.render(scene, camera);
      gl.readRenderTargetPixels(target, 0, 0, 192, 256, pixels);
      const cx = Math.round((center.x + 1) * 96), cy = Math.round((center.y + 1) * 128);
      let sum = 0, count = 0;
      for (let y = Math.max(0, cy - 10); y < Math.min(256, cy + 10); y++) {
        for (let x = Math.max(0, cx - 5); x < Math.min(192, cx + 5); x++) {
          const i = (y * 192 + x) * 4;
          sum += pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722; count++;
        }
      }
      return sum / count;
    };
    try {
      light.visible = false; const off = measure();
      light.visible = true; const on = measure();
      return { off, on };
    } finally { light.visible = visible; gl.setRenderTarget(previous); target.dispose(); }
  })()`)
  assert.ok(brightness.on > brightness.off + 1, `personagem deve ficar visivelmente mais clara: ${JSON.stringify(brightness)}`)
  console.log('ok: render da personagem mais claro com luz ligada', brightness)

  await c.ev(`window.__testClock(12)`)
  await waitFor(c, `window.__env.night === 0 && !window.__life.scene.getObjectByName('player-night-light').visible`)
  assert.equal((await sample()).intensity, 0)
  console.log('ok: luz apagada durante o dia')

  await c.ev(`window.__testClock(19)`)
  await waitFor(c, `window.__life.scene.getObjectByName('player-night-light').intensity > 0`)
  assert.ok((await sample()).intensity < night.intensity, 'anoitecer usa brilho intermediario')
  await c.ev(`window.__testClock(0); const p = window.__life.player.getState().position; window.__life.nav.teleport = { x: p.x + 4, z: p.z + 3, yaw: null }`)
  await waitFor(c, `Math.hypot(window.__life.scene.getObjectByName('player-night-light').position.x - ${night.x}, window.__life.scene.getObjectByName('player-night-light').position.z - ${night.z}) > 2`)
  assert.ok((await sample()).distance < 2, 'luz acompanha a personagem ao mudar de posicao')
  console.log('ok: brilho gradual ao anoitecer e luz acompanha a personagem')
  assert.deepEqual(c.logs.filter(s => s.startsWith('EXC:')), [], 'sem erros JavaScript')
} finally {
  await c.close()
}
