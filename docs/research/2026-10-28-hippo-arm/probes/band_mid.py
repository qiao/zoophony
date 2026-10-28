import json, sys
obj, band = sys.argv[1], sys.argv[2]
vs = []; fs = []
for line in open(obj):
    if line.startswith('v '): vs.append([float(x) for x in line.split()[1:]])
    elif line.startswith('f '): fs.append([int(x) - 1 for x in line.split()[1:]])
ids = {v for t in json.load(open(band)) for v in fs[t]}
print(','.join('%.4f' % (sum(vs[v][k] for v in ids) / len(ids)) for k in range(3)))
