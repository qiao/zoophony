"""Renders the output of `rig_body.py` to check a GLB body before the packing (design 4.4).

    blender -b --factory-startup --python tools/blender/preview_rig.py -- <rig.json> <out_dir>

It writes `skin.png` (the front and the side, with the skin texture `skin.webp` that
`rig_body.py` writes beside `<rig.json>`) and `bones.png` (the front and the back, colored by the
main bone of each vertex).
"""

import colorsys
import json
import os
import sys

import bpy
from mathutils import Vector

#: The size of one view, in pixels.
VIEW = 600


def bone_color(index):
    """Gives a color for a bone: hues by the golden ratio, so that neighbors differ."""
    hue = (index * 0.61803) % 1.0
    return (*colorsys.hsv_to_rgb(hue, 0.7, 0.95), 1)


def render(scene, cam, center, direction, path):
    """Renders one orthographic view along a direction."""
    cam.location = center + direction * 6
    cam.rotation_euler = (-direction).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    rest = sys.argv[sys.argv.index('--') + 1 :]
    if len(rest) != 2:
        raise SystemExit('Usage: blender -b --python preview_rig.py -- <rig.json> <out_dir>')
    with open(rest[0]) as f:
        rig = json.load(f)
    out = rest[1]
    os.makedirs(out, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    mesh = bpy.data.meshes.new('body')
    mesh.from_pydata(rig['vertices'], [], rig['faces'])
    mesh.update()
    ob = bpy.data.objects.new('body', mesh)
    bpy.context.scene.collection.objects.link(ob)
    attr = mesh.color_attributes.new('color', 'FLOAT_COLOR', 'CORNER')
    uv = mesh.uv_layers.new(name='skin')
    for poly in mesh.polygons:
        for loop, at in zip(poly.loop_indices, rig['uvs'][poly.index]):
            uv.data[loop].uv = at
    material = bpy.data.materials.new('skin')
    if material.node_tree is None:
        material.use_nodes = True
    texture = material.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = bpy.data.images.load(os.path.join(os.path.dirname(rest[0]), 'skin.webp'))
    bsdf = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    material.node_tree.links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
    mesh.materials.append(material)

    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'VERTEX'
    scene.render.resolution_x = scene.render.resolution_y = VIEW
    scene.world = bpy.data.worlds.new('world')
    lo = Vector([min(v[k] for v in rig['vertices']) for k in range(3)])
    hi = Vector([max(v[k] for v in rig['vertices']) for k in range(3)])
    center = (lo + hi) / 2
    camera = bpy.data.cameras.new('camera')
    camera.type = 'ORTHO'
    camera.ortho_scale = max(hi - lo) * 1.1
    cam = bpy.data.objects.new('camera', camera)
    scene.collection.objects.link(cam)
    scene.camera = cam

    names = sorted(set(rig['heads']) | {pairs[0][0] for pairs in rig['weights']})
    views = {
        'skin': (('front', Vector((0, -1, 0))), ('side', Vector((1, 0, 0)))),
        'bones': (('front', Vector((0, -1, 0))), ('back', Vector((0, 1, 0)))),
    }
    for mode, pair in views.items():
        scene.display.shading.color_type = 'TEXTURE' if mode == 'skin' else 'VERTEX'
        for poly in mesh.polygons:
            for loop, vertex in zip(poly.loop_indices, poly.vertices):
                attr.data[loop].color = bone_color(names.index(rig['weights'][vertex][0][0]))
        paths = []
        for name, direction in pair:
            path = os.path.join(out, f'{mode}-{name}.png')
            render(scene, cam, center, direction, path)
            paths.append(path)
        sheet = bpy.data.images.new(mode, VIEW * 2, VIEW)
        pixels = []
        images = [bpy.data.images.load(p) for p in paths]
        for row in range(VIEW):
            for image in images:
                start = row * VIEW * 4
                pixels.extend(image.pixels[start : start + VIEW * 4])
        sheet.pixels = pixels
        sheet.filepath_raw = os.path.join(out, f'{mode}.png')
        sheet.file_format = 'PNG'
        sheet.save()
        for p in paths:
            os.remove(p)
        print(f'preview_rig: {sheet.filepath_raw}')


main()
