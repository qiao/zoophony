#!/bin/zsh
# Runs each arms replay of tools/blender/ of the tree TREE (this tree by default) into
# scratch/replays<TAG>/<name>/ of this tree, and compares each written
# file with the file of the same name in the asset folder of the animal.
# Usage: [TREE=<tree>] [TAG=<tag>] docs/research/2026-10-28-hippo-paw/probes/replays.sh [<name>...]
HERE="$(cd "$(dirname "$0")/../../../.." && pwd)"
TREE=${TREE:-$HERE}
cd "$HERE"
typeset -A RUNS
RUNS=(
  bear 'bear_arms.py|bear'
  cat 'cat_arms.py|cat'
  deer 'deer_arms.py|deer'
  elephant 'elephant_arms.py|elephant'
  fox 'fox_arms.py|fox'
  hippo 'hippo_arms.py|hippo'
  polar-bear 'polar_bear_arms.py|polar-bear'
  rhino 'rhino_arms.py|rhino'
  rabbit 'violin_arms.py rabbit|rabbit'
  mouse 'wind_arms.py mouse|mouse'
  wolf 'wind_arms.py wolf|wolf'
)
names=("$@")
(( ${#names} )) || names=(bear cat deer elephant fox hippo polar-bear rhino rabbit mouse wolf)
for name in $names; do
  spec=${RUNS[$name]}
  script=${spec%%|*}
  folder=$TREE/assets/models/${spec##*|}
  out=$HERE/scratch/replays${TAG:-}/$name
  rm -rf $out; mkdir -p $out
  args=(${=script})
  start=$SECONDS
  Blender -b --factory-startup -P $TREE/tools/blender/${args[1]} -- ${args[2,-1]} $out > $out.log 2>&1
  rc=$?
  took=$(( SECONDS - start ))
  if (( rc != 0 )) || grep -q 'Traceback\|Error:' $out.log; then
    echo "$name: STOPS (exit $rc, ${took} s): $(command grep -m1 -E 'Error' $out.log)"
    continue
  fi
  verdict=SAME
  files=()
  for f in $out/*(N.); do
    files+=(${f:t})
    if [[ ! -f $folder/${f:t} ]]; then
      verdict="NEW ${f:t}"
    elif ! cmp -s $f $folder/${f:t}; then
      verdict="DIFFERS ${f:t}"
      break
    fi
  done
  echo "$name: $verdict (${took} s): ${files[*]}"
done
