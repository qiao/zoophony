"""Writes the facts of a rigged GLB body that `pnpm glb-init` needs, as JSON (design 4.4).

    blender -b --factory-startup --python tools/blender/inspect_glb.py -- <in.glb> <out.json>

The JSON holds the height of the soles and of the top, the head of each joint in the rest pose,
the welded vertices, the triangles, and the median sRGB color of the base color texture on each
triangle. It keeps the axes and the units of Blender: +x is the left side of the animal, -y is
the front, and +z is up. `tools/glb-init.ts` proposes the config of `pnpm rig-body` from it.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import rig_body  # noqa: E402


def main():
    rest = sys.argv[sys.argv.index('--') + 1 :]
    if len(rest) != 2:
        raise SystemExit('Usage: blender -b --python inspect_glb.py -- <in.glb> <out.json>')
    source, out_path = rest

    ob, heads = rig_body.load(source)
    colors = rig_body.face_colors(ob, rig_body.base_color_image(ob))
    out = {
        'floor': min(v.co.z for v in ob.data.vertices),
        'top': max(v.co.z for v in ob.data.vertices),
        'heads': {name: [round(c, 6) for c in head] for name, head in heads.items()},
        'vertices': [[round(c, 6) for c in v.co] for v in ob.data.vertices],
        'faces': [list(p.vertices) for p in ob.data.polygons],
        'colors': [[round(float(c), 4) for c in color] for color in colors],
    }
    with open(out_path, 'w') as f:
        json.dump(out, f)
    print(f'inspect_glb: {len(out["vertices"])} vertices, {len(out["faces"])} faces, {len(heads)} joints')


main()
