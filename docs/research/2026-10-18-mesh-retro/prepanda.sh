#!/bin/zsh
# Builds a tree of the repository before the panda had a studio body (7a83caac), with the tools of
# this round, the rig config of the panda, and its GLB files, for the probes of
# docs/research/2026-10-18-mesh-retro.md. Run it from the root of the worktree of the round:
#   docs/research/2026-10-18-mesh-retro/prepanda.sh <folder> <config commit>
# The config commit is f65da87a for the final config (item 4) or 49b32148 for the first config of
# phase 1 (item 6). The folder must not exist. Remove it after the probes.
set -euo pipefail
out=$1
config=$2
mkdir $out
git archive 7a83caac | tar -x -C $out
ln -s $PWD/node_modules $out/node_modules
cp tools/glb-swap.ts tools/hold-reach.ts tools/mesh-options.ts tools/mesh_options.py $out/tools/
git show ${config}:tools/mesh-rigs/panda.json > $out/tools/mesh-rigs/panda.json
mkdir -p $out/assets/models/panda
git show f65da87a:assets/models/panda/panda.glb > $out/assets/models/panda/panda.glb
git show f65da87a:assets/models/panda/panda.rig.glb > $out/assets/models/panda/panda.rig.glb
echo "$out: 7a83caac, the tools of $(git rev-parse --short HEAD), the panda config of $config"
