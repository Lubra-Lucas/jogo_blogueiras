import { launch, sleep } from './cdp.mjs'
const OUT = 'C:/Users/user/AppData/Local/Temp/claude/shots/interiorbug/'
const c = await launch({ url: 'http://localhost:5175/jogo_blogueiras/' })
try {
  for (let i = 0; i < 12; i++) {
    await sleep(10000)
    console.log(i, await c.ev(`JSON.stringify({loading:!!document.querySelector('.loading'), hasInt: !!window.__interior, canvas: !!document.querySelector('canvas')})`))
  }
  await c.shot(OUT + 'b0.png')
  console.log(c.logs.filter(l=>!/emissive|Clock|deprecated/.test(l)).slice(0, 10))
} finally { await c.close() }
