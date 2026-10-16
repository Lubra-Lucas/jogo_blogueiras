import type { GameId } from '../../../game/casino/chips'
import { BJ_RULES } from '../../../game/minigames/casino/blackjack'
import { THEORETICAL_RTP } from '../../../game/minigames/casino/slots'

export interface HelpDoc {
  title: string
  steps: { t: string; b: string }[]
  rules: string[]
  odds: string[]
}

const pct = (v: number) => (v * 100).toFixed(1).replace('.', ',') + '%'

export const HELP: Record<GameId, HelpDoc> = {
  blackjack: {
    title: 'Blackjack (21)',
    steps: [
      { t: 'Aposte', b: 'Toque nas fichas para montar a aposta e depois em "Dar cartas".' },
      { t: 'Chegue perto de 21', b: 'Peça cartas ou pare. Passou de 21, você estoura e perde. Figuras valem 10 e o Ás vale 1 ou 11.' },
      { t: 'Vença a banca', b: 'Fique com mais pontos que a banca sem estourar. Dobre ou divida pares quando a situação ajudar.' },
    ],
    rules: [
      '6 baralhos; a carta de corte aparece perto de 75% do sapato e ele é embaralhado de novo.',
      `A banca PARA em qualquer 17, inclusive o "17 mole" (Ás + 6).`,
      'Blackjack natural paga 3 para 2. Vitória paga 1 para 1. Empate devolve a aposta.',
      `Dobrar: em qualquer mão de 2 cartas (também depois de dividir, exceto Ases). Você recebe só 1 carta.`,
      `Dividir: pares de mesmo valor, até ${BJ_RULES.maxHands} mãos. Ases divididos recebem 1 carta cada e 21 depois de dividir não é blackjack.`,
      'Sem seguro e sem desistência. A banca confere a carta virada (Ás ou 10) antes de você jogar.',
      'No modo Fácil, o botão de dica mostra a jogada da estratégia básica.',
    ],
    odds: [
      `Vantagem da casa: ${BJ_RULES.houseEdgeBasic}. Sem estratégia, fica perto de 2%.`,
      'A habilidade conta: decidir bem reduz o custo da casa. Mas as cartas continuam sendo sorteadas ao acaso.',
      'Os limites de aposta sobem com a dificuldade; as regras e as chances são as mesmas.',
    ],
  },
  poker: {
    title: "Texas Hold'em",
    steps: [
      { t: 'Suas duas cartas', b: 'Você recebe 2 cartas só suas. No centro da mesa surgem até 5 cartas comuns: flop (3), turn (1) e river (1).' },
      { t: 'Aposte com cuidado', b: 'Em cada rodada você pode desistir, passar/pagar ou aumentar. Quem não desistiu até o fim mostra as cartas.' },
      { t: 'Melhor mão de 5 cartas', b: 'Vence quem formar a melhor combinação com suas 2 cartas e as 5 da mesa. Observe o rosto de cada jogadora: às vezes ele conta algo.' },
    ],
    rules: [
      'Sem limite de aposta (no-limit). Blinds fixos na mesa livre (10/20) e crescentes no Sit & Go.',
      'Ordem das mãos: carta alta, par, dois pares, trinca, sequência, flush, full house, quadra, straight flush, royal flush.',
      'Quando alguém fica all-in com menos fichas, os excedentes formam potes laterais; cada pote vai para a melhor mão entre quem pagou por ele.',
      'Sit & Go: 5 jogadoras, 1.500 fichas de torneio cada, inscrição de 200 fichas. Prêmios para os 3 primeiros lugares (550 / 300 / 150).',
      'As NPCs têm estilos diferentes: seletivas ou soltas, passivas ou agressivas, com mais ou menos blefes.',
      'No modo Fácil você vê a dica de força da sua mão. No Estrela, sem dicas e NPCs mais afiadas.',
    ],
    odds: [
      'Pôquer é contra as outras jogadoras, não contra a casa: não existe vantagem da casa nesta mesa.',
      'Um par de Ases ganha de uma mão aleatória cerca de 85% das vezes; mesmo assim, pode perder.',
      'Fichas do pôquer são só da mesa: no fim, o que sobrar volta para o seu saldo de fichas.',
    ],
  },
  roleta: {
    title: 'Roleta europeia',
    steps: [
      { t: 'Escolha a ficha', b: 'Toque numa ficha e depois no tabuleiro, ou arraste a ficha até o número desejado.' },
      { t: 'Aposte em vários lugares', b: 'Números, cavalos (entre dois), linhas, quadras, dúzias, colunas, vermelho/preto, par/ímpar e baixo/alto.' },
      { t: 'Gire', b: 'A bola cai numa das 37 casas (0 a 36). O resultado é sorteado de forma justa; a animação só mostra o que saiu.' },
    ],
    rules: [
      'Roleta europeia: um único zero (0 a 36), 37 casas.',
      'Pagamentos: número cheio 35:1, cavalo 17:1, linha 11:1, quadra 8:1, sextina 5:1, dúzia e coluna 2:1, vermelho/preto, par/ímpar e 1-18/19-36 pagam 1:1.',
      'O zero faz as apostas "de fora" perderem (não há "prisão" nesta mesa).',
      'Aposta mínima de 10 por ficha; total máximo de 2.000 por giro.',
    ],
    odds: [
      'Vantagem da casa: 1/37 = 2,70% em TODAS as apostas. Nenhuma aposta é "melhor" que outra a longo prazo.',
      'Cada giro é independente: números "atrasados" ou "quentes" não existem. O histórico é só curiosidade.',
      'Retorno esperado: 97,30% de tudo o que é apostado.',
    ],
  },
  slots: {
    title: 'Caça-níqueis Glam',
    steps: [
      { t: 'Escolha a aposta', b: 'A aposta total é dividida em 10 linhas de pagamento. Toque em Girar (ou use a barra de espaço).' },
      { t: 'Combine símbolos', b: '3, 4 ou 5 símbolos iguais seguidos, da esquerda para a direita, numa linha. A Estrela é curinga e substitui qualquer símbolo.' },
      { t: 'Veja o prêmio', b: 'As linhas premiadas acendem e o valor sobe na tela. Confira a tabela de pagamentos ao lado.' },
    ],
    rules: [
      '5 rolos, 3 fileiras, 10 linhas de pagamento fixas. Apostas de 10 a 200 por giro.',
      'Os rolos param em posições sorteadas de forma uniforme. O que aparece é exatamente o que saiu: não há "quase lá" fabricado nem rolos que se arrastam para criar suspense.',
      'Vale só o maior prêmio de cada linha. Os prêmios de linhas diferentes se somam.',
      'Sem rodadas automáticas nesta mesa: cada giro é uma escolha sua.',
    ],
    odds: [
      `Retorno teórico (RTP): ${pct(THEORETICAL_RTP)} (calculado por enumeração exata de todas as combinações). A casa fica com ${pct(1 - THEORETICAL_RTP)}.`,
      'Isso vale a longo prazo: numa sessão curta o resultado pode ser bem diferente, para mais ou para menos.',
      'Nenhum botão, horário ou ritmo de jogo muda as chances.',
    ],
  },
}

export const FICHAS_NOTE =
  'Fichas são só diversão: não valem dinheiro, não se compram, não se trocam por Brilhos ou Diamantes e não passam de uma jogadora para outra. Os prêmios do lounge são títulos, ranking e itens de aparência exclusivos.'
