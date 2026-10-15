#!/bin/zsh
# Grid of the piano place (PIANO_FRONT_H) and the lean: node scratch/fit.ts for each pair.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/polar-fix
for front in "$@"; do
  perl -0pi -e "s/export const PIANO_FRONT_H = [0-9.]+;/export const PIANO_FRONT_H = $front;/" src/models/instruments/piano.ts
  echo "front $front"
  node scratch/fit.ts --step 1 'piano.lean=26deg' 'piano.lean=27deg' 'piano.lean=28deg' 'piano.lean=29deg' 2>&1 | command grep '^"'
done
