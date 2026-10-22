#!/bin/zsh
# Renders the play strips of the pianist (bach-bwv1050 from 17 s, each 0.5 s) at the four
# azimuths, with the base commit of the round. Run from the root of the worktree.
for az in 0 180 -90 90; do
  out=scratch/strips/az$az
  mkdir -p $out
  pnpm close-views play $out --demo bach-bwv1050 --strip 17:0.5:16 --at polar-bear \
    --azimuth $az --elevation 30 --base 3796be6d > $out/log.txt 2>&1
  echo "az$az exit $?"
done
