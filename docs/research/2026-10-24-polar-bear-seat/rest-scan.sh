#!/bin/zsh
# Scans the lap place of the rest paws of the pianist: along, up (H), and the move in z (H, + is back).
#   scratch/rest-scan.sh "<alongs>" "<ups>" "<backs>"
set -u
W=/Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-adedfed9827f86c1a
cd $W
for a in ${=1}; do
  for u in ${=2}; do
    for b in ${=3}; do
      j="{\"restL\":{\"kind\":\"lap\",\"lap\":{\"along\":$a,\"offset\":[0.03,$u,$b]},\"palm\":[0.15,-1,0.1],\"fingers\":[0.5,0,-1],\"pole\":[-1,-1,0.77]},\"restR\":{\"kind\":\"lap\",\"lap\":{\"along\":$a,\"offset\":[-0.03,$u,$b]},\"palm\":[-0.15,-1,0.1],\"fingers\":[-0.5,0,-1],\"pole\":[1,-1,0.77]}}"
      r=$(QUIET=1 HOLD="$j" node scratch/pianist-size.ts 2>&1 | grep -A2 '^rest')
      echo "along $a up $u back $b :: $(echo "$r" | sed -n 2p | sed -E 's/.*(el \[[^]]*\]).*(wr \[[^]]*\]).*elbow ([0-9]+).*fslope (-?[0-9]+).*upper-from-down ([0-9]+).*/\1 \2 elbow \3 fslope \4 upper \5/')"
    done
  done
done
