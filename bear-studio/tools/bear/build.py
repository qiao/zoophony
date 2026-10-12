"""Builds the bear GLB from the reference measures: the mesh, the colors, the rig, and the clips.

Run with Blender (build.sh does it):

    blender -b --factory-startup --python tools/bear/build.py -- [--tris 4200] [--step 0.004]
        [--pose bind|reference] [--no-rig] [--clips a,b] [--out out/bear.glb]
"""

import argparse
import json
import os
import sys
import time

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import anim  # noqa: E402
import body  # noqa: E402
import details  # noqa: E402
import mesh  # noqa: E402
import paint  # noqa: E402
import rig  # noqa: E402
from sdf import surface_nets  # noqa: E402

ROOT = body.ROOT

MATERIALS = {
    'fur': {'roughness': 0.88, 'specular': 0.25},
    'gloss': {'roughness': 0.42, 'specular': 0.5},
    'baton': {'roughness': 0.45, 'specular': 0.4},
}


def parse_args():
    """Reads the arguments after the '--' of the Blender command line."""
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--tris', type=int, default=2800)
    ap.add_argument('--step', type=float, default=0.004)
    ap.add_argument('--pose', default='bind')
    ap.add_argument('--no-rig', action='store_true')
    ap.add_argument('--clips', default='')
    ap.add_argument('--out', default=os.path.join(ROOT, 'out', 'bear.glb'))
    ap.add_argument('--no-shots', action='store_true', help='used by build.sh only')
    return ap.parse_args(argv)


def build_body(parts, step, tris):
    """Meshes the field with surface nets and decimates it to the low-poly body."""
    t0 = time.time()
    field, origin, step = body.field_on_grid(parts, step)
    verts, quads = surface_nets(field, origin, step)
    print(f'surface nets: {len(verts)} vertices, {len(quads)} quads, {time.time() - t0:.1f} s')
    obj = mesh.new_mesh_object('Bear', mesh.to_blender(verts), quads)
    mesh.decimate(obj, tris)
    obj.data.validate()
    print(f'decimated: {mesh.triangle_count(obj)} triangles, {time.time() - t0:.1f} s')
    return obj


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
        set_face_colors(obj, col)
        obj.data.materials.append(mats[d['material']])
        rig.rigid_group(obj, d['bone'])
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
        export_force_sampling=True,
        export_def_bones=True,
        export_optimize_animation_size=True,
        export_cameras=False,
        export_lights=False,
    )


def main():
    """Runs the whole build."""
    args = parse_args()
    t0 = time.time()
    mesh.clear_scene()
    views = body.load_profiles()
    parts = body.all_parts(args.pose, views)

    obj = build_body(parts, args.step, args.tris)
    centers, normals, verts, tris = face_arrays(obj)
    colors, ao = paint.face_colors(parts, centers, normals)
    mats = {name: make_material(name, props) for name, props in MATERIALS.items()}
    obj.data.materials.append(mats['fur'])
    set_face_colors(obj, colors)
    median_px, rms_px = paint.facet_stats(verts, tris)
    print(f'body: {len(tris)} triangles, median edge {median_px:.1f} px of the sheet '
          f'(rms {rms_px:.1f}), mean occlusion {ao.mean():.2f}, {time.time() - t0:.1f} s')

    items = details.face_details(parts) + details.hand_claws(args.pose) + details.foot_claws()
    if args.pose == 'bind':
        baton_items, _, _ = details.baton(args.pose)
        items += baton_items
    stats = {'body_triangles': len(tris), 'median_edge_px': round(median_px, 1)}
    if args.no_rig:
        detail_objs = add_detail_objects(items, mats)
        final = join([obj] + detail_objs, 'Bear')
    else:
        bones = rig.layout(args.pose)
        arm = rig.create_armature(bones)
        missing = rig.bind_with_heat(arm, obj)
        if missing:
            print(f'bone heat gave no weights to: {missing}')
        names = [b.name for b in arm.data.bones]
        w = rig.weight_table(obj, names)
        w = rig.smooth_weights(w, rig.vertex_neighbors(obj), rounds=2, amount=0.5)
        w = rig.limit_and_normalize(w)
        rig.write_weights(obj, names, w)
        detail_objs = add_detail_objects(items, mats)
        final = join([obj] + detail_objs, 'Bear')
        final.parent = arm
        if not any(m.type == 'ARMATURE' for m in final.modifiers):
            mod = final.modifiers.new('Armature', 'ARMATURE')
            mod.object = arm
        tip = bpy.data.objects.new('BatonTip', None)
        bpy.context.scene.collection.objects.link(tip)
        tip.parent = arm
        tip.parent_type = 'BONE'
        tip.parent_bone = 'baton'
        tip.location = (0.0, 0.0, 0.0)
        only = [c for c in args.clips.split(',') if c] or None
        clip_names, _ = anim.bake_all(arm, bones, only)
        stats['bones'] = len(arm.data.bones)
        stats['clips'] = clip_names
    for poly in final.data.polygons:
        poly.use_smooth = False
    stats['total_triangles'] = mesh.triangle_count(final)
    export_glb(args.out)
    with open(os.path.splitext(args.out)[0] + '.stats.json', 'w') as f:
        json.dump(stats, f, indent=2)
    print('stats', json.dumps(stats))
    print(f'wrote {args.out} in {time.time() - t0:.1f} s')


if __name__ == '__main__':
    main()
