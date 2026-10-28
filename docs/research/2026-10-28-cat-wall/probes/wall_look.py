"""Runs the steps of cat_arms.py (with an optional patch module) up to a step, then renders the
left side wall region with the edges: the whole mesh, and the trunk with no tube faces.

    Blender -b --factory-startup -P scratch/wall_look.py -- <out dir> <until> [<patch.py>]
"""
import math, os, sys
sys.path.insert(0, os.path.join(os.getcwd(), 'tools', 'blender'))
argv = sys.argv[sys.argv.index('--') + 1:]
out, until = os.path.abspath(argv[0]), argv[1]
patch = argv[2] if len(argv) > 2 else None
sys.argv = [sys.argv[0], '--', out]
import bmesh, bpy
import cat_arms as ca
import violin_arms as va
if patch:
    exec(open(patch).read())
va.clear_scene()
s = va.Session('cat', out)
for step in ca.STEPS:
    print('%s: %s' % (step.__name__, str(step(s))[:200]))
    if step.__name__ == until:
        break
ca.VIEWS = out
os.makedirs(out, exist_ok=True)
views = (('side', 90, 0), ('f45', 45, 10), ('b45', 135, 10), ('under', 90, -40), ('f60up', 60, 30), ('b120up', 120, 30))
ca.look(s, 'all', [s.mesh], center=(0.1, 0.55, 0.05), scale=0.2, views=views)
trunk = s.mesh.copy(); trunk.data = s.mesh.data.copy(); bpy.context.scene.collection.objects.link(trunk)
bm = bmesh.new(); bm.from_mesh(trunk.data)
part = bm.verts.layers.int['arm_part']; zone = bm.faces.layers.int['arm_zone']
TUBE = (ca.PART['tube'], ca.PART['tube'] + 10)
gone = [f for f in bm.faces if any(p[part] in TUBE for p in f.verts) or f[zone] in (1, 2)]
# Keep only the trunk: drop the tube, the bridges, and the paw.
arm = set()
for side, off in ((1, 0), (-1, 10)):
    arm |= ca.arm_verts(s, bm, part, off)
gone = [f for f in bm.faces if any(p in arm or p[part] in TUBE for p in f.verts)]
bmesh.ops.delete(bm, geom=gone, context='FACES')
bm.to_mesh(trunk.data); bm.free()
bpy.context.view_layer.objects.active = trunk
for o in bpy.context.selected_objects:
    o.select_set(False)
trunk.select_set(True)
if trunk.data.has_custom_normals:
    bpy.ops.mesh.customdata_custom_splitnormals_clear()
flat = trunk.copy(); flat.data = trunk.data.copy(); bpy.context.scene.collection.objects.link(flat)
for poly in flat.data.polygons:
    poly.use_smooth = False
for poly in trunk.data.polygons:
    poly.use_smooth = True
s.mesh.hide_render = True
flat.hide_render = True
ca.look(s, 'trunk', [trunk], center=(0.1, 0.55, 0.05), scale=0.2, views=views)
flat.hide_render = True
ca.look(s, 'close', [trunk], center=tuple(float(x) for x in os.environ.get('CENTER', '0.09,0.53,0.05').split(',')), scale=float(os.environ.get('SCALE', 0.11)), views=views)
trunk.hide_render = True
flat.hide_render = False
ca.look(s, 'flat', [flat], center=tuple(float(x) for x in os.environ.get('CENTER', '0.09,0.53,0.05').split(',')), scale=float(os.environ.get('SCALE', 0.11)), views=views)
