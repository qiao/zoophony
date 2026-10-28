#!/bin/zsh
# rings-cmp.sh: the area radius (cm) of the arm cuts of main (the scratch tree) and of this tree,
# for each state and side: main / round.
M=${MAIN_TREE:?set MAIN_TREE to a worktree of main with node_modules and scratch/arm-rings.ts}
T=$PWD
cuts=(${=CUTS:-u0.45 u0.50 u0.55 u0.60 u0.70 e0.50 f0.25 f0.35 f0.65})
printf '%-28s %s\n' state "${(j: :)cuts}"
for side in L R; do
for at in bind boulanger-matin:play:30 boulanger-matin:rest:#0 boulanger-matin:lift:#15 boulanger-matin:lower:#10; do
  if [[ $at == bind ]]; then a=(--bind); else a=(--at $at); fi
  (cd $M && node scratch/arm-rings.ts $a --side $side > /tmp/rm.$$ 2>&1)
  (cd $T && node scratch/arm-rings.ts $a --side $side > /tmp/rt.$$ 2>&1)
  row=()
  for c in $cuts; do
    m=$(awk -v c=$c '$1==c {print $3}' /tmp/rm.$$); t=$(awk -v c=$c '$1==c {print $3}' /tmp/rt.$$)
    row+=("${m:--}/${t:--}")
  done
  printf '%-28s %s\n' "$side ${at#boulanger-matin:}" "${(j: :)row}"
done
done
rm -f /tmp/rm.$$ /tmp/rt.$$
