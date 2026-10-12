"""Blender mesh helpers: numpy arrays to meshes, decimation, and axis conversion.

The body code uses the axes of three.js (y up, z forward). Blender uses z up, and the animal faces
-y. The glTF exporter turns the Blender axes back into the axes of three.js.
"""

import bpy
import numpy as np


def to_blender(v):
    """Converts points from three.js axes (x, y up, z forward) to Blender axes."""
    v = np.asarray(v, float)
    return np.stack([v[..., 0], -v[..., 2], v[..., 1]], axis=-1)


def from_blender(v):
    """Converts points from Blender axes to three.js axes."""
    v = np.asarray(v, float)
    return np.stack([v[..., 0], v[..., 2], -v[..., 1]], axis=-1)


def new_mesh_object(name, verts, faces, collection=None):
    """Creates a mesh object from numpy vertices (Blender axes) and a list of faces.

    faces: an (m, k) int array of polygons with k corners, or a list of such arrays.
    """
    mesh = bpy.data.meshes.new(name)
    verts = np.asarray(verts, np.float32)
    if isinstance(faces, np.ndarray):
        faces = [faces]
    mesh.vertices.add(len(verts))
    mesh.vertices.foreach_set('co', verts.ravel())
    loops = np.concatenate([f.ravel() for f in faces]).astype(np.int32)
    sizes = np.concatenate([np.full(len(f), f.shape[1]) for f in faces]).astype(np.int32)
    starts = np.concatenate([[0], np.cumsum(sizes)[:-1]]).astype(np.int32)
    mesh.loops.add(len(loops))
    mesh.loops.foreach_set('vertex_index', loops)
    mesh.polygons.add(len(sizes))
    mesh.polygons.foreach_set('loop_start', starts)
    mesh.polygons.foreach_set('loop_total', sizes)
    mesh.update(calc_edges=True)
    mesh.validate()
    obj = bpy.data.objects.new(name, mesh)
    (collection or bpy.context.scene.collection).objects.link(obj)
    return obj


def select_only(obj):
    """Makes obj the only selected and the active object."""
    for o in bpy.context.scene.objects:
        if o:
            o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_modifier(obj, mod):
    """Applies one modifier of obj."""
    select_only(obj)
    bpy.ops.object.modifier_apply(modifier=mod.name)


def decimate(obj, target_tris):
    """Reduces a mesh to about target_tris triangles with an edge collapse (no mirror option)."""
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    mod = obj.modifiers.new('decimate', 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = min(1.0, target_tris / tris)
    mod.use_collapse_triangulate = True
    apply_modifier(obj, mod)


def triangle_count(obj):
    """Counts the triangles of a mesh object."""
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def clear_scene():
    """Removes every object and every mesh, armature, material, and action."""
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.actions,
                 bpy.data.cameras, bpy.data.lights):
        for item in list(coll):
            coll.remove(item)
