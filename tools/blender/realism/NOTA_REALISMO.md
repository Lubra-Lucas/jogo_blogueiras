# Estudo visual: estetica "doll estilizada" vs "ultrarrealista"

Estudo so visual (nada foi integrado no jogo). Scripts nesta pasta; renders em
`C:/Users/user/AppData/Local/Temp/claude/shots/realism/`.

Como reproduzir: `sh render_item.sh` (poste) e `render_doll.py` / `render_avatar.py` + `compose.py` (avatar).
Cycles/HIP (RX 7600) com denoise; o avatar usa MPFB/MakeHuman (CC0).

## Comparativo honesto

| Criterio | Doll estilizada (atual) | Ultrarrealista |
|---|---|---|
| Custo no navegador/celular | Barato: poste ~950 tris, doll ~25k verts com 1 textura 2k + normal. Roda em celular medio. | Inviavel em tempo real "como renderizado". O que se vê nos renders depende de SSS (random walk), refracao da cornea, cabelo em curves (milhares de fios), reflexos de ceu e DOF. No WebGL isso vira: malha 30-60k tris so no corpo, cabelo em cards alpha (5-15k tris + overdraw), texturas 2k-4k (albedo+normal+roughness+SSS fake) por personagem, eyes com shader custom. Celular de entrada: queda de FPS clara, memoria de textura 5-10x maior. |
| Tempo de producao por item | Poste, banco, roupa: minutos a 1-2 h com os geradores procedurais ja existentes. | Poste fotorrealista: ~1 dia (modelagem com chanfros, 3-4 materiais com desgaste, bake de texturas para GLB). Roupa realista: 0,5-2 dias por peca (caimento, tecido, UV, variacoes de cor e padrao). Avatar completo (pele, olhos, cabelo, roupas, rig, blendshapes de maquiagem): semanas. Cada variante de cor/estampa deixa de ser "so trocar um parametro". |
| Coerencia com o resto | Alta: cidade, casas, carros, pets, UI e doll compartilham a mesma linguagem porcelana/vinil. | Baixa se misturar: um unico item hiper-realista num mundo de dollhouse parece "colado". Para coerencia teria que refazer cidade, interiores, carros, pets e UI. |
| Maquiagem, joias, customizacao | O sistema atual (mascaras de maquiagem 1024, cor de pele, morphs) foi desenhado para a doll. | Maquiagem realista exige UV/texturas de pele proprias; joias e roupas precisam de colisao/ajuste fino (penetracao fica evidente em realismo). |
| Risco de uncanny valley | Baixo: o estilo "boneca" perdoa. | Alto: olhos, boca parada, cabelo "de capacete" e pele "de cera" aparecem imediatamente. Sem animacao facial e fisica de cabelo/tecido o realismo estatico vira estranho em movimento. |
| Peso dos assets | Doll 3,5 MB GLB, itens dezenas de KB. | Pele 2-4k x varios mapas, cabelo, olhos, normal maps: 10-30 MB por personagem facilmente; cidade realista com PBR 2k por prop passa de centenas de MB. |
| Risco de publico (menores) | Estilizacao ajuda a manter tudo neutro. | Corpos realistas pedem cuidado extra: roupas discretas, sem partes anatomicas modeladas, sem poses sugestivas. |

## Recomendacao

Manter a doll como estetica do jogo. Se quiser "mais realista", o melhor custo/beneficio e
subir um degrau, nao ir ao extremo: materiais PBR com ruido/desgaste baked em texturas pequenas,
chanfros e iluminacao melhor na cidade, mantendo as proporcoes estilizadas. Ultrarrealismo so faria
sentido num jogo inteiro refeito, ou em renders pre-calculados (cutscenes/thumbnails), nao em tempo real.
