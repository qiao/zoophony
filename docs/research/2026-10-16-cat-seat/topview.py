"""Plots the seated bind of variants from above: the body below 0.12 u over the seat (gray), the
tail (red), the seat of the app, and the back posts. Usage: topview.py <out.png> <variant>..."""
import numpy as np, sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
B = 'root,hips,spine,spine1,chest,neck,head,ear_L,ear_R,clavicle_L,upper_arm_L,forearm_L,forearm_twist_L,hand_L,fingers_L,clavicle_R,upper_arm_R,forearm_R,forearm_twist_R,hand_R,fingers_R,thigh_L,shin_L,foot_L,toes_L,thigh_R,shin_R,foot_R,toes_R,tail,tail_tip'.split(',')
names = sys.argv[2:]
fig, axes = plt.subplots(1, len(names), figsize=(5 * len(names), 6))
axes = np.atleast_1d(axes)
M = 163.9161
hw = 0.21 / M * 100; leg = 0.035 / M * 100
for ax, n in zip(axes, names):
    pre = f'scratch/variants/{n}'
    bind = np.load(pre + '-bind.npy'); w = np.load(pre + '-weights.npy')
    tail = w[:, [B.index('tail'), B.index('tail_tip')]].sum(1)
    arm = [B.index(b) for b in B if b.rsplit('_', 1)[0] in ('upper_arm', 'forearm', 'forearm_twist', 'hand', 'fingers')]
    body = (tail < 0.5) & (w[:, arm].sum(1) < 0.5) & (bind[:, 1] < 0.2153 + 0.12)
    ax.scatter(bind[body, 0], bind[body, 2], s=2, c=bind[body, 1], cmap='Greys_r')
    t = tail > 0.5
    ax.scatter(bind[t, 0], bind[t, 2], s=3, c=bind[t, 1], cmap='autumn')
    ax.add_patch(plt.Rectangle((-hw, -0.087), 2 * hw, 0.187, fill=False, color='blue'))
    for sx in (-1, 1):
        ax.add_patch(plt.Rectangle((sx * hw - (leg if sx > 0 else 0), -0.087), leg, leg, color='blue'))
    ax.set_aspect('equal'); ax.set_xlim(-0.25, 0.25); ax.set_ylim(-0.15, 0.25); ax.set_title(n)
    ax.invert_xaxis()
plt.savefig(sys.argv[1], dpi=70)
