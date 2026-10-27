# Prints the deepest move depths in cm of each row of a `pnpm pose-depth violist --json` file.
# Usage: python3 docs/research/2026-10-27-violin-unwind/via-cat.py <file.json>
import json, sys
d = json.load(open(sys.argv[1]))
keys = [('lower','instrument','body'),('lower','claws','viola'),('lower','bow','viola'),('lower','paws','viola'),('lift','paws','viola'),('lift','instrument','body'),('lower','upper arms','body'),('lower','forearms','viola')]
for row in d['rows']:
    best = {}
    for res in row['results']:
        for s in res['sets']:
            for p in s['pairs']:
                k = (s['name'], p['part'], p['into'])
                if p['depth'] > best.get(k, (0,))[0]:
                    best[k] = (p['depth'], res['demo'].split()[0])
    print(str(row['variant'])[:40].ljust(40), ' '.join(f"{k[0][:2]}-{k[1][:5]}={best.get(k,(0,))[0]*100:.2f}" for k in keys))
