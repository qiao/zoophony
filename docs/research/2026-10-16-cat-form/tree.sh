#!/bin/zsh
# Usage: scratch/tree.sh <tree> [<animal>=<variant glb>]... [cat-height=<m>]
# Makes scratch/trees/<tree>, a copy of the worktree, puts each variant GLB at the rig output of its
# animal, sets the landmark height of the cat in ANIMALS, and writes the module of each animal.
set -euo pipefail
W=/Users/xueqiaoxu/proj/zoophony/.claude/worktrees/cat-form
name=$1; shift
T=$W/scratch/trees/$name
rm -rf $T; mkdir -p $T/scratch
for d in src tools assets public demos docs e2e; do cp -Rc $W/$d $T/; done
cp $W/*.html $W/package.json $W/tsconfig.json $W/vite.config.ts $W/playwright.config.ts $W/.oxfmtrc.json $W/.oxlintrc.json $T/
ln -s $W/node_modules $T/node_modules
cd $T
animals=()
for item in "$@"; do
  key=${item%%=*}; value=${item#*=}
  if [[ $key == cat-height ]]; then
    perl -0pi -e "s/height: 1\.16494,/height: $value,/" tools/studio-body.ts
    continue
  fi
  out=$(python3 -c "import json;print(json.load(open('tools/mesh-rigs/$key.json'))['output'])")
  cp $value $out
  animals+=$key
done
for a in $animals; do
  node tools/studio-body.ts $a > scratch/studio-body-$a.log 2>&1 || { echo "studio-body $a failed"; tail -5 scratch/studio-body-$a.log; exit 1; }
done
echo "tree $name: ${animals[*]}"
