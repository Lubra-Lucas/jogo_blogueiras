# Arquitetura

## Pastas

- `src/main.tsx`, `src/App.tsx`: entrada do app. `App` monta o `Canvas` em tela cheia e a camada de UI por cima.
- `src/game/Game.tsx`: raiz da cena 3D (luzes, ambiente, mundo).
- `src/game/world/`: cenario (chao, ceu, praca, ruas, fachadas).
- `src/game/player/`: jogador local (fisica, capsula, camera).
- `src/game/character/`: o componente unico `Character` (boneca) e suas animacoes.
- `src/game/input/`: teclado, toque e gamepad, convertidos em intencao.
- `src/game/systems/`: sistemas transversais (ex.: `quality.ts`, nivel de qualidade low/medium/high).
- `src/ui/`: interface 2D sobre o canvas (HUD, menus).
- `src/state/`: estado global do cliente.
- `src/shared/`: tipos compartilhados com o futuro servidor.

## Principios

1. **Input abstraido em "intencao" (`Intent`)**: teclado, joystick de toque e gamepad nunca movem o personagem diretamente. Todos produzem uma intencao (direcao de movimento, pulo, olhar, acao). Quem consome a intencao nao sabe de onde ela veio.
2. **Aparencia e dado (JSON)**: roupas, cabelo, cores e acessorios sao descritos por um objeto JSON serializavel. Salvar, enviar pela rede e trocar de look e so trocar o JSON.
3. **Um unico componente `Character`, dirigido por um "cerebro"**: o mesmo `Character` e usado pelo jogador local, por NPCs e por jogadores remotos. O que muda e o cerebro que gera as intencoes (leitura do input local, IA, ou mensagens da rede).
