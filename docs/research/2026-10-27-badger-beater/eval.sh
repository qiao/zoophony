#!/bin/zsh
# Evaluates the variants of a file of lines <label>\t<set text>: the paw twist, the forearm angle,
# the grasp, and the depth of the upper arms.
f=$1
node docs/research/2026-10-27-badger-beater/scan.ts < $f 2>&1 | grep "twist/swing" | sed 's/twist\/swing at 2.41, 2.6, 3, 3.5, 3.55://' > $f.twist
node docs/research/2026-10-27-badger-beater/beater-probe.ts "${(@f)$(cut -f2 $f)}" 2>&1 | grep -o "whole.*" | grep -o "fulcrum [0-9.]*\|visible [0-9.]*\|paw-trunk [0-9.]*\|forearm-shaft [0-9]*°\|reach [0-9.]*\|arms-drum [0-9.]*" | paste - - - - - - > $f.probe
ARGS=(); while IFS=$'\t' read -r l s; do ARGS+=(--set "$s"); done < $f
pnpm wind-grip bass-drummer "${ARGS[@]}" 2>&1 | grep -E "^\|" | tail -n +4 | cut -d'|' -f3 > $f.grip
pnpm pose-depth bass-drummer --demo percussion-test "${ARGS[@]}" 2>&1 | grep -E "^\| " | grep -v "variant\|---" | head -$(( $(wc -l < $f) + 1 )) | tail -n +2 | cut -d'|' -f3,4,5,6 > $f.depth
paste -d' ' $f.twist $f.probe $f.grip $f.depth
