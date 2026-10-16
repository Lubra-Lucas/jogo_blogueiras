"""Pecas (parte B): veiculos, food trucks, carrinhos, guarda-sol, bistro, banca, floreira, luzinhas, outdoor, letreiro, quiosque."""
from city_props_more_lib import *  # noqa


# ====================================================================================================
# VEICULOS
# ====================================================================================================
def car_parts(L, W, Hb, cab_l, cab_h, cab_y, wr=.31, open_top=False, nose=0.0):
    P = []
    zb = wr * .72  # base do corpo
    P.append(box((W, L, Hb), (0, 0, zb + Hb / 2), "base", bevel=min(.24, Hb * .42), seg=3))
    zc = zb + Hb - .06
    if not open_top:
        P.append(box((W * .9, cab_l, cab_h), (0, cab_y, zc + cab_h / 2), "base", bevel=.2, seg=3))
        P.append(box((W * .88 + .05, cab_l * .66, cab_h * .52), (0, cab_y + .02, zc + cab_h * .5), "glass", bevel=.02, seg=1))
        P.append(box((W * .76, cab_l + .05, cab_h * .5), (0, cab_y, zc + cab_h * .5), "glass", bevel=.02, seg=1))
        P.append(box((W * .86, cab_l * .92, .06), (0, cab_y, zc + cab_h + .0), "accent", bevel=.03, seg=2))
    else:
        # conversivel: para-brisa baixo + bancos + painel
        P.append(box((W * .86, .07, .34), (0, cab_y - cab_l * .42, zc + .2), "glass", bevel=.015, seg=1, rot=(-.35, 0, 0)))
        P.append(box((W * .9, .06, .06), (0, cab_y - cab_l * .42 - .06, zc + .02), "trim", bevel=.02, seg=1))
        P.append(box((W * .9, .5, .08), (0, cab_y - cab_l * .38, zc - .02), "deep", bevel=.03, seg=2))
        for sx in (-1, 1):
            P.append(box((.5, .5, .2), (sx * W * .22, cab_y + .05, zc - .08), "seat", bevel=.07, seg=2))
            P.append(box((.5, .12, .4), (sx * W * .22, cab_y + .32, zc + .08), "seat", bevel=.06, seg=2, rot=(.15, 0, 0)))
        P.append(box((W * .92, .55, .05), (0, L / 2 - .45, zc - .0), "base", bevel=.02, seg=1))
        P.append(cylX(.17, W * .8, (0, cab_y + cab_l * .5, zc + .12), "base", n=14, b=.03))
    # rodas
    for sx in (-1, 1):
        for sy in (-1, 1):
            x = sx * (W / 2 - .06)
            y = sy * (L / 2 - .66 + nose * (1 if sy < 0 else 0))
            P.append(cylX(wr, .22, (x, y, wr), "deep", n=16, b=.05))
            P.append(cylX(wr * .58, .235, (x + sx * .005, y, wr), "trim", n=12, b=.02))
            P.append(cylX(wr * .22, .25, (x + sx * .01, y, wr), "deep", n=8))
    # farois / lanternas / para-choques / grade / placas
    for sx in (-1, 1):
        P.append(sph((.14, .07, .14), (sx * (W / 2 - .3), -L / 2 + .02, zb + Hb * .6), "glow", n=10, rings=6))
        P.append(box((.16, .05, .1), (sx * (W / 2 - .22), L / 2 - .01, zb + Hb * .62), "accent2", bevel=.02, seg=1))
        P.append(box((.09, .12, .08), (sx * (W / 2 + .06), -cab_l * .0 + cab_y - cab_l * .34, zc + .12), "base", bevel=.03, seg=1))
    P.append(box((W + .03, .13, .14), (0, -L / 2 - .01, zb + .1), "trim", bevel=.05, seg=2))
    P.append(box((W + .03, .13, .14), (0, L / 2 + .01, zb + .1), "trim", bevel=.05, seg=2))
    P.append(box((.6, .04, .16), (0, -L / 2 - .01, zb + Hb * .52), "deep", bevel=.02, seg=1))
    P.append(box((.44, .03, .12), (0, -L / 2 - .075, zb + .12), "white", bevel=.01, seg=1))
    P.append(box((.44, .03, .12), (0, L / 2 + .075, zb + .16), "white", bevel=.01, seg=1))
    for sx in (-1, 1):
        for sy in (-.2, .55):
            P.append(box((.012, .02, Hb * .62), (sx * (W / 2 + .003), cab_y + sy * .5, zb + Hb * .5), "deep", seg=1))
    return P


@piece("car_hatch", "car_red", "veiculo", collider=("box", [1.7, 1.4, 3.6], [0, .7, 0]),
       note="hatch compacto fofo (3.5 m); 8 paletas via palette: car_*")
def piece_car_hatch():
    return car_parts(3.5, 1.62, .78, 1.9, .62, .12)


@piece("car_sedan", "car_navy", "veiculo", collider=("box", [1.85, 1.4, 4.5], [0, .7, 0]), note="sedan arredondado (4.4 m)")
def piece_car_sedan():
    return car_parts(4.4, 1.76, .74, 2.05, .6, .28, nose=-.05)


@piece("car_suv", "car_green", "veiculo", collider=("box", [1.95, 1.7, 4.5], [0, .85, 0]), note="SUV/perua compacta (4.3 m)")
def piece_car_suv():
    P = car_parts(4.3, 1.84, .92, 2.85, .72, .35)
    P.append(box((1.3, 2.0, .05), (0, .4, 1.84), "trim", bevel=.015, seg=1))
    for sx in (-.55, .55):
        P.append(cylY(.018, 2.0, (sx, .4, 1.88), "trim", n=6))
    return P


@piece("car_convertible", "car_black", "veiculo", collider=("box", [1.95, 1.3, 4.8], [0, .65, 0]),
       note="conversivel de luxo (4.7 m) para a Avenida da Moda")
def piece_car_convertible():
    P = car_parts(4.7, 1.86, .7, 2.0, .5, .2, open_top=True, nose=-.1)
    P.append(box((.9, .05, .4), (0, -2.35 + .5, .98), "trim", bevel=.02, seg=1) if False else box((.3, .03, .16), (0, -2.37, .72), "trim", bevel=.012, seg=1))
    return P


@piece("scooter_moto", "car_cream", "veiculo", collider=("box", [.7, 1.2, 1.7], [0, .6, 0]), note="scooter/vespa fofa estacionada")
def piece_scooter_moto():
    P = []
    wr = .26
    for y in (-.68, .62):
        P.append(cylX(wr, .13, (0, y, wr), "deep", n=16, b=.04))
        P.append(cylX(wr * .55, .14, (0, y, wr), "trim", n=10, b=.015))
    P.append(box((.4, .9, .08), (0, -.1, .3), "base", bevel=.035, seg=2))
    P.append(sph((.5, .9, .56), (0, .42, .56), "base", n=14, rings=8))
    P.append(box((.34, .62, .1), (0, .38, .9), "seat", bevel=.04, seg=2))
    P.append(box((.44, .12, .86), (0, -.45, .66), "base", bevel=.045, seg=2, rot=(.28, 0, 0)))
    P.append(box((.1, .1, .6), (0, -.58, .62), "trim", bevel=.025, seg=1, rot=(.2, 0, 0)))
    P.append(cylX(.014, .72, (0, -.62, 1.0), "trim", n=6))
    for sx in (-1, 1):
        P.append(cylX(.025, .12, (sx * .4, -.62, 1.0), "deep", n=8))
        P.append(cyl(.012, .15, (sx * .35, -.6, 1.12), "trim", n=5))
        P.append(sph((.07, .02, .05), (sx * .35, -.6, 1.2), "glass", n=6, rings=4))
    P.append(sph((.1, .06, .1), (0, -.7, .94), "glow", n=8, rings=5))
    P.append(box((.38, .24, .36), (0, -.62, .85), "base", bevel=.05, seg=2) if False else box((.3, .1, .2), (0, -.55, 1.08), "base", bevel=.04, seg=2))
    P.append(box((.34, .1, .14), (0, 1.0, .5), "accent2", bevel=.03, seg=1) if False else box((.1, .02, .06), (0, .88, .62), "accent2", seg=1))
    P.append(cylY(.04, .5, (.14, .72, .28), "trim", n=8))
    P.append(box((.05, .24, .02), (0, 0, .015), "deep", seg=1) if False else box((.04, .1, .04), (.0, -.05, .3), "deep", seg=1))
    return P


@piece("kick_scooter", "bike_c", "veiculo", collider=("box", [.5, 1.1, 1.3], [0, .55, 0]), note="patinete eletrico (aluguel) encostado")
def piece_kick_scooter():
    P = []
    wr = .17
    for y in (-.55, .55):
        P.append(cylX(wr, .09, (0, y, wr), "deep", n=14, b=.03))
        P.append(cylX(wr * .55, .1, (0, y, wr), "trim", n=8))
    P.append(box((.2, 1.0, .06), (0, 0, .22), "base", bevel=.025, seg=2))
    P.append(box((.14, .34, .04), (0, .33, .255), "deep", bevel=.01, seg=1))
    P.append(tube([Vector((0, -.52, .2)), Vector((0, -.5, .65)), Vector((0, -.46, 1.08))], .022, "base", minor=6))
    P.append(cylX(.016, .46, (0, -.46, 1.1), "trim", n=6))
    for sx in (-1, 1):
        P.append(cylX(.025, .12, (sx * .24, -.46, 1.1), "deep", n=8))
    P.append(box((.1, .06, .09), (0, -.5, 1.0), "accent2", bevel=.02, seg=1))
    P.append(box((.1, .5, .08), (0, .55, .3), "base", bevel=.025, seg=1))
    P.append(box((.05, .02, .2), (.0, -.5, .5), "accent2", seg=1) if False else sph((.04, .015, .04), (0, -.45, .32), "glow", n=6, rings=4))
    return P


def bike_parts(frame="base", basket=True):
    P = []
    wr = .34
    for y in (-.56, .56):
        P += wheel(0, y, wr, wr, "deep", "trim", "trim", 6, plane="yz", tire=.03)
    for x in (-1, 1):
        P.append(tube([Vector((x * .001, -.56, wr)), Vector((x * .001, -.52, .75)), Vector((0, -.46, 1.0))], .016, "trim", minor=5))
    P.append(tube([Vector((0, .56, wr)), Vector((0, .06, .3)), Vector((0, -.12, .36))], .022, frame, minor=6))
    P.append(tube([Vector((0, .56, wr)), Vector((0, .2, .85)), Vector((0, -.34, .88))], .022, frame, minor=6))
    P.append(tube([Vector((0, .2, .85)), Vector((0, .06, .3))], .022, frame, minor=6))
    P.append(tube([Vector((0, -.34, .88)), Vector((0, -.12, .36))], .022, frame, minor=6))
    P.append(tube([Vector((0, -.34, .88)), Vector((0, -.5, .72))], .022, frame, minor=6))
    P.append(tube([Vector((0, .2, .85)), Vector((0, .22, 1.0))], .018, "trim", minor=5))
    P.append(sph((.14, .3, .07), (0, .2, 1.03), "seat", n=10, rings=6))
    P.append(tube([Vector((0, -.46, 1.0)), Vector((0, -.5, 1.08))], .018, "trim", minor=5))
    P.append(cylX(.014, .5, (0, -.5, 1.1), "trim", n=6))
    for sx in (-1, 1):
        P.append(cylX(.022, .1, (sx * .26, -.5, 1.1), "deep", n=8))
    P.append(cylX(.04, .02, (0, .0, .32), "trim", n=8))
    P.append(box((.28, .1, .03), (0, -.72, .22), "base", bevel=.01, seg=1) if False else box((.11, .24, .014), (0, .56, .72), frame, bevel=.005, seg=1))
    P.append(sph((.04, .03, .04), (0, -.56, .96), "glow", n=6, rings=4))
    if basket:
        P.append(box((.34, .34, .22), (0, -.68, 1.0), "seat", bevel=.025, seg=1))
        P.append(box((.3, .3, .02), (0, -.68, 1.1), "leaf", bevel=.01, seg=1))
        for k in range(3):
            P.append(sph(.045, (-.08 + k * .08, -.68 + (k % 2) * .04, 1.14), ["accent2", "white", "soft"][k], n=6, rings=4))
    P.append(box((.1, .34, .03), (0, .58, .05), "trim", bevel=.01, seg=1) if False else tube([Vector((.0, .0, .0)), Vector((.0, .0, .0))], .001, "trim", minor=3, caps=False) if False else cylY(.01, .3, (.12, .1, .08), "trim", n=5))
    return P


@piece("bicycle_parked", "bike_a", "veiculo", collider=("box", [.6, 1.1, 1.8], [0, .55, 0]),
       note="bicicleta urbana com cesta (3 paletas bike_a/b/c); encostada, comprimento ao longo de Y blender")
def piece_bicycle_parked():
    return bike_parts("base", True)


def food_truck(roof_kind):
    P = []
    L, W, H = 4.6, 2.0, 2.2
    wr = .38
    zb = .45
    # chassi/cabine + caixa
    P.append(box((W, L * .62, H), (0, L * .19, zb + H / 2), "base", bevel=.16, seg=3))
    P.append(box((W * .97, L * .4, 1.5), (0, -L * .3, zb + .75), "base", bevel=.22, seg=3))
    P.append(box((W * .6, .06, .62), (0, -L * .5 + .01, zb + 1.0), "glass", bevel=.02, seg=1))
    P.append(box((W + .02, L * .4 * .5, .05), (0, -L * .3, zb + 1.5 - .02), "accent", bevel=.02, seg=1))
    for sx in (-1, 1):
        P.append(box((.02, .8, .5), (sx * (W / 2 - .0), -L * .33, zb + .95), "glass", seg=1))
    P.append(box((W * .98, .1, .22), (0, -L / 2 - .01, zb + .08), "trim", bevel=.05, seg=2))
    P.append(box((W * .98, .1, .22), (0, L / 2 + .01, zb + .08), "trim", bevel=.05, seg=2))
    for sx in (-1, 1):
        P.append(sph((.14, .07, .14), (sx * .65, -L / 2 + .01, zb + .55), "glow", n=8, rings=5))
    # faixa de cor
    P.append(box((W + .02, L * .6, .3), (0, L * .19, zb + .45), "accent", bevel=.02, seg=1))
    # rodas
    for sx in (-1, 1):
        for y in (-1.45, 1.4):
            P.append(cylX(wr, .26, (sx * (W / 2 - .08), y, wr), "deep", n=16, b=.05))
            P.append(cylX(wr * .56, .275, (sx * (W / 2 - .07), y, wr), "trim", n=10))
    # janela de atendimento lado +X
    xs = W / 2
    P.append(box((.06, 1.5, .8), (xs - .01, L * .22, zb + 1.35), "deep", bevel=.02, seg=1))
    P.append(box((.05, 1.34, .66), (xs + .005, L * .22, zb + 1.35), "glow", bevel=.01, seg=1))
    P.append(box((.4, 1.6, .06), (xs + .2, L * .22, zb + .95), "trim", bevel=.02, seg=1))
    P.append(box((.05, .5, .6), (xs + .0, L * .48 - .0, zb + 1.35), "deep", bevel=.02, seg=1) if False else box((.04, .46, .56), (xs + .01, L * .46, zb + 1.2), "deep", bevel=.015, seg=1))
    # toldo listrado
    n = 8
    for i in range(n):
        yy = L * .22 - .8 + 1.6 / n * (i + .5)
        P.append(box((.78, 1.6 / n * .98, .045), (xs + .42, yy, zb + 1.95), "accent2" if i % 2 == 0 else "white", rot=(0, .32, 0), bevel=.01, seg=1))
    for i in range(n):
        yy = L * .22 - .8 + 1.6 / n * (i + .5)
        P.append(sph((.05, 1.6 / n * .5, .06), (xs + .78, yy, zb + 1.8), "accent2" if i % 2 == 0 else "white", n=6, rings=4))
    # menu / lousa
    P.append(box((.05, .6, .7), (xs + .01, L * .05 - .1, zb + 1.35), "deep", bevel=.02, seg=1) if False else box((.04, .5, .7), (xs + .015, L * .52 - .02, zb + 1.35), "deep", bevel=.015, seg=1))
    for k in range(3):
        P.append(box((.045, .34, .03), (xs + .035, L * .52 - .02, zb + 1.55 - k * .17), "white", seg=1))
    # luzes e gerador
    P.append(box((.5, .4, .38), (-xs + .26, L * .12, zb - .1), "deep", bevel=.04, seg=1) if False else box((.04, .5, .3), (-xs + .01, L * .25, zb + .7), "deep", bevel=.01, seg=1))
    # topo
    if roof_kind == "icecream":
        z0 = zb + H
        yy = L * .2
        P.append(lathe([(0, 0), (.3, 0), (.24, .08), (.03, .62), (0, .64)], "seat", loc=(0, yy, z0 + .04), n=12))
        P.append(sph(.26, (0, yy, z0 + .78), "soft", n=12, rings=8))
        P.append(sph(.24, (0, yy, z0 + 1.1), "accent2", n=12, rings=8))
        P.append(sph(.18, (0, yy, z0 + 1.38), "white", n=10, rings=7))
        P.append(sph(.04, (0, yy, z0 + 1.55), "accent2", n=8, rings=5))
    else:
        z0 = zb + H
        P.append(box((.1, 2.6, .8), (0, L * .2, z0 + .6), "base", bevel=.04, seg=2) if False else box((.14, 2.4, .8), (0, L * .2, z0 + .52), "accent", bevel=.05, seg=2))
        P.append(box((.16, 2.2, .6), (0, L * .2, z0 + .52), "deep", bevel=.04, seg=2))
        P.append(text3d("CREPES", .36, .06, (.095, L * .2, z0 + .52), "white", rot=(pi / 2, 0, pi / 2), bevel=0.004))
        P.append(text3d("CREPES", .36, .06, (-.095, L * .2, z0 + .52), "white", rot=(pi / 2, 0, -pi / 2), bevel=0.004))
        for y in (-.9, 1.0):
            P.append(cyl(.025, .3, (0, L * .2 + y, z0 + .15), "trim", n=6))
    return P


@piece("food_truck_icecream", "truck_cream", "veiculo", collider=("box", [2.1, 2.9, 4.7], [0, 1.45, 0]),
       note="food truck de sorvete (casquinha no teto); janela de atendimento no lado +X do blender (= +X jogo)")
def piece_food_truck_icecream():
    return food_truck("icecream")


@piece("food_truck_crepe", "truck_mint", "veiculo", collider=("box", [2.1, 2.9, 4.7], [0, 1.45, 0]),
       note="food truck de crepe/lanches (letreiro CREPES no teto); janela no lado +X")
def piece_food_truck_crepe():
    return food_truck("crepe")


# ====================================================================================================
# CARRINHOS
# ====================================================================================================
def cart_base(P, W=1.5, D=.9):
    wr = .3
    for sx in (-1, 1):
        P.append(cylX(wr, .08, (sx * (W / 2 + .02), .1, wr), "deep", n=16, b=.02))
        P.append(cylX(wr * .6, .09, (sx * (W / 2 + .02), .1, wr), "trim", n=10))
    P.append(box((W, D, .6), (0, 0, .6), "base", bevel=.06, seg=2))
    P.append(box((W * 1.02, D * 1.02, .08), (0, 0, .92), "trim", bevel=.025, seg=1))
    P.append(cylX(.025, W + .2, (0, .1, wr), "trim", n=6))
    P.append(tube([Vector((-W / 2 - .02, .1, .5)), Vector((-W / 2 - .5, .0, .5)), Vector((-W / 2 - .7, .0, .7))], .02, "trim", minor=5))
    P.append(cylY(.02, .5, (-W / 2 - .65, .0, .7), "trim", n=6) if False else sph(.025, (-W / 2 - .7, .0, .72), "deep", n=6, rings=4))


@piece("popcorn_cart", "carnival", "carrinho", collider=("box", [1.8, 2.5, 1.3], [0, 1.25, 0]),
       note="carrinho de pipoca com toldo listrado, vidro e pipoca; atende pelo lado -Y blender (frente)")
def piece_popcorn_cart():
    P = []
    cart_base(P, 1.5, .9)
    # vitrine de vidro com pipoca
    P.append(box((1.3, .8, .7), (0, 0, 1.3), "glass", bevel=.03, seg=1))
    for i in range(18):
        a = i * 2.4
        P.append(sph(.075, (cos(a) * .45, sin(a * 1.3) * .28, 1.0 + .13 * ((i * 7) % 5) / 4 + .12), "soft" if i % 3 else "accent2", n=6, rings=4) if False else sph(.07, ((i % 6 - 2.5) * .2, ((i // 6) - 1) * .22, 1.05 + ((i * 5) % 4) * .05), "soft" if i % 2 else "white", n=6, rings=4))
    for x in (-.64, .64):
        for y in (-.38, .38):
            P.append(cyl(.022, 1.4, (x, y, 1.65), "trim", n=6))
    # toldo (listras)
    n = 10
    for i in range(n):
        x = -.85 + 1.7 / n * (i + .5)
        P.append(box((1.7 / n * .98, 1.25, .04), (x, 0, 2.3 + .0), "accent" if i % 2 == 0 else "white", rot=(0, 0, 0), bevel=.01, seg=1))
        P.append(sph((1.7 / n * .52, .05, .08), (x, -.64, 2.22), "accent" if i % 2 == 0 else "white", n=6, rings=4))
    P.append(box((1.5, .12, .22), (0, -.1, 2.52), "base", bevel=.05, seg=2) if False else sph((.8, .6, .22), (0, 0, 2.38), "accent2", n=14, rings=7))
    P.append(text3d("POP", .18, .03, (0, -.68, 2.18), "white", bevel=.002))
    P.append(sph(.09, (0, 0, 2.62), "accent2", n=8, rings=5))
    P.append(box((1.4, .1, .22), (0, -.46, .67), "accent2", bevel=.03, seg=1))
    P.append(text3d("POPCORN", .13, .02, (0, -.51, .67), "white"))
    return P


@piece("cotton_candy_cart", "carnival", "carrinho", collider=("box", [1.8, 2.5, 1.3], [0, 1.25, 0]),
       note="carrinho de algodao-doce: nuvens de algodao (rosa/azul = acento raro) em espeto")
def piece_cotton_candy_cart():
    P = []
    cart_base(P, 1.4, .9)
    P.append(box((1.3, .8, .08), (0, 0, 1.0), "accent2", bevel=.03, seg=1))
    cols = ["seat", "white", "soft", "accent", "white", "seat"]
    for i, c in enumerate(cols):
        x = -.55 + i * .22
        P.append(cyl(.012, .5, (x, 0, 1.28), "trim", n=5))
        P.append(sph((.16, .16, .17), (x, 0, 1.62), "white" if i % 2 else "soft", n=10, rings=6))
    for x in (-.6, .6):
        P.append(cyl(.022, 1.5, (x, -.38, 1.65), "trim", n=6))
        P.append(cyl(.022, 1.5, (x, .38, 1.65), "trim", n=6))
    P.append(box((1.45, 1.0, .06), (0, 0, 2.4), "accent2", bevel=.025, seg=1))
    P.append(sph((.82, .6, .24), (0, 0, 2.5), "accent", n=12, rings=6))
    P.append(box((1.3, .1, .22), (0, -.46, .67), "white", bevel=.03, seg=1))
    P.append(text3d("ALGODAO", .12, .02, (0, -.51, .67), "accent2"))
    return P


# ====================================================================================================
# MESAS, GUARDA-SOL, BANCA, FLOREIRA
# ====================================================================================================
@piece("patio_umbrella", "umbrella", "mobiliario", collider=("cylinder", [.45, 2.4], [0, 1.2, 0]),
       note="guarda-sol de mesa (8 gomos) com base; sem mesa, para combinar com cafe_table_set/bistro_set")
def piece_patio_umbrella():
    P = []
    P.append(cyl(.34, .08, (0, 0, .04), "deep", n=16, bevel=.025))
    P.append(cyl(.04, 2.35, (0, 0, 1.2), "trim", n=8))
    n = 8
    R = 1.55
    for i in range(n):
        a0, a1 = 2 * pi * i / n, 2 * pi * (i + 1) / n
        bm = bmesh.new()
        c0 = bm.verts.new((0, 0, 2.62))
        pts = []
        for k in range(5):
            t = k / 4
            for a in (a0, a1):
                pts.append((a, t))
        # gomo: fan de triangulos com curvatura
        rows = []
        for k in range(5):
            t = k / 4
            r = R * t
            z = 2.62 - .5 * (t ** 1.6)
            rows.append([bm.verts.new((r * cos(a0 + (a1 - a0) * j / 3), r * sin(a0 + (a1 - a0) * j / 3), z)) for j in range(4)])
        for k in range(4):
            for j in range(3):
                try:
                    if k == 0:
                        bm.faces.new((c0, rows[1][j], rows[1][j + 1]))
                    else:
                        bm.faces.new((rows[k][j], rows[k + 1][j], rows[k + 1][j + 1], rows[k][j + 1]))
                except ValueError:
                    pass
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bmesh.ops.reverse_faces(bm, faces=bm.faces) if False else None
        P.append(ck._obj_from_bm(bm, "accent" if i % 2 == 0 else "white", (0, 0, 0), (0, 0, 0)))
        P.append(sph((.1, .1, .05), (R * .98 * cos((a0 + a1) / 2), R * .98 * sin((a0 + a1) / 2), 2.12), "accent" if i % 2 == 0 else "white", n=6, rings=4))
    P.append(sph(.06, (0, 0, 2.66), "trim", n=8, rings=5))
    return P


@piece("bistro_set", "wood", "mobiliario", collider=("cylinder", [.9, .9], [0, .45, 0]),
       note="mesa de bistro redonda (tampo de marmore) + 2 cadeiras de madeira curvada")
def piece_bistro_set():
    P = []
    P.append(cyl(.34, .04, (0, 0, .02), "deep", n=16, bevel=.012))
    P.append(cyl(.035, .68, (0, 0, .36), "deep", n=8))
    P.append(cyl(.38, .035, (0, 0, .72), "white", n=24, bevel=.012))
    P.append(tube(circ(0, 0, .72, .385, 24, "xy"), .014, "trim", minor=4, closed=True))
    P.append(cyl(.05, .07, (.1, .05, .775), "accent2", n=8, bevel=.01))
    P.append(sph((.045, .045, .03), (.1, .05, .83), "leaf", n=6, rings=4))
    for k, a in enumerate((pi * 1.5, pi * .5)):
        cx, cy = .72 * cos(a + .0) * 0 + 0, 0
        dx, dy = (0, -.72) if k == 0 else (0, .72)
        P.append(cyl(.2, .035, (dx, dy, .45), "seat", n=14, bevel=.012))
        for sx in (-1, 1):
            for sy in (-1, 1):
                P.append(tube([Vector((dx + sx * .16, dy + sy * .15, 0)), Vector((dx + sx * .12, dy + sy * .12, .43))], .014, "deep", minor=4))
        sgn = -1 if k == 0 else 1
        P.append(tube([Vector((dx - .17, dy + sgn * .17, .45)), Vector((dx - .17, dy + sgn * .22, .9)), Vector((dx, dy + sgn * .24, .95)), Vector((dx + .17, dy + sgn * .22, .9)), Vector((dx + .17, dy + sgn * .17, .45))], .016, "deep", minor=5))
        P.append(tube(circ(dx, dy + sgn * .22, .78, .12, 10, "xz"), .01, "deep", minor=4, closed=True) if False else box((.3, .02, .1), (dx, dy + sgn * .235, .78), "deep", bevel=.01, seg=1))
    return P


@piece("market_stall", "umbrella", "mobiliario", collider=("box", [2.4, 2.4, 1.4], [0, 1.2, 0]),
       note="barraca de feira/banca com toldo listrado e caixotes de frutas/flores")
def piece_market_stall():
    P = []
    for x in (-1.1, 1.1):
        for y in (-.6, .6):
            P.append(cyl(.035, 2.3 if y > 0 else 2.0, (x, y, 1.15 if y > 0 else 1.0), "seat", n=8))
    P.append(box((2.3, .8, .08), (0, -.1, .86), "seat", bevel=.02, seg=1))
    P.append(box((2.3, .8, .78), (0, -.1, .42), "base", bevel=.04, seg=2))
    n = 10
    for i in range(n):
        x = -1.25 + 2.5 / n * (i + .5)
        P.append(box((2.5 / n * .98, 1.5, .04), (x, 0, 2.2), "accent" if i % 2 == 0 else "white", rot=(-.22, 0, 0), bevel=.01, seg=1))
        P.append(sph((2.5 / n * .52, .05, .09), (x, -.8, 2.0), "accent" if i % 2 == 0 else "white", n=6, rings=4))
    cols = ["accent2", "soft", "leaf", "accent2", "white"]
    for i in range(5):
        x = -.9 + i * .45
        P.append(box((.36, .4, .16), (x, -.1, .96), "seat", bevel=.02, seg=1))
        for k in range(5):
            P.append(sph(.06, (x - .12 + (k % 3) * .12, -.1 + (k // 3 - .5) * .14, 1.07 + (k % 2) * .03), cols[i], n=6, rings=4))
    P.append(box((.9, .04, .22), (0, -.52, .6), "white", bevel=.015, seg=1))
    P.append(text3d("FEIRA", .16, .02, (0, -.55, .6), "deep"))
    return P


@piece("window_flower_box", "garden", "mobiliario", collider=None,
       note="floreira de janela (caixa de madeira com flores/folhas); 1.2 m; fixar sob a janela (z ~ 0.9 acima do piso do andar)")
def piece_window_flower_box():
    P = []
    P.append(box((1.2, .26, .24), (0, 0, .12), "seat", bevel=.025, seg=2))
    P.append(box((1.24, .3, .04), (0, 0, .25), "trim", bevel=.012, seg=1))
    P.append(box((1.1, .2, .06), (0, 0, .24), "deep", bevel=.01, seg=1))
    for i in range(7):
        x = -.5 + i * .167
        P.append(sph((.14, .16, .16), (x, 0, .33 + (i % 2) * .03), "leaf", n=8, rings=5))
    cols = ["accent2", "white", "soft", "accent2", "white", "soft", "accent2", "white"]
    for i in range(8):
        x = -.52 + i * .15
        P.append(sph(.045, (x, (i % 3 - 1) * .05 - .02, .46 + (i % 3) * .03), cols[i], n=6, rings=4))
    return P


# ====================================================================================================
# LUZINHAS / BANDEIRINHAS (vao entre dois postes)
# ====================================================================================================
def catenary(x0, x1, z0, sag, n=14):
    pts = []
    for i in range(n + 1):
        t = i / n
        x = x0 + (x1 - x0) * t
        z = z0 - 4 * sag * t * (1 - t)
        pts.append(Vector((x, 0, z)))
    return pts


@piece("string_lights_span", "lights", "decor", collider=("boxes", [[.3, 4.6, .3, -6.0, 2.3, 0], [.3, 4.6, .3, 6.0, 2.3, 0]], None), cull="small",
       note="varal de luzinhas de 12 m entre dois postes (z 4.4 m, flecha 0.7 m); orientar o eixo X ao longo da travessia da rua")
def piece_string_lights_span():
    P = []
    for sx in (-6.0, 6.0):
        P.append(lathe([(0, 0), (.2, 0), (.2, .1), (.1, .25), (.06, .5), (.05, 4.5), (0, 4.55)], "base", loc=(sx, 0, 0), n=10, smooth=1))
        P.append(sph(.08, (sx, 0, 4.58), "trim", n=8, rings=5))
        P.append(cylX(.025, .3, (sx - (.15 if sx > 0 else -.15), 0, 4.4), "trim", n=6))
    W = catenary(-5.7, 5.7, 4.35, .75, 16)
    P.append(tube(W, .012, "deep", minor=4))
    for i in range(1, 16):
        p = W[i]
        P.append(sph(.055, (p.x, 0, p.z - .07), "glow", n=6, rings=4))
        P.append(box((.025, .025, .05), (p.x, 0, p.z - .02), "deep", seg=1))
    W2 = catenary(-5.7, 5.7, 4.0, .55, 16)
    P.append(tube([Vector((p.x, .0, p.z)) for p in W2], .01, "deep", minor=4))
    for i in range(2, 15, 2):
        p = W2[i]
        P.append(sph(.05, (p.x, 0, p.z - .06), "glow", n=6, rings=4))
    P.append(tube([Vector((-5.7, 0, 4.35)), Vector((-5.7, 0, 4.0)), Vector((-5.7, 0, 3.98))], .01, "deep", minor=4))
    P.append(tube([Vector((5.7, 0, 4.35)), Vector((5.7, 0, 4.0))], .01, "deep", minor=4))
    return P


@piece("bunting_span", "garden", "decor", collider=("boxes", [[.3, 4.2, .3, -5.0, 2.1, 0], [.3, 4.2, .3, 5.0, 2.1, 0]], None), cull="small",
       note="varal de bandeirinhas (triangulos coloridos) de 10 m entre dois postes de madeira")
def piece_bunting_span():
    P = []
    for sx in (-5.0, 5.0):
        P.append(cyl(.07, 4.2, (sx, 0, 2.1), "seat", n=8))
        P.append(sph(.08, (sx, 0, 4.22), "trim", n=8, rings=5))
    W = catenary(-5.0, 5.0, 4.05, .7, 20)
    P.append(tube(W, .01, "deep", minor=4))
    cols = ["accent2", "soft", "accent", "white", "leaf", "seat"]
    for i in range(1, 20):
        p = W[i]
        P.append(prism([(-.17, 0), (.17, 0), (0, -.36)], .012, "xz", cols[i % len(cols)], loc=(p.x, 0, p.z - .01)))
    return P


# ====================================================================================================
# OUTDOOR / LETREIRO / QUIOSQUE
# ====================================================================================================
@piece("billboard_fashion", "luxo", "decor", collider=("boxes", [[.4, 5.5, .4, -2.3, 2.75, 0], [.4, 5.5, .4, 2.3, 2.75, 0]], None),
       note="outdoor/painel de publicidade 6x3 m em dois postes, luminarias no topo; arte 'MODA' + silhueta de vestido (troca de cor via palette)")
def piece_billboard_fashion():
    P = []
    for sx in (-2.3, 2.3):
        P.append(box((.34, .34, 3.4), (sx, 0, 1.7), "deep", bevel=.05, seg=2))
        P.append(box((.6, .6, .16), (sx, 0, .08), "trim", bevel=.04, seg=1))
    z = 4.3
    P.append(box((6.2, .3, 3.2), (0, 0, z), "deep", bevel=.08, seg=2))
    P.append(box((5.8, .06, 2.8), (0, -.16, z), "accent", bevel=.03, seg=2))
    P.append(box((2.9, .07, 2.8), (-1.45, -.17, z), "base", bevel=.03, seg=1))
    # vestido estilizado
    P.append(sph((.5, .08, .7), (-1.45, -.22, z + .1), "accent2", n=10, rings=7))
    P.append(box((.5, .07, 1.0), (-1.45, -.215, z - .5), "accent2", bevel=.04, seg=1, rot=(0, 0, 0)))
    P.append(sph((.5, .08, .8), (-1.45, -.22, z - 1.0), "accent2", n=10, rings=7))
    P.append(sph((.22, .08, .24), (-1.45, -.23, z + .86), "soft", n=8, rings=5))
    P.append(text3d("MODA", 1.0, .1, (1.45, -.23, z + .45), "deep", bevel=.006))
    P.append(text3d("NOVA COLECAO", .27, .05, (1.45, -.22, z - .45), "accent2"))
    P.append(box((1.6, .05, .08), (1.45, -.2, z - .85), "trim", bevel=.01, seg=1))
    # luminarias
    for sx in (-2.2, 0, 2.2):
        P.append(tube([Vector((sx, 0, z + 1.6)), Vector((sx, -.35, z + 1.9)), Vector((sx, -.75, z + 1.8))], .025, "trim", minor=5))
        P.append(box((.4, .24, .08), (sx, -.78, z + 1.76), "deep", bevel=.03, seg=1))
        P.append(box((.34, .2, .02), (sx, -.78, z + 1.715), "glow", seg=1))
    # passarela de manutencao
    P.append(box((6.2, .45, .05), (0, -.3, z - 1.62), "trim", bevel=.01, seg=1))
    return P


@piece("vertical_shop_sign", "luxo", "decor", collider=("cylinder", [.25, 4.0], [0, 2.0, 0]),
       note="letreiro vertical de loja em poste (letras empilhadas; 'glow' para neon); 3.6 m")
def piece_vertical_shop_sign():
    P = []
    P += foot(0, 0, .22, "trim", .1)
    P.append(box((.14, .14, 3.4), (0, 0, 1.75), "deep", bevel=.03, seg=2))
    P.append(box((.7, .22, 2.6), (0, -.14, 2.3), "base", bevel=.07, seg=3))
    P.append(box((.58, .05, 2.48), (0, -.27, 2.3), "deep", bevel=.03, seg=2))
    for i, ch in enumerate("LOJA"):
        P.append(text3d(ch, .46, .05, (0, -.31, 3.18 - i * .55), "glow", bevel=.004))
    P.append(box((.7, .3, .1), (0, -.14, 3.64), "trim", bevel=.03, seg=1))
    P.append(sph(.06, (0, 0, 3.55), "trim", n=8, rings=5))
    return P


@piece("info_kiosk", "stone", "decor", collider=("cylinder", [1.35, 2.8], [0, 1.4, 0]),
       note="quiosque de informacoes redondo: balcao, vidro, teto abaulado e 'i' no topo")
def piece_info_kiosk():
    P = []
    P.append(cyl(1.3, .14, (0, 0, .07), "soft", n=28, bevel=.04))
    P.append(lathe([(1.0, .14), (1.05, 1.0), (1.0, 1.05), (.85, 1.05), (.85, .14)], "base", n=28))
    P.append(lathe([(1.12, 1.0), (1.12, 1.08), (.7, 1.08), (.7, 1.0)], "seat", n=28, rot=(0, 0, 0)))
    for k in range(8):
        a = 2 * pi * k / 8
        if abs(((a + pi / 2) % (2 * pi)) - pi) < .45 or True:
            pass
    # vidros em arco (abertura frontal)
    for k in range(10):
        a = pi / 2 + .7 + (2 * pi - 1.4) * k / 10
        a2 = pi / 2 + .7 + (2 * pi - 1.4) * (k + .9) / 10
        am = (a + a2) / 2
        P.append(box((.5, .05, 1.0), (.82 * cos(am), .82 * sin(am), 1.6), "glass", rot=(0, 0, am + pi / 2), seg=1))
    for k in range(11):
        a = pi / 2 + .7 + (2 * pi - 1.4) * k / 10
        P.append(cyl(.035, 1.1, (.82 * cos(a), .82 * sin(a), 1.6), "trim", n=6))
    P.append(lathe([(1.25, 2.1), (1.3, 2.2), (1.0, 2.5), (.5, 2.7), (0, 2.78)], "accent2", n=28, smooth=1))
    P.append(tube(circ(0, 0, 2.15, 1.22, 28, "xy"), .035, "trim", minor=5, closed=True))
    P.append(cyl(.28, .06, (0, -.0, 2.9), "white", rot=(0, 0, 0), n=20, bevel=.015))
    P.append(text3d("i", .4, .05, (0, -.0, 3.0), "deep", rot=(pi / 2, 0, 0)))
    P.append(box((.9, .5, .06), (.0, .35, 1.08), "deep", bevel=.01, seg=1))
    P.append(box((.8, .4, .01), (.0, .35, 1.11), "glow", seg=1))
    return P
