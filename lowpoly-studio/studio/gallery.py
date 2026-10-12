"""Builds the props gallery of an animal: one prop of each kind of the prop library
(props/gallery.toml), sized from the body of the animal, as a GLB with one node for each prop.

Run with Blender (the CLI `python3 studio props <animal>` does it):

    blender -b --factory-startup --python studio/gallery.py -- <animal> [--out DIR] [--role R]

--role: the role whose bind pose sizes the props (default: the role of the animal when it is
seated, else "pianist"): the seat, the keyboard, and the desk come from the seated body.

Writes <out>/gallery.glb (each prop is a node of its own beside the others, the moving keys of
the piano are nodes under it, and the clip "keys" presses them in turn) and <out>/gallery.json
(each prop with its kind, its nodes, its size, its triangle count, and the sizes that came from
the body). The page viewer/props.html shows them, and studio/shoot.mjs props renders
<out>/props.png.
"""

import argparse
import importlib
import json
import os
import sys

STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, STUDIO)

import bpy  # noqa: E402
import numpy as np  # noqa: E402

from props import strings as strings_kind  # noqa: E402
from studio import bake, config, export, mesh, props  # noqa: E402
from studio.config import Section  # noqa: E402
from studio.field import load_profiles  # noqa: E402

# The gap between two props of the gallery, in animal heights.
GAP = 0.25

# The keys that the clip "keys" presses in turn (a C major scale and two black keys), and the
# time of each press.
SCALE = ('C4', 'Cs4', 'D4', 'Ds4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5')
STEP = 0.3


def parse_args():
    """Reads the arguments after the '--' of the Blender command line."""
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser(prog='studio/gallery.py')
    ap.add_argument('animal')
    ap.add_argument('--out', default=None, help='the output folder (default: <animal>/out/props)')
    ap.add_argument('--role', default=None, help='the role whose bind pose sizes the props')
    return ap.parse_args(argv)


def sizes_of(body, pr, role):
    """Returns the resolved sizes of a prop (for gallery.json)."""
    if pr.kind == 'piano':
        c = props.piano_sizes(body, pr, role)
    elif pr.kind == 'bench':
        c = props.bench_sizes(body, pr, role)
    elif pr.kind == 'chair':
        c = props.chair_sizes(body, pr, role)
    elif pr.kind == 'music_stand':
        c = props.stand_sizes(body, pr, role)
    else:
        c = {'length': props.string_length(body, pr)}
    return {k: (round(v, 4) if isinstance(v, float) else v) for k, v in c.items()
            if k not in ('colors', 'name')}


def bow_nodes(body, pr):
    """Lays a bow on the floor of the gallery: along x, the hair down, a little up at the tip."""
    length = props.string_length(body, pr)
    v, f, fc = strings_kind.bow_mesh(length, props.string_colors(pr.strings))
    a = np.radians(12.0)
    rot = np.array([[np.cos(a), -np.sin(a), 0.0], [np.sin(a), np.cos(a), 0.0], [0.0, 0.0, 1.0]])
    v = v @ rot.T + np.array([-0.5 * length, 0.03, 0.0])
    return [props.node(pr.name, (v, f, fc), pr.name)]


def main():
    """Builds the gallery."""
    args = parse_args()
    role_name = args.role
    if role_name is None:
        own = config.load(args.animal)
        role_name = own.animal.role if own.role.role.stance == 'seated' else 'pianist'
    cfg = config.load(args.animal, None, role_name)
    out = os.path.abspath(args.out or os.path.join(cfg.paths.out, 'props'))
    os.makedirs(out, exist_ok=True)
    template = importlib.import_module(f'templates.{cfg.animal.template}')
    body = template.Body(cfg, load_profiles(cfg.paths.measure), cfg.role.bind)
    items = config.load_props(os.path.join(STUDIO, 'props', 'gallery.toml'))
    mesh.clear_scene()
    nodes_all, info, x = [], [], 0.0
    for pr in items:
        role = Section(props=(pr,), rig=cfg.role.rig, bind=cfg.role.bind)
        if pr.attach.bone == 'scene':
            moving = SCALE if pr.kind == 'piano' else ()
            nodes, _ = props.scene_nodes(body, role, moving)
        else:
            nodes = bow_nodes(body, pr)
        roots = [n for n in nodes if n['parent'] is None]
        lo = np.min([n['verts'].min(axis=0) for n in roots], axis=0)
        hi = np.max([n['verts'].max(axis=0) for n in roots], axis=0)
        shift = np.array([x - lo[0], 0.0, -0.5 * (lo[2] + hi[2])])
        for n in nodes:
            n['verts'] = n['verts'] + shift
            n['origin'] = n['origin'] + shift
        x += (hi[0] - lo[0]) + GAP
        nodes_all += nodes
        info.append({'name': pr.name, 'kind': pr.kind, 'attach': pr.attach.bone,
                     'nodes': [n['name'] for n in nodes],
                     'size': [round(float(v), 4) for v in hi - lo],
                     'triangles': int(sum(len(n['faces']) for n in nodes)),
                     'sizes': sizes_of(body, pr, role)})
    center = 0.5 * (x - GAP)
    for n in nodes_all:
        n['verts'] = n['verts'] - np.array([center, 0.0, 0.0])
        n['origin'] = n['origin'] - np.array([center, 0.0, 0.0])
    mats = {pr.name: export.make_material(pr.name, pr.material) for pr in items}
    objs = export.add_prop_nodes(nodes_all, mats)

    # The clip "keys": the scale pressed in turn, each key down and up in STEP seconds.
    piano = next(pr for pr in items if pr.kind == 'piano')
    keys = {k['name']: k for k in props.piano_keys(body, Section(props=(piano,), rig=cfg.role.rig,
                                                                  bind=cfg.role.bind))}
    fps = cfg.role.clips.fps
    frames = int(round(len(SCALE) * STEP * fps)) + 1
    poses = []
    for i in range(frames):
        t = i / fps
        pose = {}
        for j, name in enumerate(SCALE):
            u = (t - j * STEP) / STEP
            press = float(np.sin(np.pi * u)) if 0.0 <= u <= 1.0 else 0.0
            a = -np.radians(keys[name]['angle']) * press
            pose[f'{piano.name}_key_{name}'] = (np.array([np.cos(0.5 * a), np.sin(0.5 * a), 0.0,
                                                          0.0]), np.zeros(3), 1.0)
        poses.append(pose)
    bake.write_node_actions(objs, 'keys', poses)
    bpy.context.scene.render.fps = fps
    glb = os.path.join(out, 'gallery.glb')
    export.export_glb(glb)
    with open(os.path.join(out, 'gallery.json'), 'w') as f:
        json.dump({'animal': cfg.animal.id, 'role': cfg.animal.role, 'glb': 'gallery.glb',
                   'props': info}, f, indent=2)
        f.write('\n')
    for p in info:
        print(f'prop {p["name"]:12s} {p["kind"]:12s} size {p["size"]} triangles {p["triangles"]}')
    print(f'wrote {glb}')


if __name__ == '__main__':
    main()
