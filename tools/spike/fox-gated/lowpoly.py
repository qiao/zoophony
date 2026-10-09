"""Makes the low-poly fox from the forms: flat triangles and one palette color for each face.

    blender -b --factory-startup --python tools/spike/fox-gated/lowpoly.py -- \
        --forms <forms/fox.blend> --sheet docs/reference/fox-views.png \
        --matte <fox-matte.png> --out <dir> [--triangles 2400] [--planes 5] \
        [--strength 0.75] [--fox-field <fox-field.npy>] [--colors rules|sheet]

1. The isotropic remesh of `facets.py` makes about `--triangles` triangles of almost even size
   on the forms, with smaller triangles on the parts of `DENSITY` and at the `JOINTS`. Then
   the planar pass groups about `--planes` faces into each plane and moves the vertices toward
   the planes by `--strength` (`remesh`). The faces then read as sculpted planes, and the
   borders of the planes as creases.
2. Each face gets a palette role (`ROLES`):
   - `rules` (the default): from the nearest part of `fox_parts.PARTS` and the place on it,
     for example the white inner ear and the brown paw (`rule_roles`).
   - `sheet`: from the color of the sheet at the face center, in the view that sees the face
     best (`sample_roles`). The colors land on the wrong parts where the mesh and the sheet
     differ (for example the white inner ear of the sheet on the cranium), so this mode is
     only for comparison.
   A face with no role takes the most common role of its neighbors, and one majority pass
   removes single faces of a role.
3. The eyes go on the face where the front view shows them (`add_eyes`).

The script writes `<dir>/lowpoly.blend` with the mesh `FoxLow`, the color attribute `Col` (one
color for each face corner), and the face attribute `eye`.
"""

import argparse
import colorsys
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import sheet_camera  # noqa: E402

#: The palette roles and their colors in sRGB. The fur colors are near the albedo of the sheet.
ROLES = {
    'orange': (0.86, 0.43, 0.20),
    'white': (0.93, 0.87, 0.80),
    'brown': (0.36, 0.21, 0.15),
    'black': (0.13, 0.10, 0.09),
    'sclera': (1.0, 0.98, 0.95),
    'iris': (0.42, 0.22, 0.10),
    'pupil': (0.05, 0.04, 0.035),
    'shine': (1.0, 1.0, 1.0),
}

#: The places of the eyes on the front view, in sheet pixels (centers of the irises).
EYES = [(365.0, 370.0), (478.0, 355.0)]

#: The layers of an eye: (role, radius, lift above the face, (side, up) shift, corners).
#: Meters. The sheet eyes are about 75 mm wide and 60 mm tall, with an iris of about 45 mm.
#: As on the sheet, the iris fills most of the eye and looks to the side of the violin (+x), so
#: the white shows only at the inner corner.
EYE_LAYERS = [
    ('sclera', 0.038, 0.003, (0.0, 0.0), 8),
    ('iris', 0.032, 0.005, (0.006, -0.002), 8),
    ('pupil', 0.018, 0.007, (0.008, -0.003), 6),
    ('shine', 0.009, 0.009, (-0.002, 0.010), 4),
]

#: The shape of an eye: the scale of a disc across and up. The sheet eyes are almonds.
EYE_SHAPE = (1.3, 0.85)

#: The upper lid of an eye: outer radius, inner radius, and lift, in meters.
EYE_LID = (0.043, 0.036, 0.010)

#: The white inner ear stops at this part of the ear radius, so that an orange rim stays
#: around it, as on the sheet.
EAR_RIM = 0.6

#: The radius of the black nose around the tip of the muzzle part, in meters. The sheet nose
#: is about 40 mm wide.
NOSE_RADIUS = 0.04

#: The height of the top of the dark brown socks, in meters. The sheet shows orange fur from
#: the knee down to about 0.30 m.
SOCK_TOP = 0.30

#: The scale of the target edge length for each part (the first name prefix that matches).
#: Smaller triangles go to the parts with a sharp silhouette (ears, muzzle, paws, feet, tail
#: tip), and larger ones to the broad planes of the chest, the hips, and the thighs.
DENSITY = {
    'ear': 0.85, 'muzzle': 0.85, 'face': 0.92, 'tuft': 0.88, 'cheeks': 0.94, 'cranium': 1.0,
    'dome': 1.0, 'paw': 0.88, 'foot': 0.88, 'forearm': 0.94, 'shin': 0.94, 'upper_arm': 0.96,
    'neck': 1.0, 'chest': 1.02, 'pelvis': 1.02, 'thigh': 1.02, 'tail_end': 0.96,
    'tail_base': 1.02,
}

#: The scale of the faces for each plane in each region of `region_of_part`. The sheet has a few
#: large planes on the chest and the belly.
PLANE_SCALE = {'body': 1.6}

#: The joints that get smaller triangles, so that they bend well: (center, radius, scale of
#: the edge length at the center). The centers are the bone joints of `rig.py`.
JOINTS = [
    ((-0.21, -0.06, 0.645), 0.06, 0.9), ((0.245, -0.19, 0.68), 0.06, 0.9),
    ((-0.04, -0.28, 0.75), 0.05, 0.9), ((0.37, -0.37, 0.79), 0.05, 0.9),
    ((-0.14, -0.05, 0.77), 0.07, 0.9), ((0.14, -0.05, 0.77), 0.07, 0.9),
    ((-0.13, -0.28, 0.42), 0.07, 0.9), ((0.13, -0.25, 0.42), 0.07, 0.9),
    ((-0.05, -0.24, 0.15), 0.05, 0.9), ((0.075, -0.24, 0.15), 0.05, 0.9),
    ((0.0, -0.05, 0.82), 0.08, 0.9), ((0.0, -0.07, 0.95), 0.08, 0.9),
]


def args():
    """Reads the arguments after `--`."""
    p = argparse.ArgumentParser()
    p.add_argument('--forms', required=True)
    p.add_argument('--sheet', required=True)
    p.add_argument('--matte', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--triangles', type=int, default=2400)
    p.add_argument('--colors', choices=['rules', 'sheet'], default='rules')
    p.add_argument('--planes', type=float, default=5.0)
    p.add_argument('--strength', type=float, default=0.75)
    p.add_argument('--fox-field', default='')
    return p.parse_args(sys.argv[sys.argv.index('--') + 1:])


def load_image(path):
    """Loads a PNG file as a float array (rows from the top, RGBA in 0 to 1)."""
    img = bpy.data.images.load(os.path.abspath(path), check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)[::-1]


def size_grid(scale):
    """Calculates the target edge length scale on a grid of 2 cm over the box of the fox.

    The scale of a point is the value of its nearest part in `DENSITY` (1 for a part that is not
    in the table), times a smaller value near each joint of `JOINTS`.
    """
    import fox_parts

    points, lo = fox_parts.grid_points(0.02)
    flat = points.reshape(-1, 3)
    fields = np.stack([fox_parts.part_sdf(flat, p) for p in fox_parts.PARTS], -1)
    names = [p[0] for p in fox_parts.PARTS]
    table = np.array([next((v for k, v in DENSITY.items() if n.startswith(k)), 1.0)
                      for n in names], np.float32)
    values = table[fields.argmin(-1)]
    for centre, radius, factor in JOINTS:
        d2 = ((flat - np.asarray(centre, np.float32)) ** 2).sum(-1) / radius ** 2
        values *= 1.0 - (1.0 - factor) * np.exp(-d2)
    return values.reshape(points.shape[:3]) * scale, lo


def region_of_part(name):
    """Gives the planar region of a part: a plane does not cross from one region to the next."""
    if name in ('cranium', 'dome', 'face', 'cheeks', 'muzzle') or name.startswith('tuft'):
        return 'head'
    if name in ('neck', 'chest', 'pelvis'):
        return 'body'
    side = name[-2:]
    if name.startswith(('upper_arm', 'forearm', 'paw')):
        return 'arm' + side
    if name.startswith(('shin', 'foot')):
        return 'shin' + side
    if name.startswith('tail'):
        return 'tail'
    return name


def nearest_parts(points):
    """Gives the name of the nearest part of `fox_parts.PARTS` for each point (n, 3)."""
    import fox_parts

    fields = np.stack([fox_parts.part_sdf(points, p) for p in fox_parts.PARTS], -1)
    return [fox_parts.PARTS[k][0] for k in fields.argmin(-1)]


def remesh(ob, triangles, planes, strength, fit):
    """Makes the low-poly surface: even triangles, then sculpted planes (`facets.py`).

    1. A collapse decimate reduces the forms to three times `triangles`. QuadriFlow of Blender
       5.2 refused the forms mesh ("needs to be manifold").
    2. The isotropic remesh makes about `triangles` triangles of almost even size on the forms.
       The edge length follows `DENSITY` and `JOINTS`.
    3. The planar pass groups about `planes` faces into each plane, inside the regions of
       `region_of_part`, and moves the vertices toward the planes by `strength`.
    4. With `fit` (the fox field of `matte_field.py` and the matte), the contour fit moves the
       outline of the front and the side view to the sheet (`fit_contour`): three passes
       before the planar pass, and one after it, because the planes cut thin tips again.
    """
    import facets

    fine = bmesh.new()
    fine.from_mesh(ob.data)
    bmesh.ops.triangulate(fine, faces=fine.faces)
    fine.faces.ensure_lookup_table()
    bvh = BVHTree.FromBMesh(fine)
    centres = np.array([f.calc_center_median()[:] for f in fine.faces], np.float32)
    areas = np.array([f.calc_area() for f in fine.faces], np.float32)
    grid, lo = size_grid(1.0)

    def lookup(points):
        """Gives the grid value at each point (n, 3), from the nearest grid point."""
        idx = np.rint((np.asarray(points, np.float32) - lo) / 0.02).astype(int)
        idx = np.clip(idx, 0, np.array(grid.shape) - 1)
        return grid[idx[:, 0], idx[:, 1], idx[:, 2]]

    s = lookup(centres)
    base = math.sqrt(float((areas / s ** 2).sum()) * 4.0 / (math.sqrt(3.0) * triangles))

    scale = [base]

    def size(p):
        """Gives the target edge length at the point `p`."""
        return scale[0] * float(lookup([p[:]])[0])

    bm = fine.copy()
    fine_mesh = bpy.data.meshes.new('FoxFine')
    fine.to_mesh(fine_mesh)
    fine.free()
    ob.data = fine_mesh
    mod = ob.modifiers.new('Decimate', 'DECIMATE')
    mod.ratio = 3.0 * triangles / len(bm.faces)
    bm.free()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    ob.modifiers.clear()
    ob.data = me
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    # The remesh ends with a little fewer triangles than the area formula gives. One short
    # run measures the count, and the edge length changes by the square root of the error.
    facets.isotropic_remesh(bm, bvh, size, iterations=4)
    scale[0] *= math.sqrt(len(bm.faces) / triangles)
    facets.isotropic_remesh(bm, bvh, size, iterations=6)
    print('remesh: triangles', len(bm.faces), 'edge', round(scale[0] * 1000, 1), 'mm')
    if fit:
        fit_contour(bm, *fit)
    if planes > 0 and strength > 0:
        bm.faces.ensure_lookup_table()
        names = nearest_parts(np.array([f.calc_center_median()[:] for f in bm.faces], np.float32))
        regions = [region_of_part(n) for n in names]
        keys = {r: i for i, r in enumerate(sorted(set(regions)))}
        sizes = {i: planes * PLANE_SCALE.get(r, 1.0) for r, i in keys.items()}
        label = facets.planar_facets(bm, sizes, strength, [keys[r] for r in regions])
        print('planes:', len(set(label)))
    if fit:
        fit_contour(bm, *fit, iterations=1)
    bm.to_mesh(me)
    bm.free()
    for poly in ob.data.polygons:
        poly.use_smooth = False


def fit_contour(bm, field, matte, iterations=3, limit=0.015):
    """Moves the outline vertices of the front and the side view to the outline of the sheet fox.

    The flat faces of the low-poly mesh cut inside the curves of the forms, and the planes cut
    off thin tips, so the silhouette loses about 0.02 of IoU. In each view, a vertex is on the
    outline when a camera ray just outside it hits no face. The outward direction is its
    normal in the image plane, or for a thin tip whose normal faces the camera, the direction
    from the middle of its neighbors to it. Such a vertex moves in the image plane, along the
    outward direction, by the distance from its pixel to the border of the sheet fox (`field`,
    at most `limit` meters). Its neighbors move half as far. The field gives the distance to
    the nearest border, so a thin tip moves less than its full gap to the tip of the sheet. The tail and the vertices near the ignored pixels of the matte (chair, violin,
    bow) stay, because the views of the sheet show different tails.
    """
    names = nearest_parts(np.array([v.co[:] for v in bm.verts], np.float32))
    bm.verts.index_update()
    skip = {i for i, n in enumerate(names) if n.startswith('tail')}
    frames = view_frames()[:2]
    h, w = field.shape
    ignored = np.abs(matte[..., 0] - 128.0 / 255.0) < 0.05
    moved = 0
    for _ in range(iterations):
        bm.normal_update()
        bm.verts.ensure_lookup_table()
        tree = BVHTree.FromBMesh(bm)
        moves = {}
        for view, turn, back in frames:
            for v in bm.verts:
                if v.index in skip:
                    continue
                n = v.normal
                if abs(n.dot(back)) > 0.4:
                    # The normal of a thin tip (an ear) faces the camera. Its outward
                    # direction in the image is from the middle of its neighbors to it.
                    ring = [x.other_vert(v).co for x in v.link_edges]
                    n = v.co - sum(ring, Vector()) / len(ring)
                m = n - back * n.dot(back)
                if m.length < 1e-6:
                    continue
                m.normalize()
                probe = v.co + m * 0.004
                if tree.ray_cast(probe + back * 3.0, -back, 6.0)[0] is not None:
                    continue
                col, row = project(view, turn, v.co)
                ci, ri = int(round(col)), int(round(row))
                if not (6 <= ri < h - 6 and 6 <= ci < w - 6) or ignored[ri - 6:ri + 7, ci - 6:ci + 7].any():
                    continue
                step = max(-limit, min(limit, float(field[ri, ci])))
                moves.setdefault(v.index, []).append(m * step)
        shift = {i: sum(ms, Vector()) / len(ms) for i, ms in moves.items()}
        spread = {}
        for i, d in shift.items():
            for e in bm.verts[i].link_edges:
                j = e.other_vert(bm.verts[i]).index
                if j not in shift and j not in skip:
                    spread.setdefault(j, []).append(d * 0.5)
        for i, d in shift.items():
            bm.verts[i].co += d * 0.8
        for j, ds in spread.items():
            bm.verts[j].co += sum(ds, Vector()) / len(ds) * 0.8
        moved = max(moved, len(shift))
    print('contour: vertices', moved)


def view_frames():
    """Gives, for each view, the turn and the direction to the camera in fox coordinates."""
    e = math.radians(sheet_camera.ELEVATION)
    out = []
    for view in sheet_camera.VIEWS:
        turn = math.radians(view[3])
        back = Matrix.Rotation(-turn, 3, 'Z') @ Vector((0.0, -math.cos(e), math.sin(e)))
        out.append((view, turn, back))
    return out


def project(view, turn, p):
    """Projects a point in fox coordinates to the sheet pixel (col, row) of one view."""
    _, col, floor, _ = view
    t = math.tan(math.radians(sheet_camera.ELEVATION))
    xp = math.cos(turn) * p.x - math.sin(turn) * p.y
    yp = math.sin(turn) * p.x + math.cos(turn) * p.y
    return col + sheet_camera.PPM * xp, floor - sheet_camera.PPM * (p.z + yp * t)


def role_of(rgb):
    """Gives the palette role of a sheet color (sRGB in 0 to 1)."""
    h, s, v = colorsys.rgb_to_hsv(*rgb)
    if v < 0.26 and s < 0.45:
        return 'black'
    if s < 0.42 and v > 0.42:
        return 'white'
    if v < 0.52 and s < 0.68:
        return 'brown'
    return 'orange'


def sample_roles(ob, sheet, matte):
    """Reads one role for each face from the sheet, or None when no view sees the face."""
    me = ob.data
    bvh = BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get())
    frames = view_frames()
    roles = []
    for poly in me.polygons:
        c = poly.center
        n = poly.normal
        best = None
        for view, turn, back in frames:
            facing = n.dot(back)
            if facing < 0.25 or (best and facing <= best[0]):
                continue
            hit = bvh.ray_cast(c + back * 0.002, back, 2.0)
            if hit[0] is not None:
                continue
            col, row = project(view, turn, c)
            ci, ri = int(round(col)), int(round(row))
            window = matte[ri - 2:ri + 3, ci - 2:ci + 3]
            if window.size == 0 or (window[..., 0] < 0.99).any():
                continue
            rgb = sheet[ri - 2:ri + 3, ci - 2:ci + 3, :3].reshape(-1, 3).mean(0)
            best = (facing, role_of(tuple(rgb)))
        roles.append(best[1] if best else None)
    return roles


def cone_t(part, c):
    """Gives the place of the point `c` along the axis of a cone part (0 at `a`, 1 at `b`)."""
    a = Vector(part[3][0])
    b = Vector(part[3][2])
    ab = b - a
    return max(0.0, min(1.0, (c - a).dot(ab) / ab.length_squared))


def ear_inside(part, c, t):
    """Gives the distance of `c` from the axis of an ear cone, across the ear, as a part of
    the local radius (0 on the axis, 1 at the border of the ear)."""
    a = Vector(part[3][0])
    b = Vector(part[3][2])
    r = c - (a + (b - a) * t)
    r.y = 0.0
    return r.length / (part[3][1] + (part[3][3] - part[3][1]) * t)


def rule_roles(ob):
    """Gives one role for each face from the nearest part of `fox_parts.PARTS` and its place.

    The rules copy the marks of the sheet. White: the inner ears inside an orange rim
    (`EAR_RIM`), the cheeks, the lower muzzle,
    the chest bib, and the tail tip. Dark brown: the ear tips, the forearm ends, the paws, the
    shins below `SOCK_TOP`, and the feet. Black: the nose, the faces within `NOSE_RADIUS` of the
    front end of the mesh muzzle. The carve cuts the muzzle part shorter, so the end of the
    part is not on the mesh.
    """
    import fox_parts

    muzzle = next(q for q in fox_parts.PARTS if q[0] == 'muzzle')
    axis = (Vector(muzzle[3][2]) - Vector(muzzle[3][0])).normalized()
    nose = max((v.co for v in ob.data.vertices), key=lambda co: (co - Vector(muzzle[3][0])).dot(axis)
               - 10.0 * max(0.0, float(fox_parts.part_sdf(np.array([co[:]], np.float32), muzzle)[0])))
    roles = []
    for poly in ob.data.polygons:
        c = poly.center
        n = poly.normal
        p = np.array([[c.x, c.y, c.z]], np.float32)
        part = min(fox_parts.PARTS, key=lambda q: float(fox_parts.part_sdf(p, q)[0]))
        name = part[0]
        role = 'orange'
        if name.startswith('ear'):
            t = cone_t(part, c)
            if t > 0.68 or (n.y > 0.1 and t > 0.3):
                role = 'brown'
            elif n.y < -0.55 and t > 0.08 and ear_inside(part, c, t) < EAR_RIM:
                role = 'white'
        elif name == 'muzzle':
            t = cone_t(part, c)
            axis_z = part[3][0][2] + (part[3][2][2] - part[3][0][2]) * t
            if (c - nose).length < NOSE_RADIUS:
                role = 'black'
            elif c.z < axis_z + 0.006 or n.z < -0.2:
                role = 'white'
        elif name in ('cheeks', 'face') or name.startswith('tuft'):
            # The white mask of the sheet: low beside the muzzle, and up to the eyes at the
            # sides of the face.
            edge = 0.975 + 0.45 * max(0.0, abs(c.x - 0.03) - 0.04)
            if c.z < edge or n.z < -0.3:
                role = 'white'
        elif name in ('neck', 'chest'):
            if n.y < -0.3 and abs(c.x + 0.01) < 0.12 + 0.25 * max(0.0, c.z - 0.75):
                role = 'white'
        elif name == 'pelvis':
            if n.y < -0.3 and abs(c.x + 0.01) < 0.11 and c.z > 0.40:
                role = 'white'
        elif name.startswith('forearm'):
            if cone_t(part, c) > 0.72:
                role = 'brown'
        elif name.startswith(('paw', 'foot')) or (name.startswith('shin') and c.z < SOCK_TOP):
            role = 'brown'
        elif name == 'tail_end':
            if cone_t(part, c) > 0.55:
                role = 'white'
        roles.append(role)
    return roles


def fill_and_clean(ob, roles):
    """Gives a role to each face with none, then removes single faces of a role."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.faces.ensure_lookup_table()
    neighbors = []
    for f in bm.faces:
        ring = set()
        for e in f.edges:
            for g in e.link_faces:
                if g.index != f.index:
                    ring.add(g.index)
        neighbors.append(sorted(ring))
    bm.free()
    for _ in range(60):
        empty = [i for i, r in enumerate(roles) if r is None]
        if not empty:
            break
        new = list(roles)
        for i in empty:
            near = [roles[j] for j in neighbors[i] if roles[j]]
            if near:
                new[i] = max(set(near), key=near.count)
        roles = new
    roles = [r or 'orange' for r in roles]
    out = list(roles)
    for i, r in enumerate(roles):
        near = [roles[j] for j in neighbors[i]]
        if near.count(r) == 0:
            out[i] = max(set(near), key=near.count)
    return out


def add_eyes(ob, roles):
    """Adds the eyes where the front view shows them: layers of discs on the face.

    Each eye is a white disc, a brown iris, a black pupil, and a white shine at the upper
    left, each a little above the layer under it. Each vertex of a disc goes onto the surface
    of the face and then up by the lift of its layer, so that the disc follows the curve of the
    face. The function marks the eye faces with 1 in the integer face attribute `eye`, for the
    skin step of `rig.py`.
    """
    bvh = BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get())
    view, _, back = view_frames()[0]
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    face_roles = list(roles)
    first_eye_face = len(bm.faces)
    for col, row in EYES:
        x = (col - view[1]) / sheet_camera.PPM
        z0 = (view[2] - row) / sheet_camera.PPM
        # The camera ray of the pixel comes from the camera side through the depth plane.
        origin = Vector((x, 0.0, z0)) + back * 2.0
        hit, normal, _, _ = bvh.ray_cast(origin, -back, 4.0)
        if hit is None:
            print('no eye hit at', col, row)
            continue
        n = normal.normalized()
        up = (Vector((0.0, 0.0, 1.0)) - n * n.z).normalized()
        side = up.cross(n)

        def on_face(p, lift):
            """Puts a point onto the face along the eye normal, then up by `lift`."""
            found = bvh.ray_cast(p + n * 0.05, -n, 0.1)
            if found[0] is None:
                return bm.verts.new(p + n * lift)
            return bm.verts.new(found[0] + n * lift)

        for role, radius, lift, shift, sides in EYE_LAYERS:
            centre = hit + up * shift[1] + side * shift[0]
            middle = on_face(centre, lift)
            ring = [on_face(centre + (side * math.cos(a) * EYE_SHAPE[0]
                                      + up * math.sin(a) * EYE_SHAPE[1]) * radius, lift)
                    for a in [2 * math.pi * k / sides for k in range(sides)]]
            for k in range(sides):
                bm.faces.new((middle, ring[k], ring[(k + 1) % sides]))
                face_roles.append(role)
        # The upper lid: a dark arc over the top of the eye, as on the sheet.
        angles = [math.radians(10 + 160 * k / 5) for k in range(6)]
        outer = [on_face(hit + (side * math.cos(a) * EYE_SHAPE[0]
                                + up * math.sin(a) * EYE_SHAPE[1]) * EYE_LID[0], EYE_LID[2])
                 for a in angles]
        inner = [on_face(hit + (side * math.cos(a) * EYE_SHAPE[0]
                                + up * math.sin(a) * EYE_SHAPE[1] * 0.8) * EYE_LID[1], EYE_LID[2])
                 for a in angles]
        for k in range(5):
            bm.faces.new((inner[k], outer[k], outer[k + 1]))
            bm.faces.new((inner[k], outer[k + 1], inner[k + 1]))
            face_roles.extend(['pupil', 'pupil'])
    bm.to_mesh(ob.data)
    bm.free()
    eye = ob.data.attributes.new('eye', 'INT', 'FACE')
    eye.data.foreach_set('value', [1 if i >= first_eye_face else 0
                                   for i in range(len(ob.data.polygons))])
    return face_roles


def paint(ob, roles):
    """Writes the role colors into the face-corner color attribute `Col`."""
    me = ob.data
    attr = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    colors = np.zeros((len(me.loops), 4), np.float32)
    for poly, role in zip(me.polygons, roles):
        r, g, b = ROLES[role]
        for li in poly.loop_indices:
            colors[li] = (r, g, b, 1.0)
    attr.data.foreach_set('color_srgb', colors.ravel())
    me.color_attributes.active_color = attr
    me.color_attributes.render_color_index = me.color_attributes.find('Col')


def main():
    opt = args()
    os.makedirs(opt.out, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(opt.forms))
    src = bpy.data.objects['Fox']
    for ob in list(bpy.data.objects):
        if ob is not src:
            bpy.data.objects.remove(ob, do_unlink=True)
    src.hide_render = False
    src.hide_viewport = False
    src.name = 'FoxLow'
    sheet = load_image(opt.sheet)
    matte = load_image(opt.matte)
    fit = (np.load(opt.fox_field).astype(np.float32), matte) if opt.fox_field else None
    remesh(src, opt.triangles, opt.planes, opt.strength, fit)
    if opt.colors == 'sheet':
        roles = fill_and_clean(src, sample_roles(src, sheet, matte))
    else:
        roles = fill_and_clean(src, rule_roles(src))
    roles = add_eyes(src, roles)
    paint(src, roles)
    counts = {r: roles.count(r) for r in ROLES}
    print('triangles', len(src.data.polygons), 'roles', counts)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.path.abspath(opt.out), 'lowpoly.blend'))


main()
