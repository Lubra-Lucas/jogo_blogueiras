import { strict as assert } from 'node:assert'
import { cardKey, freshDeck, Shoe, type Card, type Suit } from '../../src/game/minigames/casino/cards.ts'
import { setRandomSource, randInt } from '../../src/game/minigames/casino/random.ts'
import { evaluate, categoryOf, handName } from '../../src/game/minigames/casino/pokerEval.ts'
import { PokerEngine } from '../../src/game/minigames/casino/pokerEngine.ts'
import { decideBot, BOT_STYLES } from '../../src/game/minigames/casino/pokerBots.ts'
import { basicStrategy, handValue, judgeHand, payoutFor, dealerShouldHit } from '../../src/game/minigames/casino/blackjack.ts'
import * as R from '../../src/game/minigames/casino/roulette.ts'
import * as S from '../../src/game/minigames/casino/slots.ts'

let passed = 0
const t = (name: string, fn: () => void) => {
  try {
    fn()
    passed++
    console.log('  ok   ' + name)
  } catch (e) {
    console.log('  FALHA ' + name + '\n        ' + (e as Error).message)
    process.exitCode = 1
  }
}

const SU: Record<string, Suit> = { c: 0, d: 1, h: 2, s: 3 }
const RK: Record<string, number> = { T: 10, J: 11, Q: 12, K: 13, A: 14 }
const parse = (s: string): Card[] => s.split(' ').map((x) => ({ r: RK[x[0]] ?? Number(x[0]), s: SU[x[1]] }))
const ev = (s: string) => evaluate(parse(s))
const cat = (s: string) => categoryOf(ev(s))

console.log('Baralho e sapato')
t('baralho tem 52 cartas unicas', () => assert.equal(new Set(freshDeck().map(cardKey)).size, 52))
t('sapato de 6 baralhos tem 312 cartas', () => assert.equal(new Shoe(6).remaining, 312))

console.log('Avaliador de poker')
t('royal flush', () => assert.equal(handName(ev('As Ks Qs Js Ts 2d 3c')), 'Royal flush'))
t('straight flush', () => assert.equal(cat('9h 8h 7h 6h 5h Ac Kd'), 8))
t('roda A-2-3-4-5 e sequencia (alta 5)', () => {
  assert.equal(cat('As 2d 3c 4h 5s 9c Kd'), 4)
  assert.ok(ev('6s 2d 3c 4h 5s 9c Kd') > ev('As 2d 3c 4h 5s 9c Kd'))
})
t('quadra com kicker', () => assert.ok(ev('7s 7d 7c 7h As 2c 3d') > ev('7s 7d 7c 7h Ks 2c 3d')))
t('full house com duas trincas', () => assert.equal(handName(ev('Ks Kd Kc 9h 9s 9c 2d')), 'Full house (Reis e Noves)'))
t('full house vence flush', () => assert.ok(ev('Ks Kd Kc 2h 2s 9c 4d') > ev('As Js 9s 6s 3s Kd Qc')))
t('flush usa as 5 maiores do naipe', () => assert.ok(ev('As Ks 9s 6s 3s 2s 4d') > ev('As Ks 9s 6s 2s 3d 4c')))
t('sequencia vence trinca', () => assert.ok(ev('5s 6d 7c 8h 9s Kc Kd') > ev('Ks Kd Kc 2h 7s 9c 4d')))
t('tres pares: escolhe os 2 maiores + melhor kicker', () => {
  assert.equal(ev('Ks Kd 9c 9h 4s 4c Ad'), ev('Ks Kd 9c 9h As 2c 3d'))
  assert.equal(cat('Ks Kd 9c 9h 4s 4c Ad'), 2)
})
t('par: kickers decidem', () => assert.ok(ev('Qs Qd As Kc 9h 3s 2c') > ev('Qs Qd As Jc 9h 3s 2c')))
t('carta alta', () => assert.equal(cat('As Kd 9c 6h 4s 3c 2d'), 0))
t('empate exato', () => assert.equal(ev('As Ks Qs Js 9d 2c 3c'), ev('As Ks Qs Js 9d 2h 4c')))
t('sequencia de 7 cartas pega a mais alta', () => assert.equal(handName(ev('5s 6d 7c 8h 9s Tc Jd')), 'Sequência até Valete'))
t('hierarquia completa em ordem crescente', () => {
  const hands = ['As Kd 9c 6h 4s 3c 2d', 'As Ad 9c 6h 4s 3c 2d', 'As Ad 9c 9h 4s 3c 2d', 'As Ad Ac 6h 4s 3c 2d', '5s 6d 7c 8h 9s 3c 2d',
    'As Ks 9s 6s 3s 2d 4c', 'As Ad Ac 6h 6s 3c 2d', '2s 2d 2c 2h 4s 3c 5d', '9h 8h 7h 6h 5h Ac Kd']
  const sc = hands.map(ev)
  for (let i = 1; i < sc.length; i++) assert.ok(sc[i] > sc[i - 1], `${hands[i]} > ${hands[i - 1]}`)
})
t('Monte Carlo: AA contra mao aleatoria vence ~85%', () => {
  setRandomSource(null)
  let w = 0
  const n = 6000
  for (let i = 0; i < n; i++) {
    const d = freshDeck().filter((c) => !(c.r === 14 && (c.s === 0 || c.s === 3)))
    for (let k = d.length - 1; k > 0; k--) {
      const j = randInt(k + 1)
      ;[d[k], d[j]] = [d[j], d[k]]
    }
    const board = d.slice(0, 5)
    const me = evaluate([{ r: 14, s: 0 }, { r: 14, s: 3 }, ...board])
    const op = evaluate([d[5], d[6], ...board])
    if (me > op) w++
    else if (me === op) w += 0.5
  }
  const p = w / n
  console.log(`        AA vs aleatoria = ${(p * 100).toFixed(1)}%`)
  assert.ok(p > 0.83 && p < 0.87, `AA=${p.toFixed(3)}`)
})

console.log('Motor de poker')
const mk = (stacks: number[]) => new PokerEngine(stacks.map((s, i) => ({ name: 'J' + i, human: i === 0, stack: s, style: i })), 10, 20)
const total = (e: PokerEngine) => e.seats.reduce((a, s) => a + s.stack, 0)
t('fichas conservadas em 500 maos de bots', () => {
  setRandomSource(null)
  const e = mk([1000, 1000, 1000, 1000, 1000])
  for (let h = 0; h < 500; h++) {
    for (const s of e.seats) if (s.stack < 200) (s.stack += 800, (s.out = false))
    const before = total(e)
    if (!e.startHand()) break
    let guard = 0
    while (e.phase !== 'done' && guard++ < 400) {
      if (e.phase === 'runout') {
        e.runoutStep()
        continue
      }
      const d = decideBot(e, e.toAct, 'normal')
      assert.ok(e.act(e.toAct, d.action), 'acao invalida ' + JSON.stringify(d.action))
    }
    assert.equal(e.phase, 'done')
    assert.equal(total(e), before, 'mao ' + h)
    assert.equal(Object.values(e.won).reduce((a, b) => a + b, 0), 0, 'ganhos liquidos somam zero')
  }
})
t('potes laterais: all-in curto nao leva o pote dos outros', () => {
  const e = mk([100, 300, 300])
  e.startHand()
  e.seats[0].cards = parse('As Ad')
  e.seats[1].cards = parse('Kh Kd')
  e.seats[2].cards = parse('7c 2d')
  e.deck = parse('2h 5c 9d 4s 3h 6c Js').reverse()
  let g = 0
  while (e.phase === 'betting' && g++ < 20) {
    const o = e.options(e.toAct)
    e.act(e.toAct, o.canRaise ? { type: 'raise', to: o.maxRaiseTo } : { type: 'call' })
  }
  while (e.phase === 'runout') e.runoutStep()
  assert.equal(e.phase, 'done')
  assert.equal(e.pots.length, 2, 'principal + lateral')
  assert.equal(e.pots[0].amount, 300)
  assert.equal(e.pots[1].amount, 400)
  assert.equal(e.seats[0].stack + e.seats[1].stack + e.seats[2].stack, 700)
  assert.deepEqual(e.pots[0].winners, [0])
  assert.deepEqual(e.pots[1].winners, [1])
})
t('todos desistem: ultimo leva o pote sem showdown', () => {
  const e = mk([500, 500, 500])
  e.startHand()
  let g = 0
  while (e.phase === 'betting' && g++ < 10) e.act(e.toAct, { type: 'fold' })
  assert.equal(e.phase, 'done')
  assert.equal(e.showdown, false)
  assert.equal(total(e), 1500)
})
t('empate divide o pote', () => {
  const e = mk([500, 500])
  e.startHand()
  e.seats[0].cards = parse('2c 3d')
  e.seats[1].cards = parse('2h 3s')
  e.deck = parse('As Ks Qs Js Ts 9d 8d').reverse()
  let g = 0
  while (e.phase === 'betting' && g++ < 30) {
    const o = e.options(e.toAct)
    e.act(e.toAct, o.canCheck ? { type: 'check' } : { type: 'call' })
  }
  assert.equal(e.phase, 'done')
  assert.deepEqual(e.pots[0].winners.sort(), [0, 1])
  assert.equal(e.seats[0].stack, 500)
})
t('heads-up: o botao e o small blind', () => {
  const e = mk([500, 500])
  e.startHand()
  assert.equal(e.seats[e.button].bet, 10)
})

console.log('Blackjack')
t('valor de mao: As conta 11 ou 1', () => {
  assert.deepEqual(handValue(parse('As 6d')), { total: 17, soft: true, bust: false })
  assert.deepEqual(handValue(parse('As 6d Kc')), { total: 17, soft: false, bust: false })
  assert.equal(handValue(parse('As Ad 9c')).total, 21)
  assert.equal(handValue(parse('Ks Qd 5c')).bust, true)
})
t('banca para no 17 mole', () => {
  assert.equal(dealerShouldHit(parse('As 6d')), false)
  assert.equal(dealerShouldHit(parse('As 5d')), true)
  assert.equal(dealerShouldHit(parse('Ks 7d')), false)
  assert.equal(dealerShouldHit(parse('Ks 5d')), true)
})
t('pagamentos: blackjack 3:2, vitoria 1:1, empate devolve', () => {
  assert.equal(payoutFor('bj', 100), 250)
  assert.equal(payoutFor('win', 100), 200)
  assert.equal(payoutFor('push', 100), 100)
  assert.equal(payoutFor('lose', 100), 0)
  assert.equal(payoutFor('bj', 10), 25)
})
t('julgamento: natural vs 21 depois de dividir', () => {
  assert.equal(judgeHand(parse('As Kd'), parse('Ks 9d'), false), 'bj')
  assert.equal(judgeHand(parse('As Kd'), parse('Ks 9d'), true), 'win')
  assert.equal(judgeHand(parse('As Kd'), parse('Ac Qd'), false), 'push')
  assert.equal(judgeHand(parse('Ks 6d Qc'), parse('Ks 9d'), false), 'bust')
  assert.equal(judgeHand(parse('Ks 8d'), parse('Qs 8d'), false), 'push')
  assert.equal(judgeHand(parse('Ks 8d'), parse('Ks 6d Qd'), false), 'win')
})
t('estrategia basica: casos classicos', () => {
  const can = { double: true, split: true }
  const cant = { double: false, split: false }
  assert.equal(basicStrategy(parse('Ks 6d'), parse('Td')[0], cant), 'hit')
  assert.equal(basicStrategy(parse('Ks 6d'), parse('6d')[0], cant), 'stand')
  assert.equal(basicStrategy(parse('5s 6d'), parse('6d')[0], can), 'double')
  assert.equal(basicStrategy(parse('As 8d'), parse('6d')[0], can), 'double')
  assert.equal(basicStrategy(parse('As 8d'), parse('6d')[0], cant), 'stand')
  assert.equal(basicStrategy(parse('8s 8d'), parse('Td')[0], can), 'split')
  assert.equal(basicStrategy(parse('Ts Td'), parse('6d')[0], can), 'stand')
  assert.equal(basicStrategy(parse('As Ad'), parse('Td')[0], can), 'split')
  assert.equal(basicStrategy(parse('9s 3d'), parse('2d')[0], cant), 'hit')
  assert.equal(basicStrategy(parse('2s 3d 7c'), parse('Ad')[0], cant), 'hit')
})
t('simulacao: estrategia basica custa pouco (casa entre -0,3% e 1,5%)', () => {
  setRandomSource(null)
  const shoe = new Shoe(6)
  let net = 0
  let staked = 0
  for (let g = 0; g < 400000; g++) {
    if (shoe.needsShuffle) shoe.reshuffle()
    const up = shoe.draw()
    const p1 = shoe.draw()
    const hole = shoe.draw()
    const p2 = shoe.draw()
    const dealer = [up, hole]
    const hands: { c: Card[]; bet: number; split: boolean; done: boolean }[] = [{ c: [p1, p2], bet: 1, split: false, done: false }]
    const dBj = handValue(dealer).total === 21
    const pBj = handValue(hands[0].c).total === 21
    if (dBj || pBj) {
      staked += 1
      net += pBj && dBj ? 0 : pBj ? 1.5 : -1
      continue
    }
    for (let h = 0; h < hands.length; h++) {
      const H = hands[h]
      let guard = 0
      while (!H.done && guard++ < 30) {
        const splitAces = H.split && H.c[0].r === 14
        const canSplit = H.c.length === 2 && H.c[0].r === H.c[1].r && hands.length < 4
        const a = basicStrategy(H.c, up, { double: H.c.length === 2 && !splitAces, split: canSplit })
        if (a === 'stand') H.done = true
        else if (a === 'hit') {
          H.c.push(shoe.draw())
          if (handValue(H.c).bust || handValue(H.c).total === 21) H.done = true
        } else if (a === 'double') {
          H.bet *= 2
          H.c.push(shoe.draw())
          H.done = true
        } else {
          const second: Card[] = [H.c.pop() as Card]
          const aces = H.c[0].r === 14
          H.c.push(shoe.draw())
          second.push(shoe.draw())
          H.split = true
          hands.push({ c: second, bet: H.bet, split: true, done: aces })
          if (aces) H.done = true
        }
      }
    }
    if (hands.some((x) => !handValue(x.c).bust)) while (dealerShouldHit(dealer)) dealer.push(shoe.draw())
    for (const H of hands) {
      staked += H.bet
      net += payoutFor(judgeHand(H.c, dealer, H.split), H.bet) - H.bet
    }
  }
  const edge = -net / staked
  console.log(`        borda da casa simulada: ${(edge * 100).toFixed(2)}% (400 mil rodadas)`)
  assert.ok(edge > -0.003 && edge < 0.015, 'edge ' + edge)
})

console.log('Roleta')
t('roda tem 37 casas unicas', () => assert.equal(new Set(R.WHEEL_ORDER).size, 37))
t('18 vermelhos, 18 pretos, 1 verde', () => {
  let r = 0
  let b = 0
  let g = 0
  for (let n = 0; n <= 36; n++) {
    const c = R.colorOf(n)
    if (c === 'red') r++
    else if (c === 'black') b++
    else g++
  }
  assert.deepEqual([r, b, g], [18, 18, 1])
})
t('todos os tipos de aposta tem retorno esperado 36/37', () => {
  const bets = [R.straight(17), R.split(17, 18), R.street(5), R.corner(4, 0), R.sixline(3), R.column(1), R.dozen(2),
    R.outside('red'), R.outside('black'), R.outside('odd'), R.outside('even'), R.outside('low'), R.outside('high')]
  for (const spec of bets) {
    let sum = 0
    for (let n = 0; n <= 36; n++) sum += R.betReturn({ spec, amount: 1 }, n)
    assert.ok(Math.abs(sum / 37 - 36 / 37) < 1e-12, `${spec.kind} ${sum / 37}`)
  }
})
t('pagamentos pontuais', () => {
  assert.equal(R.betReturn({ spec: R.straight(7), amount: 10 }, 7), 360)
  assert.equal(R.betReturn({ spec: R.outside('red'), amount: 10 }, 7), 20)
  assert.equal(R.betReturn({ spec: R.outside('red'), amount: 10 }, 0), 0)
  assert.equal(R.betReturn({ spec: R.dozen(0), amount: 10 }, 12), 30)
  assert.equal(R.betReturn({ spec: R.outside('even'), amount: 10 }, 0), 0)
  assert.deepEqual(R.street(0).nums, [1, 2, 3])
  assert.deepEqual(R.corner(0, 0).nums, [1, 2, 4, 5])
  assert.deepEqual(R.column(2).nums.slice(0, 3), [3, 6, 9])
})
t('sorteio uniforme (qui-quadrado, 37 casas, 370 mil giros)', () => {
  setRandomSource(null)
  const cnt = new Array<number>(37).fill(0)
  const N = 370000
  for (let i = 0; i < N; i++) cnt[R.spin()]++
  const e = N / 37
  const chi = cnt.reduce((a, c) => a + (c - e) ** 2 / e, 0)
  console.log(`        qui-quadrado = ${chi.toFixed(1)} (36 gl; < 58 e ok a 1%)`)
  assert.ok(chi < 58)
})

console.log('Caca-niqueis')
t('fitas com o mesmo tamanho', () => {
  for (const s of S.STRIPS) assert.equal(s.length, S.STRIP_LEN)
})
t('RTP teorico exato', () => {
  const { rtp, lineHit } = S.computeRtp()
  console.log(`        RTP teorico = ${(rtp * 100).toFixed(2)}%  (linha premiada: ${(lineHit * 100).toFixed(2)}%)`)
  assert.ok(rtp > 0.9 && rtp < 0.98, 'rtp ' + rtp)
})
t('simulacao confirma o RTP (500 mil giros)', () => {
  setRandomSource(null)
  const { rtp } = S.computeRtp()
  let ret = 0
  const spins = 500_000
  let hits = 0
  for (let i = 0; i < spins; i++) {
    const g = S.gridFromStops(S.drawStops())
    const r = S.evalGrid(g, 1).total
    ret += r
    if (r > 0) hits++
  }
  const sim = ret / spins / S.LINES
  console.log(`        RTP simulado = ${(sim * 100).toFixed(2)}%  (giros com algum premio: ${((hits / spins) * 100).toFixed(1)}%)`)
  assert.ok(Math.abs(sim - rtp) < 0.03, `sim ${sim} vs ${rtp}`)
})
t('curinga substitui; premio de 3', () => {
  const g = [['salto', 'batom', 'salto'], ['salto', 'estrela', 'salto'], ['salto', 'batom', 'salto'], ['salto', 'coracao', 'salto'], ['salto', 'salto', 'salto']] as S.Grid
  const w = S.evalLine(g, 0)
  assert.ok(w && w.symbol === 'batom' && w.count === 3 && w.pay === S.PAYTABLE.batom[0])
})
t('o simbolo mostrado e o sorteado (janela == fita)', () => {
  for (let r = 0; r < S.REELS; r++) {
    for (let st = 0; st < S.STRIP_LEN; st++) assert.equal(S.windowAt(r, st)[1], S.STRIPS[r][st])
  }
})
t('5 personalidades de bots', () => assert.equal(BOT_STYLES.length, 5))

console.log(`\n${passed} testes passaram${process.exitCode ? ' (com falhas)' : ''}.`)
