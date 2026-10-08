"""Makes the low-poly fox from the forms: triangles of similar size, flat faces, and one palette
color for each face.

    blender -b --factory-startup --python tools/spike/fox-gated/lowpoly.py -- \
        --forms <forms/fox.blend> --sheet docs/reference/fox-views.png \
        --matte <fox-matte.png> --out <dir> [--triangles 3000] [--colors rules|sheet]

1. A collapse decimate makes about `--triangles` triangles, and a relaxation on the fine
   surface makes their sizes even (`remesh`).
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
#: Meters. The sheet eyes are about 60 mm wide with an iris of about 40 mm.
EYE_LAYERS = [
    ('sclera', 0.031, 0.003, (0.0, 0.0), 8),
    ('iris', 0.027, 0.005, (0.002, -0.002), 8),
    ('pupil', 0.013, 0.007, (0.002, -0.003), 6),
    ('shine', 0.007, 0.009, (-0.007, 0.009), 4),
]

#: The shape of an eye: the scale of a disc across and up. The sheet eyes are almonds.
EYE_SHAPE = (1.3, 0.85)

#: The upper lid of an eye: outer radius, inner radius, and lift, in meters.
EYE_LID = (0.035, 0.029, 0.010)


def args():
    """Reads the arguments after `--`."""
    p = argparse.ArgumentParser()
    p.add_argument('--forms', required=True)
    p.add_argument('--sheet', required=True)
    p.add_argument('--matte', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--triangles', type=int, default=3000)
    p.add_argument('--colors', choices=['rules', 'sheet'], default='rules')
    return p.parse_args(sys.argv[sys.argv.index('--') + 1:])


def load_image(path):
    """Loads a PNG file as a float array (rows from the top, RGBA in 0 to 1)."""
    img = bpy.data.images.load(os.path.abspath(path), check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)[::-1]


def remesh(ob, triangles):
    """Reduces the object to about `triangles` triangles of similar size.

    QuadriFlow of Blender 5.2 refused the forms mesh ("needs to be manifold"), although the mesh
    has no open or shared edge. Thus a collapse decimate makes the count, and a relaxation makes
    the sizes even: each vertex moves to the mean of its neighbors in the tangent plane, and
    then back onto the fine surface. A beauty pass turns the edges for better triangles.
    """
    fine = bmesh.new()
    fine.from_mesh(ob.data)
    bvh = BVHTree.FromBMesh(fine)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    mod = ob.modifiers.new('Decimate', 'DECIMATE')
    mod.ratio = triangles / len(ob.data.polygons)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    ob.modifiers.clear()
    ob.data = me
    bm = bmesh.new()
    bm.from_mesh(me)
    for _ in range(12):
        bm.normal_update()
        moves = []
        for v in bm.verts:
            ring = [e.other_vert(v).co for e in v.link_edges]
            mean = sum(ring, Vector()) / len(ring)
            delta = mean - v.co
            delta -= v.normal * v.normal.dot(delta)
            moves.append(v.co + delta * 0.6)
        for v, p in zip(bm.verts, moves):
            hit = bvh.find_nearest(p)
            v.co = hit[0] if hit[0] is not None else p
        bmesh.ops.beautify_fill(bm, faces=bm.faces, edges=bm.edges)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    fine.free()
    for poly in ob.data.polygons:
        poly.use_smooth = False


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


def rule_roles(ob):
    """Gives one role for each face from the nearest part of `fox_parts.PARTS` and its place.

    The rules copy the marks of the sheet. White: the inner ears, the cheeks, the lower muzzle,
    the chest bib, and the tail tip. Dark brown: the ear tips, the forearm ends, the paws, the
    shins, and the feet. Black: the nose.
    """
    import fox_parts

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
            elif n.y < -0.55 and t > 0.08:
                role = 'white'
        elif name == 'muzzle':
            t = cone_t(part, c)
            axis_z = part[3][0][2] + (part[3][2][2] - part[3][0][2]) * t
            if t > 0.75:
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
            if n.y < -0.4 and abs(c.x + 0.01) < 0.1 + 0.25 * max(0.0, c.z - 0.75):
                role = 'white'
        elif name == 'pelvis':
            if n.y < -0.4 and abs(c.x + 0.01) < 0.09 and c.z > 0.43:
                role = 'white'
        elif name.startswith('forearm'):
            if cone_t(part, c) > 0.72:
                role = 'brown'
        elif name.startswith(('paw', 'shin', 'foot')):
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
    """Adds the eyes where the front view shows them: layers of flat discs on the face.

    Each eye is a white disc, a brown iris, a black pupil, and a white shine at the upper
    left, each a little above the layer under it. The function marks the eye faces with 1 in
    the integer face attribute `eye`, for the skin step of `rig.py`.
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
        for role, radius, lift, shift, sides in EYE_LAYERS:
            centre = hit + n * lift + up * shift[1] + side * shift[0]
            middle = bm.verts.new(centre)
            ring = [bm.verts.new(centre + (side * math.cos(a) * EYE_SHAPE[0]
                                           + up * math.sin(a) * EYE_SHAPE[1]) * radius)
                    for a in [2 * math.pi * k / sides for k in range(sides)]]
            for k in range(sides):
                bm.faces.new((middle, ring[k], ring[(k + 1) % sides]))
                face_roles.append(role)
        # The upper lid: a dark arc over the top of the eye, as on the sheet.
        centre = hit + n * EYE_LID[2]
        angles = [math.radians(10 + 160 * k / 5) for k in range(6)]
        outer = [bm.verts.new(centre + (side * math.cos(a) * EYE_SHAPE[0]
                                        + up * math.sin(a) * EYE_SHAPE[1]) * EYE_LID[0])
                 for a in angles]
        inner = [bm.verts.new(centre + (side * math.cos(a) * EYE_SHAPE[0]
                                        + up * math.sin(a) * EYE_SHAPE[1] * 0.8) * EYE_LID[1])
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
    remesh(src, opt.triangles)
    sheet = load_image(opt.sheet)
    matte = load_image(opt.matte)
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
