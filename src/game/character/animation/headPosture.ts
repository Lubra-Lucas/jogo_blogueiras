import type { ClipName } from './animator'

/**
 * Correcao de postura da cabeca (aditiva, por clipe). As animacoes Mixamo deixam o olhar medio ABAIXO do horizonte (medido no
 * mundo, eixo frontal do osso Head, media de um ciclo): idle -20, run -13, run_turn -29, desfile -5, walk +2. Aqui cada clipe
 * ganha um deslocamento fixo (graus, >0 = levanta o olhar) que leva a media para ~-3 graus; o balanco natural do clipe
 * (respiracao, passo) fica intacto porque so o offset medio e corrigido. Tempo de execucao, sem mexer nos GLBs.
 *
 * Clipes que olham para baixo DE PROPOSITO (bow, cry, texting/celular, laugh, thankful...) ou que tem cabeca propria (dancas,
 * kiss, selfie) ficam em 0. Sentada: o clipe de sentar/levantar termina com a cabeca em -14 e o corpo pende para frente no meio do
 * movimento (isso e natural); a correcao leva o olhar sentado a ~-4 (olhar a frente).
 *
 * Medidas (graus; media / minimo / maximo do ciclo): ver README do personagem.
 */
export const HEAD_LIFT_DEG: Partial<Record<ClipName, number>> = {
  idle: 17, // media -20,1 -> -3
  walk_normal: 0, // +1,6 (ja no horizonte)
  walk: 0,
  desfile: 0, // -5,1 (limite aceitavel)
  run: 10, // -13,3 -> -3
  run_turn: 12, // -28,6 -> ~-16: curva em corrida, olha um pouco para baixo
  stand_to_sit: 10, // termina em -14 -> -4
  sit_to_stand: 10,
  sit: 10,
}

/** tempo de transicao entre estados (s) ~0,25 s: constante de tempo = FADE / 3 */
const TAU = 0.25 / 3

/** `?headlift=0` desliga a correcao (comparacao antes/depois nas capturas) */
const OFF = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('headlift') === '0'

export function headLiftTarget(clip: ClipName | null, opts: { selfie?: boolean; weight?: number }): number {
  if (!clip || opts.selfie || OFF) return 0
  return ((HEAD_LIFT_DEG[clip] ?? 0) * (opts.weight ?? 1) * Math.PI) / 180
}

/** passo de suavizacao exponencial (independente da taxa de quadros) */
export const headLiftStep = (dt: number) => 1 - Math.exp(-dt / TAU)
