"""Prints the pairs of faces of a dump with the same three corners (a fin of two faces)."""
import json, sys
for f in sys.argv[1:]:
    m = json.load(open(f)); C = m['corners']; P = m['bind']
    keys, dup = {}, []
    for i in range(len(C) // 3):
        k = tuple(sorted(C[3 * i:3 * i + 3]))
        if k in keys: dup.append((keys[k], i))
        keys[k] = i
    print(f, 'faces with the same corners:', dup)
