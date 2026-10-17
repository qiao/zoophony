import numpy as np, sys
pre = sys.argv[1]
bind = np.load(pre + '-bind.npy'); w = np.load(pre + '-weights.npy'); src = np.load(pre + '-src.npy')
B = 'root,hips,spine,spine1,chest,neck,head,ear_L,ear_R,clavicle_L,upper_arm_L,forearm_L,forearm_twist_L,hand_L,fingers_L,clavicle_R,upper_arm_R,forearm_R,forearm_twist_R,hand_R,fingers_R,thigh_L,shin_L,foot_L,toes_L,thigh_R,shin_R,foot_R,toes_R,tail,tail_tip'.split(',')
top = 0.2158
arm = [B.index(f'{b}_{s}') for b in ('upper_arm','forearm','forearm_twist','hand','fingers') for s in 'LR']
tail = [B.index('tail'), B.index('tail_tip')]
body = w[:, arm + tail].sum(axis=1) < 0.5
for band in [(0, 0.04), (0.04, 0.08), (0.08, 0.12), (0.12, 0.16)]:
    sel = body & (bind[:, 1] >= top + band[0]) & (bind[:, 1] < top + band[1])
    row = []
    for z in np.arange(-0.09, 0.2, 0.02):
        m = sel & (bind[:, 2] >= z) & (bind[:, 2] < z + 0.02)
        row.append(f'{np.abs(bind[m, 0]).max():.3f}' if m.any() else '  .  ')
    print(f'y {band}: ' + ' '.join(row))
print('z from -0.09 by 0.02')
t = w[:, tail].sum(axis=1) > 0.5
print('tail now: x', np.abs(bind[t, 0]).max(), 'y', bind[t, 1].min(), bind[t, 1].max(), 'z', bind[t, 2].min(), bind[t, 2].max())
print('source tail y', src[t, 1].min(), src[t, 1].max(), 'z', src[t, 2].min(), src[t, 2].max())
