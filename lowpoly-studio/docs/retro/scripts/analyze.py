"""Classifies the tool calls and splits the wall time of each round."""
import json, re, collections, datetime
import os

# The folder of the files between the steps (events.json and the calls files).
WORK = os.environ.get('RETRO_WORK', '.')
e = json.load(open(os.path.join(WORK, 'events.json')))
calls, asst = e['calls'], e['asst']
T = lambda s: datetime.datetime.fromisoformat(s).timestamp()
ROUNDS = [  # name, start, end (the end is the final report or the stop)
    ('R1 first build', T('2026-10-11T23:39:20+00:00'), T('2026-10-12T00:46:40+00:00')),
    ('R2 fix + topology', T('2026-10-12T01:06:59+00:00'), T('2026-10-12T01:53:10+00:00')),
    ('R3 organic, head, folds', T('2026-10-12T03:05:45+00:00'), T('2026-10-12T04:30:50+00:00')),
    ('R4 eyes, head, ears (stopped)', T('2026-10-12T04:48:47+00:00'), T('2026-10-12T05:00:14+00:00')),
]

def tags(c):
    n, cmd, d = c['name'], c['cmd'], c['desc'].lower()
    t = set()
    if n == 'Read':
        t.add('look_image' if c['imgs'] else 'read_text')
        return t
    if n == 'Write':
        t.add('write_file')
        if c['file'].endswith('.md'):
            t.add('docs')
        return t
    if n != 'Bash':
        t.add(n)
        return t
    if 'def patch(' in cmd or "sed -i" in cmd or re.search(r"cat > (?!" + re.escape(os.path.expanduser('~')) + r"/\.claude/jobs)", cmd) or 'apply_patch' in cmd:
        t.add('edit')
    if re.search(r'blender -b|build\.sh|python3\.13|\$PY |fit\.py', cmd):
        t.add('blender')
    if 'build.sh' in cmd:
        t.add('full_build')
    if 'shoot.mjs' in cmd or 'playwright' in cmd.lower():
        t.add('render_shoot')
    if re.search(r'git (commit|add|status|log|diff|show)', cmd):
        t.add('git')
    if 'README' in cmd or 'readme' in d:
        t.add('docs')
    if re.search(r'^(cd [^&]+&& )?(grep|sed -n|cat [^>]|head|tail|awk|ls|wc)', cmd.strip()) or d.startswith(('show ', 'find ', 'list ')):
        t.add('inspect_code')
    if re.search(r'PIL|Image\.open|measure|topology\.py|facets\.py|ears\.py|eyes\.py|pattern\.py', cmd) or re.search(r'measure|count|crop|stack|join|compare the|print', d):
        t.add('measure_or_crop')
    if re.search(r'pgrep|pkill|kill ', cmd):
        t.add('process_mgmt')
    if not t:
        t.add('other')
    return t

def primary(t):
    for k in ('full_build', 'blender', 'render_shoot', 'measure_or_crop', 'edit', 'git', 'docs', 'inspect_code', 'look_image', 'read_text', 'write_file', 'process_mgmt'):
        if k in t:
            return k
    return sorted(t)[0]

for c in calls:
    c['tags'] = sorted(tags(c)); c['prim'] = primary(set(c['tags'])); c['dur'] = c['end'] - c['start']
    c['round'] = next((r[0] for r in ROUNDS if r[1] <= c['start'] <= r[2]), 'between')

def union(iv):
    iv = sorted(iv); tot = 0; cur = None
    for a, b in iv:
        if cur is None or a > cur[1]:
            if cur: tot += cur[1] - cur[0]
            cur = [a, b]
        else:
            cur[1] = max(cur[1], b)
    if cur: tot += cur[1] - cur[0]
    return tot

print('=== Rounds')
for name, a, b in ROUNDS:
    cs = [c for c in calls if a <= c['start'] <= b]
    tool = union([(c['start'], c['end']) for c in cs])
    aa = [x for x in asst if a <= x['ts'] <= b]
    out = sum(x['out_tokens'] or 0 for x in aa)
    imgs = sum(c['imgs'] for c in cs)
    print(f"{name:32s} wall {(b-a)/60:6.1f} min  tool {tool/60:5.1f} min ({100*tool/(b-a):3.0f}%)  model {(b-a-tool)/60:5.1f} min  calls {len(cs):3d}  images {imgs:3d}  asst msgs {len(aa)}")
tot_wall = sum(b - a for _, a, b in ROUNDS)
print('active total min', round(tot_wall/60, 1), 'span min', round((ROUNDS[-1][2]-ROUNDS[0][1])/60, 1))

print('\n=== Tool time by primary category (sum of durations, seconds) and counts')
agg = collections.defaultdict(lambda: [0, 0.0])
for c in calls:
    agg[c['prim']][0] += 1; agg[c['prim']][1] += c['dur']
for k, (n, s) in sorted(agg.items(), key=lambda x: -x[1][1]):
    print(f"  {k:16s} n {n:4d}  sum {s/60:6.1f} min  mean {s/n:6.1f} s")

print('\n=== Tag counts (multi-label)')
tc = collections.Counter(t for c in calls for t in c['tags'])
print(' ', dict(tc.most_common()))

print('\n=== Tool counts by name')
print(' ', collections.Counter(c['name'] for c in calls))

# Model time after each tool result, attributed to the kind of the previous call batch.
print('\n=== Model time after each kind of result (gap from the result to the next tool call)')
starts = sorted(set(c['start'] for c in calls))
gap = collections.defaultdict(lambda: [0, 0.0])
byend = collections.defaultdict(list)
for c in calls:
    byend[c['start']].append(c)
for i, s in enumerate(starts[:-1]):
    batch = byend[s]; end = max(c['end'] for c in batch); nxt = starts[i+1]
    g = nxt - end
    if g < 0 or g > 1800:  # skip overlaps and the waits between rounds
        continue
    kind = 'image' if any(c['imgs'] for c in batch) else batch[0]['prim']
    gap[kind][0] += 1; gap[kind][1] += g
for k, (n, s) in sorted(gap.items(), key=lambda x: -x[1][1]):
    print(f"  after {k:16s} n {n:4d}  sum {s/60:6.1f} min  mean {s/n:5.1f} s")

json.dump(calls, open(os.path.join(WORK, 'calls_tagged.json'), 'w'))
