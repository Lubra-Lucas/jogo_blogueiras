/** Geração (determinística, por semente) das clientes e dos seus pedidos. */
import { DEFAULT_APPEARANCE, type Appearance } from '../../../shared/appearance'
import { rng, type Difficulty } from '../shared/competition'
import type { Look, StyleTag } from '../desfile/types'
import { COOL, FAMILY_HINT, WARM, type Family } from './palette'
import { OCCASIONS } from './occasions'
import type { Client, Secret } from './types'

const NAMES = ['Helena', 'Aisha', 'Mariana', 'Yumi', 'Camila', 'Tainá', 'Beatriz', 'Sofia', 'Zuri', 'Luiza', 'Ingrid', 'Dandara', 'Clara', 'Rafaela', 'Nara', 'Lívia', 'Amara', 'Júlia']
const VIP_NAMES = ['Condessa Valentina', 'Dona Eleonora', 'Madame Odette', 'Lady Cassandra']
const SKIN = ['#f3d9c8', '#efcdbd', '#e2b99a', '#d9a98a', '#c68863', '#a8694a', '#8a5238', '#6b4128', '#4a2c1b']
const HAIRS = ['hair.meshyUpdo', 'hair.chestnutWaves', 'hair.platinumUndercut', 'hair.caramelCurls']
const HAIR_COLORS = ['#16141a', '#3a2417', '#4a2f22', '#816b58', '#b07a45', '#d8b46e', '#e8dcc8']
const LIPS = ['#a8566e', '#b3262e', '#c4806f', '#8a3a3a', '#d09a94', '#6e1f2f']
const MORPH_KEYS = ['bustBig', 'bustSmall', 'buttBig', 'buttSmall', 'hipsWide', 'thighsThick', 'waistThin', 'weightUp', 'weightDown', 'shouldersNarrow', 'lipsFull', 'eyesBig', 'cheekbonesHigh', 'faceThin']

export const CLIENTS_PER_ROUND: Record<Difficulty, number> = { facil: 3, normal: 4, dificil: 4, estrela: 5 }
const BASE_TIME: Record<Difficulty, number> = { facil: 80, normal: 65, dificil: 55, estrela: 45 }
const BUDGET_CHANCE: Record<Difficulty, number> = { facil: 0.45, normal: 0.55, dificil: 0.65, estrela: 0.8 }
const VAGUE_CHANCE: Record<Difficulty, number> = { facil: 0, normal: 0.45, dificil: 0.75, estrela: 1 }

const SECRETS: Secret[] = [
  { kind: 'want', slot: 'head', text: 'Faço questão de usar algo na cabeça.' },
  { kind: 'want', slot: 'gloves', text: 'Eu não saio sem luvas.' },
  { kind: 'want', slot: 'ears', text: 'Brincos são obrigatórios para mim.' },
  { kind: 'want', slot: 'legwear', text: 'Quero meias, não abro mão.' },
  { kind: 'avoid', slot: 'neck', text: 'Não suporto nada no pescoço.' },
  { kind: 'avoid', slot: 'gloves', text: 'Detesto qualquer coisa nas mãos.' },
  { kind: 'minimal', text: 'Menos é mais: poucos acessórios, por favor.' },
  { kind: 'loud', text: 'Quero chamar atenção, o raro me atrai!' },
]

function pick<T>(r: () => number, list: readonly T[]): T {
  return list[Math.floor(r() * list.length)]
}

function persona(r: () => number): { base: Appearance; look0: Look } {
  const hairId = pick(r, HAIRS)
  const hairColor = pick(r, HAIR_COLORS)
  const morphs: Record<string, number> = {}
  const n = 2 + Math.floor(r() * 3)
  for (let i = 0; i < n; i++) morphs[pick(r, MORPH_KEYS)] = Math.round((0.3 + r() * 0.45) * 100) / 100
  const lips = pick(r, LIPS)
  const base: Appearance = {
    ...DEFAULT_APPEARANCE,
    morphs,
    skin: { tone: pick(r, SKIN) },
    suit: { color: '#efe6d6', finish: 'satin' },
    lips: { color: lips, gloss: 0.5 },
    hair: { id: hairId, color: hairColor },
    outfit: {},
    accessories: [],
  }
  const look0: Look = {
    hairId, hairColor, top: null, bottom: null, dress: null, jewelry: [], accessories: [],
    suitColor: '#efe6d6', suitFinish: 'satin', lipsColor: lips, lipsGloss: 0.5,
  }
  return { base, look0 }
}

function buildBrief(c: Omit<Client, 'brief' | 'hintTags'>, r: () => number, budgetHint: string | null): string {
  const occ = OCCASIONS.find((o) => o.id === c.occasion)!
  const vague = c.clarity === 'vague'
  const parts: string[] = [`${pick(r, vague ? occ.vague : occ.clear)}.`]
  const colorClauses: string[] = []
  if (c.hate) colorClauses.push(vague ? `Nada que lembre ${FAMILY_HINT[c.hate]}.` : `Odeio ${c.hate}.`)
  if (c.love) colorClauses.push(vague ? `Sou fã de tudo que lembre ${FAMILY_HINT[c.love]}.` : `Adoro ${c.love}.`)
  if (c.palette) colorClauses.push(vague ? (c.palette === 'quente' ? 'Gosto do clima de um pôr do sol.' : 'Gosto do clima de uma manhã de inverno.') : `Quero cores ${c.palette === 'quente' ? 'quentes' : 'frias'}.`)
  if (c.tone) colorClauses.push(vague ? (c.tone === 'claro' ? 'Quero me sentir leve como uma nuvem.' : 'Quero a noite vestida em mim.') : `Quero algo ${c.tone === 'claro' ? 'leve e claro' : 'escuro e marcante'}.`)
  // vago: perde uma pista de cor (mas sempre sobra ao menos uma)
  if (vague && colorClauses.length > 1 && r() < 0.5) colorClauses.splice(Math.floor(r() * colorClauses.length), 1)
  parts.push(...colorClauses)
  if (budgetHint) parts.push(budgetHint)
  return parts.join(' ')
}

/**
 * Gera as clientes da rodada. `seed` igual = mesmas clientes (Desafio do dia).
 * `vipOn` troca a última cliente por uma VIP (pedido mais difícil).
 */
export function makeClients(seed: number, difficulty: Difficulty, vipOn: boolean): Client[] {
  const r = rng(seed)
  const n = CLIENTS_PER_ROUND[difficulty]
  const occPool = [...OCCASIONS].sort(() => r() - 0.5)
  const names = [...NAMES].sort(() => r() - 0.5)
  const out: Client[] = []
  for (let i = 0; i < n; i++) {
    const vip = vipOn && i === n - 1
    const occ = occPool[i % occPool.length]
    const { base, look0 } = persona(r)
    const clarity: Client['clarity'] = vip || r() < VAGUE_CHANCE[difficulty] ? 'vague' : 'clear'
    const palette: Client['palette'] = r() < 0.45 ? (r() < 0.5 ? 'quente' : 'frio') : null
    const tone = r() < 0.4 ? (r() < 0.5 ? 'claro' : 'escuro') : null
    const sideOf = (f: Family) => (WARM.includes(f) ? 'quente' : COOL.includes(f) ? 'frio' : 'neutro')
    const chroma: Family[] = ['vermelho', 'laranja', 'amarelo', 'verde', 'azul', 'roxo', 'rosa']
    const loveOpts = chroma.filter((f) => !palette || sideOf(f) === palette)
    const loveWanted = r() < 0.55 || vip
    const love = loveWanted ? pick(r, loveOpts) : null
    const hateOpts = chroma.filter((f) => f !== love && (!palette || sideOf(f) !== palette))
    const hate = r() < 0.75 || vip ? pick(r, hateOpts.length ? hateOpts : chroma.filter((f) => f !== love)) : null
    // ao menos uma pista de cor
    const hasColor = hate || love || palette || tone
    const palette2: Client['palette'] = hasColor ? palette : 'quente'
    // orçamento: aperta a cada cliente (a dificuldade sobe na partida)
    let budget: number | null = null
    let budgetHint: string | null = null
    if (vip || r() < BUDGET_CHANCE[difficulty]) {
      const tier = pick(r, [300, 240, 190, 160])
      const squeeze = (difficulty === 'estrela' ? 0.88 : difficulty === 'dificil' ? 0.94 : 1) * (1 - 0.05 * i)
      budget = Math.max(130, Math.round((tier * squeeze) / 5) * 5)
      budgetHint = budget <= 170 ? pick(r, ['Estou de olho no orçamento.', 'Hoje o bolso está curto.']) : budget <= 230 ? pick(r, ['Não quero gastar demais.', 'Quero algo com bom custo-benefício.']) : pick(r, ['Posso investir um pouco.', 'Hoje eu me dou um presente.'])
    }
    const secret = r() < 0.7 || vip ? pick(r, SECRETS) : null
    const core: Omit<Client, 'brief' | 'hintTags'> = {
      id: `c${i}-${seed % 9973}`,
      name: vip ? pick(r, VIP_NAMES) : names[i % names.length],
      vip,
      base,
      look0,
      occasion: occ.id,
      tags: occ.tags,
      formality: occ.formality,
      hate,
      love,
      palette: palette2,
      tone,
      budget,
      secret,
      clarity,
      timeLimit: Math.max(30, BASE_TIME[difficulty] - 3 * i - (vip ? 5 : 0)),
    }
    const hintTags = (Object.entries(occ.tags) as [StyleTag, number][]).sort((a, b) => b[1] - a[1]).slice(0, 2).map((e) => e[0])
    out.push({ ...core, brief: buildBrief(core, r, budgetHint), hintTags })
  }
  return out
}
