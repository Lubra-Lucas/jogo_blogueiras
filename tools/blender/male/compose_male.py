"""Compoe os renders individuais (shots/masculino/parts) em imagens lado a lado. Usage: python compose_male.py"""
import os, sys
from PIL import Image, ImageDraw
S = r"C:\Users\user\AppData\Local\Temp\claude\shots\masculino"
P = os.path.join(S, "parts")


def row(names, out, labels=None, crop=None):
    ims = [Image.open(os.path.join(P, n + ".png")).convert("RGB") for n in names]
    if crop: ims = [i.crop(crop) for i in ims]
    w, h = ims[0].size
    sheet = Image.new("RGB", (w * len(ims), h + 34), (255, 255, 255))
    d = ImageDraw.Draw(sheet)
    for k, im in enumerate(ims):
        sheet.paste(im, (k * w, 34))
        if labels: d.text((k * w + 12, 10), labels[k], fill=(20, 20, 20))
    sheet.save(os.path.join(S, out)); print(out, sheet.size)


def pair(nm, out, crop=None):
    row([f"doll_{nm}", f"male_{nm}"], out, ["Boneca atual", "Masculino (novo)"], crop)


if __name__ == "__main__":
    jobs = sys.argv[1:] or ["rest", "faces", "anim", "morphs", "orig"]
    if "rest" in jobs:
        # a primeira imagem: de frente, depois perfil, 3/4 e uma tira com as tres
        pair("rest_front", "00_primeira_lado_a_lado.png")
        pair("rest_front", "01_lado_a_lado_frente.png"); pair("rest_side", "02_lado_a_lado_perfil.png"); pair("rest_q34", "03_lado_a_lado_3quartos.png")
    if "faces" in jobs:
        row(["doll_face_front", "male_face_front", "doll_face_q34", "male_face_q34"], "04_close_rostos.png", ["Boneca", "Masculino", "Boneca 3/4", "Masculino 3/4"])
    if "anim" in jobs:
        pair("walk_normal_90", "05_andando_perfil.png"); pair("walk_normal_40", "05b_andando_3quartos.png")
        pair("stand_to_sit_90", "06_sentado_perfil.png"); pair("run_90", "07_correndo.png"); pair("desfile_40", "08_desfile.png")
        pair("wave_0", "09_bracos_levantados_wave.png"); pair("clap_0", "09b_clap.png"); pair("point_40", "09c_point.png"); pair("idle_0", "10_idle.png")
    if "morphs" in jobs:
        row([f"male_morph_{k}_front" for k in ("magro", "base", "gordo", "musculoso", "barriga")], "11_variacoes_frente.png", ["Magro", "Base", "Gordo", "Musculoso", "Barriga"])
        row([f"male_morph_{k}_q34" for k in ("magro", "base", "gordo", "musculoso", "barriga")], "11b_variacoes_3quartos.png", ["Magro", "Base", "Gordo", "Musculoso", "Barriga"])
    if "orig" in jobs:
        row(["orig_meshy_front", "prep_front"], "12_original_x_preparado.png", ["Original do Meshy (malha branca)", "Preparado (pintado)"])
        row(["orig_meshy_pelvis", "prep_pelvis"], "12b_boxer_original_x_preparado.png", ["Original: boxer faceteada", "Preparado: boxer lisa"])
        row(["orig_meshy_face", "prep_face"], "12c_rosto_original_x_preparado.png", ["Original", "Preparado"])
