#!/bin/zsh
# Scans holds of the pianist with seat-probe.ts: one line for each hold of the env HOLD, at each
# piano. A piano is <PIANO_SCALE>/<PIANO_FRONT_H>, such as 1.16/1.3. The values go into
# src/models/instruments/piano.ts with perl for the run, and the script puts the values of the
# tree back at the end. Run from the root of the tree:
#   docs/research/2026-10-28-polar-legs/probes/hold-scan.sh "<piano>..." '<hold json>'...
# The line: the scale, the hold, then the play medians: the shoulder, the elbows above the keys,
# the forearm slope, the head gap to the case, the haunch gap, and the head top, in cm and degrees.
set -uo pipefail
P=docs/research/2026-10-28-polar-legs/probes
F=src/models/instruments/piano.ts
scales=(${=1}); shift
was=$(perl -ne 'print $1 if /^export const PIANO_SCALE = ([0-9.]+);/' $F)
wasf=$(perl -ne 'print $1 if /^export const PIANO_FRONT_H = ([0-9.]+);/' $F)
for piano in $scales; do
  s=${piano%%/*}; f=${piano#*/}
  [[ $f == $piano ]] && f=$wasf
  perl -0pi -e "s/^export const PIANO_SCALE = [0-9.]+;/export const PIANO_SCALE = $s;/m" $F
  perl -0pi -e "s/^export const PIANO_FRONT_H = [0-9.]+;/export const PIANO_FRONT_H = $f;/m" $F
  for h in "$@"; do
    HOLD=$h node $P/seat-probe.ts --json /tmp/seat-scan-$$.json > /dev/null 2>&1 || { echo "$s $h failed"; continue; }
    python3 -I -c "
import json, sys
d = json.load(open('/tmp/seat-scan-$$.json')); p = d['playMedian']; m = d['playMax']; r = d['rest']
c = lambda v: f'{v * 100:.1f}'
print(f\"scale $s front $f keys {c(d['keyTop'])} | {d['hold']} | shoulder {c(p['shoulder'])} | elbow {c(p['elbowL'])}/{c(p['elbowR'])} | forearm {p['slope']:+.1f} (max {m['slope']:+.1f}) | head gap {c(p['headGap'])} (min {c(m['headGap'])}) | haunch {c(p['gap'])} | head top {c(p['headTop'])} | reach max {m['reach']:.3f} | rest elbow {c(r['elbowL'])}\")
"
  done
done
perl -0pi -e "s/^export const PIANO_SCALE = [0-9.]+;/export const PIANO_SCALE = $was;/m" $F
perl -0pi -e "s/^export const PIANO_FRONT_H = [0-9.]+;/export const PIANO_FRONT_H = $wasf;/m" $F
rm -f /tmp/seat-scan-$$.json
