"""Replays the Blender session that rebuilds the legs of the polar bear pianist.

Long faces of the source mesh run from the underside of the haunch down to the heel, so the
seated leg is a wedge with no hollow behind the knee, and the knee looks too bulky. This script
gives each leg new quad faces, with the method of the arm rebuilds (`docs/agents/rigging.md`,
"The rebuild of the arms in Blender"), and repeats the steps in this order:

1. Import the copy with the new arms (`polar-bear-arms.glb`) and Merge by Distance.
2. Cut each leg with Bisect at the haunch line, where the thigh leaves the haunch below the
   crotch, and at the ankle, above the foot. Delete the faces between the cuts, and collapse the
   thin faces at the cut loops.
3. Model a quad tube of rings at right angles to the bones, Shrinkwrap it onto a hidden copy of
   the source leg, join it to the haunch and to the foot with Bridge Edge Loops, and collapse the
   thin bridge faces.
4. Give the new faces a UV layout, bake the fur color of the source legs onto them (Cycles,
   Selected to Active), and transfer the custom normals of the source surface (Data Transfer).
5. Put the leg image in the free part of the strip of the atlas, so that the mesh keeps one
   material, and write `polar-bear-limbs.glb`.
6. Write the weights of `polar-bear-limbs-weights.json`: each kept vertex keeps its weights of
   `polar-bear-weights.json`, and each new vertex takes the automatic weights of Blender.

The faces of the feet, the trunk, the haunch, the arms, and the head stay. The tube is built on
the source legs, before the leg factor of the rig: the rig stretches the thigh and the shin
only along their bones (`segment_stretch()` of `rig_mesh.py`), so each ring stays at a right
angle to its bone, and the rings move 1.6 times as far apart.

Run it in a terminal from the root of the tree:

    Blender -b --factory-startup -P tools/blender/polar_bear_legs.py -- [<out dir>]

A run gives the same `polar-bear-limbs.glb` and `polar-bear-limbs-weights.json`, byte for byte.
"""

import importlib.util
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
MODELS = os.path.join(ROOT, 'assets', 'models', 'polar-bear')
SOURCE = os.path.join(MODELS, 'polar-bear-arms.glb')
WEIGHTS = os.path.join(MODELS, 'polar-bear-weights.json')


def load_arms():
    """Loads `polar_bear_arms.py` from the folder of this script as the module `polar_bear_arms`."""
    if 'polar_bear_arms' in sys.modules:
        return sys.modules['polar_bear_arms']
    spec = importlib.util.spec_from_file_location('polar_bear_arms',
                                                  os.path.join(HERE, 'polar_bear_arms.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    sys.modules['polar_bear_arms'] = module
    return module


pa = load_arms()

# The cuts, as heights of a point of the bone line in the units of the studio: the haunch line on
# the thigh, just below the crotch (y 0.205), where each leg is a closed column, and the ankle on
# the shin, 0.035 units above the ankle joint, where the plane passes above the top of the foot
# (y 0.075 at the front). Each cut plane stands at a right angle to its bone.
LEG_CUT = {'haunch': 0.195, 'ankle': 0.1}

# The quad tube: `RING_VERTS` vertices in each ring, and a ring about each `RING_STEP` units of
# height between the end rings. The rings turn from the axis of the thigh to the axis of the shin
# over `AXIS_TURN` units above and below the knee joint. The rig makes the legs 1.6 times longer,
# so the rings stand about 0.012 units apart in the seated bind.
RING_VERTS = 20
RING_STEP = 0.0075
AXIS_TURN = 0.02

# The gap between each cut plane and the end ring of the tube, in units: with one `RING_STEP`, the
# cut plane of the haunch, which tilts 2 degrees with the thigh, passed within 2 mm of the first
# ring, and bridge faces at the back of the right haunch turned over in the copy (176 degrees).
END_GAP = 0.015

# The zone of the faces of one leg, in the units of the studio: out from |x| `x`, within
# `radius` of the bone line, and below the height `top`.
LEG_ZONE = {'x': 0.004, 'radius': 0.2, 'top': 0.4}

# The codes of the vertex attribute `leg_part` (the left side; the right side adds 10).
PART = {'haunch': 1, 'ankle': 2, 'tube': 3}

# The smallest corner of a face at a cut loop or of a bridge face, in degrees: a thinner face
# collapses its shortest loop edge (`clean_cut()`, `clean_bridge()`), as in `wind_arms.py`.
CUT_ANGLE = 12.0

# The UV seam of each tube runs along this spoke of the left leg and its mirror on the right leg:
# spoke 0 is the front of the leg, and the spokes of the left leg go around toward the inner side
# first, so this spoke is at the inner back of the leg.
SEAM_SPOKE = 7

# The size of the image of the leg faces in pixels, and its place in the strip of the atlas of
# `polar-bear-arms.glb`: the strip holds the arm image in its first `LEG_TEXTURE` columns.
LEG_TEXTURE = 1024


def leg_line(fr, joints, side):
    """Gives the hip, the knee, and the ankle joints of one leg in Blender."""
    return [fr.point(joints[f'{b}_L']['head'], side) for b in ('thigh', 'shin', 'foot')]


def leg_distance(line, co):
    """Gives the distance from a point to the bone line from the hip to the ankle."""
    return min(pa.seg_distance(co, line[i], line[i + 1]) for i in range(2))


def smoothstep(x, low, high):
    """Gives 0 below `low`, 1 above `high`, and a smooth ramp between them."""
    t = min(1.0, max(0.0, (x - low) / (high - low)))
    return t * t * (3 - 2 * t)


def station(fr, line, height):
    """Gives the point of the bone line at a height in the units of the studio, and the axis of
    the ring there, which points down the leg. Near the knee, the axis turns from the thigh to
    the shin."""
    hip, knee, ankle = line
    z = fr.floor + height * fr.height
    thigh, shin = (knee - hip).normalized(), (ankle - knee).normalized()
    if z >= knee.z:
        point = hip.lerp(knee, (hip.z - z) / (hip.z - knee.z))
    else:
        point = knee.lerp(ankle, (knee.z - z) / (knee.z - ankle.z))
    t = smoothstep(z, knee.z - AXIS_TURN * fr.height, knee.z + AXIS_TURN * fr.height)
    return point, (shin.lerp(thigh, t)).normalized()


def cut_planes(fr, line):
    """Gives the cut plane (point, normal) at the haunch line and at the ankle."""
    return [station(fr, line, LEG_CUT[code]) for code in ('haunch', 'ankle')]


def tube_heights():
    """Gives the height of each ring of the tube, from the haunch line down to the ankle. The end
    rings stand `END_GAP` from the cut planes, so that the bridge faces are not slivers."""
    top, low = LEG_CUT['haunch'] - END_GAP, LEG_CUT['ankle'] + END_GAP
    count = int(round((top - low) / RING_STEP))
    return [top - (top - low) * k / count for k in range(count + 1)]


def ring_faces(bm, fr, line, side, point, normal):
    """Finds the faces that a plane crosses in one closed loop around the leg.

    The faces of the leg zone that the plane crosses make loops of crossing points. The closed
    loop nearest to `point` goes around the leg. Gives its faces and its crossing points.
    """
    side_of = {p: (p.co - point).dot(normal) for p in bm.verts}
    near_x = LEG_ZONE['x'] * fr.height
    radius = LEG_ZONE['radius'] * fr.height
    top = fr.floor + LEG_ZONE['top'] * fr.height
    zone = [f for f in bm.faces if all(p.co.x * side > near_x and p.co.z < top
                                       and leg_distance(line, p.co) < radius for p in f.verts)]
    links = {}
    for f in zone:
        cross = [e for e in f.edges if side_of[e.verts[0]] * side_of[e.verts[1]] < 0]
        if len(cross) == 2:
            for a, b in (cross, cross[::-1]):
                links.setdefault(a, []).append((b, f))
    seen, best = set(), None
    for e0 in links:
        if e0 in seen:
            continue
        stack, comp = [e0], []
        while stack:
            e = stack.pop()
            if e in seen:
                continue
            seen.add(e)
            comp.append(e)
            stack += [b for b, _ in links[e]]
        if any(len(links[e]) != 2 for e in comp):
            continue
        pts = []
        for e in comp:
            a, b = e.verts
            k = side_of[a] / (side_of[a] - side_of[b])
            pts.append(a.co.lerp(b.co, k))
        center = sum(pts, Vector()) / len(pts)
        if best is None or (center - point).length < (best[2] - point).length:
            best = ({f for e in comp for _, f in links[e]}, pts, center)
    if best is None:
        raise RuntimeError('No closed loop around the leg at %s.' % (tuple(point),))
    return list(best[0]), best[1]


def cut_leg(bm, fr, line, side, part):
    """Cuts the leg at the haunch line and at the ankle (Bisect), and deletes the leg faces.

    The Bisect splits only the faces of the loop around the leg. The faces between the two cuts
    go (Delete Faces). The two cut loops stay as the borders of the haunch and of the foot.
    """
    cut_edges = set()
    for code, (point, normal) in zip(('haunch', 'ankle'), cut_planes(fr, line)):
        faces, _ = ring_faces(bm, fr, line, side, point, normal)
        edges = {e for f in faces for e in f.edges}
        verts = {p for f in faces for p in f.verts}
        res = bmesh.ops.bisect_plane(bm, geom=list(verts) + list(edges) + faces, plane_co=point,
                                     plane_no=normal, dist=1e-6)
        loop = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
        for e in loop:
            for p in e.verts:
                p[part] = PART[code] + (0 if side > 0 else 10)
        cut_edges |= set(loop)
    knee = line[1]
    seed = min(bm.faces, key=lambda f: (f.calc_center_median() - knee).length)
    leg, stack = set(), [seed]
    while stack:
        f = stack.pop()
        if f in leg:
            continue
        leg.add(f)
        stack += [g for edge in f.edges if edge not in cut_edges for g in edge.link_faces]
    if len(leg) > 600:
        raise RuntimeError('The cut loops of the leg are open: %d faces reached.' % len(leg))
    bmesh.ops.delete(bm, geom=list(leg), context='FACES')
    return len(leg)


def clean_cut(bm, part):
    """Collapses the thin faces at the cut loops (Collapse Edges), before the tube.

    The Bisect splits each face that the plane crosses. When the plane passes near a corner or
    nearly along an edge, it leaves a thin face with two loop vertices close together. While a
    face at a loop has a corner below `CUT_ANGLE` and its shortest edge lies along the loop, that
    edge collapses to its middle, and the merged vertex stays a vertex of the loop. An edge from
    the loop into the
    haunch or the foot does not collapse: on the haunch near the crotch, such collapses pulled
    long faces down into slits. Gives the number of collapsed edges.
    """
    loops = {PART[c] + off for c in ('haunch', 'ankle') for off in (0, 10)}
    count = 0
    for _ in range(200):
        edge = None
        for f in bm.faces:
            along = [e for e in f.edges if all(p[part] in loops for p in e.verts)]
            if not along or min(math.degrees(c.calc_angle()) for c in f.loops) >= CUT_ANGLE:
                continue
            short = min(f.edges, key=lambda e: e.calc_length())
            if short in along:
                edge = short
                break
        if edge is None:
            break
        bmesh.ops.collapse(bm, edges=[edge], uvs=True)
        count += 1
    return count


def build_tube(bm, source, fr, line, side, part, spoke):
    """Models the quad tube of one leg: one ring of `RING_VERTS` vertices at each height of
    `tube_heights()`.

    Each ring stands at a right angle to its bone. Its center is the center of the cross section
    of the source leg, and its radius is the mean radius of that section. Spoke 0 points to the
    front of the leg. The spokes of both legs go around in the same direction, as on the arms: a
    mirrored right ring twisted its bridge to the haunch.
    """
    src = bmesh.new()
    src.from_mesh(source.data)
    rings = []
    forward = Vector((0, -1, 0))
    for height in tube_heights():
        point, axis = station(fr, line, height)
        _, pts = ring_faces(src, fr, line, side, point, axis)
        center = sum(pts, Vector()) / len(pts)
        radius = sum((p - center).length for p in pts) / len(pts)
        ref = (forward - axis * axis.dot(forward)).normalized()
        across = axis.cross(ref)
        ring = []
        for k in range(RING_VERTS):
            a = 2 * math.pi * k / RING_VERTS
            p = bm.verts.new(center + (ref * math.cos(a) + across * math.sin(a)) * radius)
            p[part] = PART['tube'] + (0 if side > 0 else 10)
            p[spoke] = k
            ring.append(p)
        rings.append(ring)
    src.free()
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(RING_VERTS):
            j = (k + 1) % RING_VERTS
            bm.faces.new((r0[k], r0[j], r1[j], r1[k])).smooth = True
    return rings


def cut_and_tube(mesh, fr, joints):
    """Keeps a hidden copy of the source mesh, cuts both legs, collapses the thin faces at the
    cut loops, and models both tubes."""
    source = mesh.copy()
    source.data = mesh.data.copy()
    source.name = source.data.name = 'polar-bear-source'
    bpy.context.scene.collection.objects.link(source)
    source.hide_render = True
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(mesh.data)
    part = bm.verts.layers.int.get('leg_part') or bm.verts.layers.int.new('leg_part')
    spoke = bm.verts.layers.int.get('leg_spoke') or bm.verts.layers.int.new('leg_spoke')
    out = {}
    for side in (1, -1):
        line = leg_line(fr, joints, side)
        removed = cut_leg(bm, fr, line, side, part)
        out[side] = {'removed': removed}
    collapsed = clean_cut(bm, part)
    for side in (1, -1):
        rings = build_tube(bm, source, fr, leg_line(fr, joints, side), side, part, spoke)
        out[side]['rings'] = len(rings)
    out['collapsed'] = collapsed
    bmesh.update_edit_mesh(mesh.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    source.hide_set(True)
    return source, out


def part_group(mesh, name, codes):
    """Makes a vertex group of the vertices whose `leg_part` code is in `codes`."""
    codes = set(codes)
    attr = mesh.data.attributes['leg_part'].data
    group = mesh.vertex_groups.get(name) or mesh.vertex_groups.new(name=name)
    group.add([i for i, a in enumerate(attr) if a.value in codes], 1.0, 'REPLACE')
    return group


def wrap(mesh, source):
    """Puts the tube vertices on the surface of the source leg with a Shrinkwrap modifier.

    The modifier projects each vertex along its normal, in both directions, onto the source copy.
    The tube normals point out from the leg line, so each ring keeps its plane.
    """
    group = part_group(mesh, 'retopo', (PART['tube'], PART['tube'] + 10))
    mod = mesh.modifiers.new('wrap', 'SHRINKWRAP')
    mod.target = source
    mod.wrap_method = 'PROJECT'
    mod.use_project_x = mod.use_project_y = mod.use_project_z = False
    mod.use_negative_direction = True
    mod.use_positive_direction = True
    mod.cull_face = 'OFF'
    mod.vertex_group = group.name
    pa.apply_modifier(mesh, mod)
    mesh.vertex_groups.remove(mesh.vertex_groups['retopo'])


def bridge(mesh):
    """Joins each tube to the haunch and to the foot with Bridge Edge Loops.

    The first ring bridges to the cut loop of the haunch line, and the last ring to the cut loop
    of the ankle. The loops have more vertices than the rings, so the bridge makes triangles.
    """
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(mesh.data)
    part = bm.verts.layers.int['leg_part']
    made = 0
    for off in (0, 10):
        tube = PART['tube'] + off
        # The open ends of the tube are its first and its last ring.
        ends = [e for e in bm.edges if e.is_boundary and all(p[part] == tube for p in e.verts)]
        rings = []
        while ends:
            ring, stack = set(), [ends.pop()]
            while stack:
                e = stack.pop()
                ring.add(e)
                for p in e.verts:
                    for f in p.link_edges:
                        if f in ends:
                            ends.remove(f)
                            stack.append(f)
            rings.append(list(ring))

        def middle(edges):
            verts = {p for e in edges for p in e.verts}
            return sum((p.co for p in verts), Vector()) / len(verts)

        for code in ('haunch', 'ankle'):
            loop = [e for e in bm.edges if e.is_boundary
                    and all(p[part] == PART[code] + off for p in e.verts)]
            center = middle(loop)
            ring = min(rings, key=lambda r: (middle(r) - center).length)
            res = bmesh.ops.bridge_loops(bm, edges=loop + ring)
            for f in res['faces']:
                f.smooth = True
            made += len(res['faces'])
    bmesh.update_edit_mesh(mesh.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    return made


def clean_bridge(mesh):
    """Collapses the thin bridge triangles (Collapse Edges).

    A cut loop has more vertices than the ring that it bridges to, so some bridge triangles have
    two loop vertices close together and a corner below `CUT_ANGLE`. When their edge along the
    loop is their shortest edge, it collapses to its middle. A long loop edge does not collapse:
    on the right haunch, such collapses ran on around the loop and pulled it into a knot. Gives
    the number of collapsed edges.
    """
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(mesh.data)
    part = bm.verts.layers.int['leg_part']
    loops = {PART[c] + off for c in ('haunch', 'ankle') for off in (0, 10)}
    tubes = {PART['tube'], PART['tube'] + 10}
    count = 0
    for _ in range(200):
        edge = None
        for f in bm.faces:
            codes = [p[part] for p in f.verts]
            if (sum(c in loops for c in codes) != 2 or not any(c in tubes for c in codes)
                    or min(math.degrees(c.calc_angle()) for c in f.loops) >= CUT_ANGLE):
                continue
            short = min(f.edges, key=lambda e: e.calc_length())
            if all(p[part] in loops for p in short.verts):
                edge = short
                break
        if edge is None:
            break
        bmesh.ops.collapse(bm, edges=[edge], uvs=True)
        count += 1
    for f in bm.faces:
        f.smooth = True
    bmesh.update_edit_mesh(mesh.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    return count


def leg_faces(bm, part):
    """Gives the new faces of the legs: the tube faces and the bridge faces."""
    return [f for f in bm.faces if all(p[part] > 0 for p in f.verts)
            and any(p[part] in (PART['tube'], PART['tube'] + 10) for p in f.verts)]


def uv_layout(mesh):
    """Gives the new leg faces their own material, a seam on each tube, and a new UV layout.

    The atlas of the source has many UV islands on each leg, so a UV transfer would cross island
    borders. The new faces get the material `polar-bear-legs`, Mark Seam along `SEAM_SPOKE` and one
    bridge edge at each end, Unwrap, and Pack Islands. `bake()` then fills its image.
    """
    mat = bpy.data.materials.get('polar-bear-legs') or bpy.data.materials.new('polar-bear-legs')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    image = bpy.data.images.get('polar-bear-legs') or bpy.data.images.new(
        'polar-bear-legs', LEG_TEXTURE, LEG_TEXTURE)
    tex = next((n for n in nodes if n.type == 'TEX_IMAGE'), None) or nodes.new('ShaderNodeTexImage')
    tex.image = image
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    nodes.active = tex
    if mat.name not in mesh.data.materials:
        mesh.data.materials.append(mat)
    index = list(mesh.data.materials).index(mat)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(mesh.data)
    part = bm.verts.layers.int['leg_part']
    spoke = bm.verts.layers.int['leg_spoke']
    faces = leg_faces(bm, part)
    tubes = (PART['tube'], PART['tube'] + 10)
    for f in bm.faces:
        f.select = False
    for f in faces:
        f.material_index = index
        f.select = True
    seams = {PART['tube']: SEAM_SPOKE, PART['tube'] + 10: (RING_VERTS - SEAM_SPOKE) % RING_VERTS}
    for e in bm.edges:
        a, b = e.verts
        if a[part] in tubes and b[part] in tubes:
            e.seam = a[spoke] == seams[a[part]] and b[spoke] == seams[b[part]]
    # One bridge edge at each tube end continues the seam to the cut loop.
    for p in bm.verts:
        if p[part] in tubes and p[spoke] == seams[p[part]]:
            out = [e for e in p.link_edges if e.other_vert(p)[part] not in tubes]
            if out:
                min(out, key=lambda e: e.calc_length()).seam = True
    bm.select_flush_mode()
    bmesh.update_edit_mesh(mesh.data)
    tools = bpy.context.scene.tool_settings
    sync = tools.use_uv_select_sync
    tools.use_uv_select_sync = True
    bpy.ops.uv.unwrap(method='ANGLE_BASED', margin=0.01)
    bpy.ops.uv.pack_islands(margin=0.01, rotate=True)
    tools.use_uv_select_sync = sync
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')
    return len(faces)


def bake(mesh, source):
    """Bakes the fur color of the source legs onto the image of the new leg faces.

    A copy of the mesh keeps only the new leg faces, so the bake writes only the image of
    `polar-bear-legs`. Cycles bakes the Diffuse Color from the source copy (Selected to Active).
    """
    scene = bpy.context.scene
    engine = scene.render.engine
    bpy.ops.object.select_all(action='DESELECT')
    target = mesh.copy()
    target.data = mesh.data.copy()
    target.name = 'polar-bear-leg-bake'
    scene.collection.objects.link(target)
    bm = bmesh.new()
    bm.from_mesh(target.data)
    part = bm.verts.layers.int['leg_part']
    keep = set(leg_faces(bm, part))
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in keep], context='FACES')
    bm.to_mesh(target.data)
    bm.free()
    target.data.materials.clear()
    target.data.materials.append(bpy.data.materials['polar-bear-legs'])
    for poly in target.data.polygons:
        poly.material_index = 0
    source.hide_set(False)
    source.hide_render = False
    source.select_set(True)
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 16
    scene.render.bake.margin = 8
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, use_selected_to_active=True,
                        cage_extrusion=0.02, max_ray_distance=0.06, margin=8)
    scene.render.engine = engine
    bpy.data.objects.remove(target, do_unlink=True)
    source.hide_render = True
    source.hide_set(True)
    image = bpy.data.images['polar-bear-legs']
    image.pack()
    return image


def transfer_normals(mesh, source):
    """Gives the new leg faces and the cut loops the custom normals of the source surface.

    A Data Transfer modifier copies the face corner normals of the nearest source face
    (interpolated) onto the vertices of the tubes, the bridges, and the cut loops.
    """
    group = part_group(mesh, 'retopo', [c + off for c in PART.values() for off in (0, 10)])
    mod = mesh.modifiers.new('normals', 'DATA_TRANSFER')
    mod.object = source
    mod.use_loop_data = True
    mod.data_types_loops = {'CUSTOM_NORMAL'}
    mod.loop_mapping = 'POLYINTERP_NEAREST'
    mod.vertex_group = group.name
    pa.apply_modifier(mesh, mod)
    mesh.vertex_groups.remove(mesh.vertex_groups['retopo'])


def atlas_strip(mesh):
    """Puts the leg image in the strip on top of the atlas, beside the arm image, so that the mesh
    keeps one material and one image (`pnpm rig-mesh` reads one base color texture).

    The strip of `polar-bear-arms.glb` is `LEG_TEXTURE` pixels high, and the arm image fills its
    first `LEG_TEXTURE` columns. The leg image goes into the next columns, which are black. The
    UVs of each leg face move to the place of its pixels, and the leg faces take the material of
    the source.
    """
    import numpy as np

    fur = mesh.data.materials[0]
    bsdf = next(n for n in fur.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node = bsdf.inputs['Base Color'].links[0].from_node
    atlas = node.image
    legs = bpy.data.images['polar-bear-legs']
    width, total = atlas.size
    size = legs.size[0]
    pixels = np.empty(width * total * 4, np.float32)
    atlas.pixels.foreach_get(pixels)
    pixels = pixels.reshape(total, width, 4)
    strip = pixels[total - size:, size:2 * size, :3]
    if strip.max() > 0.02:
        raise RuntimeError('The strip of the atlas is not free beside the arm image.')
    image_px = np.empty(size * size * 4, np.float32)
    legs.pixels.foreach_get(image_px)
    pixels[total - size:, size:2 * size] = image_px.reshape(size, size, 4)
    image = bpy.data.images.new('polar-bear-fur-legs', width, total)
    image.colorspace_settings.name = atlas.colorspace_settings.name
    image.pixels.foreach_set(pixels.ravel())
    image.pack()
    leg_index = list(mesh.data.materials).index(bpy.data.materials['polar-bear-legs'])
    uv = mesh.data.uv_layers.active.data
    for poly in mesh.data.polygons:
        if poly.material_index == leg_index:
            for li in poly.loop_indices:
                u, v = uv[li].uv
                uv[li].uv = ((size + u * size) / width, (total - size + v * size) / total)
        poly.material_index = 0
    mesh.data.materials.pop(index=leg_index)
    node.image = image
    return image


def rebuild_legs(mesh, fr, joints):
    """Replaces the faces of both legs with quad tubes, as a modeller does by hand.

    The steps: cut, clean the cut loops, model the tubes, Shrinkwrap, Bridge Edge Loops, clean
    the bridges, a new UV layout with its own material, a bake of the fur color, a transfer of the
    custom normals, and the place of the leg image in the atlas. The source copy then goes.
    """
    source, out = cut_and_tube(mesh, fr, joints)
    source.hide_set(False)
    wrap(mesh, source)
    out['bridge'] = bridge(mesh)
    out['bridge collapsed'] = clean_bridge(mesh)
    out['leg faces'] = uv_layout(mesh)
    bake(mesh, source)
    source.hide_set(False)
    transfer_normals(mesh, source)
    bpy.data.objects.remove(source, do_unlink=True)
    atlas_strip(mesh)
    bpy.context.view_layer.objects.active = mesh
    return out


def studio_points(mesh, fr):
    """Gives the place of each vertex in the units of the studio, as `write_weights()` of
    `polar_bear_arms.py` writes it."""
    rm = pa.rig_mesh()
    out = []
    for vert in mesh.data.vertices:
        p = rm['from_blender']([vert.co[:]])[0]
        out.append([round(float(p[0]) / fr.height, 7),
                    round((float(p[1]) - fr.floor) / fr.height, 7),
                    round(float(p[2]) / fr.height, 7)])
    return out


def write_weights(mesh, fr, config, path):
    """Writes the weights for `paintedWeights` of the config.

    Each vertex that the rebuild keeps takes its weights of `polar-bear-weights.json`, so that the
    arms, the trunk, and the head keep the weights of the arm session. Each new vertex of the legs
    and of the cut loops takes the automatic weights of Blender: the mesh is parented to the
    studio skeleton with automatic weights, then Limit Total 4 and Normalize All. The rig gives the
    leg bones the rule weights (`paintedLower` of the config).
    """
    import numpy as np

    with open(WEIGHTS) as f:
        old = json.load(f)
    bones = old['bones']
    points = studio_points(mesh, fr)
    kept = np.asarray(old['points'], float)
    rig = pa.add_skeleton(fr, config)
    pa.bind(mesh, rig)
    names = {g.index: g.name for g in mesh.vertex_groups}
    rows, new = [], 0
    for vert, point in zip(mesh.data.vertices, points):
        gaps = np.linalg.norm(kept - point, axis=1)
        k = int(np.argmin(gaps))
        if gaps[k] < 1e-5:
            rows.append(old['weights'][k])
            continue
        w = {names[g.group]: g.weight for g in vert.groups if g.weight > 0}
        rows.append([round(w.get(b, 0.0), 6) for b in bones])
        new += 1
    data = {'note': 'Weights of the polar bear with the rebuilt arms and legs '
                    '(tools/blender/polar_bear_legs.py): the weights of polar-bear-weights.json '
                    'for each kept vertex, and the automatic weights of Blender for each new '
                    'vertex. Points in the units of the studio.',
            'bones': bones, 'points': points, 'weights': rows}
    with open(path, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    return len(rows), new


def main():
    """Runs the steps of the session and writes the source mesh and the weights into the out dir
    (`assets/models/polar-bear/` by default)."""
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    out_dir = os.path.abspath(argv[0]) if argv else MODELS
    config = pa.load_config()
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    mesh = pa.import_mesh(SOURCE)
    fr = pa.Frame(mesh)
    out = rebuild_legs(mesh, fr, config['joints'])
    size = pa.export_source(mesh, os.path.join(out_dir, 'polar-bear-limbs.glb'))
    count, new = write_weights(mesh, fr, config,
                               os.path.join(out_dir, 'polar-bear-limbs-weights.json'))
    print('polar_bear_legs: %s' % json.dumps({str(k): v for k, v in out.items()}))
    print('polar_bear_legs: wrote polar-bear-limbs.glb (%d bytes) and the weights of %d vertices '
          '(%d new) into %s' % (size, count, new, out_dir))


if __name__ == '__main__':
    main()
