"""Counts how often each constant gets a new value in the agent's edits."""
import json, re, sys, collections
p = sys.argv[1]
vals = collections.defaultdict(list)   # name -> [(call index, value)]
cli = collections.defaultdict(list)
n = 0
ASSIGN = re.compile(r'^\s*([A-Z][A-Z0-9_]{2,})\s*=\s*([^\n#]{1,80})', re.M)
SEDV = re.compile(r's/\^?([A-Z][A-Z0-9_]{2,}) = [^/]*/\1 = ([^/]+)/')
FLAG = re.compile(r'--(quads|seed|azimuths|clips|pose)\s+([^\s\\]+)')
with open(p) as f:
    for line in f:
        d = json.loads(line)
        if d.get('type') != 'assistant':
            continue
        for b in d['message'].get('content', []):
            if b.get('type') != 'tool_use' or b.get('name') not in ('Bash', 'Write'):
                continue
            n += 1
            inp = b['input']; cmd = inp.get('command') or inp.get('content') or ''
            if b['name'] == 'Write':
                continue
            # Only the new side of a patch pair counts: take text after each '""", """' split roughly.
            for m in SEDV.finditer(cmd):
                vals[m.group(1)].append((n, m.group(2).strip()[:40]))
            if 'def patch(' in cmd:
                for m in ASSIGN.finditer(cmd):
                    vals[m.group(1)].append((n, m.group(2).strip()[:40]))
            for m in FLAG.finditer(cmd):
                cli[m.group(1)].append((n, m.group(2)[:30]))
rows = []
for k, v in vals.items():
    calls = sorted(set(i for i, _ in v)); distinct = sorted(set(x for _, x in v))
    rows.append((len(calls), len(distinct), k, distinct[:6]))
rows.sort(reverse=True)
print('constants edited in >= 3 calls:')
for r in rows:
    if r[0] >= 3:
        print(f"  {r[2]:24s} calls {r[0]:3d} distinct {r[1]:3d}  e.g. {r[3]}")
print('flags:')
for k, v in cli.items():
    print(f"  --{k}: uses {len(v)}, distinct {len(set(x for _, x in v))}: {sorted(set(x for _, x in v))[:20]}")
