#!/bin/zsh
# Runs the new modes and the probes of the round one at a time, with their times.
cd "$(git rev-parse --show-toplevel)"
R=docs/research/2026-10-19-hippo-retro
T=scratch/times.txt
: > $T
step() {
  local name=$1; shift
  local start=$(date +%s)
  "$@" > scratch/run-$name.txt 2>&1
  local code=$?
  echo "$name exit $code $(( $(date +%s) - start )) s" >> $T
}
step pose-depth-base node tools/pose-depth.ts bassist --demo boulanger-matin --base 61e7b8cf
step top-plate node docs/research/2026-10-19-hippo-chest/top-plate.ts
step hold-fit node tools/hold-fit.ts bassist --demo boulanger-matin
step close-views pnpm close-views bassist scratch/cv --elevation 30 --zoom 1.5 --scale 2
SPECS=()
for m in frog:0.55 tip:2.4 crossing:3.25 rest:0:rest lift50:0.55:lift50 lower50:0.55:lower50; do
  mname=${m%%:*}; rest=${m#*:}; mtime=${rest%%:*}; move=""
  [[ $rest == *:* ]] && move=":${rest#*:}"
  for v in front:0 left:-90 right:90 back:180; do
    SPECS+=("$mname-${v%%:*}:${v#*:}:30:1.5:$mtime$move")
  done
done
step chest-views node docs/research/2026-10-19-hippo-chest/chest-views.ts dist scratch/chest-out $SPECS
RULE=$(cat docs/research/2026-10-19-hippo-retro/raise1.json)
step rig-mesh env BLENDER=/opt/homebrew/bin/blender node tools/rig-mesh.ts hippo --check --roles bassist --demo boulanger-matin --set "raise.1=$RULE" --watch 617,618,323,477,461
step variant zsh docs/research/2026-10-19-hippo-chest/variant.sh raise1 "cfg['raise'].append(json.load(open('docs/research/2026-10-19-hippo-retro/raise1.json')))" scratch
echo done >> $T
