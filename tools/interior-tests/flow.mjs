import { sleep } from './cdp.mjs'

export const S = (c, e) => c.ev(e)
export const J = async (c, e) => JSON.parse(await c.ev(`JSON.stringify(${e})`))

/** Teleporta para a porta e espera o aviso "Entrar" da cidade. */
export async function goToDoor(c, poi) {
  await c.ev(`window.__interior.door('${poi}')`)
  for (let i = 0; i < 400; i++) {
    await sleep(300)
    if (await c.ev(`window.__ia.getState().nearby?.id === '${poi}'`)) return true
  }
  return false
}

/** Entra pela porta usando a tecla E ou o botao "Entrar" (via: 'key' | 'button' | 'touch'). */
export async function enter(c, poi, via = 'key') {
  const t0 = Date.now()
  const log = (m) => console.log('   [' + Math.round((Date.now() - t0) / 1000) + 's] ' + m)
  log('indo para a porta')
  if (!(await goToDoor(c, poi))) throw new Error('aviso da porta nao apareceu: ' + poi)
  await sleep(500)
  log('porta ok, apertando')
  if (via === 'key') await c.key('KeyE', 'e')
  else {
    const p = await J(c, `(()=>{const b=[...document.querySelectorAll('.ia-prompt .ia-btn')].find(b=>/Entrar/.test(b.textContent));if(!b)return null;const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
    if (!p) throw new Error('botao Entrar nao existe')
    await c.click(p.x, p.y, { touch: via === 'touch' })
  }
  for (let i = 0; i < 600; i++) {
    await sleep(500)
    if (await c.ev(`!!window.__interior.store.getState().roomId && !window.__interior.store.getState().loading && window.__interior.bridge.room!=null`)) break
  }
  log('esperou a sala')
  const ok = await c.ev(`!!window.__interior.bridge.room`)
  if (!ok) throw new Error('nao entrou na sala ' + poi)
  await sleep(2500)
}

export const roomSpots = (c) =>
  J(c, `window.__interior.bridge.room.spots.map(s=>({k:s.key,l:s.label,x:s.x-window.__interior.bridge.room.ox,z:s.z-window.__interior.bridge.room.oz,r:s.radius,a:s.action.type||s.action,id:s.action.id}))`)

export const state = (c) =>
  J(c, `({room:window.__interior.store.getState().roomId, prompt:(window.__interior.store.getState().prompt||{}).label||null, sit:(window.__sit.store.getState().nearest||{}).label||null, seated:!!window.__sit.store.getState().seat, mg:window.__mg.getState().active, shop:!!window.__shop.getState().open, near:(window.__ia.getState().nearby||{}).id||null, fade:window.__nav?1:0})`)
