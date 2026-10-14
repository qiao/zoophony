import json, struct, sys
import numpy as np
path = sys.argv[1]
data = open(path, 'rb').read()
jlen = struct.unpack('<I', data[12:16])[0]
gj = json.loads(data[20:20 + jlen])
bin0 = data[20 + jlen + 8:]
def acc(i):
    a = gj['accessors'][i]; bv = gj['bufferViews'][a['bufferView']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[a['componentType']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(bin0, dt, a['count'] * n, off).reshape(a['count'], n)
for m in gj['meshes']:
    for p in m['primitives']:
        mat = gj['materials'][p['material']]['name'] if 'material' in p else '-'
        if 'COLOR_0' not in p['attributes']:
            continue
        c = acc(p['attributes']['COLOR_0'])
        idx = acc(p['indices']).ravel() if 'indices' in p else np.arange(len(c))
        fc = c[idx[0::3]]
        lum = 0.2126 * fc[:, 0] + 0.7152 * fc[:, 1] + 0.0722 * fc[:, 2]
        srgb = np.where(fc <= 0.0031308, 12.92 * fc, 1.055 * fc ** (1 / 2.4) - 0.055)
        print(m['name'], mat, 'faces', len(fc), 'unique', len(np.unique(np.round(fc, 5), axis=0)))
        print('  linear lum p5/25/50/75/95:', np.round(np.percentile(lum, [5, 25, 50, 75, 95]), 3))
        bright = lum > 0.3
        print('  faces lum>0.3:', bright.sum(), 'sRGB mean', np.round(srgb[bright].mean(0), 3), 'sRGB std', np.round(srgb[bright].std(0), 3))
# Gray faces of the fur: lower lightness with the hue of the cream (a share of black in the mean).
for m in gj['meshes']:
    for p in m['primitives']:
        if gj['materials'][p['material']]['name'] != 'fur':
            continue
        c = acc(p['attributes']['COLOR_0']); idx = acc(p['indices']).ravel()
        P = acc(p['attributes']['POSITION'])
        fc = c[idx[0::3]]
        srgb = np.where(fc <= 0.0031308, 12.92 * fc, 1.055 * fc ** (1 / 2.4) - 0.055)
        cream = np.array([0.96, 0.89, 0.80])
        # Share of black: the scale k of the cream that is nearest to the face color.
        k = (srgb @ cream) / (cream @ cream)
        resid = np.linalg.norm(srgb - k[:, None] * cream, axis=1)
        gray = (k < 0.9) & (resid < 0.08)
        print('fur faces darker than 0.9 of the cream, with its hue:', gray.sum(), 'of', len(fc))
        for lo, hi in [(0.8, 0.9), (0.6, 0.8), (0.0, 0.6)]:
            print(f'  k {lo}-{hi}:', ((k >= lo) & (k < hi) & (resid < 0.08)).sum())
