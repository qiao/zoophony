#!/bin/zsh
# Writes normal-split.txt: the split corners near the elephant elbows and the hippo arm roots,
# with no rim (main) and with the rim of the tree.
cd "${0:A:h}/../../../.."
probe=docs/research/2026-10-25-elephant-hippo-creases/probes/normal-split.ts
out=docs/research/2026-10-25-elephant-hippo-creases/normal-split.txt
: > $out
for rim in no tree; do
  echo "== rim: $rim" >> $out
  if [[ $rim == no ]]; then export NO_RIM=1; else unset NO_RIM; fi
  node $probe studio-elephant forearm 0.14 >> $out 2>&1
  node $probe studio-hippo upper_arm 0.2 >> $out 2>&1
  node $probe studio-hippo forearm 0.15 >> $out 2>&1
done
