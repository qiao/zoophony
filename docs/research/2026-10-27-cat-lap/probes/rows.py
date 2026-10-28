"""Prints the d of the belly bottom rows of dumps (source cm), and the middle-line turns."""
import sys
import numpy as np
ROWS = [('769', [769]), ('781/938', [781, 938]), ('767/949', [767, 949]), ('768', [768]),
        ('792', [792]), ('777/937', [777, 937]), ('770', [770]), ('784', [784]), ('771', [771])]
MID = [958, 769, 768, 770, 784, 771]
print('%-28s' % 'dump' + ''.join('%9s' % n for n, _ in ROWS) + '   mid turns 769 768 770 784')
for path in sys.argv[1:]:
    src = path.startswith('src:')
    path = path[4:] if src else path
    z = np.load(path)
    C = 73.8 / float(z['length'])
    d1, f1 = (z['d0'] * C, z['f0'] * 73.8) if src else (z['d1'] * C, z['f1'] * 73.8)
    cells = ''.join('%9.2f' % np.mean(d1[ids]) for _, ids in ROWS)
    t = f1[MID]; w = d1[MID]
    ang = np.degrees(np.arctan2(np.diff(w), np.diff(t)))
    print('%-28s' % path.split('/')[-1] + cells + '   ' + ' '.join('%5.1f' % (ang[k - 1] - ang[k]) for k in range(1, len(ang))))
