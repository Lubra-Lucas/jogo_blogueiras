#!/bin/bash
# uso: stub.sh modulo id [id...]  -> cria g_<id>.py chamando modulo.<id>(body)
m=$1; shift
for i in "$@"; do printf '"""Rodada 3: ver %s.py"""\nimport %s\n\n\ndef build(body):\n    return %s.%s(body)\n' $m $m $m $i > g_$i.py; done
