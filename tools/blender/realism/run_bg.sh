#!/bin/sh
# uso: run_bg.sh <script.py> <log> args...   (Blender em background, log em arquivo)
B="C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"
D="$(cd "$(dirname "$0")" && pwd)"
S="$1"; L="$2"; shift 2
"$B" -b --factory-startup -noaudio --python "$D/$S" -- "$@" > "$L" 2>&1
echo "EXIT" >> "$L"
