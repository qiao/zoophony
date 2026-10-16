#!/bin/zsh
# Rigs the fox with each tail bind (tailBind of tools/mesh-rigs/fox.json) and probes the tail at the
# chair back with seat-probe.ts. It writes the rig and the module of the fox, so run it on a clean
# tree and restore them after. The output is tail-variants.txt.
set -o pipefail
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/seat-rest
for v in "-0.12 -1.4" "-0.27 -1.2" "-0.36 -1.0" "-0.47 -0.84" "-0.58 -0.7"; do
  a=${v% *}; b=${v#* }
  cp scratch/fox.json.keep tools/mesh-rigs/fox.json
  perl -0pi -e "s/\"tail\": \[0, -0\.12, -1\],/\"tail\": [0, $a, -1],/; s/\"tail_tip\": \[0, -1\.4, -1\]/\"tail_tip\": [0, $b, -1]/" tools/mesh-rigs/fox.json
  grep -c "\"tail\": \[0, $a, -1\]" tools/mesh-rigs/fox.json >/dev/null || { echo "edit failed $v"; exit 1; }
  pnpm -s rig-mesh fox > scratch/rig-fox-tail.log 2>&1 || { echo "rig failed $v"; exit 1; }
  pnpm -s studio-body fox > /dev/null 2>&1 || { echo "sb failed $v"; exit 1; }
  echo "tail $a tip $b"
  grep "chair: the tail\|tail: the lowest\|faces turn over" scratch/rig-fox-tail.log
  node docs/research/2026-10-16-seat-rest/seat-probe.ts | grep -A9 '^fox-red' | grep 'tail at\|seat 1\|lowest'
done
cp scratch/fox.json.keep tools/mesh-rigs/fox.json
