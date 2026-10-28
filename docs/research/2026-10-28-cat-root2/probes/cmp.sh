#!/bin/zsh
# cmp.sh <a crease file> <b crease file>: the crease sum, the valleys over 45, and the deepening of each state, a / b.
a=$1; b=$2
paste <(awk '/^side/{next} /^Deepening/{d=1; next} !d {print $1, $3, $5}' $a) <(awk '/^side/{next} /^Deepening/{d=1; next} !d {print $3, $5}' $b) > /tmp/cmp1.$$
paste <(awk '/^Deepening/{d=1; next} d {print $1, $3}' $a) <(awk '/^Deepening/{d=1; next} d {print $3}' $b) > /tmp/cmp2.$$
printf '%-22s %14s %10s %14s\n' state 'sum a/b' 'v45 a/b' 'deep a/b'
awk 'NR==FNR {d[$1]=$2"/"$3; next} {printf "%-22s %14s %10s %14s\n", $1, $3"/"$5, $2"/"$4, ($1 in d)?d[$1]:"-"}' /tmp/cmp2.$$ /tmp/cmp1.$$
rm -f /tmp/cmp1.$$ /tmp/cmp2.$$
