// Para cada sala: entra pela porta (tecla E), lista os pontos de uso, vai ate cada ponto de minijogo/loja e aperta E.
import { launch, sleep, waitReady } from './cdp.mjs'
const OUT = 'C:/Users/user/AppData/Local/Temp/claude/shots/interiorbug/'
const c = await launch({ url: 'http://localhost:5175/jogo_blogueiras/' })
const S = (e) => c.ev(e)
try {
  await waitReady(c)
  for (const poi of (process.argv[2] ?? 'cafe-rose').split(',')) {
    await S(`window.__interior.door('${poi}')`)
    await sleep(1500)
    await c.key('KeyE', 'e')
    for (let i = 0; i < 100; i++) { await sleep(500); if (await S(`!!window.__interior.store.getState().roomId && !window.__interior.store.getState().loading`)) break }
    await sleep(2500)
    const spots = JSON.parse(await S(`JSON.stringify(window.__interior.bridge.room.spots.map(s=>({k:s.key,l:s.label,x:s.x-window.__interior.bridge.room.ox,z:s.z-window.__interior.bridge.room.oz,r:s.radius,a:s.action.type||s.action})))`))
    console.log(poi, 'spots', JSON.stringify(spots))
    for (const s of spots.filter((s) => s.a === 'minigame' || s.a === 'shop')) {
      await S(`window.__interior.tp(${s.x}, ${s.z})`)
      await sleep(1800)
      const pr = await S(`JSON.stringify({prompt:window.__interior.store.getState().prompt&&window.__interior.store.getState().prompt.label, seat: !!window.__sit.store.getState().seat})`)
      await c.key('KeyE', 'e')
      await sleep(1500)
      const after = await S(`JSON.stringify({mg:window.__mg.getState().active, shop: !!window.__shop.getState().open, seat: !!window.__sit.store.getState().seat})`)
      console.log('  ', s.k, 'before', pr, 'after', after)
      await c.shot(OUT + `spot-${poi}-${s.k.replace(/[^a-z0-9]/gi, '_')}.png`)
      await S(`window.__mg.getState().close(); window.__shop.getState().closeShop && window.__shop.getState().closeShop()`)
      await sleep(500)
    }
    await S(`window.__interior.exit()`)
    await sleep(2500)
  }
  console.log(c.logs.filter((l) => !/emissive|Clock|deprecated/.test(l)).slice(0, 10))
} catch (e) { console.log('ERR', e.message) } finally { await c.close() }
