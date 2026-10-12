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
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import anim  # noqa: E402
import body  # noqa: E402
import contacts  # noqa: E402
import corrective  # noqa: E402
import motion  # noqa: E402
import details  # noqa: E402
import mesh  # noqa: E402
import paint  # noqa: E402
import retopo  # noqa: E402
import rig  # noqa: E402
from sdf import surface_nets  # noqa: E402

ROOT = body.ROOT


MATERIALS = {
    'fur': {'roughness': 0.7, 'specular': 0.35},
    'gloss': {'roughness': 0.42, 'specular': 0.5},
    'baton': {'roughness': 0.45, 'specular': 0.4},
}


def parse_args():
    """Reads the arguments after the '--' of the Blender command line."""
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--quads', type=int, default=900)
    ap.add_argument('--seed', type=int, default=2, help='the seed of the QuadriFlow remesh')
    ap.add_argument('--step', type=float, default=0.004)
    ap.add_argument('--pose', default='bind')
    ap.add_argument('--no-rig', action='store_true')
    ap.add_argument('--clips', default='')
    ap.add_argument('--out', default=os.path.join(ROOT, 'out', 'bear.glb'))
    ap.add_argument('--no-shots', action='store_true', help='used by build.sh only')
    return ap.parse_args(argv)


def build_body(parts, step, target_quads, seed):
    """Meshes the field with surface nets, then remeshes it into aligned, mirrored facets."""
    t0 = time.time()
    field, origin, step = body.field_on_grid(parts, step)
    verts, quads = surface_nets(field, origin, step)
    print(f'surface nets: {len(verts)} vertices, {len(quads)} quads, {time.time() - t0:.1f} s')
    obj, info = retopo.remesh(parts, verts, quads, target_quads, seed)
    print(f'remeshed: {info["quads"]} quads -> {mesh.triangle_count(obj)} triangles, '
          f'quad edge {info["quad_edge_px"]} px, unpaired vertices {info["unpaired_vertices"]}, '
          f'collapsed pairs {info["collapsed_pairs"]}, flipped pairs {info["flipped_pairs"]}, '
          f'{time.time() - t0:.1f} s')
    return obj


def folded_faces(parts, centers, normals):
    """Counts the faces whose normal points into the body (the field grows the other way)."""
    eps = 0.002
    grad = np.stack([body.field_at(parts, centers + eps * e) - body.field_at(parts, centers - eps * e)
                     for e in np.eye(3)], axis=1)
    grad /= np.maximum(np.linalg.norm(grad, axis=1, keepdims=True), 1e-9)
    return int(np.sum(np.sum(grad * normals, axis=1) < -0.5))


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


def check_contacts(skel, verts, tris, weights, items, samples, morphs, driver):
    """Measures the deepest contact of paws, claws, forearms, and the baton in each clip, and
    the faces that turn over. A clip passes with no contact deeper than contacts.LIMIT and no
    folded face."""
    t0 = time.time()
    check = contacts.ContactCheck(skel, verts, tris, weights, items, morphs, driver)
    report = {}
    for name, poses in samples.items():
        depth, side, part, frame, turned, folded = check.clip(poses)
        ok = depth <= contacts.LIMIT and folded == 0
        report[name] = {'depth': round(depth, 4), 'side': side, 'part': part,
                        'time_s': round(frame / motion.FPS, 3), 'turned_faces': turned,
                        'folded_faces': folded, 'pass': ok}
        print(f'contact {name:12s} worst {depth * 100:5.2f} cm ({part} {side} at '
              f'{frame / motion.FPS:5.2f} s), turned past 90 deg {turned}, '
              f'folded past 120 deg {folded}  {"pass" if ok else "FAIL"}')
    print(f'contact check: limit {contacts.LIMIT * 100:.1f} cm, {time.time() - t0:.1f} s')
    return {'limit': contacts.LIMIT, 'clips': report}


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


def main():
    """Runs the whole build."""
    args = parse_args()
    t0 = time.time()
    mesh.clear_scene()
    views = body.load_profiles()
    parts = body.all_parts(args.pose, views)
    surface_parts = body.all_parts(args.pose, views, small=False)

    obj = build_body(surface_parts, args.step, args.quads, args.seed)
    centers, normals, verts, tris = face_arrays(obj)
    colors, ao = paint.face_colors(parts, centers, normals, verts[tris])
    mats = {name: make_material(name, props) for name, props in MATERIALS.items()}
    obj.data.materials.append(mats['fur'])
    set_face_colors(obj, colors)
    median_px, rms_px = paint.facet_stats(verts, tris)
    q1, q3 = paint.edge_quartiles(verts, tris)
    folds = folded_faces(parts, centers, normals)
    slivers, min_angle = retopo.triangle_quality(verts, tris)
    print(f'body: {len(tris)} triangles, median edge {median_px:.1f} px of the sheet '
          f'(quartiles {q1:.1f} to {q3:.1f}), slivers {slivers * 100:.1f}%, median smallest angle '
          f'{min_angle:.0f} deg, folded faces {folds}, mean occlusion {ao.mean():.2f}, '
          f'{time.time() - t0:.1f} s')

    tree = BVHTree.FromPolygons([Vector(p) for p in verts], tris.tolist(), all_triangles=True)

    def ray(start, direction):
        hit = tree.ray_cast(Vector(start), Vector(direction).normalized())
        if hit[0] is None:
            raise ValueError(f'the ray from {start} meets no face')
        return np.array(hit[0])

    items = (details.face_details(parts, ray) + details.ears_and_tail()
             + details.hand_claws(args.pose) + details.foot_claws())
    if args.pose == 'bind':
        baton_items, _, _ = details.baton(args.pose)
        items += baton_items
    stats = {'body_triangles': len(tris), 'median_edge_px': round(median_px, 1),
             'edge_quartiles_px': [round(q1, 1), round(q3, 1)],
             'sliver_share': round(slivers, 4), 'folded_faces': folds}
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
        w = rig.trunk_weights(verts, w, names)
        w = rig.trunk_owned(verts, parts, w, names)
        neighbors = rig.vertex_neighbors(obj)
        w = rig.smooth_weights(w, neighbors, rounds=2, amount=0.5)
        w = rig.smooth_weights(w, neighbors, rounds=10, amount=0.7 * rig.armpit_mask(verts))
        w = rig.smooth_weights(w, neighbors, rounds=10, amount=0.7 * rig.joint_mask(verts))
        w = rig.chain_limits(verts, w, names, bones)
        w = rig.force_bone(w, names, 'head', rig.head_rigidity(verts), keep=('ear_L', 'ear_R'))
        w = rig.force_bone(w, names, 'hips', rig.crotch_mask(verts))
        w = rig.limit_and_normalize(w)
        rig.write_weights(obj, names, w)

        # The corrective shapes of the arms down (corrective.py).
        skel = anim.skeleton_of(arm, bones)
        pose_ref = skel.solve(motion.clip_reference(0.0))[0]
        pose_bind = {n: (np.array([1.0, 0.0, 0.0, 0.0]), np.zeros(3), 1.0) for n in skel.names}
        parts_ref = body.all_parts('reference', views, small=False)
        dL, dR, creport = corrective.arm_down_shapes(
            skel, verts, tris, w, pose_ref, parts_ref, retopo.project)
        print(f'corrective: {creport}')
        driver = corrective.ArmDriver(skel, pose_bind, pose_ref)
        n_body = len(verts)

        detail_objs = add_detail_objects(items, mats)
        final = join([obj] + detail_objs, 'Bear')
        add_shape_keys(final, verts, {'arm_down_L': dL, 'arm_down_R': dR})
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
        shapes = (final, {'arm_down_L': lambda p: driver.weights(p)['L'],
                          'arm_down_R': lambda p: driver.weights(p)['R']})
        samples, skel = anim.bake_all(arm, bones, only, shapes)
        stats['bones'] = len(arm.data.bones)
        stats['clips'] = list(samples)
        stats['corrective'] = creport
        stats['contacts'] = check_contacts(skel, verts, tris, w, items, samples,
                                           {'L': dL, 'R': dR}, driver)
        assert n_body == len(verts)
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
