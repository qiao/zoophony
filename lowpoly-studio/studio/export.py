"""Blender scene helpers of the build: materials, face colors, detail objects, the join, the shape
keys, and the glTF export."""

import os

import bpy
import numpy as np

from studio import mesh
from studio.weights import rigid_group


def face_arrays(obj):
    """Reads face centers, face normals (three.js axes), vertices, and triangles of a mesh."""
    me = obj.data
    n = len(me.polygons)
    c = np.zeros(n * 3)
    nn = np.zeros(n * 3)
    me.polygons.foreach_get('center', c)
    me.polygons.foreach_get('normal', nn)
    v = np.zeros(len(me.vertices) * 3)
    me.vertices.foreach_get('co', v)
    tris = np.array([p.vertices[:] for p in me.polygons if len(p.vertices) == 3])
    return (mesh.from_blender(c.reshape(-1, 3)), mesh.from_blender(nn.reshape(-1, 3)),
            mesh.from_blender(v.reshape(-1, 3)), tris)


def set_face_colors(obj, colors):
    """Writes one sRGB color (0..1) per face into the face-corner color attribute 'Col'."""
    me = obj.data
    attr = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    totals = np.zeros(len(me.polygons), np.int32)
    me.polygons.foreach_get('loop_total', totals)
    rgba = np.concatenate([np.asarray(colors, float), np.ones((len(colors), 1))], axis=1)
    per_loop = np.repeat(rgba, totals, axis=0)
    attr.data.foreach_set('color_srgb', per_loop.ravel().astype(np.float32))
    me.color_attributes.active_color = attr
    me.color_attributes.render_color_index = me.color_attributes.find('Col')


def make_material(name, props):
    """Creates a material whose base color is the 'Col' attribute."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    attr = nt.nodes.new('ShaderNodeVertexColor')
    attr.layer_name = 'Col'
    nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = props['roughness']
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = props['specular']
    return mat


def add_detail_objects(items, mats):
    """Creates one object for each detail mesh, colored, with its material and its bone."""
    objs = []
    for d in items:
        obj = mesh.new_mesh_object(d['name'], mesh.to_blender(d['verts']), d['faces'])
        col = np.tile(np.array(d['color'], float) / 255.0, (len(obj.data.polygons), 1))
        if 'colors' in d:
            col = np.asarray(d['colors'], float) / 255.0
        set_face_colors(obj, col)
        obj.data.materials.append(mats[d['material']])
        rigid_group(obj, d['bone'])
        objs.append(obj)
    return objs


def join(objs, name):
    """Joins objects into the first one and renames it."""
    target = objs[0]
    for o in bpy.context.scene.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.join()
    target.name = name
    target.data.name = name
    return target


def add_shape_keys(obj, body_verts, deltas):
    """Adds shape keys to the joined mesh. The body vertices come first in it.

    deltas: {name: (body vertices, 3) offsets in three.js axes}.
    """
    n = len(body_verts)
    co = np.zeros(len(obj.data.vertices) * 3)
    obj.data.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    if np.abs(mesh.from_blender(co[:n]) - body_verts).max() > 1e-5:
        raise RuntimeError('the body vertices are not first in the joined mesh')
    obj.shape_key_add(name='Basis', from_mix=False)
    for name, delta in deltas.items():
        key = obj.shape_key_add(name=name, from_mix=False)
        moved = co.copy()
        moved[:n] += mesh.to_blender(delta)
        key.data.foreach_set('co', moved.ravel().astype(np.float32))


def set_shape_keys(obj, body_verts, deltas):
    """Replaces the offsets of the body vertices in existing shape keys."""
    n = len(body_verts)
    keys = obj.data.shape_keys.key_blocks
    basis = np.zeros(len(obj.data.vertices) * 3)
    keys['Basis'].data.foreach_get('co', basis)
    basis = basis.reshape(-1, 3)
    for name, delta in deltas.items():
        moved = basis.copy()
        moved[:n] += mesh.to_blender(delta)
        keys[name].data.foreach_set('co', moved.ravel().astype(np.float32))


def add_marker(arm, name, bone):
    """Adds an empty node on a bone (for example the tip of a baton)."""
    tip = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(tip)
    tip.parent = arm
    tip.parent_type = 'BONE'
    tip.parent_bone = bone
    tip.location = (0.0, 0.0, 0.0)
    return tip


def export_glb(path):
    """Writes the scene as one binary glTF file."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        export_yup=True,
        export_apply=False,
        export_texcoords=False,
        export_normals=True,
        export_vertex_color='ACTIVE',
        export_all_vertex_colors=False,
        export_materials='EXPORT',
        export_skins=True,
        export_influence_nb=4,
        export_animations=True,
        export_animation_mode='NLA_TRACKS',
        export_merge_animation='NLA_TRACK',
        export_morph=True,
        export_morph_normal=False,
        export_morph_animation=True,
        export_force_sampling=True,
        export_def_bones=True,
        export_optimize_animation_size=True,
        export_cameras=False,
        export_lights=False,
    )
