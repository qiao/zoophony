"""The contact and fold check of each clip: parts that go into the body, and faces that fold. It
also records the place of each contact and fold, for the located failures.

The check skins the mesh itself (studio/skinning.py) at each baked frame. For each arm it builds
an obstacle from the body faces that do not belong to that arm: the trunk, the head, the legs,
and the other arm. Then it measures how deep each test point lies inside the obstacle: the
nearest point on the obstacle, and the side of its face normal. The template and the role name
the test groups (contact_spec): for the conductor, the forearm and paw vertices of the arm, its
claws, and the baton.

Each frame of a clip gives one plain record (ContactCheck.frame), and ContactCheck.clip reduces
the records of a clip. The frame cache (Frames) keeps the record of each frame in the shared stage
cache, keyed by the pose of the frame and the inputs of the check. So a change of one clip measures
again only the frames whose pose changed: the frames of that clip, and the frames of the
performance that show it.

The stage "diagnostics" (stage_diagnostics) runs after the export. It reads the checks of the
build from JOURNAL and returns the located contacts, the closest approach of each clip, the fold
debug list (each folded, turned, repaired, inward, or sliver face with its place, weights,
smallest angle, and rest direction), and a small patch of the posed mesh around each place for
the crop images (studio/locate.py draws them).

Runs inside Blender (it uses mathutils.bvhtree). All values are in animal heights: the GLB animal
is 1 m tall, so 0.01 is 1 cm.
"""

import time

import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

from studio import cache
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

# The store of the frame cache (a cache.Store), or None for no frame cache. studio/build.py sets
# it when the stage cache is on, so a build with --no-cache measures every frame.
FRAME_STORE = None

# The step name of the frame records in the store.
FRAME_STEP = 'contact-frames'

# The number of the newest valid entries of a clip that the frame cache reads its records from.
FRAME_SOURCES = 4


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
        col = {n: i for i, n in enumerate(self.names)}

        def wsum(bones):
            return self.w[:, [col[b] for b in bones]].sum(axis=1)

        self.obstacles = {}
        self.obstacle_faces = {}
        # The obstacle faces of each side as lists, the input of BVHTree.FromPolygons.
        self.obstacle_lists = {}
        self.tests = {}
        self.sides = list(spec)
        self.arm_bones = {side: list(s['arm']) for side, s in spec.items()}
        for side, s in spec.items():
            arm = wsum(s['arm'])
            free = arm < 0.5
            keep = free[self.tris].all(axis=1)
            self.obstacles[side] = self.tris[keep]
            self.obstacle_faces[side] = np.nonzero(keep)[0]
            self.obstacle_lists[side] = self.obstacles[side].tolist()
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

    def morph_weights(self, pose):
        """Returns the weights of the corrective shapes in a pose, or None with no shapes."""
        if self.morphs and self.driver:
            return self.driver(pose)
        return None

    def pose_body(self, pose, morph_weights=None):
        """Poses the body mesh: the corrective shapes of the pose, then the skinning.

        morph_weights: the result of morph_weights(pose), when the caller has it.
        Returns (world rotations, heads, scales, the rest mesh with the shapes, the posed mesh).
        """
        D, H, S = forward_kinematics(self.skel, pose)
        rest = self.verts
        if self.morphs and self.driver:
            mw = self.driver(pose) if morph_weights is None else morph_weights
            rest = rest + sum(mw[s] * self.morphs[s] for s in self.morphs)
        A, t = blend_matrices(self.skel, self.w, pose)
        return D, H, S, rest, skin(A, t, rest)

    def content(self):
        """Returns the plain values that decide the record of a frame, besides the pose and the
        weights of the shapes: the skeleton, the mesh, the weights, the shapes, the obstacles,
        and the test groups. The frame cache keys a round of the check with their digest."""
        skel = self.skel
        return [self.names, [skel.parents[n] for n in self.names],
                [skel.heads[n] for n in self.names], [skel.rest[n] for n in self.names],
                self.verts, self.tris, self.w, self.morphs, self.sides, self.arm_bones,
                self.obstacles, self.obstacle_faces, self.tests]

    def posed_test(self, side, index, pose):
        """Poses one test group of a side. Returns (points, faces of the points)."""
        _, prop_bone, pts, w, faces, _ = self.tests[side][index]
        D, H, S = forward_kinematics(self.skel, pose)
        return self._skin(pts, w, D, H, S), np.asarray(faces, np.int64).reshape(-1, 3)

    def frame(self, posed_body):
        """Measures one frame of the body that pose_body posed (posed_body: its result).

        Returns the frame record (plain values): 'depths' {(side, part): deepest contact} in
        animal heights, 'deep' {(side, part): the place of that contact}, 'gap' the place of the
        closest point outside the body (or None), and 'turned' [(face, cosine)] of each face
        turned past 90 degrees, in the order of the faces.
        """
        D, H, S, rest, body = posed_body
        rotations = np.stack([D[n] for n in self.names])
        dots = dominant_dots(rest, self.tris, body, self.w, rotations)
        turned = [(f, float(dots[f])) for f in np.nonzero(dots < 0.0)[0].tolist()]
        deep, closest = {}, None
        result = {}
        corners = [Vector(v) for v in body]
        for side in self.sides:
            tri = self.obstacles[side]
            tree = BVHTree.FromPolygons(corners, self.obstacle_lists[side], all_triangles=True)
            for test, (part, prop_bone, pts, w, faces, _) in enumerate(self.tests[side]):
                posed = self._skin(pts, w, D, H, S)
                # A hidden prop (scale near 0) is not tested.
                if prop_bone and S[prop_bone] < 0.05:
                    continue
                if len(faces):
                    posed = np.concatenate([posed, posed[faces].mean(axis=1)])
                deepest, spot = 0.0, None
                for k, p in enumerate(posed):
                    vp = Vector(p)
                    hit = tree.find_nearest(vp)
                    if hit[0] is None:
                        continue
                    loc, normal, index, dist = hit
                    inward = (vp - loc).dot(normal) < 0
                    if dist > deepest and inward:
                        # The obstacle is open where the arm joins it, so the side of the nearest
                        # face can be wrong. A winding number confirms the inside.
                        if winding_number(p, body, tri) > 0.5:
                            deepest = dist
                            spot = (k, index, loc)
                    elif not inward and (closest is None or dist < closest['gap']):
                        closest = self._place(side, part, test, k, p, index, loc, gap=dist)
                key = (side, part)
                if spot and deepest > result.get(key, 0.0):
                    k, index, loc = spot
                    deep[key] = self._place(side, part, test, k, posed[k], index, loc,
                                            depth=deepest)
                result[key] = max(result.get(key, 0.0), deepest)
        return {'depths': result, 'deep': deep, 'gap': closest, 'turned': turned}

    def _place(self, side, part, test, k, p, index, loc, **measure):
        """Describes a test point and its nearest obstacle face (plain values)."""
        out = {'side': side, 'part': part, 'test': test, 'point': int(k),
               'position': [float(v) for v in p], 'nearest': [float(v) for v in loc],
               'face': int(self.obstacle_faces[side][index])}
        out.update({key: float(v) for key, v in measure.items()})
        return out

    def clip(self, frames):
        """Reduces the frame records of a clip (frame(), in the order of the frames).

        Returns (worst depth, side, part, frame, the most turned faces in one frame, the most
        folded faces in one frame). self.folded gets the folded faces of each frame, and
        self.records gets the record of the clip: the deepest contact, the closest approach, and
        the worst frame of each face turned past 90 degrees.
        """
        worst = (0.0, '-', '-', 0)
        turned = folded = 0
        rec = {'frames': len(frames), 'worst': None, 'gap': None, 'faces': {}}
        for i, fr in enumerate(frames):
            faces = fr['turned']
            bent = [f for f, dot in faces if dot < FOLD_DOT]
            self.folded.update(bent)
            turned = max(turned, len(faces))
            folded = max(folded, len(bent))
            for (side, part), depth in fr['depths'].items():
                if depth > worst[0]:
                    worst = (depth, side, part, i)
                    rec['worst'] = dict(fr['deep'][(side, part)], frame=i)
            gap = fr['gap']
            if gap and (rec['gap'] is None or gap['gap'] < rec['gap']['gap']):
                rec['gap'] = dict(gap, frame=i)
            for f, dot in faces:
                face = rec['faces'].setdefault(f, {'dot': 1.0, 'frame': 0, 'frames': 0})
                face['frames'] += 1
                if dot < face['dot']:
                    face['dot'], face['frame'] = dot, i
        self.records.append(rec)
        return worst + (turned, folded)


def pose_keys(samples):
    """Returns the digest of each pose of each clip {clip: [digest]} for the frame cache, or
    None with no frame cache. The rounds of the fold repair share them."""
    if FRAME_STORE is None:
        return None
    return {name: [cache.digest(p) for p in poses] for name, poses in samples.items()}


class Frames:
    """The frame cache of one round of the contact check: it measures the frames of a clip, or
    takes their records from the shared stage cache (FRAME_STORE).

    The key of a frame holds the inputs of its measure: the digest of the round (the content of
    the ContactCheck and of the scene check), the pose, the weights of the corrective shapes in
    the pose, and the hand targets of the frame. An entry holds the records of all frames of
    one clip, in the folder of the round and the clip. Its manifest holds the code that measured
    the records, as a stage entry does (studio/cache.py), and the stage "contacts" records that
    code too, so its own key stays true.
    """

    def __init__(self, check, scene=None):
        """Stores the contact check and the scene check (studio/scene_check.py, or None) of the
        round, and the digest of the round."""
        self.check = check
        self.scene = scene
        self.store = FRAME_STORE
        self.round = None
        if self.store is not None:
            self.round = cache.digest([FRAME_STEP, check.content(),
                                       scene.content() if scene else None])
        # The frames that the round measured, and the frames that came from the cache.
        self.measured = 0
        self.cached = 0
        # The seconds of the frames that the round measured.
        self.seconds = 0.0

    def _measure(self, poses, weights, goals, index):
        """Measures one frame: the contact check and the scene check on one posed body."""
        posed_body = self.check.pose_body(poses[index], weights[index])
        rec = {'contact': self.check.frame(posed_body)}
        if self.scene:
            rec['scene'] = self.scene.frame(poses[index], goals[index], posed_body)
        return rec

    def clip(self, name, poses, fps, keys=None):
        """Returns the record of each frame of a clip: {'contact': ContactCheck.frame, 'scene':
        SceneCheck.frame (with a scene check)}. keys: the pose digests of pose_keys."""
        weights = [self.check.morph_weights(p) for p in poses]
        goals = [self.scene.goal(name, i / fps) if self.scene else None
                 for i in range(len(poses))]
        if self.store is None:
            t0 = time.time()
            out = [self._measure(poses, weights, goals, i) for i in range(len(poses))]
            self.measured += len(poses)
            self.seconds += time.time() - t0
            return out
        if keys is None:
            keys = [cache.digest(p) for p in poses]
        keys = [cache.digest([keys[i], weights[i], goals[i]]) for i in range(len(poses))]
        base = cache.digest([FRAME_STEP, self.round, name])
        entries = self.store.lookup_all(FRAME_STEP, base, {}, FRAME_SOURCES)
        known = {}
        for j, (_, data) in enumerate(entries):
            for k, rec in data['frames'].items():
                known.setdefault(k, (rec, j))
        records = [None] * len(poses)
        missing = []
        used = set()
        for i, k in enumerate(keys):
            hit = known.get(k)
            if hit is None:
                missing.append(i)
            else:
                records[i] = hit[0]
                used.add(hit[1])
        code = {}
        for j in sorted(used):
            code.update((k, d) for k, d in entries[j][0]['manifest']['code'])
        cache.note_code(code)
        self.cached += len(poses) - len(missing)
        if not missing:
            return records
        t0 = time.time()
        with cache.part(FRAME_STEP) as rec:
            for i in missing:
                records[i] = self._measure(poses, weights, goals, i)
        seconds = time.time() - t0
        self.measured += len(missing)
        self.seconds += seconds
        manifest = rec.manifest({})
        code.update((k, d) for k, d in manifest['code'])
        manifest['code'] = sorted([k, d] for k, d in code.items())
        frames = dict(zip(keys, records))
        self.store.save(FRAME_STEP, base, cache.digest([base, manifest, keys]),
                        {'manifest': manifest, 'clip': name, 'frames': len(poses),
                         'measured': len(missing), 'seconds': round(seconds, 3)},
                        {'frames': frames})
        return records

    def summary(self):
        """Describes the frames of the round for the log of the build."""
        text = f'{self.measured} frames measured in {self.seconds:.1f} s'
        if self.store is not None:
            text += f', {self.cached} from the frame cache'
        return text


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
