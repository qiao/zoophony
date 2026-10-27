#!/bin/zsh
# Summarizes a pose-depth output: for each row, the deepest arm bone in the body of each set.
# Usage: docs/research/2026-10-27-wolf-bind/probes/depth-sum.sh <output of pnpm pose-depth --per-bone>
awk '
/^[^ ].* \([0-9.]+ s\):$/ { row=$0; sub(/ \([0-9.]+ s\):$/, "", row); n++; rows[n]=row; next }
/^    (lift|rest|lower|play): (forearm|upperArm|hand)[LR] in body:/ {
  split($0, a, ":"); set=a[1]; gsub(/ /, "", set); part=a[2]; sub(/ in body/, "", part); gsub(/ /, "", part);
  v=a[3]; sub(/ cm.*/, "", v); gsub(/ /, "", v);
  key=n SUBSEP set SUBSEP part; if (!(key in d) || v+0 > d[key]) d[key]=v+0
}
END {
  for (i=1; i<=n; i++) {
    line=sprintf("%-3d", i);
    split("rest lift lower", sets, " ");
    for (s=1; s<=3; s++) {
      line=line sprintf(" | %s fL %.1f uL %.1f fR %.1f uR %.1f", sets[s], d[i SUBSEP sets[s] SUBSEP "forearmL"], d[i SUBSEP sets[s] SUBSEP "upperArmL"], d[i SUBSEP sets[s] SUBSEP "forearmR"], d[i SUBSEP sets[s] SUBSEP "upperArmR"]);
    }
    print line "  " rows[i];
  }
}' "$1"
