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

## Fisica e movimento (passo 2)

- **Rapier** (`@react-three/rapier`): `<Physics>` fica em `Game.tsx` (`timeStep="vary"`). Use `?debug=1` na URL para desenhar os colisores. Chao e praca usam colisores fixos simples (caixa fina / cilindro fino, nunca trimesh); o pedestal central e um cilindro fixo.
- **Intencao** (`src/game/input/intent.ts`): objeto mutavel lido em `useFrame` (sem re-render) com `move {x,y}` (-1..1, relativo a camera), `run` e `target` (destino do click-to-move). `KeyboardInput` (WASD/setas, Shift) e `ClickToMove` escrevem nele; o joystick do passo 4 deve usar `setStickAxis`.
- **Click-to-move**: raycast so contra meshes com `userData.walkable = true` e normal `y > 0.7`. Conta como clique se o ponteiro andou < 6 px e ficou < 300 ms (senao e arrasto do OrbitControls). Duplo clique/toque = correr. Anda em linha reta (futuro: navmesh). Cancela com WASD ou se ficar preso ~0,8 s.
- **`PlayerController`** (`src/game/player/`): capsula cinematica com `KinematicCharacterController` (autostep 0,35 m, snap 0,3 m, rampa max 45 graus), gravidade sem pulo, aceleracao exponencial e giro suave. Numeros em `player/config.ts`.
- **Estado do jogador** (`src/state/playerStore.ts`, zustand): `position`, `velocity`, `speed`, `yaw`, `grounded` sao mutados no lugar; leia com `getState()` em `useFrame`.
- **Camera**: temporariamente `OrbitControls` com alvo que segue o jogador (ate o passo 3).
- `src/game/world/TestArea.tsx` e uma area de teste removivel (caixas, colunas, rampas, escada).
