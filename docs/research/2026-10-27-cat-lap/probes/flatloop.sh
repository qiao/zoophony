#!/bin/zsh
# One try of the flat zone: BELLY='{"flat":...}' scratch/flatloop.sh <name>
set -o pipefail
name=$1
scratch/try.sh $name > /dev/null 2>&1 || { echo "try failed"; exit 1; }
python3 -c "
import json; d=json.load(open('scratch/tries/$name/tf.json'))
for r in d['rows'][:2]:
    o=r['outlines']; print('  %-6s front gap %.2f dents %d turn %.1f | facets max %.1f' % (r['name'], o[0]['gap']*100, o[0]['dents'], o[0]['turn'], r['facets'][2]))"
node scratch/belly.ts --bind --from 0.1 --to 0.85 --levels 40 --edges 2>&1 | awk '/edge/ { split($0,a," at x "); split(a[2],b," "); split($0,c,"\\(f "); f=c[2]+0; x=b[1]+0; if (x<0) x=-x; if (x < 9 && f > 0.55 && f < 0.95) print "  upper " $0 }' | head -4
node scratch/flatten-est.ts brahms-2:play:412.63,brahms-2:play:404.63,boulanger-matin:lower:12.00 0.62,0.9 3,16 0 2>&1 | tail -3 | sed 's/^/  /'
