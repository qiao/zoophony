#!/bin/zsh
# For each PIANO_FRONT_H: the play depths of the sweep and the mean play arm angles, at size 0.85.
#   scratch/fscan.sh "<fronts>" [pose-depth options]
W=/Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-adedfed9827f86c1a
cd $W
fronts=$1
shift
R='piano.restL.lap.offset=[0.03,0.3,-0.35];piano.restR.lap.offset=[-0.03,0.3,-0.35];piano.restL.lap.along=0.45;piano.restR.lap.along=0.45;piano.restL.palm=[0.15,-1,0.1];piano.restR.palm=[-0.15,-1,0.1];piano.restL.fingers=[0.5,0,-1];piano.restR.fingers=[-0.5,0,-1];piano.restArc=[0,0.4,0.25]'
for f in ${=fronts}; do
  zsh scratch/set.sh 0.85 $f > /dev/null
  pnpm -s pose-depth pianist --set "$R" "$@" > scratch/fscan-$f.log 2>&1
  row=$(sed -n '/^| variant/,/^$/p' scratch/fscan-$f.log | sed -n 4p | sed -E 's/^\| [^|]*\|//')
  head=$(sed -n '/^| variant/,/^$/p' scratch/fscan-$f.log | sed -n 1p | sed -E 's/^\| [^|]*\|//')
  angles=$(QUIET=1 node scratch/pianist-size.ts 2>&1 | grep '^mean')
  echo "f $f"
  echo "  $head"
  echo "  $row"
  echo "  $angles"
done
