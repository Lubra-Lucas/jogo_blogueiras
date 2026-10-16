#!/bin/sh
# doll (full) + avatar (portrait, full) em sequencia; depois monta os comparativos
D="$(cd "$(dirname "$0")" && pwd)"
OUT="${OUT:-C:/Users/user/AppData/Local/Temp/claude/shots/realism}"
mkdir -p "$OUT/parts"
sh "$D/run_bg.sh" render_doll.py "$OUT/parts/doll_log2.txt" full "$OUT/parts/doll_full.png" ${DOLL_SAMPLES:-128}
sh "$D/run_bg.sh" render_avatar.py "$OUT/parts/avatar_log.txt" portrait,full "$OUT/parts/avatar.png" ${AV_SAMPLES:-96}
python "$D/compose.py" "$OUT/avatar_portrait_compare.png" "$OUT/parts/doll_portrait.png" "$OUT/parts/avatar_portrait.png" "ATUAL (doll estilizada, GLB do jogo)" "ULTRARREALISTA (MPFB + Cycles, SSS, curves)" "Retrato - mesma luz de estudio"
python "$D/compose.py" "$OUT/avatar_full_compare.png" "$OUT/parts/doll_full.png" "$OUT/parts/avatar_full.png" "ATUAL (doll estilizada, GLB do jogo)" "ULTRARREALISTA (MPFB + Cycles, SSS, curves)" "Corpo inteiro - mesma luz de estudio"
echo ALLDONE > "$OUT/parts/all_done.txt"
