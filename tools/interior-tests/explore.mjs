import { launch, sleep, waitReady } from './cdp.mjs'
const OUT = 'C:/Users/user/AppData/Local/Temp/claude/shots/interiorbug/'
const c = await launch({ url: 'http://localhost:5175/jogo_blogueiras/' })
try {
  await waitReady(c)
  const st = () => c.ev(`JSON.stringify({near:window.__ia.getState().nearby&&window.__ia.getState().nearby.id, room:window.__interior.store.getState().roomId, prompt:window.__interior.store.getState().prompt&&window.__interior.store.getState().prompt.label, active: document.querySelector('.ia-prompt,.in-prompt')?.className})`)
  console.log(await st())
  await c.shot(OUT + 'a0.png')
  await c.ev(`window.__interior.door('cafe-rose')`)
  await sleep(2500)
  console.log(await st())
  await c.shot(OUT + 'a1.png')
  await c.key('KeyE', 'e')
  await sleep(4000)
  console.log(await st())
  await c.shot(OUT + 'a2.png')
  console.log(c.logs.slice(0, 10))
} finally { await c.close() }
