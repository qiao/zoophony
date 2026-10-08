"""The camera and the views of `fox-views.png` in Blender, for the gates and the renders.

The fox is in its own coordinates: meters, z up, the fox faces -y, its left side is +x, and the
origin is on the floor under the middle of the chair seat (seat top at z = 0.35).

The sheet has 737 px for each meter. Each view puts a copy of the fox at a page column and a
floor row, turned about z (`VIEWS`). The camera is orthographic and looks down 8 degrees. As on
the views page of the app (`src/gallery/views-main.ts`), a vertical line keeps its length on the
page, and a point that is farther from the camera moves up by tan(8 deg) of its depth. The
pixel aspect of 1 / cos(8 deg) gives this projection:

    col = x_view + 737 * x'
    row = floor - 737 * (z + y' * tan(8 deg))

where x' and y' are the coordinates of the turned fox (y' points away from the camera).
"""

import math

import bpy

#: The size of the sheet, in pixels.
WIDTH, HEIGHT = 2494, 1354

#: The scale of the sheet, in pixels for each meter.
PPM = 737.0

#: The camera angle above the floor, in degrees.
ELEVATION = 8.0

#: The views: (name, page column of the origin, floor row, turn in degrees).
VIEWS = [('front', 385.0, 1117.0, 0.0), ('side', 1100.0, 1118.0, 65.0), ('back', 2080.0, 1120.0, 180.0)]


def view_matrix_parts(view):
    """Gives the world location and the z turn of the fox copy of one view."""
    _, col, floor, turn = view
    x = (col - WIDTH / 2) / PPM
    z = (HEIGHT / 2 - floor) / PPM
    return (x, 0.0, z), math.radians(turn)


def make_camera(scene):
    """Makes the sheet camera, sets the render size, and gives the camera object."""
    data = bpy.data.cameras.new('SheetCamera')
    data.type = 'ORTHO'
    data.sensor_fit = 'HORIZONTAL'
    data.ortho_scale = WIDTH / PPM
    data.clip_start = 0.1
    data.clip_end = 100.0
    cam = bpy.data.objects.new('SheetCamera', data)
    scene.collection.objects.link(cam)
    e = math.radians(ELEVATION)
    distance = 20.0
    cam.location = (0.0, -distance * math.cos(e), distance * math.sin(e))
    cam.rotation_euler = (math.radians(90.0 - ELEVATION), 0.0, 0.0)
    scene.camera = cam
    scene.render.resolution_x = WIDTH
    scene.render.resolution_y = HEIGHT
    scene.render.resolution_percentage = 100
    scene.render.pixel_aspect_x = 1.0 / math.cos(e)
    scene.render.pixel_aspect_y = 1.0
    return cam


def place_views(source, collection_name='Views'):
    """Makes one linked copy of the object `source` for each view, and hides the source.

    The copies share the mesh data and the modifiers stay on the source only, so give a source
    with its modifiers applied, or an armature with its children through `place_view_tree`.
    """
    scene = bpy.context.scene
    coll = bpy.data.collections.new(collection_name)
    scene.collection.children.link(coll)
    out = []
    for view in VIEWS:
        loc, turn = view_matrix_parts(view)
        ob = bpy.data.objects.new(source.name + '_' + view[0], source.data)
        ob.location = loc
        ob.rotation_euler = (0.0, 0.0, turn)
        coll.objects.link(ob)
        out.append(ob)
    source.hide_render = True
    source.hide_viewport = True
    return out


def place_collection_views(collection, name='ViewInstances'):
    """Makes one instance of a whole collection for each view (for a rigged fox or a chair)."""
    scene = bpy.context.scene
    out = []
    for view in VIEWS:
        loc, turn = view_matrix_parts(view)
        empty = bpy.data.objects.new(name + '_' + view[0], None)
        empty.instance_type = 'COLLECTION'
        empty.instance_collection = collection
        empty.location = loc
        empty.rotation_euler = (0.0, 0.0, turn)
        scene.collection.objects.link(empty)
        out.append(empty)
    if collection.name in scene.collection.children:
        scene.collection.children.unlink(collection)
    return out


def silhouette_settings(scene):
    """Sets a flat white Workbench render on a transparent film, for the silhouette gates."""
    scene.render.engine = 'BLENDER_WORKBENCH'
    shading = scene.display.shading
    shading.light = 'FLAT'
    shading.color_type = 'SINGLE'
    shading.single_color = (1.0, 1.0, 1.0)
    shading.show_shadows = False
    shading.show_cavity = False
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'Standard'
    scene.render.use_freestyle = False


def clear_scene():
    """Removes all objects of the factory scene."""
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)


def render(scene, path):
    """Renders the scene camera into a PNG file."""
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
