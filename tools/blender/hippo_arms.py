"""Replays the Blender session that rebuilt the arms of the hippo bassist.

On 2026-10-24 the user allowed loop edges, retopology, and extra bones for the arm and wrist twist
("add loop edges and retopology and additional bones if needed to address them"). The hanging
upper arm of the hippo mesh joins the side of the trunk down to about y 0.45, near the elbow, so
the inner side of the arm lay inside the plane `armSplit` of the old rig, and the rig kept it on
the trunk: a small dark slit opened on the belly beside the right arm at rest. The session of
2026-10-25 therefore used the steps of `cat_arms.py` and `fox_arms.py`, in the live Blender
through MCP, with an image after each step:

1. Import the mesh of the user and Merge by Distance.
2. Cut each arm along the seam where it meets the trunk and at the wrist, delete the thin ears at
   the edge of the hole (`step_trim()`), fill a side wall of the trunk under the arm, triangulate
   the trunk faces at the cut loops (`step_triangulate()`), collapse the thin faces at the cut
   loops, and model a quad tube with a flat inner side on the wall.
3. Shrinkwrap, Bridge Edge Loops, Beautify Faces, Collapse Edges on the thin bridge faces and on
   the thin faces of the seam (`step_clean_seam()`), UV, the bake of the fur color, and the
   transfer of the custom normals.
4. Make each arm `factor` times longer (`armFactor` 1.5 of the rig config before), mend the UVs
   of the trunk faces that span two islands (`step_torn_uv()`), put the arm image in a strip of
   the atlas, give the inner side the fur color of the trunk, and write `hippo-arms.glb`.
5. Add the studio skeleton with the arm segments and the helpers, parent with automatic weights,
   and paint the fixes of `cat_arms.step_paint()` with the Weight Paint tools. Then take the lower
   trunk bones off the arm vertices (`step_tube_trunk()`), and the wrist helper off the paws and
   the hand off the rings before the wrist (`step_wrist()`). The fingers keep half of their weight
   (`fox_arms.step_fingers()`), as the rule `weights.fingers` of the old rig.
6. Write the weights for `paintedWeights` of the config (`hippo-weights.json`).

The faces of the paws, the trunk, the legs, and the head stay the faces of the user. The file of
the user, `hippo.glb`, stays unchanged.

Run it in a terminal from the root of the tree:

    Blender -b --factory-startup -P tools/blender/hippo_arms.py -- [<out dir>] [--views <dir>]

A run gives the same `hippo-arms.glb` and `hippo-weights.json`, byte for byte. `--views <dir>`
writes the check images of `cat_arms.look()`. In the live Blender of MCP, `run_steps()` runs one
step at a time.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cat_arms as ca  # noqa: E402
import fox_arms as fa  # noqa: E402

va = ca.va

#: The settings of the hippo, with the keys of `CAT` of `cat_arms.py`, in the units of the studio
#: (1 unit from the soles to the top of the ears). The crease where the arm meets the trunk lies at
#: |x| 0.173 to 0.199 from y 0.46 to 0.56, so the plane of the seam stands at |x| 0.172 at y 0.5
#: and leans out 0.15 for each unit down: with |x| 0.205 and 0.19, flaps of the inner side of the
#: arm stayed on the trunk. The forearm is about 0.07 units thick, so `seam.reach` is 0.075, and
#: the plane `seam.under` keeps the round belly under it on the trunk. The socket reaches the top of
#: the shoulder, 0.17 units from the shoulder joint (`seam.hole`). The bridge faces of the shoulder
#: lie up to 0.02 units inside the source surface, so the bake rays reach 0.08 units (`bake`): with
#: 0.017, black patches stayed on the shoulders. The elbow rings stand 0.026 units from the joint
#: (0.022 folded more), and the weights take 4 rounds of Smooth (`seam.ramp`): 10 rounds spread
#: the weights of the short arm over four segments at the elbow. Only the rings of the upper arm
#: take the chest share of the anchor (`anchor.rings`): the forearm lies near the side wall too.
#: The wrist cut lies 0.25 of the paw from the wrist joint, parallel to the last ring
#: (`cut_planes()`): with 0.15, 0.2, and 0.3, the cut left a thin face on a paw or at a socket
#: that folded in each play sample (`docs/research/2026-10-28-hippo-arm.md`).
HIPPO = {
    'config': 'tools/mesh-rigs/hippo.json',
    'source': 'assets/models/hippo/hippo.glb',
    'folder': 'assets/models/hippo',
    'factor': 1.5,
    'slim': (1.0, 1.0),
    'cut': {'shoulder': 0.0, 'tilt': 0.0, 'wrist': 0.25},
    'zone': {'x': 0.22, 'radius': 0.09},
    'gap': 0.026,
    'upper': (0.45, 0.6),
    'fore': 6,
    'texture': 512,
    'bake': (0.03, 0.08),
    'faces': 1200,
    'seam': {'x': 0.172, 'lean': 0.15, 'low': 0.45, 'reach': 0.075, 'edge': 0.49, 'armpit': 0.5,
             'under': {'x': 0.2, 'lean': 0.5}, 'hole': 0.25,
             'lift': -0.004, 'rings': (), 'ruled': 0, 'ramp': 4, 'round': 3,
             'wrap': 0.03},
    'anchor': {'share': 0.4, 'reach': 0.08, 'crease': True, 'rings': 3},
    'fingers': 0.5,
    'tubeTrunk': 0.0,
    'handRings': 1,
}
va.ANIMALS['hippo'] = HIPPO


#: The cut planes of `violin_arms.py`, which `cut_planes()` changes for the hippo.
CUT_PLANES = va.cut_planes


def cut_planes(s, line, side):
    """Gives the cut planes of `violin_arms.cut_planes()`, with the wrist plane at a right angle to
    the axis of the last ring of the tube.

    The last ring stands at the wrist joint at a right angle to the line halfway between the
    forearm and the paw (`violin_arms.arm_stations()`). The plane of the wrist cut of
    `violin_arms.py` stands at a right angle to the paw. The paw of the hippo is short and turns
    about 35 degrees from the forearm, and the wrist is about 0.06 units thick, so that plane
    crossed the plane of the last ring on the inner side of the turn. The bridge from the ring to
    the cut loop then went back toward the elbow, as a lip with a dark slit under it, and the play
    showed it as a pale band or a dark slit around the wrist (user, 2026-10-28: "also the hippo's
    arm is messed up"). With the two planes parallel, the bridge is an even band of the width
    `cut.wrist` of the paw.
    """
    shoulder, _ = CUT_PLANES(s, line, side)
    _, e, w, t = line
    axis = ((w - e).normalized() + (t - w).normalized()).normalized()
    return [shoulder, (w + axis * ((t - w).length * s.spec['cut']['wrist']), axis)]


def step_cut(s):
    """Cuts each arm as `cat_arms.step_cut()` does, with the wrist plane of `cut_planes()`."""
    va.cut_planes = cut_planes
    try:
        return ca.step_cut(s)
    finally:
        va.cut_planes = CUT_PLANES


#: The tip corner, in degrees, below which `step_trim()` deletes an ear of the hole of the seam.
TRIM_ANGLE = 30.0


def step_trim(s):
    """Deletes the thin ears at the edge of each hole of the seam (Delete Faces), after the cut.

    The plane of the seam passes near the top of the round belly under the arm, so the cut leaves
    long thin trunk faces whose tips point up into the hole. The side wall then filled them into
    dark teeth under the forearm. While a trunk face has two edges on the hole that meet at a tip
    corner below `TRIM_ANGLE`, the face goes. Gives the number of deleted faces of each side.
    """
    import bmesh
    import math
    bpy = va.bpy
    mesh, fr = s.mesh, s.fr
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(mesh.data)
    part = bm.verts.layers.int['arm_part']
    out = {}
    for side in (1, -1):
        a, e, _, _ = va.arm_line(s, side)
        reach = s.units(s.spec['seam']['hole'])
        count = 0
        for _ in range(200):
            ear = None
            for f in bm.faces:
                rim = [x for x in f.edges if x.is_boundary]
                if len(rim) < 2 or any(p[part] for p in f.verts):
                    continue
                for c in f.loops:
                    p = c.vert
                    if (p.co.x * side > 0 and va.seg_distance(p.co, a, e) < reach
                            and sum(x in rim for x in p.link_edges) == 2
                            and math.degrees(c.calc_angle()) < TRIM_ANGLE):
                        ear = f
                        break
                if ear:
                    break
            if ear is None:
                break
            bmesh.ops.delete(bm, geom=[ear], context='FACES')
            count += 1
        out[side] = count
    bmesh.update_edit_mesh(mesh.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    return out


def step_triangulate(s):
    """Triangulates the trunk faces with four or more corners at the cut loops (Triangulate
    Faces, Beauty), before the clean of the cut loops, so that the clean also collapses the thin
    triangles that it makes.

    The Bisect of the seam leaves quads whose corner on the cut is 180 degrees. The export split
    such a quad of the right side wall along the wrong diagonal into a triangle of no area, which
    the fold probe counted as a fold in each sample. Beauty takes the other diagonal. Gives the
    number of the triangulated faces.
    """
    import bmesh
    bpy = va.bpy
    mesh = s.mesh
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(mesh.data)
    part = bm.verts.layers.int['arm_part']
    faces = [f for f in bm.faces if len(f.verts) > 3 and any(p[part] for p in f.verts)]
    bmesh.ops.triangulate(bm, faces=faces, quad_method='BEAUTY', ngon_method='BEAUTY')
    bmesh.update_edit_mesh(mesh.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    return len(faces)


def step_clean_seam(s):
    """Collapses the thin faces at the top arc, the armpit line, and the run of the side wall
    (Collapse Edges), after the clean of the bridge.

    The clean of the bridge collapses edges of the top arc, so the trunk faces beside them can get
    thin, and the Fill of the side wall leaves thin faces where the wall run has close vertices.
    Face 355 at the top of the right arc (a corner of 5.4 degrees) folded in each play sample.
    While a face with a vertex of these loops has a corner below `wind_arms.CUT_ANGLE`, its
    shortest edge with a vertex of the loops collapses to its middle, and the merged vertex keeps
    the larger code. Gives the number of collapsed edges.
    """
    import bmesh
    import math
    bpy = va.bpy
    wa = fa.wa
    mesh = s.mesh
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(mesh.data)
    part = bm.verts.layers.int['arm_part']
    loops = {ca.PART[c] + off for c in ('shoulder', 'armpit', 'wall') for off in (0, 10)}
    tubes = {ca.PART['tube'], ca.PART['tube'] + 10}
    count = 0
    for _ in range(200):
        thin = next((f for f in bm.faces if any(p[part] in loops for p in f.verts)
                     and not any(p[part] in tubes for p in f.verts)
                     and min(math.degrees(c.calc_angle()) for c in f.loops) < wa.CUT_ANGLE), None)
        if thin is None:
            break
        edge = min((e for e in thin.edges if any(p[part] in loops for p in e.verts)),
                   key=lambda e: e.calc_length())
        ends = list(edge.verts)
        code = max(p[part] for p in ends)
        bmesh.ops.collapse(bm, edges=[edge], uvs=True)
        for p in ends:
            if p.is_valid:
                p[part] = code
        count += 1
    bmesh.update_edit_mesh(mesh.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    return count


#: The share of the largest UV stretch of the faces away from the cuts above which
#: `step_torn_uv()` mends the UVs of a face at a cut loop.
TORN_UV = 1.5


def step_torn_uv(s):
    """Mends the UVs of the trunk faces at the cut loops that span two UV islands of the atlas.

    Collapse Edges at the cut loops (`fox_arms.step_clean_cut()`) can move a vertex, with the UV of
    one island, into a face of another island. Such a face then shows the whole texture between
    the islands as thin light stripes at the top of the shoulder. The UV stretch of a face is the
    largest UV length of its edges for each unit of their length. While a face at a cut loop has
    more than `TORN_UV` times the largest stretch of the faces away from the cuts, its corner
    farthest from the others in UV takes the mean UV of the other corners (UV Editor, Snap to the
    mean). Gives the limit and the number of mended corners.
    """
    import bmesh
    mesh, fr = s.mesh, s.fr
    bm = bmesh.new()
    bm.from_mesh(mesh.data)
    uv = bm.loops.layers.uv.active
    part = bm.verts.layers.int['arm_part']
    arm_index = list(mesh.data.materials).index(va.bpy.data.materials[va.arm_material(s)])

    def stretch(f):
        out = 0.0
        corners = list(f.loops)
        for k, c in enumerate(corners):
            d = corners[(k + 1) % len(corners)]
            length = (c.vert.co - d.vert.co).length / fr.height
            if length > 1e-6:
                out = max(out, (c[uv].uv - d[uv].uv).length / length)
        return out

    trunk = [f for f in bm.faces if f.material_index != arm_index]
    limit = TORN_UV * max(stretch(f) for f in trunk if not any(p[part] for p in f.verts))
    count = 0
    for f in trunk:
        if not any(p[part] for p in f.verts):
            continue
        for _ in range(len(f.loops)):
            if stretch(f) <= limit:
                break
            corners = list(f.loops)
            far = max(corners, key=lambda c: sum((c[uv].uv - d[uv].uv).length for d in corners))
            rest = [c[uv].uv for c in corners if c is not far]
            far[uv].uv = sum(rest, rest[0] * 0) / len(rest)
            count += 1
    bm.to_mesh(mesh.data)
    bm.free()
    mesh.data.update()
    return round(limit, 2), count


#: The trunk bones that `step_tube_trunk()` takes off the vertices of the arms. The chest stays,
#: because the anchor of `cat_arms.anchor()` gives the tube near the side walls a chest share.
TUBE_TRUNK = ('hips', 'spine', 'spine1')


def step_tube_trunk(s):
    """Lowers the lower trunk bones on the vertices of the arms to the share `tubeTrunk` of the
    animal (Weight Paint Levels with that gain on each group of `TUBE_TRUNK`, or Remove From Group
    for 0, then Normalize All), after the paint.

    The Smooth of `cat_arms.step_paint()` averages the first rings of the tube with the trunk
    vertices of the socket outside the mask, so the back of the first ring took 0.6 to 0.8 of the
    spine and spine1. In the rig, a vertex mixes the rule weights by its share of the lower bones,
    so the back of the ring stayed with the trunk while the bow arm turned forward, and the back of
    the arm root swung out as a dark flap from behind. Gives the number of vertices.
    """
    import bmesh
    mesh = s.mesh
    keep = s.spec.get('tubeTrunk', 0.0)
    bm = bmesh.new()
    bm.from_mesh(mesh.data)
    layer = bm.verts.layers.int['arm_part']
    island = {p.index for off in (0, 10) for p in ca.arm_verts(s, bm, layer, off)}
    bm.free()
    va.paint_mode(mesh, lambda p: p.index in island)
    groups = mesh.vertex_groups
    if keep > 0:
        for name in TUBE_TRUNK:
            if name in groups:
                groups.active_index = groups[name].index
                va.bpy.ops.object.vertex_group_levels(group_select_mode='ACTIVE', gain=keep)
    else:
        va.remove_from(mesh, TUBE_TRUNK)
    va.bpy.ops.object.vertex_group_normalize_all(group_select_mode='BONE_DEFORM',
                                                 lock_active=False)
    va.bpy.ops.object.mode_set(mode='OBJECT')
    mesh.data.use_paint_mask_vertex = False
    return len(island)


def step_wrist(s):
    """Takes the wrist helper off the paws (Remove From Group of `wrist_L` and `wrist_R` on the
    vertices of the paw and of the wrist loop, then Normalize All), after the paint.

    The automatic weights gave the paw a mean wrist helper share of about 0.26, so the paw turned
    only in part with the hand, and the left paw went over 1.5 cm into the neck of the contrabass
    in 39.9% of the play samples. The rings of the tube keep the helper: without it on the forearm,
    a face of the left forearm folded in nearly each play sample. Gives the number of vertices.
    """
    import bmesh
    mesh = s.mesh
    data = mesh.data
    part = [a.value for a in data.attributes['arm_part'].data]
    bm = bmesh.new()
    bm.from_mesh(data)
    layer = bm.verts.layers.int['arm_part']
    island = {p.index for off in (0, 10) for p in ca.arm_verts(s, bm, layer, off)}
    bm.free()
    tubes = (ca.PART['tube'], ca.PART['tube'] + 10)
    chosen = {i for i in island if part[i] not in tubes}
    va.paint_mode(mesh, lambda p: p.index in chosen)
    va.remove_from(mesh, ('wrist_L', 'wrist_R'))
    va.bpy.ops.object.vertex_group_normalize_all(group_select_mode='BONE_DEFORM',
                                                 lock_active=False)
    va.bpy.ops.object.mode_set(mode='OBJECT')
    ring = [a.value for a in data.attributes['arm_ring'].data]
    last = len(s.axes[1]) - s.spec.get('handRings', len(s.axes[1]))
    tube = {i for i in island if part[i] in tubes and ring[i] < last}
    va.paint_mode(mesh, lambda p: p.index in tube)
    va.remove_from(mesh, ('hand_L', 'hand_R'))
    va.bpy.ops.object.vertex_group_normalize_all(group_select_mode='BONE_DEFORM',
                                                 lock_active=False)
    va.bpy.ops.object.mode_set(mode='OBJECT')
    data.use_paint_mask_vertex = False
    return len(chosen)


def step_weights(s):
    """Writes the weights file (`cat_arms.step_weights()`), with the note of this session."""
    count = ca.step_weights(s)
    path = os.path.join(s.out_dir, 'hippo-weights.json')
    with open(path) as f:
        data = json.load(f)
    data['note'] = ('Weights of the hippo with the rebuilt arms, painted in Blender on 2026-10-25 '
                    '(tools/blender/hippo_arms.py): automatic weights and Weight Paint fixes. '
                    'Points in the units of the studio.')
    with open(path, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    return count


#: The steps of the session: the steps of `cat_arms.py`, with the clean of the cut loops after the
#: side wall, the clean of the bridge after Beautify Faces, and the share of the fingers after the
#: paint, as in `fox_arms.py`, and the weights file above. The belly step of the cat
#: (`cat_arms.step_belly()`, 2026-10-27) is not a step of the hippo session: the hippo has no
#: `belly` rule, and the step stopped the replay with a KeyError.
STEPS = tuple(out for step in ca.STEPS
              for out in {ca.step_cut: (step_cut, step_trim),
                          ca.step_wall: (ca.step_wall, step_triangulate, fa.step_clean_cut),
                          ca.step_beautify: (ca.step_beautify, fa.step_clean_bridge,
                                             step_clean_seam),
                          ca.step_shape: (ca.step_shape, step_torn_uv),
                          ca.step_belly: (),
                          ca.step_paint: (ca.step_paint, step_tube_trunk, step_wrist,
                                          fa.step_fingers),
                          ca.step_weights: (step_weights,)}.get(step, (step,)))


def run_steps(s, first=0, last=len(STEPS)):
    """Runs the steps from `first` up to `last` (not included), and prints the result of each."""
    for step in STEPS[first:last]:
        print('%s: %s' % (step.__name__, step(s)))


def main():
    """Runs the steps and writes `hippo-arms.glb` and `hippo-weights.json` into the out dir
    (`assets/models/hippo` by default)."""
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if '--views' in argv:
        k = argv.index('--views')
        ca.VIEWS = os.path.abspath(argv[k + 1])
        os.makedirs(ca.VIEWS, exist_ok=True)
        del argv[k:k + 2]
    out_dir = os.path.abspath(argv[0]) if argv else None
    va.clear_scene()
    s = va.Session('hippo', out_dir)
    run_steps(s)


if __name__ == '__main__':
    main()
