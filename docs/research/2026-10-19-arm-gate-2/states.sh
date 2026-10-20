#!/bin/zsh
# Runs the gate of gate2 on the working tree and on the validation states.
S=<scratch>
run() { local dir=$1; shift; local name=$1; shift; (cd $dir && { time node tools/arm-check.ts "$@" ; } > $S/g2runs/$name.txt 2>&1; echo "exit $?" >> $S/g2runs/$name.txt) }
run /Users/xueqiaoxu/proj/zoophony-gate2 eefece23-all --all --long --jobs 4 &
run $S/g2/a3c48f55 a3c48f55 timpanist --long &
run $S/g2/a3755083 a3755083 timpanist oboist --long &
wait
run $S/g2/a3c48f55 a3c48f55-base timpanist --base 35a27c5f --long &
run $S/g2/5a38f480 5a38f480 timpanist --long &
run $S/g2/16f16e44 16f16e44 bassist --long &
run $S/g2/5b0ce19d 5b0ce19d bassist --long &
wait
echo done
