# Pipeline atual: boneca do Meshy

`prepare_meshy.py` (limpeza/bake) -> `rig_meshy.py` (rig, morphs, export de `doll_base.glb`/`hair_meshy_updo.glb`/`doll_base.json`) ->
`python tools/blender/doll_masks.py` (mascaras `doll_mask.png`/`doll_mask2.png`, numpy + Pillow + scipy, sem Blender). Detalhes em docs/ARCHITECTURE.md.
Rode `doll_masks.py` de novo sempre que o GLB do corpo (UV/atlas) mudar.

O restante deste arquivo descreve o pipeline antigo (base MakeHuman, `build_character.py`), mantido so como referencia.

# Pipeline Blender da personagem base

Gera `public/assets/characters/base_female.glb` (+ `.json` de metadados, GLB de cabelo e GLBs da roupa basica)
a partir do MakeHuman/MPFB, de forma deterministica, com morph targets para os sliders do jogo.

## Requisitos
- Blender 5.2 LTS (`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`).
- Extensao MPFB (`bl_ext.blender_org.mpfb`) instalada + pacote "MakeHuman system assets" (CC0).
  O script habilita o MPFB sozinho (`--factory-startup`).

## Como rodar
```bash
cd C:\Users\user\Documents\GitHub\jogo_blogueiras
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup -noaudio ^
  --python tools/blender/build_character.py -- --style tools/blender/style_glam.json --render --tag r1
```
Argumentos (depois de `--`):

| arg | padrao | descricao |
|---|---|---|
| `--style` | `tools/blender/style_glam.json` | arquivo JSON de estilo |
| `--out-dir` | `public/assets/characters` | onde gravar GLB e JSON |
| `--no-export` | - | nao exporta (so iterar no visual) |
| `--render` | - | gera os renders de preview (EEVEE) |
| `--preview-dir` | `C:\Users\user\AppData\Local\Temp\claude\shots\blender` | pasta dos renders |
| `--tag` | `r` | prefixo dos arquivos de render |
| `--shots` | todos | lista: `face_front,face_34,body_front,body_side,morphs_face,morphs_body,chest_front,chest_side,pelvis_front,pelvis_side,pelvis_back` |
| `--nohair` | - | esconde o cabelo nos renders (ver a forma da cabeca) |
| `--nooutfit` | - | esconde a roupa nos renders (so para checagem interna da superficie do corpo; nao guarde essas imagens) |
| `--cache-dir` | `tools/blender/.cache` | texturas redimensionadas (ignorado pelo git) |

Tempo total: ~7 s para build+export, ~3 s por render.

## O que o script faz (`build_character.py`)
1. Cria o humano MPFB (19158 vertices com helpers) e **remove os shape keys do MPFB**: macros e targets sao
   somados em numpy direto sobre as posicoes (`macro_positions`, `apply_targets`), assim o resultado e exato
   e os morphs podem ser recalculados variando o estilo.
2. Aplica os targets do MakeHuman do JSON e as **operacoes customizadas** (`custom_ops`) - ver abaixo.
3. Escala tudo para `target_height_m` e poe os pes em z=0.
4. Rig MPFB `mixamo` (52 ossos `mixamorig:*`, pesos do MPFB) e proxies `.mhclo`: olhos (low-poly), cilios,
   sobrancelhas (e cabelo, so para preview) com pesos interpolados -> todos seguem o osso `mixamorig:Head`.
5. **Morph targets**: para cada entrada de `morphs` o pipeline de estilo roda de novo com a variacao
   (targets somados, macros trocados, ops extras) e o delta vs. a base vira um shape key (valor 0..1).
   Para os proxies o delta e calculado pela ligacao barycentrica do `.mhclo` (mesma formula do MPFB, conferida:
   erro de fit 0), entao olhos/cilios/sobrancelhas seguem os morphs do rosto.
6. Remove a geometria auxiliar (juntas, tights, saia, olhos/dentes/lingua helper, genital): mantem so o grupo `body`
   (13380 vertices). Remove os vertex groups que nao sao ossos.
7. Materiais Principled simples: pele (textura 2048 JPEG + `skin_tint`), olhos, cilios/sobrancelhas (alpha MASK,
   ajustado no JSON do GLB), UV preservada. Exporta GLB (Y-up, skin, morphs esparsos, sem normais de morph).
8. **Roupa basica** (o top e um tubo liso: Taubin forte + afastamento do corpo por campo suave >= 6 mm + casco convexo por anel horizontal so na frente, que faz ponte sobre o vao dos seios; tudo repetido em cada shape key) (`preview_render.build_outfit`, roda sempre): top tomara-que-caia e short recortados da propria malha, deslocados 5-6 mm ao longo da normal (sem z-fighting), com os mesmos pesos de pele e os **mesmos morph targets do corpo** (o bmesh interpola as shape keys). Exportados como `outfit_basic_top.glb` / `outfit_basic_shorts.glb` (so o rig + a peca; material PBR liso, o jogo recolore).
9. **Pontos UV do rosto** (`uv_landmarks.py`): gravados em `base_female.json` > `uvLandmarks` (+ `skinTexture` com o tamanho da textura, 2048x2048). Veja abaixo.
10. `preview_render.py` (com `--render`): luz de 3 pontos, fundo gradiente rosa/lilas, AgX, roupa de preview
   (top tomara-que-caia + short cortados da propria malha - seguem os morphs), cabelo `long01` e **maquiagem so de
   preview** (batom, sombra, delineador, blush por cor de vertice - nao vai no GLB).

## Corpo liso de boneca (`doll_smooth`)
O corpo nao tem papilas nem relevo genital, para qualquer roupa/traje de banho: no fim de `pipeline()` (entao os morphs ja saem
suavizados) `doll_smooth` aplica suavizacao de Taubin com peso de queda suave: seios (raio ~9,5 cm em torno do apice: superficie y(x,z) por polinomio de grau 4 ajustado por minimos quadrados na regiao, descartando iterativamente os pontos a frente do ajuste - a papila e a ponta do cone - e misturando com queda suave; depois Taubin leve; Taubin/Laplaciano sozinhos preservam ou colapsam o cone),
virilha (frente) e sulco dos gluteos (costas). Alem da geometria, `clean_skin_texture` apaga da textura de pele (inpaint multiescala
com a cor vizinha) as areolas, o sombreado da virilha e o sulco, usando os triangulos UV dessas regioes. Parametros em `doll_smooth`
do JSON de estilo. Outros ajustes de expressao no estilo: `eyebrows` (`eyebrow008`, arco suave), `brow_tilt` (eleva a ponta interna)
e `lash_scale` (cilios menores).

## `uvLandmarks` (maquiagem no jogo)
O UV do rosto do MakeHuman e polar (aneis em volta dos olhos e da boca; o rosto fica girado 90 graus na textura) e muito
anisotropico perto dos olhos. Por isso as formas sao definidas **em 3D** (metros, vista frontal) e cada ponto e projetado na
superficie do rosto (raio +Y contra a malha do corpo) e convertido para UV por interpolacao baricentrica. Fontes:
- contorno dos olhos e linha dos labios = vertices de "costura" UV (vertices com mais de uma UV: borda entre a ilha do rosto e as ilhas do interior);
- sobrancelhas = malha proxy; sombra, blush, asa do delineador e contorno dos labios = formas parametricas ancoradas nesses pontos.

Campos (todos em UV 0..1, origem embaixo-esquerda; no canvas `y = (1 - v) * tamanho`): `eyes.l|r` {`center`, `inner`, `outer`,
`contour`, `upperLid`, `lowerLid`, `liner` (faixa de ~1,6 mm, poligono), `wing` (poligono tamanho 1, escalar em torno de `outer`),
`shadow` (poligono palpebra->dobra), `widthMeters`, `uvPerMeter`}, `brows.l|r` {`center`, `line`}, `mouth` {`center`, `cornerL/R`, `slit`,
`outline` (poligono), `upperLip`, `lowerLip`, `widthMeters`, `uvPerMeter`}, `blush.l|r` {`center`, `polygon`}, `noseTip`.
`l` = lado esquerdo da personagem (+X). Os pontos valem para a forma base (sem morphs); o UV acompanha os vertices, entao a maquiagem acompanha os sliders.

Depuracao visual: `python tools/blender/debug_landmarks.py saida.png` (Python do sistema + Pillow) desenha os pontos sobre a textura de pele (cache do build).

## Campos do JSON de estilo (`style_glam.json`)
- `name`, `rig` (`mixamo`), `target_height_m`.
- `macros`: gender/age/muscle/weight/proportions/height/cupsize/firmness (0..1) e `race`.
- `targets`: `{nome_do_target_MakeHuman: peso}`; prefixo `LR:` aplica `l-` e `r-` (ex. `LR:cheek-bones-incr`).
  Pesos podem passar de 1 (extrapola) ou ser negativos.
- `custom_ops` (em ordem; coordenadas em metros, antes do ajuste de altura):
  - `head_scale` (cabeca grande, transicao suave no pescoco), `band_scale` (afinar pescoco),
  - `lower_face_compress` (encurta nariz->queixo), `face_taper` (afina maxilar), `leg_scale` (pernas),
  - `region_scale` / `region_move` (elipsoide com queda suave; `center` = ponto ou `{"lm": "eye_l", "off": [x,y,z]}`;
    `mirror` espelha em x), `group_move` (move grupos rigidos, ex. globos oculares).
  - landmarks: `eye_l`, `eye_r`, `mouth`, `neck`, `head`, `jaw`, `pelvis`, `lid_u`, `lid_l`, `nose`, `nose_tip`,
    `lip_u`, `lip_l`, `lips`, `chin`.
- `eyes_mesh` (`low-poly`), `eye_color`, `iris_scale` (aumenta a iris via UV), `eyelashes`, `eyebrows`, `hair`,
  `hair_tint`, `skin`, `skin_texture_size`, `skin_jpeg_quality`, `skin_tint`, `skin_roughness`.
- `morphs`: `{nome: {label, group, targets{}, macros{}, ops[]}}` - descreve o delta a valor 1 do slider.
- `preview`: `top_off`/`shorts_off` (metros relativos ao quadril), cores da roupa e maquiagem.

## Saidas
- `public/assets/characters/base_female.glb` - corpo + olhos + cilios + sobrancelhas, skin de 52 ossos, 20 morphs no corpo.
- `public/assets/characters/base_female.json` - metadados: morphs (nome, rotulo PT-BR, grupo, faixa 0..1, malhas que
  os possuem), ossos, altura (m), altura da cabeca e proporcao cabeca/corpo.
- `public/assets/characters/base_female_hair_long01.glb` - cabelo opcional (mesmo esqueleto, tambem com morphs de rosto).
- `public/assets/characters/outfit_basic_top.glb`, `outfit_basic_shorts.glb` - roupa basica (mesmo esqueleto, 20 morphs do corpo).

## Notas para a integracao no jogo
- Os ossos tem nome Mixamo; o `GLTFLoader` do three.js tira o `:` (`mixamorigHips`), igual ao `FBXLoader`.
  Os eixos locais dos ossos sao os do Blender (nao os do FBX do Mixamo): para animacoes do Mixamo use
  `SkeletonUtils.retargetClip` (retarget por nome), nao aplique o clip direto.
- Cada malha tem seus proprios `morphTargetDictionary`; ao mover um slider, ajuste `morphTargetInfluences[nome]`
  em todas as malhas que tiverem a chave (corpo, olhos, cilios, sobrancelhas, cabelo).
- Normais nao sao morfadas (three.js nao interpola normais de morph).
- Cilios/sobrancelhas: `alphaMode MASK` + `doubleSided`.

## Licencas
- MakeHuman system assets (targets, malha base, olhos, cilios, sobrancelhas, cabelo, pele): **CC0**.
- MPFB (extensao do Blender): GPL - usada so como ferramenta; os arquivos gerados contem apenas assets CC0.
- Os scripts deste diretorio fazem parte do projeto.

## Animacoes do Mixamo
`retarget_mixamo.py` -> `public/assets/anims/doll_anims.glb` (ver docs/ARCHITECTURE.md, "Animacoes"). Entrada: FBX em `E:/Jogo Blog/`
(Catwalk Walk, Catwalk Walking, Clapping, Dancing Twerk, Female Start Walking), esqueleto de `.cache/meshyB_4.blend`.
`blender -b --factory-startup -noaudio --python tools/blender/retarget_mixamo.py -- build --render` (renders de conferencia em
`...\shots\anim\retarget_*.png`). Para um clipe novo, adicione uma entrada em `CLIPS` (e em `CLIP_SPEED` se for de passo).
