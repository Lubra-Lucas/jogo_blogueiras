# character: componente unico Character (boneca do Meshy riggada: GLB + morphs + cores por mascara), dirigido por um cerebro (jogador local, NPC ou rede). Ver docs/ARCHITECTURE.md.

## Proporcoes por osso (`proportions.ts`)
- `Appearance.body` (altura, pernas, tronco, bracos, pescoco, cabeca, maos, pes, ombros, postura, lordose, ombros caidos) vira
  comprimentos de osso (posicao do filho) e escala uniforme so em Head/Hand/Foot. Nunca escala em osso de membro: propaga para
  os filhos e deforma roupa. Roupas/cabelo/joias usam o mesmo esqueleto, entao acompanham sozinhos.
- Por quadro: `BodyRig.begin()` (desfaz o do quadro anterior) -> mixer -> `BodyRig.apply()` (eleva o quadril para a sola ficar no chao,
  escala o passo e soma a postura como rotacao em torno dos eixos do esqueleto). Feito em `CharacterAnimation`; sem animacao
  propria (`anim` ausente, poses de minijogo) so entram comprimentos/escalas, sem postura.
- Passo: `animator.stride` (quadril / original) multiplica `CLIP_SPEED` (pes nao deslizam). Assento: `PlayerController.fitClip` ajusta
  `endY/offZ` do clipe; capsula e camera leem `playerStore.fit`.
- Teste de nao deformar: `?bodytest=1&outfit=dress|pants|coat|none&anim=idle|walk|sit&t=<s>&yaw=<graus>&set=0|1&acc=1`.
