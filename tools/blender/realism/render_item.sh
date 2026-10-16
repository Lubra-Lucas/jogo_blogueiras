#!/bin/sh
# Renderiza o estudo do poste (game + real) e monta item_compare.png
B="C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"
D="$(cd "$(dirname "$0")" && pwd)"
OUT="${OUT:-C:/Users/user/AppData/Local/Temp/claude/shots/realism}"
SAMPLES="${SAMPLES:-256}"
mkdir -p "$OUT/parts"
"$B" -b --factory-startup -noaudio --python "$D/item_lamp.py" -- game "$OUT/parts/lamp_game.png" $SAMPLES
"$B" -b --factory-startup -noaudio --python "$D/item_lamp.py" -- real "$OUT/parts/lamp_real.png" $SAMPLES
python "$D/compose.py" "$OUT/item_compare.png" "$OUT/parts/lamp_game.png" "$OUT/parts/lamp_real.png" "ATUAL (GLB do jogo, ~950 tris, materiais lisos)" "ULTRARREALISTA (Cycles, PBR procedural)" "Poste de rua - mesma camera, mesmo ceu/sol"
