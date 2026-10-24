#!/bin/zsh
# Scan: the size factor of the polar bear (times the height 1.642242 of main), PIANO_FRONT_H, and
# the play lean. It edits two source files in place, so run nothing else at the same time.
#   scratch/scan.sh "<sizes>" "<fronts>" "<leans>"
set -u
W=/Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-adedfed9827f86c1a
cd $W
for s in ${=1}; do
  h=$(python3 -c "print(round(1.642242*$s,6))")
  perl -0pi -e "s/height: [0-9.]+,\n      seated: true,\n      soloist: false,\n      constant: 'STUDIO_POLAR_BEAR'/height: $h,\n      seated: true,\n      soloist: false,\n      constant: 'STUDIO_POLAR_BEAR'/" tools/studio-body.ts
  pnpm -s studio-body polar-bear > /dev/null 2>&1 || { echo "studio-body failed at $s"; exit 1; }
  for f in ${=2}; do
    perl -0pi -e "s/export const PIANO_FRONT_H = [0-9.]+;/export const PIANO_FRONT_H = $f;/" src/models/instruments/piano.ts
    for l in ${=3}; do
      out=$(QUIET=1 HOLD="{\"lean\":$l}" node scratch/pianist-size.ts 2>&1)
      rest=$(echo "$out" | grep -A1 '^rest' | tail -1 | sed -E 's/.*elbow ([0-9]+).*/\1/')
      mean=$(echo "$out" | grep '^mean')
      key=$(echo "$out" | grep '^H' | sed -E 's/.*piano at \[0,0,(-[0-9.]+)\].*/\1/')
      echo "s $s h $h f $f lean $l pianoZ $key restElbowL $rest | $mean"
    done
  done
done
