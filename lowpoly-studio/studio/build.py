"""Builds the GLB of one animal from its config and its sheet measures, in stages.

Run with Blender (the CLI `python3 studio build <animal>` does it):

    blender -b --factory-startup --python studio/build.py -- <animal> --seed 3
        [--out DIR] [--until STAGE] [--clips a,b] [--cache DIR | --no-cache] [--no-gate]

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
    diagnostics  the located contacts and folds, and the fold debug list

The model stages (field to details) take one input from the role: the bind pose.

The stage cache (studio/cache.py, studio/stages.py): field, remesh, organic, clips, contacts, and
export keep their outputs in the cache that all worktrees share, keyed by their inputs, the
config values that they read, and their code. A cache hit makes the Blender state again with the restore
function of the stage, with the same calls as the run that made the entry. The cheap stages that
change the scene (paint to assemble) always run.

The remesh gate (studio/remesh.py): after the remesh, the quad count; after the organic pass,
the inward faces, the slivers, and the slits. A failed gate stops the build: <out>/stages/
remesh-gate.json has the checks, and run.json has "stopped" (the seed search tries the next seed).
"""

import argparse
import importlib
import json
import os
import sys
import time

STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, STUDIO)

import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402

from studio import (bake, cache, config, contacts, details, export, mesh, paint, props,  # noqa: E402
                    remesh, roles, stages)
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
    ap.add_argument('--cache', default=None,
                    help='the cache folder (default: the shared cache of all worktrees)')
    ap.add_argument('--no-cache', action='store_true', help='no cache reads and no cache writes')
    ap.add_argument('--no-gate', action='store_true', help='report the remesh gate, never stop')
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
    """Makes the triangles organic and cleans them (restore_organic creates the body object)."""
    t0 = time.time()
    v, tris, pairs, counts = remesh.organic_pass(cfg, body, surface_parts, quad_verts, quad_tris,
                                                 quad_pairs, seed)
    info = dict(remesh_info)
    info.update(counts)
    return {'_restore': {'verts': v, 'tris': tris, 'info': info,
                         'seconds': round(time.time() - t0, 1)}}


def restore_organic(saved, cfg, surface_parts):
    """Creates the body object from the organic mesh, and reads its face arrays."""
    info = saved['info']
    obj = remesh.body_object(cfg.animal.name, surface_parts, saved['verts'], saved['tris'])
    print(f'remeshed: {info["quads"]} quads -> {mesh.triangle_count(obj)} triangles, '
          f'quad edge {info["quad_edge_px"]} px, unpaired vertices {info["unpaired_vertices"]}, '
          f'collapsed pairs {info["collapsed_pairs"]}, flipped pairs {info["flipped_pairs"]}, '
          f'organic pass {saved["seconds"]:.1f} s')
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
    for pr in role.props:
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


def stage_clips(pack, skel, drivers, clips_only):
    """Solves the clips of the role and the weights of the corrective shapes in each frame
    (restore_clips writes them into actions)."""
    samples, shape_weights = bake.sample_all(skel, pack, clips_only, drivers)
    return {'samples': samples, 'sample_arrays': bake.sample_arrays(samples, skel.names),
            '_restore': {'shape_weights': shape_weights}}


def restore_clips(saved, samples, arm, skel, final, pack):
    """Writes the solved clips into actions of the armature and of the shape keys."""
    bake.write_all(arm, skel.props, pack.fps, samples, final, saved['shape_weights'])
    return {}


def check_scene(cfg, body, pack, check, name, poses, fps):
    """Measures one clip against the scene props of the role: the deepest body point inside a
    prop, the rest of the body on the seat, and the distance of the knuckles from the targets
    that the pack gives (pack.hand_targets). A role with no scene prop and no targets gets None.

    Returns {'scene': {depth, prop, piece, frame, position, bone}, 'seat': {gap, frame}, 'hands':
    {distance, side, frame}} (each part only when it applies), or None.
    """
    role = cfg.role
    boxes = props.scene_boxes(role, body)
    targets = getattr(pack, 'hand_targets', None)
    if not boxes and targets is None:
        return None
    bench = next((pr for pr in props.scene_props(role) if pr.kind == 'bench'), None)
    seat_top = props.scene_layout(body, role)['seat_top'] if bench else None
    out = {}
    names = check.names
    # The skin that sits: the trunk and the thighs (the shins and the feet hang in front).
    col = {n: k for k, n in enumerate(names)}
    sit = [col[n] for n in names if n in ('root', 'hips', 'spine', 'tail')
           or n.startswith('thigh_')]
    seated = check.w[:, sit].sum(axis=1) > 0.5
    for i, pose in enumerate(poses):
        D, H, S, _, posed = check.pose_body(pose)
        for prop, piece, center, half in boxes:
            if S[prop] < 0.05:
                continue
            q = np.abs(posed - center) - half
            sdf = np.linalg.norm(np.maximum(q, 0.0), axis=1) + np.minimum(q.max(axis=1), 0.0)
            k = int(np.argmin(sdf))
            depth = max(0.0, -float(sdf[k]))
            if 'scene' not in out or depth > out['scene']['depth']:
                out['scene'] = {'depth': round(depth, 4), 'prop': prop, 'piece': piece,
                                'frame': i, 'time_s': round(i / fps, 3),
                                'position': [round(float(v), 4) for v in posed[k]],
                                'bone': names[int(np.argmax(check.w[k]))]}
        if bench and S[bench.name] >= 0.05:
            c = bench.bench
            over = ((np.abs(posed[:, 0]) <= 0.5 * c.width)
                    & (np.abs(posed[:, 2] - c.center_z) <= 0.5 * c.depth) & seated)
            if over.any():
                gap = float(posed[over, 1].min()) - seat_top
                if 'seat' not in out or abs(gap) > abs(out['seat']['gap']):
                    out['seat'] = {'gap': round(gap, 4), 'frame': i, 'time_s': round(i / fps, 3)}
        if targets is not None:
            for side, goal in (targets(name, i / fps) or {}).items():
                if goal is None:
                    continue
                dist = float(np.linalg.norm(H[f'fingers_{side}'] - np.asarray(goal, float)))
                if 'hands' not in out or dist > out['hands']['distance']:
                    out['hands'] = {'distance': round(dist, 4), 'side': side, 'frame': i,
                                    'time_s': round(i / fps, 3)}
    return out


def check_clips(cfg, template, skel, verts, tris, w, items, samples, shapes, weights_of, fps,
                body=None, pack=None):
    """Measures the deepest contact and the folded faces of each clip, and the scene checks of a
    role with scene props or hand targets (check_scene).

    A clip passes with no contact deeper than the role limit, no more folded faces than the
    fold limit, and the scene checks within the role limits. Returns (report, the faces that
    folded in any frame).
    """
    t0 = time.time()
    limit = cfg.role.checks.contact_depth
    rc = cfg.role.checks
    check = contacts.ContactCheck(skel, verts, tris, w, items, template.contact_spec(cfg.role),
                                  shapes, weights_of)
    report = {}
    for name, poses in samples.items():
        depth, side, part, frame, turned, folded = check.clip(poses)
        ok = depth <= limit and folded <= cfg.checks.folded_faces
        report[name] = {'depth': round(depth, 4), 'side': side, 'part': part,
                        'time_s': round(frame / fps, 3), 'turned_faces': turned,
                        'folded_faces': folded, 'pass': ok}
        scene = check_scene(cfg, body, pack, check, name, poses, fps) if body else None
        extra = ''
        if scene:
            report[name].update(scene)
            if 'scene' in scene:
                ok &= scene['scene']['depth'] <= rc.scene_depth
                extra += f', scene {scene["scene"]["depth"] * 100:.2f} cm ({scene["scene"]["piece"]})'
            if 'seat' in scene:
                ok &= abs(scene['seat']['gap']) <= rc.seat_gap
                extra += f', seat gap {scene["seat"]["gap"] * 100:.2f} cm'
            if 'hands' in scene:
                ok &= scene['hands']['distance'] <= rc.hand_targets
                extra += f', hands {scene["hands"]["distance"] * 100:.2f} cm'
            report[name]['pass'] = ok
        print(f'contact {name:12s} worst {depth * 100:5.2f} cm ({part} {side} at '
              f'{frame / fps:5.2f} s), turned past 90 deg {turned}, '
              f'folded past 120 deg {folded}{extra}  {"pass" if ok else "FAIL"}')
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
                   weights_of, bone_names, neighbors, pose_ref, parts_ref, project,
                   corrective_report, surface_parts, pack, body):
    """Checks the contacts and the folds of each clip, and repairs the folds.

    A fold means that the weights step sharply across one face between bones that turn far
    apart. After the check, the weights around each folded face get smoothed, the corrective
    shapes are made again, and the check runs again, for up to REPAIR_ROUNDS rounds. The
    weights and the shapes of each round go to restore_contacts, which writes them into the mesh.
    """
    w = weights
    report, folded = check_clips(cfg, template, skel, verts, tris, w, items, samples, shapes,
                                 weights_of, pack.fps, body, pack)
    repairs = []
    writes = []
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
        shapes, _, weights_of, corrective_report = template.correctives(
            cfg.role.bind.correctives, skel, verts, tris, w, pose_ref, parts_ref, project)
        writes.append((w, shapes))
        report, folded = check_clips(cfg, template, skel, verts, tris, w, items, samples, shapes,
                                     weights_of, pack.fps, body, pack)
    if DEBUG and folded:
        _debug_persisting(verts, tris, w, bone_names, folded, surface_parts)
    return {'contact_report': report, 'fold_repairs': repairs, 'final_weights': w,
            'final_shapes': shapes, 'final_corrective_report': corrective_report,
            '_restore': {'writes': writes}}


def restore_contacts(saved, final, bone_names, verts):
    """Writes the repaired weights and the corrective shapes of each repair round into the
    joined mesh, in the order of the rounds."""
    for w, shapes in saved['writes']:
        skin.write_first_weights(final, bone_names, w, len(verts))
        export.set_shape_keys(final, verts, shapes)
    return {}



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
    with open(cfg.paths.glb, 'rb') as f:
        glb = f.read()
    print('stats', json.dumps(stats))
    return {'stats': stats, '_restore': {'glb': glb}}


def restore_export(saved, cfg, stats):
    """Writes the GLB and the stats file."""
    os.makedirs(os.path.dirname(cfg.paths.glb), exist_ok=True)
    with open(cfg.paths.glb, 'wb') as f:
        f.write(saved['glb'])
    with open(cfg.paths.stats, 'w') as f:
        json.dump(stats, f, indent=2)
    return {}


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
                 'Organic pass, relax, jitter, no slivers, no inward faces -> the body object.',
                 keep=(), restore=restore_organic, restore_inputs=('cfg', 'surface_parts')),
    stages.Stage('paint', stage_paint,
                 ('cfg', 'body', 'parts', 'body_obj', 'centers', 'normals', 'verts', 'tris',
                  'height_px', 'seed'),
                 {'colors': 'array', 'occlusion': 'array', 'materials': 'live',
                  'body_stats': 'json'},
                 'Face colors, baked occlusion, materials, and facet measures.', cache='run'),
    stages.Stage('details', stage_details, ('cfg', 'body', 'parts', 'verts', 'tris'),
                 {'body_items': 'json'},
                 'Eyes, brows, nose, mouth, ears, tail, and claws on the facets.', cache='run'),
    stages.Stage('rig', stage_rig, ('cfg', 'body', 'template', 'body_obj', 'verts', 'parts'),
                 {'arm': 'live', 'bones': 'json', 'bone_names': 'json', 'heat_weights': 'array',
                  'weights': 'array', 'neighbors': 'json'},
                 'The armature of the template, bone heat, and the weight rules.', cache='run'),
    stages.Stage('correctives', stage_correctives,
                 ('cfg', 'body', 'template', 'pack', 'arm', 'bones', 'verts', 'tris', 'weights'),
                 {'skel': 'live', 'pose_ref': 'live', 'parts_ref': 'live', 'project': 'live',
                  'shapes': 'array', 'drivers': 'live', 'weights_of': 'live',
                  'corrective_report': 'json'},
                 'The corrective shapes that the role names.', cache='run'),
    stages.Stage('assemble', stage_assemble,
                 ('cfg', 'body', 'body_obj', 'body_items', 'materials', 'arm', 'verts', 'shapes'),
                 {'final': 'live', 'items': 'json'},
                 'Detail and role prop objects, the join, the shape keys, and the markers.',
                 cache='run'),
    stages.Stage('clips', stage_clips, ('pack', 'skel', 'drivers', 'clips_only'),
                 {'samples': 'live', 'sample_arrays': 'array'},
                 'The clips of the role -> actions.',
                 keep=('samples', 'sample_arrays'), restore=restore_clips,
                 restore_inputs=('samples', 'arm', 'skel', 'final', 'pack')),
    stages.Stage('contacts', stage_contacts,
                 ('cfg', 'template', 'skel', 'verts', 'tris', 'weights', 'items', 'samples',
                  'shapes', 'weights_of', 'bone_names', 'neighbors', 'pose_ref', 'parts_ref',
                  'project', 'corrective_report', 'surface_parts', 'pack', 'body'),
                 {'contact_report': 'json', 'fold_repairs': 'json', 'final_weights': 'array',
                  'final_shapes': 'array', 'final_corrective_report': 'json'},
                 'The contact and fold check of each clip, and the fold repair.',
                 restore=restore_contacts, restore_inputs=('final', 'bone_names', 'verts'),
                 track=('items',), joined='diagnostics'),
    stages.Stage('export', stage_export,
                 ('cfg', 'final', 'arm', 'body_stats', 'samples', 'final_corrective_report',
                  'fold_repairs', 'contact_report', 'pack'),
                 {'stats': 'json'},
                 'The GLB and the stats.', restore=restore_export, restore_inputs=('cfg', 'stats'),
                 scene=True),
    # studio-diag: the located contacts and folds and the fold debug list (studio/contacts.py).
    # studio/locate.py reads its data.json for checks.json and the look report.
    # It reads contacts.JOURNAL, which the stage "contacts" fills: its key holds the key of
    # "contacts", and "contacts" counts as a cache hit only when this stage has an entry too.
    stages.Stage('diagnostics', contacts.stage_diagnostics,
                 ('template', 'parts', 'surface_parts', 'samples', 'pack', 'contact_report',
                  'final_weights'),
                 {'diagnostics': 'json'},
                 'The located contacts and folds, and the fold debug list.',
                 keys_of=('contacts',)),
]


class Gate:
    """The remesh gate of one build: the checks after the remesh and after the organic pass."""

    def __init__(self, ctx, stage_dir, stop):
        """Stores the build context, the stage folder, and whether a failure stops the build."""
        self.ctx = ctx
        self.path = os.path.join(stage_dir, 'remesh-gate.json')
        self.stop = stop
        self.checks = []
        if os.path.exists(self.path):
            os.remove(self.path)

    def after(self, name, ctx):
        """Runs the part of the gate that follows a stage. Returns False to stop the build."""
        cfg = ctx['cfg']
        if name == 'remesh':
            self.checks = remesh.gate_quads(cfg, ctx['remesh_info'])
        elif name == 'organic':
            self.checks += remesh.gate_mesh(cfg, ctx['surface_parts'], ctx['verts'], ctx['tris'],
                                            ctx['height_px'])
        else:
            return True
        ok = all(c['pass'] for c in self.checks)
        failed = [c['name'] for c in self.checks if not c['pass']]
        with open(self.path, 'w') as f:
            json.dump({'seed': ctx['seed'], 'after': name, 'pass': ok, 'failed': failed,
                       'checks': self.checks}, f, indent=2)
        values = ', '.join(f'{c["name"]} {c["value"]}' for c in self.checks)
        print(f'remesh gate after {name}: {"pass" if ok else "FAIL " + ", ".join(failed)} '
              f'({values})')
        return ok or not self.stop


def setup(cfg_raw, args):
    """Makes the setup values of the build context (the body, its parts, the role pack) and
    their fingerprints for the stage cache. Returns (ctx, fingerprints or None)."""
    template = importlib.import_module(f'templates.{cfg_raw.animal.template}')
    views = load_profiles(cfg_raw.paths.measure)
    plain = {
        'seed': args.seed, 'template': cfg_raw.animal.template,
        'height_px': views['front']['height_px'],
        'clips_only': [c for c in args.clips.split(',') if c] or None,
    }
    ctx = dict(plain, template=template)
    if args.no_cache:
        ctx['cfg'] = cfg_raw
        body = template.Body(cfg_raw, views, cfg_raw.role.bind)
        ctx.update(body=body, parts=body.parts('bind'),
                   surface_parts=body.parts('bind', small=False),
                   pack=roles.make_pack(cfg_raw, body, template))
        return ctx, None
    cfg = cache.track(cfg_raw, 'cfg')
    roots = {'cfg': cfg_raw}
    fps = {k: cache.digest(v) for k, v in plain.items()}
    with open(cfg_raw.paths.measure, 'rb') as f:
        views_fp = cache.digest(f.read())
    body, fps['body'] = cache.setup_value(
        'body', lambda: template.Body(cfg, views, cfg.role.bind), roots, [views_fp])
    for name, fn in (('parts', lambda: body.parts('bind')),
                     ('surface_parts', lambda: body.parts('bind', small=False)),
                     ('pack', lambda: roles.make_pack(cfg, body, template))):
        ctx[name], fps[name] = cache.setup_value(name, fn, roots, [fps['body']])
    ctx.update(cfg=cfg, body=body)
    return ctx, fps


def main():
    """Runs the stages of the build."""
    args = parse_args()
    t0 = time.time()
    cfg_raw = config.load(args.animal, args.out)
    cache.register_functions('studio/build.py', globals())
    mesh.clear_scene()
    ctx, fps = setup(cfg_raw, args)
    cached = None
    if fps is not None:
        root = args.cache or cache.default_root()
        space = 'blender-' + '.'.join(str(v) for v in bpy.app.version)
        cached = stages.Cache(cache.Store(root, cfg_raw.animal.id, space), cfg_raw, fps, STAGES)
    os.makedirs(cfg_raw.paths.stages, exist_ok=True)
    gate = Gate(ctx, cfg_raw.paths.stages, not args.no_gate)
    setup_s = time.time() - t0
    record = stages.run(STAGES, ctx, cfg_raw.paths.stages, args.until, cached, gate.after)
    record['setup_seconds'] = round(setup_s, 2)
    with open(os.path.join(cfg_raw.paths.stages, 'run.json'), 'w') as f:
        json.dump(record, f, indent=2)
    print('stage seconds', json.dumps(record['seconds']))
    print('stage source', json.dumps(record['source']))
    if record['stopped']:
        print(f'stopped after {record["stopped"]}: the remesh gate fails')
    elif 'stats' in ctx:
        print(f'wrote {cfg_raw.paths.glb} in {time.time() - t0:.1f} s')


if __name__ == '__main__':
    main()
