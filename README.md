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

## Arquitetura

Veja [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Roadmap do marco 1

1. Base do projeto (feito)
2. Fisica e capsula com WASD e click-to-move (feito)
3. Camera em terceira pessoa (feito)
4. Controles mobile (feito)
5. Personagem boneca com animacoes
6. Praca central
7. Ruas e fachadas
8. Polimento e qualidade
9. Base da personalizacao
