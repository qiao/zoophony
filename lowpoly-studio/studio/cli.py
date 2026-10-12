"""The command line of the low-poly studio. Run it from lowpoly-studio/:

    python3 studio build <animal> [--seed N | --all-seeds] [--jobs N] [--no-shots] [--out DIR]
                          [--until STAGE] [--clips a,b] [--no-cache] [--no-gate]
    python3 studio compare <animal> [--out DIR]
    python3 studio view <animal> [--port N]
    python3 studio new <animal> --sheet <png> [--role R] [--like A] [--force]
    python3 studio regress <animal> [--no-build] [--no-cache] [--write --from DIR]
    python3 studio fit <animal> [--rows]
    python3 studio report <animal> [--out DIR] [--measure] [--no-serve] [--port N]
    python3 studio schema [--role] [--readme]
    python3 studio cache info|clean [<animal>]

Needs python3 3.11 or later with Pillow, Blender 5.2 or later (BLENDER or `blender` on the
path), Node 24, and the packages of the repository (three, vite, @playwright/test).
"""

import argparse
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import time

from studio import checks, config, regress, viewer_config
from studio.config import STUDIO, ConfigError

BLENDER = os.environ.get('BLENDER', 'blender')

# The lines of the Blender log that the CLI shows.
SHOW = ('surface nets', 'remeshed', 'body:', 'bone heat', 'corrective', 'contact check',
        'fold repair', 'remesh gate', 'stopped after', 'cache:', 'wrote', 'Error', 'Traceback')

# The ports of the user's own servers, which the studio never takes.
RESERVED_PORTS = (5173, 5190)

# The Blender processes of the seed pool that run at the same time.
DEFAULT_JOBS = 4

# The largest size of the stage cache of one animal; a build deletes the least recently used
# entries above it.
CACHE_LIMIT = 2 * 2**30

INTAKE_CHECKLIST = '''Intake checklist (settle these with the user before the first build; each visual claim
needs a crop of the sheet):

 1. Sheet: front, side (facing right), back, and 3/4 front-right views of ONE pose, at one scale,
    on one ground line, on a plain background of one color, at least 500 px of figure height.
    The same head turn in all views. Arms a little away from the body (15 to 30 degrees), so
    the trunk width shows in the front mask.
 2. Extra crops: a face sheet at 2x (front and side of the head), and a facet crop of the chest
    and the belly at full size (the target of the facet size and contrast).
 3. Style decisions: the topology style (organic, mirrored triangles; the facet size of the
    crop), the light and the contrast, the palette (swatches of fur, belly, muzzle, nose, eyes,
    inner ear, claws), the eye style (outline, white rim, iris, highlight), the head shape, the
    snout, the ears, symmetry, and "no folds at any seed".
 4. The role and its stance (role packs under roles/), and the props.
 5. Measure the sheet in animal heights (the soles to the ear tops = 1) and fill each "TODO"
    of animal.toml: the trunk and the head lofts, the snout, the ears, the tail, the arm and
    the leg joints, the spine, the eyes, the nose, the mouth, the palette, and the rig places.
    `python3 studio schema` explains each field.
 6. Check the field without a mesh: python3 studio fit <animal> --rows (about 2 s).
 7. Build one seed: python3 studio build <animal> --seed 3, then look at out/compare/ and
    out/frames/, and read out/checks.json.
'''


def log(msg):
    """Prints a line at once."""
    print(msg, flush=True)


def fail(msg, code=1):
    """Prints an error and stops."""
    print(f'error: {msg}', file=sys.stderr, flush=True)
    sys.exit(code)


def load(animal, out=None):
    """Loads the config of an animal, or stops with the list of its problems."""
    try:
        return config.load(animal, out)
    except ConfigError as e:
        fail(str(e))


def find_node_bin(name):
    """Finds node_modules/.bin/<name> in lowpoly-studio/ or a folder above it."""
    d = STUDIO
    while True:
        p = os.path.join(d, 'node_modules', '.bin', name)
        if os.path.exists(p):
            return p
        parent = os.path.dirname(d)
        if parent == d:
            fail(f'no node_modules/.bin/{name} above {STUDIO} (run pnpm install in the repo root)')
        d = parent


def free_port():
    """Finds a free TCP port that is not a port of the user's own servers."""
    while True:
        with socket.socket() as s:
            s.bind(('127.0.0.1', 0))
            port = s.getsockname()[1]
        if port not in RESERVED_PORTS:
            return port


def blender_cmd(script, args):
    """Makes the command line of a Blender script in the background mode."""
    return [BLENDER, '-b', '--factory-startup', '--python-exit-code', '1', '--python',
            os.path.join(STUDIO, script), '--', *args]


def blender(script, args, log_path):
    """Runs a Blender script in the background mode. Returns (exit code, the log lines)."""
    with open(log_path, 'w') as f:
        code = subprocess.call(blender_cmd(script, args), stdout=f, stderr=subprocess.STDOUT,
                               cwd=STUDIO)
    with open(log_path) as f:
        return code, f.read().splitlines()


def _read_json(path):
    """Reads a JSON file, or returns None."""
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


class Timer:
    """Times the steps of a CLI command, with the source of each one (a run or the cache), and
    writes them to <out>/stages/pipeline.json."""

    def __init__(self):
        """Starts the clock."""
        self.t0 = time.time()
        self.steps = {}
        self.sources = {}
        self.stages = None

    def step(self, name, seconds, source=None):
        """Records the time of one step."""
        self.steps[name] = round(self.steps.get(name, 0.0) + seconds, 2)
        if source:
            self.sources[name] = source

    def run(self, name, fn, *args):
        """Runs fn(*args) and records its time."""
        t = time.time()
        result = fn(*args)
        self.step(name, time.time() - t)
        return result

    def blender(self, run):
        """Keeps the stage times of a Blender run (run.json) for the table."""
        self.stages = run

    def table(self, total):
        """Formats the times as a table: each step, the Blender stages inside the build, and the
        source of each one."""
        rows = []
        for name, seconds in self.steps.items():
            rows.append((name, seconds, self.sources.get(name, '')))
            if name == 'blender build' and self.stages:
                run = self.stages
                inside = sum(run['seconds'].values())
                for stage, sec in run['seconds'].items():
                    src = run['source'].get(stage, 'run')
                    if stage in run.get('ran_seconds', {}):
                        src += f' (the run took {run["ran_seconds"][stage]:.1f} s)'
                    rows.append((f'  {stage}', sec, src))
                rows.append(('  start and setup', round(max(seconds - inside, 0.0), 2), ''))
        rows.append(('total', total, ''))
        width = max(len(r[0]) for r in rows)
        out = [f'  {"step":{width}s}  {"seconds":>7s}  source']
        out += [f'  {n:{width}s}  {sec:7.2f}  {src}'.rstrip() for n, sec, src in rows]
        return '\n'.join(out)

    def write(self, cfg):
        """Writes the times, and prints the table."""
        total = round(time.time() - self.t0, 2)
        os.makedirs(cfg.paths.stages, exist_ok=True)
        with open(os.path.join(cfg.paths.stages, 'pipeline.json'), 'w') as f:
            json.dump({'steps': self.steps, 'sources': self.sources, 'total': total,
                       'blender_stages': self.stages}, f, indent=2)
        log('time:')
        log(self.table(total))


def cache_root(cfg):
    """Returns the cache folder of an animal."""
    return os.path.join(cfg.paths.root, 'cache')


def step_intake(cfg, use_cache=True):
    """Stage "intake": the masks and the row profiles of the sheet. With the cache, a sheet, a
    [sheet] config, and an intake code that did not change give the files of the cache.
    Returns the source ('run' or 'cache')."""
    from PIL import Image  # noqa: PLC0415 (Pillow is needed only here)

    from studio import cache, intake  # noqa: PLC0415
    log('[intake] masks and row profiles of the sheet views')
    if not use_cache:
        intake.intake(cfg)
        return 'run'
    store = cache.Store(cache_root(cfg))
    with open(cfg.paths.sheet, 'rb') as f:
        base = cache.digest(['intake', f.read(), sys.version, Image.__version__])
    hit = store.lookup('intake', base, {'cfg': cfg})
    if hit:
        meta, data = hit
        for rel, content in data['files'].items():
            path = os.path.join(cfg.paths.out, rel)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'wb') as f:
                f.write(content)
        log(f'  from the cache (the run took {meta["seconds"]:.1f} s)')
        return 'cache'
    rec = cache.Recorder('intake')
    t0 = time.time()
    with cache.recording(rec):
        intake.intake(cache.track(cfg, 'cfg'))
    seconds = time.time() - t0
    files = {}
    for rel in ['measure.json'] + [f'masks/{v}.{ext}' for v in cfg.sheet.views
                                   for ext in ('png', 'raw')]:
        with open(os.path.join(cfg.paths.out, rel), 'rb') as f:
            files[rel] = f.read()
    manifest = rec.manifest({'cfg': cfg})
    store.save('intake', base, cache.digest([base, manifest]),
               {'manifest': manifest, 'outputs': {}, 'seconds': round(seconds, 3), 'log': []},
               {'files': files})
    return 'run'


def build_args(cfg, seed, until=None, clips=None, use_cache=True, gate=True):
    """Makes the arguments of studio/build.py for one seed."""
    args = [cfg.paths.root, '--seed', str(seed), '--out', cfg.paths.out]
    if until:
        args += ['--until', until]
    if clips:
        args += ['--clips', clips]
    if not use_cache:
        args += ['--no-cache']
    if not gate:
        args += ['--no-gate']
    return args


def seed_result(cfg, seed, code, seconds, log_path):
    """Reads the outcome of the Blender build of one seed from its output folder.

    status: 'pass', 'gate' (the remesh gate stopped it), 'contacts' (a clip fails the contact or
    fold gate), or 'error' (Blender failed). The stats checks of the seed run here too.
    """
    run = _read_json(os.path.join(cfg.paths.stages, 'run.json'))
    gate = _read_json(os.path.join(cfg.paths.stages, 'remesh-gate.json'))
    out = {'seed': seed, 'status': 'error', 'pass': False, 'seconds': round(seconds, 1),
           'log': os.path.relpath(log_path, STUDIO), 'gate': gate, 'clips_failed': [],
           'checks_failed': [], 'stages': run and run['seconds'],
           'source': run and run['source'], 'stats': None}
    if code != 0 or not run:
        return out
    if run.get('stopped'):
        out['status'] = 'gate'
        return out
    stats = _read_json(cfg.paths.stats)
    if not stats:
        return out
    out['clips_failed'] = [k for k, v in stats['contacts']['clips'].items() if not v['pass']]
    out['stats'] = {k: stats[k] for k in ('body_triangles', 'median_edge_px', 'sliver_share',
                                          'folded_faces', 'fold_repairs') if k in stats}
    report = checks.run(cfg)
    out['checks_failed'] = report['failed']
    out['status'] = 'contacts' if out['clips_failed'] else 'pass'
    out['pass'] = not out['clips_failed']
    return out


def describe(result):
    """Formats the outcome of one seed in one line."""
    s = result['status']
    gate = result.get('gate') or {}
    if s == 'gate':
        bad = [c for c in gate.get('checks', []) if not c['pass']]
        why = ', '.join(f'{c["name"]} {c["value"]} (limit {c["limit"]})' for c in bad)
        return f'the remesh gate fails after {gate.get("after")}: {why}'
    if s == 'contacts':
        return f'the contact and fold check fails in {", ".join(result["clips_failed"])}'
    if s == 'error':
        return f'Blender failed (log: {result["log"]})'
    if s == 'cancelled':
        return 'cancelled (an earlier seed passed)'
    other = [c for c in result.get('checks_failed', []) if not c.startswith(('contact.',
                                                                              'folds.'))]
    return 'pass' + (f' (report checks that fail: {", ".join(other)})' if other else '')


def step_blender_build(cfg, seed, until=None, clips=None, use_cache=True, gate=True):
    """Stages "field" to "export" of one seed in one Blender run, in cfg.paths.out. Returns the
    outcome of the seed (seed_result)."""
    os.makedirs(cfg.paths.stages, exist_ok=True)
    for stale in (cfg.paths.glb, cfg.paths.stats):
        if os.path.exists(stale):
            os.remove(stale)
    log_path = os.path.join(cfg.paths.stages, f'blender-seed{seed}.log')
    t0 = time.time()
    code, lines = blender('studio/build.py', build_args(cfg, seed, until, clips, use_cache, gate),
                          log_path)
    for line in lines:
        if line.startswith(SHOW) or ' FAIL' in line:
            log(f'  {line}')
    if code != 0:
        fail(f'the Blender build of seed {seed} failed (log: {log_path})')
    return seed_result(cfg, seed, code, time.time() - t0, log_path)


def seed_folder(cfg, seed):
    """Returns the output folder of one seed of the seed pool."""
    return os.path.join(cfg.paths.out, 'seeds', str(seed))


def run_seeds(cfg, seeds, jobs, search=True, clips=None, use_cache=True, gate=True):
    """Builds seeds in a pool of Blender processes, each seed in out/seeds/<n>/.

    search: stop when the first seed in the order of seeds that passes is known (each seed
    before it failed), and cancel the other runs. Otherwise build every seed. Returns
    (the kept seed or None, the results in the order of seeds), and writes
    out/seeds/summary.json.
    """
    t0 = time.time()
    root = os.path.join(cfg.paths.out, 'seeds')
    cfgs = {}
    for s in seeds:
        folder = seed_folder(cfg, s)
        if os.path.exists(folder):
            shutil.rmtree(folder)
        os.makedirs(os.path.join(folder, 'stages'))
        shutil.copyfile(cfg.paths.measure, os.path.join(folder, 'measure.json'))
        cfgs[s] = load(cfg.paths.root, folder)
    log(f'[seeds] {len(seeds)} seeds {list(seeds)}, {jobs} at a time, '
        f'{"until the first seed that passes" if search else "all seeds"}')
    pending, running, results, kept = list(seeds), {}, {}, None
    while pending or running:
        while pending and len(running) < jobs:
            s = pending.pop(0)
            c = cfgs[s]
            log_path = os.path.join(c.paths.stages, f'blender-seed{s}.log')
            f = open(log_path, 'w')  # noqa: SIM115 (closed when the run ends)
            proc = subprocess.Popen(blender_cmd('studio/build.py',
                                                build_args(c, s, None, clips, use_cache, gate)),
                                    stdout=f, stderr=subprocess.STDOUT, cwd=STUDIO)
            running[s] = (proc, time.time(), f, log_path)
        time.sleep(0.1)
        for s, (proc, started, f, log_path) in list(running.items()):
            if proc.poll() is None:
                continue
            f.close()
            del running[s]
            results[s] = seed_result(cfgs[s], s, proc.returncode, time.time() - started, log_path)
            log(f'  seed {s}: {describe(results[s])}, {results[s]["seconds"]:.1f} s')
        if search:
            for s in seeds:
                if s not in results:
                    break
                if results[s]['pass']:
                    kept = s
                    break
            if kept is not None:
                for s, (proc, started, f, _) in running.items():
                    proc.terminate()
                    proc.wait()
                    f.close()
                    results[s] = {'seed': s, 'status': 'cancelled', 'pass': False,
                                  'seconds': round(time.time() - started, 1)}
                running.clear()
                pending.clear()
    if not search:
        kept = next((s for s in seeds if results[s]['pass']), None)
    ordered = [results[s] for s in seeds if s in results]
    summary = {'animal': cfg.animal.id, 'mode': 'search' if search else 'all', 'jobs': jobs,
               'seeds': list(seeds), 'kept': kept,
               'all_pass': all(r['pass'] for r in ordered) and len(ordered) == len(seeds),
               'wall_seconds': round(time.time() - t0, 1), 'results': ordered}
    with open(os.path.join(root, 'summary.json'), 'w') as f:
        json.dump(summary, f, indent=2)
    log(f'[seeds] {sum(r["pass"] for r in ordered)} of {len(ordered)} seeds pass in '
        f'{summary["wall_seconds"]:.1f} s (out/seeds/summary.json)')
    for r in ordered:
        cached = sum(v == 'cache' for v in (r.get('source') or {}).values())
        log(f'  seed {r["seed"]:>3}: {r["status"]:9s} {r["seconds"]:6.1f} s, '
            f'{cached} stages from the cache')
    return kept, ordered


def keep_seed(cfg, seed):
    """Copies the outputs of a seed of the pool into out/: the GLB, the stats, the stage folders
    (with stages/*-diagnostics/data.json), and the located failures (diag/). An output that the
    seed does not have is removed from out/, so no output of another build stays there."""
    src = seed_folder(cfg, seed)
    for name in (cfg.paths.glb, cfg.paths.stats):
        if os.path.exists(name):
            os.remove(name)
        if os.path.exists(os.path.join(src, os.path.basename(name))):
            shutil.copyfile(os.path.join(src, os.path.basename(name)), name)
    for folder in ('stages', 'diag'):
        dst = os.path.join(cfg.paths.out, folder)
        if os.path.exists(dst):
            shutil.rmtree(dst)
        if os.path.exists(os.path.join(src, folder)):
            shutil.copytree(os.path.join(src, folder), dst)


def step_shots(cfg):
    """Stage "shots": the compare with the sheet, the review frames, the viewer shot (one node
    process), and the review scripts of the role."""
    node = shutil.which('node') or fail('no node on the path')
    shoot = os.path.join(STUDIO, 'studio', 'shoot.mjs')
    log('[shots] compare, frames, viewer')
    code = subprocess.call([node, shoot, 'compare,frames,viewer', '--out', cfg.paths.out],
                           cwd=STUDIO)
    if code != 0:
        fail('node studio/shoot.mjs failed (see its message above)')
    for script in cfg.role.review.blender:
        rel = os.path.relpath(os.path.join(cfg.role.paths.root, script), STUDIO)
        log(f'[shots] {rel}')
        code, lines = blender(rel, [cfg.paths.root, '--out', cfg.paths.out],
                              os.path.join(cfg.paths.stages, f'review-{script}.log'))
        for line in lines:
            if line.startswith(('beat', 'wrote', 'Error', 'Traceback')):
                log(f'  {line}')
        if code != 0:
            fail(f'the review script {rel} failed')


def step_measures(cfg):
    """Stage "measures": the features (eyes, ears, nose, ...) and the shading of the renders,
    and the facets of the GLB."""
    from studio import measure_features, measure_shading  # noqa: PLC0415
    log(f'[measures] features ({", ".join(cfg.measure.features)}), shading, mesh facets')
    for mod in (measure_features, measure_shading):
        with open(os.devnull, 'w') as quiet:
            stdout, sys.stdout = sys.stdout, quiet
            try:
                mod.measure(cfg)
            finally:
                sys.stdout = stdout
    code, _ = blender('studio/measure_mesh.py', [cfg.paths.root, '--out', cfg.paths.out],
                      os.path.join(cfg.paths.stages, 'measure-mesh.log'))
    if code != 0:
        fail('studio/measure_mesh.py failed')


def step_checks(cfg):
    """Stage "checks": the structured report <out>/checks.json with the located failures
    (<out>/diag/), and the look report (<out>/report/index.html and review.png)."""
    from studio import report as look_report  # noqa: PLC0415 (Pillow is needed only here)
    report = checks.run(cfg)
    log(checks.summary(report))
    page = look_report.write(cfg, report)
    log(f'look report: {page}')
    return report


def prune_cache(cfg):
    """Deletes the least recently used cache entries of the animal above CACHE_LIMIT."""
    from studio import cache  # noqa: PLC0415
    root = cache_root(cfg)
    if os.path.isdir(root):
        n = cache.prune(root, CACHE_LIMIT)
        if n:
            log(f'cache: deleted {n} old entries (limit {CACHE_LIMIT / 2**30:.0f} GB)')


def run_build(cfg, seed=None, shots=True, until=None, clips=None, use_cache=True, gate=True,
              jobs=DEFAULT_JOBS, all_seeds=False):
    """Runs the whole build of an animal. Returns (the checks report or None with --until, the
    seed results of the pool or None).

    One seed (seed, or until): the Blender build runs in out/. Else the seed pool builds the
    seeds of facets.seeds in out/seeds/<n>/ and copies the kept seed into out/.
    """
    timer = Timer()
    os.makedirs(cfg.paths.out, exist_ok=True)
    t = time.time()
    source = step_intake(cfg, use_cache)
    timer.step('intake', time.time() - t, source)
    viewer_config.write(cfg)
    pool = None
    if seed is not None or until:
        s = seed if seed is not None else cfg.facets.seeds[0]
        log(f'[build] seed {s}')
        t = time.time()
        result = step_blender_build(cfg, s, until, clips, use_cache, gate)
        timer.step('blender build', time.time() - t)
        timer.blender(_read_json(os.path.join(cfg.paths.stages, 'run.json')))
        if until:
            timer.write(cfg)
            return None, None
        if not result['pass']:
            # studio-diag: the checks of the seed, so that its located failures are there.
            timer.run('checks', step_checks, cfg)
            timer.write(cfg)
            fail(f'seed {s}: {describe(result)}')
        log(f'  seed {s}: {describe(result)}')
    else:
        seeds = list(cfg.facets.seeds)
        t = time.time()
        kept, pool = run_seeds(cfg, seeds, jobs, not all_seeds, clips, use_cache, gate)
        timer.step('seed pool', time.time() - t)
        if kept is None:
            # studio-diag: the checks of the last seed, so that its located failures are there.
            ran = [r['seed'] for r in pool if r['status'] != 'cancelled']
            if ran:
                keep_seed(cfg, ran[-1])
                log(f'  the outputs of seed {ran[-1]} (the last seed) are in out/')
            timer.run('checks', step_checks, cfg)
            timer.write(cfg)
            fail(f'no seed of {seeds} passes the remesh gate and the contact and fold check')
        log(f'  kept seed {kept}')
        keep_seed(cfg, kept)
        timer.blender(_read_json(os.path.join(cfg.paths.stages, 'run.json')))
    if shots:
        timer.run('shots', step_shots, cfg)
        timer.run('measures', step_measures, cfg)
    report = timer.run('checks', step_checks, cfg)
    timer.write(cfg)
    if use_cache:
        prune_cache(cfg)
    return report, pool


def cmd_build(a):
    """studio build: builds the GLB of an animal, then the shots, the measures, and the checks."""
    if a.all_seeds and a.seed is not None:
        fail('give --seed or --all-seeds, not both')
    if a.jobs < 1:
        fail('--jobs needs 1 or more')
    cfg = load(a.animal, a.out)
    report, pool = run_build(cfg, a.seed, not a.no_shots, a.until, a.clips, not a.no_cache,
                             not a.no_gate, a.jobs, a.all_seeds)
    if report and not report['gate_pass']:
        sys.exit(1)
    if pool and a.all_seeds and not all(r['pass'] for r in pool):
        log('the full seed check fails: not every seed passes (out/seeds/summary.json)')
        sys.exit(1)


def cmd_compare(a):
    """studio compare: renders the views of the existing GLB beside the sheet, measures, and
    checks (no new build)."""
    cfg = load(a.animal, a.out)
    if not os.path.exists(cfg.paths.glb):
        fail(f'{cfg.paths.glb} does not exist: run python3 studio build {a.animal}')
    timer = Timer()
    viewer_config.write(cfg)
    timer.run('shots', step_shots, cfg)
    timer.run('measures', step_measures, cfg)
    timer.run('checks', step_checks, cfg)
    timer.write(cfg)


def cmd_view(a):
    """studio view: serves the viewer on a free port and prints its URL (Ctrl-C stops it)."""
    cfg = load(a.animal)
    if not os.path.exists(cfg.paths.glb):
        fail(f'{cfg.paths.glb} does not exist: run python3 studio build {a.animal}')
    url = viewer_config.write(cfg)
    port = a.port or free_port()
    if port in RESERVED_PORTS:
        fail(f'port {port} is reserved for the servers of the user')
    vite = find_node_bin('vite')
    log(f'viewer: http://localhost:{port}/viewer/index.html?config={url}')
    log(f'compare: http://localhost:{port}/viewer/compare.html?config={url}')
    proc = subprocess.Popen([vite, '--config', os.path.join(STUDIO, 'vite.config.js'), '--port',
                             str(port), '--strictPort', '--clearScreen', 'false'], cwd=STUDIO)
    try:
        proc.wait()
    except KeyboardInterrupt:
        proc.terminate()
        proc.wait()


def detect_views(path, min_saturation=14, max_dark_sum=390):
    """Finds the background and the view columns of a sheet: the runs of columns that hold
    pixels of the figure (colored or dark, the default foreground rule; gray ground shadows
    do not count). Returns (size, background rgb, [(x0, x1)])."""
    from PIL import Image  # noqa: PLC0415
    im = Image.open(path).convert('RGB')
    w, h = im.size
    px = im.load()
    border = [px[x, y] for x in range(0, w, 7) for y in (0, h - 1)]
    border += [px[x, y] for y in range(0, h, 7) for x in (0, w - 1)]
    bg = max(set(border), key=border.count)
    used = []
    for x in range(w):
        n = 0
        for y in range(0, h, 2):
            r, g, b = px[x, y]
            if max(r, g, b) - min(r, g, b) >= min_saturation or r + g + b < max_dark_sum:
                n += 1
        used.append(n > 2)
    runs, start = [], None
    for x, u in enumerate(used + [False]):
        if u and start is None:
            start = x
        elif not u and start is not None:
            if x - start > 20:
                runs.append([start, x])
            start = None
    cols = []
    for i, (x0, x1) in enumerate(runs):
        lo = 0 if i == 0 else (runs[i - 1][1] + x0) // 2
        hi = w if i == len(runs) - 1 else (x1 + runs[i + 1][0]) // 2
        cols.append((lo, hi))
    return (w, h), list(bg), cols


def _toml(v):
    """Writes one value as TOML."""
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, str):
        return json.dumps(v)
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (list, tuple)):
        return '[' + ', '.join(_toml(x) for x in v) + ']'
    if isinstance(v, dict):
        return '{ ' + ', '.join(f'{k} = {_toml(x)}' for k, x in v.items()) + ' }'
    raise ValueError(f'no TOML for {v!r}')


def _comment(doc, indent=''):
    """Wraps a doc line into TOML comments."""
    words, lines, line = doc.split(), [], ''
    for word in words:
        if len(line) + len(word) + 1 > 94:
            lines.append(line)
            line = word
        else:
            line = f'{line} {word}'.strip()
    lines.append(line)
    return '\n'.join(f'{indent}# {x}' for x in lines if x)


def scaffold(schema, start, filled, path='', like=None):
    """Writes the TOML of a new animal from the schema.

    A field marked todo gets "TODO" (or a value of `filled`, or with `like` the value of that
    animal and a comment "TODO: measure"). A required field without a default starts from the
    value of the start animal (src). A field with a default is a comment, unless the start
    animal has another value: then that value is written as a start.
    """
    src = filled.get('_start', like)
    from studio.schema import REQUIRED, A, F, M, T  # noqa: PLC0415
    lines, subs = [], []
    for key, sub in schema.fields.items():
        p = f'{path}.{key}' if path else key
        value = start.get(key) if isinstance(start, dict) else None
        if isinstance(sub, F):
            lines.append(_comment(sub.doc))
            if p in filled:
                lines.append(f'{key} = {_toml(filled[p])}')
            elif sub.todo and like and value is not None:
                lines.append(f'{key} = {_toml(config.to_plain(value))}  # TODO: measure ({like})')
            elif sub.todo:
                lines.append(f'{key} = "TODO"')
            elif sub.default is REQUIRED:
                lines.append(f'{key} = {_toml(config.to_plain(value))}  # a start ({src})')
            elif value not in (None, ()) and config.to_plain(value) != config.to_plain(sub.default):
                lines.append(f'{key} = {_toml(config.to_plain(value))}  # a start ({src})')
            elif sub.default is not None and sub.default != ():
                lines.append(f'# {key} = {_toml(config.to_plain(sub.default))}')
            elif value not in (None, ()):
                lines.append(f'{key} = {_toml(config.to_plain(value))}')
        elif isinstance(sub, T):
            subs.append(('table', p, key, sub, value or {}))
        elif isinstance(sub, M):
            subs.append(('map', p, key, sub, value or {}))
        elif isinstance(sub, A):
            subs.append(('array', p, key, sub, value or ()))
    out = '\n'.join(lines)
    for kind, p, key, sub, value in subs:
        text = ''
        if kind == 'table':
            text = f'\n\n{_comment(sub.doc)}\n[{p}]\n' + scaffold(sub, value, filled, p, like)
        elif kind == 'map':
            item = sub.item
            entries = filled.get(p, value)
            if isinstance(item, F):
                body = []
                for k, v in entries.items():
                    if item.todo and p not in filled and not like:
                        body.append(f'{k} = "TODO"')
                    elif item.todo and p not in filled:
                        body.append(f'{k} = {_toml(config.to_plain(v))}  # TODO: measure ({like})')
                    else:
                        body.append(f'{k} = {_toml(config.to_plain(v))}')
                text = f'\n\n{_comment(sub.doc)}\n[{p}]\n' + '\n'.join(body)
            else:
                text = f'\n\n{_comment(sub.doc)}'
                for k, v in entries.items():
                    text += f'\n\n[{p}.{k}]\n' + scaffold(item, v, filled, f'{p}.{k}', like)
        else:
            text = f'\n\n{_comment(sub.doc)}'
            for v in value:
                text += f'\n\n[[{p}]]\n' + scaffold(sub.item, v, filled, p, like)
        out += text
    return out.strip('\n')


def start_animal(new_id):
    """Finds the animal whose values start a new config: the first animal folder (by name)
    with a valid config."""
    for name in sorted(os.listdir(config.ANIMALS)):
        if name == new_id or not os.path.exists(os.path.join(config.ANIMALS, name, 'animal.toml')):
            continue
        try:
            config.load(name)
        except ConfigError:
            continue
        return name
    fail('no animal with a valid config to start from (give --like <animal>)')


def cmd_new(a):
    """studio new: scaffolds animals/<animal>/ with a config of TODO fields and the sheet."""
    from studio.schema import SCHEMA  # noqa: PLC0415
    if not re.fullmatch(r'[a-z][a-z0-9_]*', a.animal):
        fail('the animal id is lower case letters, digits, and underscores')
    root = config.animal_dir(a.animal)
    if os.path.exists(os.path.join(root, 'animal.toml')) and not a.force:
        fail(f'{root}/animal.toml exists (use --force to write over it)')
    if not os.path.exists(a.sheet):
        fail(f'{a.sheet} does not exist')
    os.makedirs(os.path.join(root, 'reference'), exist_ok=True)
    os.makedirs(os.path.join(root, 'out'), exist_ok=True)
    name = os.path.basename(a.sheet)
    shutil.copyfile(a.sheet, os.path.join(root, 'reference', name))
    size, bg, cols = detect_views(a.sheet)
    names = ['front', 'side', 'back', 'three_quarter']
    labels = {'front': 'Front', 'side': 'Side', 'back': 'Back', 'three_quarter': '3/4'}
    azimuths = {'front': 0.0, 'side': 90.0, 'back': 180.0, 'three_quarter': 38.0}
    views = {}
    for i, n in enumerate(names):
        v = {'columns': list(cols[i]) if len(cols) == 4 else 'TODO', 'azimuth': azimuths[n],
             'label': labels[n]}
        if n == 'side':
            v['axis'] = 'shin'
        if n == 'back':
            v['flip'] = True
        views[n] = v
    src = a.like or start_animal(a.animal)
    start = config.load(src)
    filled = {'animal.id': a.animal, 'animal.name': a.animal.replace('_', ' ').title(),
              'animal.role': a.role, 'sheet.image': f'reference/{name}', 'sheet.background': bg,
              'sheet.views': views, '_start': src}
    for n, v in views.items():
        for k, x in v.items():
            filled[f'sheet.views.{n}.{k}'] = x
    head = (f'# The config of the animal "{a.animal}" (made by python3 studio new). Fill each '
            f'"TODO" and each\n# "TODO: measure"; `python3 studio schema` explains each field. '
            f'A value marked "a start ({src})"\n# comes from animals/{src}/animal.toml: tune it. '
            f'A commented line shows a default.\n#\n# Units: the animal is 1 unit tall (sole to '
            f'ear top). Axes of three.js: x left of the animal,\n# y up, z forward. Colors are '
            f'sRGB 0..255. Angles are in degrees.\n\n')
    text = head + scaffold(SCHEMA, config.to_plain(start), filled, '', a.like) + '\n'
    with open(os.path.join(root, 'animal.toml'), 'w') as f:
        f.write(text)
    todo = text.count('"TODO"') + text.count('# TODO: measure')
    log(f'made {root}/: animal.toml ({todo} TODO fields), reference/{name}, out/')
    log(f'sheet {size[0]} x {size[1]} px, background {bg}, '
        f'{len(cols)} view column(s) found: {cols}')
    if len(cols) != 4:
        log('  the sheet does not show four views apart: set sheet.views.*.columns by hand')
    log('')
    log(INTAKE_CHECKLIST)


def cmd_regress(a):
    """studio regress: builds the animal with the golden seed and compares it with
    animals/<animal>/golden.json."""
    root = config.animal_dir(a.animal)
    golden_path = os.path.join(root, 'golden.json')
    if a.write:
        if not a.source:
            fail('--write needs --from <output folder of the build to keep>')
        cfg = load(a.animal, a.source)
        stats = regress.collect(cfg)
        stats['source'] = a.note or os.path.abspath(a.source)
        with open(golden_path, 'w') as f:
            f.write(regress.dumps(stats) + '\n')
        log(f'wrote {golden_path}')
        return
    if not os.path.exists(golden_path):
        fail(f'{golden_path} does not exist (make it with --write --from <dir>)')
    with open(golden_path) as f:
        golden = json.load(f)
    out = a.out or os.path.join(root, 'out', 'regress')
    cfg = load(a.animal, out)
    if not a.no_build:
        if os.path.exists(out):
            shutil.rmtree(out)
        log(f'[regress] build with the golden seed {golden["stats"]["seed"]} into {out}'
            f'{" (no cache)" if a.no_cache else ""}')
        run_build(cfg, golden['stats']['seed'], use_cache=not a.no_cache)
    rows, ok = regress.compare(golden, regress.collect(cfg))
    log('')
    log(f'regression of {a.animal} against {golden.get("source", "golden.json")}:')
    width = max(len(r[0]) for r in rows)
    for item, verdict, detail in rows:
        log(f'  {item:{width}s}  {verdict:12s}  {detail}')
    log('PASS' if ok else 'FAIL')
    if not ok:
        sys.exit(1)


def cmd_fit(a):
    """studio fit: scores the field against the sheet masks with no mesh (about 2 s)."""
    cfg = load(a.animal, a.out)
    timer = Timer()
    t = time.time()
    timer.step('intake', time.time() - t, step_intake(cfg))
    args = [cfg.paths.root, '--out', cfg.paths.out] + (['--rows'] if a.rows else [])
    t = time.time()
    code, lines = blender('studio/fit.py', args, os.path.join(cfg.paths.out, 'fit.log'))
    timer.step('fit', time.time() - t)
    for line in lines:
        if not line.startswith(('Blender', 'Read', 'Blender quit')) and line.strip():
            log(line)
    if code != 0:
        fail('studio/fit.py failed')
    log('time: ' + ', '.join(f'{k} {v:.1f} s ({timer.sources.get(k, "run")})'
                             for k, v in timer.steps.items()))


def cmd_cache(a):
    """studio cache: prints the size of the stage cache, or deletes it (clean)."""
    from studio import cache  # noqa: PLC0415
    names = [a.animal] if a.animal else sorted(
        n for n in os.listdir(config.ANIMALS) if os.path.isdir(os.path.join(config.ANIMALS, n)))
    for name in names:
        root = os.path.join(config.animal_dir(name), 'cache')
        size, entries = cache.size(root) if os.path.isdir(root) else (0, 0)
        if a.action == 'clean':
            if os.path.isdir(root):
                shutil.rmtree(root)
            log(f'{name}: deleted the cache ({entries} entries, {size / 2**20:.1f} MB)')
            continue
        log(f'{name}: {entries} entries, {size / 2**20:.1f} MB in {os.path.relpath(root, STUDIO)}')
        if os.path.isdir(root):
            for step in sorted(os.listdir(root)):
                n_step = cache.size(os.path.join(root, step))
                log(f'  {step:12s} {n_step[1]:4d} entries {n_step[0] / 2**20:8.1f} MB')


def serve(folder, port, page):
    """Serves a folder over HTTP on 127.0.0.1 and prints the URL of a page. Ctrl-C stops it."""
    import functools  # noqa: PLC0415
    import http.server  # noqa: PLC0415

    class Quiet(http.server.SimpleHTTPRequestHandler):
        """A file handler that prints no request lines."""

        def log_message(self, *args):
            """Prints nothing."""

    handler = functools.partial(Quiet, directory=folder)
    with http.server.ThreadingHTTPServer(('127.0.0.1', port), handler) as httpd:
        log(f'look report: http://127.0.0.1:{port}/{page}  (Ctrl-C stops the server)')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            log('stopped')


def cmd_report(a):
    """studio report: writes the checks, the located failures, and the look report of the last
    build, then serves the page on a free port (Ctrl-C stops it). --no-serve only writes it."""
    cfg = load(a.animal, a.out)
    if not os.path.exists(cfg.paths.stats):
        fail(f'{cfg.paths.stats} does not exist: run python3 studio build {a.animal}')
    if a.measure:
        from studio import measure_features, measure_shading  # noqa: PLC0415
        log('[measures] features and shading of the existing renders')
        for mod in (measure_features, measure_shading):
            with open(os.devnull, 'w') as quiet:
                stdout, sys.stdout = sys.stdout, quiet
                try:
                    mod.measure(cfg)
                finally:
                    sys.stdout = stdout
    step_checks(cfg)
    if a.no_serve:
        return
    port = a.port or free_port()
    if port in RESERVED_PORTS:
        fail(f'port {port} is reserved for the servers of the user')
    serve(cfg.paths.out, port, 'report/index.html')


def schema_markdown(node, path=''):
    """Writes the schema as Markdown tables: one table for each section."""
    from studio.schema import REQUIRED, A, F, M, T  # noqa: PLC0415
    rows, subs = [], []
    for key, sub in node.fields.items():
        p = f'{path}.{key}' if path else key
        if isinstance(sub, F):
            if sub.default is REQUIRED:
                default = 'measure' if sub.todo else 'required'
            elif sub.default is None or sub.default == ():
                default = 'optional'
            else:
                default = f'`{_toml(config.to_plain(sub.default))}`'
            rows.append(f'| `{key}` | {sub.kind} | {default} | {sub.doc} |')
        elif isinstance(sub, M) and isinstance(sub.item, F):
            rows.append(f'| `{key}.<name>` | {sub.item.kind} | map | {sub.doc} |')
        else:
            subs.append((p, sub))
    out = ''
    if rows:
        out += '| Field | Kind | Default | Meaning |\n|---|---|---|---|\n' + '\n'.join(rows) + '\n'
    for p, sub in subs:
        if isinstance(sub, T):
            out += f'\n#### `[{p}]`\n\n{sub.doc}\n\n' + schema_markdown(sub, p)
        elif isinstance(sub, M):
            out += f'\n#### `[{p}.<name>]`\n\n{sub.doc}\n\n' + schema_markdown(sub.item, f'{p}.<name>')
        elif isinstance(sub, A):
            out += f'\n#### `[[{p}]]`\n\n{sub.doc}\n\n' + schema_markdown(sub.item, p)
    return out


def cmd_schema(a):
    """studio schema: prints the config reference (or the role pack reference) as Markdown, or
    writes both into README.md between their marker lines."""
    from studio.schema import ROLE, SCHEMA  # noqa: PLC0415
    if not a.readme:
        print(schema_markdown(ROLE if a.role else SCHEMA))
        return
    path = os.path.join(STUDIO, 'README.md')
    with open(path) as f:
        text = f.read()
    for name, node in (('config', SCHEMA), ('role', ROLE)):
        begin, end = f'<!-- {name}-reference:begin -->', f'<!-- {name}-reference:end -->'
        if begin not in text or end not in text:
            fail(f'README.md has no marker lines {begin} and {end}')
        i, j = text.index(begin) + len(begin), text.index(end)
        text = text[:i] + '\n\n' + schema_markdown(node).strip('\n') + '\n\n' + text[j:]
    with open(path, 'w') as f:
        f.write(text)
    log(f'wrote the references into {path}')


def main(argv=None):
    """Parses the command line and runs one command."""
    ap = argparse.ArgumentParser(prog='python3 studio', description=__doc__.split('\n')[0])
    sub = ap.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('build', help='build the GLB, the shots, the measures, and the checks')
    p.add_argument('animal')
    p.add_argument('--seed', type=int, default=None, help='one seed (default: the seed search)')
    p.add_argument('--no-shots', action='store_true', help='stop after the GLB and the checks')
    p.add_argument('--out', default=None, help='output folder (default: animals/<id>/out)')
    p.add_argument('--until', default=None, help='stop the Blender build after this stage')
    p.add_argument('--clips', default=None, help='bake only these clips (a,b)')
    p.add_argument('--no-cache', action='store_true', help='no stage cache reads or writes')
    p.add_argument('--no-gate', action='store_true',
                   help='report the remesh gate, but build on when it fails')
    p.add_argument('--all-seeds', action='store_true',
                   help='the full seed check: build every seed of facets.seeds')
    p.add_argument('--jobs', type=int, default=DEFAULT_JOBS,
                   help=f'Blender processes of the seed pool at the same time ({DEFAULT_JOBS})')
    p.set_defaults(fn=cmd_build)
    p = sub.add_parser('compare', help='render the views beside the sheet, measure, and check')
    p.add_argument('animal')
    p.add_argument('--out', default=None)
    p.set_defaults(fn=cmd_compare)
    p = sub.add_parser('view', help='serve the viewer on a free port')
    p.add_argument('animal')
    p.add_argument('--port', type=int, default=None)
    p.set_defaults(fn=cmd_view)
    p = sub.add_parser('new', help='scaffold a new animal from its sheet')
    p.add_argument('animal')
    p.add_argument('--sheet', required=True)
    p.add_argument('--role', default='conductor')
    p.add_argument('--like', default=None, help='start the TODO fields from this animal')
    p.add_argument('--force', action='store_true')
    p.set_defaults(fn=cmd_new)
    p = sub.add_parser('regress', help='build and compare with the golden stats')
    p.add_argument('animal')
    p.add_argument('--no-build', action='store_true', help='compare the last regression build')
    p.add_argument('--out', default=None)
    p.add_argument('--write', action='store_true', help='write golden.json from --from')
    p.add_argument('--from', dest='source', default=None)
    p.add_argument('--note', default=None, help='the source line of a new golden file')
    p.add_argument('--no-cache', action='store_true', help='a cold build: no stage cache')
    p.set_defaults(fn=cmd_regress)
    p = sub.add_parser('fit', help='score the field against the masks (no mesh)')
    p.add_argument('animal')
    p.add_argument('--out', default=None)
    p.add_argument('--rows', action='store_true')
    p.set_defaults(fn=cmd_fit)
    p = sub.add_parser('report', help='write the look report of the last build and serve it')
    p.add_argument('animal')
    p.add_argument('--out', default=None, help='output folder (default: animals/<id>/out)')
    p.add_argument('--measure', action='store_true',
                   help='measure the features and the shading of the renders again first')
    p.add_argument('--no-serve', action='store_true', help='write the report, start no server')
    p.add_argument('--port', type=int, default=None)
    p.set_defaults(fn=cmd_report)
    p = sub.add_parser('cache', help='print the size of the stage cache, or delete it')
    p.add_argument('action', choices=('info', 'clean'))
    p.add_argument('animal', nargs='?', default=None, help='one animal (default: all)')
    p.set_defaults(fn=cmd_cache)
    p = sub.add_parser('schema', help='print the config reference as Markdown')
    p.add_argument('--role', action='store_true', help='the reference of role.toml')
    p.add_argument('--readme', action='store_true', help='write both references into README.md')
    p.set_defaults(fn=cmd_schema)
    args = ap.parse_args(argv)
    args.fn(args)
