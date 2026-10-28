#!/bin/zsh
# The checks of the round, in the round worktree, against main.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/sixth-cat-root3
F=/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/51e57e32-cee6-44dc-94fc-af50332f7a46/scratchpad/r3/final
pnpm arm-check --all --base main > $F/gate.txt 2>&1; echo "gate $?"
pnpm fold-probe violist --base main --faces 40 > $F/fold.txt 2>&1; echo "fold $?"
pnpm pose-depth violist --base main > $F/pose-depth.txt 2>&1; echo "depth $?"
pnpm carry-check violist --base main > $F/carry.txt 2>&1; echo "carry $?"
pnpm wind-grip violist > $F/wind-grip.txt 2>&1; echo "grip $?"
pnpm rig-mesh cat --check > $F/rig-mesh-check.txt 2>&1; echo "rigcheck $?"
pnpm body-probe --base main > $F/body-probe.txt 2>&1; echo "body $?"
pnpm size --base main > $F/size.txt 2>&1; echo "size $?"
echo checks done
