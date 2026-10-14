"""Measures the collapse of the flattest faces of the fox mesh of the user, to bring the rig into
the triangle budget of a studio body.

    blender -b --factory-startup --python collapse.py -- <fox.glb> <faces>...

The mesh is welded at 1e-5 and triangulated, as `tools/blender/rig_mesh.py` does. For each face
count, the Decimate modifier of Blender (mode COLLAPSE, quadric error, with the UV islands as
limits, so that no face crosses a seam of the texture) collapses the edges with the least change
of the surface first. The script prints the faces, the removed vertices by height, and the
largest move of the surface both ways: from each vertex of the source to the nearest point of the
collapsed surface, and from each vertex of the collapsed mesh to the nearest point of the source.
The moves are in the units of the studio (1 unit from the soles to the ear tips) and in
millimeters at the scale of the app (0.9296 m for each unit, the shoulder joints at 0.581 m).
"""

import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

METERS = 0.9296

argv = sys.argv[sys.argv.index('--') + 1 :]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bm = bmesh.new()
bm.from_mesh(ob.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bmesh.ops.triangulate(bm, faces=bm.faces[:])
bm.to_mesh(ob.data)
bm.free()


def arrays(obj):
    """Gives the vertices (world, axes of Blender) and the triangles of the evaluated object."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = obj.evaluated_get(depsgraph).to_mesh()
    v = np.array([obj.matrix_world @ x.co for x in mesh.vertices])
    tris = []
    for p in mesh.polygons:
        ids = list(p.vertices)
        for k in range(1, len(ids) - 1):
            tris.append([ids[0], ids[k], ids[k + 1]])
    obj.evaluated_get(depsgraph).to_mesh_clear()
    return v, np.array(tris)


src_v, src_t = arrays(ob)
# The glTF importer turns +y up into +z up of Blender.
lo, hi = src_v[:, 2].min(), src_v[:, 2].max()
units = 1.0 / (hi - lo)
src_tree = BVHTree.FromPolygons(src_v.tolist(), src_t.tolist())
print(f'source: {len(src_v)} vertices, {len(src_t)} triangles')
for target in map(int, argv[1:]):
    mod = ob.modifiers.new('collapse', 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = target / len(src_t)
    mod.delimit = {'UV'}
    new_v, new_t = arrays(ob)
    tree = BVHTree.FromPolygons(new_v.tolist(), new_t.tolist())
    to_new = np.array([(tree.find_nearest(Vector(p))[0] - Vector(p)).length for p in src_v])
    to_src = np.array([(src_tree.find_nearest(Vector(p))[0] - Vector(p)).length for p in new_v])
    moved = src_v[to_new > 1e-6]
    worst = src_v[int(np.argmax(to_new))]
    heights = ((moved[:, 2] - lo) * units).round(2)
    print(f'target {target}: {len(new_t)} triangles, {len(new_v)} vertices, '
          f'{len(src_v) - len(new_v)} vertices removed')
    print(f'  largest move source to collapsed {to_new.max() * units:.5f} u '
          f'({to_new.max() * units * METERS * 1000:.2f} mm), collapsed to source '
          f'{to_src.max() * units:.5f} u ({to_src.max() * units * METERS * 1000:.2f} mm), '
          f'mean move of the moved source vertices {to_new[to_new > 1e-6].mean() * units * METERS * 1000:.2f} mm')
    print(f'  source vertices off the collapsed surface (more than 1e-6): {len(moved)}, at the '
          f'heights (units) {' '.join(f'{h:.2f}' for h in sorted(set(heights.tolist())))}')
    print(f'  the largest move at x {worst[0] * units:+.3f} y {(worst[2] - lo) * units:.3f} '
          f'z {-worst[1] * units:+.3f} (axes of the studio)')
    ob.modifiers.remove(mod)
