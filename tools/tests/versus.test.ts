// Teste da classificacao da competicao ao vivo (src/game/net/standings.ts).
// Uso: npm run test:versus
import { strict as assert } from 'node:assert'

import { standings, parseMatchBase } from '../../src/game/net/standings.ts'
import { parseMatchData } from '../../src/game/minigames/estilista/matchData.ts'

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
// looks de outra jogadora: indice preservado, invalidos viram null
const parsed = parseMatchData({ looks: [{ hairId: 'x' }, 'lixo', null, { a: 1 }], points: [80, 50, 10, NaN] })
assert.deepEqual(parsed.map((e) => e?.points ?? null), [80, null, null, null])
assert.deepEqual(parseMatchData({ looks: 'x', points: [] }), [])
assert.deepEqual(parseMatchData(null), [])
// config de partida de outra jogadora: so dificuldade conhecida + seed numerica
assert.deepEqual(parseMatchBase({ difficulty: 'dificil', seed: 7, extra: 1 }), { difficulty: 'dificil', seed: 7 })
assert.equal(parseMatchBase({ difficulty: 'impossivel', seed: 7 }), null)
assert.equal(parseMatchBase({ difficulty: 'normal', seed: '7' }), null)
assert.equal(parseMatchBase(null), null)
console.log('versus ok')
