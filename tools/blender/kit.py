"""The shared steps of the Blender build of a sculpt (design 4.4).

A recipe of a species (for example `fox_red.py`) calls these steps. Each shell of a sculpt is a
closed surface on one bone, or on a chain of bones:

1. Smooth base forms (hulls of spheres) placed at the bones of the rig.
2. A voxel remesh joins the forms of one shell into one closed surface.
3. A smooth step rounds the folds where the forms meet.
4. A decimate (collapse) makes large flat facets. A shell on the middle plane is built as its
   right half, then mirrored, so that its left half is the mirror image facet by facet.
5. Plane cuts make straight color borders, and each triangle gets the color region of its
   centroid.
6. A skin rule gives each vertex at most two bones (design 4.7).

The axes: the rig file uses the axes of the model (y up, the animal faces -z, its left side is
-x). Blender uses z up. The step `to_blender()` turns a point of the model into Blender axes
(-x, z, y), a proper rotation, so that the animal faces -y (the front view of Blender) and the
winding of the faces stays the same.
"""

import json
import math

import bmesh
import bpy
from mathutils import Matrix, Vector


def to_blender(p):
    """Turns a point of the model axes into Blender axes."""
    return Vector((-p[0], p[2], p[1]))


def offset(x, y, z):
    """Turns an offset of the model axes (x to the right side, y up, z to the back) into Blender
    axes."""
    return Vector((-x, z, y))


def to_model(p):
    """Turns a point of Blender axes into the model axes."""
    return (-p[0], p[2], p[1])


def smoothstep(edge0, edge1, x):
    """Gives the smooth step from 0 at edge0 to 1 at edge1."""
    t = min(1.0, max(0.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)


class Rig:
    """The bones and the body points of one stance, in Blender axes and meters."""

    def __init__(self, data, stance):
        self.species = data['species']
        self.h = data['h']
        self.colors = data['colors']
        self.accent_parts = frozenset(data['accentParts'])
        self.stance = stance
        rig = data['stances'][stance]
        self.bones = {name: to_blender(p) for name, p in rig['bones'].items()}
        self.points = {
            name: to_blender(p) for name, p in rig.items() if name != 'bones'
        }

    def bone(self, name):
        """Gives a copy of the bind position of a bone."""
        return self.bones[name].copy()

    def point(self, name):
        """Gives a copy of a body point, such as `mouth` or `palmR`."""
        return self.points[name].copy()


def reset_scene():
    """Removes all objects, meshes, and materials of the scene."""
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for material in list(bpy.data.materials):
        bpy.data.materials.remove(material)


def _object_from_bmesh(name, bm):
    """Makes a mesh object in the scene from a bmesh, and frees the bmesh."""
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def hull(spheres, segments=24, rings=12):
    """Makes the convex hull of some spheres as a bmesh.

    Each sphere is (center, radius) or (center, (rx, ry, rz)) for an ellipsoid on the Blender
    axes, or (center, (rx, ry, rz), rotation) with a rotation matrix.
    """
    points = []
    for sphere in spheres:
        center = Vector(sphere[0])
        radii = sphere[1]
        if isinstance(radii, (int, float)):
            radii = (radii, radii, radii)
        rotation = sphere[2] if len(sphere) > 2 else Matrix.Identity(3)
        for i in range(rings + 1):
            theta = math.pi * i / rings
            for j in range(segments):
                phi = 2.0 * math.pi * j / segments
                local = Vector((
                    radii[0] * math.sin(theta) * math.cos(phi),
                    radii[1] * math.sin(theta) * math.sin(phi),
                    radii[2] * math.cos(theta),
                ))
                points.append(center + rotation @ local)
    bm = bmesh.new()
    verts = [bm.verts.new(p) for p in points]
    bmesh.ops.convex_hull(bm, input=verts)
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def frame_along(direction, up=Vector((0, 0, 1))):
    """Gives a rotation matrix whose z axis points along a direction."""
    z = Vector(direction).normalized()
    x = up.cross(z)
    if x.length < 1e-6:
        x = Vector((1, 0, 0)).cross(z)
    x.normalize()
    y = z.cross(x)
    return Matrix((x, y, z)).transposed()


def _apply(obj, modifier):
    """Applies one modifier to an object, with no operator."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(evaluated)
    old = obj.data
    obj.modifiers.remove(modifier)
    obj.data = mesh
    bpy.data.meshes.remove(old)


def _triangle_count(obj):
    """Counts the triangles of a mesh object after a triangulation."""
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def shell(name, forms, voxel, triangles, smooth=0.5, smooth_steps=6, mirror=False):
    """Joins the forms of one shell, and makes its large facets.

    Args:
        name: The name of the shell.
        forms: The bmesh forms of `hull()`.
        voxel: The voxel size of the remesh, in meters.
        triangles: The number of triangles after the decimate (for a mirrored shell, of the
            whole shell).
        smooth: The factor of the smooth step.
        smooth_steps: The number of smooth steps.
        mirror: True for a shell on the middle plane: the build decimates its right half (x < 0
            in Blender axes is the right side of the animal) and mirrors it.

    Returns:
        A bmesh of triangles.
    """
    joined = bmesh.new()
    for form in forms:
        mesh = bpy.data.meshes.new('form')
        form.to_mesh(mesh)
        form.free()
        joined.from_mesh(mesh)
        bpy.data.meshes.remove(mesh)
    obj = _object_from_bmesh(name, joined)

    remesh = obj.modifiers.new('remesh', 'REMESH')
    remesh.mode = 'VOXEL'
    remesh.voxel_size = voxel
    _apply(obj, remesh)

    if smooth_steps > 0:
        smoothing = obj.modifiers.new('smooth', 'SMOOTH')
        smoothing.factor = smooth
        smoothing.iterations = smooth_steps
        _apply(obj, smoothing)

    if mirror:
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.bisect_plane(
            bm,
            geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
            plane_co=(0, 0, 0),
            plane_no=(1, 0, 0),
            clear_outer=True,
        )
        bm.to_mesh(obj.data)
        bm.free()

    goal = triangles / 2 if mirror else triangles
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(obj.data)
    bm.free()
    decimate = obj.modifiers.new('decimate', 'DECIMATE')
    decimate.decimate_type = 'COLLAPSE'
    decimate.use_collapse_triangulate = True
    decimate.ratio = min(1.0, goal / max(1, _triangle_count(obj)))
    _apply(obj, decimate)

    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bpy.data.objects.remove(obj, do_unlink=True)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    if mirror:
        _mirror_half(bm)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def _mirror_half(bm):
    """Adds the mirror image of a right half at x = 0, and welds the seam."""
    seam = 1e-4
    for edge in bm.edges:
        if edge.is_boundary:
            for v in edge.verts:
                v.co.x = 0.0
    original = list(bm.faces)
    copies = {}
    for v in list(bm.verts):
        if abs(v.co.x) <= seam:
            v.co.x = 0.0
            copies[v] = v
        else:
            copies[v] = bm.verts.new((-v.co.x, v.co.y, v.co.z))
    for face in original:
        corners = [copies[v] for v in reversed(face.verts)]
        if len(set(corners)) == 3:
            bm.faces.new(corners)


def mirrored(bm):
    """Gives the mirror image of a shell at x = 0, as a new bmesh."""
    copy = bm.copy()
    for v in copy.verts:
        v.co.x = -v.co.x
    for face in copy.faces:
        face.normal_flip()
    return copy


def cut(bm, point, normal, where=None, faces=None):
    """Cuts the triangles of a shell along a plane, for a straight color border.

    Args:
        bm: The shell.
        point: A point on the plane.
        normal: The normal of the plane.
        where: A test of the centroid of a face. Only the faces that pass it get the cut. With
            no test, all faces get it.
        faces: The faces to cut, in place of the test.
    """
    if faces is None:
        faces = [f for f in bm.faces if where is None or where(f.calc_center_median())]
    edges = list({e for f in faces for e in f.edges})
    verts = list({v for f in faces for v in f.verts})
    bmesh.ops.bisect_plane(
        bm,
        geom=verts + edges + faces,
        plane_co=Vector(point),
        plane_no=Vector(normal).normalized(),
    )
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    _clean(bm)


#: The shortest edge after a cut, in meters: about the step of a packed coordinate.
SHORTEST_EDGE = 3e-4


def _clean(bm):
    """Merges the vertices that a cut makes next to a vertex, and removes the triangles with no
    area. The packed coordinates (`SCULPT_STEP` of `models/sculpt.ts`) would make them flat."""
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=SHORTEST_EDGE)
    bmesh.ops.dissolve_degenerate(bm, dist=SHORTEST_EDGE, edges=bm.edges[:])
    bmesh.ops.triangulate(bm, faces=bm.faces[:])


def split_joints(bm, rule, chain, planes):
    """Cuts the triangles that follow more than one joint of a chain of bones (design 4.7).

    The main bones of the corners of a triangle must be one bone, or a bone and its parent. A
    large facet across a short bone, such as the neck, breaks this rule. The step cuts only those
    triangles along the planes where the main bone changes.

    Args:
        bm: The shell.
        rule: The skin rule of the shell.
        chain: The bones of the chain, from the root to the tip.
        planes: The (point, normal) of each plane where the main bone changes.

    Returns:
        The number of triangles that the step cut.
    """
    order = {bone: i for i, bone in enumerate(chain)}

    def broken(face):
        mains = sorted({order[rule(v.co)[0]] for v in face.verts})
        return len(mains) > 2 or (len(mains) == 2 and mains[1] - mains[0] != 1)

    total = 0
    for _ in range(4):
        bad = [face for face in bm.faces if broken(face)]
        if not bad:
            break
        total += len(bad)
        for point, normal in planes:
            alive = [face for face in bad if face.is_valid]
            cut(bm, point, normal, faces=alive)
            bad = [face for face in bm.faces if broken(face)]
    return total


def low_poly(spheres, segments, rings):
    """Makes a small closed part with no remesh: the hull of coarse spheres, as a bmesh."""
    bm = hull(spheres, segments=segments, rings=rings)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    return bm


class Part:
    """One shell of a sculpt, ready for the export.

    Attributes:
        name: The name of the shell.
        bm: The bmesh of triangles, in Blender axes.
        regions: The color region of each face, by the face index.
        skin: The (bone, blend bone, blend weight) of each vertex, by the vertex index.
    """

    def __init__(self, name, bm):
        self.name = name
        self.bm = bm
        self.regions = {}
        self.skin = {}

    def paint(self, rule):
        """Gives each face the region of its centroid: `rule(centroid)` returns a region."""
        self.bm.faces.ensure_lookup_table()
        for face in self.bm.faces:
            self.regions[face.index] = rule(face.calc_center_median())

    def rigid(self, bone):
        """Gives each vertex one bone."""
        self.bm.verts.ensure_lookup_table()
        for v in self.bm.verts:
            self.skin[v.index] = (bone, bone, 0.0)

    def skin_by(self, rule):
        """Gives each vertex the skin of `rule(position)`: (bone, blend bone, weight)."""
        self.bm.verts.ensure_lookup_table()
        for v in self.bm.verts:
            self.skin[v.index] = rule(v.co)


def blend(parent, child, child_weight):
    """Gives the skin of a vertex between a parent bone and its child bone (design 4.7)."""
    if child_weight >= 1.0:
        return (child, child, 0.0)
    if child_weight <= 0.0:
        return (parent, parent, 0.0)
    if child_weight > 0.5:
        return (child, parent, 1.0 - child_weight)
    return (parent, child, child_weight)


def chain_skin(joints, band):
    """Makes a skin rule for a chain of bones, such as an arm or a tail.

    Args:
        joints: The list of (bone, joint point) from the root to the tip. The last entry is the
            tip of the chain, with the bone None.
        band: The half width of the blend at each inner joint, in meters. 0 gives a hard split.

    Returns:
        A rule for `Part.skin_by()`.
    """

    def rule(p):
        best = None
        for i in range(len(joints) - 1):
            a = joints[i][1]
            b = joints[i + 1][1]
            ab = b - a
            t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
            distance = (a + ab * t - p).length
            if best is None or distance < best[0]:
                best = (distance, i, (p - a).dot(ab) / ab.length)
        _, i, along = best
        bone = joints[i][0]
        length = (joints[i + 1][1] - joints[i][1]).length
        if band > 0 and i + 1 < len(joints) - 1 and along > length - band:
            # Near the joint to the next bone: blend into the child.
            return blend(bone, joints[i + 1][0], 0.5 * smoothstep(length - band, length, along))
        if band > 0 and i > 0 and along < band:
            # Near the joint to the bone before: blend from the parent.
            return blend(joints[i - 1][0], bone, 0.5 + 0.5 * smoothstep(0, band, along))
        return (bone, bone, 0.0)

    return rule


def _shell_data(part, move=None):
    """Gives the JSON data of one part in the model axes, after a move in Blender axes."""
    bm = part.bm
    bm.verts.index_update()
    bm.faces.index_update()
    shift = move if move is not None else Vector((0, 0, 0))
    return {
        'name': part.name,
        'vertices': [[round(c, 6) for c in to_model(v.co + shift)] for v in bm.verts],
        'skin': [list(part.skin[v.index]) for v in bm.verts],
        'triangles': [[v.index for v in f.verts] for f in bm.faces],
        'regions': [part.regions[f.index] for f in bm.faces],
    }


def export(path, species, regions, body, legs):
    """Writes a sculpt as JSON in the model axes.

    Args:
        path: The output file.
        species: The species.
        regions: The dictionary of region name to {"color": hex, "finish": name}.
        body: The parts above the legs, in the axes of the first stance.
        legs: The dictionary of stance name to the parts of the legs in that stance.
    """
    data = {
        'species': species,
        'regions': regions,
        'body': [_shell_data(part) for part in body],
        'stances': {name: [_shell_data(part) for part in parts] for name, parts in legs.items()},
    }
    with open(path, 'w') as f:
        json.dump(data, f, separators=(',', ':'))


def moved(part, move):
    """Gives a copy of a part, moved by a vector in Blender axes."""
    copy = Part(part.name, part.bm.copy())
    for v in copy.bm.verts:
        v.co += move
    copy.regions = dict(part.regions)
    copy.skin = dict(part.skin)
    return copy


def _srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgba(hex_color):
    """Converts a CSS hex color to linear (r, g, b, a)."""
    value = int(hex_color[1:], 16)
    return tuple(
        _srgb_to_linear(((value >> s) & 0xFF) / 255.0) for s in (16, 8, 0)
    ) + (1.0,)


def show(parts, regions):
    """Adds the parts to the scene as one object with face colors, for a preview render."""
    names = list(regions)
    joined = bmesh.new()
    face_regions = []
    for part in parts:
        mesh = bpy.data.meshes.new(part.name)
        part.bm.faces.index_update()
        part.bm.to_mesh(mesh)
        joined.from_mesh(mesh)
        bpy.data.meshes.remove(mesh)
        face_regions.extend(part.regions[f.index] for f in part.bm.faces)
    obj = _object_from_bmesh('sculpt', joined)
    for name in names:
        material = bpy.data.materials.new(name)
        material.use_nodes = True
        shader = material.node_tree.nodes['Principled BSDF']
        shader.inputs['Base Color'].default_value = hex_rgba(regions[name]['color'])
        finish = regions[name]['finish']
        shader.inputs['Roughness'].default_value = 0.25 if finish == 'lacquer' else 0.85
        obj.data.materials.append(material)
    for polygon, region in zip(obj.data.polygons, face_regions):
        polygon.material_index = names.index(region)
        polygon.use_smooth = False
    return obj


def show_boxes(name, boxes, color):
    """Adds boxes to the scene as one object of one color, for a preview render.

    Args:
        name: The name of the object.
        boxes: The (center, size) of each box, in the model axes and meters.
        color: The CSS hex color.
    """
    bm = bmesh.new()
    for center, size in boxes:
        made = bmesh.ops.create_cube(bm, size=1.0)
        sx, sy, sz = size
        scale = Matrix.Diagonal((sx, sz, sy, 1.0))
        bmesh.ops.transform(bm, matrix=Matrix.Translation(to_blender(center)) @ scale,
                            verts=made['verts'])
    obj = _object_from_bmesh(name, bm)
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = hex_rgba(color)
    shader.inputs['Roughness'].default_value = 0.6
    obj.data.materials.append(material)
    return obj


def render(path, target, distance, azimuth_deg, elevation_deg, size=(640, 640), lens=50):
    """Renders the scene with the Workbench engine from a camera that looks at a target.

    The azimuth 0 looks at the front of the animal (from -y), and 90 looks at its right side.
    """
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.view_settings.view_transform = 'Standard'
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = 'PNG'
    if not scene.world:
        scene.world = bpy.data.worlds.new('world')
        scene.world.use_nodes = True
        background = scene.world.node_tree.nodes['Background']
        background.inputs['Color'].default_value = (0.05, 0.04, 0.035, 1)
        background.inputs['Strength'].default_value = 3.0
    if 'key' not in bpy.data.objects:
        key_data = bpy.data.lights.new('key', 'SUN')
        key_data.energy = 4.5
        key_data.color = (1.0, 0.86, 0.68)
        key_data.angle = math.radians(8)
        key = bpy.data.objects.new('key', key_data)
        key.rotation_euler = (math.radians(35), 0, math.radians(-25))
        scene.collection.objects.link(key)

    azimuth = math.radians(azimuth_deg)
    elevation = math.radians(elevation_deg)
    target = Vector(target)
    offset = Vector((
        distance * math.cos(elevation) * math.sin(azimuth) * -1,
        -distance * math.cos(elevation) * math.cos(azimuth),
        distance * math.sin(elevation),
    ))
    camera_data = bpy.data.cameras.new('camera')
    camera_data.lens = lens
    camera = bpy.data.objects.new('camera', camera_data)
    scene.collection.objects.link(camera)
    camera.location = target + offset
    direction = target - camera.location
    camera.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    scene.camera = camera
    # A soft fill light from the camera, so that the side and the back views are not dark.
    fill_data = bpy.data.lights.new('fill', 'SUN')
    fill_data.energy = 1.6
    fill_data.angle = math.radians(30)
    fill = bpy.data.objects.new('fill', fill_data)
    fill.rotation_euler = camera.rotation_euler
    scene.collection.objects.link(fill)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)
    bpy.data.objects.remove(fill, do_unlink=True)
