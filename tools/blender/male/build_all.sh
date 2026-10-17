#!/bin/sh
# Pipeline completo do masculino. Requer Blender 5.2 em BL. Uso: sh build_all.sh
BL="${BL:-C:/Program Files/Blender Foundation/Blender 5.2/blender.exe}"
D="$(dirname "$0")"
"$BL" -b --factory-startup -noaudio --python "$D/prepare_male.py" &&
"$BL" -b --factory-startup -noaudio --python "$D/paint_male.py" &&
"$BL" -b --factory-startup -noaudio --python "$D/rig_male.py" -- rig repose orient morphs export
