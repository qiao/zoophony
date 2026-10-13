import json, sys, collections
p = sys.argv[1]
types = collections.Counter(); blocks = collections.Counter(); att = collections.Counter()
roles = collections.Counter(); sizes = collections.Counter()
first = last = None
with open(p) as f:
    for i, line in enumerate(f):
        d = json.loads(line)
        t = d.get('type'); types[t] += 1
        ts = d.get('timestamp')
        if ts:
            first = first or ts; last = ts
        sizes[t] += len(line)
        if t == 'attachment':
            att[d['attachment'].get('type')] += 1
        m = d.get('message')
        if isinstance(m, dict):
            roles[(t, m.get('role'))] += 1
            c = m.get('content')
            if isinstance(c, list):
                for b in c:
                    blocks[(t, b.get('type'))] += 1
                    if b.get('type') == 'tool_result' and isinstance(b.get('content'), list):
                        for bb in b['content']:
                            blocks[('tool_result_inner', bb.get('type'))] += 1
            elif isinstance(c, str):
                blocks[(t, 'str')] += 1
print('types', types); print('roles', roles); print('att', att)
print('blocks'); [print('  ', k, v) for k, v in blocks.most_common()]
print('bytes by type', {k: v//1000000 for k, v in sizes.items()})
print('first', first, 'last', last)
