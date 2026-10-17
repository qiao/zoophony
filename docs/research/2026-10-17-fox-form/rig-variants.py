"""Rigs variants of a config of `pnpm rig-mesh` with Blender, with no write into the repository. A copy
of the variant driver of the round cat-form. Usage, from the root of the worktree:

  python3 docs/research/2026-10-17-fox-form/rig-variants.py scan <animal> <slope> <front>...
  python3 docs/research/2026-10-17-fox-form/rig-variants.py rig <name> <animal> <json changes>

The changes are {path: value}, and the key slope gives the leg turns of leg_turns.py <config>
<slope> 8 0. The configs, the GLB files, and the logs go into scratch/var/. The variable RIG names
another copy of rig_mesh.py. Each line gives the side view of the final bind (gap, cm), the seat
top, the code, and the faces that the sit turns over.
"""
import json
import os
import re
import subprocess
import sys

W = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
V = os.path.join(W, 'scratch', 'var')
os.makedirs(V, exist_ok=True)
BLENDER = '/opt/homebrew/bin/blender'
TAIL_BIND = {'tail': [0, -0.36, -1], 'tail_tip': [0, -1.4, -1]}


def base(animal):
    with open(os.path.join(W, 'tools', 'mesh-rigs', f'{animal}.json')) as f:
        return json.load(f)


def leg_turns(animal, slope, out=8, slant=0):
    cmd = ['uv', 'run', '--no-project', '--with', 'numpy', 'python', '-I',
           os.path.join(W, 'docs/research/2026-10-16-hip-open/leg_turns.py'),
           os.path.join(W, 'tools', 'mesh-rigs', f'{animal}.json'), str(slope), str(out), str(slant)]
    text = subprocess.run(cmd, capture_output=True, text=True, check=True).stdout
    return json.loads(text.strip().splitlines()[-1])


def setp(config, path, value):
    keys = path.split('.')
    node = config
    for k in keys[:-1]:
        node = node[int(k)] if isinstance(node, list) else node.setdefault(k, {})
    if value == 'DELETE':
        node.pop(keys[-1], None)
    else:
        node[keys[-1]] = value


def rig(name, config):
    path = os.path.join(V, f'{name}.json')
    with open(path, 'w') as f:
        json.dump(config, f, indent=2)
    glb = os.path.join(V, f'{name}.glb')
    log = os.path.join(V, f'{name}.log')
    with open(log, 'w') as f:
        code = subprocess.run([BLENDER, '-b', '--factory-startup', '--python-exit-code', '1',
                               '--python', os.environ.get('RIG', os.path.join(W, 'tools/blender/rig_mesh.py')), '--',
                               path, glb], stdout=f, stderr=subprocess.STDOUT).returncode
    text = open(log).read()
    out = {'code': code}
    m = re.search(r'final bind behind the hip joints is at most ([-0-9.]+) cm', text)
    out['gap'] = float(m.group(1)) if m else None
    m = re.search(r'chair: seat top ([-0-9.]+) u', text)
    out['top'] = float(m.group(1)) if m else None
    m = re.search(r'rise toward the seat top ([-0-9.]+) u', text)
    out['rise_top'] = float(m.group(1)) if m else None
    m = re.search(r'the shins and the feet from z ([-0-9.]+) u', text)
    out['shins'] = float(m.group(1)) if m else None
    m = re.search(r'the tail goes ([-0-9.]+) u over the seat top', text)
    out['tail'] = float(m.group(1)) if m else None
    m = re.search(r'sit: .*? (\d+) faces turn over', text)
    out['sit_turn'] = int(m.group(1)) if m else None
    m = re.search(r'triangles: (\d+)', text)
    out['tris'] = int(m.group(1)) if m else None
    return out


def posture(animal, slope, front, hanging=False, top=None, extra=None):
    c = base(animal)
    c['studio']['legTurns'] = leg_turns(animal, slope)
    c['chair']['front'] = front
    if hanging:
        c['studio'].pop('tailCurl', None)
        c['studio']['tailBind'] = TAIL_BIND
        c['sit'].pop('top', None)
    elif top is not None:
        c['sit']['top'] = top
    for path, value in (extra or {}).items():
        setp(c, path, value)
    return c


def main():
    mode = sys.argv[1]
    if mode == 'scan':
        animal, slope = sys.argv[2], float(sys.argv[3])
        extra = json.loads(os.environ.get('EXTRA', '{}'))
        for front in sys.argv[4:]:
            f = float(front)
            hanging = animal == 'cat'
            name = f'scan-{animal}-{slope:g}-{f:g}{os.environ.get("TAG", "")}'
            r = rig(name, posture(animal, slope, f, hanging=hanging, extra=extra))
            print(f'{animal} slope {slope:g} front {f:g}: top {r["top"]} rise_top {r["rise_top"]} '
                  f'gap {r["gap"]} cm shins {r["shins"]} code {r["code"]}', flush=True)
    elif mode == 'rig':
        name, animal = sys.argv[2], sys.argv[3]
        spec = json.loads(sys.argv[4])
        c = base(animal)
        if 'slope' in spec:
            c['studio']['legTurns'] = leg_turns(animal, spec.pop('slope'))
        for path, value in spec.items():
            setp(c, path, value)
        r = rig(name, c)
        print(name, json.dumps(r))


main()
