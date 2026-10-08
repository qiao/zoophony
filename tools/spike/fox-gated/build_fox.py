"""Builds the blockout (phase 2) or the forms (phase 3) of the red fox, and renders the gate.

    blender -b --factory-startup --python tools/spike/fox-gated/build_fox.py -- \
        --phase blockout|forms --out <dir> [--field <matte-field.npy>] [--voxel 0.006]

- `blockout`: the hard union of the parts of `fox_parts.py`.
- `forms`: one fused surface. The smooth union of the parts grows by `--grow`. Then the
  silhouette carve cuts each point that falls outside the matte in one of the three views
  (the field of `matte_field.py`). The tail is free of the carve, and joins the body after
  the carve with a smooth union.

OpenVDB (part of Blender) turns the distance field into a quad mesh. The script writes
`<dir>/fox.blend` (the mesh `Fox` at the origin), `<dir>/sil.png` (the silhouette on the sheet
camera, for `gate.py`), and `<dir>/clay.png` (a clay render of the three views).
"""

import argparse
import math
import os
import sys
import time

import bpy
import numpy as np
import openvdb

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import fox_parts  # noqa: E402
import sheet_camera  # noqa: E402


def args():
    """Reads the arguments after `--`."""
    p = argparse.ArgumentParser()
    p.add_argument('--phase', choices=['blockout', 'forms'], required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--field', default='')
    p.add_argument('--voxel', type=float, default=0.006)
    p.add_argument('--grow', type=float, default=0.012)
    p.add_argument('--blur', type=int, default=0)
    return p.parse_args(sys.argv[sys.argv.index('--') + 1:])


def sample_field(field, cols, rows):
    """Samples the matte field at fractional pixel places, with bilinear filtering."""
    h, w = field.shape
    cols = np.clip(cols, 0, w - 1.001)
    rows = np.clip(rows, 0, h - 1.001)
    c0 = np.floor(cols).astype(int)
    r0 = np.floor(rows).astype(int)
    fc = cols - c0
    fr = rows - r0
    f = field
    top = f[r0, c0] * (1 - fc) + f[r0, c0 + 1] * fc
    bottom = f[r0 + 1, c0] * (1 - fc) + f[r0 + 1, c0 + 1] * fc
    return top * (1 - fr) + bottom * fr


def view_fields(points, field):
    """Gives the matte distance of each point in each view (positive inside the silhouette)."""
    t = math.tan(math.radians(sheet_camera.ELEVATION))
    x, y, z = points[..., 0], points[..., 1], points[..., 2]
    out = []
    for _, col, floor, turn in sheet_camera.VIEWS:
        a = math.radians(turn)
        xp = math.cos(a) * x - math.sin(a) * y
        yp = math.sin(a) * x + math.cos(a) * y
        cols = col + sheet_camera.PPM * xp
        rows = floor - sheet_camera.PPM * (z + yp * t)
        out.append(sample_field(field, cols, rows))
    return out


def distance_field(opt):
    """Calculates the signed distance field of the fox on the voxel grid."""
    points, lo = fox_parts.grid_points(opt.voxel)
    if opt.phase == 'blockout':
        return fox_parts.union(points, fox_parts.PARTS, 0.0), lo
    fields = view_fields(points, np.load(opt.field).astype(np.float32))
    d = None
    for group, views in fox_parts.CARVE_VIEWS.items():
        parts = [p for p in fox_parts.PARTS if p[1] == group]
        g = fox_parts.union(points, parts, fox_parts.BLEND)
        if views:
            g = g - opt.grow
            for v in views:
                g = np.maximum(g, -fields[v])
        d = g if d is None else fox_parts.smooth_min(d, g, fox_parts.BLEND)
    for _ in range(opt.blur):
        d = blur(d)
    return d, lo


def blur(d):
    """Blurs a 3D field once with the binomial kernel (1, 4, 6, 4, 1) / 16 along each axis.

    The blur rounds the sharp edges that the silhouette carve leaves, and the steps of the
    matte pixels on the cut faces.
    """
    for axis in range(3):
        p = np.pad(d, [(2, 2) if a == axis else (0, 0) for a in range(3)], mode='edge')
        n = d.shape[axis]

        def part(k):
            return np.take(p, range(k, k + n), axis=axis)

        d = (part(0) + 4 * part(1) + 6 * part(2) + 4 * part(3) + part(4)) / 16.0
    return d


def mesh_from_field(d, lo, voxel):
    """Turns a distance field into the mesh object `Fox` with OpenVDB."""
    grid = openvdb.FloatGrid(background=1.0)
    grid.copyFromArray(d.astype(np.float32))
    grid.transform = openvdb.createLinearTransform(voxelSize=voxel)
    points, tris, quads = grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
    points = points + lo
    me = bpy.data.meshes.new('Fox')
    faces = [tuple(q) for q in quads.tolist()] + [tuple(t) for t in tris.tolist()]
    me.from_pydata(points.tolist(), [], faces)
    me.validate()
    ob = bpy.data.objects.new('Fox', me)
    bpy.context.scene.collection.objects.link(ob)
    import bmesh

    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    return ob


def clay_settings(scene):
    """Sets a Workbench clay render on a dark background."""
    scene.render.engine = 'BLENDER_WORKBENCH'
    shading = scene.display.shading
    shading.light = 'STUDIO'
    shading.color_type = 'SINGLE'
    shading.single_color = (0.75, 0.72, 0.68)
    shading.show_shadows = False
    shading.show_cavity = False
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new('Dark')
    scene.world.color = (0.012, 0.012, 0.012)


def main():
    opt = args()
    os.makedirs(opt.out, exist_ok=True)
    start = time.time()
    sheet_camera.clear_scene()
    scene = bpy.context.scene
    d, lo = distance_field(opt)
    print('field', d.shape, round(time.time() - start, 1), 's')
    fox = mesh_from_field(d, lo, opt.voxel)
    print('mesh', len(fox.data.vertices), 'vertices', len(fox.data.polygons), 'faces')
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.path.abspath(opt.out), 'fox.blend'))

    sheet_camera.make_camera(scene)
    sheet_camera.place_views(fox)
    sheet_camera.silhouette_settings(scene)
    sheet_camera.render(scene, os.path.join(os.path.abspath(opt.out), 'sil.png'))
    clay_settings(scene)
    sheet_camera.render(scene, os.path.join(os.path.abspath(opt.out), 'clay.png'))
    print('done', round(time.time() - start, 1), 's')


main()
