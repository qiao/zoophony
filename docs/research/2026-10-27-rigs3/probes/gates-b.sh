#!/bin/zsh
# Rigs each tool variant of the calf fair over the final config, and prints the pose sets of the
# body probe and the fold table of the pianist against main. Ends with the final config.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/fifth-rigs3
run() {  # run <name> <python statements on c>
  echo "== $1: $2"
  uv run --no-project python -I -c "
import json
c = json.load(open('scratch/b/polar-bear-final.json'))
$2
open('tools/mesh-rigs/polar-bear.json', 'w').write(json.dumps(c, indent=2, ensure_ascii=False) + '\n')
"
  pnpm rig-mesh polar-bear > /dev/null 2>&1 && pnpm studio-body polar-bear > /dev/null 2>&1 || echo "rig failed"
  pnpm body-probe --base main 2>&1 | command grep -E "^pose sets equal|^pose "
  pnpm fold-probe pianist --base main 2>&1 | command grep -E "^\| (rest|play|lift) \|| new | gone "
}
run fair-0.2-no-radius "c['kneeCrease']['fair']['to'] = 0.2; c['kneeCrease']['fair']['radius'] = 9"
run fair-0.17-no-radius "c['kneeCrease']['fair']['radius'] = 9"
cp scratch/b/polar-bear-final.json tools/mesh-rigs/polar-bear.json
run final "pass"
