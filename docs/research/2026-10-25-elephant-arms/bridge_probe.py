"""Runs the elephant steps up to the clean bridge, and lists the bridge and tube faces whose normal
points toward the arm line (turned over), and the smallest corner angle of the bridge faces.

blender -b --factory-startup -P docs/research/2026-10-25-elephant-arms/bridge_probe.py -- [key=value ...]
key=value overrides ELEPHANT entries as Python literals, such as cut="{'shoulder':0.4,...}".
"""
import ast
import math
import os
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.join(os.getcwd(), 'tools', 'blender'))
import elephant_arms as ea  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
for kv in argv:
    k, v = kv.split('=', 1)
    ea.ELEPHANT[k] = ast.literal_eval(v)
wa, va = ea.wa, ea.va
wa.ANIMALS['elephant'] = ea.ELEPHANT
va.clear_scene()
s = wa.Session('elephant', '/tmp/none')
names = [st.__name__ for st in ea.STEPS]
last = names.index('step_clean_bridge') + 1
for st in ea.STEPS[:last]:
    print('%s: %s' % (st.__name__, st(s)))
mesh = s.mesh
bm = bmesh.new()
bm.from_mesh(mesh.data)
part = bm.verts.layers.int['arm_part']
for side, off in ((1, 0), (-1, 10)):
    line = va.arm_line(s, side)
    a, e, w, t = line
    for code in ('shoulder', 'wrist'):
        loop = va.PART[code] + off
        tube = va.PART['tube'] + off
        faces = [f for f in bm.faces if any(p[part] == loop for p in f.verts)
                 and any(p[part] == tube for p in f.verts)]
        bad = []
        for f in faces:
            c = f.calc_center_median()
            # The nearest point of the arm line.
            seg = min(((line[i], line[i + 1]) for i in range(3)),
                      key=lambda ab: va.seg_distance(c, *ab))
            ab = seg[1] - seg[0]
            k = max(0.0, min(1.0, (c - seg[0]).dot(ab) / ab.length_squared))
            out = c - (seg[0] + ab * k)
            if f.normal.dot(out) < 0:
                bad.append(f.index)
        angles = [min(math.degrees(l.calc_angle()) for l in f.loops) for f in faces]
        print('side %d %s: %d bridge faces, %d turned in, smallest corner %.1f, loop verts %d'
              % (side, code, len(faces), len(bad), min(angles),
                 sum(1 for p in bm.verts if p[part] == loop)))
for side, off in ((1, 0), (-1, 10)):
    line = va.arm_line(s, side)
    tube = va.PART['tube'] + off
    faces = [f for f in bm.faces if all(p[part] == tube for p in f.verts)]
    bad = []
    for f in faces:
        c = f.calc_center_median()
        seg = min(((line[i], line[i + 1]) for i in range(3)),
                  key=lambda ab: va.seg_distance(c, *ab))
        ab = seg[1] - seg[0]
        k = max(0.0, min(1.0, (c - seg[0]).dot(ab) / ab.length_squared))
        if f.normal.dot(c - (seg[0] + ab * k)) < 0:
            bad.append((f.index, round((c - line[2]).length / s.fr.height, 3)))
    print('side %d tube: %d faces, turned in (index, units from the wrist): %s'
          % (side, len(faces), bad))
