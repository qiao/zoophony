"""The contact and fold check of each clip: parts that go into the body, and faces that fold. It
also records the place of each contact and fold, for the located failures.

The check skins the mesh itself (studio/skinning.py) at each baked frame. For each arm it builds
an obstacle from the body faces that do not belong to that arm: the trunk, the head, the legs,
and the other arm. Then it measures how deep each test point lies inside the obstacle: the
nearest point on the obstacle, and the side of its face normal. The template and the role name
the test groups (contact_spec): for the conductor, the forearm and paw vertices of the arm, its
claws, and the baton.

The stage "diagnostics" (stage_diagnostics) runs after the export. It reads the checks of the
build from JOURNAL and returns the located contacts, the closest approach of each clip, the fold
debug list (each folded, turned, repaired, inward, or sliver face with its place, weights,
smallest angle, and rest direction), and a small patch of the posed mesh around each place for
the crop images (studio/locate.py draws them).

Runs inside Blender (it uses mathutils.bvhtree). All values are in animal heights: the GLB animal
is 1 m tall, so 0.01 is 1 cm.
"""

import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

from studio.field import field_at
from studio.skinning import (FOLD_DOT, blend_matrices, dominant_dots, face_normals,
                             forward_kinematics, skin, winding_number)

# The checks of the current build process, in the order they ran: the first check, then one more
# after each round of the fold repair (studio/build.py). stage_diagnostics reads and clears it.
# It is an input of the stage "diagnostics" that the stage list does not name.
JOURNAL = []

# A face with a smallest angle under this is a sliver (as remesh.triangle_quality counts).
SLIVER_DEG = 15.0

# The radius of the patch of mesh around a located place.
PATCH_RADIUS = 0.12

# The largest number of faces of the fold debug list that get a patch.
MAX_PATCHES = 30


class ContactCheck:
    """The test points, the obstacles, and the skinning data of one body."""

    def __init__(self, skel, body_verts, body_tris, weights, details, spec, morphs, driver):
        """Stores the mesh in the bind pose (three.js axes) and sorts the test points.

        weights: (vertices, bones) in the order of skel.names. details: the detail dicts (each
        one is rigid on one bone). spec: {side: {'arm': bones of the arm, 'tests': [(part, kind,
        what)]}} with kind 'skin' (what: bones whose skin is tested), 'detail' (what: a name
        prefix of details), or 'prop' (what: the name of a prop detail). morphs: {shape name:
        delta}, the corrective shapes, and driver: a function pose -> {shape name: weight}.
        """
        self.skel = skel
        self.morphs = morphs or {}
        self.driver = driver
        self.names = list(skel.names)
        self.verts = np.asarray(body_verts, float)
        self.tris = np.asarray(body_tris, np.int64)
        self.w = np.asarray(weights, float)
        # The faces that folded over in any frame (indices into body_tris).
        self.folded = set()
        # One record of each clip that clip() measured, in order (see clip()).
        self.records = []
        # The details of the last frame that frame() measured.
        self.last = None
        col = {n: i for i, n in enumerate(self.names)}

        def wsum(bones):
            return self.w[:, [col[b] for b in bones]].sum(axis=1)

        self.obstacles = {}
        self.obstacle_faces = {}
        self.tests = {}
        self.sides = list(spec)
        self.arm_bones = {side: list(s['arm']) for side, s in spec.items()}
        for side, s in spec.items():
            arm = wsum(s['arm'])
            free = arm < 0.5
            keep = free[self.tris].all(axis=1)
            self.obstacles[side] = self.tris[keep]
            self.obstacle_faces[side] = np.nonzero(keep)[0]
            tests = []
            for part, kind, what in s['tests']:
                if kind == 'skin':
                    member = wsum(what) > 0.5
                    idx = np.nonzero(member)[0]
                    # The faces of the region add their centers as test points.
                    local = {v: i for i, v in enumerate(idx)}
                    faces = self.tris[member[self.tris].all(axis=1)]
                    faces = np.array([[local[v] for v in f] for f in faces], np.int64).reshape(-1, 3)
                    tests.append((part, None, self.verts[idx], self.w[idx], faces, None))
                    continue
                for d in details:
                    hit = d['name'].startswith(what) if kind == 'detail' else d['name'] == what
                    if hit:
                        tests.append((part, d['bone'] if kind == 'prop' else None, d['verts'],
                                      self._rigid(d['bone'], len(d['verts'])), d['faces'],
                                      d['name']))
            self.tests[side] = tests
        JOURNAL.append(self)

    def _rigid(self, bone, n):
        """Makes weights that give n points to one bone."""
        w = np.zeros((n, len(self.names)))
        w[:, self.names.index(bone)] = 1.0
        return w

    def _skin(self, points, weights, D, H, S):
        """Moves bind-pose points to the pose with linear blend skinning."""
        out = np.zeros_like(points)
        for j, name in enumerate(self.names):
            wj = weights[:, j]
            nz = wj > 0
            if not nz.any():
                continue
            moved = (points[nz] - self.skel.heads[name]) @ (D[name] * S[name]).T + H[name]
            out[nz] += wj[nz, None] * moved
        return out

    def pose_body(self, pose):
        """Poses the body mesh: the corrective shapes of the pose, then the skinning.

        Returns (world rotations, heads, scales, the rest mesh with the shapes, the posed mesh).
        """
        D, H, S = forward_kinematics(self.skel, pose)
        rest = self.verts
        if self.morphs and self.driver:
            mw = self.driver(pose)
            rest = rest + sum(mw[s] * self.morphs[s] for s in self.morphs)
        A, t = blend_matrices(self.skel, self.w, pose)
        return D, H, S, rest, skin(A, t, rest)

    def posed_test(self, side, index, pose):
        """Poses one test group of a side. Returns (points, faces of the points)."""
        _, prop_bone, pts, w, faces, _ = self.tests[side][index]
        D, H, S = forward_kinematics(self.skel, pose)
        return self._skin(pts, w, D, H, S), np.asarray(faces, np.int64).reshape(-1, 3)

    def frame(self, pose):
        """Measures one frame.

        Returns ({(side, part): deepest contact} in animal heights, (faces turned past 90
        degrees, faces folded past 120 degrees)). self.last keeps the details: the face dots,
        the deepest point of each (side, part), and the closest point outside the body.
        """
        D, H, S, rest, body = self.pose_body(pose)
        rotations = np.stack([D[n] for n in self.names])
        dots = dominant_dots(rest, self.tris, body, self.w, rotations)
        turned = (int(np.sum(dots < 0.0)), int(np.sum(dots < FOLD_DOT)))
        self.folded.update(np.nonzero(dots < FOLD_DOT)[0].tolist())
        self.last = {'dots': dots, 'deep': {}, 'gap': None}
        result = {}
        for side in self.sides:
            tri = self.obstacles[side]
            tree = BVHTree.FromPolygons([Vector(v) for v in body], tri.tolist(), all_triangles=True)
            for test, (part, prop_bone, pts, w, faces, _) in enumerate(self.tests[side]):
                posed = self._skin(pts, w, D, H, S)
                # A hidden prop (scale near 0) is not tested.
                if prop_bone and S[prop_bone] < 0.05:
                    continue
                if len(faces):
                    posed = np.concatenate([posed, posed[faces].mean(axis=1)])
                deepest, spot = 0.0, None
                for k, p in enumerate(posed):
                    hit = tree.find_nearest(Vector(p))
                    if hit[0] is None:
                        continue
                    loc, normal, index, dist = hit
                    inward = (Vector(p) - loc).dot(normal) < 0
                    if dist > deepest and inward:
                        # The obstacle is open where the arm joins it, so the side of the nearest
                        # face can be wrong. A winding number confirms the inside.
                        if winding_number(p, body, tri) > 0.5:
                            deepest = dist
                            spot = (k, index, loc)
                    elif not inward:
                        gap = self.last['gap']
                        if gap is None or dist < gap['gap']:
                            self.last['gap'] = self._place(side, part, test, k, p, index, loc,
                                                           gap=dist)
                key = (side, part)
                if spot and deepest > result.get(key, 0.0):
                    k, index, loc = spot
                    self.last['deep'][key] = self._place(side, part, test, k, posed[k], index,
                                                         loc, depth=deepest)
                result[key] = max(result.get(key, 0.0), deepest)
        return result, turned

    def _place(self, side, part, test, k, p, index, loc, **measure):
        """Describes a test point and its nearest obstacle face (plain values)."""
        out = {'side': side, 'part': part, 'test': test, 'point': int(k),
               'position': [float(v) for v in p], 'nearest': [float(v) for v in loc],
               'face': int(self.obstacle_faces[side][index])}
        out.update({key: float(v) for key, v in measure.items()})
        return out

    def clip(self, poses):
        """Measures each frame of a clip.

        Returns (worst depth, side, part, frame, the most turned faces in one frame, the most
        folded faces in one frame). self.records gets the record of the clip: the deepest
        contact, the closest approach, and the worst frame of each face turned past 90 degrees.
        """
        worst = (0.0, '-', '-', 0)
        turned = folded = 0
        rec = {'frames': len(poses), 'worst': None, 'gap': None, 'faces': {}}
        for i, pose in enumerate(poses):
            depths, (n_turned, n_folded) = self.frame(pose)
            turned = max(turned, n_turned)
            folded = max(folded, n_folded)
            for (side, part), depth in depths.items():
                if depth > worst[0]:
                    worst = (depth, side, part, i)
                    rec['worst'] = dict(self.last['deep'][(side, part)], frame=i)
            gap = self.last['gap']
            if gap and (rec['gap'] is None or gap['gap'] < rec['gap']['gap']):
                rec['gap'] = dict(gap, frame=i)
            dots = self.last['dots']
            for f in np.nonzero(dots < 0.0)[0].tolist():
                face = rec['faces'].setdefault(f, {'dot': 1.0, 'frame': 0, 'frames': 0})
                face['frames'] += 1
                if dots[f] < face['dot']:
                    face['dot'], face['frame'] = float(dots[f]), i
        self.records.append(rec)
        return worst + (turned, folded)


def _angle(dot):
    """Turns the cosine of a face turn into degrees."""
    return round(float(np.degrees(np.arccos(np.clip(dot, -1.0, 1.0)))), 1)


def _round(values, digits=4):
    """Rounds an array into plain nested lists."""
    return np.round(np.asarray(values, float), digits).tolist()


def _gradient(parts, points):
    """Calculates the unit gradient of the field at points (it points out of the body)."""
    eps = 0.002
    grad = np.stack([field_at(parts, points + eps * e) - field_at(parts, points - eps * e)
                     for e in np.eye(3)], axis=1)
    return grad / np.maximum(np.linalg.norm(grad, axis=1, keepdims=True), 1e-9)


def _smallest_angles(verts, tris):
    """Calculates the smallest angle of each face in degrees."""
    t = verts[tris]
    angles = []
    for k in range(3):
        a = t[:, (k + 1) % 3] - t[:, k]
        b = t[:, (k + 2) % 3] - t[:, k]
        cos = np.sum(a * b, axis=1) / (np.linalg.norm(a, axis=1) * np.linalg.norm(b, axis=1))
        angles.append(np.degrees(np.arccos(np.clip(cos, -1, 1))))
    return np.min(np.stack(angles, axis=1), axis=1)


class Places:
    """Describes the faces of the body: place, region, weights, angles, rest direction."""

    def __init__(self, check, template, surface_parts):
        """Calculates the rest centers, normals, areas, smallest angles, and rest directions."""
        self.check = check
        self.region = getattr(template, 'region_name', None)
        v, t = check.verts, check.tris
        self.centers = v[t].mean(axis=1)
        cross = np.cross(v[t[:, 1]] - v[t[:, 0]], v[t[:, 2]] - v[t[:, 0]])
        self.areas = 0.5 * np.linalg.norm(cross, axis=1)
        self.normals = face_normals(v, t)
        self.smallest = _smallest_angles(v, t)
        grad = _gradient(surface_parts, self.centers)
        self.rest_dots = np.sum(grad * self.normals, axis=1)

    def bone_of(self, weights):
        """Returns the bone with the largest weight of a weight row."""
        return self.check.names[int(np.argmax(weights))]

    def top_weights(self, weights, n=3):
        """Lists the n largest weights of a weight row as [bone, weight]."""
        order = np.argsort(weights)[::-1][:n]
        return [[self.check.names[k], round(float(weights[k]), 3)] for k in order
                if weights[k] > 0.005]

    def region_of(self, face, weights=None):
        """Names the region of a face (with the weights of the final check by default)."""
        ws = self.check.w[self.check.tris[face]].mean(axis=0) if weights is None else weights
        bone = self.bone_of(ws)
        if not self.region:
            return bone
        return self.region(bone, self.centers[face], self.normals[face])

    def face(self, f, weights=None):
        """Describes one face in the bind pose (its weights: the final weights by default)."""
        w = self.check.w if weights is None else weights
        ws = w[self.check.tris[f]].mean(axis=0)
        bone = self.bone_of(ws)
        side = bone[-1] if bone.endswith(('_L', '_R')) else (
            'L' if self.centers[f][0] > 0.01 else 'R' if self.centers[f][0] < -0.01 else 'middle')
        return {'face': int(f), 'rest_position': _round(self.centers[f]),
                'bone': bone, 'side': side, 'region': self.region_of(f, ws),
                'weights': self.top_weights(ws),
                'smallest_angle_deg': round(float(self.smallest[f]), 1),
                'rest_dot': round(float(self.rest_dots[f]), 3),
                'area': round(float(self.areas[f]), 6)}


def patch(verts, tris, center, marked=(), arm=None, weights=None, radius=PATCH_RADIUS,
          parts=()):
    """Cuts the faces near a place out of a mesh, for a crop image.

    Returns {'verts', 'tris', 'kinds'} with local vertex indices. kinds: 0 the body,
    1 the arm of the contact (weights over 0.5 on the bones of `arm`), 2 a marked face, 3 a
    test part (a detail or a prop: parts is [(points, faces)]).
    """
    centers = verts[tris].mean(axis=1)
    near = np.nonzero(np.linalg.norm(centers - center, axis=1) < radius)[0]
    marked = set(int(f) for f in marked)
    near = sorted(set(near.tolist()) | marked)
    kinds = []
    for f in near:
        if f in marked:
            kinds.append(2)
        elif arm is not None and weights[tris[f]][:, arm].sum(axis=1).mean() > 0.5:
            kinds.append(1)
        else:
            kinds.append(0)
    used = sorted(set(int(v) for f in near for v in tris[f]))
    local = {v: i for i, v in enumerate(used)}
    out_verts = [verts[v] for v in used]
    out_tris = [[local[int(v)] for v in tris[f]] for f in near]
    for pts, faces in parts:
        base = len(out_verts)
        keep = [f for f in faces if np.linalg.norm(pts[f].mean(axis=0) - center) < radius]
        out_verts += list(pts)
        out_tris += [[base + int(v) for v in f] for f in keep]
        kinds += [3] * len(keep)
    return {'verts': _round(out_verts, 5), 'tris': out_tris, 'kinds': kinds}


def _located_faces(checks, clips):
    """Gathers the turned and folded faces of all rounds of the check.

    Returns {face: {'tags', 'final': {clip: record}, 'before': {clip: record}, 'fold_round'}}.
    A record is {'dot', 'frame', 'frames'}: the cosine of the worst turn of the face in the clip,
    its frame, and the number of frames where the face turns past 90 degrees. 'final' holds the
    clips of the final round, 'before' the clips of the first round where the face folded
    (before a repair).
    """
    final = len(checks) - 1
    out = {}
    for r, check in enumerate(checks):
        for c, rec in enumerate(check.records):
            for f, face in rec['faces'].items():
                folded = face['dot'] < FOLD_DOT
                if r < final and not folded:
                    continue
                entry = out.setdefault(f, {'tags': set(), 'final': {}, 'before': {}})
                if r == final:
                    entry['tags'].add('folded' if folded else 'turned')
                    entry['final'][clips[c]] = face
                elif entry.setdefault('fold_round', r) == r:
                    entry['before'][clips[c]] = face
    for entry in out.values():
        if 'fold_round' in entry and 'folded' not in entry['tags']:
            entry['tags'].add('repaired')
    return out


STATUS_ORDER = ('folded', 'inward', 'turned', 'repaired', 'sliver')


def stage_diagnostics(template, parts, surface_parts, samples, pack, contact_report,
                      final_weights):
    """Locates the contacts and the folds of the checks of this build, and lists the faces of
    the fold debug list. Reads and clears JOURNAL.

    contact_report and final_weights tie this stage to the stage "contacts" (a cache must run
    both or neither). Returns {'diagnostics': {...}}: see the doc of the module.
    """
    checks = list(JOURNAL)
    JOURNAL.clear()
    if not checks:
        return {'diagnostics': None}
    final = checks[-1]
    clips = list(samples)
    fps = pack.fps
    for check in checks:
        if len(check.records) != len(clips):
            raise ValueError(f'a contact check measured {len(check.records)} clips, the build has '
                             f'{len(clips)}')
    places = Places(final, template, surface_parts)
    col = {n: i for i, n in enumerate(final.names)}

    # The deepest contact and the closest approach of each clip (the final check).
    contacts, gaps = {}, {}
    for c, rec in enumerate(final.records):
        clip = clips[c]
        for kind, spot in (('contact', rec['worst']), ('gap', rec['gap'])):
            if not spot:
                continue
            side, test = spot['side'], spot['test']
            part, _, pts, w, faces, detail = final.tests[side][test]
            k = spot['point']
            ws = w[k] if k < len(pts) else w[faces[k - len(pts)]].mean(axis=0)
            item = {'clip': clip, 'frame': spot['frame'],
                    'time_s': round(spot['frame'] / fps, 3), 'side': side, 'part': part,
                    'bone': places.bone_of(ws), 'position': _round(spot['position']),
                    'nearest': _round(spot['nearest']), 'into_face': spot['face'],
                    'into_bone': places.bone_of(final.w[final.tris[spot['face']]].mean(axis=0)),
                    'region': places.region_of(spot['face'])}
            if detail:
                item['detail'] = detail
            if kind == 'gap':
                item['gap'] = round(spot['gap'], 4)
                gaps[clip] = item
                continue
            item['depth'] = round(spot['depth'], 4)
            pose = samples[clip][spot['frame']]
            _, _, _, _, body = final.pose_body(pose)
            extra = []
            if detail:
                extra = [final.posed_test(side, test, pose)]
            arm = [col[b] for b in final.arm_bones[side]]
            item['patch'] = patch(body, final.tris, np.array(spot['position']), [spot['face']],
                                  arm, final.w, PATCH_RADIUS * 1.2, extra)
            item['patch']['points'] = [item['position'], item['nearest']]
            contacts[clip] = item

    # The faces that turned or folded in the clips, in any round of the check. A face in the
    # final round is shown in that round; a repaired face in the round where it folded.
    faces = []
    for f, entry in _located_faces(checks, clips).items():
        r = len(checks) - 1 if entry['final'] else entry['fold_round']
        records = entry['final'] or entry['before']
        tags = sorted(entry['tags'], key=STATUS_ORDER.index)
        item = places.face(f, checks[r].w)
        item.update({'status': tags[0], 'tags': tags, 'round': r, 'clips': {}})
        if 'repaired' in tags:
            item['weights_before_repair'] = places.top_weights(
                checks[entry['fold_round']].w[final.tris[f]].mean(axis=0))
            item['weights'] = places.top_weights(final.w[final.tris[f]].mean(axis=0))
        for clip, rec in records.items():
            _, _, _, _, body = checks[r].pose_body(samples[clip][rec['frame']])
            center = body[final.tris[f]].mean(axis=0)
            item['clips'][clip] = {'frame': rec['frame'], 'time_s': round(rec['frame'] / fps, 3),
                                   'angle_deg': _angle(rec['dot']), 'frames': rec['frames'],
                                   'position': _round(center), '_body': body}
        worst = min(records, key=lambda clip: records[clip]['dot'])
        item.update({'clip': worst, 'angle_deg': item['clips'][worst]['angle_deg']})
        faces.append(item)

    # The rest mesh: faces that point into the body (as the stage "paint" counts them, with all
    # parts of the field) and slivers.
    grad = _gradient(parts, places.centers)
    inward = np.nonzero(np.sum(grad * places.normals, axis=1) < -0.5)[0]
    slivers = np.nonzero(places.smallest < SLIVER_DEG)[0]
    listed = {item['face']: item for item in faces}
    for tag, found in (('inward', inward), ('sliver', slivers)):
        for f in found.tolist():
            item = listed.get(f)
            if item is None:
                item = places.face(f)
                item.update({'status': tag, 'tags': [tag], 'clips': {}})
                faces.append(item)
                listed[f] = item
            elif tag not in item['tags']:
                item['tags'] = sorted(item['tags'] + [tag], key=STATUS_ORDER.index)
                item['status'] = item['tags'][0]
    faces.sort(key=lambda it: (STATUS_ORDER.index(it['status']), -it.get('angle_deg', 0.0),
                               it['face']))

    # The patches of the crops: one for each face and clip (the rest mesh for a face that turns
    # in no clip), at most MAX_PATCHES.
    budget = MAX_PATCHES
    for item in faces:
        f = item['face']
        for rec in item['clips'].values():
            body = rec.pop('_body')
            if budget > 0:
                rec['patch'] = patch(body, final.tris, np.array(rec['position']), [f])
                budget -= 1
        if not item['clips'] and budget > 0:
            item['patch'] = patch(final.verts, final.tris, places.centers[f], [f])
            budget -= 1

    return {'diagnostics': {
        'fps': fps, 'rounds': len(checks), 'clips': clips,
        'contacts': contacts, 'gaps': gaps, 'faces': faces,
        'counts': {'inward': int(len(inward)), 'slivers': int(len(slivers)),
                   'body_faces': int(len(final.tris))},
    }}
