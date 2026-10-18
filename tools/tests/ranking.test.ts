// Teste do ranking online (competition.ts): corte do top 9, a jogadora no lugar certo e a posicao real.
// Uso: npm run test:ranking
import { strict as assert } from 'node:assert'

Object.assign(globalThis, { localStorage: { getItem: () => null, setItem: () => {}, length: 0, key: () => null }, window: { location: { search: '' } } })
const { buildBoard, trueRank } = await import('../../src/game/minigames/shared/competition.ts')

const others = Array.from({ length: 15 }, (_, i) => ({ name: `R${i}`, score: (i + 1) * 100 })) // 100..1500

let b = buildBoard(others, { name: 'Eu', score: 250, you: true })
assert.equal(b.length, 10, 'top 9 + voce')
assert.equal(b[0].score, 1500)
assert.ok(b.some((e) => e.you), 'voce aparece mesmo abaixo do corte')
assert.deepEqual(b.map((e) => e.score), [...b.map((e) => e.score)].sort((x, y) => y - x), 'ordenado')
assert.equal(trueRank(others, 250), 14, 'posicao real passa de 10')

b = buildBoard(others, { name: 'Eu', score: 9999, you: true })
assert.equal(b[0].you, true, 'recorde maior fica em primeiro')
assert.equal(trueRank(others, 9999), 1)
console.log('ranking.test: ok')
