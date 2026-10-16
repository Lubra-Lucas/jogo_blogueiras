"""
Jogo das Blogueiras - pipeline Blender da personagem base (estilo glam / Dress-to-Impress).

Uso (headless):
  blender -b --factory-startup -noaudio --python tools/blender/build_character.py -- \
      --style tools/blender/style_glam.json [--out-dir public/assets/characters] \
      [--preview-dir <pasta>] [--render] [--no-export]

O que faz (tudo deterministico, sem aleatoriedade):
  1. Cria o humano MPFB (MakeHuman) com macros (feminino, ~25 anos, magra...).
  2. Aplica targets do MakeHuman + deformacoes customizadas (cabeca grande, olhos grandes...)
     calculados em numpy sobre as posicoes dos vertices e "assados" na malha base.
  3. Rig Mixamo (mixamorig:*), proxies (olhos, cilios, sobrancelhas) e cabelo (so para preview).
  4. Calcula morph targets (deltas) re-rodando o pipeline com a variacao de cada slider; os
     proxies (olhos/cilios/sobrancelhas/cabelo) seguem a malha via a ligacao barycentrica do .mhclo.
  5. Remove a geometria auxiliar do MakeHuman (juntas, tights, saia, olho-helper...).
  6. Materiais simples (Principled) e exporta GLB + JSON de metadados.
  7. Opcional: renders de preview (EEVEE) com roupa de preview (nunca nua).
"""
import sys
import os
import json
import math
import gzip
import time
from pathlib import Path

import bpy
import bmesh
import numpy as np
import addon_utils
from mathutils import Vector

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
sys.path.insert(0, str(HERE))

T0 = time.time()


def log(*a):
    print("[build %5.1fs]" % (time.time() - T0), *a, flush=True)


# --------------------------------------------------------------------------------------
# argumentos
# --------------------------------------------------------------------------------------
def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    args = {
        "style": str(HERE / "style_glam.json"),
        "out_dir": str(REPO / "public" / "assets" / "characters"),
        "preview_dir": r"C:\Users\user\AppData\Local\Temp\claude\shots\blender",
        "render": False,
        "export": True,
        "shots": "",
        "tag": "",
        "cache_dir": str(HERE / ".cache"),
        "nohair": False,
        "nooutfit": False,
    }
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--style":
            args["style"] = argv[i + 1]; i += 1
        elif a == "--out-dir":
            args["out_dir"] = argv[i + 1]; i += 1
        elif a == "--preview-dir":
            args["preview_dir"] = argv[i + 1]; i += 1
        elif a == "--cache-dir":
            args["cache_dir"] = argv[i + 1]; i += 1
        elif a == "--shots":
            args["shots"] = argv[i + 1]; i += 1
        elif a == "--tag":
            args["tag"] = argv[i + 1]; i += 1
        elif a == "--nooutfit":
            args["nooutfit"] = True
        elif a == "--nohair":
            args["nohair"] = True
        elif a == "--render":
            args["render"] = True
        elif a == "--no-export":
            args["export"] = False
        i += 1
    return args


# --------------------------------------------------------------------------------------
# MPFB
# --------------------------------------------------------------------------------------
addon_utils.enable("bl_ext.blender_org.mpfb", default_set=True)
from bl_ext.blender_org.mpfb.services.humanservice import HumanService  # noqa: E402
from bl_ext.blender_org.mpfb.services.targetservice import TargetService  # noqa: E402
from bl_ext.blender_org.mpfb.services.locationservice import LocationService  # noqa: E402
from bl_ext.blender_org.mpfb.services.objectservice import ObjectService  # noqa: E402
from bl_ext.blender_org.mpfb.entities.clothes.mhclo import Mhclo  # noqa: E402
from bl_ext.blender_org.mpfb.entities.objectproperties import GeneralObjectProperties  # noqa: E402


def user_asset(rel):
    p = os.path.join(LocationService.get_user_data(), rel)
    if not os.path.exists(p):
        raise FileNotFoundError(p)
    return p


# --------------------------------------------------------------------------------------
# targets do MakeHuman (carregados direto para numpy)
# --------------------------------------------------------------------------------------
_TARGET_INDEX = None
_TARGET_CACHE = {}
SCALE = 0.1  # MPFB: unidades MakeHuman (dm) -> m


def target_index():
    global _TARGET_INDEX
    if _TARGET_INDEX is None:
        root = Path(LocationService.get_mpfb_data("targets"))
        _TARGET_INDEX = {}
        for p in root.rglob("*.target.gz"):
            _TARGET_INDEX[p.name[:-len(".target.gz")]] = p
    return _TARGET_INDEX


def load_target_file(path):
    key = str(path)
    if key in _TARGET_CACHE:
        return _TARGET_CACHE[key]
    with gzip.open(path, "rt", encoding="utf-8") as f:
        rows = [ln.split() for ln in f if ln.strip() and not ln.startswith("#") and not ln.startswith('"')]
    idx = np.array([int(r[0]) for r in rows], dtype=np.int64)
    d = np.array([[float(r[1]), float(r[2]), float(r[3])] for r in rows], dtype=np.float64).reshape(-1, 3)
    # MPFB: (x, y, z) do arquivo -> blender (x, -z, y)
    d = np.stack([d[:, 0], -d[:, 2], d[:, 1]], axis=1) * SCALE
    _TARGET_CACHE[key] = (idx, d)
    return idx, d


def get_target(name):
    idx = target_index()
    if name in idx:
        return load_target_file(idx[name])
    # macros: "macrodetails/xxx"
    p = Path(LocationService.get_mpfb_data("targets")) / (name + ".target.gz")
    if p.exists():
        return load_target_file(p)
    raise KeyError("target nao encontrado: " + name)


def expand_target_names(name):
    """'LR:eye-scale-incr' -> ['l-eye-scale-incr', 'r-eye-scale-incr']"""
    if name.startswith("LR:"):
        base = name[3:]
        return ["l-" + base, "r-" + base]
    return [name]


def apply_targets(P, targets):
    P = P.copy()
    for name, w in targets.items():
        if abs(w) < 1e-9:
            continue
        for n in expand_target_names(name):
            idx, d = get_target(n)
            ok = idx < len(P)
            P[idx[ok]] += d[ok] * w
    return P


def macro_positions(basis, macros):
    info = TargetService.get_default_macro_info_dict()
    for k, v in macros.items():
        if k == "race":
            info["race"].update(v)
        else:
            info[k] = v
    P = basis.copy()
    for name, w in TargetService.calculate_target_stack_from_macro_info_dict(info):
        idx, d = get_target(name)
        P[idx] += d * w
    return P


# --------------------------------------------------------------------------------------
# operacoes customizadas de deformacao
# --------------------------------------------------------------------------------------
def smoothstep(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def landmarks(P, groups):
    def c(g):
        return P[groups[g]].mean(0)
    lm = {
        "eye_l": c("joint-l-eye"),
        "eye_r": c("joint-r-eye"),
        "mouth": c("joint-mouth"),
        "neck": c("joint-neck"),
        "head": c("joint-head"),
        "jaw": c("joint-jaw"),
        "head2": c("joint-head-2"),
        "pelvis": c("joint-pelvis"),
        "lid_u": c("joint-l-upperlid"),
        "lid_l": c("joint-l-lowerlid"),
    }
    # pontos derivados dos vertices afetados por targets do MakeHuman (ver add_target_groups)
    if "t:nose" in groups:
        g = P[groups["t:nose"]]
        lm["nose"] = g.mean(0)
        lm["nose_tip"] = g[np.argmin(g[:, 1])]
        lm["lip_u"] = c("t:lip_u")
        lm["lip_l"] = c("t:lip_l")
        lm["lips"] = (lm["lip_u"] + lm["lip_l"]) / 2.0
        gc = P[groups["t:chin"]]
        gc = gc[(np.abs(gc[:, 0]) < 0.012) & (gc[:, 1] < lm["head"][1] - 0.05)]
        lm["chin"] = np.array([0.0, gc[:, 1].min(), gc[:, 2].min()])
    return lm


def resolve_point(spec, lm):
    if isinstance(spec, dict):
        base = np.array(lm[spec["lm"]], dtype=np.float64)
        return base + np.array(spec.get("off", [0, 0, 0]), dtype=np.float64)
    return np.array(spec, dtype=np.float64)


def op_region_scale(P, lm, center, radius, scale, mirror=True, power=1.0):
    radius = np.array(radius, dtype=np.float64)
    scale = np.array(scale, dtype=np.float64)
    for sgn in ([1.0, -1.0] if mirror else [1.0]):
        c = resolve_point(center, lm) * np.array([sgn, 1.0, 1.0])
        d = P - c
        r = np.sqrt(((d / radius) ** 2).sum(1))
        w = smoothstep(1.0 - r) ** power
        P = c + d * (1.0 + (scale - 1.0) * w[:, None])
    return P


def op_region_move(P, lm, center, radius, delta, mirror=True, power=1.0):
    radius = np.array(radius, dtype=np.float64)
    delta = np.array(delta, dtype=np.float64)
    out = P.copy()
    for sgn in ([1.0, -1.0] if mirror else [1.0]):
        c = resolve_point(center, lm) * np.array([sgn, 1.0, 1.0])
        d = P - c
        r = np.sqrt(((d / radius) ** 2).sum(1))
        w = smoothstep(1.0 - r) ** power
        out += (delta * np.array([sgn, 1.0, 1.0]))[None, :] * w[:, None]
    return out


def op_head_scale(P, lm, pivot, z0, z1, scale, ref="neck"):
    """Escala a cabeca em torno do pivo (ponto absoluto ou landmark+off). Peso 0 em ref.z+z0, 1 em ref.z+z1."""
    pivot = resolve_point(pivot, lm)
    rz = float(lm[ref][2])
    w = smoothstep((P[:, 2] - (rz + z0)) / (z1 - z0))
    S = 1.0 + (np.array(scale) - 1.0)[None, :] * w[:, None]
    return pivot + (P - pivot) * S


def op_band_scale(P, lm, axis, z, scale, ref="neck"):
    """Escala (x,y) em torno de um eixo vertical numa faixa em z=[a,b,c,d] (offsets de ref.z: sobe a-b, plano b-c, desce c-d).
    axis = [x, dy] onde dy e offset do y do landmark ref."""
    rz = float(lm[ref][2])
    a, b, c, d = [rz + v for v in z]
    w = smoothstep((P[:, 2] - a) / (b - a)) * (1.0 - smoothstep((P[:, 2] - c) / (d - c)))
    ax = np.array([axis[0], lm[ref][1] + axis[1]])
    S = 1.0 + (np.array(scale)[None, :] - 1.0) * w[:, None]
    out = P.copy()
    out[:, :2] = ax + (P[:, :2] - ax) * S
    return out


def op_front_scale(P, lm, center, radius, depth, mirror=False):
    """Empurra/puxa vertices na direcao -Y (frente) com peso radial; usado p/ labios, nariz etc."""
    return op_region_move(P, lm, center, radius, [0.0, -depth, 0.0], mirror)


def op_face_taper(P, lm, top, bottom, scale, fade=0.045, y_scale=1.0):
    """Afina a parte baixa do rosto em x: peso 1 entre top (landmark+off) e bottom, some em `fade` abaixo do queixo."""
    zt = float(resolve_point(top, lm)[2])
    zb = float(resolve_point(bottom, lm)[2])
    w = smoothstep((zt - P[:, 2]) / (zt - zb)) * smoothstep((P[:, 2] - (zb - fade)) / fade)
    out = P.copy()
    out[:, 0] = P[:, 0] * (1.0 + (scale - 1.0) * w)
    if y_scale != 1.0:
        yc = float(lm["head"][1])
        out[:, 1] = yc + (P[:, 1] - yc) * (1.0 + (y_scale - 1.0) * w)
    return out


def op_lower_face_compress(P, lm, top, bottom, scale, fade=0.045):
    """Comprime verticalmente o terco inferior do rosto (nariz/boca/queixo) em direcao a `top`; o pescoco abaixo
    do queixo e esticado suavemente (fade) para manter o comprimento."""
    zt = float(resolve_point(top, lm)[2])
    zb = float(resolve_point(bottom, lm)[2])
    w = smoothstep((zt - P[:, 2]) / 0.02) * smoothstep((P[:, 2] - (zb - fade)) / fade)
    out = P.copy()
    out[:, 2] = P[:, 2] + (1.0 - scale) * (zt - P[:, 2]) * w
    return out


def op_leg_scale(P, lm, scale, ref="pelvis", fade=0.08):
    """Encurta/alonga as pernas: escala z abaixo do quadril (transicao suave acima dele)."""
    pz = float(lm[ref][2])
    w = smoothstep((pz + 0.03 - P[:, 2]) / fade)
    out = P.copy()
    out[:, 2] = pz + (P[:, 2] - pz) * (1.0 + (scale - 1.0) * w)
    return out


_CUR_GROUPS = {}


def op_group_move(P, lm, groups, delta):
    """Move rigidamente os vertices de grupos (ex.: helper-l-eye) - usado para recuar/avancar os globos oculares."""
    out = P.copy()
    for g in groups:
        out[_CUR_GROUPS[g]] += np.array(delta)
    return out


OPS = {
    "group_move": op_group_move,
    "leg_scale": op_leg_scale,
    "lower_face_compress": op_lower_face_compress,
    "face_taper": op_face_taper,
    "region_scale": op_region_scale,
    "region_move": op_region_move,
    "head_scale": op_head_scale,
    "band_scale": op_band_scale,
}


def run_ops(P, groups, ops):
    global _CUR_GROUPS
    _CUR_GROUPS = groups
    for op in ops:
        op = dict(op)
        kind = op.pop("op")
        op.pop("comment", None)
        lm = landmarks(P, groups)
        P = OPS[kind](P, lm, **op)
    return P


# --------------------------------------------------------------------------------------
# contexto / pipeline
# --------------------------------------------------------------------------------------
class Ctx:
    pass


def add_target_groups(groups):
    """Grupos 't:*' = vertices afetados por targets de referencia (nariz, labios, queixo)."""
    for key, tname in (("t:nose", "nose-volume-incr"), ("t:lip_u", "mouth-upperlip-volume-incr"),
                       ("t:lip_l", "mouth-lowerlip-volume-incr"), ("t:chin", "chin-height-incr"),
                       ("t:eye_l", "l-eye-bag-incr"), ("t:cheek_l", "l-cheek-volume-incr")):
        idx, d = get_target(tname)
        groups[key] = idx[np.isin(idx, groups["body"])]
    return groups


def vertex_groups_as_indices(obj):
    names = {g.index: g.name for g in obj.vertex_groups}
    groups = {}
    for v in obj.data.vertices:
        for g in v.groups:
            groups.setdefault(names[g.group], []).append(v.index)
    return {k: np.array(v, dtype=np.int64) for k, v in groups.items()}


def finalize(ctx, P, frozen=None):
    body = ctx.groups["body"]
    if frozen is None:
        zmin = P[body][:, 2].min()
        top = P[body][:, 2].max()
        s = ctx.style["target_height_m"] / (top - zmin)
        frozen = (s, zmin)
    s, zmin = frozen
    out = (P - np.array([0.0, 0.0, zmin])) * s
    return out, frozen


def pipeline(ctx, variant=None):
    """Roda o pipeline de estilo. `variant` = {macros:{}, targets:{}, ops:[]} aplicados por cima do estilo base."""
    st = ctx.style
    variant = variant or {}
    macros = json.loads(json.dumps(st["macros"]))
    for k, v in variant.get("macros", {}).items():
        if k == "race":
            macros["race"].update(v)
        else:
            macros[k] = v
    P = macro_positions(ctx.basis, macros)
    targets = dict(st["targets"])
    for k, v in variant.get("targets", {}).items():
        targets[k] = targets.get(k, 0.0) + v
    P = apply_targets(P, targets)
    P = run_ops(P, ctx.groups, st["custom_ops"])
    if variant.get("ops"):
        P = run_ops(P, ctx.groups, variant["ops"])
    if st.get("doll_smooth"):
        P = doll_smooth(ctx, P, st["doll_smooth"])
    return P


# --------------------------------------------------------------------------------------
# superficie "boneca" (sem papilas nem relevo genital) - assada ANTES dos morphs
# --------------------------------------------------------------------------------------
def build_adjacency(obj):
    ed = np.zeros(len(obj.data.edges) * 2, dtype=np.int64)
    obj.data.edges.foreach_get("vertices", ed)
    return ed[0::2].copy(), ed[1::2].copy()


def taubin_region(P, adj, w, iters, lam=0.6, mu=-0.63):
    """Suavizacao de Taubin (nao encolhe) com peso por vertice `w` (0..1); vertices com w=0 ficam fixos (borda)."""
    a, b = adj
    n = len(P)
    deg = np.maximum(np.bincount(np.concatenate([a, b]), minlength=n).astype(np.float64), 1.0)
    out = P.copy()
    for i in range(iters):
        k = lam if i % 2 == 0 else mu
        acc = np.stack([np.bincount(a, weights=out[b, k_], minlength=n) + np.bincount(b, weights=out[a, k_], minlength=n)
                        for k_ in range(3)], axis=1)
        out += (acc / deg[:, None] - out) * (k * w)[:, None]
    return out


def bust_tip_metric(P, groups, lm, label):
    """Checagem objetiva da "ponta" do seio: perfil lateral (z -> y frontal) numa faixa de 12 mm em x passando pelo apice;
    curvatura = 2a diferenca discreta (bins de 5 mm). `tip_ratio` = curvatura maxima convexa perto do apice /
    mediana da curvatura convexa no resto do perfil. Perto de 1-2 = redondo; > 3 = ponta. Retorna o pior dos dois seios."""
    body = np.zeros(len(P), dtype=bool)
    body[groups["body"]] = True
    pz = float(lm["pelvis"][2])
    worst = 0.0
    info = []
    for sgn in (1.0, -1.0):
        m = body & (P[:, 0] * sgn > 0.02) & (P[:, 0] * sgn < 0.15) & (P[:, 2] > pz + 0.12) & (P[:, 2] < pz + 0.5)
        cand = np.nonzero(m)[0]
        tip = cand[np.argmin(P[cand, 1])]
        sel = body & (np.abs(P[:, 0] - P[tip, 0]) < 0.006) & (P[:, 1] < P[tip, 1] + 0.08) & (np.abs(P[:, 2] - P[tip, 2]) < 0.11)
        z, y = P[sel, 2], P[sel, 1]
        edges = np.arange(z.min(), z.max() + 0.005, 0.005)
        ib = np.digitize(z, edges)
        zb, yb = [], []
        for k in np.unique(ib):
            mk = ib == k
            zb.append(z[mk].mean())
            yb.append(y[mk].min())  # superficie frontal
        zb, yb = np.array(zb), np.array(yb)
        if len(zb) < 8:
            continue
        zg = np.arange(zb.min(), zb.max(), 0.005)   # grade uniforme (bins sem vertices sao interpolados)
        yb = np.interp(zg, zb, yb)
        zb = zg
        d2 = (yb[:-2] - 2 * yb[1:-1] + yb[2:]) / 0.005 ** 2   # > 0 = convexo para a frente (y minimo local)
        zc = zb[1:-1]
        near = np.abs(zc - P[tip, 2]) < 0.015
        mound = np.abs(zc - P[tip, 2]) < 0.05
        ref = float(np.mean(np.maximum(d2[mound], 0.0))) + 1e-6
        peak = float(np.max(d2[near])) if near.any() else 0.0
        ratio = peak / ref
        worst = max(worst, ratio)
        info.append((int(sgn), "curv_apice=%.0f/m (raio %.1f cm)" % (peak, 100.0 / max(peak, 1e-6)), "curv_media_seio=%.0f/m" % ref, "ratio=%.2f" % ratio))
    log("[bust-tip %s] curvatura (2a diferenca do perfil lateral): %s -> tip_ratio pior = %.2f %s" % (
        label, info, worst, "(AVISO: ponta!)" if worst > 2.5 else "(ok)"))
    return worst


def doll_smooth(ctx, P, cfg):
    """Deixa o corpo liso como uma boneca de moda: arredonda o bico/auréola do peito (raio em torno do apice),
    suaviza o relevo da virilha e o sulco dos gluteos. Roda no fim do pipeline, entao os morphs (deltas) ja saem
    do corpo liso e nenhum slider reintroduz detalhe."""
    adj = ctx.adj
    body = np.zeros(len(P), dtype=bool)
    body[ctx.groups["body"]] = True
    lm = landmarks(P, ctx.groups)
    pz, py = float(lm["pelvis"][2]), float(lm["pelvis"][1])
    out = P
    bc_ = cfg.get("bust", {})
    if bc_:
        R = bc_["radius"]
        out = P.copy()
        w = np.zeros(len(P))
        for sgn in (1.0, -1.0):
            m = body & (P[:, 0] * sgn > 0.02) & (P[:, 0] * sgn < 0.14) & (P[:, 2] > pz + 0.18) & (P[:, 2] < pz + 0.5)
            cand = np.nonzero(m)[0]
            tip = cand[np.argmin(P[cand, 1])]
            if not hasattr(ctx, 'bust_tips'):
                ctx.bust_tips = []
            if len(ctx.bust_tips) < 2:
                ctx.bust_tips.append((float(P[tip, 0]), float(P[tip, 2])))  # papila ORIGINAL (para limpar a textura)
            xt, zt = P[tip, 0], P[tip, 2]
            ux, uz = (P[:, 0] - xt) / R, (P[:, 2] - zt) / R
            rho = np.hypot(ux, uz)
            reg = body & (rho < 1.0) & (P[:, 1] < P[tip, 1] + 0.06)
            # superficie suave y(x, z): polinomio de grau 4 ajustado por minimos quadrados na regiao, descartando
            # iterativamente os pontos que ficam a frente do ajuste (a papila/ponta do cone sao "outliers")
            terms = [(i, j) for i in range(5) for j in range(5 - i)]
            A = np.stack([ux ** i * uz ** j for i, j in terms], axis=1)
            use = reg.copy()
            for _ in range(6):
                coef, *_ = np.linalg.lstsq(A[use], P[use, 1], rcond=None)
                res = P[:, 1] - A @ coef
                use = reg & (res > -bc_.get("tol", 0.0012))
            fit = A @ coef
            # parede do torax: plano ajustado na borda da regiao; centro do seio = ponto mais a frente da superficie suave
            ring = reg & (rho > 0.8)
            W3 = np.stack([np.ones(len(P)), P[:, 0], P[:, 2]], axis=1)
            wc, *_ = np.linalg.lstsq(W3[ring], P[ring, 1], rcond=None)
            ywall = W3 @ wc
            inner = np.nonzero(reg & (rho < 0.6))[0]
            ci = inner[np.argmin(fit[inner])]
            xc, zc = P[ci, 0], P[ci, 2]
            H = max(0.0, float(ywall[ci] - fit[ci]))
            # elipsoide: semi-eixos (largura, altura, profundidade) = (rx, rz, H*(1-recuo)) com centro DENTRO do torax;
            # a calota da superficie substitui o relevo no miolo da regiao
            rx, rz = bc_.get("rx", 1.12) * R, bc_.get("rz", 1.12) * R
            rr = np.sqrt(np.clip(1.0 - ((P[:, 0] - xc) / rx) ** 2 - ((P[:, 2] - zc) / rz) ** 2, 0.0, 1.0))
            cap = ywall - H * (1.0 - bc_.get("recuo", 0.2)) * rr
            rc = np.hypot((P[:, 0] - xc) / R, (P[:, 2] - zc) / R)
            wd = smoothstep((1.0 - rc) / 0.4) * reg      # 1 ate 60% do raio, 0 na borda
            wo = smoothstep((1.0 - rho) / bc_.get("fade", 0.5)) * reg
            base_y = P[:, 1] + wo * (fit - P[:, 1])      # primeiro tira a papila (ajuste suave)
            out[:, 1] = np.where(reg, base_y + wd * (cap - base_y), out[:, 1])
            w = np.maximum(w, smoothstep((1.0 - rho) / 0.5) * reg)
        out = taubin_region(out, adj, w * body, bc_.get("iters", 40))
    pc = cfg.get("pelvis", {})
    if pc:
        sel = body & (np.abs(P[:, 0]) < 0.004) & (P[:, 2] < pz + 0.1) & (P[:, 2] > pz - 0.3)
        cz = float(P[sel][:, 2].min())  # ponto da virilha (onde as pernas se separam)
        hx = pc.get("half_width", 0.05)
        zx = smoothstep((P[:, 2] - (cz - 0.02)) / 0.04) * smoothstep(((cz + pc.get("height", 0.13)) - P[:, 2]) / 0.05)
        front = smoothstep((py - 0.02 - P[:, 1]) / 0.05)
        wf = zx * front * smoothstep((hx + 0.035 - np.abs(P[:, 0])) / 0.035) * body
        out = taubin_region(out, adj, wf, pc["iters"])
        back = smoothstep((P[:, 1] - (py + 0.02)) / 0.05)
        wb = zx * back * smoothstep((0.035 - np.abs(P[:, 0])) / 0.03) * body
        out = taubin_region(out, adj, wb, pc.get("back_iters", 25))
    return out


# --------------------------------------------------------------------------------------
# ajuste dos proxies (.mhclo) em numpy
# --------------------------------------------------------------------------------------
def fit_proxy(mhclo, P):
    """Replica ClothesService.fit_clothes_to_human: posicao = soma(w_i * v_i) + offset * escala."""
    n = len(mhclo.verts)
    v = np.array([mhclo.verts[i]["verts"] for i in range(n)], dtype=np.int64)
    w = np.array([mhclo.verts[i]["weights"] for i in range(n)], dtype=np.float64)
    off = np.array([[mhclo.verts[i]["offsets"][0], mhclo.verts[i]["offsets"][1], mhclo.verts[i]["offsets"][2]]
                    for i in range(n)], dtype=np.float64)
    if mhclo.x_scale:
        xs = abs(P[mhclo.x_scale[0]][0] - P[mhclo.x_scale[1]][0]) / mhclo.x_scale[2]
        ys = abs(P[mhclo.y_scale[0]][2] - P[mhclo.y_scale[1]][2]) / mhclo.y_scale[2]
        zs = abs(P[mhclo.z_scale[0]][1] - P[mhclo.z_scale[1]][1]) / mhclo.z_scale[2]
    else:
        xs = ys = zs = SCALE
    pos = (w[:, 0:1] * P[v[:, 0]] + w[:, 1:2] * P[v[:, 1]] + w[:, 2:3] * P[v[:, 2]]
           + np.stack([off[:, 0] * xs, off[:, 1] * zs, off[:, 2] * ys], axis=1))
    return pos


def get_coords(obj):
    n = len(obj.data.vertices)
    a = np.zeros(n * 3)
    obj.data.vertices.foreach_get("co", a)
    return a.reshape(-1, 3)


def set_coords(obj, P):
    obj.data.vertices.foreach_set("co", np.asarray(P, dtype=np.float64).ravel())
    obj.data.update()


# --------------------------------------------------------------------------------------
# shape keys
# --------------------------------------------------------------------------------------
def add_shape_keys(obj, deltas, eps=1e-5):
    """deltas: {nome: array (n,3)}; so cria a chave se houver movimento > eps. Retorna nomes criados."""
    base = get_coords(obj)
    created = []
    if obj.data.shape_keys is None:
        obj.shape_key_add(name="Basis", from_mix=False)
    for name, d in deltas.items():
        if d is None or np.abs(d).max() < eps:
            continue
        sk = obj.shape_key_add(name=name, from_mix=False)
        sk.data.foreach_set("co", (base + d).ravel())
        sk.value = 0.0
        sk.slider_min = 0.0
        sk.slider_max = 1.0
        created.append(name)
    return created


# --------------------------------------------------------------------------------------
# materiais
# --------------------------------------------------------------------------------------
def load_image_resized(src, dst_dir, name, max_size, fmt="JPEG", quality=88):
    os.makedirs(dst_dir, exist_ok=True)
    ext = ".jpg" if fmt == "JPEG" else ".png"
    dst = os.path.join(dst_dir, name + ext)
    img = bpy.data.images.load(src, check_existing=False)
    w, h = img.size
    if max(w, h) > max_size:
        k = max_size / max(w, h)
        img.scale(int(w * k), int(h * k))
    img.file_format = fmt
    scene = bpy.context.scene
    scene.render.image_settings.file_format = fmt
    scene.render.image_settings.quality = quality
    if fmt == "JPEG":
        scene.render.image_settings.color_mode = "RGB"
    else:
        scene.render.image_settings.color_mode = "RGBA"
    img.save_render(dst, scene=scene)
    bpy.data.images.remove(img)
    img2 = bpy.data.images.load(dst, check_existing=False)
    img2.name = name + ext
    return img2


def make_material(name, image=None, base_color=(0.8, 0.6, 0.5, 1.0), roughness=0.6, alpha=False,
                  alpha_clip=None, specular=0.35, double_sided=False, tint=None):
    mat = bpy.data.materials.new(name)
    try:
        mat.use_nodes = True
    except Exception:
        pass
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Roughness"].default_value = roughness
    for key in ("Specular IOR Level", "Specular"):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = specular
            break
    bsdf.inputs["Base Color"].default_value = base_color
    if image is not None:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = image
        tex.interpolation = "Linear"
        if tint is not None:
            mix = nt.nodes.new("ShaderNodeMix")
            mix.data_type = "RGBA"
            mix.blend_type = "MULTIPLY"
            mix.inputs["Factor"].default_value = 1.0
            mix.inputs["B"].default_value = tuple(tint)
            nt.links.new(tex.outputs["Color"], mix.inputs["A"])
            nt.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
        else:
            nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        if alpha:
            nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    if alpha:
        try:
            mat.surface_render_method = "DITHERED"
        except Exception:
            pass
        try:
            mat.blend_method = "HASHED"
        except Exception:
            pass
    if alpha_clip is not None:
        mat["gltf_alpha_mode"] = "MASK"
        mat["gltf_alpha_cutoff"] = alpha_clip
    elif alpha:
        mat["gltf_alpha_mode"] = "BLEND"
    mat.use_backface_culling = not double_sided
    return mat


def set_single_material(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


# --------------------------------------------------------------------------------------
# helpers de cena
# --------------------------------------------------------------------------------------
def deselect_all():
    for o in bpy.context.view_layer.objects:
        o.select_set(False)


def delete_vertices_not_in(obj, keep_mask):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    dele = [v for v in bm.verts if not keep_mask[v.index]]
    bmesh.ops.delete(bm, geom=dele, context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def strip_vertex_groups(obj, keep_names):
    for g in list(obj.vertex_groups):
        if g.name not in keep_names:
            obj.vertex_groups.remove(g)


def scale_eye_uvs(obj, k):
    """Aumenta a iris encolhendo as UVs em torno do centro de cada olho (low-poly: centros em (0.705,0.707) e (0.293,0.299))."""
    if abs(k - 1.0) < 1e-6:
        return
    me = obj.data
    P = get_coords(obj)
    vi = np.zeros(len(me.loops), dtype=np.int64)
    me.loops.foreach_get("vertex_index", vi)
    uvl = me.uv_layers.active.data
    uv = np.zeros(len(me.loops) * 2)
    uvl.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2)
    left = P[vi][:, 0] > 0
    for mask, c in ((left, (0.705, 0.707)), (~left, (0.293, 0.299))):
        c = np.array(c)
        uv[mask] = c + (uv[mask] - c) / k
    uvl.foreach_set("uv", uv.ravel())


def add_proxy(basemesh, kind, mhclo_path, name):
    """Adiciona um asset .mhclo (olhos, cilios, etc) com rigging, sem material, sem subdiv."""
    deselect_all()
    obj = HumanService.add_mhclo_asset(
        mhclo_path, basemesh, asset_type=kind, subdiv_levels=0, material_type="NONE",
        set_up_rigging=True, interpolate_weights=True, import_subrig=False, import_weights=True)
    obj.name = name
    obj.data.name = name
    mh = Mhclo()
    mh.load(mhclo_path)
    return obj, mh


# --------------------------------------------------------------------------------------
# build
# --------------------------------------------------------------------------------------
def build(args):
    ctx = Ctx()
    st = json.load(open(args["style"], "r", encoding="utf-8"))
    ctx.style = st
    ctx.args = args

    bpy.ops.wm.read_factory_settings(use_empty=True)
    addon_utils.enable("bl_ext.blender_org.mpfb", default_set=True)

    # 1. humano ------------------------------------------------------------------------
    md = TargetService.get_default_macro_info_dict()
    h = HumanService.create_human(mask_helpers=False, detailed_helpers=True, extra_vertex_groups=False,
                                  macro_detail_dict=md, feet_on_ground=False)
    n = len(h.data.vertices)
    log("humano criado", n, "verts")
    ctx.groups = add_target_groups(vertex_groups_as_indices(h))
    ctx.adj = build_adjacency(h)

    # base neutra = chave Basis
    basis = np.zeros(n * 3)
    h.data.shape_keys.key_blocks["Basis"].data.foreach_get("co", basis)
    ctx.basis = basis.reshape(-1, 3).copy()
    # remove todas as shape keys (vamos "assar" nossas posicoes)
    h.shape_key_clear()
    h.name = "Body"
    h.data.name = "Body"
    for m in list(h.modifiers):
        h.modifiers.remove(m)

    # 2. estilo ------------------------------------------------------------------------
    Pm = apply_targets(macro_positions(ctx.basis, st['macros']), st['targets'])
    lmm = landmarks(Pm, ctx.groups)
    bz = Pm[ctx.groups['body']]
    log('landmarks pre-ops:', {k: [round(float(x), 3) for x in v] for k, v in lmm.items()}, 'topo z', round(float(bz[:, 2].max()), 3), 'min z', round(float(bz[:, 2].min()), 3))
    P0 = pipeline(ctx)
    P0, frozen = finalize(ctx, P0)
    ctx.frozen = frozen
    set_coords(h, P0)
    ctx.P0 = P0
    ctx.body = h
    log("estilo aplicado; escala de altura", round(frozen[0], 4))
    lmf = landmarks(P0, ctx.groups)
    top = P0[ctx.groups["body"]][:, 2].max()
    cz = lmf["chin"][2]
    hh = top - cz
    fr = lambda z: round(float((z - cz) / hh), 3)
    log("cabeca h=%.3f; fracoes (do queixo): olho %s nariz %s labio_sup %s labio_inf %s | largura rosto na linha dos olhos %.3f" % (
        hh, fr(lmf["eye_l"][2]), fr(lmf["nose_tip"][2]), fr(lmf["lip_u"][2]), fr(lmf["lip_l"][2]),
        float(np.ptp(P0[ctx.groups["body"]][np.abs(P0[ctx.groups["body"]][:, 2] - lmf["eye_l"][2]) < 0.004][:, 0]))))

    # 3. rig ---------------------------------------------------------------------------
    rig = HumanService.add_builtin_rig(h, st["rig"], import_weights=True)
    rig.name = "Armature"
    rig.data.name = "Armature"
    ctx.rig = rig
    log("rig", st["rig"], len(rig.data.bones), "ossos")

    # 4. proxies -----------------------------------------------------------------------
    proxies = {}  # nome -> (obj, mhclo)
    eyes_mhclo = user_asset("eyes/%s/%s.mhclo" % (st["eyes_mesh"], st["eyes_mesh"]))
    proxies["Eyes"] = add_proxy(h, "Eyes", eyes_mhclo, "Eyes")
    scale_eye_uvs(proxies["Eyes"][0], st.get("iris_scale", 1.0))
    lash = user_asset("eyelashes/%s/%s.mhclo" % (st["eyelashes"], st["eyelashes"]))
    proxies["Eyelashes"] = add_proxy(h, "Eyelashes", lash, "Eyelashes")
    brow = user_asset("eyebrows/%s/%s.mhclo" % (st["eyebrows"], st["eyebrows"]))
    proxies["Eyebrows"] = add_proxy(h, "Eyebrows", brow, "Eyebrows")
    if st.get("hair"):
        hair = user_asset("hair/%s/%s.mhclo" % (st["hair"], st["hair"]))
        proxies["Hair"] = add_proxy(h, "Hair", hair, "Hair_" + st["hair"])
    # conferencia: meu fit == fit do MPFB
    for k, (o, mh) in proxies.items():
        mine = fit_proxy(mh, P0)
        cur = get_coords(o)
        err = np.abs(mine - cur).max()
        log("proxy", k, len(cur), "verts, erro de fit", round(float(err), 6))
    ctx.proxies = proxies
    # expressao: cilios menores e sobrancelhas com a ponta interna levemente elevada (olhar suave, nao bravo)
    lmf2 = landmarks(P0, ctx.groups)
    ls = st.get("lash_scale", 1.0)
    if ls != 1.0:
        o = proxies["Eyelashes"][0]
        C = get_coords(o)
        cx, cz = abs(float(lmf2["eye_l"][0])), float(lmf2["eye_l"][2])
        sg = np.sign(C[:, 0])
        C[:, 0] = sg * (cx + (np.abs(C[:, 0]) - cx) * ls)
        C[:, 2] = cz + (C[:, 2] - cz) * ls
        set_coords(o, C)
    bt = st.get("brow_tilt", 0.0)
    if bt:
        o = proxies["Eyebrows"][0]
        C = get_coords(o)
        C[:, 2] += bt * (0.06 - np.abs(C[:, 0]))
        set_coords(o, C)

    # 5. morphs ------------------------------------------------------------------------
    morph_specs = st["morphs"]
    deltas_body = {}
    deltas_proxy = {k: {} for k in proxies}
    for name, spec in morph_specs.items():
        variant = {"macros": spec.get("macros", {}), "targets": spec.get("targets", {}), "ops": spec.get("ops", [])}
        P1 = pipeline(ctx, variant)
        P1, _ = finalize(ctx, P1, frozen)
        deltas_body[name] = P1 - P0
        for k, (o, mh) in proxies.items():
            deltas_proxy[k][name] = fit_proxy(mh, P1) - fit_proxy(mh, P0)
    log("morphs calculados:", len(morph_specs))
    ctx.deltas_body_full = deltas_body
    if st.get("doll_smooth"):
        lm_chk = landmarks(P0, ctx.groups)
        bust_tip_metric(P0, ctx.groups, lm_chk, "base")
        for mn in ("bustBig", "bustSmall", "weightUp"):
            if mn in deltas_body:
                bust_tip_metric(P0 + deltas_body[mn], ctx.groups, lm_chk, mn + "=1")

    # 6. remove geometria auxiliar do MakeHuman ---------------------------------------
    body_idx = ctx.groups["body"]
    keep = np.zeros(n, dtype=bool)
    keep[body_idx] = True
    kept = np.nonzero(keep)[0]
    delete_vertices_not_in(h, keep)
    log("helpers removidos:", n, "->", len(h.data.vertices), "verts")
    bone_names = {b.name for b in rig.data.bones}
    strip_vertex_groups(h, bone_names)
    for k, (o, mh) in proxies.items():
        strip_vertex_groups(o, bone_names)
        o.parent = rig
        o.parent_type = "OBJECT"
        # garante modificador armature apenas 1x
        arms = [m for m in o.modifiers if m.type == "ARMATURE"]
        for m in o.modifiers:
            if m.type != "ARMATURE":
                o.modifiers.remove(m)
        if not arms:
            mod = o.modifiers.new("Armature", "ARMATURE")
            mod.object = rig
    for m in list(h.modifiers):
        if m.type != "ARMATURE":
            h.modifiers.remove(m)

    # 7. shape keys --------------------------------------------------------------------
    body_names = add_shape_keys(h, {k: v[kept] for k, v in deltas_body.items()})
    ctx.morph_names = {"Body": body_names}
    for k, (o, mh) in proxies.items():
        ctx.morph_names[k] = add_shape_keys(o, deltas_proxy[k])
    log("shape keys corpo:", len(body_names))
    ctx.kept = kept
    ctx.deltas_body = {k: v[kept] for k, v in deltas_body.items()}
    ctx.deltas_proxy = deltas_proxy

    # 8. materiais ---------------------------------------------------------------------
    build_materials(ctx)

    # normais suaves
    for o in [h] + [p[0] for p in proxies.values()]:
        for poly in o.data.polygons:
            poly.use_smooth = True
    return ctx


def raster_uv_triangles(uvs, size):
    """Mascara (size x size, origem embaixo como o Blender) com os triangulos UV pintados."""
    m = np.zeros((size, size), dtype=bool)
    for tri in uvs:
        p = tri * size
        x0, y0 = np.floor(p.min(0)).astype(int) - 1
        x1, y1 = np.ceil(p.max(0)).astype(int) + 1
        x0, y0 = max(x0, 0), max(y0, 0)
        x1, y1 = min(x1, size - 1), min(y1, size - 1)
        if x1 <= x0 or y1 <= y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        d = (p[1, 1] - p[2, 1]) * (p[0, 0] - p[2, 0]) + (p[2, 0] - p[1, 0]) * (p[0, 1] - p[2, 1])
        if abs(d) < 1e-9:
            continue
        a = ((p[1, 1] - p[2, 1]) * (gx - p[2, 0]) + (p[2, 0] - p[1, 0]) * (gy - p[2, 1])) / d
        b = ((p[2, 1] - p[0, 1]) * (gx - p[2, 0]) + (p[0, 0] - p[2, 0]) * (gy - p[2, 1])) / d
        c = 1 - a - b
        m[y0:y1 + 1, x0:x1 + 1] |= (a >= -0.02) & (b >= -0.02) & (c >= -0.02)
    return m


def gauss_blur(a, sigma):
    """Blur gaussiano por FFT (a: HxW ou HxWxC)."""
    h, w = a.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    k = np.exp(-2.0 * (np.pi * sigma) ** 2 * (fx ** 2 + fy ** 2))
    if a.ndim == 2:
        return np.fft.ifft2(np.fft.fft2(a) * k).real
    return np.stack([np.fft.ifft2(np.fft.fft2(a[..., i]) * k).real for i in range(a.shape[2])], axis=-1)


def doll_regions(ctx):
    """Vertices (indices da malha final do corpo) das regioes a "limpar" na textura: bico/auréola do peito,
    virilha (frente) e sulco dos gluteos (costas). Em metros, escala final."""
    P = get_coords(ctx.body)
    lm = landmarks(ctx.P0, ctx.groups)
    pz, py = float(lm["pelvis"][2]), float(lm["pelvis"][1])
    reg = np.zeros(len(P), dtype=bool)
    sc, zmin = ctx.frozen
    for (tx, tz) in ctx.bust_tips:  # posicao da papila ANTES da suavizacao, em escala final
        d = np.hypot(P[:, 0] - tx * sc, P[:, 2] - (tz - zmin) * sc)
        reg |= (d < 0.045) & (P[:, 1] < -0.1)
    sel = (np.abs(P[:, 0]) < 0.004) & (P[:, 2] < pz + 0.1) & (P[:, 2] > pz - 0.3)
    cz = float(P[sel][:, 2].min())
    zr = (P[:, 2] > cz - 0.03) & (P[:, 2] < cz + 0.125)
    reg |= zr & (np.abs(P[:, 0]) < 0.06) & (P[:, 1] < py - 0.03)
    reg |= (P[:, 2] > cz - 0.03) & (P[:, 2] < cz + 0.15) & (np.abs(P[:, 0]) < 0.065) & (P[:, 1] > py + 0.03)
    return reg


def clean_skin_texture(ctx, path, size):
    """Apaga da textura de pele (inpaint com a cor vizinha) os detalhes anatomicos pintados (areolas, virilha,
    sulco): o corpo fica liso como uma boneca de moda. Regrava o arquivo e devolve a imagem recarregada."""
    me = ctx.body.data
    me.calc_loop_triangles()
    reg = doll_regions(ctx)
    uv = np.zeros(len(me.loops) * 2)
    me.uv_layers.active.data.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2)
    tris = [t for t in me.loop_triangles if reg[t.vertices[0]] and reg[t.vertices[1]] and reg[t.vertices[2]]]
    mask = raster_uv_triangles([uv[list(t.loops)] for t in tris], size)
    # dilata um pouco para cobrir a transicao da auréola
    mask = gauss_blur(mask.astype(np.float64), 7.0) > 0.1
    log("textura: pixels apagados", int(mask.sum()), "triangulos", len(tris))
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    a = np.zeros(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    a = a.reshape(h, w, 4).astype(np.float64)
    keep = (~mask).astype(np.float64)
    # preenchimento multi-escala: sigma pequeno onde ha vizinhanca, maior onde a regiao e grande
    fill = None
    for sg in (120.0, 40.0, 10.0):
        num = gauss_blur(a[..., :3] * keep[..., None], sg)
        den = gauss_blur(keep, sg)[..., None]
        f = num / np.maximum(den, 1e-4)
        fill = f if fill is None else np.where(den > 0.03, f, fill)
    feather = np.clip(gauss_blur(mask.astype(np.float64), 2.5) * 1.6, 0.0, 1.0)[..., None]
    a[..., :3] = a[..., :3] * (1 - feather) + fill * feather
    img.pixels.foreach_set(a.astype(np.float32).ravel())
    img.update()
    scene = bpy.context.scene
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = ctx.style.get("skin_jpeg_quality", 88)
    scene.render.image_settings.color_mode = "RGB"
    img.save_render(path, scene=scene)
    bpy.data.images.remove(img)
    return bpy.data.images.load(path, check_existing=False)


def build_materials(ctx):
    st = ctx.style
    cache = ctx.args["cache_dir"]
    h = ctx.body
    skin_dir = user_asset("skins/%s" % st["skin"])
    png = [f for f in os.listdir(skin_dir) if f.endswith(".png")][0]
    skin_img = load_image_resized(os.path.join(skin_dir, png), cache, "skin_" + st["skin"], st["skin_texture_size"],
                                  "JPEG", st.get("skin_jpeg_quality", 88))
    if st.get("doll_smooth"):
        skin_img = clean_skin_texture(ctx, os.path.join(cache, "skin_" + st["skin"] + ".jpg"), skin_img.size[0])
        skin_img.name = "skin_" + st["skin"] + ".jpg"
    tint = st.get("skin_tint", [1, 1, 1, 1])
    mat = make_material("Skin", skin_img, roughness=st.get("skin_roughness", 0.55), specular=0.3,
                        tint=None if tint == [1, 1, 1, 1] else tint)
    set_single_material(h, mat)
    ctx.skin_mat = mat
    ctx.skin_size = [int(skin_img.size[0]), int(skin_img.size[1])]

    eye_png = user_asset("eyes/materials/%s_eye.png" % st["eye_color"])
    eye_img = load_image_resized(eye_png, cache, "eye_" + st["eye_color"], 512, "PNG")
    set_single_material(ctx.proxies["Eyes"][0], make_material("Eyes", eye_img, roughness=0.35, specular=0.2))
    lash_png = user_asset("eyelashes/%s/%s.png" % (st["eyelashes"], st["eyelashes"]))
    lash_img = load_image_resized(lash_png, cache, "lash_" + st["eyelashes"], 512, "PNG")
    set_single_material(ctx.proxies["Eyelashes"][0],
                        make_material("Eyelashes", lash_img, alpha=True, alpha_clip=0.5, double_sided=True, roughness=0.8))
    brow_png = user_asset("eyebrows/%s/%s.png" % (st["eyebrows"], st["eyebrows"]))
    brow_img = load_image_resized(brow_png, cache, "brow_" + st["eyebrows"], 512, "PNG")
    set_single_material(ctx.proxies["Eyebrows"][0],
                        make_material("Eyebrows", brow_img, alpha=True, alpha_clip=0.4, double_sided=True, roughness=0.9))
    if "Hair" in ctx.proxies:
        hd = user_asset("hair/%s" % st["hair"])
        hpng = [f for f in os.listdir(hd) if f.endswith(".png")][0]
        hair_img = load_image_resized(os.path.join(hd, hpng), cache, "hair_" + st["hair"], 1024, "PNG")
        set_single_material(ctx.proxies["Hair"][0],
                            make_material("Hair", hair_img, alpha=True, alpha_clip=0.4, double_sided=True, roughness=0.5,
                                          tint=st.get("hair_tint")))
        ctx.hair_img = hair_img


# --------------------------------------------------------------------------------------
# exportacao
# --------------------------------------------------------------------------------------
def export_glb(ctx, objs, path, extras=None):
    deselect_all()
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    kw = dict(
        filepath=path, export_format="GLB", use_selection=True, export_apply=False,
        export_yup=True, export_texcoords=True, export_normals=True, export_materials="EXPORT",
        export_skins=True, export_animations=False, export_morph=True, export_morph_normal=False,
        export_morph_tangent=False, export_try_sparse_sk=True, export_image_format="AUTO",
        export_all_influences=False, export_cameras=False, export_lights=False,
    )
    kw = {k: v for k, v in kw.items() if k in props}
    for opt, val in (("export_try_omit_sparse_sk", True), ("export_active_vertex_color_when_no_material", False),
                     ("export_vertex_color", "NONE"), ("export_optimize_animation_size", True)):
        if opt in props:
            kw[opt] = val
    bpy.ops.export_scene.gltf(**kw)
    postprocess_glb(path, ctx)


def postprocess_glb(path, ctx):
    """Ajusta alphaMode dos materiais (MASK p/ cilios e sobrancelhas) e extras."""
    import struct
    with open(path, "rb") as f:
        data = f.read()
    magic, version, length = struct.unpack("<4sII", data[:12])
    off = 12
    chunks = []
    while off < len(data):
        clen, ctype = struct.unpack("<I4s", data[off:off + 8])
        chunks.append([ctype, data[off + 8: off + 8 + clen]])
        off += 8 + clen
    js = json.loads(chunks[0][1].decode("utf-8"))
    for m in js.get("materials", []):
        nm = m.get("name", "")
        if nm in ("Eyelashes", "Eyebrows", "Hair"):
            m["alphaMode"] = "MASK"
            m["alphaCutoff"] = {"Eyelashes": 0.5, "Eyebrows": 0.4, "Hair": 0.4}[nm]
            m["doubleSided"] = True
        if nm == "Eyes":
            m["doubleSided"] = False
    new_json = json.dumps(js, separators=(",", ":")).encode("utf-8")
    new_json += b" " * ((4 - len(new_json) % 4) % 4)
    chunks[0][1] = new_json
    body = b"".join(struct.pack("<I4s", len(c[1]), c[0]) + c[1] for c in chunks)
    with open(path, "wb") as f:
        f.write(struct.pack("<4sII", magic, version, 12 + len(body)) + body)
    return js


def glb_report(path):
    import struct
    with open(path, "rb") as f:
        data = f.read()
    clen, ctype = struct.unpack("<I4s", data[12:20])
    js = json.loads(data[20:20 + clen].decode("utf-8"))
    return js, len(data)


def proxy_bone_report(obj):
    """Osso dominante dos vertices de um proxy (para conferir que olhos/cilios/sobrancelhas seguem a cabeca)."""
    names = {g.index: g.name for g in obj.vertex_groups}
    cnt = {}
    for v in obj.data.vertices:
        if not v.groups:
            cnt["(sem peso)"] = cnt.get("(sem peso)", 0) + 1
            continue
        g = max(v.groups, key=lambda x: x.weight)
        cnt[names[g.group]] = cnt.get(names[g.group], 0) + 1
    return cnt


def inspect_glb(js):
    out = {"meshes": [], "skins": [], "materials": [m.get("name") for m in js.get("materials", [])]}
    for m in js.get("meshes", []):
        p = m["primitives"][0]
        out["meshes"].append({"name": m.get("name"), "targets": len(p.get("targets", [])),
                              "targetNames": m.get("extras", {}).get("targetNames", [])})
    for sk in js.get("skins", []):
        out["skins"].append({"joints": len(sk["joints"])})
    out["images"] = [{"name": i.get("name"), "mime": i.get("mimeType")} for i in js.get("images", [])]
    out["accessorSparse"] = sum(1 for a in js.get("accessors", []) if "sparse" in a)
    return out


def count_geo(objs):
    tv = tt = 0
    per = {}
    for o in objs:
        me = o.data
        me.calc_loop_triangles()
        t = len(me.loop_triangles)
        per[o.name] = (len(me.vertices), t)
        tv += len(me.vertices)
        tt += t
    return tv, tt, per


def write_metadata(ctx, path, glb_size, report):
    st = ctx.style
    zs = get_coords(ctx.body)[:, 2]
    height = float(zs.max() - zs.min())
    meta = {
        "name": st["name"],
        "file": "base_female.glb",
        "heightMeters": round(height, 4),
        "headHeightMeters": round(ctx.head_height, 4),
        "headToBodyRatio": round(ctx.head_height / height, 4),
        "skeleton": {"type": st["rig"], "boneCount": len(ctx.rig.data.bones),
                     "bones": [b.name for b in ctx.rig.data.bones],
                     "note": "Nomes Mixamo; o GLTFLoader do three.js remove ':' (mixamorigHips...), igual ao FBXLoader."},
        "meshes": {k: v for k, v in ctx.morph_names.items() if k != "Hair"},
        "morphs": [],
        "triangles": report["triangles"],
        "vertices": report["vertices"],
        "glbBytes": glb_size,
        "skinTexture": {"width": ctx.skin_size[0], "height": ctx.skin_size[1], "note": "textura de pele embutida no GLB (material Skin); UVs abaixo sao para ela"},
        "optionalAssets": {"hair": "base_female_hair_%s.glb" % st.get("hair", ""),
                           "outfit": ["outfit_basic_top.glb", "outfit_basic_shorts.glb"]},
        "uvLandmarks": ctx.uv_landmarks,
        "license": "CC0 (MakeHuman system assets + MPFB targets)",
    }
    for name, spec in st["morphs"].items():
        meta["morphs"].append({
            "name": name, "labelPt": spec.get("label", name), "group": spec.get("group", ""),
            "min": 0.0, "max": 1.0, "default": 0.0,
            "meshes": [k for k, v in ctx.morph_names.items() if name in v and k != "Hair"],
        })
    with open(path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)


def measure_head(ctx):
    """Altura da cabeca (topo - queixo) na malha final; queixo = vertice central mais baixo na frente do rosto."""
    P = get_coords(ctx.body)
    top = P[:, 2].max()
    lm = landmarks(ctx.P0, ctx.groups)
    sel = (np.abs(ctx.P0[:, 0]) < 0.006) & (ctx.P0[:, 1] < lm["head"][1] - 0.07 * ctx.frozen[0]) & (ctx.P0[:, 2] < lm["eye_l"][2]) & (ctx.P0[:, 2] > lm["neck"][2])
    sel &= np.isin(np.arange(len(ctx.P0)), ctx.groups["body"])
    chin_z = ctx.P0[sel][:, 2].min()
    return float(top - chin_z)


def main():
    args = parse_args()
    ctx = build(args)
    st = ctx.style
    ctx.head_height = measure_head(ctx)
    import uv_landmarks
    ctx.uv_landmarks = uv_landmarks.compute(ctx)
    log("uvLandmarks calculados: olhos", list(ctx.uv_landmarks["eyes"]["l"].keys()))
    import preview_render
    ctx.outfit = preview_render.build_outfit(ctx)
    main_objs = [ctx.rig, ctx.body] + [ctx.proxies[k][0] for k in ("Eyes", "Eyelashes", "Eyebrows")]
    tv, tt, per = count_geo(main_objs[1:])
    log("geometria:", per, "total verts", tv, "tris", tt)
    log("altura cabeca %.3f m (%.2f do corpo)" % (ctx.head_height, ctx.head_height / st["target_height_m"]))

    if args["export"]:
        os.makedirs(args["out_dir"], exist_ok=True)
        glb = os.path.join(args["out_dir"], "base_female.glb")
        export_glb(ctx, main_objs, glb)
        js, size = glb_report(glb)
        log("GLB", glb, size, "bytes")
        rep = inspect_glb(js)
        log("GLB conteudo:", json.dumps(rep, ensure_ascii=False))
        for k in ("Eyes", "Eyelashes", "Eyebrows"):
            log("pesos de", k, "->", proxy_bone_report(ctx.proxies[k][0]))
        write_metadata(ctx, os.path.join(args["out_dir"], "base_female.json"), size, {"triangles": tt, "vertices": tv})
        if "Hair" in ctx.proxies:
            hair_glb = os.path.join(args["out_dir"], "base_female_hair_%s.glb" % st["hair"])
            export_glb(ctx, [ctx.rig, ctx.proxies["Hair"][0]], hair_glb)
            log("GLB cabelo", os.path.getsize(hair_glb), "bytes")
        for piece, fname in zip(ctx.outfit, ("outfit_basic_top.glb", "outfit_basic_shorts.glb")):
            p = os.path.join(args["out_dir"], fname)
            export_glb(ctx, [ctx.rig, piece], p)
            log("GLB roupa", fname, os.path.getsize(p), "bytes", inspect_glb(glb_report(p)[0])["meshes"])
    if args["render"]:
        import preview_render
        preview_render.run(ctx, args)
    return ctx, args


if __name__ == "__main__":
    main()
