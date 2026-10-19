# Influencer Tycoon

Clicker/idle em pixel art com humor trash de blogueira. Projeto independente do jogo 3D: HTML + CSS + JavaScript puro, sem build e sem dependencias.

## Rodar

```bash
cd influencer-tycoon
python3 -m http.server 8080   # ou: npx serve
```

Abra http://localhost:8080 (no celular: o IP do computador na mesma wifi). Precisa de servidor porque usa modulos JS; abrir o arquivo direto nao funciona.

## Testar

```bash
node --test influencer-tycoon/
```

## Arquivos

- `game.js`: regras (itens, custos, toque, viral, tempo offline, save). Sem DOM.
- `main.js`: tela, pixel art da personagem, loja, loop e save no `localStorage`.
- `index.html`: layout (celular primeiro; vira duas colunas a partir de 820px).

Publicado junto com o jogo 3D: o deploy copia esta pasta para `dist/influencer-tycoon`.
