import { randInt } from './random'

/**
 * Caça-níqueis "Glam": 5 rolos x 3 linhas, 10 linhas de pagamento (da esquerda para a direita).
 * Cada rolo tem uma fita fixa; a posição de parada é sorteada de forma uniforme e a tela mostra
 * exatamente o que saiu. Nada é ajustado depois do sorteio (sem "quase lá" fabricado).
 * O retorno teórico (RTP) é calculado por enumeração completa de todas as combinações (ver
 * `computeRtp`), e é o número exibido na tabela de pagamentos.
 */
export type SymbolId = 'batom' | 'salto' | 'bolsa' | 'diamante' | 'coroa' | 'estrela' | 'coracao'

export const SYMBOLS: SymbolId[] = ['coracao', 'batom', 'salto', 'bolsa', 'diamante', 'coroa', 'estrela']
export const SYMBOL_NAME: Record<SymbolId, string> = {
  batom: 'Batom', salto: 'Salto alto', bolsa: 'Bolsa', diamante: 'Diamante', coroa: 'Coroa', estrela: 'Estrela (curinga)', coracao: 'Coração',
}
export const WILD: SymbolId = 'estrela'

/** multiplicador da aposta por linha para 3, 4 e 5 iguais */
export const PAYTABLE: Record<SymbolId, [number, number, number]> = {
  coracao: [5, 12, 40],
  batom: [8, 22, 60],
  salto: [10, 30, 100],
  bolsa: [12, 45, 160],
  diamante: [25, 90, 320],
  coroa: [40, 200, 800],
  estrela: [40, 200, 800],
}

export const ROWS = 3
export const REELS = 5
export const LINES = 10

/** linhas: índice da fileira (0 topo, 1 meio, 2 base) em cada rolo */
export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 0, 1, 0],
]

/** pesos de cada símbolo numa fita de 30 casas (iguais em todos os rolos) */
const WEIGHTS: Record<SymbolId, number> = { coracao: 8, batom: 7, salto: 6, bolsa: 4, diamante: 3, coroa: 1, estrela: 1 }

function buildStrip(offset: number): SymbolId[] {
  // distribuição espalhada: símbolos iguais evitam ficar juntos
  const bag: SymbolId[] = []
  for (const s of SYMBOLS) for (let i = 0; i < WEIGHTS[s]; i++) bag.push(s)
  const strip: SymbolId[] = new Array(bag.length)
  const n = bag.length
  const step = 11 // coprimo com 30
  for (let i = 0; i < n; i++) strip[(i * step + offset) % n] = bag[i]
  return strip
}

export const STRIPS: SymbolId[][] = Array.from({ length: REELS }, (_, i) => buildStrip(i * 3))
export const STRIP_LEN = STRIPS[0].length

/** 3 símbolos visíveis (topo, meio, base) de um rolo parado na posição `stop` (centro da janela). */
export function windowAt(reel: number, stop: number): SymbolId[] {
  const s = STRIPS[reel]
  const n = s.length
  return [s[(stop - 1 + n) % n], s[stop % n], s[(stop + 1) % n]]
}

export type Grid = SymbolId[][] // [rolo][fileira]

export function gridFromStops(stops: number[]): Grid {
  return stops.map((st, r) => windowAt(r, st))
}

export interface LineWin {
  line: number
  symbol: SymbolId
  count: number
  pay: number // multiplicador da aposta por linha
  cells: [number, number][] // [rolo, fileira]
}

/** Melhor pagamento da linha: o curinga substitui qualquer símbolo. */
export function evalLine(grid: Grid, line: number): LineWin | null {
  const path = PAYLINES[line]
  let best: LineWin | null = null
  for (const sym of SYMBOLS) {
    let count = 0
    for (let r = 0; r < REELS; r++) {
      const g = grid[r][path[r]]
      if (g === sym || g === WILD) count++
      else break
    }
    if (count >= 3) {
      const pay = PAYTABLE[sym][count - 3]
      if (!best || pay > best.pay) {
        best = { line, symbol: sym, count, pay, cells: path.slice(0, count).map((row, r) => [r, row] as [number, number]) }
      }
    }
  }
  return best
}

export function evalGrid(grid: Grid, lineBet: number): { wins: LineWin[]; total: number } {
  const wins: LineWin[] = []
  for (let l = 0; l < LINES; l++) {
    const w = evalLine(grid, l)
    if (w) wins.push(w)
  }
  return { wins, total: wins.reduce((a, w) => a + w.pay * lineBet, 0) }
}

/** Sorteia as paradas: uma por rolo, uniforme. */
export function drawStops(): number[] {
  return Array.from({ length: REELS }, () => randInt(STRIP_LEN))
}

/**
 * RTP teórico exato. Cada linha de pagamento vê, em cada rolo, um símbolo cuja probabilidade é a
 * fração dele na fita (a parada é uniforme). Pela linearidade da esperança, o retorno é a soma
 * das linhas, e cada linha é uma enumeração de 7^5 combinações de símbolos com suas probabilidades.
 */
export function computeRtp(): { rtp: number; lineHit: number } {
  const p: Record<SymbolId, number>[] = STRIPS.map((strip) => {
    const o = {} as Record<SymbolId, number>
    for (const s of SYMBOLS) o[s] = 0
    for (const s of strip) o[s] += 1 / strip.length
    return o
  })
  let ev = 0
  let hit = 0
  const idx = [0, 0, 0, 0, 0]
  const total = SYMBOLS.length ** REELS
  for (let t = 0; t < total; t++) {
    let x = t
    let prob = 1
    const syms: SymbolId[] = []
    for (let r = 0; r < REELS; r++) {
      idx[r] = x % SYMBOLS.length
      x = Math.floor(x / SYMBOLS.length)
      const s = SYMBOLS[idx[r]]
      syms.push(s)
      prob *= p[r][s]
    }
    if (prob === 0) continue
    const grid: Grid = syms.map((s) => [s, s, s])
    const w = evalLine(grid, 0)
    if (w) {
      ev += prob * w.pay
      hit += prob
    }
  }
  // retorno por unidade apostada: cada uma das 10 linhas rende `ev` por unidade de aposta de linha
  return { rtp: ev, lineHit: hit }
}

/** RTP exibido na tabela (calculado na hora, por enumeração exata). */
export const THEORETICAL_RTP = computeRtp().rtp

export const SLOT_BETS = [10, 20, 50, 100, 200]
