"""Replays the Blender session that rebuilt the arms of the elephant timpanist.

On 2026-10-24 the user allowed loop edges, retopology, and extra bones for the arm and wrist
twist: "add loop edges and retopology and additional bones if needed to address them". The long
faces of the A-pose arms of `elephant-apose.glb` showed dark slits and shards on both upper arms in
each moment of the timpanist. This script repeats the steps of `wind_arms.py` with the settings of
the elephant (`ELEPHANT`):

1. Import the mesh of the user and Merge by Distance.
2. Replace the faces of each arm from the shoulder line to the wrist with a quad tube, wrap it onto
   the source arm, bridge it to the trunk and to the paw, beautify the bridge triangles, and
   collapse the thin faces at the cut loops and under each armpit (`cleanPit`). Then make the
   inner front of each upper arm a little flatter (`step_flatten()`), because the thick upper arm
   went 2.9 cm into the round belly in the ready pose of the timpani.
3. Give the new arm faces a UV layout, bake the fur color of the source arm, and transfer the
   custom normals of the source surface.
4. Keep the length and the cross-section of the arms (`factor` 1, `slim` 1), put the arm image in
   a strip of the atlas, and write `elephant-arms.glb`.
5. Add the studio skeleton with the arm segments and the helpers, parent with automatic weights,
   and paint the fixes with the Weight Paint tools.
6. Write the weights for `paintedWeights` of the config (`elephant-weights.json`).

The faces of the paws, the trunk, the legs, and the head stay the faces of the user. The file of
the user, `elephant-apose.glb`, stays unchanged. The settings and the variants that failed are in
`docs/research/2026-10-25-elephant-arms.md`.

Run it in a terminal from the root of the tree:

    Blender -b --factory-startup -P tools/blender/elephant_arms.py -- [<out dir>]

In the live Blender of MCP, `run_steps()` runs one step at a time.
"""

import importlib.util
import json
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))


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

#: The settings of the elephant, with the keys of `ANIMALS` of `violin_arms.py` and
#: `wind_arms.py`, in the units of the studio (1 unit from the soles to the skull top). The arm is
#: about 0.1 units thick, so a cut plane with a tilt crossed the first ring, and a wrist cut at 0.1
#: or 0.2 of the paw turned bridge faces over: `tilt` is 0 and `wrist` 0.3. The elbow rings stand
#: `gap` from the joint, and the elbow helper of the config spans twice that length. The root
#: Smooth spans the top of the shoulder, because its long faces folded in each pose. `flatten`
#: moves the inner front of each upper arm 0.009 units toward its axis, along the mean direction
#: of the corners that went into the belly. The move 0.008 left the right upper arm 1.5 cm in the
#: belly at one sample, and 0.010 folded 7 faces of the left arm in the check of `rig-mesh` (4 with
#: no flatten, `docs/research/2026-10-25-thick-arm-depth.md`).
ELEPHANT = {
    'config': 'tools/mesh-rigs/elephant.json',
    'source': 'assets/models/elephant/elephant-apose.glb',
    'folder': 'assets/models/elephant',
    'factor': 1.0,
    'slim': (1.0, 1.0),
    'cut': {'shoulder': 0.4, 'tilt': 0.0, 'wrist': 0.3},
    'zone': {'x': 0.12, 'radius': 0.09},
    'gap': 0.026,
    'wristGap': 0.016,
    'cleanPit': {'x': (0.12, 0.2), 'y': (0.5, 0.6)},
    'upper': (0.52, 0.62),
    'fore': 6,
    'texture': 512,
    'faces': 600,
    'paint': {'trunk': {'x': 0.14, 'y': (0.3, 0.55)}, 'root': {'x': (0.11, 0.24),
                                                               'y': (0.5, 0.75)}},
    'flatten': {'along': (0.55, 0.8), 'dir': (-0.538, -0.368, 0.759), 'cone': 25.0,
                'move': 0.009, 'size': 0.05},
}


def step_flatten(s):
    """Makes the inner front of each upper arm a little flatter, where it meets the round belly in
    the ready pose of the timpani (`flatten` of `ELEPHANT`).

    The tube vertices of the upper arm from `along[0]` to `along[1]` of its length, whose direction
    from the arm axis lies within `cone` degrees of `dir`, are selected. `dir` is in the axes of the
    studio for the left arm, and the right arm mirrors it. Translate moves them `move` units toward
    the arm axis, with Proportional Editing (Smooth falloff, Connected Only) of the size `size`, so
    that the near rings follow a part of the move. The arm keeps a round outline with no dent.
    Gives the number of the selected vertices.
    """
    spec = s.spec.get('flatten')
    if not spec:
        return 0
    mesh = s.mesh
    bpy.context.view_layer.objects.active = mesh
    if mesh.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    cone = math.cos(math.radians(spec['cone']))
    count = 0
    for side, off in ((1, 0), (-1, 10)):
        # The edit mode of the other side makes new mesh data, so read the codes again.
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
            p.select = (attr[p.index].value == va.PART['tube'] + off
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


def step_weights(s):
    """Writes the weights file as `step_weights()` of `wind_arms.py` does, with a note that names
    this script."""
    count = wa.step_weights(s)
    path = os.path.join(s.out_dir, s.animal + '-weights.json')
    with open(path) as f:
        data = json.load(f)
    data['note'] = ('Weights of the elephant with the rebuilt arms, painted in Blender on '
                    '2026-10-25 (tools/blender/elephant_arms.py): automatic weights and Weight '
                    'Paint fixes. Points in the units of the rig config.')
    with open(path, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    return count


#: The steps of the session: the steps of `wind_arms.py`, with the flatter inner upper arms after
#: the clean bridge, and the weights file above.
STEPS = tuple(
    out for step in wa.STEPS
    for out in {wa.step_weights: (step_weights,),
                wa.step_clean_bridge: (wa.step_clean_bridge, step_flatten)}.get(step, (step,)))


def run_steps(s, first=0, last=len(STEPS)):
    """Runs the steps from `first` up to `last` (not included), and prints the result of each."""
    for step in STEPS[first:last]:
        print('%s: %s' % (step.__name__, step(s)))


def main():
    """Runs the steps of the session and writes the source mesh and the weights into the out dir
    (`assets/models/elephant/` by default)."""
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    out_dir = os.path.abspath(argv[0]) if argv else None
    wa.ANIMALS['elephant'] = ELEPHANT
    va.clear_scene()
    s = wa.Session('elephant', out_dir)
    run_steps(s)
    print('elephant_arms: wrote elephant-arms.glb and elephant-weights.json into %s' % s.out_dir)


if __name__ == '__main__':
    main()
