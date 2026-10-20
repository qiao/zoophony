#!/bin/zsh
# Runs the arm gate of the working tree on the validation states, each in a temporary worktree.
set -u
REPO=/Users/xueqiaoxu/proj/zoophony-arm-gate
S=<scratch>
for c in a3c48f55 16f16e44 5a38f480 5b0ce19d 35a27c5f; do
  if [[ ! -d $S/states/$c ]]; then
    git -C $REPO worktree add --detach $S/states/$c $c > /dev/null 2>&1 || echo "worktree $c failed"
    ln -s $REPO/node_modules $S/states/$c/node_modules
  fi
  cp $REPO/tools/arm-check.ts $REPO/tools/arm-views.ts $S/states/$c/tools/
done
run() { local c=$1; shift; local name=$1; shift; (cd $S/states/$c && { time node tools/arm-check.ts "$@" ; } > $S/runs/$name.txt 2>&1; echo "exit $?" >> $S/runs/$name.txt) }
run a3c48f55 a3c48f55-base timpanist --base 35a27c5f --long &
run 16f16e44 16f16e44 bassist --long &
run 5a38f480 5a38f480 timpanist --long &
run 5b0ce19d 5b0ce19d bassist --long &
wait
run 35a27c5f 35a27c5f-all --all --long &
run a3c48f55 a3c48f55 timpanist --long &
wait
echo done
