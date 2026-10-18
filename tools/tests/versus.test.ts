// Teste da classificacao da competicao ao vivo (src/game/net/standings.ts).
// Uso: npm run test:versus
import { strict as assert } from 'node:assert'

import { standings } from '../../src/game/net/standings.ts'

const players = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bia' }, { id: 'c', name: 'Cris' }]
const rows = standings(players, {
  c: { name: 'Cris', score: 900, detail: '90%', done: true },
  a: { name: 'Ana', score: 1200, detail: '95%', done: false },
})
assert.deepEqual(rows.map((r) => r.id), ['a', 'c', 'b'], 'maior placar primeiro, sem placar no fim')
assert.deepEqual(rows[2], { id: 'b', name: 'Bia', score: 0, detail: '', done: false }, 'quem nao pontuou aparece com 0 e nao terminou')

// quem ainda nao pontuou fica depois de quem pontuou 0
const zero = standings(players, { b: { name: 'Bia', score: 0, detail: '0%', done: false } })
assert.equal(zero[0].id, 'b')
console.log('versus ok')
