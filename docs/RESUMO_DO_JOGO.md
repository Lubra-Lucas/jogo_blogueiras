# Jogo das Blogueiras — Resumo de tudo o que existe (versão atual)

> Situação em 18/10/2026 · versão publicada: commit `d8b553b` (main)
> Site: https://lubra-lucas.github.io/jogo_blogueiras/
> Endereço de teste: `?viagem=livre` libera Miami sem o nível 15.

Jogo social de moda em 3D no navegador, misturando Roblox, Dress to Impress e The Sims. Estética "boneca fashion glam" com acabamento de porcelana/vinil brilhante e **cores do mundo real**, com rosa só como acento. Funciona no computador e no celular, em pé e deitado.

---

## 1. Mundo

### 1.1 Cidades
| Cidade | Como chegar | Destaques |
|---|---|---|
| **Cidade das Blogueiras** (principal) | início do jogo | 7 bairros, praças, ruas, parque com lago, estabelecimentos com interior |
| **Miami Beach** | avião, pelo aeroporto, a partir do **nível 15** | praia com mar animado (dá para entrar até a cintura), Ocean Drive Art Déco, Collins Ave, Lincoln Road, calçadão, ciclovia, píer, NPCs, céu tropical e som do mar |

### 1.2 Bairros da cidade principal
| Bairro | Estilo |
|---|---|
| Centro | Y2K suave |
| Avenida da Moda | luxo moderno |
| Palco Neon | neon glam |
| Jardim Romântico | romântico |
| Bairro Futuro | — |
| Lago / Parque do Lago | natural |

Praças: Praça Central, Praça das Vitrines, praças da Moda, do Neon e do Jardim, e o Boulevard Noturno.

### 1.3 Estabelecimentos (portas) e interiores jogáveis
Café Rosé · Salão & Spa · Boutique · Joalheria · Estúdio de Fotos · Palco Neon · Lounge de Jogos (cassino) · Casa dos Sonhos · Petshop Patinhas · Aeroporto.

Têm **interior jogável** (com móveis, balcões, NPCs, assentos e pontos de minijogo/loja): café, salão, boutique, joalheria, estúdio, palco, casa, cassino e petshop.

### 1.4 Vida e ambiente
- Dia e noite, clima (sol, nublado, chuva...), céu e névoa por cidade.
- Vento nas árvores, bandeiras e toldos; água animada; luzes que acendem à noite; partículas e impactos.
- Mobiliário urbano detalhado: bancos, postes, quiosques, vitrines, murais, carrinhos de comida, píer, parque de cachorros, academia ao ar livre, telhados e outros.
- LOD (modelos mais simples de longe) para pesar menos.
- NPCs passeando, conversando no chat e com aparências variadas (rosto, corpo e proporções sorteados).

---

## 2. Personagem

### 2.1 Modelo
- Boneca 3D estilizada gerada no Meshy e preparada e rigada no Blender, com **52 ossos** (padrão Mixamo).
- Cerca de 1,60 m de corpo; o coque chega a ~1,70 m.

### 2.2 Personalização do corpo
- **Formatos (morphs):** busto (+/−), bumbum (+/−), quadril, cintura, coxas, peso (+/−) e ombros.
- **Proporções por ossos (12 controles):**
  - altura (~1,45 m a ~1,85 m), pernas, tronco, braços, pescoço, tamanho da cabeça, mãos, pés e ombros;
  - **postura:** corcunda, lordose e ombros caídos;
  - botões "Aleatório (corpo)" e "Zerar proporções".
- Os pés ficam no chão, o passo se ajusta ao tamanho da perna e a câmera, a selfie, o assento e o banco do carro acompanham a altura.
- Cabeça mais ereta nas animações (correção automática da postura da cabeça).

### 2.3 Personalização do rosto
- **Formato:** rosto fino, mandíbula, queixo, maçãs, nariz (menor/estreito), lábios (cheios/largos) e "rostos prontos" (Doce, Glam, Elegante, Marcante).
- **Pele:** cor livre aplicada no corpo inteiro e acabamentos.
- **Olhos:** cor da íris (inclusive um olho de cada cor).
- **Sobrancelhas:** manter, tingir ou apagar e desenhar outra.
- **Cílios:** cor.
- **Maquiagem:** sombra, delineado, blush, batom (fosco, acetinado, gloss, metálico), iluminador, sardas e detalhes. Looks prontos: Natural glow, Glam noturno, Y2K gelo, Boneca, Gótica, Festival, Vermelho clássico, Pêssego coreano.
- **Unhas:** estilos e cores.
- ⚠️ Limitação atual: olhos, cílios, sobrancelhas e boca são **pintados** na textura. Por isso dá para mudar a cor, mas não o formato. A troca para um rosto em **camadas** está em andamento (seção 9).

### 2.4 Roupas — 107 peças
| Tipo | Quantidade |
|---|---|
| Tops (blusas, casacos, jaquetas...) | 34 |
| Vestidos | 28 |
| Partes de baixo (saias, calças, shorts) | 26 |
| Sapatos | 13 |
| Meias / meias-calças | 3 |
| Luvas | 3 |

- **Estampas:** Original, Liso, Xadrez, Floral, Poá, Listras, Animal print, Jeans e Tricô.
- **Cores:** livres por peça.
- **Ajustes automáticos:** os sapatos têm salto (levantam a personagem), as botas escondem meias e os casacos longos escondem a parte de baixo.

### 2.5 Joias e acessórios — 104 peças
Colares 23 · brincos 16 · cabeça (tiaras, laços, coroas) 15 · chapéus 11 · pulseiras 10 · bolsas 8 · anéis 6 · óculos 6 · cintos 4 · cachecóis 2 · broches 2 · tornozeleira 1.
- Brilho de verdade em metais, pedras (cintilação ao girar) e pérolas.

### 2.6 Cabelos — 4
Coque (padrão), cachos caramelo, ondas castanhas e undercut platinado. A cor é livre e eles se encaixam na cabeça e nos chapéus.

### 2.7 Animações
- **Locomoção:** parada, andar, correr (Mixamo "Running", com Shift ou joystick até o fim), meia-volta correndo e desfile.
- **Ações:** sentar e levantar (bancos, cadeiras, sofás).
- **Emotes (roda de emotes):** acenar, palmas, beijo, reverência, risada, choro, apontar, agradecer, pular, dançar e mexer no celular.
- Animação de dirigir.

---

## 3. Minijogos (17)
Todos ficam no **app "Jogos" do celular**, que dá para jogar direto de qualquer lugar ou com "Ir até lá". Também abrem nas portas dos estabelecimentos.

| Minijogo | Onde | Profissão / tipo |
|---|---|---|
| Café Rosé (barista) | Café Rosé | Barista |
| Salão (cabelo) | Salão & Spa | Cabeleireira |
| Manicure | Salão & Spa | Cabeleireira |
| Passarela / Desfile | Boutique | Modelo |
| Estilista | Boutique | Estilista |
| Joia Sob Medida | Joalheria | Joalheira |
| Ensaio Fotográfico | Estúdio de Fotos | Fotógrafa |
| DJ da Noite | Palco Neon | DJ |
| **Memória Fashion** (novo) — pares de peças e "Lembre o look" | Estúdio de Fotos | Estilista |
| **Cadê a Blogueira?** (novo) — estilo "Onde está o Wally?", 5 cenários | Lounge de Jogos | Fotógrafa |
| Banho e Tosa | Petshop | Tosadora |
| Adestramento | Petshop | Tosadora |
| Vôlei de praia | Miami Beach | Praia (sem profissão) |
| Lounge de Jogos: **Blackjack, Roleta, Caça-níqueis e Pôquer** | Lounge de Jogos | Cassino (fichas) |

Comum a todos:
- dificuldades (Fácil / Normal / Difícil / Estrela);
- desafio do dia;
- ranking com rivais NPC;
- recompensas em Brilhos e XP;
- tutoriais na primeira vez;
- funcionam em pé, deitado e no computador.

---

## 4. Economia, lojas e mercado
- **Moedas:**
  - **Brilhos**, ganhos jogando;
  - **Diamantes**, premium, por enquanto só em modo de teste. Tudo que é exclusivo de Diamantes também pode ser obtido com Brilhos.
- **Lojas:** Boutique, Joalheria, Salão (serviços), Petshop, Loja Diamantes e ofertas diárias; vitrine e provador.
- **Mercado de edições limitadas:** peças numeradas que valorizam, negociadas só com Brilhos. É simulado com NPCs, tem taxa de 5% e trava de troca.
- **Cassino:** fichas próprias, que não se compram e não viram dinheiro, com conquistas próprias.
- **Progresso:** nível e XP, profissões com nível, conquistas, recompensa diária e missões.
- Sem loot box (público inclui menores).

## 4b. Progressão da personagem

### Começo do jogo (fora do modo teste)
Nível 1, título "Iniciante", **50 Brilhos**, 0 Diamantes e um guarda-roupa inicial com 8 itens: coque, ondas castanhas, camiseta, saia evasê, meia-calça, laço de cabelo, brincos de pérola e choker de fita.

### Nível geral (XP)
- O XP vem dos **minijogos** (a cada rodada, conforme a pontuação e a dificuldade) e das **missões**.
- Cada nível pede mais XP que o anterior. A fórmula é: XP para o próximo nível = 80 + 45 × (nível − 1)^1,5.

| Chegar ao nível | XP acumulado |
|---|---|
| 2 | 80 |
| 3 | 205 |
| 5 | 726 |
| 7 | 1.749 |
| 10 | 4.501 |
| 15 (libera Miami) | 13.161 |
| 20 | 28.003 |
| 25 | 50.094 |
| 30 | 80.356 |

Com cerca de 35 a 50 XP por rodada de minijogo, o nível 7 leva ~1h30–2h de jogo, e o nível 15 bem mais.

### Títulos de fama (aparecem no cartão da jogadora)
| Nível | Título |
|---|---|
| 1 | — |
| 2 a 3 | Iniciante |
| 4 a 6 | Micro-influencer |
| 7 a 10 | Blogueira |
| 11 a 15 | It Girl |
| 16 a 24 | Celebridade |
| 25 ou mais | Ícone |

### Profissões (nível próprio, até 10)
**Barista, Cabeleireira, Fotógrafa, Modelo, Estilista, DJ, Joalheira e Tosadora.** Cada minijogo dá XP à profissão dele (ver a tabela de minijogos). O nível da profissão aparece no app Jogos e **libera conteúdo dentro do minijogo**: receitas no Café, serviços em dupla no Salão, recompensas de pet como o "Biscoito premiado" e outras. A profissão escolhida aparece no perfil.

### O que se ganha e o que se libera
- **Brilhos:** em cada rodada de minijogo, nas missões e na recompensa diária. Servem para roupas, joias, cabelos, pets, carros, serviços e o mercado.
- **Diamantes:** das **conquistas**, como primeira compra, armário com 12 e com 25 peças, peça lendária, 25 rodadas, 5.000 Brilhos ganhos, 10 fotos, nível 10 e primeira viagem. Também podem ser comprados, por enquanto só em modo de teste.
- **Missões:**
  - **Iniciais:** "Trabalhe no Café Rosé" (+70 XP / +45 Brilhos), "Desfile na Passarela" (+90 / +60), "Visite a Avenida da Moda" (+60 / +40), "Sente num banco do Parque" (+50 / +30) e "Tire uma foto no ponto #JogoDasBlogueiras" (+80 / +50).
  - **Diárias:** renovam todo dia.
  - As missões só contam quando a rodada termina de verdade.
- **Viagens:** **Miami Beach libera no nível 15.**
- **Cassino:** as conquistas do lounge liberam acessórios exclusivos, como luvas de veludo, broche de coroa, pingente de roleta, clutch dourada e abotoaduras.
- **Mercado:** completar coleções de edições limitadas dá títulos.
- **Exclusivos de Diamantes:** passam a poder ser comprados com Brilhos algumas semanas depois do lançamento.

### Modo teste (fase atual)
Para a fase de testes, **todas as pessoas que entram pelo link** começam com nível alto, Brilhos, Diamantes e fichas de sobra, todas as profissões no máximo e **todos os itens liberados**. Assim dá para testar todos os jogos, as cidades e os itens. Ele é ligado e desligado num único lugar (`src/game/testMode.ts`), e precisa ser **desligado antes do lançamento**.

## 5. Carros
- 5 modelos: **Docinho** (compacto), **Madame** (conversível), **Safári** (SUV), **Relâmpago** (esportivo conversível) e **Food Truck** (van).
- Cerca de 14 cores (Creme, Verde-inglês, Azul-marinho, Bordô, Mostarda, Prata, Carvão, Sálvia, Terracota, Pérola, Ouro, Grafite, Branco...).
- Física estilo GTA (aceleração, freio de mão, drift, nitro), câmeras, rádio e buzina. Testada por 625 testes automáticos.
- O banco desce conforme a altura da personagem.

## 6. Pets
- **10 raças:** Caramelo, Shiba, Poodle, Dachshund, SRD (vira-lata), Persa, Siamês, Maltês, Cavalier King e Golden Retriever.
- O pet segue a personagem (inclusive nas viagens), senta e recebe carinho (tecla E). Tem nome e necessidades leves (fome e felicidade).
- **Acessórios 3D:** coleira de strass, bandana e laço de cetim. A polo está escondida até ser corrigida.
- Comprados no Petshop Patinhas, que tem 2 minijogos.

## 7. Celular da personagem (13 apps)
Missões · **Jogos** · Blogram (rede social) · Mensagens · Loja · Mercado · Garagem · Mapa · Viagens · Câmera (selfie que enquadra o rosto, câmera traseira e poses) · Guarda-roupa · Perfil · Ajustes.
- O celular minimiza para uma aba pequena e volta na mesma tela.

## 8. Interface e controles
- **HUD limpo:** cartão da jogadora, minimapa e chat sempre visível e discreto; sem título, relógio fixo ou FPS.
- **Computador:**
  - WASD + Shift (correr) ou clique para andar (duplo clique corre);
  - E/R/T/Y para interagir e F para dirigir;
  - C abre o menu e P o celular.
- **Celular:**
  - joystick fixo ou dinâmico, dock 2×2 (Celular, Emotes, Conversar, Correr);
  - arrastar para girar a câmera e pinça para zoom;
  - layouts próprios em pé e deitado, respeitando o notch e o teclado;
  - tela cheia, e no iPhone dá para "Adicionar à Tela de Início".
- **Ajustes > Interface:** tamanho P/M/G, tipo de joystick, sensibilidade da câmera e tela cheia.
- **Câmera:** sobe ao encostar em paredes, e árvores, palmeiras e lustres na frente ficam transparentes.

---

## 9. Em andamento (feito, mas ainda NÃO publicado)
| Trabalho | Situação |
|---|---|
| **Avatar masculino** | Boneco do Meshy com o mesmo esqueleto; rosto em **camadas trocáveis** (olhos, cílios, sobrancelhas, boca, blush, barba/bigode/cavanhaque, olheiras/linhas); **26 formatos de rosto**; 3 cabelos de teste (serão trocados por cabelos do Meshy); formatos de corpo. Falta: barbas melhores, cabelos, editor e escolha de gênero, roupas masculinas. |
| **Boneca com rosto em camadas** | O rosto pintado vira camadas trocáveis + 12 formatos de rosto, mantendo corpo, roupas e cabelos. Em correção para o look "Clássica" ficar igual à boneca atual. |
| **Carregamento no celular** | Arquivos 3D comprimidos (103 MB → 53 MB), carregamento por partes, cache offline. Parado; falta testar tudo. |
| **Desempenho no celular** | Qualidade automática que se ajusta ao FPS. Parado; falta medir. |
| **Estudo ultrarrealista** | Só o poste comparativo (não entra no jogo). |
| Moldes do MakeHuman | Descartados pela estética; guardados só como referência. |

### Pendências conhecidas
- Teto do carro compacto baixo para personagens muito altas.
- Polo dos pets com defeito.
- Caixa "Recompensa diária" sobrepondo o HUD deitado.
- Cenário detalhado ainda rosado em alguns itens.
- Falta uma proteção para quando um arquivo 3D falha ao carregar.

---

## 10. Estrutura técnica (como foi construído)

### 10.1 Tecnologias
- **Vite + React 19 + TypeScript** (modo estrito).
- **3D:** three.js + @react-three/fiber + drei.
- **Física:** Rapier (personagem, colisões, carros).
- **Estado:** zustand.
- **Publicação:** GitHub Pages, por GitHub Actions a cada atualização do `main`.
- **Arte 3D:** Blender 5.2 por **scripts automáticos** (pasta `tools/blender/`), Meshy (personagens, cabelos) e Mixamo (animações, retargetadas por script).

### 10.2 Pastas principais
```
src/
  game/                 lógica do mundo 3D
    character/          personagem, materiais, morphs, proporções, maquiagem, animação
    world/city/         cidade (layout, kits, props, LOD, culling)
    world/miami/        Miami Beach (kit, mar, NPCs)
    world/environment/  dia/noite, clima    world/life/  vento, água, luzes
    interiors/          salas jogáveis (layouts por estabelecimento)
    interaction/        portas e interações      sit/  assentos
    minigames/          lógica dos minijogos + competição + recompensas
    economy/            Brilhos, Diamantes, preços, conquistas, recompensas diárias
    market/             mercado de edições limitadas (simulado)
    casino/             fichas e conquistas do lounge
    vehicles/           carros, física, catálogo, câmera
    pets/               pets, catálogo, comportamento, acessórios
    travel/             viagens e cidades
    navigation/         rotas (A*) e "Ir até lá"
    camera/ input/ player/ systems/  câmera, controles, jogador, qualidade
  ui/                   interface (HUD, celular, menus, lojas, minijogos, chat, mobile.css)
  shared/               dados da aparência (versões, migração, gerador aleatório, catálogo de rosto)
public/assets/          modelos 3D (.glb), texturas e manifestos
  characters/ garments/ jewelry/ anims/ city/ interiors/ pets/ vehicles/ miami/
tools/
  blender/              scripts de geração (roupas, joias, cidade, carros, pets, Miami, avatar...)
  vehicle-tests/        625 testes de física dos carros
  tests/                teste de aparência (3.000 aparências sorteadas)
docs/                   ARCHITECTURE.md, MINIJOGOS_GUIA.md, este resumo
```

### 10.3 Como as peças se encaixam
- **Registros automáticos:** cada minijogo é uma pasta com um `def.tsx`, e o jogo descobre sozinho (`src/ui/minigames/registry.ts`). As lojas e os interiores seguem o mesmo padrão.
- **Manifestos JSON:** roupas (`garments.json`), joias (`jewelry.json`), pets (`pets.json`) e animações (`doll_anims.json`). As peças novas entram pelos scripts do Blender.
- **Aparência versionada (v5):** os perfis salvos são convertidos automaticamente quando surgem campos novos.
- **Testes automáticos:** carros (625), aparência (3.000 sorteios) e interiores.

### 10.4 Como o trabalho é feito
- O planejamento e a revisão ficam com o Opus; a execução, com agentes Sonnet, cada um numa cópia separada do projeto.
- Cada parte é publicada separadamente, depois da sua aprovação.
- A sessão da nuvem faz só código, o PC faz o Blender e o Mac faz testes.
