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

#: The preview views: (name, azimuth, elevation in degrees, close). The azimuth 0 is the front,
#: and 90 is the right side. The front, the right side, and the back are the views of the
#: reference images `fox-views.png` and `rabbit-views.png`. A close view looks at the head.
VIEWS = [
    ('front', 0, 6, False),
    ('side', 90, 6, False),
    ('back', 180, 6, False),
    ('head', 20, 15, True),
]

#: The chair of the seated previews, as `CHAIR` of `models/props.ts`: the seat height, the seat
#: width and depth, the top of the back, the height of the top rail, and the side of a leg, in
#: meters. The back is at +z.
CHAIR = {'seat': 0.35, 'width': 0.42, 'depth': 0.4, 'back': 0.85, 'rail': 0.1, 'leg': 0.035}

#: The color of the chair of the previews.
CHAIR_COLOR = '#c8902f'

#: The bench of the piano of the previews, as `PIANO_BENCH` of `models/instruments/piano.ts`:
#: the width, the depth, and the seat height, in meters.
BENCH = {'width': 0.75, 'depth': 0.35, 'seat': 0.45}

#: The color of the bench of the previews.
BENCH_COLOR = '#15120f'


def chair_boxes():
    """Gives the boxes of the chair of the previews, in the model axes."""
    c = CHAIR
    x = c['width'] / 2 - c['leg'] / 2
    z = c['depth'] / 2 - c['leg'] / 2
    leg = c['leg']
    boxes = [((0, c['seat'] - 0.02, 0), (c['width'], 0.04, c['depth']))]
    for px in (-x, x):
        boxes.append(((px, (c['seat'] - 0.04) / 2, -z), (leg, c['seat'] - 0.04, leg)))
        boxes.append(((px, c['back'] / 2, z), (leg, c['back'], leg)))
    boxes.append(((0, c['back'] - c['rail'] / 2, z), (c['width'] - 2 * leg, c['rail'], 0.025)))
    return boxes


def bench_boxes():
    """Gives the boxes of the bench of the previews, in the model axes."""
    b = BENCH
    x = b['width'] / 2 - 0.03
    z = b['depth'] / 2 - 0.03
    legs = b['seat'] - 0.06
    boxes = [((0, b['seat'] - 0.03, 0), (b['width'], 0.06, b['depth']))]
    for px in (-x, x):
        for pz in (-z, z):
            boxes.append(((px, legs / 2, pz), (0.04, legs, 0.04)))
    return boxes


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
            if name == 'seated':
                kit.show_boxes('chair', chair_boxes(), CHAIR_COLOR)
            if name == 'bench':
                kit.show_boxes('bench', bench_boxes(), BENCH_COLOR)
            figure = (0, 0, rig.point('headCenter').z * 0.55)
            for view, azimuth, elevation, close in VIEWS:
                image = os.path.join(out_dir, f'{species}.{name}.{view}.png')
                target = rig.point('headCenter') if close else figure
                kit.render(
                    image, target, 0.9 if close else 3.6, azimuth, elevation, lens=50 if close else 85,
                )


main()
