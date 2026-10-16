import { launch, sleep, waitReady } from './cdp.mjs'
import { enter, state } from './flow.mjs'
const c = await launch({ url: 'http://localhost:5175/jogo_blogueiras/?quality=low', w: 640, h: 360 })
try {
  await waitReady(c)
  const fps = () => c.ev(`new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0>3000)r(n/3);else requestAnimationFrame(f)};requestAnimationFrame(f)})`)
  console.log('fps city', await fps())
  await enter(c, 'cafe-rose')
  console.log('fps room', await fps())
  await c.ev(`window.__interior.tp(-1.2, -0.7)`)
  for (let i = 0; i < 6; i++) { await sleep(1000); console.log(JSON.stringify(await state(c)), await c.ev(`JSON.stringify(window.__sit.player.getState().position)`)) }
  await c.shot('C:/Users/user/AppData/Local/Temp/claude/shots/interiorbug/diag.png')
} catch (e) { console.log(e.stack) } finally { await c.close() }
