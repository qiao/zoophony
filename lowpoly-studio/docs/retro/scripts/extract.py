"""Streams the transcript and writes one compact record per tool call."""
import json, sys
from datetime import datetime
p, out = sys.argv[1], sys.argv[2]

def ts(s):
    return datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp()

calls = {}      # tool_use_id -> record
order = []
asst = []       # assistant message records: line, ts, kinds, text excerpt, output tokens
with open(p) as f:
    for i, line in enumerate(f):
        d = json.loads(line)
        t = d.get('type'); m = d.get('message')
        if not isinstance(m, dict):
            continue
        c = m.get('content')
        if t == 'assistant' and isinstance(c, list):
            u = m.get('usage') or {}
            rec = {'line': i, 'ts': ts(d['timestamp']), 'kinds': [b.get('type') for b in c],
                   'out_tokens': u.get('output_tokens'), 'in_tokens': u.get('input_tokens'),
                   'cache_read': u.get('cache_read_input_tokens'), 'cache_create': u.get('cache_creation_input_tokens'),
                   'msg_id': m.get('id')}
            texts = [b['text'] for b in c if b.get('type') == 'text']
            if texts:
                rec['text'] = ' | '.join(texts)[:1500]
            think = [b.get('thinking', '') for b in c if b.get('type') == 'thinking']
            if think:
                rec['think_len'] = sum(len(x) for x in think)
            asst.append(rec)
            for b in c:
                if b.get('type') == 'tool_use':
                    inp = b.get('input') or {}
                    r = {'id': b['id'], 'line': i, 'start': ts(d['timestamp']), 'name': b.get('name'),
                         'desc': inp.get('description', ''),
                         'cmd': (inp.get('command') or '')[:1200],
                         'cmd_len': len(inp.get('command') or ''),
                         'file': inp.get('file_path') or inp.get('path') or '',
                         'bg': bool(inp.get('run_in_background')),
                         'timeout': inp.get('timeout'),
                         'content_len': len(inp.get('content') or '') + len(inp.get('new_string') or ''),
                         'old_len': len(inp.get('old_string') or ''),
                         'other': {k: (str(v)[:200]) for k, v in inp.items() if k not in ('command', 'content', 'new_string', 'old_string', 'description', 'file_path')}}
                    calls[b['id']] = r; order.append(b['id'])
        elif t == 'user' and isinstance(c, list):
            for b in c:
                if b.get('type') != 'tool_result':
                    continue
                r = calls.get(b.get('tool_use_id'))
                if not r:
                    continue
                r['end'] = ts(d['timestamp']); r['end_line'] = i
                r['is_error'] = bool(b.get('is_error'))
                cc = b.get('content'); txt = ''; imgs = 0; nbytes = 0
                if isinstance(cc, str):
                    txt = cc
                elif isinstance(cc, list):
                    for bb in cc:
                        if bb.get('type') == 'text':
                            txt += bb.get('text', '')
                        elif bb.get('type') == 'image':
                            imgs += 1
                            nbytes += len(json.dumps(bb.get('source', {})))
                r['imgs'] = imgs; r['img_bytes'] = nbytes
                r['res_len'] = len(txt)
                r['res_head'] = txt[:600]
                r['res_tail'] = txt[-600:] if len(txt) > 600 else ''
                tur = d.get('toolUseResult')
                if isinstance(tur, dict):
                    for k in ('durationMs', 'interrupted', 'backgroundTaskId', 'returnCodeInterpretation'):
                        if k in tur:
                            r['tur_' + k] = tur[k]
json.dump({'calls': [calls[k] for k in order], 'asst': asst}, open(out, 'w'))
print('calls', len(order), 'asst', len(asst))
