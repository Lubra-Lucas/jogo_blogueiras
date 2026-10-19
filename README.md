# Jogo das Blogueiras

Jogo 3D no navegador, estilo Roblox + Dress to Impress, com estetica rococo / alta costura / drag, tons pastel e dourado, em clima de fantasia.

Stack: Vite + React + TypeScript + three.js (react-three-fiber + drei).

## Como rodar

```bash
npm install
npm run dev
```

Abra o endereco `Local` mostrado no terminal (normalmente http://localhost:5173/jogo_blogueiras/).

### Abrir no celular

1. Conecte o celular na mesma rede wifi do computador.
2. Rode `npm run dev` e abra no celular o endereco `Network` mostrado no terminal.

Dica: use `?quality=low|medium|high` na URL para forcar um nivel de qualidade grafica, e `?debug=1` para ver os colisores da fisica.

### Testar no celular (GitHub Pages)

Abra https://lubra-lucas.github.io/jogo_blogueiras/ no navegador do celular (depois de um push na `main` e do deploy terminar). Use o joystick (canto inferior esquerdo) para andar, arraste fora dele para girar a camera, pinca para zoom e toque no chao para ir ate la. Em iPhone, "Adicionar a Tela de Inicio" deixa o jogo em tela cheia.

## Build e deploy

- `npm run build` gera a pasta `dist`.
- Cada push na branch `main` publica automaticamente no GitHub Pages (workflow em `.github/workflows/deploy.yml`). Nas configuracoes do repositorio, em Pages, selecione "GitHub Actions" como fonte.
- Endereco publicado: https://lubra-lucas.github.io/jogo_blogueiras/

## Testes

Rode `npm run build`, `npm run test:appearance`, `npm run test:save`, `npm run test:ranking`, `npm run test:versus` e `npm run test:environment` (Node.js 24+). O ultimo verifica a limpeza dos materiais de clima/iluminacao ao sair das cenas.

Com `npm run dev` em outro terminal, `npm run test:minimap` verifica pausa e retomada dos mapas no navegador, incluindo entrada e saida de minijogo no modo touch. Usa o cliente CDP existente, sem dependencias extras: Edge no caminho padrao do Windows, ou `EDGE=/caminho/do/chromium npm run test:minimap`. Aceita `-- --url='http://localhost:5173/jogo_blogueiras/?offline=1&quality=low'` para outro servidor. O teste simula a notificacao de aba oculta; validar recarregamentos no Safari exige um celular real.

`npm run test:pet-hud` usa o mesmo navegador e servidor para verificar que o cachorro proximo nao exibe aviso flutuante, que o carinho funciona pelo painel e que fechar o painel nao faz o aviso voltar.

`npm run test:garment-motion` verifica nove roupas femininas: calcas/legging/macacao sem balanco de saia e saia/vestido com o efeito preservado. `npm run test:player-light` verifica luz suave noturna, render mais claro da personagem, desligamento de dia, transicao ao anoitecer e acompanhamento da personagem. Usam o mesmo servidor e navegador CDP.

## Controles e UI
- **Andar**: WASD/setas (Shift corre), clique no chao, joystick no celular. **Q/E** gira a camera.
- **C / Tab**: menu da personagem (Perfil, Aparencia com sliders de rosto e corpo, Guarda-roupa com roupas e joias, Ajustes). **P**: celular (Missoes, Blogram, Mensagens, Mapa, Camera). **G**: roda de emotes (numeros 1-9 tambem). **Enter**: chat. **M**: mapa grande.
- O progresso (perfil, aparencia salva, fotos) fica no `localStorage` do navegador; em Ajustes ha "Resetar save".
- `?editor=1` abre direto a aba Aparencia; `?stats=1` mostra o FPS.

## Multiplayer (teste da equipe)

Login com e-mail e senha, ate 3 personagens por conta e a cidade compartilhada, tudo no Supabase (sem servidor proprio; funciona no GitHub Pages).

- **Configurar uma vez** no painel do Supabase: rode `supabase/schema.sql` e depois `supabase/scores.sql` (ranking geral dos minijogos) no SQL Editor e desligue Authentication > Sign In / Providers > Email > "Confirm email".
- `?offline=1` joga sem login e sem rede (save so do navegador), como antes.
- Detalhes em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#multiplayer-supabase).

## Influencer Tycoon (jogo paralelo)

Clicker/idle em pixel art, independente do jogo 3D, na pasta [`influencer-tycoon/`](influencer-tycoon/README.md). Publicado em https://lubra-lucas.github.io/jogo_blogueiras/influencer-tycoon/.

## Arquitetura

Veja [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Mudancas recentes, validacao e notas para trabalho simultaneo: [docs/REGISTRO_DE_ALTERACOES.md](docs/REGISTRO_DE_ALTERACOES.md).

## Roadmap do marco 1

1. Base do projeto (feito)
2. Fisica e capsula com WASD e click-to-move (feito)
3. Camera em terceira pessoa (feito)
4. Controles mobile (feito)
5. Personagem: 5a boneca riggada do Meshy com morphs, cores por mascara (pele, macacao, cabelo, batom) e painel de sliders `?editor=1` (feito); 5b animacoes do Mixamo (andar, desfilar, aplaudir, dancar; emotes nas teclas 1/2/3) (feito)
6. Praca central e cidade em blockout jogavel: 5 bairros, avenidas, parque com lago, minimapa e rotulos de area (feito; falta arte final, interiores e o Bairro Futuro)
7. Fachadas e interiores das lojas (proximo)
8. Polimento e qualidade
9. Base da personalizacao
