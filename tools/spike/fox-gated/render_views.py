"""Renders the three sheet views of the low-poly fox, with the light of the sheet.

    blender -b --factory-startup --python tools/spike/fox-gated/render_views.py -- \
        --blend <lowpoly.blend> --object FoxLow --out <file.png> [--chair] [--silhouette]

- With no flag: the fox alone on a transparent film, 2494 x 1354 px, flat faces, EEVEE.
- `--chair`: adds a simple chair (seat top at 0.35 m) and the dark background of the sheet.
- `--silhouette`: a flat white silhouette on a transparent film, for `gate.py`.

The light stays still and the fox turns, as on the sheet: a warm key light from the front, the
left, and above, a warm fill light from the right, a white rim light from behind, and a dark
ambient light.
"""

import argparse
import math
import os
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import sheet_camera  # noqa: E402

#: The background color of the sheet, in linear RGB.
BACKGROUND = (0.0056, 0.0056, 0.0056)

#: The parts of the chair: (center, size) in meters. The seat top is at 0.35 m.
CHAIR = [
    ((0.0, 0.0, 0.33), (0.50, 0.42, 0.04)),
    ((-0.225, -0.18, 0.155), (0.04, 0.04, 0.31)),
    ((0.225, -0.18, 0.155), (0.04, 0.04, 0.31)),
    ((-0.225, 0.18, 0.41), (0.04, 0.04, 0.82)),
    ((0.225, 0.18, 0.41), (0.04, 0.04, 0.82)),
    ((0.0, 0.18, 0.77), (0.46, 0.03, 0.07)),
    ((0.0, 0.18, 0.58), (0.46, 0.03, 0.05)),
    ((0.0, -0.18, 0.10), (0.46, 0.03, 0.03)),
    ((0.0, 0.18, 0.10), (0.46, 0.03, 0.03)),
]


def args():
    """Reads the arguments after `--`."""
    p = argparse.ArgumentParser()
    p.add_argument('--blend', required=True)
    p.add_argument('--object', default='FoxLow')
    p.add_argument('--out', required=True)
    p.add_argument('--chair', action='store_true')
    p.add_argument('--silhouette', action='store_true')
    return p.parse_args(sys.argv[sys.argv.index('--') + 1:])


def fur_material():
    """Makes a rough material whose base color is the color attribute `Col`."""
    mat = bpy.data.materials.new('Fur')
    nodes = mat.node_tree.nodes
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    attr = nodes.new('ShaderNodeAttribute')
    attr.attribute_type = 'GEOMETRY'
    attr.attribute_name = 'Col'
    mat.node_tree.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.85
    return mat


def chair_collection():
    """Makes the chair as one mesh in its own collection."""
    bm = bmesh.new()
    for center, size in CHAIR:
        r = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=size, verts=r['verts'])
        bmesh.ops.translate(bm, vec=center, verts=r['verts'])
    me = bpy.data.meshes.new('Chair')
    bm.to_mesh(me)
    bm.free()
    mat = bpy.data.materials.new('Wood')
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (0.42, 0.22, 0.05, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.6
    me.materials.append(mat)
    coll = bpy.data.collections.new('ChairSet')
    bpy.context.scene.collection.children.link(coll)
    coll.objects.link(bpy.data.objects.new('Chair', me))
    return coll


def sun(name, rotation_deg, color, energy):
    """Adds a sun light with a rotation in degrees (x, y, z)."""
    data = bpy.data.lights.new(name, 'SUN')
    data.color = color
    data.energy = energy
    data.angle = math.radians(3)
    ob = bpy.data.objects.new(name, data)
    ob.rotation_euler = [math.radians(a) for a in rotation_deg]
    bpy.context.scene.collection.objects.link(ob)
    return ob


def lit_settings(scene, background):
    """Sets EEVEE, the lights of the sheet, and the film."""
    scene.render.engine = 'BLENDER_EEVEE'
    scene.eevee.taa_render_samples = 16
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.render.film_transparent = not background
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    world = bpy.data.worlds.new('Studio')
    scene.world = world
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (0.03, 0.027, 0.024, 1.0)
    bg.inputs['Strength'].default_value = 1.0
    # A sun with rotation (0, 0, 0) shines down -z. These turns aim it from the camera side.
    sun('Key', (55.0, 0.0, -35.0), (1.0, 0.86, 0.70), 4.2)
    sun('Fill', (75.0, 0.0, 40.0), (1.0, 0.93, 0.85), 0.6)
    sun('Rim', (-60.0, 0.0, 30.0), (1.0, 1.0, 1.0), 2.0)
    if background:
        plane = bpy.data.meshes.new('Backdrop')
        bm = bmesh.new()
        r = bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=20.0)
        bmesh.ops.rotate(bm, verts=r['verts'], cent=(0, 0, 0),
                         matrix=__import__('mathutils').Matrix.Rotation(math.radians(90), 3, 'X'))
        bmesh.ops.translate(bm, vec=(0.0, 6.0, 0.0), verts=r['verts'])
        bm.to_mesh(plane)
        bm.free()
        mat = bpy.data.materials.new('Back')
        nodes = mat.node_tree.nodes
        for n in list(nodes):
            nodes.remove(n)
        emit = nodes.new('ShaderNodeEmission')
        emit.inputs['Color'].default_value = BACKGROUND + (1.0,)
        out = nodes.new('ShaderNodeOutputMaterial')
        mat.node_tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
        plane.materials.append(mat)
        ob = bpy.data.objects.new('Backdrop', plane)
        scene.collection.objects.link(ob)


def main():
    opt = args()
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(opt.blend))
    scene = bpy.context.scene
    for ob in list(bpy.data.objects):
        if ob.type in {'CAMERA', 'LIGHT'}:
            bpy.data.objects.remove(ob, do_unlink=True)
    fox = bpy.data.objects[opt.object]
    sheet_camera.make_camera(scene)
    if fox.type == 'ARMATURE':
        coll = fox.users_collection[0]
        if coll == scene.collection:
            coll = bpy.data.collections.new('FoxSet')
            scene.collection.children.link(coll)
            for ob in [fox] + list(fox.children):
                scene.collection.objects.unlink(ob)
                coll.objects.link(ob)
        mesh_obs = [c for c in fox.children if c.type == 'MESH']
        sheet_camera.place_collection_views(coll, 'Fox')
    else:
        mesh_obs = [fox]
        sheet_camera.place_views(fox)
    if not opt.silhouette:
        mat = fur_material()
        for ob in mesh_obs:
            ob.data.materials.clear()
            ob.data.materials.append(mat)
    if opt.chair:
        sheet_camera.place_collection_views(chair_collection(), 'Chair')
    if opt.silhouette:
        sheet_camera.silhouette_settings(scene)
    else:
        lit_settings(scene, opt.chair)
    sheet_camera.render(scene, os.path.abspath(opt.out))


main()
