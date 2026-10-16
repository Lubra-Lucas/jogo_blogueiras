// Varre posicoes ao redor de cada ponto de minijogo/loja e mostra onde [E] ficaria ambiguo (sentar x usar x conversar).
import { launch, sleep, waitReady } from './cdp.mjs'
import { enter } from './flow.mjs'
const c = await launch({ url: 'http://localhost:5175/jogo_blogueiras/?quality=low' })
const S = (e) => c.ev(e)
try {
  await waitReady(c)
  for (const poi of (process.argv[2] ?? 'cafe-rose').split(',')) {
    await enter(c, poi)
    const spots = JSON.parse(await S(`JSON.stringify(window.__interior.bridge.room.spots.map(s=>({k:s.key,l:s.label,x:s.x-window.__interior.bridge.room.ox,z:s.z-window.__interior.bridge.room.oz,a:s.action.type||s.action})))`))
    for (const s of spots.filter((s) => s.a === 'minigame' || s.a === 'shop')) {
      const res = []
      for (const [dx, dz] of [[0, 0], [0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7], [0, 1.0], [1.0, 0], [-1.0, 0]]) {
        await S(`window.__interior.tp(${s.x + dx}, ${s.z + dz})`)
        await sleep(900)
        res.push(JSON.parse(await S(`JSON.stringify({dx:${dx},dz:${dz},pr:(window.__interior.store.getState().prompt||{}).label||null, sit:(window.__sit.store.getState().nearest||{}).label||null})`)))
      }
      console.log(poi, s.k, JSON.stringify(res))
    }
    await S(`window.__interior.exit()`)
    await sleep(2500)
  }
} catch (e) { console.log('ERR', e.message) } finally { await c.close(); console.log('DONE') }
