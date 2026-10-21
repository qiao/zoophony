#!/bin/zsh
# Renders the role views of the rabbit violinist (pnpm close-views violinist --scale 2) for each
# shadow variant: a temporary perl edit of the source, a render, and a restore from a backup.
set -o pipefail
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/stage-exposure
files=(src/gallery/main.ts src/scene/quality.ts src/scene/lights.ts)
for f in $files; do cp $f scratch/bak-${f:t}; done
run() {
  local name=$1; shift
  for e in "$@"; do perl -0pi -e "${e#*|}" ${e%%|*}; done
  git diff --stat -- $files
  pnpm close-views violinist scratch/sv/$name --scale 2 > scratch/sv-$name.log 2>&1 || echo "$name render failed"
  for f in $files; do cp scratch/bak-${f:t} $f; done
  echo "$name done"
}
R3='src/gallery/main.ts|s/GALLERY_SHADOW_RADIUS = 1;/GALLERY_SHADOW_RADIUS = 3;/'
R5='src/gallery/main.ts|s/GALLERY_SHADOW_RADIUS = 1;/GALLERY_SHADOW_RADIUS = 5;/'
S2K='src/scene/quality.ts|s/sideShadowMapSize: 1024,/sideShadowMapSize: 2048,/'
K4K='src/scene/quality.ts|s/shadowMapSize: 2048,\n    sideShadowMapSize/shadowMapSize: 4096,\n    sideShadowMapSize/'
NB='src/scene/lights.ts|s/const SHADOW_BIAS_TEXELS = 2;/const SHADOW_BIAS_TEXELS = 4;/'
FP='src/scene/lights.ts|s/intensity: 5, players: 0.6 \}/intensity: 5, players: 0.8 }/'
run r3-noside $R3 'src/scene/quality.ts|s/sideShadowMapSize: 1024,/sideShadowMapSize: 0,/'
run r5-bias4 $R5 $NB
git diff --stat
