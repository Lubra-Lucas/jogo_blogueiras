"""
Mobiliario urbano "more" (rua real, toy-vinil) - Jogo das Blogueiras.   Ponto de entrada.
  blender -b -P tools/blender/city_props_more.py [-- --only a,b,c]
Saida: public/assets/city/props_more/<nome>.glb + props_more.json
Estrutura: city_props_more_lib.py (paletas reais, helpers, export) + city_props_more_a/b/c/d.py (pecas por tema).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import city_props_more_lib as lib  # noqa
import city_props_more_a  # noqa  (rua)
for _n in ("city_props_more_b", "city_props_more_c", "city_props_more_d", "city_props_more_e", "city_props_more_f", "city_props_more_g"):
    try:
        __import__(_n)
    except ModuleNotFoundError as _e:
        if _n not in str(_e):
            raise

if __name__ == "__main__":
    lib.main()
