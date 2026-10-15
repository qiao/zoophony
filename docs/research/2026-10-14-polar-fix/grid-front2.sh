#!/bin/zsh
# Variants of the piano place with the palm offset and the head lift: node scratch/fit.ts.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/polar-fix
front=$1; shift
perl -0pi -e "s/export const PIANO_FRONT_H = [0-9.]+;/export const PIANO_FRONT_H = $front;/" src/models/instruments/piano.ts
echo "front $front"
node scratch/fit.ts --step 1 "$@" 2>&1 | command grep '^"'
