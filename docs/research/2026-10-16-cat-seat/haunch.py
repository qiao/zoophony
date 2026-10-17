import numpy as np, sys
pre = sys.argv[1]
bind = np.load(pre + '-bind.npy'); w = np.load(pre + '-weights.npy'); tris = np.load(pre + '-tris.npy')
BONES = sys.argv[2].split(',')
top = 0.2158
# vertices near the back of the haunch, low
sel = np.nonzero((bind[:, 2] < -0.035) & (bind[:, 2] > -0.07) & (bind[:, 1] < top + 0.08) & (np.abs(bind[:, 0]) < 0.12))[0]
for i in sel[np.argsort(bind[sel, 2])]:
    main = np.argsort(-w[i])[:3]
    print(i, np.round(bind[i], 4), 'gap cm %.1f' % ((bind[i, 1] - top) * 163.9), ' '.join(f'{BONES[k]}:{w[i, k]:.2f}' for k in main if w[i, k] > 0.01))
