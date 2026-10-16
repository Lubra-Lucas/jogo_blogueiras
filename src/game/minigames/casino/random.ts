/**
 * Aleatoriedade do cassino: uniforme e sem viés (crypto.getRandomValues com rejeição).
 * Nenhum resultado é "ajustado" depois de sorteado: o sorteio decide e a tela só mostra.
 * Nos testes, `setRandomSource` troca a fonte por uma semente fixa.
 */
let source: (() => number) | null = null

export function setRandomSource(fn: (() => number) | null) {
  source = fn
}

/** Número em [0, 1). */
export function rand(): number {
  if (source) return source()
  const c = (globalThis as { crypto?: Crypto }).crypto
  if (c?.getRandomValues) {
    const b = new Uint32Array(2)
    c.getRandomValues(b)
    // 53 bits
    return ((b[0] >>> 5) * 67108864 + (b[1] >>> 6)) / 9007199254740992
  }
  return Math.random()
}

/** Inteiro uniforme em [0, n). */
export function randInt(n: number): number {
  if (n <= 1) return 0
  if (source) return Math.min(n - 1, Math.floor(source() * n))
  const c = (globalThis as { crypto?: Crypto }).crypto
  if (c?.getRandomValues) {
    const limit = Math.floor(4294967296 / n) * n
    const b = new Uint32Array(1)
    for (;;) {
      c.getRandomValues(b)
      if (b[0] < limit) return b[0] % n
    }
  }
  return Math.floor(Math.random() * n)
}

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
