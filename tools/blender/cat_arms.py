"""Replays the Blender session that rebuilt the arms of the cat violist.

On 2026-10-24 the user said: "note that there's significant twisting happening for the arms and
wrists. add loop edges and retopology and additional bones if needed to address them", and allowed
loop edges, a retopology, and extra bones for the arm and the wrist twist. The cat needs more than
the route of `violin_arms.py`: the upper arm of the user mesh joins the side of the trunk down to
the elbow, so a cut at a right angle to the bone finds no closed loop around the arm. This script
gives the cat a real armpit:

1. Import the mesh of the user and Merge by Distance (`violin_arms.import_mesh()`).
2. Cut each arm along the seam where it meets the trunk, not at a right angle to the bone: Bisect
   with the plane of the seam (`seam_plane()`) above the old armpit, and Bisect at the wrist. The
   faces of the arm beyond the seam and the wrist go (Delete Faces).
3. Split the hole of the seam at the height `seam.edge` into the top arc (the shoulder) and the
   lower run. A new edge run across the plane, the armpit line, closes the lower run, and Fill
   (Beauty) makes the side wall of the trunk under the arm from them.
4. Model a quad tube of rings of `RING_VERTS` from the shoulder to the wrist. Each ring stands at a
   right angle to its bone. Where a ring of the upper arm goes into the trunk, its vertices lie on
   the plane of the seam: the flat inner side of the upper arm lies on the side wall, and the two
   meet only at the armpit line. Shrinkwrap puts the other vertices on the source arm.
5. Bridge Edge Loops joins the first ring to the top arc and the armpit line, and the last ring to
   the paw. Beautify Faces runs on the bridge triangles.
6. UV, bake, normals, the shape of the app body, the atlas, and the export, as in
   `violin_arms.py`. Smooth Vertices rounds the two edges of the flat inner side. The inner side
   and the side wall take the fur color of the trunk beside the seam.
7. The studio skeleton with the arm segments and the helpers, automatic weights, and the Weight
   Paint fixes of `step_paint()`.
8. Write the weights for `paintedWeights` of the config (`cat-weights.json`).

Run it in a terminal from the root of the tree:

    Blender -b --factory-startup -P tools/blender/cat_arms.py -- [<out dir>] [--views <dir>]

A run gives the same `cat-arms.glb` and `cat-weights.json`, byte for byte. `--views <dir>` writes
check images of the arms after each step of the mesh, and the part codes of each vertex.
"""

import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import violin_arms as va  # noqa: E402

#: The settings of the cat, in the units of the studio (1 unit from the soles to the ear tips).
#: `seam`: the cut along the seam and the armpit:
#:
#: - `x`, `lean`: the plane of the seam, |x| from the middle plane at the height `armpit`, and its
#:   lean out for each unit of height down, as the side of the trunk widens below the armpit.
#: - `low`: the lowest height of the cut, below the old armpit. `reach`: the distance from the
#:   forearm line of a face of the free arm below `low`. `under` (optional): a face below `low`
#:   is also out from |x| `under.x` plus `under.lean` for each unit of height below `low`, so that
#:   a round belly under a thick forearm stays on the trunk (the hippo). `hole` (optional): the
#:   reach of the hole of the seam from the upper arm line, 0.16 by default.
#: - `edge`, `armpit`: the heights of the ends and of the middle of the armpit line. Equal heights
#:   give a straight line.
#: - `lift`: the place of the flat inner side of the arm from the side wall: a small depth in the
#:   trunk, so that the front and the back of the arm root stay against the trunk with no slit.
#: - `rings`: the blend shares of the rings of the shoulder from the socket to the first ring.
#:   `ruled`: the number of those rings that keep the rule weights of the config. `ramp`: the
#:   number of rounds of Smooth on the weights of the tube. `round`: the rounds of Smooth Vertices
#:   on the edges of the flat side. `wrap`: the limit of the Shrinkwrap.
#:
#: `anchor`: the share of the chest on the tube near the side walls (`anchor()`). The other keys are
#: the keys of `violin_arms.ANIMALS`.
CAT = {
    'config': 'tools/mesh-rigs/cat.json',
    'source': 'assets/models/cat/cat.glb',
    'folder': 'assets/models/cat',
    # The upper arm is 0.92 and the forearm 0.78 as long as on the mesh, 1.10 head heights from the
    # shoulder joint to the wrist, and the forearm is 0.86 of the upper arm, as on a real arm: the
    # user said "the cat's arm ... is longer than expected" (2026-10-27-cat-fox2 decisions). With
    # 0.85 for both, the shorter upper arm moved the round part of the tube into the plane of the
    # seam, and the middle of the upper arm went 22% narrower at rest. With 1 (1.30 H) and with
    # 1.1496, the reach of the red fox, the arms were too long for the short trunk of the cat.
    'factor': (0.92, 0.78),
    'slim': (0.85, 0.85),
    'cut': {'shoulder': 0.0, 'tilt': 0.0, 'wrist': 0.1},
    'zone': {'x': 0.07, 'radius': 0.08},
    'gap': 0.02,
    'upper': (0.45, 0.6, 0.75),
    'fore': 6,
    'texture': 512,
    'faces': 1200,
    'seam': {'x': 0.08, 'lean': 0.1, 'low': 0.45, 'reach': 0.06, 'edge': 0.6, 'armpit': 0.6,
             'lift': -0.004, 'rings': (0.15, 0.45), 'ruled': 1, 'ramp': 10, 'round': 3,
             'wrap': 0.012},
    # With the shorter arms of factor 1 and the share 0.2, the upper ring of each upper arm narrowed
    # to 0.66 of its bind width at rest (0.73 before), and with 0.35 the right arm twisted more.
    'anchor': {'share': 0.1, 'reach': 0.05, 'crease': True},
}
va.ANIMALS['cat'] = CAT

RING_VERTS = va.RING_VERTS
PART = dict(va.PART, wall=4, armpit=5)

VIEWS = None


def look(s, name, objects=None, center=(0.15, 0.53, 0.05), scale=0.3,
         views=(('front', 0, 0), ('side', 90, 0), ('back', 180, 0), ('under', 60, -45),
                ('f35', 35, 10), ('b35', 145, 10))):
    """Renders check views of the left arm with the edges, when `--views` names a folder."""
    if VIEWS is None:
        return
    scene = bpy.context.scene
    engine = scene.render.engine
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'TEXTURE'
    scene.display.shading.show_backface_culling = False
    scene.render.resolution_x = scene.render.resolution_y = 700
    objects = objects or [s.mesh]
    hidden = [o for o in scene.objects if o.type == 'MESH' and o not in objects
              and not o.hide_render]
    for o in hidden:
        o.hide_render = True
    mat = bpy.data.materials.get('look-wire')
    if mat is None:
        black = bpy.data.images.new('look-black', 4, 4)
        black.pixels = [0.04, 0.04, 0.04, 1.0] * 16
        mat = bpy.data.materials.new('look-wire')
        mat.use_nodes = True
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = black
        mat.node_tree.nodes.active = tex
    wires = []
    for o in objects:
        w = o.copy()
        w.data = o.data.copy()
        w.data.materials.clear()
        w.data.materials.append(mat)
        for m in list(w.modifiers):
            w.modifiers.remove(m)
        mod = w.modifiers.new('wire', 'WIREFRAME')
        mod.thickness = s.units(0.0006)
        mod.use_replace = True
        scene.collection.objects.link(w)
        w.hide_render = False
        wires.append(w)
    cam = bpy.data.objects.get('look-cam') or bpy.data.objects.new(
        'look-cam', bpy.data.cameras.new('look-cam'))
    if cam.name not in scene.collection.objects:
        scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = s.units(scale)
    cam.data.clip_end = 100
    target = s.fr.point(center)
    for view, az, el in views:
        a, e = math.radians(az), math.radians(el)
        d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
        cam.location = target + d * 5
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = os.path.join(VIEWS, f'{name}-{view}.png')
        bpy.ops.render.render(write_still=True)
    for w in wires:
        bpy.data.objects.remove(w, do_unlink=True)
    for o in hidden:
        o.hide_render = False
    scene.render.engine = engine


def seam_plane(s, side):
    """Gives the plane of the seam of one side in Blender (a point and the unit normal toward the
    arm). It passes through |x| = `seam.x` at the height `seam.armpit`, and leans out by `seam.lean`
    units of x for each unit of height down, as the side of the trunk widens below the armpit."""
    seam = s.spec['seam']
    point = s.fr.point((seam['x'], seam['armpit'], 0.0), side)
    return point, Vector((side, 0.0, seam['lean'])).normalized()


def step_cut(s):
    """Keeps a hidden copy of the source, and cuts each arm along the seam and at the wrist.

    The seam cut is a Bisect with the plane |x| = `seam.x` on the faces above `seam.low` near the
    upper arm. The wrist cut is the Bisect of `violin_arms.cut_arm()`. The faces of the arm are the
    faces that the free forearm reaches with no step over a cut edge, beyond the plane of the seam
    above `seam.low`, and near the forearm line below it. A copy of these faces stays as the target
    of the Shrinkwrap (`<cat>-arm`), and the faces go.
    """
    mesh = s.mesh
    source = mesh.copy()
    source.data = mesh.data.copy()
    source.name = source.data.name = s.animal + '-source'
    bpy.context.scene.collection.objects.link(source)
    source.hide_render = True
    s.source = source
    seam = s.spec['seam']
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(mesh.data)
    part = bm.verts.layers.int.get('arm_part') or bm.verts.layers.int.new('arm_part')
    bm.verts.layers.int.get('arm_spoke') or bm.verts.layers.int.new('arm_spoke')
    zone = bm.faces.layers.int.get('arm_zone') or bm.faces.layers.int.new('arm_zone')
    out = {}
    for side in (1, -1):
        off = 0 if side > 0 else 10
        line = va.arm_line(s, side)
        a, e, w, t = line
        # The wrist cut.
        point, normal = va.cut_planes(s, line, side)[1]
        faces, _ = va.ring_faces(s, bm, line, side, point, normal)
        edges = {x for f in faces for x in f.edges}
        verts = {p for f in faces for p in f.verts}
        res = bmesh.ops.bisect_plane(bm, geom=list(verts) + list(edges) + faces, plane_co=point,
                                     plane_no=normal, dist=1e-6)
        wrist = {x for x in res['geom_cut'] if isinstance(x, bmesh.types.BMEdge)}
        for x in wrist:
            for p in x.verts:
                p[part] = PART['wrist'] + off
        # The seam cut.
        plane_co, plane_no = seam_plane(s, side)
        low = s.fr.floor + s.units(seam['low'])
        reach = s.units(0.14)
        near = [f for f in bm.faces if f.calc_center_median().z > low
                and va.seg_distance(f.calc_center_median(), a, e) < reach
                and min((p.co - plane_co).dot(plane_no) for p in f.verts) < 0
                < max((p.co - plane_co).dot(plane_no) for p in f.verts)]
        edges = {x for f in near for x in f.edges}
        verts = {p for f in near for p in f.verts}
        res = bmesh.ops.bisect_plane(bm, geom=list(verts) + list(edges) + near,
                                     plane_co=plane_co, plane_no=plane_no, dist=1e-6)
        seam_edges = {x for x in res['geom_cut'] if isinstance(x, bmesh.types.BMEdge)}
        # The faces of the arm.
        fore = s.units(seam['reach'])
        under = seam.get('under')

        def inside(f):
            c = f.calc_center_median()
            if (c - plane_co).dot(plane_no) <= 0:
                return False
            if c.z > low:
                return va.seg_distance(c, a, e) < reach or va.seg_distance(c, e, w) < fore
            if under:
                depth = seam['low'] - (c.z - s.fr.floor) / s.fr.height
                if c.x * side < s.units(under['x'] + under['lean'] * depth):
                    return False
            return va.seg_distance(c, e, w) < fore or va.seg_distance(c, w, t) < fore
        mid = e.lerp(w, 0.5)
        seed = min(bm.faces, key=lambda f: (f.calc_center_median() - mid).length)
        arm, stack = set(), [seed]
        stop = wrist | seam_edges
        while stack:
            f = stack.pop()
            if f in arm or not inside(f):
                continue
            arm.add(f)
            stack += [g for x in f.edges if x not in stop for g in x.link_faces]
        if len(arm) > s.spec['faces']:
            raise RuntimeError('The arm faces reach too far: %d faces.' % len(arm))
        for f in bm.faces:
            if f in arm:
                f[zone] = 1 if side > 0 else 2
        out[side] = len(arm)
    bmesh.update_edit_mesh(mesh.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    # The copy of the arm faces, the target of the Shrinkwrap and of the bake.
    target = mesh.copy()
    target.data = mesh.data.copy()
    target.name = target.data.name = s.animal + '-arm'
    bpy.context.scene.collection.objects.link(target)
    bm = bmesh.new()
    bm.from_mesh(target.data)
    zone_t = bm.faces.layers.int['arm_zone']
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f[zone_t] == 0], context='FACES')
    bm.to_mesh(target.data)
    bm.free()
    target.hide_render = True
    s.arm = target
    look(s, '1-arm-faces', [target])
    # Delete Faces.
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(mesh.data)
    zone = bm.faces.layers.int['arm_zone']
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f[zone] > 0], context='FACES')
    bmesh.update_edit_mesh(mesh.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    look(s, '2-cut', [mesh])
    return out


def walk(edges):
    """Orders the vertices of a closed loop of edges."""
    links = {}
    for x in edges:
        a, b = x.verts
        links.setdefault(a, []).append(b)
        links.setdefault(b, []).append(a)
    start = next(iter(links))
    order, prev = [start], None
    while True:
        cur = order[-1]
        nxt = next(p for p in links[cur] if p is not prev)
        if nxt is start:
            return order
        prev = cur
        order.append(nxt)


def hole(s, bm, side):
    """Gives the ordered vertices of the hole of the seam of one side: the longest open loop on
    that side near the upper arm (within `seam.hole` units, 0.16 by default), with no vertex of
    the wrist cut."""
    a, e, _, _ = va.arm_line(s, side)
    reach = s.units(s.spec['seam'].get('hole', 0.16))
    part = bm.verts.layers.int['arm_part']
    wrist = PART['wrist'] + (0 if side > 0 else 10)
    edges = [x for x in bm.edges if x.is_boundary
             and all(p.co.x * side > 0 and va.seg_distance(p.co, a, e) < reach
                     and p[part] != wrist for p in x.verts)]
    loops = va.edge_loops(edges)
    return walk(max(loops, key=len))


def step_wall(s):
    """Splits each hole into the top arc and the lower run at the height `seam.armpit`, draws the
    armpit line across the plane of the seam, and fills the side wall of the trunk under the arm.

    Bisect gives a vertex where the hole crosses the height in front (F) and at the back (B). The
    armpit line is a straight run of new vertices from B to F on the plane. Fill (Beauty) makes the
    wall from the lower run and the armpit line, with the normals out of the trunk.
    """
    mesh, seam = s.mesh, s.spec['seam']
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(mesh.data)
    part = bm.verts.layers.int['arm_part']
    zone = bm.faces.layers.int['arm_zone']
    height = s.fr.floor + s.units(seam['edge'])
    rise = s.units(seam['armpit'] - seam['edge'])
    out = {}
    for side in (1, -1):
        off = 0 if side > 0 else 10
        plane_co, plane_no = seam_plane(s, side)
        loop = hole(s, bm, side)
        n = len(loop)
        crossings = []
        for k in range(n):
            p, q = loop[k], loop[(k + 1) % n]
            if (p.co.z - height) * (q.co.z - height) < 0:
                fac = (height - p.co.z) / (q.co.z - p.co.z)
                crossings.append((p, q, fac, -(p.co.y + (q.co.y - p.co.y) * fac)))
        crossings.sort(key=lambda c: c[3])
        made = []
        for p, q, fac, _ in (crossings[0], crossings[-1]):
            x = next(x for x in p.link_edges if x.other_vert(p) is q)
            _, v = bmesh.utils.edge_split(x, p, fac)
            made.append(v)
        back, front = made
        loop = hole(s, bm, side)
        k_front, k_back = loop.index(front), loop.index(back)
        # The two runs between F and B: the top arc holds the highest vertex.
        run1 = [loop[(k_front + i) % len(loop)]
                for i in range((k_back - k_front) % len(loop) + 1)]
        run2 = [loop[(k_back + i) % len(loop)]
                for i in range((k_front - k_back) % len(loop) + 1)]
        top, low = ((run1, run2) if max(p.co.z for p in run1) > max(p.co.z for p in run2)
                    else (run2, run1))
        for p in top:
            p[part] = PART['shoulder'] + off
        for p in low:
            p[part] = PART['wall'] + off
        # The armpit line from B to F.
        step = sum((top[i + 1].co - top[i].co).length for i in range(len(top) - 1)) / (len(top) - 1)
        count = max(2, round(((front.co - back.co).length + 2 * rise) / step))
        line = [back]
        for i in range(1, count):
            # The arch of the armpit: `seam.armpit` high in the middle, on the plane of the seam.
            up = rise * math.sin(math.pi * i / count)
            v = bm.verts.new(back.co.lerp(front.co, i / count)
                             + Vector((-side * seam['lean'] * up, 0.0, up)))
            v[part] = PART['armpit'] + off
            line.append(v)
        line.append(front)
        back[part] = front[part] = PART['armpit'] + off
        new_edges = [bm.edges.new((line[i], line[i + 1])) for i in range(len(line) - 1)]
        low_edges = [x for i in range(len(low) - 1) for x in low[i].link_edges
                     if x.other_vert(low[i]) is low[i + 1]]
        res = bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False,
                                      edges=low_edges + new_edges, normal=plane_no)
        wall = [f for f in res['geom'] if isinstance(f, bmesh.types.BMFace)]
        for f in wall:
            f[zone] = 3
            f.smooth = True
            f.normal_update()
            if f.normal.dot(plane_no) < 0:
                f.normal_flip()
        out[side] = (len(top), len(low), count, len(wall))
    bmesh.update_edit_mesh(mesh.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    look(s, '3-wall', [mesh])
    return out


def section(bm, point, axis, reach):
    """Gives the points where the edges of a mesh cross a plane, within `reach` of `point`."""
    pts = []
    for x in bm.edges:
        a, b = x.verts
        da, db = (a.co - point).dot(axis), (b.co - point).dot(axis)
        if da * db < 0:
            p = a.co.lerp(b.co, da / (da - db))
            if (p - point).length < reach:
                pts.append(p)
    return pts


def ring_frame(axis):
    """Gives the two directions of a ring plane: up across the axis, and the third direction."""
    up = Vector((0, 0, 1))
    ref = (up - axis * axis.dot(up)).normalized()
    return ref, axis.cross(ref)


def fit_ring(pts, point, axis):
    """Fits the circle of a ring to the section points of the source arm in its plane.

    A section that goes round the arm gives its mean center and mean radius, as
    `violin_arms.build_tube()`. A section of the upper arm is an arc, because the inner side of the
    arm lies in the trunk: a least squares circle through the arc gives the center and the radius.
    Gives the center, the radius, and True for an arc.
    """
    import numpy as np
    ref, across = ring_frame(axis)
    uv = np.array([[(p - point).dot(ref), (p - point).dot(across)] for p in pts])
    angles = np.sort(np.arctan2(uv[:, 1] - uv[:, 1].mean(), uv[:, 0] - uv[:, 0].mean()))
    gaps = np.diff(np.concatenate([angles, angles[:1] + 2 * np.pi]))
    if gaps.max() < math.radians(70):
        center = sum(pts, Vector()) / len(pts)
        return center, sum((p - center).length for p in pts) / len(pts), False
    m = np.column_stack([uv, np.ones(len(uv))])
    sol = np.linalg.lstsq(m, -(uv ** 2).sum(axis=1), rcond=None)[0]
    cu, cv = -sol[0] / 2, -sol[1] / 2
    radius = math.sqrt(max(cu * cu + cv * cv - sol[2], 0.0))
    return point + ref * cu + across * cv, radius, True


def flatten(s, side, p, axis, keep=False):
    """Puts a ring vertex that lies within `seam.lift` of the plane of the seam, or beyond it in
    the trunk, onto the plane at the gap `seam.lift`, along the ring plane. With `keep`, the vertex
    goes onto the plane from each side. Gives True on a move."""
    plane_co, plane_no = seam_plane(s, side)
    lift = s.units(s.spec['seam']['lift'])
    h = (p.co - plane_co).dot(plane_no)
    if h >= lift and not keep:
        return False
    d = (plane_no - axis * axis.dot(plane_no)).normalized()
    p.co += d * ((lift - h) / d.dot(plane_no))
    return True


def resample(points, count, start):
    """Gives `count` points at equal steps along a closed polyline, from the point `start`."""
    pts = points[start:] + points[:start]
    lengths = [(pts[(i + 1) % len(pts)] - pts[i]).length for i in range(len(pts))]
    total = sum(lengths)
    out, i, run = [], 0, 0.0
    for k in range(count):
        goal = total * k / count
        while run + lengths[i] < goal:
            run += lengths[i]
            i += 1
        out.append(pts[i].lerp(pts[(i + 1) % len(pts)], (goal - run) / lengths[i]))
    return out


def step_tube(s):
    """Models the quad tube of each arm, wraps it onto the source arm, and bridges it to the
    socket (the top arc and the armpit line) and to the paw.

    The rings of `violin_arms.arm_stations()` stand at a right angle to the bones (`fit_ring()`).
    `seam.rings` rings between the socket and the first ring blend from the socket to that ring,
    so that the shoulder has rings too. Shrinkwrap (Project, both directions, with a limit) puts
    the outer vertices on the source arm, and the vertices of the inner side stay on the plane of
    the seam (`flatten()`). Bridge Edge Loops joins the socket to the first ring and the last ring
    to the paw, with the twist of the shortest edges (`violin_arms.bridge_twist()`).
    """
    mesh, seam = s.mesh, s.spec['seam']
    src = bmesh.new()
    src.from_mesh(s.arm.data)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(mesh.data)
    part = bm.verts.layers.int['arm_part']
    spoke = bm.verts.layers.int['arm_spoke']
    flat = bm.verts.layers.int.get('arm_flat') or bm.verts.layers.int.new('arm_flat')
    index = bm.verts.layers.int.get('arm_ring') or bm.verts.layers.int.new('arm_ring')
    out = {}
    s.axes = {}
    for side in (1, -1):
        off = 0 if side > 0 else 10
        line = va.arm_line(s, side)
        stations = va.arm_stations(s, line)
        fits, rings = [], []
        for point, axis in stations:
            pts = [p for p in section(src, point, axis, s.units(0.09))
                   if p.x * side > 0]
            center, radius, arc = fit_ring(pts, point, axis)
            fits.append((round((center - point).length / s.fr.height, 4),
                         round(radius / s.fr.height, 4), arc))
            ref, across = ring_frame(axis)
            ring = []
            for k in range(RING_VERTS):
                a = 2 * math.pi * k / RING_VERTS
                p = bm.verts.new(center + (ref * math.cos(a) + across * math.sin(a)) * radius)
                p[part] = PART['tube'] + off
                p[spoke] = k
                ring.append(p)
            rings.append((ring, axis))
        # The rings of the shoulder: from the socket to the first ring.
        socket = [p for p in hole(s, bm, side)]
        first, axis0 = rings[0]
        ref, across = ring_frame(axis0)
        center0 = sum((p.co for p in first), Vector()) / RING_VERTS
        top = max(range(len(socket)), key=lambda i: (socket[i].co - center0).dot(ref))
        nxt = socket[(top + 1) % len(socket)].co - socket[top].co
        if nxt.dot(across) < 0:
            socket = socket[::-1]
            top = len(socket) - 1 - top
        blend = resample([p.co.copy() for p in socket], RING_VERTS, top)
        shoulder = []
        for t in seam['rings']:
            ring = []
            for j in range(RING_VERTS):
                p = bm.verts.new(blend[j].lerp(first[j].co, t))
                p[part] = PART['tube'] + off
                p[spoke] = j
                ring.append(p)
            shoulder.append((ring, axis0))
        rings = shoulder + rings
        s.axes[side] = [axis for _, axis in rings]
        for k, (ring, axis) in enumerate(rings):
            for p in ring:
                p[flat] = 1 if flatten(s, side, p, axis) else 0
                p[index] = k
        for (r0, _), (r1, _) in zip(rings, rings[1:]):
            for k in range(RING_VERTS):
                j = (k + 1) % RING_VERTS
                bm.faces.new((r0[k], r0[j], r1[j], r1[k])).smooth = True
        out[side] = fits
    src.free()
    bmesh.update_edit_mesh(mesh.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    look(s, '4-tube', [mesh])
    return out


def reflatten(s, bm):
    """Puts the inner side of each tube back onto the plane of the seam after a move: the vertices
    of the inner side from each side, and the other vertices of the tube from the trunk only."""
    part = bm.verts.layers.int['arm_part']
    index = bm.verts.layers.int['arm_ring']
    flat = bm.verts.layers.int['arm_flat']
    moved = 0
    for side, off in ((1, 0), (-1, 10)):
        for p in bm.verts:
            if p[part] == PART['tube'] + off:
                moved += flatten(s, side, p, s.axes[side][p[index]], keep=p[flat] == 1)
    return moved


def step_wrap(s):
    """Puts the outer vertices of each tube on the surface of the source arm with a Shrinkwrap
    modifier (Project, both directions, with the limit `seam.wrap`), and the inner side back on the
    plane of the seam. The limit keeps a vertex of the inner side, which no surface of the source
    arm faces, in its ring."""
    mesh = s.mesh
    attr = mesh.data.attributes
    part, flat = attr['arm_part'].data, attr['arm_flat'].data
    group = mesh.vertex_groups.new(name='retopo')
    group.add([i for i in range(len(part)) if part[i].value in (PART['tube'], PART['tube'] + 10)
               and flat[i].value == 0], 1.0, 'REPLACE')
    mod = mesh.modifiers.new('wrap', 'SHRINKWRAP')
    mod.target = s.arm
    mod.wrap_method = 'PROJECT'
    mod.use_project_x = mod.use_project_y = mod.use_project_z = False
    mod.use_negative_direction = mod.use_positive_direction = True
    mod.cull_face = 'OFF'
    mod.project_limit = s.units(s.spec['seam']['wrap'])
    mod.vertex_group = group.name
    va.apply_modifier(mesh, mod)
    mesh.vertex_groups.remove(mesh.vertex_groups['retopo'])
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(mesh.data)
    moved = reflatten(s, bm)
    bmesh.update_edit_mesh(mesh.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    look(s, '5-wrap', [mesh])
    return moved


def step_bridge(s):
    """Joins the first ring of each tube to the socket (the top arc and the armpit line) and the
    last ring to the paw with Bridge Edge Loops, with the twist of the shortest edges."""
    mesh = s.mesh
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(mesh.data)
    part = bm.verts.layers.int['arm_part']
    made = 0
    for side, off in ((1, 0), (-1, 10)):
        tube = PART['tube'] + off
        ends = va.edge_loops([x for x in bm.edges if x.is_boundary
                              and all(p[part] == tube for p in x.verts)])
        socket_codes = (PART['shoulder'] + off, PART['armpit'] + off)
        for codes in (socket_codes, (PART['wrist'] + off,)):
            loop = [x for x in bm.edges if x.is_boundary and all(p[part] in codes for p in x.verts)]
            center = va.loop_center(loop)
            ring = min(ends, key=lambda r: (va.loop_center(r) - center).length)
            res = bmesh.ops.bridge_loops(bm, edges=loop + ring,
                                         twist_offset=va.bridge_twist(bm, loop + ring))
            for f in res['faces']:
                f.smooth = True
            made += len(res['faces'])
    bmesh.update_edit_mesh(mesh.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    return made


def step_beautify(s):
    """Runs Beautify Faces on the bridge triangles of each arm (`violin_arms.step_beautify()`)."""
    out = va.step_beautify(s)
    look(s, '6-bridge', [s.mesh])
    look(s, '6-shoulder', [s.mesh], center=(0.1, 0.63, 0.05), scale=0.13,
         views=(('side', 90, 0), ('b35', 145, 10), ('back', 180, 0), ('top', 120, 50)))
    return out


TUBE_FACES = va.arm_faces


def new_faces(bm, part):
    """Gives the new faces of the arms (the tubes and the bridges) and of the side walls, which
    take the material, the UV layout, and the bake of `violin_arms.step_uv()` and
    `violin_arms.step_bake()`."""
    zone = bm.faces.layers.int['arm_zone']
    return TUBE_FACES(bm, part) + [f for f in bm.faces if f[zone] == 3]


va.arm_faces = new_faces


def arm_verts(s, bm, part, off):
    """Gives the vertices of one arm: the tube, the wrist loop, and the paw, which the tube reaches
    with no step over the socket (`violin_arms.arm_verts()` for the cat)."""
    stop = {PART[k] + off for k in ('shoulder', 'armpit', 'wall')}
    arm, stack = set(), [p for p in bm.verts if p[part] == PART['tube'] + off]
    while stack:
        p = stack.pop()
        if p in arm:
            continue
        arm.add(p)
        if p[part] not in stop:
            stack += [x.other_vert(p) for x in p.link_edges]
    return {p for p in arm if p[part] not in stop}


va.arm_verts = arm_verts


def step_uv(s):
    """Gives the new faces their material and UV layout (`violin_arms.step_uv()`)."""
    return va.step_uv(s)


def step_bake(s):
    """Bakes the fur color of the source arms onto the new faces (`violin_arms.step_bake()`)."""
    return va.step_bake(s)


def step_shape(s):
    """Gives the arms the cross-section and the length of the app body
    (`violin_arms.step_shape()`), then puts the inner side back onto the plane of the seam."""
    out = va.step_shape(s)
    bm = bmesh.new()
    bm.from_mesh(s.mesh.data)
    moved = reflatten(s, bm)
    rounded = round_corners(s, bm)
    bm.to_mesh(s.mesh.data)
    bm.free()
    s.mesh.data.update()
    return out, moved, rounded


def round_corners(s, bm):
    """Rounds the two edges of the flat inner side of each tube (Smooth Vertices, `seam.round`
    times): the last vertex of each ring on the round side and the first on the flat side. A
    sharp edge there folded in the poses and showed as a dark slit at the back of the arm."""
    part = bm.verts.layers.int['arm_part']
    flat = bm.verts.layers.int['arm_flat']
    index = bm.verts.layers.int['arm_ring']
    tubes = (PART['tube'], PART['tube'] + 10)
    corner = set()
    for p in bm.verts:
        if p[part] not in tubes:
            continue
        for x in p.link_edges:
            q = x.other_vert(p)
            if q[part] in tubes and q[index] == p[index] and q[flat] != p[flat]:
                corner.update((p, q))
    for _ in range(s.spec['seam']['round']):
        bmesh.ops.smooth_vert(bm, verts=list(corner), factor=0.5, use_axis_x=True,
                              use_axis_y=True, use_axis_z=True)
    return len(corner)


def step_inner_color(s):
    """Gives the side walls and the flat inner side of each upper arm one fur color of the trunk.

    No surface of the source lies there, so the bake finds no color. Each corner of these faces
    takes the UV middle of one trunk face beside the side wall: the face whose texture color is
    nearest to the median color of the trunk faces beside the wall.
    """
    import numpy as np
    mesh = s.mesh
    data = mesh.data
    part = [a.value for a in data.attributes['arm_part'].data]
    flat = [a.value for a in data.attributes['arm_flat'].data]
    zone = [a.value for a in data.attributes['arm_zone'].data]
    uv = data.uv_layers.active.data
    bsdf = next(n for n in data.materials[0].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    image = bsdf.inputs['Base Color'].links[0].from_node.image
    width, height = image.size
    pixels = np.empty(width * height * 4, np.float32)
    image.pixels.foreach_get(pixels)
    pixels = pixels.reshape(height, width, 4)
    walls = {PART['wall'], PART['wall'] + 10}
    beside, inner = [], []
    for poly in data.polygons:
        codes = [part[v] for v in poly.vertices]
        if zone[poly.index] == 3 or (all(flat[v] for v in poly.vertices)
                                     and all(c in (PART['tube'], PART['tube'] + 10)
                                             for c in codes)):
            inner.append(poly)
        elif zone[poly.index] == 0 and any(c in walls for c in codes):
            beside.append(poly)

    def middle(poly):
        return np.mean([uv[li].uv[:] for li in poly.loop_indices], axis=0)

    colors = []
    for poly in beside:
        u, v = middle(poly)
        colors.append(pixels[min(int(v * height), height - 1), min(int(u * width), width - 1), :3])
    colors = np.array(colors)
    median = np.median(colors, axis=0)
    pick = beside[int(np.argmin(np.linalg.norm(colors - median, axis=1)))]
    at = middle(pick)
    for poly in inner:
        for li in poly.loop_indices:
            uv[li].uv = at
    look(s, '7-colors', [mesh])
    return len(inner), [round(float(c), 3) for c in median]


def step_paint(s):
    """Paints the fixes with the Weight Paint tools, in this order. The places are in the units of
    the studio.

    1. The trunk, the side walls, the socket, and the first `seam.ruled` rings of the shoulder:
       Remove From Group of the arm bones and the clavicles. Then each of these vertices hangs
       only on the bones of `paintedLower`, so `pnpm rig-mesh` gives it the rule weights of the
       config, as on the mesh of the user: the shoulder turns with the rules of `main`.
    2. The other rings of the tube, and the paw: Remove From Group of the trunk bones and the
       clavicles, so that the arm does not drag on the trunk.
    3. The skin of the armpit: a share of the chest on the tube near the side walls (`anchor()`).
    4. The tube: Smooth, `seam.ramp` times, so that the weights change gradually along the arm.
    """
    mesh, seam = s.mesh, s.spec['seam']
    data = mesh.data
    part = [a.value for a in data.attributes['arm_part'].data]
    ring = [a.value for a in data.attributes['arm_ring'].data]
    bm = bmesh.new()
    bm.from_mesh(data)
    layer = bm.verts.layers.int['arm_part']
    island = {p.index for side, off in ((1, 0), (-1, 10)) for p in arm_verts(s, bm, layer, off)}
    bm.free()
    tubes = (PART['tube'], PART['tube'] + 10)
    ruled = seam['ruled']
    arms = va.arm_groups() + [f'{b}_{side}' for b in ('hand', 'fingers') for side in 'LR']
    clavicles = ['clavicle_L', 'clavicle_R']
    trunk = ['hips', 'spine', 'spine1', 'chest', 'neck', 'head'] + clavicles

    def rules(p):
        return p.index not in island or (part[p.index] in tubes and ring[p.index] < ruled)

    va.paint_mode(mesh, rules)
    va.remove_from(mesh, arms + clavicles)
    bpy.ops.object.mode_set(mode='OBJECT')
    # A vertex that hung only on these bones takes the chest (Assign), so that it has a weight.
    deform = {g.index for g in mesh.vertex_groups if g.name in va.rig_mesh()['BONES']
              or g.name in arms}
    empty = [p.index for p in data.vertices if rules(p)
             and not any(g.group in deform and g.weight > 0 for g in p.groups)]
    mesh.vertex_groups['chest'].add(empty, 1.0, 'REPLACE')
    va.paint_mode(mesh, rules)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='BONE_DEFORM', lock_active=False)
    va.paint_mode(mesh, lambda p: p.index in island and not rules(p))
    va.remove_from(mesh, trunk)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='BONE_DEFORM', lock_active=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    mesh.data.use_paint_mask_vertex = False
    anchored = anchor(s, island)
    va.paint_mode(mesh, lambda p: p.index in island and not rules(p))
    bpy.ops.object.vertex_group_smooth(group_select_mode='BONE_DEFORM', factor=0.5,
                                       repeat=seam['ramp'])
    va.limit_and_normalize()
    bpy.ops.object.mode_set(mode='OBJECT')
    mesh.data.use_paint_mask_vertex = False
    return len(island), anchored


def anchor(s, island):
    """Gives the tube vertices near each side wall a share of the chest weight (fix 5).

    The upper arm of the user mesh lies against the trunk down to the elbow, so a turn of the arm
    toward the trunk takes the inner side and the back of the tube into the trunk. A Vertex Weight
    Proximity modifier gives each tube vertex a weight by its distance to the side walls: `share`
    on the wall, falling to 0 at the distance `reach` (units). A Vertex Weight Mix modifier adds it
    to the chest, and Normalize All takes it from the arm bones. Thus the skin of the armpit
    follows the trunk in part, as a real armpit does. With `rings`, only the tube vertices of the
    first `rings` rings take the share: on the short arm of the hippo, the forearm lies within
    `reach` of the side wall too.
    """
    mesh, rule = s.mesh, s.spec['anchor']
    if rule['share'] <= 0:
        return 0
    wall = mesh.copy()
    wall.data = mesh.data.copy()
    wall.name = wall.data.name = s.animal + '-walls'
    bpy.context.scene.collection.objects.link(wall)
    for g in list(wall.vertex_groups):
        wall.vertex_groups.remove(g)
    for m in list(wall.modifiers):
        wall.modifiers.remove(m)
    wall.parent = None
    bm = bmesh.new()
    bm.from_mesh(wall.data)
    zone = bm.faces.layers.int['arm_zone']
    part_t = bm.verts.layers.int['arm_part']
    walls = {PART['wall'], PART['wall'] + 10}

    def target(f):
        # The side wall, and with `crease` also the trunk faces along the seam below the socket.
        return f[zone] == 3 or (rule['crease'] and any(p[part_t] in walls for p in f.verts))
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not target(f)], context='FACES')
    bm.to_mesh(wall.data)
    bm.free()
    wall.matrix_world = mesh.matrix_world
    part = [a.value for a in mesh.data.attributes['arm_part'].data]
    ring = [a.value for a in mesh.data.attributes['arm_ring'].data]
    tubes = (PART['tube'], PART['tube'] + 10)
    rings = rule.get('rings', len(s.axes[1]))
    tube = [i for i in island if part[i] in tubes and ring[i] < rings]
    group = mesh.vertex_groups.new(name='anchor')
    group.add(tube, 1.0, 'REPLACE')
    bpy.context.view_layer.objects.active = mesh
    mod = mesh.modifiers.new('anchor', 'VERTEX_WEIGHT_PROXIMITY')
    mod.vertex_group = 'anchor'
    mod.target = wall
    mod.proximity_mode = 'GEOMETRY'
    mod.proximity_geometry = {'FACE'}
    mod.min_dist = s.units(rule['reach'])
    mod.max_dist = 0.0
    mod.falloff_type = 'SMOOTH'
    va.apply_modifier(mesh, mod)
    mix = mesh.modifiers.new('anchor-mix', 'VERTEX_WEIGHT_MIX')
    mix.vertex_group_a = 'chest'
    mix.vertex_group_b = 'anchor'
    mix.mix_mode = 'ADD'
    mix.mix_set = 'B'
    mix.mask_constant = rule['share']
    va.apply_modifier(mesh, mix)
    mesh.vertex_groups.remove(mesh.vertex_groups['anchor'])
    bpy.data.objects.remove(wall, do_unlink=True)
    va.paint_mode(mesh, lambda p: p.index in island)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='BONE_DEFORM', lock_active=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    mesh.data.use_paint_mask_vertex = False
    return len(tube)


def step_weights(s):
    """Writes the weights for `paintedWeights` of the config (`violin_arms.step_weights()`). With
    `--views`, it also writes the part codes of each vertex (`cat-parts.json`) for the probes."""
    if VIEWS is not None:
        import json
        data = s.mesh.data
        parts = {name: [a.value for a in data.attributes[name].data]
                 for name in ('arm_part', 'arm_flat', 'arm_ring')}
        with open(os.path.join(VIEWS, 'cat-parts.json'), 'w') as f:
            json.dump(parts, f)
    return va.step_weights(s)


STEPS = (va.import_mesh, step_cut, step_wall, step_tube, step_wrap, step_bridge, step_beautify,
         step_uv, step_bake, va.step_normals, step_shape, va.step_atlas, step_inner_color,
         va.step_export, va.step_skeleton, va.step_bind, step_paint, step_weights)


def main():
    """Runs the steps and writes the source mesh and the weights into the out dir (the folder of
    the cat in `assets/models/` by default)."""
    global VIEWS
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if '--views' in argv:
        k = argv.index('--views')
        VIEWS = os.path.abspath(argv[k + 1])
        os.makedirs(VIEWS, exist_ok=True)
        del argv[k:k + 2]
    out_dir = os.path.abspath(argv[0]) if argv else None
    va.clear_scene()
    s = va.Session('cat', out_dir)
    for step in STEPS:
        print('%s: %s' % (step.__name__, step(s)))


if __name__ == '__main__':
    main()
