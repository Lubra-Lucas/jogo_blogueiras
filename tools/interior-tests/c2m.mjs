import { launch, sleep, waitReady } from './cdp.mjs'
import { enter, J } from './flow.mjs'
const W = 480, H = 270
const c = await launch({ url: 'http://localhost:5175/jogo_blogueiras/?quality=low', w: W, h: H })
try {
  await waitReady(c)
  await enter(c, 'cafe-rose')
  await c.shot('C:/Users/user/AppData/Local/Temp/claude/shots/interiorbug/c2m-0.png')
  for (const [fx, fy] of [[0.5, 0.78], [0.5, 0.65], [0.3, 0.7]]) {
    await c.click(W * fx, H * fy)
    await sleep(3000)
    console.log(fx, fy, await c.ev(`JSON.stringify({c2m:window.__c2m, p:window.__sit.player.getState().position})`))
  }
  await c.shot('C:/Users/user/AppData/Local/Temp/claude/shots/interiorbug/c2m-1.png')
} catch (e) { console.log(e.stack) } finally { await c.close() }
