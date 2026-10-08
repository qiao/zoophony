"""Builds the sculpt of one species in Blender (design 4.4).

Usage:

    blender -b --factory-startup --python tools/blender/build_sculpt.py -- \\
        <rig.json> <out-dir> [--render]

The rig file comes from `node tools/sculpt-rig.ts`. `node tools/build-sculpt.ts <species>` runs
this script and packs its output. The script loads the recipe of the species (for example
`fox_red.py` for `fox-red`). It builds the body above the legs one time, from the first stance,
and the legs of each stance. It writes `<out-dir>/<species>.json` in the model axes. With
`--render`, it also writes preview images `<out-dir>/<species>.<stance>.<view>.png`.
"""

import importlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import kit  # noqa: E402

#: The preview views: (name, azimuth, elevation in degrees, close). The azimuth 0 is the front.
#: A close view looks at the head.
VIEWS = [
    ('front', 25, 22, False),
    ('side', 75, 15, False),
    ('back', 200, 20, False),
    ('head', 20, 15, True),
]


def main():
    args = sys.argv[sys.argv.index('--') + 1:]
    rig_path, out_dir = args[0], args[1]
    render = '--render' in args
    with open(rig_path) as f:
        data = json.load(f)
    species = data['species']
    recipe = importlib.import_module(species.replace('-', '_'))
    os.makedirs(out_dir, exist_ok=True)

    # The body comes from the first stance. In each stance, it moves with the hips.
    kit.reset_scene()
    stances = list(data['stances'])
    first = kit.Rig(data, stances[0])
    body = recipe.build_body(first)
    legs = {name: recipe.build_legs(kit.Rig(data, name)) for name in stances}
    regions = recipe.regions(first)
    path = os.path.join(out_dir, f'{species}.json')
    kit.export(path, species, regions, body, legs)
    for name in stances:
        count = sum(len(part.bm.faces) for part in body + legs[name])
        print(f'{species} {name}: {count} triangles')

    if render:
        for name in stances:
            kit.reset_scene()
            rig = kit.Rig(data, name)
            move = rig.bone('hips') - first.bone('hips')
            kit.show([kit.moved(part, move) for part in body] + legs[name], regions)
            figure = (0, 0, rig.point('headCenter').z * 0.55)
            for view, azimuth, elevation, close in VIEWS:
                image = os.path.join(out_dir, f'{species}.{name}.{view}.png')
                target = rig.point('headCenter') if close else figure
                kit.render(image, target, 0.9 if close else 2.3, azimuth, elevation)


main()
