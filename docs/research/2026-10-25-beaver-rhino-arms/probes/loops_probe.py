"""For each share of the upper arm and the paw, finds the closed loop around the arm, and prints
its center gap from the arm line and its mean radius, in units.
blender -b --factory-startup -P docs/research/2026-10-25-beaver-rhino-arms/probes/loops_probe.py -- <animal> <source> <factor> [zx zr]
"""
import os
import sys

import bmesh
from mathutils import Vector

sys.path.insert(0, os.path.join(os.getcwd(), 'tools', 'blender'))
import violin_arms as va  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:]
animal, source, factor = argv[0], argv[1], float(argv[2])
zx = float(argv[3]) if len(argv) > 3 else 0.12
zr = float(argv[4]) if len(argv) > 4 else 0.09
va.ANIMALS[animal] = {'config': f'tools/mesh-rigs/{animal}.json', 'source': source,
                      'folder': '/tmp', 'factor': factor, 'slim': (1, 1),
                      'cut': {'shoulder': 0.4, 'tilt': 0, 'wrist': 0.3},
                      'zone': {'x': zx, 'radius': zr}, 'gap': 0.02, 'upper': (0.5,),
                      'fore': 6, 'texture': 512, 'faces': 900, 'paint': {}}
va.clear_scene()
s = va.Session(animal, '/tmp')
va.import_mesh(s)
bm = bmesh.new()
bm.from_mesh(s.mesh.data)
fr = s.fr


def probe(name, k, p, axis, line, side):
    try:
        faces, pts = va.ring_faces(s, bm, line, side, p, axis)
    except RuntimeError:
        print('  %s %.2f: none' % (name, k))
        return
    c = sum(pts, Vector()) / len(pts)
    r = sum((q - c).length for q in pts) / len(pts)
    print('  %s %.2f: %d faces, center gap %.4f, radius %.4f, min |x| %.4f, min y %.4f'
          % (name, k, len(faces), (c - p).length / fr.height, r / fr.height,
             min(abs(q.x) for q in pts) / fr.height, min((q.z - fr.floor) for q in pts) / fr.height))


for side in (1, -1):
    line = va.arm_line(s, side)
    a, e, w, t = line
    print('side', side, 'upper %.4f fore %.4f paw %.4f' % ((e - a).length / fr.height,
                                                           (w - e).length / fr.height,
                                                           (t - w).length / fr.height))
    for k in (0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9):
        probe('upper', k, a.lerp(e, k), (e - a).normalized(), line, side)
    for k in (0.25, 0.5, 0.75):
        probe('fore', k, e.lerp(w, k), (w - e).normalized(), line, side)
    for k in (0.1, 0.2, 0.3, 0.4):
        probe('paw', k, w + (t - w) * k, (t - w).normalized(), line, side)
