"""Finds patch pairs that change only numbers, and the parameter sweeps."""
import json, re, sys, collections
p = sys.argv[1]
PAIR = re.compile(r'\(\s*(?:r?"""(.*?)"""|r?\'\'\'(.*?)\'\'\'|r?"((?:[^"\\\n]|\\.)*)"|r?\'((?:[^\'\\\n]|\\.)*)\')\s*,\s*(?:r?"""(.*?)"""|r?\'\'\'(.*?)\'\'\'|r?"((?:[^"\\\n]|\\.)*)"|r?\'((?:[^\'\\\n]|\\.)*)\')\s*\)', re.S)
FILE = re.compile(r"patch\(\s*['\"]?([\w/\.]+)['\"]?\s*,\s*\[")
NUM = re.compile(r'-?\d+\.?\d*(e-?\d+)?')
pairs_total = 0; numeric = collections.Counter(); allp = collections.Counter(); patch_calls = 0
sweeps = []; i = 0; sed_num = collections.Counter()
with open(p) as f:
    for line in f:
        d = json.loads(line)
        if d.get('type') != 'assistant':
            continue
        for b in d['message'].get('content', []):
            if b.get('type') != 'tool_use' or b.get('name') != 'Bash':
                continue
            i += 1
            cmd = b['input'].get('command', ''); desc = b['input'].get('description', '')
            if re.search(r'\bfor \w+( \w+)* in ', cmd) and re.search(r'blender|shoot\.mjs|build\.sh', cmd):
                sweeps.append((i, desc[:70], len(re.findall(r'\bfor ', cmd))))
            for m in re.finditer(r"sed -i '' (?:-E )?['\"]([^'\"]+)['\"] ([\w/\.]+)", cmd):
                if re.search(r'\d', m.group(1)):
                    sed_num[m.group(2).rsplit('/', 1)[-1]] += 1
            if 'def patch(' not in cmd:
                continue
            patch_calls += 1
            # split per patch() call to know the file
            segs = re.split(r"(?=patch\(\s*['\"A-Z])", cmd)
            for seg in segs:
                fm = FILE.match(seg)
                fname = fm.group(1).rsplit('/', 1)[-1] if fm else '?'
                for m in PAIR.finditer(seg):
                    g = m.groups()
                    old = next((x for x in g[:4] if x is not None), ''); new = next((x for x in g[4:] if x is not None), '')
                    if not old or old == new:
                        continue
                    pairs_total += 1; allp[fname] += 1
                    if NUM.sub('#', old) == NUM.sub('#', new):
                        numeric[fname] += 1
print('Bash calls with patch():', patch_calls, ' patch pairs:', pairs_total, ' number-only pairs:', sum(numeric.values()))
print('pairs by file:', dict(allp.most_common(15)))
print('number-only pairs by file:', dict(numeric.most_common(15)))
print('sed -i number edits by file:', dict(sed_num.most_common()))
print('sweeps (loops that run blender, the browser, or the build):', len(sweeps))
for s in sweeps:
    print('  ', s)
