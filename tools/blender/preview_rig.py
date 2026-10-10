"""Renders the output of `rig_body.py` to check a GLB body before the packing (design 4.4).

    blender -b --factory-startup --python tools/blender/preview_rig.py -- <rig.json> <out_dir>

It writes `regions.png` (the front and the side, colored by the color region of each face:
fur light gray, accent pink, dark black) and `bones.png` (the front and the back, colored by the
main bone of each vertex). The eye plates of the app are not in the images.
"""

import colorsys
import json
import os
import sys

import bpy
from mathutils import Vector

#: The color of each region in the images.
REGION_COLORS = {
    'fur': (0.85, 0.83, 0.8, 1),
    'accent': (0.95, 0.5, 0.55, 1),
    'dark': (0.08, 0.08, 0.08, 1),
}

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

    names = sorted(rig['heads'])
    views = {
        'regions': (('front', Vector((0, -1, 0))), ('side', Vector((1, 0, 0)))),
        'bones': (('front', Vector((0, -1, 0))), ('back', Vector((0, 1, 0)))),
    }
    for mode, pair in views.items():
        for poly in mesh.polygons:
            for loop, vertex in zip(poly.loop_indices, poly.vertices):
                if mode == 'regions':
                    color = REGION_COLORS[rig['roles'][poly.index]]
                else:
                    color = bone_color(names.index(rig['weights'][vertex][0][0]))
                attr.data[loop].color = color
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
