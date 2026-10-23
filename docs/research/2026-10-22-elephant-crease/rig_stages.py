"""Renders the stages of `tools/blender/rig_mesh.py` for one mesh rig at the same cameras, in
Blender (batch), so that a crop shows which step changes the armpit.

    blender -b --factory-startup --python <this file> -- tools/mesh-rigs/elephant.json <out dir> \
        [<rig.glb>]

The stages, each from the front, the back, the left side, and the right side of the animal:

- `a-source`: the welded source, with the arms down.
- `b-cut`: the source after `cut_seam()` (the config `cut`), with the arms down.
- `c-bind-nocut`: the source with no cut in the upright seated bind (`bind_skin()`, linear).
- `d-bind-cut`: the cut source in the upright seated bind.
- `e-relax`: `d-bind-cut` after `relax()`.
- `f-rig`: the rest mesh of the rig GLB file (the bind pose that the app skins), when given.

The faces of the free arm (`free_arm()`) are red, the caps of the cut blue, the other faces gray.
The arm factor, the leg factor, and the proportions of the elephant are 1, so the long-armed
source is the source. Each image is `<stage>-<view>.png`.
"""
import json
import math
import sys

import bpy
import numpy as np
from mathutils import Vector

ARGV = sys.argv[sys.argv.index('--') + 1:]
CONFIG_PATH, OUT = ARGV[0], ARGV[1]
RIG_GLB = ARGV[2] if len(ARGV) > 2 else None

text = open('tools/blender/rig_mesh.py').read().rsplit('\nmain()', 1)[0]
R = {'__name__': 'rig_mesh'}
exec(compile(text, 'rig_mesh.py', 'exec'), R)

VIEWS = {'front': 0, 'back': 180, 'left': 90, 'right': -90}


def materials():
    """Gives the gray, the red, and the blue material."""
    out = []
    for name, color in (('gray', (0.6, 0.6, 0.6, 1)), ('red', (0.8, 0.25, 0.2, 1)),
                        ('blue', (0.2, 0.35, 0.85, 1))):
        m = bpy.data.materials.new(name)
        m.diffuse_color = color
        out.append(m)
    return out


def show(name, verts, tris, kinds, mats):
    """Makes one object of rig points and triangles, with a material index for each face."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(p) for p in R['to_blender'](verts)], [], [tuple(int(i) for i in t)
                                                                     for t in tris])
    me.update()
    for m in mats:
        me.materials.append(m)
    for k, poly in enumerate(me.polygons):
        poly.material_index = int(kinds[k])
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def render(ob, stage):
    """Renders one object from the four views around the upper trunk."""
    scene = bpy.context.scene
    for o in scene.objects:
        if o.type == 'MESH':
            o.hide_render = o is not ob
    target = Vector((0.0, 0.0, 0.56))
    for view, az in VIEWS.items():
        a = math.radians(az)
        way = Vector((math.sin(a), -math.cos(a), 0.12))
        cam = scene.camera
        cam.location = target + way * 4.0
        cam.rotation_euler = (-way).to_track_quat('-Z', 'Z').to_euler()
        scene.render.filepath = f'{OUT}/{stage}-{view}.png'
        bpy.ops.render.render(write_still=True)


def main():
    config = json.load(open(CONFIG_PATH))
    rules = config['weights']
    verts, tris, uvs, _ = R['load_mesh'](config)
    heads, ends, rolls, _ = R['joints_of'](config)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.render.resolution_x = 700
    scene.render.resolution_y = 700
    cam_data = bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 0.75
    cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    mats = materials()

    def kinds_of(v, t, caps=0):
        free = (R['free_arm'](v, t, rules, heads, ends, 1.0)
                | R['free_arm'](v, t, rules, heads, ends, -1.0))
        k = np.where(free[t].all(axis=1), 1, 0)
        if caps:
            k[len(t) - caps:] = 2
        return k

    render(show('a', verts, tris, kinds_of(verts, tris), mats), 'a-source')
    cut_tris, _, report = R['cut_seam'](verts, tris, uvs, rules, heads, ends, config['cut'])
    caps = sum(len(r[2]) for r in report)
    render(show('b', verts, cut_tris, kinds_of(verts, cut_tris, caps), mats), 'b-cut')
    turns = R['bind_turns'](config, heads, ends, rolls)
    posed = R['posed_heads'](heads, turns)
    matrices = [R['move'](turns[n], heads[n], posed[n]) for n in R['BONES']]
    for name, t, c in (('c-bind-nocut', tris, 0), ('d-bind-cut', cut_tris, caps)):
        w = R['apply_rules'](verts, t, R['bone_heat'](verts, t, heads, ends, rolls), rules, heads,
                             ends)
        w = R['limit'](R['rigid_faces'](verts, t, R['straight_slivers'](
            verts, t, R['rigid_slivers'](verts, t, w, rules), rules), rules))
        bind = R['skin'](w, matrices, verts)
        render(show(name, bind, t, kinds_of(verts, t, c), mats), name)
        if c:
            relaxed, rounds = R['relax'](verts, bind, t, w, matrices)
            print(f'relax: {rounds} rounds')
            render(show('e', relaxed, t, kinds_of(verts, t, c), mats), 'e-relax')
    if RIG_GLB:
        bpy.ops.import_scene.gltf(filepath=RIG_GLB)
        body = max((o for o in scene.objects if o.type == 'MESH' and o.parent is not None),
                   key=lambda o: len(o.data.vertices))
        pts = np.array([body.matrix_world @ v.co for v in body.data.vertices])
        print('rig bounds', pts.min(axis=0), pts.max(axis=0))
        body.data.materials.clear()
        body.data.materials.append(mats[0])
        render(body, 'f-rig')


main()
