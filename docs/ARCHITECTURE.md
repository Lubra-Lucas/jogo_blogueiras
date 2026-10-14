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
- **Click-to-move**: raycast so contra meshes com `userData.walkable = true` e normal `y > 0.7`. Conta como clique se o ponteiro andou < 6 px e ficou < 300 ms (senao e arrasto de camera; `ClickToMove` tambem invalida o clique se o ponteiro passou do limite em qualquer momento). Duplo clique/toque = correr. Anda em linha reta (futuro: navmesh). Cancela com WASD ou se ficar preso ~0,8 s.
- **`PlayerController`** (`src/game/player/`): capsula cinematica com `KinematicCharacterController` (autostep 0,35 m, snap 0,3 m, rampa max 45 graus), gravidade sem pulo, aceleracao exponencial e giro suave. Numeros em `player/config.ts`.
- **Estado do jogador** (`src/state/playerStore.ts`, zustand): `position`, `velocity`, `speed`, `yaw`, `grounded` sao mutados no lugar; leia com `getState()` em `useFrame`.
- `src/game/world/TestArea.tsx` e uma area de teste removivel (caixas, colunas, rampas, escada).

## Camera em terceira pessoa (passo 3)

- **Intencao de camera** (`input/intent.ts`): `cameraIntent { yawDelta, pitchDelta, zoomDelta, keyYaw }`. As fontes acumulam; a camera consome e zera a cada frame. `yawDelta > 0` gira a camera no sentido anti-horario (visao vira para a esquerda); `zoomDelta` e logaritmico. Sensibilidades em `camera/config.ts` (`CAMERA_INPUT`, mouse e toque separados).
- **`CameraInput`** (`input/`): arrastar com botao esquerdo ou direito gira; o esquerdo so comeca a girar apos 6 px (mesmo limite do click-to-move), o direito gira de imediato; menu de contexto bloqueado no canvas; pointer capture (sem pointer lock); roda = zoom (`preventDefault`). Toque: um dedo gira (apos 6 px, tap continua sendo click-to-move), dois dedos = pinca/zoom. **Q / E** giram a camera (em `KeyboardInput`).
- **Reservar ponteiros** (`claimPointer / releasePointer / isPointerClaimed` em `intent.ts`): o joystick do passo 4 deve chamar `claimPointer(e.pointerId)` no `pointerdown`; `CameraInput` e `ClickToMove` ignoram esses ponteiros.
- **`ThirdPersonCamera`** (`src/game/camera/`): orbita um pivo a 1,5 m acima dos pes, yaw livre, pitch -10..70 graus (padrao 18), distancia 6,5 m (zoom 2,5..14 m, suavizado). Pivo segue o jogador com amortecimento (XZ rapido, Y mais lento para escadas). Roda **depois** do `PlayerController` na mesma prioridade 0 (ordem de montagem dentro de `<Physics>`), o que mantem o render automatico do r3f.
- **Colisao**: `world.castShape` com esfera (raio 0,3 m) do pivo ate a camera, so contra geometria fixa (exclui sensores, dinamicos, cinematicos e o corpo do jogador, exposto em `playerStore.body`). Se bater, a camera fica antes do ponto (folga 5 cm): aproxima na hora, afasta devagar. `y` da camera nunca abaixo de 0,3 m. A capsula some (opacidade) quando a camera chega a < 1,2 m.
- **`cameraStore`** (`src/state/`): `yaw`, `pitch`, `distance` mutados no lugar; o movimento do jogador usa `yaw` (frente = `(-sin yaw, -cos yaw)`). `CAMERA.autoRecenter` (desligado) recentra atras do jogador.

## Controles mobile (passo 4)

- **Deteccao** (`src/game/systems/device.ts`, store zustand `useDeviceStore.isTouch`): inicia com `(pointer: coarse)` OU `ontouchstart` OU `maxTouchPoints > 0`; depois muda dinamicamente: `pointerdown/move` de toque liga a UI de toque, de mouse desliga (notebooks hibridos). `initDeviceDetection()` (chamado em `App`) tambem bloqueia `gesturestart/change/end` e `dblclick` (iOS Safari).
- **Joystick** (`src/ui/Joystick.tsx`, DOM sobre o canvas): zona de 40% x 65% no canto inferior esquerdo (com safe-area). A base aparece sob o dedo (raio 58 px, botao 26 px); fantasma translucido no canto quando ocioso. Chama `claimPointer` no `pointerdown` (com `setPointerCapture`) e `releasePointer` em up/cancel/lostpointercapture; so segue um ponteiro. Saida via `setStickAxis(x, y, run)` analogica: zona morta de 12% reescalada para comecar em 0; passa de 85% do raio = correr (histerese 78%; base e botao ficam dourados e a magnitude vai a 1). `PlayerController` ja multiplica a velocidade pela magnitude do eixo (teclado = 1, entao o desktop nao muda).
- A `.ui-layer` e `pointer-events: none`; so a zona do joystick e o botao de tela cheia (`FullscreenButton`, so em toque e se `document.fullscreenEnabled`) recebem toques. Toques fora da zona chegam ao canvas: um dedo gira a camera (mesmo com outro dedo no joystick, pois `CameraInput` ignora o ponteiro reservado), dois dedos fazem pinca, toque curto = click-to-move.
- Higiene mobile em `index.css`: `touch-action: none`, sem selecao/callout/tap highlight, `overscroll-behavior: none`, `100dvh`, `env(safe-area-inset-*)`. HUD mostra a dica de toque (no topo, abaixo do titulo) quando `isTouch`.
