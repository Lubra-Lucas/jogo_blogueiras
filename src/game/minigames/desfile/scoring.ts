/**
 * Regras de pontuação do desfile (puras, sem three/React).
 *
 * Cada critério vira um valor 0..1 (`rawScores`); cada jurado converte para 1..10 com a sua personalidade
 * (`judgeScores`: viés + pequena variação determinística) e pesos próprios. A nota final de um competidor é a
 * média dos 3 totais dos jurados (1..10) e `score100` = média x 10.
 *
 *  tema        = 0,60 x combinação de tags (peça a peça, ponderada) + 0,15 x formalidade + 0,25 x cores do tema
 *  harmonia    = melhor esquema de cores (mono/análogo/complementar/tríade) sobre matizes saturados (colors.ts)
 *  criatividade= 0,35 x peças preenchidas + 0,35 x raridade média + 0,20 x variedade de tags + 0,10 x cor de fantasia
 *  poses       = média das 3 poses (Perfeito 1,0 / Bom 0,65 / Errou 0,15)
 */
import { colorDistance, harmony, hexToHsl } from './colors'
import { catalogByCategory, catalogItem, lookColors } from './adapters'
import type { CatalogItem, Competitor, JudgeResult, Look, PoseGrade, ScoreBreakdown, StyleTag, Theme } from './types'

export const POSE_VALUE: Record<PoseGrade, number> = { perfect: 1, good: 0.65, miss: 0.15 }

// ----------------------------------------------------------------- peças do look

interface Piece {
  tags: StyleTag[]
  weight: number
  formality: number
  rarity: number
}

const FINISH_PIECE: Record<Look['suitFinish'], { tags: StyleTag[]; formality: number }> = {
  latex: { tags: ['y2k', 'goth'], formality: 0.5 },
  satin: { tags: ['gala', 'romantico'], formality: 0.7 },
  matte: { tags: ['casual', 'esportivo'], formality: 0.25 },
}

function pieces(look: Look): { list: Piece[]; filled: number } {
  const list: Piece[] = []
  const add = (it: CatalogItem | undefined, weight: number) => {
    if (it) list.push({ tags: it.tags, weight, formality: it.formality, rarity: it.rarity })
    return !!it
  }
  let filled = 0
  if (add(catalogItem(look.hairId), 1)) filled++
  const dress = catalogItem(look.dress?.id)
  if (dress) {
    add(dress, 1.5)
    add(dress, 1.5)
    filled += 2
  } else {
    // peça que falta entra como "vazia" (peso, sem tags): looks sem roupa perdem pontos de tema
    if (!add(catalogItem(look.top?.id), 1.5)) list.push({ tags: [], weight: 1.5, formality: 0.1, rarity: 0 })
    else filled++
    if (!add(catalogItem(look.bottom?.id), 1.5)) list.push({ tags: [], weight: 1.5, formality: 0.1, rarity: 0 })
    else filled++
  }
  let j = 0
  for (const p of look.jewelry) if (add(catalogItem(p.id), 0.6)) j++
  let a = 0
  for (const p of look.accessories) if (add(catalogItem(p.id), 0.8)) a++
  if (j) filled++
  if (a) filled++
  const f = FINISH_PIECE[look.suitFinish]
  list.push({ tags: f.tags, weight: 0.4, formality: f.formality, rarity: 0 })
  return { list, filled }
}

function tagMatch(tags: StyleTag[], theme: Theme): number {
  const ws = tags.map((t) => theme.tags[t] ?? 0).sort((x, y) => y - x)
  if (!ws.length) return 0
  return Math.min(1, ws[0] + 0.15 * (ws[1] ?? 0))
}

export interface RawScores {
  theme: number
  colors: number
  creativity: number
  harmonyScheme: string
}

/** Notas 0..1 de tema, cores e criatividade (poses entram depois). */
export function rawScores(look: Look, theme: Theme): RawScores {
  const { list, filled } = pieces(look)
  const wsum = list.reduce((s, p) => s + p.weight, 0) || 1
  const tagScore = list.reduce((s, p) => s + p.weight * tagMatch(p.tags, theme), 0) / wsum
  const withForm = list.filter((p) => p.tags.length)
  const avgForm = withForm.length ? withForm.reduce((s, p) => s + p.formality, 0) / withForm.length : 0.1
  const formAlign = 1 - Math.min(1, Math.abs(avgForm - theme.formality) / 0.6)

  const colors = lookColors(look).slice(0, 5) // cabelo, macacão, batom, roupas
  const hint =
    colors.slice(0, 2).concat(colors.slice(3)).reduce((s, c) => {
      const d = Math.min(...theme.colors.map((t) => colorDistance(c, t)))
      return s + Math.max(0, 1 - d / 0.3)
    }, 0) / Math.max(1, colors.length - 1)
  const themeRaw = 0.6 * tagScore + 0.15 * formAlign + 0.25 * hint

  const h = harmony(lookColors(look))

  const withRarity = list.filter((p) => p.tags.length)
  const rarity = withRarity.length ? withRarity.reduce((s, p) => s + p.rarity, 0) / withRarity.length / 4 : 0
  const distinct = new Set(list.flatMap((p) => p.tags)).size
  const hairHsl = hexToHsl(look.hairColor)
  const fantasy = hairHsl.s > 0.4 && hairHsl.l > 0.45 && (hairHsl.h < 20 || hairHsl.h > 190) ? 1 : 0
  const total = look.jewelry.length + look.accessories.length
  let creat = 0.35 * Math.min(1, filled / 5) + 0.35 * Math.min(1, rarity * 1.25) + 0.2 * Math.min(1, distinct / 6) + 0.1 * fantasy
  if (total > 6) creat -= 0.1
  return { theme: clamp01(themeRaw * 1.12), colors: clamp01(h.score), creativity: clamp01(creat * 1.1), harmonyScheme: h.scheme }
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

export function poseScore(grades: PoseGrade[]): number {
  if (!grades.length) return 0
  return grades.reduce((s, g) => s + POSE_VALUE[g], 0) / grades.length
}

// ----------------------------------------------------------------- jurados

export type Criterion = keyof ScoreBreakdown

export interface Judge {
  id: string
  name: string
  title: string
  /** viés em pontos (-/+), somado à nota 1..10 */
  bias: number
  weights: Record<Criterion, number>
  /** cores do avatar */
  skin: string
  hair: string
  hairId: string
  suit: string
  lips: string
  emoji: string
}

export const JUDGES: Judge[] = [
  {
    id: 'madame', name: 'Madame Couture', title: 'a exigente', bias: -1.0,
    weights: { theme: 0.4, colors: 0.3, creativity: 0.1, poses: 0.2 },
    skin: '#d9a98d', hair: '#e8dcc8', hairId: 'hair.meshyUpdo', suit: '#16141a', lips: '#7d1d3f', emoji: '🧐',
  },
  {
    id: 'lulu', name: 'Lulu Fofinha', title: 'a doce', bias: 0.9,
    weights: { theme: 0.2, colors: 0.2, creativity: 0.25, poses: 0.35 },
    skin: '#efcdbd', hair: '#e8a0c0', hairId: 'hair.caramelCurls', suit: '#f7c6dc', lips: '#e0707c', emoji: '🥰',
  },
  {
    id: 'kiki', name: 'Kiki Trend', title: 'a fashionista', bias: 0,
    weights: { theme: 0.2, colors: 0.2, creativity: 0.45, poses: 0.15 },
    skin: '#8a5a3c', hair: '#9fc8ff', hairId: 'hair.platinumUndercut', suit: '#b9e4ff', lips: '#c9a6ff', emoji: '😎',
  },
]

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
function jitter(seed: string): number {
  // -0.6..0.6, determinístico
  return ((hashStr(seed) % 1000) / 1000 - 0.5) * 1.2
}

const to10 = (x: number, bias: number, seed: string) => Math.max(1, Math.min(10, Math.round(1 + 9 * x + bias + jitter(seed))))

/** Nota dos 4 critérios (1..10) de um jurado + total ponderado. */
export function judgeScores(judge: Judge, raw: { theme: number; colors: number; creativity: number; poses: number }, seed: string): { scores: ScoreBreakdown; total: number } {
  const scores: ScoreBreakdown = {
    theme: to10(raw.theme, judge.bias, `${seed}|${judge.id}|t`),
    colors: to10(raw.colors, judge.bias, `${seed}|${judge.id}|c`),
    creativity: to10(raw.creativity, judge.bias + (judge.id === 'kiki' ? raw.creativity * 0.8 : 0), `${seed}|${judge.id}|k`),
    poses: to10(raw.poses, judge.bias, `${seed}|${judge.id}|p`),
  }
  let total = 0
  for (const k of Object.keys(scores) as Criterion[]) total += scores[k] * judge.weights[k]
  return { scores, total: Math.round(total * 10) / 10 }
}

export const CRITERION_LABEL: Record<Criterion, string> = { theme: 'Tema', colors: 'Cores', creativity: 'Criatividade', poses: 'Poses' }

// ----------------------------------------------------------------- comentários

type Band = 'low' | 'mid' | 'high'
const band = (s: number): Band => (s <= 4 ? 'low' : s <= 7 ? 'mid' : 'high')

const COMMENTS: Record<string, Record<Criterion, Record<Band, string[]>>> = {
  madame: {
    theme: {
      low: ['Isso é tema? Eu vi a passarela inteira e não achei o tema.', 'Querida, o tema pediu uma coisa e você ouviu outra.'],
      mid: ['O tema está ali, tímido, escondido atrás do look.', 'Quase! Falta comprometimento com o tema.'],
      high: ['Tema impecável. Até eu levantei a sobrancelha, de aprovação.', 'Isso sim é entender o briefing, magnífico!'],
    },
    colors: {
      low: ['Essas cores brigam entre si. Chamem a segurança.', 'Minha paleta favorita é a que combina. Não foi essa.'],
      mid: ['Cores aceitáveis. Aceitável não é memorável.', 'A harmonia pede mais cuidado, meu bem.'],
      high: ['Paleta refinada. Finalmente, alguém com olhos.', 'Cores em perfeita conversa. Bravo.'],
    },
    creativity: {
      low: ['Já vi esse look. Em 1997. E era melhor.', 'Faltou ousadia. Pelo menos um detalhe, querida!'],
      mid: ['Algum frescor, mas nada de revolução.', 'Boa tentativa de ser diferente.'],
      high: ['Original sem perder a classe. Raríssimo!', 'Que peças especiais! Gostei, e eu nunca gosto.'],
    },
    poses: {
      low: ['Essas poses? Pareciam um flamingo com soluço.', 'Postura, minha filha, postura!'],
      mid: ['Poses corretas, mas sem veneno.', 'Quase na batida. Quase.'],
      high: ['Postura de rainha. Aplausos discretos.', 'Poses no tempo certo. Isso é profissionalismo.'],
    },
  },
  lulu: {
    theme: {
      low: ['Ai, que fofa! Mas… qual era o tema mesmo? 🥺', 'Lindinha, só que o tema ficou no camarim!'],
      mid: ['Gostei! O tema está meio escondidinho, né?', 'Fofo! Só um tiquinho mais de tema e vira perfeito.'],
      high: ['Amei o tema! Parece que saiu de um conto de fadas!', 'Tema perfeito, quero tudo isso para mim!'],
    },
    colors: {
      low: ['Hmm, as cores estão meio brigadinhas, mas eu te amo!', 'Que tal combinar um pouquinho mais as cores?'],
      mid: ['Cores bonitinhas! Dá para melhorar com carinho.', 'Gostei das cores, só uma ou outra fugiu da turma.'],
      high: ['Essas cores parecem docinhos! Ai, que lindas juntas!', 'Paleta de algodão-doce! Nota máxima de fofura!'],
    },
    creativity: {
      low: ['Quero ver mais detalhes, mais brilho, mais LAÇOS!', 'Fofinho, mas bem básico. Ousa mais!'],
      mid: ['Que graça de detalhes! Mais um pouquinho de loucura?', 'Gostei das peças! Dá para brilhar ainda mais.'],
      high: ['Que criatividade! Quero a receita desse look!', 'Cada detalhe é uma surpresa. Eu pulei da cadeira!'],
    },
    poses: {
      low: ['Ai, tropeçou nas poses! Mas ficou fofa mesmo assim.', 'Na próxima você acerta a batida, vai por mim!'],
      mid: ['Poses lindinhas! Quase todas no ritmo!', 'Gostei! Faltou só um pouquinho de swing.'],
      high: ['Essas poses me arrepiaram! Que ritmo!', 'Perfeito! Eu bati palmas sozinha aqui!'],
    },
  },
  kiki: {
    theme: {
      low: ['Tema? Quem precisa, né? Mas ele faria bem ao look.', 'Esse mood não é o do tema. É outro. Não sei qual.'],
      mid: ['Tem vibe, mas o tema ficou no modo avião.', 'Leitura do tema ok. Vi melhor no feed.'],
      high: ['Tema no ponto. Isso vai bombar nas redes!', 'Entendeu o assunto: top de tendência!'],
    },
    colors: {
      low: ['Combinação ousada demais, até para mim. E olha que eu amo.', 'Essa paleta ainda não é tendência. Quem sabe?'],
      mid: ['Cores com potencial! Falta um acento de brilho.', 'Paleta ok, mas já vi igual no feed.'],
      high: ['Essa paleta é de capa de revista!', 'Cores que o algoritmo ama. Viralizou!'],
    },
    creativity: {
      low: ['Cadê a novidade? Isso é look de ontem.', 'Zero ousadia. Vou fingir que não vi.'],
      mid: ['Tem uma ideia legal aí, desenvolve!', 'Gostei do toque autoral. Só mais um pouco!'],
      high: ['Autoral demais! Já quero copiar esse look!', 'Isso é o futuro da moda. Fala sério.'],
    },
    poses: {
      low: ['Poses fora da batida. A trilha foi sem querer?', 'Foto ruim = look perdido. Treina esse tempo!'],
      mid: ['Poses decentes, mas daria para postar melhor.', 'Quase uma capa. Quase!'],
      high: ['Cada pose uma foto perfeita!', 'Essa pose já virou meme (do bem)!'],
    },
  },
}

function pick<T>(arr: T[], seed: string): T {
  return arr[hashStr(seed) % arr.length]
}

/** Comentário do jurado: comenta o pior critério (se algum <= 4) ou o melhor. */
export function judgeComment(judge: Judge, scores: ScoreBreakdown, seed: string): string {
  const keys = (Object.keys(scores) as Criterion[]).slice().sort((a, b) => scores[a] - scores[b])
  const worst = keys[0]
  const best = keys[keys.length - 1]
  const k = scores[worst] <= 4 ? worst : best
  return pick(COMMENTS[judge.id][k][band(scores[k])], `${seed}${judge.id}${k}`)
}

// ----------------------------------------------------------------- NPCs

const NPC_NAMES: { name: string; emoji: string }[] = [
  { name: 'Bia Brilho', emoji: '💎' },
  { name: 'Cacau Chic', emoji: '🍫' },
  { name: 'Duda Dourada', emoji: '🌟' },
  { name: 'Gigi Glamour', emoji: '🦋' },
  { name: 'Mimi Moda', emoji: '🎀' },
  { name: 'Nina Neon', emoji: '🪩' },
]

function rnd<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function itemWeight(it: CatalogItem, theme: Theme): number {
  return 0.25 + 3 * tagMatch(it.tags, theme)
}
function weightedPick(items: CatalogItem[], theme: Theme): CatalogItem {
  const ws = items.map((i) => itemWeight(i, theme))
  let r = Math.random() * ws.reduce((a, b) => a + b, 0)
  for (let i = 0; i < items.length; i++) {
    r -= ws[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

/** Look aleatório com peso para o tema (usado pelas concorrentes). */
export function randomLook(theme: Theme): Look {
  const hairs = catalogByCategory('hair')
  const tops = catalogByCategory('top')
  const bottoms = catalogByCategory('bottom')
  const jew = catalogByCategory('jewelry')
  const acc = catalogByCategory('accessory')
  const hair = weightedPick(hairs, theme)
  const themeColors = theme.colors
  const chosenColor = (it: CatalogItem) => (Math.random() < 0.6 ? rnd(themeColors) : rnd(it.swatches ?? [it.color]))
  const bottom = Math.random() < 0.8 ? weightedPick(bottoms, theme) : null
  const top = Math.random() < 0.7 ? weightedPick(tops, theme) : null
  const usedSlots = new Set<string>()
  const jewelry: Look['jewelry'] = []
  const n = 1 + Math.floor(Math.random() * 4)
  for (let i = 0; i < n; i++) {
    const it = weightedPick(jew, theme)
    const slot = it.slot // uma peça por lugar do corpo
    if (usedSlots.has(slot)) continue
    usedSlots.add(slot)
    jewelry.push({ id: it.id, color: Math.random() < 0.7 ? it.color : rnd(it.swatches ?? [it.color]) })
  }
  const accessories = Math.random() < 0.6 ? [{ id: weightedPick(acc, theme).id, color: '' }] : []
  for (const a of accessories) a.color = catalogItem(a.id)?.color ?? '#ffffff'
  const finishes: Look['suitFinish'][] = ['latex', 'satin', 'matte']
  return {
    hairId: hair.id,
    hairColor: Math.random() < 0.5 ? hair.color : rnd(hair.swatches ?? [hair.color]),
    top: top ? { id: top.id, color: chosenColor(top) } : null,
    bottom: bottom ? { id: bottom.id, color: chosenColor(bottom) } : null,
    dress: null,
    jewelry,
    accessories,
    suitColor: rnd(themeColors),
    suitFinish: rnd(finishes),
    lipsColor: rnd(['#da7076', '#c0394f', '#ff8fb8', '#7d1d3f', '#e8a090']),
    lipsGloss: 0.4 + Math.random() * 0.5,
  }
}

function npcGrades(skill: number): PoseGrade[] {
  return [0, 1, 2].map(() => {
    const r = Math.random()
    if (r < skill * 0.65) return 'perfect'
    if (r < skill * 0.65 + 0.3) return 'good'
    return 'miss'
  })
}

export function scoreLook(look: Look, theme: Theme, poses: number, seed: string): { breakdown: ScoreBreakdown; judges: JudgeResult[]; total: number; score100: number; scheme: string } {
  const raw = rawScores(look, theme)
  const judges: JudgeResult[] = JUDGES.map((j) => {
    const { scores, total } = judgeScores(j, { theme: raw.theme, colors: raw.colors, creativity: raw.creativity, poses }, seed)
    return { judgeId: j.id, scores, total, comment: judgeComment(j, scores, seed) }
  })
  const avg = (k: Criterion) => Math.round((judges.reduce((s, j) => s + j.scores[k], 0) / judges.length) * 10) / 10
  const total = Math.round((judges.reduce((s, j) => s + j.total, 0) / judges.length) * 10) / 10
  return {
    breakdown: { theme: avg('theme'), colors: avg('colors'), creativity: avg('creativity'), poses: avg('poses') },
    judges,
    total,
    score100: Math.round(total * 10),
    scheme: raw.harmonyScheme,
  }
}

/** 4 concorrentes com looks gerados e notas. Cada uma testa N looks (N cresce com a habilidade) e fica com o melhor. */
export function makeCompetitors(theme: Theme): Competitor[] {
  const names = [...NPC_NAMES].sort(() => Math.random() - 0.5).slice(0, 4)
  return names.map((n, i) => {
    const skill = Math.min(0.95, Math.max(0.2, 0.3 + i * 0.15 + (Math.random() - 0.5) * 0.3))
    const tries = 1 + Math.round(skill * 4)
    let best: { look: Look; raw: number } | null = null
    for (let t = 0; t < tries; t++) {
      const look = randomLook(theme)
      const r = rawScores(look, theme)
      const v = r.theme * 0.5 + r.colors * 0.25 + r.creativity * 0.25
      if (!best || v > best.raw) best = { look, raw: v }
    }
    const look = best!.look
    const poses = poseScore(npcGrades(skill))
    const s = scoreLook(look, theme, poses, n.name)
    return { id: `npc-${i}`, name: n.name, emoji: n.emoji, look, skill, total: s.total, score100: s.score100, isPlayer: false, breakdown: s.breakdown }
  })
}

// ----------------------------------------------------------------- recompensas

export interface RewardOutcome {
  coins: number
  xp: number
  fame: number
  modelXp: number
}

/** Posição 1..5 -> recompensas (+ bônus pela nota). */
export function rewardsFor(rank: number, score100: number): RewardOutcome {
  const tier = [0, 120, 90, 65, 45, 30][Math.max(1, Math.min(5, rank))]
  const bonus = Math.round(score100 / 5)
  return {
    coins: tier + bonus,
    xp: Math.round(tier * 0.6) + 10,
    fame: [0, 8, 5, 3, 2, 1][Math.max(1, Math.min(5, rank))],
    modelXp: Math.round(tier / 5) + 6,
  }
}
