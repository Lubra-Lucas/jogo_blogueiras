"""Mede a qualidade dos morphs de formato (f_*) lendo os alvos do proprio GLB: triangulos invertidos, triangulos esmagados, estiramento das regioes
do olho e da boca (onde vivem as camadas), auto-interseccao (BVH do Blender) e acha a FAIXA SEGURA de cada morph (0..1).
Escreve tools/blender/facemorph/safe_<genero>.json e src/shared/faceShapeRanges.ts.
Uso: python tools/blender/facemorph/check_face_morphs.py [female|male|both] [--combos N]   (Python + numpy + Blender 5.2)"""
import json, os, subprocess, sys, tempfile
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "..", "doll"))
from glbtool import Glb, CT
from fm_lib import Head, LM

REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
CH = os.path.join(REPO, "public", "assets", "characters")
GLB = {"female": os.path.join(CH, "doll_layers.glb"), "male": os.path.join(CH, "male", "male_base.glb")}
BLENDER = os.environ.get("BL", "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe")

# controles bipolares (mais, menos) e simples, como no editor (src/shared/faceLayers.ts); so para sortear combinacoes
NATURAL = {
    "female": [("f_jawWide", "f_jawSoft"), ("f_jawAngular", None), ("f_jawV", None), ("f_chinWide", "f_chinPointed"), ("f_chinForward", "f_chinBack"), ("f_chinCleft", None),
               ("f_cheekboneHigh", None), ("f_cheekFull", "f_cheekHollow"), ("f_noseWide", "f_noseNarrow"), ("f_noseLong", "f_noseShort"), ("f_noseBridge", None),
               ("f_noseUp", "f_noseDown"), ("f_noseTipRound", "f_noseTipThin"), ("f_nostrilWide", None), ("f_lipsFull", "f_lipsThin"), ("f_lipUpperFull", None),
               ("f_lipLowerFull", None), ("f_lipsWide", "f_lipsNarrow"), ("f_mouthCornersUp", "f_mouthCornersDown"), ("f_mouthHigh", "f_mouthLow"),
               ("f_browRidge", None), ("f_foreheadHigh", "f_foreheadLow"), ("f_faceLong", "f_faceShort"), ("f_faceWide", None), ("f_headLong", "f_headRound"),
               ("f_eyesApart", "f_eyesClose"), ("f_eyesHigh", "f_eyesLow"), ("f_eyeTiltUp", "f_eyeTiltDown"), ("f_earsBig", "f_earsSmall"), ("f_earsPointed", None),
               ("f_neckThick", "f_neckThin")],
}
NATURAL["male"] = NATURAL["female"] + [("f_adamsApple", None)]
NATURAL["male"] = [(a, b) for a, b in NATURAL["male"]]
FUN = ["f_fun_chubbyCheeks", "f_fun_longChin", "f_fun_tinyFace", "f_fun_bigEyesArea", "f_fun_elfEars", "f_fun_roundNose", "f_fun_pout", "f_fun_widejaw", "f_fun_heartFace",
       "f_fun_alienSoft"]
EYE_RATIO = (0.4, 3.2); MOUTH_RATIO = (0.4, 2.5)
# A malha tem ~250 pares de triangulos sobrepostos JA em repouso (dobras do temporal/hinge da mandibula/orelha, cobertos por cabelo/orelha) e os morphs
# antigos (ja aprovados) criam +20..40 pares nessa zona sem nada visivel. Limite de interseccoes NOVAS: o dobro disso (single) e 3x (combinacoes).
OV_SINGLE = 70; OV_COMBO = 110


def read_targets(g):
    P, N, UV, IDX = g.mesh(); n = len(P); mesh = g.J["meshes"][0]
    names = mesh["extras"]["targetNames"]; out = {}
    for nm, t in zip(names, g.prim()["targets"]):
        if not nm.startswith("f_"): continue
        a = g.J["accessors"][t["POSITION"]]
        D = np.zeros((n, 3), np.float64)
        if "sparse" in a:
            sp = a["sparse"]
            ict = CT[sp["indices"]["componentType"]]
            idx = np.frombuffer(bytes(g.views[sp["indices"]["bufferView"]]), ict)[:sp["count"]].astype(np.int64)
            val = np.frombuffer(bytes(g.views[sp["values"]["bufferView"]]), np.float32)[:sp["count"] * 3].reshape(-1, 3)
            D[idx] = val
        else:
            D = g.acc(t["POSITION"]).astype(np.float64)
        out[nm] = D
    return P, N, IDX, out


def tri_geom(P, T):
    a, b, c = P[T[:, 0]], P[T[:, 1]], P[T[:, 2]]
    cr = np.cross(b - a, c - a)
    ar = np.linalg.norm(cr, axis=1) * 0.5
    return cr, ar


def run(gender, ncombo=300):
    g = Glb(GLB[gender]); P, N, IDX, tg = read_targets(g)
    h = Head(P, N, IDX, gender); L = h.L; inv = h.inv
    first = np.zeros(h.n, np.int64); first[inv] = np.arange(len(inv))      # um indice original por vertice soldado
    names = sorted(tg)
    Dw = np.stack([tg[k][first] for k in names]).astype(np.float64)       # (K, n, 3) nos vertices soldados
    # cabeca: triangulos acima do pescoco baixo
    ylim = L["chinY"] - 0.07
    T = h.T; head = (h.U[T][:, :, 1] > ylim).all(1) & (np.abs(h.U[T][:, :, 0]) < 0.25).all(1)
    # so triangulos VISIVEIS (de frente para a normal do vertice) e nao microscopicos: as fitas dos cilios/palpebras assentadas na pele (flatten_eyes)
    # tem area < 3 mm2, ficam coplanares/invertidas e sao cobertas pela camada do olho; contar elas so geraria falso positivo
    cr_, ar_ = tri_geom(h.U, T); vn_ = h.NU[T].mean(1)
    head &= ((cr_ * vn_).sum(1) / np.maximum(np.linalg.norm(cr_, axis=1), 1e-12) > 0.3) & (ar_ > 1.2e-5)
    Th = T[head]; used = np.unique(Th); remap = -np.ones(h.n, np.int64); remap[used] = np.arange(len(used))
    Th = remap[Th]; Uh = h.U[used]; Dh = Dw[:, used]
    cr0, ar0 = tri_geom(Uh, Th)
    cen = Uh[Th].mean(1)
    big = ar0 > 1.2e-5
    eye = (np.abs(np.abs(cen[:, 0]) - L["eyeX"]) < 0.03) & (np.abs(cen[:, 1] - L["eyeY"]) < 0.02) & (cen[:, 2] > L["fz0"])
    mouth = (np.abs(cen[:, 0]) < 0.035) & (np.abs(cen[:, 1] - L["mouthY"]) < 0.015) & (cen[:, 2] > L["fz0"])
    print(f"[{gender}] cabeca: {len(used)} verts, {len(Th)} tris; olho {eye.sum()} tris, boca {mouth.sum()} tris; morphs {len(names)}")

    def metrics(w):
        Pn = Uh + np.tensordot(w, Dh, axes=(0, 0))
        cr, ar = tri_geom(Pn, Th)
        dot = (cr * cr0).sum(1)
        flips = int(((dot < 0) & big).sum())
        ratio = np.where(big, ar / np.maximum(ar0, 1e-12), 1.0)
        er = float(ar[eye].sum() / ar0[eye].sum()); mr = float(ar[mouth].sum() / ar0[mouth].sum())
        return dict(flips=flips, minRatio=float(ratio.min()), maxRatio=float(ratio.max()), eye=er, mouth=mr)

    # ---- testes: cada morph sozinho em varios pesos + combinacoes
    rng = np.random.default_rng(7)
    nat = [(a, b) for a, b in NATURAL[gender] if a in tg and (b is None or b in tg)]
    ix = {k: i for i, k in enumerate(names)}
    tests = []; meta = []
    WS = [1.0, 0.85, 0.7, 0.55, 0.4, 0.25]
    for k in names:
        if k == "f_maleBase": continue
        for wv in WS:
            w = np.zeros(len(names)); w[ix[k]] = wv; tests.append(w); meta.append(("single", k, wv))
    nsingle = len(tests)
    return h, names, ix, nat, Uh, Th, Dh, metrics, tests, meta, nsingle, rng, eye, mouth, ar0


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    which = args[0] if args else "both"
    ncombo = int(sys.argv[sys.argv.index("--combos") + 1]) if "--combos" in sys.argv else 300
    allsafe = {}
    for gender in (["female", "male"] if which == "both" else [which]):
        h, names, ix, nat, Uh, Th, Dh, metrics, tests, meta, nsingle, rng, eye, mouth, ar0 = run(gender, ncombo)
        # 1) por morph
        td = tempfile.mkdtemp()
        npz = os.path.join(td, "in.npz"); js = os.path.join(td, "out.json")

        def blender(tt):
            np.savez(npz, U=Uh, T=Th, deltas=Dh, W=np.array(tt))
            r = subprocess.run([BLENDER, "-b", "--factory-startup", "-noaudio", "--python", os.path.join(HERE, "bl_overlap.py"), "--", npz, js], capture_output=True, text=True)
            if not os.path.exists(js): print(r.stdout[-800:], r.stderr[-800:]); raise SystemExit("blender falhou")
            return json.load(open(js))

        ov = blender(tests)
        base = ov["base"]; print(f"[{gender}] pares sobrepostos em repouso: {base}")
        safe = {}; rows = {}
        for (kind, k, wv), w, o in zip(meta, tests, ov["new"]):
            m = metrics(w)
            ok = m["flips"] == 0 and o <= OV_SINGLE and m["minRatio"] > 0.15 and (EYE_RATIO[0] <= m["eye"] <= (3.2 if k == "f_fun_bigEyesArea" else EYE_RATIO[1])) and MOUTH_RATIO[0] <= m["mouth"] <= MOUTH_RATIO[1]
            rows.setdefault(k, []).append((wv, ok, m, o))
        for k, lst in rows.items():
            best = 0.0
            for wv, ok, m, o in sorted(lst, key=lambda r: -r[0]):
                if ok: best = wv; break
            safe[k] = best
            if best < 1.0:
                bad = [r for r in lst if r[0] == 1.0][0]
                print(f"  {k:22s} safeMax {best}  (w=1: flips {bad[2]['flips']} ov {bad[3]} minRatio {bad[2]['minRatio']:.2f} olho {bad[2]['eye']:.2f} boca {bad[2]['mouth']:.2f})")
        print(f"[{gender}] morphs com safeMax < 1: {[k for k, v in safe.items() if v < 1.0]}")
        # 2) combinacoes aleatorias (natural / extremo / natural+divertido) com os pesos limitados pela faixa segura; se muitas falharem, aperta a faixa do culpado
        def gen_combos(safe, seed):
            rg = np.random.default_rng(seed); combos = []; kinds = []
            for c in range(ncombo):
                w = np.zeros(len(names)); mode = c % 3
                pool = list(range(len(nat)))
                if mode == 0: k_ = rg.integers(3, 6); mag = lambda: rg.uniform(0.35, 1.0)
                elif mode == 1: k_ = rg.integers(7, 12); mag = lambda: 1.0
                else: k_ = rg.integers(3, 6); mag = lambda: rg.uniform(0.6, 1.0)
                for pi in rg.choice(pool, size=min(k_, len(pool)), replace=False):
                    a, b = nat[pi]; nm_ = a if (b is None or rg.random() < 0.5) else b
                    w[ix[nm_]] = mag() * safe.get(nm_, 1.0)
                if mode == 2:
                    for fk in rg.choice(FUN, size=rg.integers(1, 3), replace=False):
                        if fk in ix: w[ix[fk]] = rg.uniform(0.6, 1.0) * safe.get(fk, 1.0)
                combos.append(w); kinds.append(["natural", "extremo", "natural+divertido"][mode])
            return combos, kinds

        def is_fail(m, o):
            return m["flips"] >= 6 or o > OV_COMBO or m["minRatio"] < 0.03 or not (0.3 <= m["eye"] <= 4.0) or not (0.3 <= m["mouth"] <= 3.0)

        for rnd in range(6):
            combos, kinds = gen_combos(safe, 1000 + rnd)
            ov2 = blender(combos)
            ms = [metrics(w) for w in combos]
            fails = [i for i, (m, o) in enumerate(zip(ms, ov2["new"])) if is_fail(m, o)]
            print(f"[{gender}] rodada {rnd}: {len(fails)}/{ncombo} combinacoes com falha")
            if len(fails) <= 0.03 * ncombo or rnd == 5: break
            tally = {}
            for i in fails:
                w = combos[i]; nz = list(np.nonzero(w)[0]); base_m = ms[i]
                best = None
                for q in nz:
                    w2 = w.copy(); w2[q] = 0; m2 = metrics(w2)
                    gain = (base_m["flips"] - m2["flips"]) + 5 * (m2["minRatio"] - base_m["minRatio"])
                    if best is None or gain > best[0]: best = (gain, q)
                if best: tally[names[best[1]]] = tally.get(names[best[1]], 0) + 1
            top = sorted(tally.items(), key=lambda kv: -kv[1])[:3]
            print("   culpados:", top)
            for k, c in top:
                if c >= 2: safe[k] = max(0.4, round(safe.get(k, 1.0) - 0.15, 2))
        bad = len(fails); agg = dict(flips=0, minRatio=9, eye=[9, 0], mouth=[9, 0], ov=0); worst = []
        for w, kd, o, m in zip(combos, kinds, ov2["new"], ms):
            agg["flips"] += m["flips"]; agg["minRatio"] = min(agg["minRatio"], m["minRatio"]); agg["ov"] = max(agg["ov"], o)
            agg["eye"] = [min(agg["eye"][0], m["eye"]), max(agg["eye"][1], m["eye"])]; agg["mouth"] = [min(agg["mouth"][0], m["mouth"]), max(agg["mouth"][1], m["mouth"])]
        for i in fails[:6]: worst.append((kinds[i], [(names[q], round(float(combos[i][q]), 2)) for q in np.nonzero(combos[i])[0]], ms[i], ov2["new"][i]))
        print(f"[{gender}] {ncombo} combinacoes (final): falhas {bad}; flips (soma) {agg['flips']}, maximo de interseccoes novas {agg['ov']}, razao minima de area {agg['minRatio']:.2f}, "
              f"area do olho {agg['eye'][0]:.2f}..{agg['eye'][1]:.2f}, area da boca {agg['mouth'][0]:.2f}..{agg['mouth'][1]:.2f}")
        for kd, ws, m, o in worst: print("   FALHA", kd, ws, {k: round(v, 2) if isinstance(v, float) else v for k, v in m.items()}, "ov", o)
        json.dump(safe, open(os.path.join(HERE, f"safe_{gender}.json"), "w"), indent=1)
        json.dump({"combos": ncombo, "fail": bad, **{k: v for k, v in agg.items()}}, open(os.path.join(HERE, f"report_{gender}.json"), "w"), indent=1)
        allsafe[gender] = safe
    ts = ["// GERADO por tools/blender/facemorph/check_face_morphs.py: faixa SEGURA (peso maximo 0..1) de cada morph de formato, medida sem triangulos invertidos,",
          "// sem auto-interseccao e sem estirar demais as regioes do olho e da boca. Nao edite a mao; rode o script de novo.",
          "export const SHAPE_SAFE_MAX: Record<'female' | 'male', Record<string, number>> = {"]
    for gnd in ("female", "male"):
        s = allsafe.get(gnd)
        if s is None:
            p = os.path.join(HERE, f"safe_{gnd}.json"); s = json.load(open(p)) if os.path.exists(p) else {}
        ts.append(f"  {gnd}: {{ " + ", ".join(f"{k}: {v}" for k, v in sorted(s.items()) if v < 1.0) + " },")
    ts.append("}")
    open(os.path.join(REPO, "src", "shared", "faceShapeRanges.ts"), "w", encoding="utf-8").write("\n".join(ts) + "\n")


if __name__ == "__main__":
    main()
