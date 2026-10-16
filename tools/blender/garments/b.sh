#!/bin/bash
cd /c/Users/user/Documents/GitHub/jogo_blogueiras/tools/blender/garments
"/c/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup -noaudio --python build_garments.py -- "$@" 2>&1 | grep --line-buffered -E "\[garm\]|Error|Traceback|File |line |rror" | grep --line-buffered -v "^\s*$" > "$LOG" 
