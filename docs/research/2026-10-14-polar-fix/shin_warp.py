# Warps the heights of the polar bear config: the shins grow by DELTA (units), the feet stay.
# y <= ANKLE: same. ANKLE < y < KNEE: stretched. y >= KNEE: + DELTA.
# Usage: python3 scratch/shin_warp.py <animal.toml> <role.toml> <delta>
import re
import sys
import tomllib

path, role_path, delta_text = sys.argv[1:4]
DELTA = float(delta_text)
ANKLE, KNEE = 0.07, 0.165
K = (KNEE - ANKLE + DELTA) / (KNEE - ANKLE)


RIGID = True


def warp(y, stretch=False):
    if RIGID and not stretch:
        return y + DELTA
    if y <= ANKLE:
        return y
    if y < KNEE:
        return ANKLE + (y - ANKLE) * K
    return y + DELTA


def fmt(v):
    if isinstance(v, list):
        return '[' + ', '.join(fmt(x) for x in v) + ']'
    s = f'{round(v, 4):.4f}'.rstrip('0')
    return s + '0' if s.endswith('.') else s


# Each rule: (section, key, kind). Kinds: y (scalar), v3 ([x, y, z]), xy ([x, y]),
# p0 ([[y, v], ...]), r0 ([from, width] ramp), box ([[x, y, z], [x, y, z]]), rect ([x0, y0, x1, y1]),
# both ([lo, hi]), heights ([from, to, step]), sub:<name>:<kind> (an inline table key).
RULES = [
    ('field.trunk', 'heights', 'heights'),
    ('field.trunk', 'width_measured_to', 'y'),
    ('field.trunk', 'width_measure_floor', 'y'),
    ('field.trunk', 'width_points', 'p0'),
    ('field.trunk', 'side_measure_floor', 'y'),
    ('field.trunk', 'front_measured_to', 'y'),
    ('field.trunk', 'front_points', 'p0'),
    ('field.trunk', 'widest', 'p0'),
    ('field.trunk', 'front_power', 'p0'),
    ('field.trunk', 'box', 'box'),
    ('field.head', 'bottom', 'y'),
    ('field.head', 'cheek', 'r0'),
    ('field.head', 'temple', 'y'),
    ('field.head', 'cap', 'y'),
    ('field.head', 'top', 'y'),
    ('field.head', 'face_points', 'p0'),
    ('field.head', 'face_join', 'y'),
    ('field.head', 'forehead_top', 'y'),
    ('field.head', 'back_points', 'p0'),
    ('field.head', 'back_join', 'y'),
    ('field.head', 'back_top', 'y'),
    ('field.brow', 'center', 'v3'),
    ('field.snout', 'base', 'v3'),
    ('field.snout', 'tip', 'v3'),
    ('field.snout', 'region', 'sub:center:v3'),
    ('field.ears', 'center', 'v3'),
    ('field.tail', 'center', 'v3'),
    ('field.arm.joints', 'clavicle', 'v3'),
    ('field.arm.joints', 'shoulder', 'v3'),
    ('field.arm.joints', 'elbow', 'v3'),
    ('field.arm.joints', 'wrist', 'v3'),
    ('field.arm.joints', 'knuckle', 'v3'),
    ('field.leg.joints', 'hip', 'v3'),
    ('field.leg.joints', 'knee', 'v3'),
    ('facets', 'squeeze', 'sub:center:v3'),
    ('facets.protect', 'box', 'sub:y:both'),
    ('paint.belly', 'center_y', 'y'),
    ('paint.under', 'heights', 'both'),
    ('paint.under', 'floor', 'ys'),
    ('paint.muzzle', 'min_y', 'y'),
    ('details.eyes', 'center', 'xy'),
    ('details.nose', 'at', 'xy'),
    ('rig.spine', 'hips', 'r0'),
    ('rig.spine', 'spine', 'r0'),
    ('rig.spine', 'spine1', 'r0'),
    ('rig.spine', 'chest', 'r0'),
    ('rig.spine', 'neck', 'r0'),
    ('rig.spine', 'head', 'r0'),
    ('rig.spine', 'head_end', 'r0'),
    ('rig', 'tail_bone', 'p3'),
    ('rig.weights', 'throat', 'sub:y:r0'),
    ('rig.weights', 'shoulder_tops', 'sub:y:r0'),
    ('rig.weights', 'crotch', 'sub:top:r0'),
    ('rig.weights', 'crotch', 'sub:low:r0'),
    ('rig.weights', 'crotch', 'sub:keel_y:r0'),
    ('rig.weights', 'head', 'sub:skull_from_y:r0'),
    ('rig.weights.trunk', 'head_from_y', 'r0'),
    ('rig.weights.trunk', 'legs', 'sub:thigh_top:y'),
    ('rig.weights.trunk', 'legs', 'sub:shin_top:y'),
    ('rig.weights.trunk', 'below', 'r0'),
    ('rig.weights.trunk', 'crotch', 'sub:top:r0'),
    ('rig.clavicle', 'lift', 'r0'),
    ('look.light', 'center_y', 'y'),
    ('measure', 'mesh_belly', 'rect'),
]


def apply(kind, v):
    if kind == 'y':
        return warp(v)
    if kind == 'ys':
        return warp(v, True)
    if kind == 'v3':
        return [v[0], warp(v[1]), v[2]]
    if kind == 'xy':
        return [v[0], warp(v[1])]
    if kind in ('p0', 'r0'):
        return [[warp(p[0]), *p[1:]] for p in v] if isinstance(v[0], list) else [warp(v[0]), *v[1:]]
    if kind == 'p3':
        return [[p[0], warp(p[1]), p[2]] for p in v]
    if kind == 'box':
        return [[c[0], warp(c[1]), c[2]] for c in v]
    if kind == 'rect':
        return [v[0], warp(v[1]), v[2], warp(v[3])]
    if kind == 'both':
        return [warp(x) for x in v]
    if kind == 'heights':
        return [warp(v[0]), warp(v[1]), v[2]]
    raise ValueError(kind)


def section_span(lines, section):
    start = next(i for i, l in enumerate(lines) if l.strip() == f'[{section}]')
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith('[')), len(lines))
    return start, end


def edit(text, data, section, key, kind):
    lines = text.split('\n')
    start, end = section_span(lines, section)
    node = data
    for part in section.split('.'):
        node = node[part]
    i = next(i for i in range(start, end) if re.match(rf'^{re.escape(key)}\s*=', lines[i]))
    if kind.startswith('sub:'):
        _, sub, inner = kind.split(':')
        old = node[key][sub]
        new = apply(inner, old)
        line = lines[i]
        m = re.search(rf'(\b{re.escape(sub)}\s*=\s*)(\[[^\]]*\]|[-0-9.]+)', line)
        if inner in ('v3', 'r0', 'both'):
            m = re.search(rf'(\b{re.escape(sub)}\s*=\s*)(\[[^\]]*\])', line)
        assert m, (section, key, sub)
        lines[i] = line[: m.start(2)] + fmt(new) + line[m.end(2):]
        print(f'{section}.{key}.{sub}: {old} -> {fmt(new)}')
    else:
        old = node[key]
        new = apply(kind, old)
        lines[i] = f'{key} = {fmt(new)}'
        print(f'{section}.{key}: {old} -> {fmt(new)}')
    return '\n'.join(lines)


text = open(path).read()
data = tomllib.loads(text)
for section, key, kind in RULES:
    text = edit(text, data, section, key, kind)

# The facet warps are an array of tables: each warp with a center above the knees moves up too.
# The warp of the feet stays, and a warp at a joint (`at`) moves with the joint.
lines = text.split('\n')
in_warp = False
for i, line in enumerate(lines):
    if line.startswith('['):
        in_warp = line.strip() == '[[facets.warps]]'
        continue
    m = re.match(r'^center = \[([-0-9.]+), ([-0-9.]+), ([-0-9.]+)\]$', line)
    if in_warp and m and float(m.group(2)) >= KNEE:
        x, y, z = (float(v) for v in m.groups())
        lines[i] = f'center = {fmt([x, y + DELTA, z])}'
        print(f'facets.warps.center: {[x, y, z]} -> {lines[i]}')
text = '\n'.join(lines)
open(path, 'w').write(text)

role = open(role_path).read()
rdata = tomllib.loads(role)
old = rdata['targets']['shoulder']
role = re.sub(r'^shoulder = \[.*\]$', f'shoulder = {fmt(apply("v3", old))}', role, flags=re.M)
open(role_path, 'w').write(role)
print(f'role targets.shoulder: {old} -> {fmt(apply("v3", old))}')
print(f'K = {K:.4f}')
