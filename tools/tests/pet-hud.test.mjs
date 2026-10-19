// Com Vite dev rodando: EDGE=/caminho/do/chromium node tools/tests/pet-hud.test.mjs
import { strict as assert } from 'node:assert'
import { launch, sleep, waitFor } from '../interior-tests/cdp.mjs'

const c = await launch({ url: 'http://localhost:5173/jogo_blogueiras/?offline=1&quality=low', w: 480, h: 640, touch: true })
try {
  await waitFor(c, `!!window.__pets && !!window.__petRt && !document.querySelector('.loading')`)
  await c.ev(`(async () => {
    const { usePetCatalog } = await import('/jogo_blogueiras/src/game/pets/catalog.ts');
    const breed = usePetCatalog.getState().breeds.find(b => b.species === 'dog');
    if (!breed) throw new Error('Catalogo de cachorros nao carregou');
    const id = 'pet.' + breed.id + '.' + breed.coats[0].id;
    window.__pets.setState({ needs: { [id]: { hunger: 80, joy: 40, t: Date.now() } } });
    window.__pets.getState().setActive(id);
  })()`)
  await waitFor(c, `!!document.querySelector('.pet-chip') && window.__petRt.dist < 2.7`)
  await sleep(1000)
  assert.equal(await c.ev(`!!document.querySelector('.pet-prompt')`), false, 'nao deve exibir aviso constante de carinho perto do cachorro')
  console.log('ok: cachorro proximo sem aviso flutuante')

  await c.ev(`document.querySelector('.pet-chip').click()`)
  await waitFor(c, `!!document.querySelector('.pet-panel')`)
  const before = await c.ev(`window.__pets.getState().needsOf(window.__pets.getState().active).joy`)
  const clicked = await c.ev(`(() => {
    const button = [...document.querySelectorAll('.pet-panel button')].find(b => b.textContent.trim() === 'Fazer carinho');
    if (!button) return false;
    button.click(); return true;
  })()`)
  assert.equal(clicked, true, 'carinho continua disponivel no painel, inclusive no toque')
  const after = await c.ev(`window.__pets.getState().needsOf(window.__pets.getState().active).joy`)
  assert.ok(after > before, 'carinho do painel aumenta a alegria do pet')
  assert.equal(await c.ev(`window.__pets.getState().event?.kind`), 'pet')
  console.log('ok: carinho pelo painel aumenta alegria e dispara animacao')
  await c.ev(`document.querySelector('.pet-panel button[aria-label="Fechar"]').click()`)
  await waitFor(c, `!document.querySelector('.pet-panel')`)
  assert.equal(await c.ev(`!!document.querySelector('.pet-prompt')`), false)
  assert.deepEqual(c.logs.filter(s => s.startsWith('EXC:')), [], 'sem erros JavaScript')
  console.log('ok: fechar painel mantem a tela sem aviso de carinho')
} finally {
  await c.close()
}
