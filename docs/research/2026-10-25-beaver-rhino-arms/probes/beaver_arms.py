"""Builds the rebuilt arms of the beaver bassoonist that the round of 2026-10-25 tried and did not
ship.

The upper arm of `beaver.glb` joins the side of the trunk down to the elbow, so a cut at a right
angle to the bone finds a closed loop around the arm only at 0.9 of the upper arm
(`loops_probe.py`). This probe repeats the steps of `tools/blender/cat_arms.py` with the settings
of the beaver (`BEAVER`): a cut along the seam where the arm meets the trunk, a side wall of the
trunk under the arm, a quad tube with a flat inner side on the wall, the arms 1.5 times longer
(the arm factor of the user), automatic weights, and the Weight Paint fixes of the cat. It writes
`beaver-arms.glb`, `beaver-weights.json`, and the config of the rig (`config.json`, with the joints
of the longer arms, `armFactor` 1, `armSegments`, and no `cut` or `raise`) into the out dir. The
rig reads them with `pnpm rig-mesh beaver --check --set 'source=<dir>/beaver-arms.glb;...'` after
the same changes of the config.

The rig of these arms folded 15 faces of each arm in the arm gate (limit 8, 2 and 4 on `main`),
so the beaver keeps the faces of its mesh (`docs/research/2026-10-25-beaver-rhino-arms.md`).

Run it in a terminal from the root of the tree:

    Blender -b --factory-startup -P docs/research/2026-10-25-beaver-rhino-arms/probes/beaver_arms.py -- <out dir>
"""

import importlib.util
import json
import os
import sys

BLENDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..',
                       'tools', 'blender')

#: The arm factor of the user (`armFactor` of `tools/mesh-rigs/beaver.json`).
FACTOR = 1.5

#: The settings of the beaver, with the keys of `CAT` of `cat_arms.py`, in the units of the studio.
#: The trunk under the arm stands at |x| 0.187 at the height 0.49 and widens below it, so the
#: plane of the seam stands at 0.185 at the height of the armpit line and leans out below it.
BEAVER = {
    'config': None,
    'source': 'assets/models/beaver/beaver.glb',
    'folder': None,
    'factor': FACTOR,
    'slim': (1.0, 1.0),
    'cut': {'shoulder': 0.0, 'tilt': 0.0, 'wrist': 0.1},
    'zone': {'x': 0.15, 'radius': 0.08},
    'gap': 0.02,
    'upper': (0.45, 0.6, 0.75),
    'fore': 6,
    'texture': 512,
    'faces': 1200,
    'seam': {'x': 0.185, 'lean': 0.06, 'low': 0.47, 'reach': 0.06, 'edge': 0.57, 'armpit': 0.57,
             'lift': -0.004, 'rings': (0.15, 0.45), 'ruled': 1, 'ramp': 10, 'round': 3,
             'wrap': 0.012},
    'anchor': {'share': 0.2, 'reach': 0.05, 'crease': True},
}


def load(name):
    """Loads the module `name` of `tools/blender/` one time."""
    if name in sys.modules:
        return sys.modules[name]
    spec = importlib.util.spec_from_file_location(name, os.path.join(BLENDER, name + '.py'))
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def long_config(path):
    """Gives the beaver config with the joints of the arms that are `FACTOR` times longer, the arm
    factor 1, the arm segments, and no cut and no shape, as the trial rigged them."""
    with open(path) as f:
        c = json.load(f)
    j = c['joints']
    s, e = j['upper_arm_L']['head'], j['forearm_L']['head']
    t, w = j['forearm_twist_L']['head'], j['hand_L']['head']
    e2 = [s[i] + FACTOR * (e[i] - s[i]) for i in range(3)]
    t2 = [e2[i] + FACTOR * (t[i] - e[i]) for i in range(3)]
    w2 = [e2[i] + FACTOR * (w[i] - e[i]) for i in range(3)]
    move = [w2[i] - w[i] for i in range(3)]
    j['forearm_L']['head'], j['forearm_twist_L']['head'], j['hand_L']['head'] = e2, t2, w2
    for key in ('head', 'tail'):
        j['fingers_L'][key] = [j['fingers_L'][key][i] + move[i] for i in range(3)]
    c['armFactor'] = 1
    c['armSegments'] = {'helper': 0.04}
    for key in ('cut', 'raise', 'rootNormals'):
        c.pop(key, None)
    return c


def main():
    """Writes the config of the trial and runs the steps of `cat_arms.py` into the out dir."""
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if not argv:
        raise SystemExit('Usage: blender -b --factory-startup -P <this file> -- <out dir>')
    out_dir = os.path.abspath(argv[0])
    os.makedirs(out_dir, exist_ok=True)
    ca = load('cat_arms')
    va = ca.va
    config = os.path.join(out_dir, 'config.json')
    with open(config, 'w') as f:
        json.dump(long_config(os.path.join(va.ROOT, 'tools', 'mesh-rigs', 'beaver.json')), f,
                  indent=2)
    va.ANIMALS['beaver'] = dict(BEAVER, config=config, folder=out_dir)
    va.clear_scene()
    s = va.Session('beaver', out_dir)
    for step in ca.STEPS:
        print('%s: %s' % (step.__name__, step(s)))
    print('beaver_arms: wrote beaver-arms.glb and beaver-weights.json into %s' % out_dir)


if __name__ == '__main__':
    main()
