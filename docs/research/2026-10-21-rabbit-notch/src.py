import json, numpy as np
d = json.load(open('scratch/source.json'))
W = np.array(d['welded']); T = np.array(d['tris'])
V = np.stack([W[:, 0], W[:, 2], -W[:, 1]], 1)
floor, top = V[:, 1].min(), V[:, 1].max(); V = (V - [0, floor, 0]) / (top - floor)
