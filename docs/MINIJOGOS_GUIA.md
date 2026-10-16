# Guia para criar minijogos

Todo minijogo novo segue este guia. Público: **crianças e adultos** ao mesmo tempo, então o jogo é
fácil de entender em 10 segundos, mas tem **habilidade de verdade** e espaço para melhorar.

## Estrutura de arquivos
- Lógica pura (sem React/three): `src/game/minigames/<id>/` (logic.ts com funções testáveis,
  RNG com semente, pontuação; store.ts com zustand).
- Interface: `src/ui/minigames/<id>/` com `def.tsx` exportando `def: MinigameDef`
  (ver `src/ui/minigames/registry.ts`). O registro acha o minijogo sozinho: **não edite
  MinigameHost, interactionStore nem minigameStore**.
- Abrir direto em dev: `?minigame=<id>`.
- Vários minijogos podem usar a mesma porta (`poi`): o aviso da porta mostra um botão para cada
  um (teclas E / R / T no PC).

## APIs comuns (só leitura/uso)
- Recompensas: `grantRewards({ coins, xp, professionXp: { Cabeleireira: n } })` em
  `src/game/minigames/rewards.ts` (repassa ao perfil). Nível de profissão: `getProfessionXp(nome)`.
- Competição: `src/game/minigames/shared/competition.ts`:
  - `Difficulty` ('facil' | 'normal' | 'dificil' | 'estrela'), `DIFFICULTY_LABEL`, `DIFFICULTY_REWARD`;
  - `dailySeed(id)` para o **Desafio do dia** (mesma partida para todas);
  - `rng(seed)`;
  - `submitScore(id, dificuldade, pontos, pontosTipicos, nome)` devolve o ranking do dia com
    rivais NPC e a posição da jogadora.
- Sons: `playSfx('tap' | 'serve' | 'tip' | 'bad' | 'trash' | 'done' | 'combo' | 'click')` e
  `isMuted`/`setMuted` em `src/game/minigames/audio.ts`.
- Perfil (nome da jogadora, nível): `src/state/profileStore.ts`.
- Itens reais: `src/game/character/catalog.ts` (roupas e joias dos manifests), `itemTags.ts`
  (estilo, cores, formalidade, raridade).
- Animações da personagem no mundo depois de sair: `def.afterExit` +
  `playEmote(id, { once: true })` (`src/game/character/animation/emoteStore.ts`).

## Regras de design (obrigatórias)
1. **Fácil de aprender, difícil de dominar.** Tutorial interativo de até 3 passos na primeira vez
   (lembrar em localStorage) e botão "Como jogar".
2. **Habilidade real.** Pelo menos dois de: precisão (mirar/arrastar), ritmo e tempo, memória
   e observação, planejamento e decisão sob pressão. Nada de "clicar e ganhar".
3. **Dificuldade escolhível**: Fácil (mais tempo, dicas visuais, sem penalidade forte),
   Normal, Difícil, Estrela (sem dicas, mais rápido, combos exigentes). A dificuldade sobe
   também durante a partida.
4. **Pontuação clara e justa**: nota por critério (ex.: precisão 92%, tempo, combo), estrelas
   1-3, recorde pessoal, e "Perfeito!"/"Ótimo!"/"Bom" com retorno imediato.
5. **Competição**: ranking do dia (submitScore) na tela de resultado, rivais NPC com nomes,
   Desafio do dia (semente diária) e, quando fizer sentido, **jurados** com comentários
   curtos e divertidos. Preparar para o online: a pontuação e a semente podem ser enviadas
   depois a um servidor.
6. **Progressão**: XP da profissão libera conteúdo novo (ingredientes, estilos, músicas,
   ferramentas). Mostrar "Novo item desbloqueado!".
7. **Partidas curtas**: 60 a 120 segundos, com pausa e sair a qualquer momento.
8. **Celular primeiro**: botões grandes, gestos de arrastar, retrato e paisagem; teclado e
   mouse no PC.

## Visual (direção de arte do jogo)
- Interface com as variáveis de `src/ui/tokens.css` (vidro perolado, poucas cores de destaque,
  cantos e sombras consistentes, serifa nos títulos e sans no texto).
- **Sem emoji** e sem cara de "gerado por IA": ícones desenhados em SVG, no mesmo traço.
- Estilo boneca de porcelana/vinil brilhante, mas com **paleta de cores do mundo real** (pedra, creme, madeira, metais, azul-marinho, verdes, preto, branco): nada infantilizado. Rosa e tons pastel só como destaque raro.
- Microanimações satisfatórias (toque, acerto, combo, moedas), sem exagero.
- Todo texto em **português do Brasil**, com acentos corretos.
- Conteúdo adequado a um público amplo, com crianças.

## Verificação
- `npm run build` precisa passar.
- Capturas com o painel do navegador ou o Edge sem janela (scripts CDP em
  `C:/Users/user/AppData/Local/Temp/claude/shots/anim/cdp.mjs` e `cdp2.mjs`).
