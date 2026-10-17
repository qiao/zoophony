"""Measures the tail of the final seated bind of a variant (rig units, printed in cm): the depth
into the seat top, the reach outside the seat of the app seen from above, the depth into the
back posts of the chair of the app, the lowest point above the floor, and the depth into the
body (the faces with no tail, arm, shin, or foot weight; the sign of the nearest face)."""
import numpy as np, re, sys
pre = sys.argv[1]
bind = np.load(pre + '-bind.npy'); w = np.load(pre + '-weights.npy'); tris = np.load(pre + '-tris.npy')
log = open(pre + '.log').read()
top = float(re.search(r"chair: seat top ([\d.]+) u", log).group(1))
floor = float(re.search(r"lowest point of the body ([\d.]+) u", log).group(1))
M = 163.9161
B = 'root,hips,spine,spine1,chest,neck,head,ear_L,ear_R,clavicle_L,upper_arm_L,forearm_L,forearm_twist_L,hand_L,fingers_L,clavicle_R,upper_arm_R,forearm_R,forearm_twist_R,hand_R,fingers_R,thigh_L,shin_L,foot_L,toes_L,thigh_R,shin_R,foot_R,toes_R,tail,tail_tip'.split(',')
tail_share = w[:, [B.index('tail'), B.index('tail_tip')]].sum(axis=1)
tail = tail_share > 0.5
hw = 0.42 / 2 / M * 100  # half width of the seat of the app, in units
back, front = -0.087, 0.1
p = bind[tail]
over = np.maximum.reduce([np.abs(p[:, 0]) - hw, back - p[:, 2], p[:, 2] - front])
on = over <= 0
into_seat = (top - p[on, 1]).max(initial=-np.inf)
leg = 0.035 / M * 100
post = (np.abs(p[:, 0]) >= hw - leg) & (p[:, 2] <= back + leg) & (p[:, 1] > top - 0.01)
post_ids = np.nonzero(tail)[0][post]
post_depth = np.minimum(np.abs(p[post, 0]) - (hw - leg), (back + leg) - p[post, 2]).max(initial=0)
# Body: no tail, no arms, no shins and feet (the tail does not reach them).
skip = [B.index(n) for n in B if n.split('_')[0] in ('tail', 'upper', 'forearm', 'hand', 'fingers')]
skip = [B.index(n) for n in B if n in ('tail', 'tail_tip') or n.rsplit('_', 1)[0] in ('upper_arm', 'forearm', 'forearm_twist', 'hand', 'fingers')]
body_v = w[:, skip].sum(axis=1) < 0.1
faces = tris[body_v[tris].all(axis=1)]
a, b, c = bind[faces[:, 0]], bind[faces[:, 1]], bind[faces[:, 2]]
n = np.cross(b - a, c - a); n /= np.linalg.norm(n, axis=1)[:, None] + 1e-12
def closest(q):
    # The closest point of each triangle to q (Ericson, Real-Time Collision Detection 5.1.5).
    ab, ac, ap = b - a, c - a, q - a
    d1, d2 = (ab * ap).sum(1), (ac * ap).sum(1)
    bp = q - b; d3, d4 = (ab * bp).sum(1), (ac * bp).sum(1)
    cp = q - c; d5, d6 = (ab * cp).sum(1), (ac * cp).sum(1)
    va = d3 * d6 - d5 * d4; vb = d5 * d2 - d1 * d6; vc = d1 * d4 - d3 * d2
    den = va + vb + vc
    v = np.where(np.abs(den) > 1e-18, vb / np.where(np.abs(den) > 1e-18, den, 1), 0)
    ww = np.where(np.abs(den) > 1e-18, vc / np.where(np.abs(den) > 1e-18, den, 1), 0)
    out = a + ab * v[:, None] + ac * ww[:, None]
    # Regions of the corners and the edges.
    def edge(p0, e, t):
        return p0 + e * np.clip(t, 0, 1)[:, None]
    m = (d1 <= 0) & (d2 <= 0); out[m] = a[m]
    m = (d3 >= 0) & (d4 <= d3); out[m] = b[m]
    m = (d6 >= 0) & (d5 <= d6); out[m] = c[m]
    m = (vc <= 0) & (d1 >= 0) & (d3 <= 0); out[m] = edge(a, ab, d1 / np.where(d1 - d3 != 0, d1 - d3, 1))[m]
    m = (vb <= 0) & (d2 >= 0) & (d6 <= 0); out[m] = edge(a, ac, d2 / np.where(d2 - d6 != 0, d2 - d6, 1))[m]
    m = (va <= 0) & ((d4 - d3) >= 0) & ((d5 - d6) >= 0)
    t = (d4 - d3) / np.where((d4 - d3) + (d5 - d6) != 0, (d4 - d3) + (d5 - d6), 1)
    out[m] = edge(b, c - b, t)[m]
    return out
deep = 0.0
where = None
ids = np.nonzero(tail_share > 0.95)[0]
for i in ids:
    q = bind[i]
    cp = closest(q)
    d = np.linalg.norm(cp - q, axis=1)
    k = int(np.argmin(d))
    if (q - cp[k]) @ n[k] < 0 and d[k] < 0.08:
        if d[k] > deep:
            deep = d[k]; where = (int(i), np.round(q, 3).tolist(), round(float(tail_share[i]), 2))
print(f'{pre.split("/")[-1]}: seat top {top:.4f} u; tail into the seat {max(into_seat, 0) * M:.1f} cm; '
      f'outside the seat from above {max(over.max(), 0) * M:.1f} cm; in the back posts {post_depth * M:.1f} cm; '
      f'lowest above the floor {(p[:, 1].min() - floor) * M:.1f} cm; into the body {deep * M:.1f} cm')
print('  deepest in the body at', where)
if post.any():
    k = np.argmax(np.minimum(np.abs(p[post, 0]) - (hw - leg), (back + leg) - p[post, 2]))
    print('  deepest in a post at', np.round(p[post][k], 3).tolist())
