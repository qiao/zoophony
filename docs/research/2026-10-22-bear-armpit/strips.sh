#!/bin/zsh
# Renders the play strips of a fast and a slow demo at the four azimuths, with the base.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/bear-armpit
for spec in "fast boulanger-matin 4.666392 65.0:0.11:16" "slow mozart-k315 3.049224 63.9:0.33:16"; do
  set -- ${=spec}
  for az in 0 180 -90 90; do
    out=scratch/strips/$1-az$az
    mkdir -p $out
    cam=$(python3 scratch/cams.py $3 5.0 $az | sed "s/^--camera '//; s/' $//")
    pnpm close-views play $out --demo $2 --strip $4 --camera "$cam" --base 5593e92b > $out/log.txt 2>&1
    echo "$1 az$az exit $?"
  done
done
