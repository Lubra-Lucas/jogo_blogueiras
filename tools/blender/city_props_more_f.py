"""Pecas (parte F, rodada 2): detalhes de fachada (lampada de parede, marquise, placa de porta, toldo, ar-condicionado), telhado
(ar-condicionado, caixa d'agua, antena, parabolica, jardim), bandeiras e faixas (cloth: balancam ao vento), outdoors/murais graficos
(sem marcas reais) e vitrines de luxo.  Pecas de PAREDE: costas em y=0 e a frente se projeta para -Y blender (+Z no jogo).
Convencao de TECIDO (bandeiras/faixas): pecas 'flag_*' e 'banner_*' tem malhas de pano nos slots accent/accent2/soft/white/seat (kit.tsx separa e
aplica o vento); base/deep/trim sao rigidos (poste)."""
from city_props_more_lib import *  # noqa
from city_props_more_e import blooms2  # noqa


# ====================================================================================================
# FACHADA
# ====================================================================================================
@piece("wall_lamp", "char", "fachada", note="arandela de parede com lanterna (glow quente), costas em y=0")
def piece_wall_lamp():
    P = []
    P.append(box((.1, .03, .22), (0, -.015, 0), "base", bevel=.01, seg=1))
    P.append(tube(smooth3([(0, -.03, 0), (0, -.14, .02), (0, -.2, .12)], 1), .018, "base", minor=5))
    P.append(cyl(.075, .03, (0, -.2, .1), "trim", n=10))
    P.append(lathe([(0, 0), (.07, .01), (.09, .1), (.06, .2), (0, .22)], "glow", loc=(0, -.2, .1), n=10, smooth=1))
    P.append(lathe([(0, .21), (.11, .19), (.12, .18), (.06, .29), (0, .31)], "base", loc=(0, -.2, .1), n=10))
    return P


@piece("door_canopy", "char", "fachada", note="marquise de vidro sobre a porta (2.4 x 1.0 m) com tirantes ate a parede")
def piece_door_canopy():
    P = []
    P.append(box((2.4, 1.0, .03), (0, -.5, 0), "glass", rot=(.12, 0, 0), bevel=.005, seg=1))
    P.append(box((2.44, .05, .06), (0, -1.0, -.03), "trim", bevel=.012, seg=1))
    for sx in (-1.2, 1.2):
        P.append(box((.05, 1.0, .05), (sx, -.5, -.01), "trim", rot=(.12, 0, 0), bevel=.01, seg=1))
    P.append(box((2.44, .06, .08), (0, -.03, .02), "trim", bevel=.012, seg=1))
    for sx in (-.9, .9):
        P.append(tube([Vector((sx, -.97, -.02)), Vector((sx, -.03, .85))], .012, "trim", minor=4))
        P.append(sph(.02, (sx, -.03, .85), "trim", n=5, rings=3))
    return P


def _plate(name, digits, pal):
    @piece(name, pal, "fachada", note="placa de porta: numero da casa, interfone com botoes e fenda de correio (costas em y=0)")
    def fn():
        P = []
        P.append(box((.34, .03, .92), (0, -.015, .46 - .46), "base", bevel=.01, seg=1))
        P.append(box((.26, .02, .2), (0, -.04, .3), "accent2", bevel=.008, seg=1))
        P.append(text3d(digits, .15, .012, (0, -.056, .3), "white", rot=(pi / 2, 0, 0)))
        P.append(box((.2, .025, .3), (0, -.04, -.0), "deep", bevel=.008, seg=1))
        for r in range(2):
            for c in range(2):
                P.append(cyl(.025, .012, (-.045 + c * .09, -.055, .08 - r * .1), "trim", rot=(pi / 2, 0, 0), n=8))
        P.append(box((.14, .01, .03), (0, -.055, .17), "glow", seg=1))
        P.append(box((.24, .02, .06), (0, -.04, -.26), "trim", bevel=.006, seg=1))
        P.append(box((.16, .01, .012), (0, -.052, -.26), "deep", seg=1))
        return P
    return fn


_plate("door_plate_12", "12", "luxo")
_plate("door_plate_7", "7", "char")


@piece("shop_awning", "carnival", "fachada", note="toldo de loja listrado (3.4 m) com babado, tirantes e haste; accent = cor da loja (override)")
def piece_shop_awning():
    P = []
    P += stripes(3.4, 1.1, (0, -.55, 0), 10, "accent", "base", .42, t=.04)
    P.append(box((3.5, .06, .06), (0, -.03, .04), "trim", bevel=.012, seg=1))
    for sx in (-1.6, 1.6):
        P.append(tube([Vector((sx, -.03, .04)), Vector((sx, -1.05, -.4))], .018, "trim", minor=4))
    return P


@piece("wall_ac_unit", "wall_tan", "fachada", note="ar-condicionado de parede (split externo) com grade e dreno")
def piece_wall_ac_unit():
    P = []
    for sx in (-.3, .3):
        P.append(box((.05, .35, .05), (sx, -.17, -.2), "deep", bevel=.01, seg=1))
    P.append(box((.8, .3, .55), (0, -.32, 0), "base", bevel=.04, seg=2))
    P.append(cyl(.2, .02, (-.1, -.485, 0), "deep", rot=(pi / 2, 0, 0), n=16))
    for k in range(5):
        P.append(box((.5, .012, .015), (-.1, -.495, -.12 + k * .06), "accent", seg=1))
    P.append(box((.08, .02, .4), (.3, -.49, 0), "accent", seg=1))
    P.append(tube(smooth3([(.3, -.2, -.28), (.3, -.2, -.55), (.34, -.12, -.8)], 1), .012, "deep", minor=4))
    return P


@piece("rooftop_ac_pair", "wall_tan", "telhado", collider=("box", [3.0, 1.1, 1.3], [0, .55, 0]),
       note="duas unidades condensadoras de telhado sobre plataforma com tubulacao")
def piece_rooftop_ac_pair():
    P = []
    P.append(box((3.0, 1.3, .12), (0, 0, .06), "deep", bevel=.02, seg=1))
    for sx in (-.75, .75):
        P.append(box((1.2, 1.0, .9), (sx, 0, .57), "base", bevel=.05, seg=2))
        P.append(cyl(.38, .03, (sx, 0, 1.03), "deep", n=18))
        for k in range(6):
            a = k * pi / 3
            P.append(box((.34, .05, .015), (sx + .17 * cos(a), .17 * sin(a), 1.05), "trim", rot=(0, 0, a), seg=1))
        P.append(box((1.22, .02, .5), (sx, -.505, .55), "accent", seg=1))
    P.append(tube([Vector((-.75, .5, .4)), Vector((-.75, .75, .4)), Vector((.75, .75, .4)), Vector((.75, .5, .4))], .04, "trim", minor=5))
    return P


@piece("rooftop_water_tank", "wood", "telhado", collider=("cylinder", [1.1, 4.0], [0, 2.0, 0]),
       note="caixa d'agua de madeira sobre estrutura de aco com escada e teto conico")
def piece_rooftop_water_tank():
    P = []
    for k in range(4):
        a = k * pi / 2 + pi / 4
        x, y = .9 * cos(a), .9 * sin(a)
        P.append(tube([Vector((x * 1.2, y * 1.2, 0)), Vector((x, y, 1.4))], .05, "deep", minor=6))
    P.append(tube(circ(0, 0, .7, 1.0, 14, "xy"), .03, "deep", minor=4, closed=True))
    P.append(cyl(1.0, .1, (0, 0, 1.45), "deep", n=18, bevel=.02))
    P.append(cyl(.95, 1.6, (0, 0, 2.3), "base", n=18, bevel=.01))
    for k in range(3):
        P.append(tube(circ(0, 0, 1.75 + k * .55, .975, 18, "xy"), .028, "trim", minor=5, closed=True))
    P.append(lathe([(0, 3.1), (1.08, 3.1), (.7, 3.45), (0, 3.9)], "accent", n=18))
    P.append(cyl(.18, .1, (0, 0, 3.92), "deep", n=8))
    P.append(box((.06, .06, 3.0), (1.03, 0, 1.5), "trim", bevel=.01, seg=1))
    P.append(box((.06, .06, 3.0), (1.03, .4, 1.5), "trim", bevel=.01, seg=1))
    for k in range(10):
        P.append(box((.05, .4, .04), (1.03, .2, .3 + k * .28), "trim", seg=1))
    return P


@piece("rooftop_dish", "wall_tan", "telhado", note="antena parabolica de telhado (prato branco, braco e LNB)")
def piece_rooftop_dish():
    P = []
    P.append(box((.5, .5, .06), (0, 0, .03), "deep", bevel=.01, seg=1))
    P.append(cyl(.06, .8, (0, 0, .45), "trim", n=8))
    P.append(lathe([(0, 0), (.28, .02), (.55, .1), (.56, .12), (.53, .12), (.27, .05), (0, .03)], "base", loc=(0, -.12, .98), rot=(pi / 2 + .2, 0, 0), n=18))
    P.append(tube([Vector((0, -.14, .98)), Vector((0, -.4, 1.05)), Vector((0, -.55, 1.25))], .014, "trim", minor=4))
    P.append(cyl(.035, .1, (0, -.55, 1.25), "deep", rot=(pi / 2, 0, 0), n=8))
    return P


@piece("rooftop_antenna", "char", "telhado", note="mastro de antena TV (yagi) com cabos de estai")
def piece_rooftop_antenna():
    P = []
    P.append(box((.5, .5, .06), (0, 0, .03), "deep", bevel=.01, seg=1))
    P.append(cyl(.03, 3.0, (0, 0, 1.5), "trim", n=8))
    for z, L in ((2.2, .9), (2.55, .75), (2.85, .6), (3.0, .45)):
        P.append(cyl(.012, L, (0, 0, z), "trim", rot=(0, pi / 2, 0), n=6))
    P.append(cyl(.012, 1.1, (0, .0, 2.6), "trim", rot=(pi / 2, 0, 0), n=6))
    for a in range(3):
        t = a * 2 * pi / 3 + .5
        P.append(tube([Vector((0, 0, 2.1)), Vector((.9 * cos(t), .9 * sin(t), .0))], .005, "deep", minor=3, caps=False))
    P.append(box((.2, .2, .3), (0, 0, 2.12), "deep", bevel=.02, seg=1))
    return P


@piece("rooftop_garden", "garden", "telhado", collider=("box", [5.0, 1.6, 3.0], [0, .8, 0]),
       note="jardim de cobertura: deck, canteiros, mini arvores, banco e estrutura de pergola (5 x 3 m)")
def piece_rooftop_garden():
    P = []
    P.append(box((5.0, 3.0, .08), (0, 0, .04), "seat", bevel=.01, seg=1))
    for sx in (-1.9, 1.9):
        P.append(box((.8, 2.6, .35), (sx, 0, .26), "accent", bevel=.03, seg=1))
        P.append(box((.7, 2.5, .05), (sx, 0, .45), "deep", seg=1))
        for k in range(4):
            P.append(sph((.5, .5, .45), (sx + (k % 2 - .5) * .2, -.9 + k * .6, .62), "leaf", n=8, rings=5))
            blooms2(P, sx + (k % 2 - .5) * .2, -.9 + k * .6, .8, .2, 4, ["accent2", "soft", "white"], r=.035, seed=k)
    P.append(cyl(.1, 1.1, (0, 0, .6), "deep", n=8))
    P.append(sph((1.0, 1.0, .9), (0, 0, 1.45), "leaf", n=10, rings=6))
    P.append(sph((.7, .7, .6), (.3, .2, 1.9), "leaf", n=8, rings=5))
    for sx in (-.9, .9):
        P.append(box((.06, .06, 2.2), (sx, -1.2, 1.2), "base", bevel=.01, seg=1))
    P.append(box((2.0, .08, .08), (0, -1.2, 2.3), "base", bevel=.01, seg=1))
    for k in range(5):
        P.append(box((.05, .8, .05), (-.8 + k * .4, -1.0, 2.34), "base", bevel=.008, seg=1))
    P.append(box((1.2, .35, .06), (0, -1.15, .45), "seat", bevel=.01, seg=1))
    for sx in (-.5, .5):
        P.append(box((.05, .3, .38), (sx, -1.15, .22), "deep", seg=1))
    return P


# ====================================================================================================
# BANDEIRAS E FAIXAS (pano: balancam ao vento)
# ====================================================================================================
def _cloth(x0, z0, w, h, bands, n=6, sag=.0, y0=0.0):
    """pano plano na direcao +X a partir de x0, n tiras verticais; bands = lista de slots por faixa horizontal."""
    P = []
    sw = w / n
    bh = h / len(bands)
    for i in range(n):
        for j, m in enumerate(bands):
            y = y0 - sin(i * .55) * .035 * sag
            P.append(box((sw * 1.02, .012, bh * 1.01), (x0 + sw * (i + .5), y, z0 + h - bh * (j + .5)), m, seg=1))
    return P


@piece("flag_wall", "navy", "fachada", note="bandeira de parede (mastro inclinado, pano tricolor generico); pano = accent/accent2/white, vento")
def piece_flag_wall():
    P = []
    P.append(box((.14, .08, .14), (0, -.04, -.12), "trim", bevel=.015, seg=1))
    P.append(tube([Vector((0, -.06, -.12)), Vector((.12, -.2, -.05)), Vector((.62, -.2, .82))], .026, "trim", minor=5))
    P.append(sph(.04, (.64, -.2, .85), "trim", n=6, rings=4))
    P += _cloth(.52, -.02, 1.35, .8, ["accent", "white", "accent2"], n=6, sag=1, y0=-.2)
    return P


@piece("flag_roof", "char", "telhado", collider=("cylinder", [.12, 6.0], [0, 3.0, 0]), note="mastro de bandeira de telhado (6 m) com pano")
def piece_flag_roof():
    P = []
    P.append(cyl(.14, .1, (0, 0, .05), "base", n=10))
    P.append(lathe([(0, 0), (.04, .02), (.028, 5.8), (0, 5.84)], "trim", n=8))
    P.append(sph(.06, (0, 0, 5.9), "trim", n=8, rings=5))
    n0 = len(P)
    P += _cloth(.03, 4.7, 1.6, 1.05, ["accent", "white", "accent2"], n=7, sag=1)
    return P


@piece("banner_arm", "char", "poste", note="faixa vertical pendurada em poste de rua (braco em T, pano 0.7 x 2.0 m); gira em Z; origem = eixo do poste; vento")
def piece_banner_arm():
    P = []
    P.append(cyl(.095, .08, (0, 0, 3.55), "trim", n=10))
    P.append(box((.08, .08, .08), (0, 0, 3.55), "trim", seg=1))
    P.append(box((.9, .05, .05), (.0, -.14, 3.5), "trim", bevel=.012, seg=1))
    P.append(tube([Vector((0, -.05, 3.5)), Vector((0, -.14, 3.5))], .02, "trim", minor=4))
    P.append(box((.05, .05, .05), (-.43, -.14, 3.5), "trim", seg=1))
    for i in range(3):
        for j, m in enumerate(("accent", "soft", "accent", "white", "accent2", "accent")):
            P.append(box((.24, .012, .33), (-.24 + i * .24 + .0, -.17, 3.4 - .165 - j * .33), m, seg=1))
    return P


# ====================================================================================================
# OUTDOORS (graficos gerados: sem marcas reais) E MURAIS
# ====================================================================================================
def _lightbox(name, builder, note):
    @piece(name, "ad", "fachada", note=note + "; costas em y=0; 2.4 x 3.4 m com luz de fundo")
    def fn():
        P = []
        P.append(box((2.5, .22, 3.5), (0, -.11, 0), "deep", bevel=.03, seg=1))
        P.append(box((2.3, .02, 3.3), (0, -.225, 0), "glow", seg=1))
        P += builder()
        return P
    return fn


def _ad_dress():
    P = []
    # fundo suave + silhueta de vestido (corpete + saia evasê) + cabide
    P.append(box((2.3, .01, 3.3), (0, -.24, 0), "soft", seg=1))
    P.append(prism([(-.12, .75), (.12, .75), (.2, .35), (-.2, .35)], .02, "xz", "accent2", loc=(0, -.26, .0)))
    P.append(prism([(-.2, .35), (.2, .35), (.78, -1.05), (-.78, -1.05)], .02, "xz", "accent2", loc=(0, -.27, 0)))
    P.append(prism([(-.78, -1.05), (.78, -1.05), (.7, -1.15), (-.7, -1.15)], .02, "xz", "deep", loc=(0, -.28, 0)))
    P.append(tube(circ(0, -.28, 1.0, .13, 12, "xz"), .012, "white", minor=4, closed=True))
    P.append(tube([Vector((0, -.28, .87)), Vector((-.25, -.28, .78)), Vector((.25, -.28, .78)), Vector((0, -.28, .87))], .012, "white", minor=4))
    P.append(box((1.6, .012, .08), (0, -.24, -1.45), "accent", seg=1))
    P.append(box((1.0, .012, .05), (0, -.24, -1.58), "deep", seg=1))
    return P


def _ad_sun():
    P = []
    P.append(box((2.3, .01, 3.3), (0, -.24, 0), "base", seg=1))
    for k, (r, m) in enumerate(((1.0, "accent"), (.76, "soft"), (.52, "accent2"))):
        P.append(cyl(r, .014, (0, -.255 - k * .012, .4), m, rot=(pi / 2, 0, 0), n=28))
    for k in range(4):
        P.append(box((2.3, .012, .1), (0, -.24, -.8 - k * .24), "accent" if k % 2 else "deep", seg=1))
    P.append(box((1.2, .012, .07), (0, -.24, -1.55), "deep", seg=1))
    return P


def _ad_lines():
    P = []
    P.append(box((2.3, .01, 3.3), (0, -.24, 0), "deep", seg=1))
    P.append(cyl(.72, .014, (0, -.255, .55), "soft", rot=(pi / 2, 0, 0), n=26))
    P.append(box((.36, .014, 1.2), (0, -.27, .0), "accent2", bevel=.01, seg=1))
    P.append(box((.3, .014, .7), (0, -.285, .95), "white", bevel=.01, seg=1))
    P.append(prism([(-.15, 0), (.15, 0), (.1, .5), (-.1, .45)], .014, "xz", "accent2", loc=(0, -.29, 1.15)))
    P.append(box((1.5, .012, .09), (0, -.24, -1.2), "white", seg=1))
    P.append(box((.9, .012, .05), (0, -.24, -1.36), "soft", seg=1))
    return P


_lightbox("ad_dress", _ad_dress, "outdoor de parede: silhueta de vestido (graficos genericos)")
_lightbox("ad_sun", _ad_sun, "outdoor de parede: sol e faixas")
_lightbox("ad_lines", _ad_lines, "outdoor de parede: batom e circulo")


def _mural(name, builder, note):
    @piece(name, "mural", "fachada", note=note + "; painel de parede 3.6 x 2.4 m, costas em y=0")
    def fn():
        P = [box((3.6, .03, 2.4), (0, -.015, 0), "base", seg=1)]
        P += builder()
        return P
    return fn


def _mural_arches():
    P = []
    for k, (x, m) in enumerate(((-1.1, "accent"), (0, "soft"), (1.1, "accent2"))):
        h = 1.7 - (k % 2) * .3
        P.append(box((.8, .012, h), (x, -.04, -1.2 + h / 2), m, seg=1))
        P.append(cyl(.4, .012, (x, -.04, -1.2 + h), m, rot=(pi / 2, 0, 0), n=18))
        P.append(box((.5, .012, h * .6), (x, -.05, -1.2 + h * .3), "base", seg=1))
        P.append(cyl(.25, .012, (x, -.05, -1.2 + h * .6), "base", rot=(pi / 2, 0, 0), n=14))
    P.append(box((3.6, .012, .1), (0, -.04, -1.15), "deep", seg=1))
    return P


def _mural_sunset():
    P = []
    P.append(box((3.6, .012, 1.0), (0, -.04, -.7), "accent2", seg=1))
    P.append(cyl(.9, .012, (0, -.05, -.2), "soft", rot=(pi / 2, 0, 0), n=28))
    P.append(box((3.6, .012, .9), (0, -.06, -.75), "deep", seg=1))
    for k in range(4):
        P.append(box((3.6, .012, .08), (0, -.07, -.4 - k * .2), "accent" if k % 2 else "accent2", seg=1))
    P.append(box((3.6, .012, .08), (0, -.05, .1), "accent", seg=1))
    return P


def _mural_leaves():
    P = []
    P.append(box((3.6, .012, 2.4), (0, -.04, 0), "deep", seg=1))
    for k in range(7):
        x = -1.5 + k * .5
        h = .9 + (k % 3) * .35
        P.append(sph((.5, .014, h), (x, -.05, -1.0 + h / 2), ["soft", "accent", "base", "accent2"][k % 4], n=10, rings=6))
        P.append(box((.025, .012, h * .9), (x, -.06, -1.0 + h * .45), "deep", seg=1))
    return P


_mural("mural_arches", _mural_arches, "mural de arcos terracota/azul/ocre")
_mural("mural_sunset", _mural_sunset, "mural de por do sol e faixas")
_mural("mural_leaves", _mural_leaves, "mural de folhas graficas")


# ====================================================================================================
# VITRINES DE LUXO (nicho com vidro; costas em y=0)
# ====================================================================================================
def _window_frame(w=2.8, h=2.5, d=.6):
    P = []
    P.append(box((w, .04, h), (0, -.02, h / 2), "deep", seg=1))
    P.append(box((w - .1, .02, h - .1), (0, -.05, h / 2), "deep", seg=1))
    P.append(box((w + .2, d, .12), (0, -d / 2, .06), "trim", bevel=.02, seg=1))
    P.append(box((w + .2, d, .12), (0, -d / 2, h + .06), "trim", bevel=.02, seg=1))
    for sx in (-1, 1):
        P.append(box((.1, d, h), (sx * (w / 2 + .05), -d / 2, h / 2), "trim", bevel=.02, seg=1))
    P.append(box((w - .2, d - .1, .06), (0, -d / 2, .18), "white", bevel=.01, seg=1))
    P.append(box((w - .3, .12, .04), (0, -d * .5, h - .12), "glow", seg=1))
    return P


def _mannequin(x, y, z, pal_skirt="accent2"):
    P = []
    P.append(cyl(.015, .8, (x, y, z + .4), "trim", n=6))
    P.append(cyl(.18, .03, (x, y, z + .015), "trim", n=14))
    P.append(lathe([(0, 0), (.12, 0), (.28, .05), (.3, .55), (.12, .8), (.1, 1.0), (0, 1.02)], pal_skirt, loc=(x, y, z + .06), n=14, smooth=1))
    P.append(lathe([(0, 0), (.06, 0), (.045, .12), (0, .13)], "white", loc=(x, y, z + 1.04), n=8))
    P.append(sph((.17, .19, .22), (x, y, z + 1.3), "white", n=10, rings=6))
    return P


@piece("window_display_dress", "luxo", "vitrine", note="vitrine de luxo: dois manequins com vestidos, moldura dourada e luz; costas em y=0 (2.8 x 2.5 m, 0.6 de profundidade)")
def piece_window_display_dress():
    P = _window_frame()
    P += _mannequin(-.55, -.25, .2, "accent2")
    P += _mannequin(.6, -.28, .2, "deep")
    P.append(cyl(.45, .1, (-.55, -.25, .15), "white", n=16, bevel=.01))
    P.append(cyl(.45, .1, (.6, -.28, .15), "white", n=16, bevel=.01))
    return P


@piece("window_display_bags", "luxo", "vitrine", note="vitrine: bolsas em pedestais de alturas diferentes; 2.8 x 2.5 m")
def piece_window_display_bags():
    P = _window_frame()
    for k, (x, h, m) in enumerate(((-.8, .5, "accent2"), (0, .9, "deep"), (.8, .65, "accent"))):
        P.append(cyl(.28, h, (x, -.3, .12 + h / 2), "white", n=14, bevel=.015))
        P.append(box((.36, .16, .24), (x, -.3, .12 + h + .12), m, bevel=.04, seg=2))
        P.append(tube(smooth3([(x - .1, -.3, .12 + h + .23), (x, -.3, .12 + h + .42), (x + .1, -.3, .12 + h + .23)], 1), .012, "trim", minor=4))
        P.append(box((.08, .01, .04), (x, -.385, .12 + h + .16), "trim", seg=1))
    return P


@piece("window_display_shoes", "luxo", "vitrine", note="vitrine: pirâmide de sapatos de salto em prateleiras; 2.8 x 2.5 m")
def piece_window_display_shoes():
    P = _window_frame()
    for ti, (z, n) in enumerate(((.45, 5), (1.05, 4), (1.65, 3))):
        P.append(box((2.2 - ti * .5, .38, .05), (0, -.3, z), "white", bevel=.01, seg=1))
        for i in range(n):
            x = (i - (n - 1) / 2) * .4
            m = ["accent2", "deep", "accent", "soft"][(i + ti) % 4]
            P.append(sph((.3, .1, .09), (x, -.3, z + .08), m, n=8, rings=5))
            P.append(box((.1, .09, .1), (x - .12, -.3, z + .12), m, bevel=.02, seg=1))
            P.append(box((.02, .03, .12), (x - .13, -.3, z + .06), "trim", seg=1))
            P.append(box((.14, .08, .02), (x + .08, -.3, z + .055), "deep", seg=1))
    return P
