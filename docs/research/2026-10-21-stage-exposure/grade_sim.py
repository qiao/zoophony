"""Applies the grade of scene/grade.ts (gradeColor) and the vignette of the final pass to a frame
that has no grade and no vignette (the variant raw: identity curve, no vibrance, no tints, no
vignette), so that a curve can be tuned offline. Usage:
grade_sim.py <raw.png> <out.png> '<json of GRADE changes>' [vignette]"""
import json, sys
import numpy as np
from PIL import Image
G = {'curve': [[0,0],[31,25],[62,57],[110,104],[139,149],[172,210],[255,255]], 'saturation': 1.0,
     'vibrance': 0.5, 'shadowSaturation': 0.85, 'shadowTint': [-0.006,0,0.012], 'highlightTint': [0.01,0.002,-0.015]}
G.update(json.loads(sys.argv[3]) if len(sys.argv) > 3 else {})
vig = float(sys.argv[4]) if len(sys.argv) > 4 else 0.45
def mono(points):
    xs = [p[0]/255 for p in points]; ys = [p[1]/255 for p in points]; n = len(xs)
    s = [(ys[i+1]-ys[i])/(xs[i+1]-xs[i]) for i in range(n-1)]
    t = []
    for i in range(n):
        b = s[i-1] if i > 0 else s[i]; a = s[i] if i < n-1 else b
        t.append(0 if b*a <= 0 else (b+a)/2)
    for i, sl in enumerate(s):
        if sl == 0: t[i] = 0; t[i+1] = 0; continue
        a = t[i]/sl; b = t[i+1]/sl; h = a*a+b*b
        if h > 9: k = 3/np.sqrt(h); t[i] = k*a*sl; t[i+1] = k*b*sl
    def f(x):
        x = np.clip(x, xs[0], xs[-1]); i = np.clip(np.searchsorted(xs, x, side='right')-1, 0, n-2)
        X = np.array(xs); Y = np.array(ys); T = np.array(t)
        x0 = X[i]; h = X[i+1]-x0; u = (x-x0)/h; u2 = u*u; u3 = u2*u
        return (2*u3-3*u2+1)*Y[i] + (u3-2*u2+u)*h*T[i] + (-2*u3+3*u2)*Y[i+1] + (u3-u2)*h*T[i+1]
    return f
def ss(e0, e1, x):
    t = np.clip((x-e0)/(e1-e0), 0, 1); return t*t*(3-2*t)
img = np.asarray(Image.open(sys.argv[1]).convert('RGB'), float)/255
h, w, _ = img.shape
W = np.array([0.2126, 0.7152, 0.0722])
curve = mono(G['curve'])
L0 = img @ W
factor = np.where(L0 > 1e-4, curve(L0)/np.maximum(L0, 1e-4), 1)
c = np.minimum(1, img*factor[..., None])
L = c @ W
top = c.max(-1); low = c.min(-1); pale = np.where(top > 0, 1-(top-low)/np.maximum(top, 1e-6), 1)
sh = G['shadowSaturation'] + (1-G['shadowSaturation'])*ss(0.03, 0.3, L)
sat = G['saturation']*(1+G['vibrance']*pale*pale)*sh
sw = (1-ss(0, 0.45, L))*ss(0, 0.08, L); hw = ss(0.4, 1, L)
out = L[..., None] + (c-L[..., None])*sat[..., None] + np.array(G['shadowTint'])*sw[..., None] + np.array(G['highlightTint'])*hw[..., None]
yy, xx = np.mgrid[0:h, 0:w]; asp = w/h
fx = ((xx+0.5)/w-0.5)*asp; fy = (yy+0.5)/h-0.5
edge = np.hypot(fx, fy)/np.hypot(asp*0.5, 0.5)
out = out*(1-vig*ss(0.3, 1.0, edge))[..., None]
Image.fromarray((np.clip(out, 0, 1)*255+0.5).astype(np.uint8)).save(sys.argv[2])
