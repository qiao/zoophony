"""Calibrates the QuadriFlow target of an animal: QuadriFlow does not give the quad count that it
is asked for (on the polar bear 1.16 to 1.31 times the target), so the remesh gate rejected
every seed. This tool measures the ratio of the count to the target on the field of the animal,
and finds the target that puts the counts of the seeds in the band of the gate.

Run with Blender (the CLI `python3 studio calibrate <animal> --quads` runs it; the intake must
have run):

    blender -b --factory-startup --python studio/quads.py -- <animal> [--out DIR]
        [--seeds 3,1,5] [--targets 700,780]

1. Build the dense mesh of the field (the stage "field" of studio/build.py).
2. Remesh it at the current target (facets.quadriflow_target, or facets.quads) with each seed.
3. The ratio is the median of count / target. The new target is facets.quads / ratio.
4. Remesh at the new target with each seed, and count the seeds in the band of the gate. The
   new target wins only when it puts more seeds in the band than the current target.

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
    body = template.Body(cfg, views, cfg.role.bind)
    parts = body.parts('bind', small=False)
    field, origin, step = field_on_grid(parts, cfg.field.step)
    verts, quads = surface_nets(field, origin, step)
    height_px = views['front']['height_px']
    seeds = [int(s) for s in args.seeds.split(',') if s] or list(cfg.facets.seeds)
    print(f'dense mesh {len(verts)} vertices in {time.time() - t0:.1f} s')

    lo, hi = band(cfg)
    current = cfg.facets.quadriflow_target or cfg.facets.quads
    targets = [int(t) for t in args.targets.split(',') if t] or [current]
    counts = {}
    for target in targets:
        counts[target] = {s: count(cfg, body, parts, verts, quads, s, target, height_px)
                          for s in seeds}
        print(f'target {target}: ' + ', '.join(f'seed {s} {n}' for s, n in counts[target].items()))
    result = {'animal': cfg.animal.id, 'quads': cfg.facets.quads, 'band': [lo, hi],
              'seeds': seeds, 'counts': {str(t): c for t, c in counts.items()}}
    if not args.targets:
        ratio = statistics.median(n / current for n in counts[current].values())
        target = int(round(cfg.facets.quads / ratio))
        if target != current:
            counts[target] = {s: count(cfg, body, parts, verts, quads, s, target, height_px)
                              for s in seeds}
            print(f'target {target}: '
                  + ', '.join(f'seed {s} {n}' for s, n in counts[target].items()))
        inside = [s for s, n in counts[target].items() if lo <= n <= hi]
        before = [s for s, n in counts[current].items() if lo <= n <= hi]
        if len(inside) <= len(before):
            target, inside = current, before
        result.update(counts={str(t): c for t, c in counts.items()}, current=current,
                      ratio=round(ratio, 4), target=target, in_band=inside,
                      in_band_before=before)
        print(f'ratio of count to target {ratio:.3f}: target {current} -> {target}; seeds in '
              f'the band {lo} to {hi}: {len(before)} of {len(seeds)} -> {len(inside)} of '
              f'{len(seeds)}' + (' (the current target stays)' if target == current else ''))
    folder = os.path.join(cfg.paths.out, 'calibrate')
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, 'quads.json'), 'w') as f:
        json.dump(result, f, indent=1)
        f.write('\n')
    print(f'wrote {os.path.join(folder, "quads.json")} in {time.time() - t0:.1f} s')


if __name__ == '__main__':
    main()
