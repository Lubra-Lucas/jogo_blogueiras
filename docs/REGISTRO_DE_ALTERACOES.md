# Registro de alterações

## Calças femininas e iluminação noturna da personagem

Base de trabalho: `3e918fc`. Esta entrada acompanha o commit da correção e da nova iluminação.

- **Causa das calças alternando com pele**: o scanner reconhecia saias pela presença de vértices centrais entre as pernas. As cinco calças do catálogo também satisfazem esse critério; o material principal recebia deslocamento de saia após a animação dos ossos, enquanto os detalhes não recebiam o mesmo movimento.
- **Correção**: `secondary/skirtGarments.ts` registra explicitamente as 35 saias/vestidos atuais. `Character.tsx` marca os materiais dessas peças antes do scanner. `CharacterSecondary.tsx` aplica o balanço apenas aos materiais marcados, sem inferir pelo formato dos vértices. Calças, leggings e macacões acompanham somente o esqueleto; os materiais de cada saia/vestido recebem o mesmo efeito. Ao cadastrar novas peças com saia, atualize esse registro.
- **Luz noturna**: `player/PlayerNightLight.tsx`, montada em `Game.tsx` depois do jogador e da câmera. Uma única luz suave, sem sombras extras, de alcance de 4 m, acompanha a personagem pelo lado da câmera. Intensidade proporcional a `env.night`, apagada de dia; altura acompanha as proporções da personagem.
- **Validação**: build e os testes `appearance` (24 verificações/3.000 aparências), `save`, `ranking`, `versus` e `environment` passaram. `test:garment-motion` passou em nove roupas: cinco calças, legging, macacão, saia lápis e vestido de gala. `test:player-light` confirmou luz noturna, desligamento de dia, intensidade intermediária ao anoitecer, acompanhamento após teleporte e aumento real de luminância no render do corpo com a luz ligada. As falhas foram reproduzidas antes das correções; revisão de código concluída.
- **Limites**: validação em Chromium com toque e renderização por software; sem medição de FPS nem validação em Safari/aparelho real nesta rodada. Nenhuma mudança de dependências, assets GLB ou formato dos saves. Permanece o aviso conhecido de bundles grandes no build.

Para acompanhar entre devs, atualize a partir de `origin/main` antes de editar os arquivos de personagem/iluminação e preserve estes testes de regressão. Os comandos estão no README.

## Desempenho no celular e interface do pet

Base de trabalho: `5b61197` (merge do PR #10). Esta entrada acompanha o commit que reúne as mudanças abaixo; consulte `git log --oneline` para identificar a revisão instalada.

### Mudanças

- **Clima e iluminação** (`src/game/world/environment/registry.ts`): materiais descartados saem dos registros de chuva e brilho. Registros duplicados são ignorados; um material pode ser registrado novamente após descarte. Evita reter e atualizar materiais que já saíram de uso.
- **Mapas** (`src/ui/Minimap.tsx`): minimapa pausa atrás de menus, lojas, mercado, minijogos e mapa grande; os dois mapas param quando a aba fica oculta. Retomam ao voltar. O mapa grande continua desenhando quando está visível acima de um menu. Dentro de salas, o minimapa oculto não mantém seu loop ativo.
- **Pets** (`src/ui/pets/PetHud.tsx`, `pets.css`): retirado o aviso flutuante constante “Fazer carinho”. A ação fica no painel aberto pelo botão com o nome do pet. A alegria atualiza ao clicar; o atalho E perto do pet e o clique direto no cachorro continuam disponíveis. Removidos os estilos e as assinaturas de estado exclusivos do aviso.
- **Compatibilidade**: nenhuma dependência nova, alteração de lockfile, migração de banco ou mudança no formato dos saves.

### Validação executada

- `npm run build`: passou, incluindo TypeScript. Permanece o aviso existente de bundles maiores que 500 kB.
- `npm run test:appearance`: 24 verificações passaram, com 3.000 aparências sorteadas.
- `npm run test:save`, `npm run test:ranking`, `npm run test:versus`: passaram.
- `npm run test:environment`: quatro testes passaram, incluindo descarte de materiais e novo registro após descarte.
- `npm run test:minimap`: 11 cenários passaram no Chromium com toque, incluindo entrada/saída de minijogo, menu, mapa grande e simulação da notificação de aba oculta.
- `npm run test:pet-hud`: passou; cachorro próximo sem aviso, carinho pelo painel com aumento de alegria/evento de animação e fechamento sem retorno do aviso.
- Revisão de código concluída. Os testes de regressão reproduziram as falhas antes das correções.

Os testes de navegador usam Vite dev e o cliente CDP já existente, conforme o README. Validação em Node 24.19.0 e Chromium com renderização por software; não é medição de FPS em aparelho real. Safari/iPhone real e multiplayer não foram validados nesta rodada.

### Acompanhamento entre devs

- Atualize seu checkout a partir de `origin/main` antes de editar esses arquivos. Na `main` sem mudanças locais: `git pull --ff-only origin main`. Em uma branch com trabalho em andamento, integre `origin/main` pelo fluxo da equipe, preservando o trabalho local.
- Mantenha os testes acima ao alterar registros de materiais, visibilidade dos mapas ou interface do pet.
- O workflow `.github/workflows/deploy.yml` publica no GitHub Pages após push na `main`; o resultado do deploy deve ser conferido no GitHub Actions separadamente do resultado dos testes locais.
