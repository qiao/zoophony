#!/bin/zsh
# Renders the bear with <label>:<crease>:<blend> variants. Restores ANIMALS and the module at the end.
set -u
S=/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/a3b47bb4-448c-4118-8795-27eff295afc3/scratchpad/sb
W=/Users/xueqiaoxu/proj/zoophony/.claude/worktrees/studio-bears
cd $W || exit 1
cp src/models/studio/bear.ts $S/bear-module.bak
cp tools/studio-body.ts $S/studio-body.bak
for v in "$@"; do
  label=${v%%:*}; rest=${v#*:}; c=${rest%%:*}; b=${rest#*:}
  cp $S/studio-body.bak tools/studio-body.ts
  perl -0pi -e "s|(constant: 'STUDIO_BEAR',\n      crease: )15,|\${1}$c,\n      colorBlend: $b,|" tools/studio-body.ts
  pnpm studio-body bear > $S/sb-$label.log 2>&1 || echo "fail studio-body $label"
  pnpm close-views play $S/play-$label --time 30 > $S/play-$label.log 2>&1 || echo "fail play $label"
  pnpm close-views conductor $S/cond-$label --moments beat-1,rest --views back,150,front,left --elevation 20 > $S/cond-$label.log 2>&1 || echo "fail cond $label"
  pnpm close-views conductor $S/head-$label --target head > $S/head-$label.log 2>&1 || echo "fail head $label"
  echo "done $label"
done
cp $S/studio-body.bak tools/studio-body.ts
cp $S/bear-module.bak src/models/studio/bear.ts
echo all done
