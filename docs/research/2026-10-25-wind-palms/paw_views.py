"""Renders the left paw of a source GLB at close range from six sides, with the palm hint of its
rig config as a red rod and the paw axis as a green rod, and writes the paw vertices and faces.

    blender -b --factory-startup --python docs/research/2026-10-25-wind-palms/paw_views.py -- <species> <out dir>

The axes of the output JSON are the axes of the studio: +x the left side, +y up, +z forward, 1 unit
from the soles to the top, as `load_mesh()` of `tools/blender/rig_mesh.py` gives them.
"""

import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

species, out = sys.argv[sys.argv.index('--') + 1 :]
config = json.load(open(f'tools/mesh-rigs/{species}.json'))
os.makedirs(out, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=config['source'])
ob = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
bm = bmesh.new()
bm.from_mesh(ob.data)
bm.transform(ob.matrix_world)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=config['weld'])
bm.verts.ensure_lookup_table()
blender_verts = np.array([v.co[:] for v in bm.verts])
faces = [[v.index for v in f.verts] for f in bm.faces]
bm.free()
studio = np.stack([blender_verts[:, 0], blender_verts[:, 2], -blender_verts[:, 1]], axis=-1)
floor, top = studio[:, 1].min(), studio[:, 1].max()
scale = 1.0 / (top - floor)
studio = (studio - [0.0, floor, 0.0]) * scale
p = config.get('proportions', {})
studio = studio * [p.get('width', 1), p.get('height', 1), p.get('depth', 1)]

joints = config['joints']
wrist = np.array(joints['hand_L']['head'], float)
tip = np.array(joints['fingers_L']['tail'], float)
axis = (tip - wrist) / np.linalg.norm(tip - wrist)
length = np.linalg.norm(tip - wrist)
hint = np.array(config['palm'], float)
hint = hint - axis * hint.dot(axis)
hint /= np.linalg.norm(hint)

# The paw: the vertices beyond the wrist, near its axis, in the component of the nearest vertex.
rel = studio - wrist
t = rel @ axis
lateral = np.linalg.norm(rel - np.outer(t, axis), axis=1)
near = (t > -0.15 * length) & (t < 2.5 * length) & (lateral < 1.3 * length)
idx = np.nonzero(near)[0]
keep = set(idx.tolist())
adj = {i: set() for i in keep}
paw_faces = []
for f in faces:
    if all(v in keep for v in f):
        paw_faces.append(f)
        for a in f:
            for b in f:
                if a != b:
                    adj[a].add(b)
middle = wrist + axis * 0.5 * length
start = min(keep, key=lambda i: np.linalg.norm(studio[i] - middle))
seen, stack = {start}, [start]
while stack:
    i = stack.pop()
    for j in adj[i]:
        if j not in seen:
            seen.add(j)
            stack.append(j)
paw = sorted(seen)
paw_faces = [f for f in paw_faces if all(v in seen for v in f)]
json.dump(
    {
        'species': species,
        'wrist': wrist.tolist(),
        'tip': tip.tolist(),
        'hint': hint.tolist(),
        'vertices': {str(i): studio[i].tolist() for i in paw},
        'faces': paw_faces,
    },
    open(f'{out}/{species}-paw.json', 'w'),
)
print(f'paw_views: {species} {len(paw)} paw vertices, {len(paw_faces)} faces')


def to_blender(v):
    """Converts a point of the studio axes back to the scaled Blender axes of the scene."""
    v = np.asarray(v, float) / scale + [0.0, floor * 1.0, 0.0] * 0
    return Vector((v[0], -v[2], v[1] + floor))


# Show the whole source, scaled into the studio units, with the rods at the paw.
ob.data.transform(ob.matrix_world)
ob.matrix_world.identity()
for v in ob.data.vertices:
    s = np.array([v.co.x, v.co.z, -v.co.y])
    s = (s - [0.0, floor, 0.0]) * scale * [p.get('width', 1), p.get('height', 1), p.get('depth', 1)]
    v.co = Vector((s[0], -s[2], s[1]))


def rod(start, direction, size, color, name):
    """Adds a thin cylinder from a studio point along a studio direction."""
    a = Vector((start[0], -start[2], start[1]))
    d = Vector((direction[0], -direction[2], direction[1])).normalized()
    bpy.ops.mesh.primitive_cylinder_add(radius=size * 0.02, depth=size, location=a + d * size / 2)
    o = bpy.context.object
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    m = bpy.data.materials.new(name)
    m.diffuse_color = color
    o.data.materials.append(m)
    o.color = color


center = studio[paw].mean(axis=0)

# Keep only the connected part of the arm within 2.5 paw lengths of the paw middle.
region = set(np.nonzero(np.linalg.norm(studio - center, axis=1) < 2.5 * length)[0].tolist())
radj = {i: set() for i in region}
for f in faces:
    if all(v in region for v in f):
        for a in f:
            for b in f:
                if a != b:
                    radj[a].add(b)
arm, stack = {start}, [start]
while stack:
    i = stack.pop()
    for j in radj[i]:
        if j not in arm:
            arm.add(j)
            stack.append(j)
bm = bmesh.new()
bm.from_mesh(ob.data)
bm.verts.ensure_lookup_table()
# The welded indices differ from the mesh indices, so match by place.
arm_points = studio[sorted(arm)]
drop = []
for v in bm.verts:
    s = np.array([v.co.x, v.co.z, -v.co.y])
    if np.min(np.linalg.norm(arm_points - s, axis=1)) > 1e-4:
        drop.append(v)
bmesh.ops.delete(bm, geom=drop, context='VERTS')
bm.to_mesh(ob.data)
bm.free()
rod(center, hint, length * 1.2, (1, 0, 0, 1), 'hint')
rod(wrist, -axis, length * 1.0, (0, 0.8, 0, 1), 'axis')

scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'TEXTURE'
scene.render.resolution_x = 600
scene.render.resolution_y = 600
cam_data = bpy.data.cameras.new('cam')
cam_data.lens = 50
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
side = np.cross(axis, hint)
views = {
    'palm-hint': hint,
    'back-of-hint': -hint,
    'thumb-side+': side,
    'thumb-side-': -side,
    'tip': axis,
    'out-front': np.array([0.3, 0.0, 1.0]),
}
target = Vector((center[0], -center[2], center[1]))
for name, d in views.items():
    d = np.asarray(d, float) / np.linalg.norm(d)
    eye = center + d * length * 3.2
    cam.location = Vector((eye[0], -eye[2], eye[1]))
    cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = (target - cam.location).to_track_quat('-Z', 'Y')
    scene.render.filepath = f'{out}/{species}-{name}.png'
    bpy.ops.render.render(write_still=True)
print('paw_views: done')
