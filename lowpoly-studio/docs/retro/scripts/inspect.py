import json, sys
p = sys.argv[1]
n = int(sys.argv[2]) if len(sys.argv) > 2 else 8
def short(v, k=200):
    s = v if isinstance(v, str) else json.dumps(v)[:k]
    return s[:k]
with open(p) as f:
    for i, line in enumerate(f):
        if i >= n: break
        d = json.loads(line)
        print('LINE', i, 'len', len(line), 'keys', list(d.keys()))
        for k in ('type','timestamp','isSidechain','agentId','sessionId','uuid','parentUuid'):
            if k in d: print('  ', k, '=', short(d[k], 80))
        m = d.get('message')
        if isinstance(m, dict):
            print('   message keys', list(m.keys()), 'role', m.get('role'))
            c = m.get('content')
            if isinstance(c, str):
                print('   content str:', c[:400])
            elif isinstance(c, list):
                for b in c:
                    t = b.get('type')
                    if t == 'text': print('   [text]', b['text'][:400])
                    elif t == 'tool_use': print('   [tool_use]', b.get('name'), short(b.get('input'), 300))
                    elif t == 'tool_result':
                        cc = b.get('content')
                        print('   [tool_result]', 'is_error', b.get('is_error'), short(cc, 200))
                    else: print('   [', t, ']')
            if 'usage' in m: print('   usage', short(m['usage'], 300))
        other = {k: short(v, 120) for k, v in d.items() if k not in ('message',)}
        print('   other', other)
