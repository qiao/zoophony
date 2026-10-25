"""Builds the rebuilt arms of the rhino tubist that the round of 2026-10-25 tried and did not ship.

On 2026-10-24 the user allowed loop edges, retopology, and extra bones for the arm and wrist
twist: "add loop edges and retopology and additional bones if needed to address them". On `main`
of 2026-10-25, the rhino tubist showed large black slots and wedges under both arms. This probe
repeats the steps of `tools/blender/wind_arms.py` with the settings of a thick arm (`RHINO`), as
`tools/blender/elephant_arms.py` does for the elephant, with three more Weight Paint fixes:
the paw beyond the wrist joint loses the wrist helper (`step_paw()`), the neck loses the
clavicles (`step_neck()`), and the weights file names this probe. It writes `rhino-arms.glb`
and `rhino-weights.json` into the out dir, and the rig reads them with
`pnpm rig-mesh rhino --check --set 'source=<dir>/rhino-arms.glb;paintedWeights=<dir>/rhino-weights.json;armSegments={"helper":0.052}'`
after the removal of `upperTwist` from the config.

The rig of these arms put the upper arms 3.5 cm into the belly (2.0 cm on `main`), and the right
paw grasped the valves in 0% of the play samples of `pnpm wind-grip tubist` (97% on `main`), so
the rhino keeps the faces of its mesh (`docs/research/2026-10-25-beaver-rhino-arms.md`).

Run it in a terminal from the root of the tree:

    Blender -b --factory-startup -P docs/research/2026-10-25-beaver-rhino-arms/probes/rhino_arms.py -- <out dir>
"""

import importlib.util
import json
import os
import sys

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..',
                    'tools', 'blender')


def load_wind_arms():
    """Loads `wind_arms.py` from the folder of this script as the module `wind_arms`."""
    if 'wind_arms' in sys.modules:
        return sys.modules['wind_arms']
    path = os.path.join(HERE, 'wind_arms.py')
    spec = importlib.util.spec_from_file_location('wind_arms', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    sys.modules['wind_arms'] = module
    return module


wa = load_wind_arms()
va = wa.va

#: The settings of the rhino, with the keys of `ANIMALS` of `violin_arms.py` and `wind_arms.py`,
#: in the units of the studio (1 unit from the soles to the top of the ears). The arm is about
#: 0.13 units thick and 0.11 long, thicker than the arm of the elephant, so the cut planes have no
#: tilt and the wrist cut lies at 0.3 of the paw. The right arm has a closed loop around it only
#: from 0.4 of the upper arm in the zone of the cut. A cut at 0.3 in a wider zone folded 9 faces of
#: the right arm in the arm gate (limit 8). The elbow rings stand `gap` from the joint, and the
#: elbow helper of the config spans twice that length.
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
}


def step_paw(s):
    """Paints one more fix on the paws with the Weight Paint tools: Remove From Group of the wrist
    helper and the forearm segments on the vertices of each paw beyond the wrist cut.

    The paw of the rhino is short, so the automatic weights put about half of each paw on the
    wrist helper, which turns only half of the way from the forearm to the paw. The palm and the
    finger tips then left the valves of the tuba (`pnpm wind-grip tubist`). After the fix, the paw
    hangs on the paw and the finger bones, and the wrist rings of the tube keep the helper. A
    vertex with no weight left takes the paw bone (Assign). Gives the number of paw vertices.
    """
    import bmesh
    import bpy

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
    `neck.x`. The automatic weights spread the clavicles up the neck to the chin. The rig then
    gave these vertices less of the rule weights of the neck and the head, the chin moved, and the
    head height H fell from 0.416 m to 0.411 m, which moved each hold of the tuba. A vertex with
    no weight left takes the neck (Assign). Gives the number of vertices."""
    import bpy

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
    data['note'] = ('Weights of the rhino with the rebuilt arms, painted in Blender on 2026-10-25 '
                    '(docs/research/2026-10-25-beaver-rhino-arms/probes/rhino_arms.py): automatic weights and Weight Paint fixes. '
                    'Points in the units of the rig config.')
    with open(path, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    return count


#: The steps of the session: the steps of `wind_arms.py`, with the paw fix after the paint and the
#: weights file above.
STEPS = tuple(out for step in wa.STEPS
              for out in {wa.step_paint: (wa.step_paint, step_paw, step_neck),
                          wa.step_weights: (step_weights,)}.get(step, (step,)))


def run_steps(s, first=0, last=len(STEPS)):
    """Runs the steps from `first` up to `last` (not included), and prints the result of each."""
    for step in STEPS[first:last]:
        print('%s: %s' % (step.__name__, step(s)))


def main():
    """Runs the steps of the session and writes the source mesh and the weights into the out dir."""
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if not argv:
        raise SystemExit('Usage: blender -b --factory-startup -P <this file> -- <out dir>')
    out_dir = os.path.abspath(argv[0])
    wa.ANIMALS['rhino'] = RHINO
    va.clear_scene()
    s = wa.Session('rhino', out_dir)
    # The config of main has no arm segments: the probe gives the session the helper of
    # twice the elbow gap.
    s.config['armSegments'] = {'helper': 0.052}
    run_steps(s)
    print('rhino_arms: wrote rhino-arms.glb and rhino-weights.json into %s' % s.out_dir)


if __name__ == '__main__':
    main()
