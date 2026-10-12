"""Builds the GLB of one animal from its config and its sheet measures, in stages.

Run with Blender (the CLI `python3 studio build <animal>` does it):

    blender -b --factory-startup --python studio/build.py -- <animal> --seed 3
        [--out DIR] [--until STAGE] [--clips a,b]

The stages (each one writes its outputs into <out>/stages/, see studio/stages.py):

    field        the body parts of the template -> the dense mesh (surface nets)
    remesh       warps, QuadriFlow with mirror -> mirrored triangles
    organic      organic pass, relax, jitter, no slivers, no inward faces -> the body object
    paint        face colors, baked occlusion, materials, facet measures
    details      eyes, brows, nose, mouth, ears, tail, claws (no role props)
    rig          armature of the template, bone heat, weight rules
    correctives  the corrective shapes that the role names
    assemble     detail and role prop objects, join, shape keys, markers
    clips        the clips of the role -> actions
    contacts     the contact and fold check of each clip, and the fold repair
    export       GLB, stats, and the viewer config

The model stages (field to details) take one input from the role: the bind pose.
"""

import argparse
import importlib
import json
import os
import sys
import time

STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, STUDIO)

import numpy as np  # noqa: E402
from mathutils import Vector  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402

from studio import (bake, config, contacts, details, export, mesh, paint, props, remesh,  # noqa: E402
                    roles, stages)
from studio import weights as skin  # noqa: E402
from studio.field import field_at, field_on_grid, load_profiles  # noqa: E402
from studio.sdf import surface_nets  # noqa: E402

DEBUG = bool(os.environ.get('STUDIO_DEBUG'))

# The rounds of the fold repair: after each check, the weights around the folded faces get
# smoothed, and the check runs again.
REPAIR_ROUNDS = 4


def parse_args():
    """Reads the arguments after the '--' of the Blender command line."""
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser(prog='studio/build.py')
    ap.add_argument('animal')
    ap.add_argument('--seed', type=int, required=True, help='the seed of the QuadriFlow remesh')
    ap.add_argument('--out', default=None, help='the output folder (default: <animal>/out)')
    ap.add_argument('--until', default=None, help='stop after this stage (no GLB)')
    ap.add_argument('--clips', default='', help='only these clips (a,b)')
    return ap.parse_args(argv)


def inward_rest_faces(parts, centers, normals):
    """Lists the faces whose normal points into the body (the field grows the other way)."""
    eps = 0.002
    grad = np.stack([field_at(parts, centers + eps * e) - field_at(parts, centers - eps * e)
                     for e in np.eye(3)], axis=1)
    grad /= np.maximum(np.linalg.norm(grad, axis=1, keepdims=True), 1e-9)
    return np.nonzero(np.sum(grad * normals, axis=1) < -0.5)[0], grad


def stage_field(cfg, surface_parts):
    """Samples the field of the body surface (no ears, no tail) and meshes it."""
    t0 = time.time()
    field, origin, step = field_on_grid(surface_parts, cfg.field.step)
    verts, quads = surface_nets(field, origin, step)
    print(f'surface nets: {len(verts)} vertices, {len(quads)} quads, {time.time() - t0:.1f} s')
    return {'dense_verts': verts, 'dense_quads': quads}


def stage_remesh(cfg, body, surface_parts, dense_verts, dense_quads, seed, height_px):
    """Remeshes the dense mesh into mirrored triangles that follow the forms."""
    warp = remesh.Warp(cfg, body)
    v, tris, pairs, info = remesh.quadriflow(cfg, warp, surface_parts, dense_verts, dense_quads,
                                             seed, height_px)
    return {'quad_verts': v, 'quad_tris': tris, 'quad_pairs': pairs, 'remesh_info': info}


def stage_organic(cfg, body, surface_parts, quad_verts, quad_tris, quad_pairs, seed,
                  remesh_info):
    """Makes the triangles organic, cleans them, and creates the body object."""
    t0 = time.time()
    v, tris, pairs, counts = remesh.organic_pass(cfg, body, surface_parts, quad_verts, quad_tris,
                                                 quad_pairs, seed)
    obj = remesh.body_object(cfg.animal.name, surface_parts, v, tris)
    info = dict(remesh_info)
    info.update(counts)
    print(f'remeshed: {info["quads"]} quads -> {mesh.triangle_count(obj)} triangles, '
          f'quad edge {info["quad_edge_px"]} px, unpaired vertices {info["unpaired_vertices"]}, '
          f'collapsed pairs {info["collapsed_pairs"]}, flipped pairs {info["flipped_pairs"]}, '
          f'organic pass {time.time() - t0:.1f} s')
    centers, normals, verts, tris = export.face_arrays(obj)
    return {'body_obj': obj, 'verts': verts, 'tris': tris, 'centers': centers, 'normals': normals,
            'organic_info': info}


def stage_paint(cfg, body, parts, body_obj, centers, normals, verts, tris, height_px, seed):
    """Colors the body faces, makes the materials, and measures the facets."""
    t0 = time.time()
    colors, ao = paint.face_colors(cfg, body, parts, centers, normals, verts[tris])
    mats = {name: export.make_material(name, mat) for name, mat in cfg.look.materials.items()}
    body_obj.data.materials.append(mats['fur'])
    export.set_face_colors(body_obj, colors)
    median_px, _ = paint.facet_stats(verts, tris, height_px)
    q1, q3 = paint.edge_quartiles(verts, tris, height_px)
    inward, _ = inward_rest_faces(parts, centers, normals)
    if DEBUG:
        _, grad = inward_rest_faces(parts, centers, normals)
        for f in inward:
            print('RESTFOLD', f, np.round(centers[f], 3), round(float(np.sum(grad[f] * normals[f])), 2))
    slivers, min_angle = remesh.triangle_quality(verts, tris)
    print(f'body: {len(tris)} triangles, median edge {median_px:.1f} px of the sheet '
          f'(quartiles {q1:.1f} to {q3:.1f}), slivers {slivers * 100:.1f}%, median smallest angle '
          f'{min_angle:.0f} deg, folded faces {len(inward)}, mean occlusion {ao.mean():.2f}, '
          f'{time.time() - t0:.1f} s')
    body_stats = {'seed': seed, 'quads': cfg.facets.quads,
                  'body_triangles': len(tris), 'median_edge_px': round(median_px, 1),
                  'edge_quartiles_px': [round(q1, 1), round(q3, 1)],
                  'sliver_share': round(slivers, 4), 'folded_faces': len(inward)}
    return {'colors': colors, 'occlusion': ao, 'materials': mats, 'body_stats': body_stats}


def stage_details(cfg, body, parts, verts, tris):
    """Makes the body details on the facets (a ray cast on the low-poly mesh)."""
    tree = BVHTree.FromPolygons([Vector(p) for p in verts], tris.tolist(), all_triangles=True)

    def ray(start, direction):
        hit = tree.ray_cast(Vector(start), Vector(direction).normalized())
        if hit[0] is None:
            raise ValueError(f'the ray from {start} meets no face')
        return np.array(hit[0])

    return {'body_items': details.body_details(cfg, body, parts, ray)}


def stage_rig(cfg, body, template, body_obj, verts, parts):
    """Creates the armature of the template and the skin weights of the body."""
    role = cfg.role
    bones = template.layout(cfg, body, role, 'bind')
    arm = skin.create_armature(template.bone_order(role), bones, f'{cfg.animal.name}Rig')
    missing = skin.bind_with_heat(arm, body_obj, template.rigid_only(role))
    if missing:
        print(f'bone heat gave no weights to: {missing}')
    names = [b.name for b in arm.data.bones]
    w_heat = skin.weight_table(body_obj, names)
    neighbors = skin.vertex_neighbors(body_obj)
    w = template.weights(cfg, body, w_heat, verts, parts, bones, names, neighbors)
    skin.write_weights(body_obj, names, w)
    return {'arm': arm, 'bones': bones, 'bone_names': names, 'heat_weights': w_heat,
            'weights': w, 'neighbors': neighbors}


def _skeleton(cfg, template, arm, bones):
    """Reads the rest skeleton of the armature (three.js axes) for the pose solver."""
    names, parents, heads, rests = bake.armature_rest(arm)
    extras = template.skeleton_extras(cfg.role, rests, bones)
    return template.Skeleton(names, parents, heads, rests, extras, cfg.rig)


def stage_correctives(cfg, body, template, pack, arm, bones, verts, tris, weights):
    """Makes the corrective shapes between the bind pose of the role and the sheet pose."""
    skel = _skeleton(cfg, template, arm, bones)
    pose_ref = skel.solve(pack.clips['reference'][0](0.0))[0]
    parts_ref = body.parts('reference', small=False)

    def project(parts, points):
        return remesh.project(parts, points, cfg.facets.offset)

    shapes, drivers, weights_of, report = template.correctives(
        cfg.role.bind.correctives, skel, verts, tris, weights, pose_ref, parts_ref, project)
    print(f'corrective: {report}')
    return {'skel': skel, 'pose_ref': pose_ref, 'parts_ref': parts_ref, 'project': project,
            'shapes': shapes, 'drivers': drivers, 'weights_of': weights_of,
            'corrective_report': report}


def stage_assemble(cfg, body, body_obj, body_items, materials, arm, verts, shapes):
    """Adds the details and the role props to the body, the shape keys, and the markers."""
    role = cfg.role
    mats = dict(materials)
    for pr in props.hand_props(role):
        mats[pr.name] = export.make_material(pr.name, pr.material)
    items = body_items + props.role_details(role, body)
    detail_objs = export.add_detail_objects(items, mats)
    final = export.join([body_obj] + detail_objs, cfg.animal.name)
    export.add_shape_keys(final, verts, shapes)
    final.parent = arm
    if not any(m.type == 'ARMATURE' for m in final.modifiers):
        mod = final.modifiers.new('Armature', 'ARMATURE')
        mod.object = arm
    for pr in props.hand_props(role):
        if pr.tip_marker:
            export.add_marker(arm, pr.tip_marker, pr.name)
    return {'final': final, 'items': items}


def stage_clips(pack, arm, skel, final, drivers, clips_only):
    """Bakes the clips of the role into actions (with the weights of the corrective shapes)."""
    samples = bake.bake_all(arm, skel, pack, clips_only, (final, drivers))
    return {'samples': samples, 'sample_arrays': bake.sample_arrays(samples, skel.names)}


def check_clips(cfg, template, skel, verts, tris, w, items, samples, shapes, weights_of, fps):
    """Measures the deepest contact and the folded faces of each clip.

    A clip passes with no contact deeper than the role limit and no more folded faces than the
    fold limit. Returns (report, the faces that folded in any frame).
    """
    t0 = time.time()
    limit = cfg.role.checks.contact_depth
    check = contacts.ContactCheck(skel, verts, tris, w, items, template.contact_spec(cfg.role),
                                  shapes, weights_of)
    report = {}
    for name, poses in samples.items():
        depth, side, part, frame, turned, folded = check.clip(poses)
        ok = depth <= limit and folded <= cfg.checks.folded_faces
        report[name] = {'depth': round(depth, 4), 'side': side, 'part': part,
                        'time_s': round(frame / fps, 3), 'turned_faces': turned,
                        'folded_faces': folded, 'pass': ok}
        print(f'contact {name:12s} worst {depth * 100:5.2f} cm ({part} {side} at '
              f'{frame / fps:5.2f} s), turned past 90 deg {turned}, '
              f'folded past 120 deg {folded}  {"pass" if ok else "FAIL"}')
    print(f'contact check: limit {limit * 100:.1f} cm, {time.time() - t0:.1f} s')
    return {'limit': limit, 'clips': report}, check.folded


def _debug_persisting(verts, tris, w, names, folded, surface_parts):
    """Prints the place, the weights, the smallest angle, and the rest direction of each face
    that is still folded after the repair (STUDIO_DEBUG=1)."""
    fc = verts[tris].mean(axis=1)
    fn = np.cross(verts[tris[:, 1]] - verts[tris[:, 0]], verts[tris[:, 2]] - verts[tris[:, 0]])
    area = 0.5 * np.linalg.norm(fn, axis=1)
    fn /= np.maximum(2 * area[:, None], 1e-12)
    eps = 0.002
    grad = np.stack([field_at(surface_parts, fc + eps * e) - field_at(surface_parts, fc - eps * e)
                     for e in np.eye(3)], axis=1)
    grad /= np.maximum(np.linalg.norm(grad, axis=1, keepdims=True), 1e-9)
    for f in sorted(folded):
        ws = w[tris[f]].mean(axis=0)
        top = np.argsort(ws)[::-1][:3]
        a_, b_, c_ = verts[tris[f]]
        ang = []
        for p0, p1, p2 in ((a_, b_, c_), (b_, c_, a_), (c_, a_, b_)):
            u, v = p1 - p0, p2 - p0
            ang.append(np.degrees(np.arccos(np.clip(
                u @ v / (np.linalg.norm(u) * np.linalg.norm(v)), -1, 1))))
        print('PERSIST', f, np.round(fc[f], 3), 'area', round(float(area[f]) * 1e4, 2),
              'min angle', round(min(ang), 1), 'rest dot', round(float(grad[f] @ fn[f]), 2),
              [(names[k], round(float(ws[k]), 2)) for k in top])


def stage_contacts(cfg, template, skel, verts, tris, weights, items, samples, shapes,
                   weights_of, final, bone_names, neighbors, pose_ref, parts_ref, project,
                   corrective_report, surface_parts, pack):
    """Checks the contacts and the folds of each clip, and repairs the folds.

    A fold means that the weights step sharply across one face between bones that turn far
    apart. After the check, the weights around each folded face get smoothed, the corrective
    shapes are made again, and the check runs again, for up to REPAIR_ROUNDS rounds.
    """
    w = weights
    report, folded = check_clips(cfg, template, skel, verts, tris, w, items, samples, shapes,
                                 weights_of, pack.fps)
    repairs = []
    for _ in range(REPAIR_ROUNDS):
        if not folded:
            break
        print(f'fold repair: smoothing the weights around {len(folded)} folded faces')
        if DEBUG:
            for f in sorted(folded):
                ws = w[tris[f]].mean(axis=0)
                top = np.argsort(ws)[::-1][:3]
                print('REPAIR', f, np.round(verts[tris[f]].mean(axis=0), 3),
                      [(bone_names[k], round(float(ws[k]), 2)) for k in top])
        repairs.append(len(folded))
        w = skin.repair_folds(w, tris, folded, neighbors)
        skin.write_first_weights(final, bone_names, w, len(verts))
        shapes, _, weights_of, corrective_report = template.correctives(
            cfg.role.bind.correctives, skel, verts, tris, w, pose_ref, parts_ref, project)
        export.set_shape_keys(final, verts, shapes)
        report, folded = check_clips(cfg, template, skel, verts, tris, w, items, samples, shapes,
                                     weights_of, pack.fps)
    if DEBUG and folded:
        _debug_persisting(verts, tris, w, bone_names, folded, surface_parts)
    return {'contact_report': report, 'fold_repairs': repairs, 'final_weights': w,
            'final_shapes': shapes, 'final_corrective_report': corrective_report}



def stage_export(cfg, final, arm, body_stats, samples, final_corrective_report, fold_repairs,
                 contact_report, pack):
    """Writes the GLB, the stats, and the viewer config."""
    for poly in final.data.polygons:
        poly.use_smooth = False
    stats = dict(body_stats)
    stats['bones'] = len(arm.data.bones)
    stats['clips'] = list(samples)
    stats['corrective'] = final_corrective_report
    stats['fold_repairs'] = fold_repairs
    stats['contacts'] = contact_report
    stats['total_triangles'] = mesh.triangle_count(final)
    export.export_glb(cfg.paths.glb)
    with open(cfg.paths.stats, 'w') as f:
        json.dump(stats, f, indent=2)
    print('stats', json.dumps(stats))
    return {'stats': stats}


STAGES = [
    stages.Stage('field', stage_field, ('cfg', 'surface_parts'),
                 {'dense_verts': 'array', 'dense_quads': 'array'},
                 'The body parts of the template -> the dense mesh (surface nets).'),
    stages.Stage('remesh', stage_remesh,
                 ('cfg', 'body', 'surface_parts', 'dense_verts', 'dense_quads', 'seed', 'height_px'),
                 {'quad_verts': 'array', 'quad_tris': 'array', 'quad_pairs': 'array',
                  'remesh_info': 'json'},
                 'Warps and QuadriFlow with mirror -> mirrored triangles.'),
    stages.Stage('organic', stage_organic,
                 ('cfg', 'body', 'surface_parts', 'quad_verts', 'quad_tris', 'quad_pairs', 'seed',
                  'remesh_info'),
                 {'body_obj': 'live', 'verts': 'array', 'tris': 'array', 'centers': 'array',
                  'normals': 'array', 'organic_info': 'json'},
                 'Organic pass, relax, jitter, no slivers, no inward faces -> the body object.'),
    stages.Stage('paint', stage_paint,
                 ('cfg', 'body', 'parts', 'body_obj', 'centers', 'normals', 'verts', 'tris',
                  'height_px', 'seed'),
                 {'colors': 'array', 'occlusion': 'array', 'materials': 'live',
                  'body_stats': 'json'},
                 'Face colors, baked occlusion, materials, and facet measures.'),
    stages.Stage('details', stage_details, ('cfg', 'body', 'parts', 'verts', 'tris'),
                 {'body_items': 'json'},
                 'Eyes, brows, nose, mouth, ears, tail, and claws on the facets.'),
    stages.Stage('rig', stage_rig, ('cfg', 'body', 'template', 'body_obj', 'verts', 'parts'),
                 {'arm': 'live', 'bones': 'json', 'bone_names': 'json', 'heat_weights': 'array',
                  'weights': 'array', 'neighbors': 'json'},
                 'The armature of the template, bone heat, and the weight rules.'),
    stages.Stage('correctives', stage_correctives,
                 ('cfg', 'body', 'template', 'pack', 'arm', 'bones', 'verts', 'tris', 'weights'),
                 {'skel': 'live', 'pose_ref': 'live', 'parts_ref': 'live', 'project': 'live',
                  'shapes': 'array', 'drivers': 'live', 'weights_of': 'live',
                  'corrective_report': 'json'},
                 'The corrective shapes that the role names.'),
    stages.Stage('assemble', stage_assemble,
                 ('cfg', 'body', 'body_obj', 'body_items', 'materials', 'arm', 'verts', 'shapes'),
                 {'final': 'live', 'items': 'json'},
                 'Detail and role prop objects, the join, the shape keys, and the markers.'),
    stages.Stage('clips', stage_clips, ('pack', 'arm', 'skel', 'final', 'drivers', 'clips_only'),
                 {'samples': 'live', 'sample_arrays': 'array'},
                 'The clips of the role -> actions.'),
    stages.Stage('contacts', stage_contacts,
                 ('cfg', 'template', 'skel', 'verts', 'tris', 'weights', 'items', 'samples',
                  'shapes', 'weights_of', 'final', 'bone_names', 'neighbors', 'pose_ref',
                  'parts_ref', 'project', 'corrective_report', 'surface_parts', 'pack'),
                 {'contact_report': 'json', 'fold_repairs': 'json', 'final_weights': 'array',
                  'final_shapes': 'array', 'final_corrective_report': 'json'},
                 'The contact and fold check of each clip, and the fold repair.'),
    stages.Stage('export', stage_export,
                 ('cfg', 'final', 'arm', 'body_stats', 'samples', 'final_corrective_report',
                  'fold_repairs', 'contact_report', 'pack'),
                 {'stats': 'json'},
                 'The GLB and the stats.'),
]


def main():
    """Runs the stages of the build."""
    args = parse_args()
    t0 = time.time()
    cfg = config.load(args.animal, args.out)
    template = importlib.import_module(f'templates.{cfg.animal.template}')
    mesh.clear_scene()
    views = load_profiles(cfg.paths.measure)
    body = template.Body(cfg, views, cfg.role.bind)
    ctx = {
        'cfg': cfg, 'seed': args.seed, 'template': template, 'body': body,
        'parts': body.parts('bind'), 'surface_parts': body.parts('bind', small=False),
        'height_px': views['front']['height_px'],
        'pack': roles.make_pack(cfg, body, template),
        'clips_only': [c for c in args.clips.split(',') if c] or None,
    }
    os.makedirs(cfg.paths.stages, exist_ok=True)
    times = stages.run(STAGES, ctx, cfg.paths.stages, args.until)
    print('stage seconds', json.dumps(times))
    if 'stats' in ctx:
        print(f'wrote {cfg.paths.glb} in {time.time() - t0:.1f} s')


if __name__ == '__main__':
    main()
