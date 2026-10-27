"""Replays the Blender session that rebuilt the arms of the rhino tubist.

On 2026-10-26 the user said: "the rhino's arms are stretched / twisted in unnatural ways". The
A-pose mesh `rhino-apose.glb` had long thin faces along each forearm, and the rig had only two
bones along the forearm: each one took half of a paw turn of up to 169°, so the skin of the
forearm collapsed into a twisted band. The user allowed loop edges, retopology, and extra bones
for the arm and wrist twist on 2026-10-24. This script repeats the steps of `wind_arms.py` with
the settings of the rhino (`RHINO`), as `bear_arms.py` does for the bear:

1. Import the mesh of the user and Merge by Distance.
2. Replace the faces of each arm from the shoulder line to the wrist with a quad tube, wrap it onto
   the source arm, bridge it to the trunk and to the paw, beautify the bridge triangles, and
   collapse the thin faces at the cut loops and under each armpit.
3. Give the new arm faces a UV layout, and bake the fur color of the source arm. Then make the
   inner side of each upper arm a little flatter (`step_flatten()` of `elephant_arms.py`),
   because the thick upper arm goes into the round belly when the elbow points down. Then
   transfer the custom normals of the source surface. The flatten comes after the bake, because
   the bake casts its rays from 0.006 units out of the tube (`bear_arms.py`).
4. Keep the length and the cross-section of the arms (`factor` 1, `slim` 1), put the arm image in
   a strip of the atlas, and write `rhino-apose-arms.glb`.
5. Add the studio skeleton with the arm segments and the helpers, parent with automatic weights,
   and paint the fixes with the Weight Paint tools: the fixes of `wind_arms.py`, the paws off the
   wrist helper (`step_paw()`), and the neck off the clavicles (`step_neck()`).
6. Write the weights for `paintedWeights` of the config (`rhino-apose-weights.json`).

The faces of the paws, the trunk, the legs, and the head stay the faces of the user. The file of
the user, `rhino-apose.glb`, stays unchanged. The decisions are in
`docs/decisions/2026-10-26-fifth-review-rhino.md`.

Run it in a terminal from the root of the tree:

    Blender -b --factory-startup -P tools/blender/rhino_arms.py -- [<out dir>]

In the live Blender of MCP, `run_steps()` runs one step at a time.
"""

import importlib.util
import json
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))


def load_elephant_arms():
    """Loads `elephant_arms.py` from the folder of this script as the module `elephant_arms`. It
    loads `wind_arms.py` and `violin_arms.py` in turn."""
    if 'elephant_arms' in sys.modules:
        return sys.modules['elephant_arms']
    path = os.path.join(HERE, 'elephant_arms.py')
    spec = importlib.util.spec_from_file_location('elephant_arms', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    sys.modules['elephant_arms'] = module
    return module


ea = load_elephant_arms()
wa = ea.wa
va = ea.va

#: The name of the session: the files are `rhino-apose-arms.glb` and `rhino-apose-weights.json`,
#: because `rhino-arms.glb` is the copy of the first mesh of 2026-10-22.
NAME = 'rhino-apose'

#: The settings of the rhino, with the keys of `ANIMALS` of `violin_arms.py` and `wind_arms.py`,
#: in the units of the studio (1 unit from the soles to the top of the ears). The arm is about
#: 0.13 units thick and 0.11 units long, thicker than the arm of the elephant, so the cut planes
#: have no tilt and the wrist cut lies at 0.3 of the paw. The right arm has a closed loop around it
#: only from 0.4 of the upper arm (`loops-rhino.txt` of `docs/research/2026-10-25-beaver-rhino-arms/`).
#: The elbow rings stand `gap` from the joint, and the elbow helper of the config spans twice that
#: length. `paw` is the distance beyond the wrist joint from which a vertex of the paw leaves the
#: wrist helper (`step_paw()`), and `neck` the box of the neck that leaves the clavicles
#: (`step_neck()`). `flatten` moves the inner side of each upper arm toward its axis.
RHINO = {
    'config': 'tools/mesh-rigs/rhino.json',
    'source': 'assets/models/rhino/rhino-apose.glb',
    'folder': 'assets/models/rhino',
    'factor': 1.0,
    'slim': (1.0, 1.0),
    'cut': {'shoulder': 0.4, 'tilt': 0.0, 'wrist': 0.3},
    'zone': {'x': 0.12, 'radius': 0.09},
    'gap': 0.026,
    'wristGap': 0.016,
    'cleanPit': {'x': (0.12, 0.2), 'y': (0.48, 0.58)},
    'upper': (0.52, 0.64),
    'fore': 6,
    'texture': 512,
    'faces': 600,
    'paint': {'trunk': {'x': 0.14, 'y': (0.3, 0.52)}, 'root': {'x': (0.11, 0.24),
                                                               'y': (0.48, 0.72)},
              'neck': {'x': 0.12, 'y': 0.66}, 'paw': 0.004},
    'flatten': {'along': (0.35, 1.0), 'dir': (-0.62, -0.7, 0.35), 'cone': 50.0,
                'move': 0.015, 'size': 0.05},
}


def step_flatten(s):
    """Makes the inner lower side of each upper arm a little flatter, as `step_flatten()` of
    `elephant_arms.py` does, and also moves the vertices of the cut loop of the shoulder line in
    the cone. The vertices of the upper arm that went deepest into the belly with the elbows down
    lie from the cut loop (0.4 of the upper arm) to the elbow, on the inner lower side
    (`vertex-depth.ts` of `docs/research/2026-10-25-thick-arm-depth/probes/`). Gives the number of
    the selected vertices."""
    import math

    from mathutils import Vector

    codes = (va.PART['tube'], va.PART['shoulder'])
    spec = s.spec['flatten']
    mesh = s.mesh
    bpy.context.view_layer.objects.active = mesh
    if mesh.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    cone = math.cos(math.radians(spec['cone']))
    count = 0
    for side, off in ((1, 0), (-1, 10)):
        attr = mesh.data.attributes['arm_part'].data
        a, e, _, _ = va.arm_line(s, side)
        u = (e - a).normalized()
        x, y, z = spec['dir']
        inner = Vector((x * side, -z, y))
        inner = (inner - u * inner.dot(u)).normalized()
        for p in mesh.data.vertices:
            rel = p.co - a
            along = rel.dot(u) / (e - a).length
            radial = rel - u * rel.dot(u)
            p.select = (attr[p.index].value - off in codes
                        and spec['along'][0] <= along <= spec['along'][1]
                        and radial.normalized().dot(inner) >= cone)
            count += p.select
        mesh.data.update()
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.transform.translate(value=tuple(-inner * s.units(spec['move'])),
                                    orient_type='GLOBAL', use_proportional_edit=True,
                                    proportional_edit_falloff='SMOOTH',
                                    proportional_size=s.units(spec['size']),
                                    use_proportional_connected=True)
        bpy.ops.mesh.select_all(action='DESELECT')
        bpy.ops.object.mode_set(mode='OBJECT')
    return count


def step_paw(s):
    """Paints one more fix on the paws with the Weight Paint tools: Remove From Group of the wrist
    helper and the forearm segments on the vertices of each paw beyond the wrist joint.

    The paw of the rhino is short, so the automatic weights put about half of each paw on the
    wrist helper, which turns only half of the way from the forearm to the paw. The palm and the
    finger tips then left the valves of the tuba (`pnpm wind-grip tubist`). After the fix, the paw
    hangs on the paw and the finger bones, and the wrist rings of the tube keep the helper. A
    vertex with no weight left takes the paw bone (Assign). Gives the number of paw vertices.
    """
    import bmesh

    mesh = s.mesh
    bm = bmesh.new()
    bm.from_mesh(mesh.data)
    part = bm.verts.layers.int['arm_part']
    paw = set()
    for side, off in ((1, 0), (-1, 10)):
        _, _, w, t = va.arm_line(s, side)
        normal = (t - w).normalized()
        start = s.units(s.spec['paint']['paw'])
        for p in va.arm_verts(s, bm, part, off):
            if (p.co - w).dot(normal) > start:
                paw.add(p.index)
    bm.free()
    names = [f'{b}_{side}' for side in 'LR' for b in ('wrist', 'forearm_seg0', 'forearm_seg1',
                                                       'forearm_seg2', 'forearm_seg3')]
    va.paint_mode(mesh, lambda p: p.index in paw)
    va.remove_from(mesh, names)
    bpy.ops.object.mode_set(mode='OBJECT')
    for side, sign in (('L', 1), ('R', -1)):
        empty = [i for i in paw if mesh.data.vertices[i].co.x * sign > 0
                 and not any(g.weight > 0 for g in mesh.data.vertices[i].groups)]
        if empty:
            mesh.vertex_groups[f'hand_{side}'].add(empty, 1.0, 'REPLACE')
    va.paint_mode(mesh, lambda p: p.index in paw)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='BONE_DEFORM', lock_active=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    mesh.data.use_paint_mask_vertex = False
    return len(paw)


def step_neck(s):
    """Paints one more fix on the neck with the Weight Paint tools: Remove From Group of the
    clavicles and the arm bones on the vertices above the height `neck.y` and inside |x|
    `neck.x`. The automatic weights spread the clavicles up the neck to the chin, so that the chin
    moved with the arms, and the head height H of the body fell, which moved each hold of the
    tuba. A vertex with no weight left takes the neck (Assign). Gives the number of vertices."""
    mesh, fr, rule = s.mesh, s.fr, s.spec['paint']['neck']

    def inside(p):
        return (abs(p.co.x) / fr.height < rule['x']
                and (p.co.z - fr.floor) / fr.height > rule['y'])

    chosen = [p.index for p in mesh.data.vertices if inside(p)]
    names = ['clavicle_L', 'clavicle_R'] + va.arm_groups()
    va.paint_mode(mesh, inside)
    va.remove_from(mesh, names)
    bpy.ops.object.mode_set(mode='OBJECT')
    empty = [i for i in chosen if not any(g.weight > 0 for g in mesh.data.vertices[i].groups)]
    if empty:
        mesh.vertex_groups['neck'].add(empty, 1.0, 'REPLACE')
    va.paint_mode(mesh, inside)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='BONE_DEFORM', lock_active=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    mesh.data.use_paint_mask_vertex = False
    return len(chosen)


def step_weights(s):
    """Writes the weights file as `step_weights()` of `wind_arms.py` does, with a note that names
    this script."""
    count = wa.step_weights(s)
    path = os.path.join(s.out_dir, s.animal + '-weights.json')
    with open(path) as f:
        data = json.load(f)
    data['note'] = ('Weights of the rhino with the rebuilt arms, painted in Blender on 2026-10-27 '
                    '(tools/blender/rhino_arms.py): automatic weights and Weight Paint fixes. '
                    'Points in the units of the rig config.')
    with open(path, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    return count


#: The steps of the session: the steps of `wind_arms.py`, with the flatter inner upper arms after
#: the bake, the paw and the neck fixes after the paint, and the weights file above.
STEPS = tuple(
    out for step in wa.STEPS
    for out in {wa.step_weights: (step_weights,),
                wa.step_paint: (wa.step_paint, step_paw, step_neck),
                va.step_bake: (va.step_bake, step_flatten)}.get(step, (step,)))


def run_steps(s, first=0, last=len(STEPS)):
    """Runs the steps from `first` up to `last` (not included), and prints the result of each."""
    for step in STEPS[first:last]:
        print('%s: %s' % (step.__name__, step(s)))


def main():
    """Runs the steps of the session and writes the source mesh and the weights into the out dir
    (`assets/models/rhino/` by default)."""
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    out_dir = os.path.abspath(argv[0]) if argv else None
    wa.ANIMALS[NAME] = RHINO
    va.clear_scene()
    s = wa.Session(NAME, out_dir)
    # The config of main has no arm segments yet: the session gives the skeleton the helper of
    # twice the elbow gap, as the config of the rebuilt rig does.
    s.config.setdefault('armSegments', {'helper': 2 * RHINO['gap']})
    run_steps(s)
    print('rhino_arms: wrote %s-arms.glb and %s-weights.json into %s' % (NAME, NAME, s.out_dir))


if __name__ == '__main__':
    main()
