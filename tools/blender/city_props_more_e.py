"""Pecas (parte E, rodada 2): vida da calcada - lousa, jornais, flores, aquecedor, sacolas, caes, carregador, bike-share, caixa eletronico,
correio, oliveira, topiaria, tapete de cafe, feira, floricultura, carrinho de cachorro-quente e de cafe.
Todas pequenas (<= ~900 tris), origem na base, frente = -Y blender (+Z no jogo). Cores reais; rosa so em acento raro."""
from city_props_more_lib import *  # noqa


def blooms2(P, cx, cy, cz, spread, n, cols, r=.045, seed=0, flat=True):
    """flores/frutas espalhadas num disco (espiral aurea); cols = slots."""
    for i in range(n):
        a = i * 2.399 + seed
        d = spread * sqrt((i + .5) / n)
        P.append(sph(r, (cx + d * cos(a), cy + d * sin(a), cz + (i % 3) * .025), cols[i % len(cols)], n=6, rings=4))


# ----------------------------------------------------------------------------------------------------
@piece("chalkboard_sign", "chalk", "calcada", collider=("box", [.7, 1.0, .4], [0, .5, 0]),
       note="lousa A-frame de cafe/loja (sandwich board) com letras de giz; base=lousa, accent=madeira, accent2=giz branco, soft=giz amarelo")
def piece_chalkboard_sign():
    P = []
    for sg in (-1, 1):
        P.append(box((.64, .04, .96), (0, sg * .08, .46), "accent", rot=(sg * .17, 0, 0), bevel=.012, seg=1))
    # lousa na face frontal (-Y)
    P.append(box((.54, .02, .8), (0, -.098, .49), "base", rot=(-.17, 0, 0), bevel=.006, seg=1))
    for k, (w, z, m) in enumerate(((.38, .79, "accent2"), (.3, .66, "accent2"), (.34, .56, "accent2"), (.2, .45, "soft"))):
        P.append(box((w, .012, .026), (0, -.112 + (.79 - z) * -.17 * 0, z), m, rot=(-.17, 0, 0), bevel=.004, seg=1))
    # xicara desenhada a giz
    P.append(cyl(.05, .016, (-.1, -.112, .3), "accent2", rot=(pi / 2 + .17, 0, 0), n=10))
    P.append(box((.08, .012, .026), (.08, -.112, .3), "soft", rot=(-.17, 0, 0), bevel=.004, seg=1))
    P.append(heart(.07, .014, (.14, -.114, .38), "soft", rot=(-.17, 0, 0)))
    P.append(box((.06, .04, .05), (0, 0, .96), "trim", bevel=.012, seg=1))
    return P


@piece("newspaper_stack", "bags", "calcada", note="pilha de jornais amarrada com barbante (rasteira)")
def piece_newspaper_stack():
    P = []
    for k in range(6):
        w = .42 - (k % 2) * .01
        P.append(box((w, .3, .028), (((k * 7) % 3 - 1) * .005, ((k * 5) % 3 - 1) * .006, .014 + k * .028), "base" if k % 2 == 0 else "soft", bevel=.004, seg=1))
    for sx in (-.1, .1):
        P.append(box((.012, .32, .17), (sx, 0, .085), "deep", bevel=.003, seg=1))
    P.append(box((.44, .012, .17), (0, 0, .085), "deep", bevel=.003, seg=1))
    P.append(box((.36, .002, .02), (0, -.151, .12), "accent", seg=1))
    # 2o monte menor, de revistas coloridas
    for k in range(4):
        P.append(box((.26, .2, .016), (.38, .05, .008 + k * .017), ["accent2", "white", "soft", "deep"][k], rot=(0, 0, .2 + k * .06), bevel=.003, seg=1))
    return P


@piece("newspaper_box", "navy", "calcada", collider=("cylinder", [.32, 1.1], [0, .55, 0]),
       note="maquina de jornal (caixa azul com janela e fenda de moedas)")
def piece_newspaper_box():
    P = []
    P.append(box((.52, .46, .1), (0, 0, .05), "deep", bevel=.02))
    for sx in (-.2, .2):
        P.append(box((.07, .07, .62), (sx, 0, .4), "deep", bevel=.015, seg=1))
    P.append(box((.56, .5, .6), (0, 0, .96 - .3 + .1), "base", bevel=.05, seg=2))
    P.append(box((.58, .52, .07), (0, 0, 1.2), "accent2", bevel=.025, seg=1))
    P.append(box((.4, .02, .26), (0, -.255, 1.0), "glass", bevel=.008, seg=1))
    P.append(box((.34, .012, .2), (0, -.248, 1.0), "white", seg=1))
    for k in range(3):
        P.append(box((.3, .006, .02), (0, -.252, 1.06 - k * .06), "deep", seg=1))
    P.append(box((.2, .02, .11), (0, -.262, .74), "trim", bevel=.012, seg=1))
    P.append(box((.07, .01, .014), (0, -.274, .78), "deep", seg=1))
    P.append(box((.16, .014, .05), (0, -.262, .62), "accent2", bevel=.008, seg=1))
    return P


@piece("flower_buckets", "buckets", "calcada", collider=("box", [1.5, 1.2, .8], [0, .6, 0]),
       note="expositor de madeira em degraus com baldes de zinco e flores (floricultura de calcada)")
def piece_flower_buckets():
    P = []
    for k, (y, h) in enumerate(((.26, .2), (0, .5), (-.26, .8))):
        pass
    # estrutura em degraus: 3 prateleiras
    for sx in (-.7, .7):
        P.append(box((.05, .7, .08), (sx, 0, .04), "seat", bevel=.012, seg=1))
        P.append(box((.05, .05, 1.0), (sx, .3, .5), "seat", bevel=.012, seg=1))
        P.append(box((.05, .05, .5), (sx, -.3, .25), "seat", bevel=.012, seg=1))
    steps = ((.24, .62), (0, .38), (-.24, .14))
    for y, z in steps:
        P.append(box((1.5, .26, .035), (0, y, z), "seat", bevel=.01, seg=1))
    cols = [("accent", "soft"), ("accent2", "white"), ("soft", "accent"), ("white", "accent2")]
    for ri, (y, z) in enumerate(steps):
        n = 4 if ri < 2 else 3
        for i in range(n):
            x = -.55 + i * (1.1 / (n - 1))
            P.append(lathe([(0, 0), (.11, 0), (.14, .26), (.15, .28), (.135, .28), (0, .24)], "base", loc=(x, y, z + .02), n=12))
            P.append(tube(circ(x, y, z + .28, .145, 12, "xy"), .008, "trim", minor=4, closed=True))
            P.append(sph((.22, .22, .12), (x, y, z + .3), "leaf", n=8, rings=5))
            c = cols[(ri + i) % 4]
            blooms2(P, x, y, z + .38, .1, 6, [c[0], c[1]], r=.04, seed=i + ri)
    # placa de preco
    P.append(box((.34, .02, .18), (.45, -.4, .24), "white", rot=(-.3, 0, 0), bevel=.006, seg=1))
    P.append(box((.26, .012, .03), (.45, -.412, .27), "accent2", rot=(-.3, 0, 0), seg=1))
    return P


@piece("patio_heater", "char", "calcada", collider=("cylinder", [.4, 2.2], [0, 1.1, 0]),
       note="aquecedor de mesa externo (cogumelo de aco com tubo quente)")
def piece_patio_heater():
    P = []
    P.append(cyl(.34, .05, (0, 0, .025), "base", n=18, bevel=.015))
    P.append(cyl(.2, .35, (0, 0, .22), "deep", n=14, bevel=.02))
    P.append(lathe([(0, .38), (.052, .38), (.045, 1.55), (0, 1.58)], "trim", n=12))
    P.append(cyl(.1, .24, (0, 0, 1.72), "deep", n=12, bevel=.015))
    P.append(cyl(.075, .5, (0, 0, 1.95), "glow", n=10))
    P.append(lathe([(0, 2.05), (.2, 2.1), (.45, 2.22), (.5, 2.26), (.46, 2.28), (.2, 2.24), (0, 2.2)], "trim", n=18, smooth=1))
    P.append(sph(.045, (0, 0, 2.28), "trim", n=8, rings=5))
    for a in range(3):
        t = a * 2 * pi / 3
        P.append(tube([Vector((0, 0, 1.58)), Vector((.12 * cos(t), .12 * sin(t), 1.72))], .012, "deep", minor=4))
    return P


@piece("shopping_bags", "bags", "calcada", note="3 sacolas de papel de lojas (branca, preta, vermelha) com alcas de corda e papel de seda; usar em bancos")
def piece_shopping_bags():
    P = []
    for k, (x, y, m, ma, rz, h) in enumerate(((-.2, 0, "base", "accent2", .15, .36), (.04, .08, "accent", "white", -.2, .3), (.26, -.02, "accent2", "base", .3, .26))):
        P.append(box((.22, .12, h), (x, y, h / 2), m, rot=(0, 0, rz), bevel=.012, seg=1))
        P.append(box((.221, .122, .04), (x, y, h * .96), ma, rot=(0, 0, rz), bevel=.006, seg=1))
        for sx in (-.06, .06):
            P.append(tube(smooth3([(x + sx, y - .062, h * .85), (x + sx, y - .07, h * 1.12), (x + sx * .3, y - .06, h * 1.2)], 1), .006, "deep", minor=4))
        if k != 1:
            P.append(sph((.14, .06, .1), (x, y, h + .03), "soft" if k == 0 else "white", n=8, rings=5))
    return P


@piece("dog_bowl_post", "wood", "calcada", collider=("cylinder", [.18, .9], [0, .45, 0]),
       note="argola para amarrar cachorro (poste de madeira) com tigela de agua e osso de placa")
def piece_dog_bowl_post():
    P = []
    P.append(box((.12, .12, .92), (0, 0, .46), "base", bevel=.025, seg=1))
    P.append(cyl(.1, .04, (0, 0, .01), "deep", n=12))
    P.append(tube(circ(0, -.07, .66, .06, 12, "xz"), .01, "trim", minor=5, closed=True))
    P.append(box((.28, .03, .14), (0, -.075, .84), "accent2", bevel=.012, seg=1))
    P.append(sph((.06, .03, .05), (-.09, -.095, .84), "white", n=6, rings=4))
    P.append(sph((.06, .03, .05), (.09, -.095, .84), "white", n=6, rings=4))
    P.append(box((.16, .03, .035), (0, -.095, .84), "white", bevel=.01, seg=1))
    # tigela + agua
    P.append(lathe([(0, 0), (.1, 0), (.15, .05), (.17, .1), (.155, .1), (.13, .06), (0, .05)], "accent", loc=(.34, -.22, 0), n=14))
    P.append(cyl(.14, .008, (.34, -.22, .075), "water", n=14))
    P.append(lathe([(0, 0), (.06, 0), (.07, .02), (0, .02)], "deep", loc=(.34, -.22, .0), n=10))
    return P


@piece("charging_station", "char", "calcada", collider=("cylinder", [.42, 2.5], [0, 1.25, 0]),
       note="estacao publica de carregar celular (totem com tela, portas USB e mini painel solar)")
def piece_charging_station():
    P = []
    P.append(box((.62, .5, .08), (0, 0, .04), "deep", bevel=.02))
    P.append(box((.5, .34, 2.2), (0, 0, 1.14), "base", bevel=.06, seg=2))
    P.append(box((.4, .02, .9), (0, -.18, 1.65), "deep", bevel=.01, seg=1))
    P.append(box((.35, .012, .8), (0, -.19, 1.65), "glow", bevel=.005, seg=1))
    for k in range(3):
        P.append(box((.26, .01, .03), (0, -.196, 1.82 - k * .1), "accent2", seg=1))
    for i in range(4):
        x = -.13 + i * .087
        P.append(box((.06, .03, .1), (x, -.185, .98), "deep", bevel=.01, seg=1))
        P.append(box((.03, .01, .04), (x, -.2, .98), "glow", seg=1))
        P.append(sph((.03, .02, .03), (x, -.2, .86), "accent2", n=6, rings=4))
    P.append(box((.54, .5, .05), (0, 0, 2.28), "accent", rot=(.1, 0, 0), bevel=.012, seg=1))
    for k in range(3):
        P.append(box((.16, .44, .012), (-.17 + k * .17, 0, 2.31), "deep", rot=(.1, 0, 0), seg=1))
    P.append(box((.5, .02, .12), (0, -.17, 1.12), "accent2", bevel=.008, seg=1))
    return P


@piece("bike_share_dock", "forest", "calcada", collider=("box", [3.3, 1.2, .8], [0, .6, 0]),
       note="estacao de bike compartilhada: 4 baias com 3 bicicletas verdes e totem de pagamento")
def piece_bike_share_dock():
    P = []
    P.append(box((3.4, .5, .04), (0, 0, .02), "deep", bevel=.01, seg=1))
    # totem
    P.append(box((.34, .26, 1.5), (-1.45, 0, .8), "base", bevel=.04, seg=2))
    P.append(box((.24, .02, .3), (-1.45, -.14, 1.18), "glow", bevel=.005, seg=1))
    P.append(box((.4, .3, .1), (-1.45, 0, 1.58), "accent2", bevel=.03))
    for k in range(4):
        x = -.65 + k * .62
        P.append(box((.1, .08, .62), (x, .06, .35), "trim", bevel=.02, seg=1))
        P.append(box((.14, .1, .06), (x, .06, .66), "accent2", bevel=.02, seg=1))
        P.append(sph((.04, .02, .04), (x, -.0, .5), "glow", n=6, rings=4))
        if k != 2:
            # bicicleta (ao longo de Y), um pouco de lado
            for yy, rr in ((-.5, .3), (.5, .3)):
                P += wheel(x, yy, rr, rr, "deep", "trim", "trim", 4, plane="yz", tire=.035)
            P.append(tube([Vector((x, -.5, .3)), Vector((x, -.1, .55)), Vector((x, .08, .62))], .022, "base", minor=5))
            P.append(tube([Vector((x, .08, .62)), Vector((x, .5, .3)), Vector((x, -.1, .3)), Vector((x, -.1, .55))], .02, "base", minor=5))
            P.append(tube([Vector((x, -.5, .3)), Vector((x, -.48, .72)), Vector((x, -.5, .86))], .018, "base", minor=5))
            P.append(box((.4, .03, .03), (x, -.5, .88), "deep", bevel=.01, seg=1))
            P.append(box((.14, .2, .05), (x, .1, .7), "deep", bevel=.015, seg=1))
            P.append(box((.26, .22, .16), (x, -.62, .62), "accent2", bevel=.02, seg=1))
    return P


@piece("atm_unit", "char", "calcada", collider=("box", [1.0, 2.2, .5], [0, 1.1, -.2]),
       note="caixa eletronico embutido em parede (costas em y=0): moldura, tela, teclado, fenda e luz verde")
def piece_atm_unit():
    P = []
    P.append(box((1.0, .24, 2.2), (0, -.12, 1.1), "base", bevel=.03, seg=2))
    P.append(box((.84, .06, .52), (0, -.255, 1.62), "deep", bevel=.015, seg=1))
    P.append(box((.74, .02, .42), (0, -.292, 1.62), "glow", bevel=.006, seg=1))
    P.append(box((.84, .26, .08), (0, -.2, 1.15), "deep", rot=(.35, 0, 0), bevel=.015, seg=1))
    for r in range(3):
        for c in range(3):
            P.append(box((.065, .015, .045), (-.1 + c * .1, -.285 + r * -.015, 1.17 - r * .005 - 0 + (2 - r) * .0), "white", bevel=.005, seg=1))
    P.append(box((.3, .03, .05), (.05, -.27, .98), "deep", bevel=.01, seg=1))
    P.append(box((.26, .01, .014), (.05, -.288, .98), "glow", seg=1))
    P.append(box((.3, .03, .08), (.05, -.27, .84), "deep", bevel=.01, seg=1))
    P.append(box((.84, .06, .2), (0, -.27, 2.0), "accent2", bevel=.02, seg=1))
    P.append(box((.6, .01, .1), (0, -.304, 2.0), "white", seg=1))
    P.append(sph((.04, .02, .04), (.38, -.275, .98), "glow", n=6, rings=4))
    P.append(box((1.08, .3, .06), (0, -.15, 2.23), "trim", bevel=.02, seg=1))
    return P


@piece("post_box_pillar", "post_red", "calcada", collider=("cylinder", [.3, 1.5], [0, .75, 0]),
       note="caixa de correio de coluna (vermelha ou azul pela paleta) com fenda, brasao e tampa")
def piece_post_box_pillar():
    P = []
    P.append(cyl(.28, .1, (0, 0, .05), "deep", n=20, bevel=.02))
    P.append(lathe([(0, .08), (.24, .08), (.25, .2), (.235, 1.2), (.26, 1.28), (.26, 1.42), (.2, 1.52), (0, 1.56)], "base", n=24, smooth=1))
    P.append(tube(circ(0, 0, 1.3, .262, 24, "xy"), .015, "trim", minor=5, closed=True))
    P.append(box((.34, .06, .05), (0, -.245, 1.12), "deep", bevel=.012, seg=1))
    P.append(box((.28, .01, .05), (0, -.248, .96), "accent2", seg=1))
    P.append(cyl(.075, .012, (0, -.25, .76), "accent2", rot=(pi / 2, 0, 0), n=10))
    P.append(sph(.03, (0, 0, 1.58), "trim", n=8, rings=5))
    return P


@piece("potted_olive", "olive", "calcada", collider=("cylinder", [.45, 2.0], [0, 1.0, 0]),
       note="oliveira em vaso de terracota (copa prateada de folhas), leve balanco do vento (folha)")
def piece_potted_olive():
    P = []
    P.append(lathe([(0, 0), (.26, 0), (.36, .08), (.4, .5), (.44, .56), (.44, .62), (.38, .62), (.36, .58), (0, .54)], "base", n=18, smooth=1))
    P.append(cyl(.38, .02, (0, 0, .6), "deep", n=16))
    P.append(tube(smooth3([(0, 0, .6), (.07, .03, 1.0), (-.06, -.02, 1.35), (.04, .0, 1.62)], 2), [.075, .065, .05, .035] * 3 if False else .055, "deep", minor=6))
    for a, (dx, dy, dz) in enumerate(((.3, 0, 1.35), (-.28, .1, 1.45), (.05, -.3, 1.5), (0, .28, 1.3))):
        P.append(tube([Vector((0, 0, 1.2)), Vector((dx * .6, dy * .6, 1.45)), Vector((dx, dy, dz + .2))], .022, "deep", minor=5))
    for (dx, dy, dz, rx) in ((0, 0, 1.85, .34), (.3, .05, 1.6, .28), (-.3, .1, 1.7, .28), (.05, -.3, 1.7, .26), (0, .3, 1.5, .26), (.02, .02, 1.45, .3)):
        P.append(sph((rx * 2, rx * 1.9, rx * 1.4), (dx, dy, dz), "leaf", n=8, rings=5))
    for k in range(6):
        a = k * 1.1
        P.append(sph(.025, (.3 * cos(a), .3 * sin(a), 1.62 + .12 * sin(k * 2)), "deep", n=5, rings=3))
    return P


@piece("topiary_planter", "gold", "calcada", collider=("box", [.9, 1.9, .9], [0, .95, 0]),
       note="jardineira dourada quadrada com topiaria espiral e duas esferas (Avenida da Moda)")
def piece_topiary_planter():
    P = []
    P.append(box((.9, .9, .6), (0, 0, .3), "base", bevel=.04, seg=2))
    P.append(box((.96, .96, .06), (0, 0, .63), "accent", bevel=.02, seg=1))
    P.append(box((.96, .96, .05), (0, 0, .03), "deep", bevel=.015, seg=1))
    for sx in (-1, 1):
        P.append(box((.03, .72, .34), (sx * .46, 0, .3), "accent", bevel=.01, seg=1))
        P.append(box((.72, .03, .34), (0, sx * .46, .3), "accent", bevel=.01, seg=1))
    P.append(cyl(.4, .03, (0, 0, .66), "deep", n=16))
    P.append(cyl(.03, .45, (0, 0, .9), "deep", n=8))
    # espiral
    for k in range(10):
        t = k / 9.0
        r = .3 * (1 - t) + .05
        a = k * 1.0
        P.append(sph((r * 2, r * 2, .22), (.04 * cos(a), .04 * sin(a), .92 + t * 1.15), "leaf", n=10, rings=5))
    for sx in (-.28, .28):
        P.append(sph((.3, .3, .3), (sx, .22 * (1 if sx > 0 else -1) * 0, 1.1), "leaf", n=10, rings=6))
        P.append(cyl(.012, .3, (sx, 0, .85), "deep", n=6))
    return P


@piece("cafe_rug", "rug", "calcada", walkable=True, note="tapete de entrada de cafe (2.4 x 1.5 m) com borda e franjas; rasteiro")
def piece_cafe_rug():
    P = []
    P.append(box((2.4, 1.5, .02), (0, 0, .01), "base", bevel=.006, seg=1))
    P.append(box((2.28, 1.38, .012), (0, 0, .02), "accent", seg=1))
    P.append(box((2.16, 1.26, .012), (0, 0, .028), "base", seg=1))
    P.append(box((.62, .62, .014), (0, 0, .036), "accent2", rot=(0, 0, pi / 4), bevel=.003, seg=1))
    P.append(box((.4, .4, .014), (0, 0, .044), "accent", rot=(0, 0, pi / 4), bevel=.003, seg=1))
    for sx in (-1, 1):
        for k in range(11):
            P.append(box((.02, .1, .01), (sx * 1.25, -.5 + k * .1, .008), "accent2", seg=1))
    return P


@piece("fruit_stand", "market", "feira", collider=("box", [2.2, 2.2, 1.0], [0, 1.1, 0]),
       note="barraca de frutas: mesa de madeira, caixotes de macas/laranjas/limoes, toldo listrado vermelho e creme")
def piece_fruit_stand():
    P = []
    for sx in (-1, 1):
        P.append(box((.08, .08, 2.3), (sx * 1.02, .35, 1.15), "seat", bevel=.015, seg=1))
        P.append(box((.08, .08, 1.7), (sx * 1.02, -.5, .85), "seat", bevel=.015, seg=1))
    P.append(box((2.2, .9, .08), (0, -.1, .8), "seat", bevel=.015, seg=1))
    P.append(box((2.2, .06, .5), (0, -.54, .55), "seat", bevel=.012, seg=1))
    P.append(box((2.1, .06, .5), (0, .3, .55), "seat", bevel=.012, seg=1))
    P += stripes(2.5, .95, (0, -.0, 2.0), 8, "accent", "base", .22, t=.04)
    P.append(box((2.5, .06, .06), (0, .46, 2.15), "deep", bevel=.015, seg=1))
    cols = ("accent", "accent2", "soft")
    for i, (cx, c) in enumerate(((-.7, "accent"), (0, "accent2"), (.7, "soft"))):
        P.append(box((.58, .5, .16), (cx, -.14, .9), "seat", bevel=.012, seg=1))
        for j in range(12):
            a = j * 2.399
            d = .22 * sqrt((j + .5) / 12)
            P.append(sph(.075, (cx + d * cos(a) * 1.1, -.14 + d * sin(a) * .95, 1.0 + (j % 3) * .035), c, n=7, rings=4))
    # sacos / cesta
    P.append(cyl(.2, .3, (1.4, -.2, .15), "seat", n=10, bevel=.02))
    for j in range(5):
        P.append(sph(.07, (1.4 + (j % 2) * .06 - .03, -.2 + (j // 2) * .05 - .04, .32), "accent", n=6, rings=4))
    # placa
    P.append(box((.9, .03, .26), (0, -.64, 1.0 + .35), "base", rot=(-.1, 0, 0), bevel=.01, seg=1))
    P.append(box((.7, .012, .06), (0, -.66, 1.38), "accent", rot=(-.1, 0, 0), seg=1))
    P.append(box((.4, .012, .04), (0, -.66, 1.3), "deep", rot=(-.1, 0, 0), seg=1))
    return P


@piece("flower_kiosk", "forest", "feira", collider=("box", [2.4, 2.6, 1.8], [0, 1.3, 0]),
       note="quiosque de flores verde-floresta: balcao, telhado inclinado, baldes laterais e placa dourada")
def piece_flower_kiosk():
    P = []
    P.append(box((2.4, 1.7, .12), (0, 0, .06), "deep", bevel=.02, seg=1))
    P.append(box((2.2, 1.5, 1.1), (0, .1, .66), "base", bevel=.05, seg=2))
    P.append(box((2.3, 1.6, .06), (0, .1, 1.24), "trim", bevel=.012, seg=1))
    for sx in (-1, 1):
        P.append(box((.1, .1, 1.5), (sx * 1.1, -.7, 1.8 - .5 + .15), "base", bevel=.02, seg=1))
    P.append(box((2.6, 2.0, .1), (0, -.05, 2.62 - .0 - .02), "accent", rot=(.12, 0, 0), bevel=.03, seg=2))
    P.append(box((2.6, .1, .22), (0, -1.02, 2.5), "trim", bevel=.03, seg=1))
    P.append(box((1.6, .04, .3), (0, -1.0, 2.2), "white", bevel=.01, seg=1))
    P.append(box((1.3, .015, .09), (0, -1.025, 2.22), "deep", seg=1))
    # balcao frontal aberto e flores
    P.append(box((2.0, .5, .05), (0, -.55, 1.0), "seat", bevel=.01, seg=1))
    for i in range(5):
        x = -.8 + i * .4
        P.append(lathe([(0, 0), (.1, 0), (.13, .22), (0, .2)], "base" if i % 2 else "accent", loc=(x, -.55, 1.03), n=10))
        P.append(sph((.2, .2, .12), (x, -.55, 1.28), "leaf", n=7, rings=4))
        blooms2(P, x, -.55, 1.33, .09, 5, [["accent2", "white", "soft", "accent"][i % 4], ["soft", "accent2"][i % 2]], r=.04, seed=i)
    for sx in (-1.5, 1.5):
        for k in range(2):
            P.append(lathe([(0, 0), (.12, 0), (.15, .3), (0, .28)], "deep", loc=(sx * (1 if k == 0 else .93) + (0 if k == 0 else .0), -.5 - k * .3, 0), n=10))
            blooms2(P, sx, -.5 - k * .3, .38, .1, 6, ["accent2", "soft", "white"], r=.045, seed=k)
    return P


@piece("hotdog_cart", "cartyel", "feira", collider=("box", [1.6, 2.4, 1.0], [0, 1.2, 0]),
       note="carrinho de cachorro-quente amarelo com guarda-sol listrado, chapa, garrafas de molho e 2 rodas")
def piece_hotdog_cart():
    P = []
    P.append(box((1.5, .8, .7), (0, 0, .75), "base", bevel=.08, seg=2))
    P.append(box((1.52, .82, .12), (0, 0, 1.1), "accent", bevel=.03, seg=1))
    P.append(box((1.2, .6, .02), (0, 0, 1.17), "trim", seg=1))
    P.append(box((1.2, .04, .24), (0, -.43, 1.22), "glass", rot=(-.3, 0, 0), bevel=.01, seg=1))
    for sx in (-1, 1):
        P += wheel(sx * .78, 0, .3, .3, "deep", "trim", "trim", 6, plane="yz", tire=.04)
    P.append(box((.1, .5, .12), (.0, .4, .4), "deep", seg=1))
    P.append(tube([Vector((-.75, .4, .6)), Vector((-1.0, .5, .55)), Vector((-1.1, .9, .5))], .025, "deep", minor=5))
    P.append(box((.5, .02, .3), (0, -.42, .78), "white", bevel=.008, seg=1))
    P.append(box((.4, .012, .06), (0, -.43, .85), "accent", seg=1))
    for k in range(4):
        P.append(cyl(.035, .1, (-.4 + k * .06, -.1, 1.23), "accent2" if k % 2 else "accent", n=8))
        P.append(cyl(.012, .06, (-.4 + k * .06, -.1, 1.31), "white", n=6))
    for k in range(3):
        P.append(cyl(.03, .26, (.2 + k * .12, .15, 1.3 + .0), "soft" if k else "accent2", rot=(0, pi / 2 + .0, 0), n=8))
    # guarda-sol
    P.append(cyl(.025, 1.45, (.0, .26, 1.9), "trim", n=8))
    for i in range(8):
        a0 = i * 2 * pi / 8
        a1 = (i + 1) * 2 * pi / 8
        P.append(prism([(0, 0), (1.15 * cos(a0), 1.15 * sin(a0)), (1.15 * cos(a1), 1.15 * sin(a1))], .02, "xy", "accent" if i % 2 else "base", loc=(0, .26, 2.52 - 0)))
    P.append(sph(.04, (0, .26, 2.66), "trim", n=6, rings=4))
    # topo conico: ajuste simples
    return P


@piece("coffee_cart", "wood", "feira", collider=("box", [1.0, 1.7, 2.4], [0, .85, 0]),
       note="bicicleta-cafe: carga frontal com balcao, maquina de espresso, quadro de menu e guarda-sol pequeno")
def piece_coffee_cart():
    P = []
    # bike traseira + caixa dianteira
    for yy in (.55, -.85):
        P += wheel(0, yy, .33, .33, "deep", "trim", "trim", 5, plane="yz", tire=.04)
    P.append(tube([Vector((0, .55, .33)), Vector((0, .2, .6)), Vector((0, -.15, .55))], .025, "deep", minor=5))
    P.append(tube([Vector((0, .2, .6)), Vector((0, .2, .98)), Vector((0, .3, 1.05))], .02, "deep", minor=5))
    P.append(box((.4, .03, .03), (0, .3, 1.08), "deep", bevel=.01, seg=1))
    P.append(box((.14, .26, .06), (0, .12, .96), "accent", bevel=.02, seg=1))
    P.append(box((.9, 1.0, .65), (0, -.6, .72), "seat", bevel=.04, seg=2))
    P.append(box((.94, 1.04, .06), (0, -.6, 1.08), "accent", bevel=.02, seg=1))
    P.append(box((.4, .3, .3), (.1, -.7, 1.26), "trim", bevel=.04, seg=2))
    P.append(box((.34, .02, .12), (.1, -.86, 1.3), "deep", seg=1))
    P.append(cyl(.04, .1, (.1, -.88, 1.15), "white", n=8))
    P.append(box((.24, .3, .02), (-.22, -.75, 1.1), "base", seg=1))
    for k in range(3):
        P.append(cyl(.035, .07, (-.25 + k * .08, -.7, 1.15), "white", n=8))
    P.append(box((.5, .03, .4), (0, -1.12, .72), "deep", bevel=.01, seg=1))
    for k in range(3):
        P.append(box((.34, .01, .03), (0, -1.14, .82 - k * .09), "white", seg=1))
    # guarda-sol
    P.append(cyl(.015, 1.2, (-.3, -.35, 1.6), "trim", n=6))
    for i in range(6):
        a0 = i * 2 * pi / 6
        a1 = (i + 1) * 2 * pi / 6
        P.append(prism([(0, 0), (.8 * cos(a0), .8 * sin(a0)), (.8 * cos(a1), .8 * sin(a1))], .02, "xy", "accent2" if i % 2 else "white", loc=(-.3, -.35, 2.18)))
    return P
