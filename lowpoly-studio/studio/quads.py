"""Calibrates the QuadriFlow target of an animal: QuadriFlow does not give the quad count that it
is asked for (on the polar bear 1.16 to 1.31 times the target), so the remesh gate rejected
every seed. This tool measures the ratio of the count to the target on the field of the animal,
and finds the target that puts the counts of the seeds in the band of the gate.

Run with Blender (the CLI `python3 studio calibrate <animal> --quads` runs it, after the
intake):

    blender -b --factory-startup --python studio/quads.py -- <animal> [--out DIR]
        [--seeds 3,1,5] [--targets 700,780]

1. Build the dense mesh of each field (the stage "field" of studio/build.py): the bind pose of
   the role, and the standing bind pose of the model build (roles/model/), because the same
   target remeshes both.
2. Remesh each field at the current target (facets.quadriflow_target, or facets.quads) with
   each seed.
3. The ratio is the median of count / target over the fields and the seeds. The new target is
   facets.quads / ratio.
4. Remesh at the new target, and count the (field, seed) pairs in the band of the gate. The new
   target wins only when it puts more pairs in the band than the current target. When a pair
   stays out, the tool prints the band that holds every pair.

Writes <out>/calibrate/quads.json with the counts of each target and seed, the ratio, the new
target, and the seeds in the band. --targets measures the given targets only (no new target).
"""

import argparse
import importlib
import json
import os
import statistics
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from studio import config, mesh, remesh  # noqa: E402
from studio.field import field_on_grid, load_profiles  # noqa: E402
from studio.sdf import surface_nets  # noqa: E402


def with_target(cfg, target):
    """Returns a copy of the config whose QuadriFlow target is target."""
    facets = config.Section(cfg.facets, quadriflow_target=int(target))
    return config.Section(cfg, facets=facets)


def count(cfg, body, parts, verts, quads, seed, target, height_px):
    """Remeshes the dense mesh at a target with one seed. Returns the quad count."""
    mesh.clear_scene()
    warp = remesh.Warp(cfg, body)
    _, _, _, info = remesh.quadriflow(with_target(cfg, target), warp, parts, verts, quads, seed,
                                      height_px)
    return info['quads']


def band(cfg):
    """Returns the quad band of the remesh gate: [low, high]."""
    q, g = cfg.facets.quads, cfg.facets.gate.quads
    return [round(q * (1.0 - g)), round(q * (1.0 + g))]


# The role pack of the model build (round B): its standing bind pose is a second field that the
# same QuadriFlow target remeshes.
MODEL_ROLE = 'model'


class Field:
    """The dense mesh of the field of one bind pose (a role) of the animal."""

    def __init__(self, animal, out, role, template, views):
        """Loads the config with the role and meshes its field (the stage "field")."""
        self.cfg = config.load(animal, out, role)
        self.role = self.cfg.animal.role
        self.body = template.Body(self.cfg, views, self.cfg.role.bind)
        self.parts = self.body.parts('bind', small=False)
        grid, origin, step = field_on_grid(self.parts, self.cfg.field.step)
        self.verts, self.quads = surface_nets(grid, origin, step)

    def counts(self, seeds, target, height_px):
        """Remeshes the field at a target with each seed. Returns {seed: quad count}."""
        return {s: count(self.cfg, self.body, self.parts, self.verts, self.quads, s, target,
                         height_px) for s in seeds}


def main():
    """Measures the counts, the ratio, and the new target, and writes the result."""
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser(prog='studio/quads.py')
    ap.add_argument('animal')
    ap.add_argument('--out', default=None)
    ap.add_argument('--seeds', default='', help='the seeds (default: facets.seeds)')
    ap.add_argument('--targets', default='', help='measure only these targets (a,b)')
    args = ap.parse_args(argv)

    t0 = time.time()
    cfg = config.load(args.animal, args.out)
    template = importlib.import_module(f'templates.{cfg.animal.template}')
    views = load_profiles(cfg.paths.measure)
    roles = [None]
    if os.path.exists(os.path.join(config.role_dir(MODEL_ROLE), 'role.toml')) \
            and cfg.animal.role != MODEL_ROLE:
        roles.append(MODEL_ROLE)
    fields = [Field(args.animal, args.out, r, template, views) for r in roles]
    height_px = views['front']['height_px']
    seeds = [int(s) for s in args.seeds.split(',') if s] or list(cfg.facets.seeds)
    print(f'dense meshes of the fields {", ".join(f.role for f in fields)} in '
          f'{time.time() - t0:.1f} s')

    lo, hi = band(cfg)
    current = cfg.facets.quadriflow_target or cfg.facets.quads
    counts = {}

    def measure(target):
        counts[target] = {f.role: f.counts(seeds, target, height_px) for f in fields}
        for role, found in counts[target].items():
            print(f'target {target}, field {role}: '
                  + ', '.join(f'seed {s} {n}' for s, n in found.items()))

    def inside(target):
        return [f'{role}:{s}' for role, found in counts[target].items()
                for s, n in found.items() if lo <= n <= hi]

    for target in [int(t) for t in args.targets.split(',') if t] or [current]:
        measure(target)
    result = {'animal': cfg.animal.id, 'quads': cfg.facets.quads, 'band': [lo, hi],
              'seeds': seeds, 'fields': [f.role for f in fields]}
    if not args.targets:
        ratios = {role: statistics.median(n / current for n in found.values())
                  for role, found in counts[current].items()}
        ratio = statistics.median(n / current for found in counts[current].values()
                                  for n in found.values())
        target = int(round(cfg.facets.quads / ratio))
        if target not in counts:
            measure(target)
        before = inside(current)
        if len(inside(target)) <= len(before):
            target = current
        after = inside(target)
        # The smallest band (a share of facets.quads) that holds every seed of every field.
        spread = max(abs(n / cfg.facets.quads - 1) for found in counts[target].values()
                     for n in found.values())
        result.update(current=current, ratio=round(ratio, 4),
                      field_ratios={k: round(v, 4) for k, v in ratios.items()}, target=target,
                      in_band=after, in_band_before=before, band_for_all=round(spread, 3))
        pairs = len(seeds) * len(fields)
        print(f'ratio of count to target {ratio:.3f} ('
              + ', '.join(f'{k} {v:.3f}' for k, v in ratios.items())
              + f'): target {current} -> {target}; seeds in the band {lo} to {hi}: '
              f'{len(before)} of {pairs} -> {len(after)} of {pairs}'
              + (' (the current target stays)' if target == current else ''))
        if len(after) < pairs:
            print(f'the band of facets.gate.quads that holds every seed of each field at the '
                  f'target {target}: {spread:.3f}')
    result['counts'] = {str(t): c for t, c in counts.items()}
    folder = os.path.join(cfg.paths.out, 'calibrate')
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, 'quads.json'), 'w') as f:
        json.dump(result, f, indent=1)
        f.write('\n')
    print(f'wrote {os.path.join(folder, "quads.json")} in {time.time() - t0:.1f} s')


if __name__ == '__main__':
    main()
