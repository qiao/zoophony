"""Replays the Blender session that rebuilt the arms of the elephant timpanist.

On 2026-10-24 the user allowed loop edges, retopology, and extra bones for the arm and wrist
twist: "add loop edges and retopology and additional bones if needed to address them". The long
faces of the A-pose arms of `elephant-apose.glb` showed dark slits and shards on both upper arms in
each moment of the timpanist. This script repeats the steps of `wind_arms.py` with the settings of
the elephant (`ELEPHANT`):

1. Import the mesh of the user and Merge by Distance.
2. Replace the faces of each arm from the shoulder line to the wrist with a quad tube, wrap it onto
   the source arm, bridge it to the trunk and to the paw, beautify the bridge triangles, and
   collapse the thin faces at the cut loops and under each armpit (`cleanPit`).
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
import os
import sys

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
#: Smooth spans the top of the shoulder, because its long faces folded in each pose.
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
}


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


#: The steps of the session: the steps of `wind_arms.py`, with the weights file above.
STEPS = tuple(step_weights if step is wa.step_weights else step for step in wa.STEPS)


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
