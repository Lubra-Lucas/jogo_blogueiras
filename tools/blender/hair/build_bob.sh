#!/bin/sh
# Reconstroi public/assets/characters/hair_bobAuburn.glb (ver prepare_bob.py). Uso: sh tools/blender/hair/build_bob.sh [key=value ...]
set -e
B="${BLENDER:-C:/Program Files/Blender Foundation/Blender 5.2/blender.exe}"
cd "$(dirname "$0")/../../.."
python tools/blender/hair/bob_tex.py
"$B" -b --factory-startup -noaudio --python tools/blender/hair/prepare_bob.py -- "$@"
"$B" -b --factory-startup -noaudio --python tools/blender/hair_fitbake.py -- hair_bobAuburn mmin=0.0006
python tools/blender/hair/glb_quantize.py public/assets/characters/hair_bobAuburn.glb
"$B" -b --factory-startup -noaudio --python tools/blender/jewelry/hair_fit.py
