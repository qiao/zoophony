#!/bin/zsh
# Gives the base face of each folded face of the cut variant: the nearest middle of all faces of
# the kept base rig. Run it after the check of rig-mesh-watch-cut.txt with --keep scratch/keep.
cd /Users/xueqiaoxu/proj/zoophony-retro-winds
ALL=$(node -e "console.log(Array.from({ length: 3119 }, (_, i) => i).join(','))")
for tree in base variant-1; do
  pnpm -s fold-probe bassoonist --demo beethoven-8 --glb scratch/keep/$tree.glb \
    --json $PWD/scratch/$tree-all.json --middles $ALL > /dev/null
done
node -e "
const read = (name) => JSON.parse(require('fs').readFileSync('scratch/' + name + '-all.json', 'utf8'));
const base = read('base');
const variant = read('variant-1');
for (const face of variant.faces) {
  let best = null;
  for (const [index, middle] of Object.entries(base.middles)) {
    const gap = Math.hypot(...middle.map((x, i) => x - face.middle[i]));
    if (!best || gap < best[1]) best = [index, gap];
  }
  console.log('variant face', face.face, 'play', face.folds.play, 'nearest base face', best[0], 'at', (best[1] * 1000).toFixed(2), 'mm');
}"
