// Teste de fumaca dos interiores (Edge headless + CDP). Para cada sala: entrar -> usar cada ponto de minijogo/loja
// (tecla E, clique no aviso, toque) -> sair do minijogo -> andar (WASD e click-to-move) -> sair da sala.
//
// Uso (servidor de teste estavel em outro terminal):
//   npx vite --config tools/interior-tests/vite.test.config.mjs --port 5175 --strictPort
//   node tools/interior-tests/interior.test.mjs [pois separados por virgula] [--touch] [--url=http://localhost:5175/jogo_blogueiras/]
// Sai com codigo 1 se algo falhar. Capturas em $SHOTS (padrao: pasta temporaria do sistema).
import { launch, sleep, waitReady } from './cdp.mjs'
import { enter, roomSpots, state, J } from './flow.mjs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const touch = args.includes('--touch')
const url = (args.find((a) => a.startsWith('--url=')) ?? '--url=http://localhost:5175/jogo_blogueiras/?quality=low').slice(6)
const pois = (args.find((a) => !a.startsWith('--')) ?? 'cafe-rose,salao-spa,boutique,joalheria,estudio-fotos,palco-neon,cassino').split(',')
const SHOTS = process.env.SHOTS ?? join(tmpdir(), 'interior-tests')
const fails = []
const ok = (cond, msg) => { console.log((cond ? '  ok   ' : '  FALHA ') + msg); if (!cond) fails.push(msg) }

const W = 480
const H = 270
const c = await launch({ url, touch, w: W, h: H })
const pos = () => J(c, `(()=>{const p=window.__sit.player.getState().position;return {x:p.x,z:p.z}})()`)
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)

/** espera (polling) ate a condicao valer; maquina lenta (swiftshader) = poucos fps, nada de sleeps fixos */
async function until(fn, ms = 60000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    if (await fn()) return true
    await sleep(250)
  }
  return false
}

/** segura uma tecla ate o jogador andar `min` metros (ou estourar o tempo) */
async function hold(code, key, vk, min = 0.4, ms = 60000) {
  const p0 = await pos()
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk })
  await until(async () => dist(p0, await pos()) > min, ms)
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk })
  return dist(p0, await pos())
}

/** aperta o aviso do interior pelo meio indicado */
async function use(via) {
  if (via === 'key') return c.key('KeyE', 'e')
  const p = await J(c, `(()=>{const b=document.querySelector('.in-prompt .in-btn');if(!b)return null;const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  if (!p) return false
  await c.click(p.x, p.y, { touch: via === 'touch' })
}

/** fecha o minijogo/loja como o jogador: botao "Sair"/fechar se existir, senao pela store */
async function leave() {
  await c.ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>/^\s*(Sair|Voltar|Fechar)\s*$/i.test(b.textContent));if(b)b.click()})()`)
  await sleep(600)
  await c.ev(`window.__mg.getState().close(); window.__shop.getState().open && window.__shop.getState().closeShop && window.__shop.getState().closeShop()`)
  await sleep(600)
}

try {
  await waitReady(c)
  let n = 0
  for (const poi of pois) {
    console.log(`\n== ${poi}`)
    await enter(c, poi, touch ? 'touch' : n++ % 2 ? 'button' : 'key')
    const s0 = await state(c)
    ok(!!s0.room, `entrou na sala (${s0.room})`)
    ok(s0.near === null, 'aviso de porta da cidade sumiu dentro da sala')
    await c.shot(join(SHOTS, `${poi}-1-dentro.png`))
    const spots = (await roomSpots(c)).filter((s) => s.a === 'minigame' || s.a === 'shop')
    for (const sp of spots) {
      const via = touch ? 'touch' : ['key', 'click'][spots.indexOf(sp) % 2]
      for (const [dx, dz] of [[0, 0.7], [0.5, 0]]) {
        await c.ev(`window.__interior.tp(${sp.x + dx}, ${sp.z + dz})`)
        await until(async () => (await state(c)).prompt === sp.l, 60000)
        const st = await state(c)
        if (st.prompt !== sp.l) { console.log(`  (pulando offset ${dx},${dz}: aviso "${st.prompt}" != "${sp.l}")`); continue }
        await use(via)
        await until(async () => { const q = await state(c); return q.mg || q.shop || q.seated }, 40000)
        const a = await state(c)
        ok(a.mg === sp.id || (sp.a === 'shop' && a.shop), `${sp.k} via ${via} (${dx},${dz}): abriu ${sp.a} ${sp.id} (mg=${a.mg} shop=${a.shop} sentou=${a.seated})`)
        await c.shot(join(SHOTS, `${poi}-2-${sp.k.replace(/[^a-z0-9]/gi, '_')}.png`))
        await leave()
        const b = await state(c)
        ok(!b.mg && !b.shop, 'minijogo/loja fechou')
        // movimento volta: WASD
        await c.ev(`window.__interior.tp(${sp.x}, ${sp.z + 0.8})`)
        await sleep(800)
        const d = await hold('KeyD', 'd', 68)
        ok(d > 0.3, `WASD anda depois do minijogo (${d.toFixed(2)} m)`)
        break
      }
    }
    // click-to-move dentro da sala
    await c.ev(`window.__interior.tp(${(await roomSpots(c)).find((s) => s.a === 'exit').x}, ${(await roomSpots(c)).find((s) => s.a === 'exit').z - 1.2})`)
    await sleep(1200)
    const q0 = await pos()
    let moved = 0
    for (const [fx, fy] of [[0.5, 0.78], [0.33, 0.72], [0.67, 0.72], [0.5, 0.65]]) {
      await c.click(W * fx, H * fy, { touch })
      await until(async () => dist(q0, await pos()) > 0.8, 60000)
      moved = Math.max(moved, dist(q0, await pos()))
      if (moved > 0.8) break
    }
    ok(moved > 0.8, `click-to-move dentro da sala (andou ${moved.toFixed(2)} m)`)
    await c.shot(join(SHOTS, `${poi}-3-clicktomove.png`))
    // sair pela porta
    const ex = (await roomSpots(c)).find((s) => s.a === 'exit')
    await c.ev(`window.__interior.tp(${ex.x}, ${ex.z})`)
    await until(async () => (await state(c)).prompt === 'Sair', 60000)
    await use(touch ? 'touch' : 'key')
    for (let i = 0; i < 120; i++) { await sleep(500); if (!(await c.ev(`!!window.__interior.bridge.room`))) break }
    await sleep(1500)
    const out = await state(c)
    ok(!out.room, 'saiu da sala')
    const dw = await hold('KeyS', 's', 83)
    ok(dw > 0.3, `anda na cidade depois de sair (${dw.toFixed(2)} m)`)
  }
} catch (e) {
  fails.push('excecao: ' + e.message)
  console.log('ERRO', e.stack)
} finally {
  console.log('\nerros de console:', c.logs.filter((l) => /^(error|EXC)/.test(l)).slice(0, 5))
  await c.close()
  console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK')
  process.exit(fails.length ? 1 : 0)
}
