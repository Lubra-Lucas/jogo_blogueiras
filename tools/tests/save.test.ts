// Teste do save por personagem (src/net/save.ts): o que vai para o banco e o que fica no aparelho.
// Uso: npm run test:save
import { strict as assert } from 'node:assert'

const mem = new Map<string, string>()
const ls = {
  get length() { return mem.size },
  key: (i: number) => [...mem.keys()][i] ?? null,
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
}
Object.assign(globalThis, { localStorage: ls, window: { location: { search: '' } } })
const { snapshot, restore } = await import('../../src/net/save.ts')

// progresso da personagem A + chaves do aparelho
ls.setItem('jb.profile.v1', '{"name":"A","coins":500}')
ls.setItem('jdb.feed.photos', '[]')
ls.setItem('jb.quality.v1', '"high"')
ls.setItem('sb-iybz-auth-token', 'sessao')

assert.deepEqual(snapshot(), { 'jb.profile.v1': '{"name":"A","coins":500}', 'jdb.feed.photos': '[]' }, 'snapshot leva o progresso e deixa aparelho/sessao de fora')

// entrar com a personagem B: o progresso de A some, aparelho e sessao ficam; save malicioso nao pisa na sessao
restore({ 'jb.profile.v1': '{"name":"B"}', 'sb-iybz-auth-token': 'roubada' })
assert.equal(ls.getItem('jb.profile.v1'), '{"name":"B"}')
assert.equal(ls.getItem('jdb.feed.photos'), null, 'progresso da personagem anterior apagado')
assert.equal(ls.getItem('jb.quality.v1'), '"high"', 'preferencia do aparelho mantida')
assert.equal(ls.getItem('sb-iybz-auth-token'), 'sessao', 'sessao do login nunca vem do save')

// personagem nova (save vazio) comeca do zero
restore({})
assert.deepEqual(snapshot(), {})
console.log('save.test: ok')
