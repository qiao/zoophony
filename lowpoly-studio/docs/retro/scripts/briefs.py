import json, sys
p = sys.argv[1]; lim = int(sys.argv[2]) if len(sys.argv) > 2 else 3000
with open(p) as f:
    for i, line in enumerate(f):
        d = json.loads(line)
        t = d.get('type'); ts = d.get('timestamp')
        if t == 'attachment' and d['attachment'].get('type') in ('queued_command', 'thinking_drop', 'auto_mode'):
            a = d['attachment']
            print('=== L%d %s ATT %s' % (i, ts, a.get('type')))
            print(json.dumps(a)[:lim]); print()
        m = d.get('message')
        if t == 'user' and isinstance(m, dict):
            c = m.get('content')
            if isinstance(c, str) and i > 0:
                print('=== L%d %s USER str' % (i, ts)); print(c[:lim]); print()
            elif isinstance(c, list):
                for b in c:
                    if b.get('type') == 'text':
                        print('=== L%d %s USER text' % (i, ts)); print(b['text'][:lim]); print()
