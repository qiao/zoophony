"""The command line of the low-poly studio. Run it from lowpoly-studio/:

    python3 studio build <animal> [--seed N | --all-seeds] [--jobs N] [--no-shots] [--out DIR]
                          [--until STAGE] [--clips a,b] [--no-cache] [--no-gate]
    python3 studio compare <animal> [--out DIR]
    python3 studio view <animal> [--port N] [--stop]
    python3 studio log [<animal>] [--all] [--last N] [--short] [--json]
    python3 studio new <animal> --sheet <png> [--role R] [--like A] [--full] [--force]
    python3 studio regress <animal> [--no-build] [--no-cache] [--write --from DIR]
    python3 studio fit <animal> [--rows] [--azimuths a,b,c] [--pose bind]
    python3 studio calibrate <animal> [--from A] [--quads] [--no-look] [--contrast X] [--dry-run]
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
import signal
import socket
import subprocess
import sys
import time

from studio import checks, config, outputs, regress, runlog, viewer_config
from studio.config import STUDIO, ConfigError
from studio.like import toml_value as _toml

BLENDER = os.environ.get('BLENDER', 'blender')

# The lines of the Blender log that the CLI shows.
SHOW = ('surface nets', 'dense mesh:', 'remesh:', 'remeshed', 'body:', 'bone heat', 'corrective', 'contact check',
        'fold repair', 'remesh gate', 'stopped after', 'cache:', 'wrote', 'Error', 'Traceback')

# The ports of the user's own servers, which the studio never takes.
RESERVED_PORTS = (5173, 5190)

# The Blender processes of the seed pool that run at the same time.
DEFAULT_JOBS = 4

# The role pack of the model build (roles/model/): the bind pose of the sheet, no props, and the
# clip 'reference' only. The look checks come from this build.
MODEL_ROLE = 'model'

# The largest size of the stage cache that all worktrees share; a build deletes the least
# recently used entries above it.
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
 5. Read the sheet check above (out/sheet-check.json): each warning names the build checks that
    the sheet can fail. Ask the user about a fault of the sheet before the work starts.
 6. Calibrate the look from the sheet: python3 studio calibrate <animal> --from <like animal>
    (the light, the palette, the dark classes; about 6 s), and the QuadriFlow target:
    python3 studio calibrate <animal> --quads --no-look (about 30 s).
 7. Measure the sheet in animal heights and replace each value of the like animal (or each
    "TODO"): the trunk and the head lofts, the snout, the ears, the tail, the arm and the leg
    joints, the spine, the eyes, the nose, the mouth, and the rig places.
    `python3 studio schema` explains each field.
 8. Check the field without a mesh: python3 studio fit <animal> --rows (about 2 s).
 9. Build one seed: python3 studio build <animal> --seed 3, then look at out/report/ and
    out/frames/, and read out/checks.json. Then calibrate again on the own GLB.
'''


def log(msg):
    """Prints a line at once."""
    print(msg, flush=True)


def fail(msg, code=1):
    """Prints an error and stops."""
    print(f'error: {msg}', file=sys.stderr, flush=True)
    sys.exit(code)


def load(animal, out=None, role=None):
    """Loads the config of an animal (with another role pack when role is given), or stops with
    the list of its problems."""
    try:
        return config.load(animal, out, role)
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

    def __init__(self, run=None):
        """Starts the clock. run: the run file of the command (runlog.Run), or None."""
        self.t0 = time.time()
        self.steps = {}
        self.sources = {}
        self.stages = None
        self.model = None
        self.run_file = run

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
            if name == 'model build' and self.model:
                m = self.model
                rows.append(('  beside the role build', m['seconds'],
                             f'seed {m["seed"]} ({len(m["tried"])} seeds before it fail the '
                             f'remesh gate), {m["cache_hits"]} of {m["stages"]} stages from the '
                             f'cache'))
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
            json.dump({'run': self.run_file and self.run_file.id, 'steps': self.steps,
                       'sources': self.sources, 'total': total,
                       'blender_stages': self.stages, 'model': self.model}, f, indent=2)
        if self.run_file:
            self.run_file.timer(self.steps, self.sources, self.stages)
        log('time:')
        log(self.table(total))


def cache_root():
    """Returns the folder of the stage cache that all worktrees of the repository share."""
    from studio import cache  # noqa: PLC0415
    return cache.default_root()


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
    store = cache.Store(cache_root(), cfg.animal.id, 'cli')
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
        print_sheet_check(cfg)
        return 'cache'
    rec = cache.Recorder('intake')
    t0 = time.time()
    with cache.recording(rec):
        intake.intake(cache.track(cfg, 'cfg'))
    seconds = time.time() - t0
    files = {}
    # studio-intake: the sheet check of the intake (studio/consistency.py) is an output too.
    for rel in ['measure.json', 'sheet-check.json'] + [f'masks/{v}.{ext}' for v in cfg.sheet.views
                                                       for ext in ('png', 'raw')]:
        with open(os.path.join(cfg.paths.out, rel), 'rb') as f:
            files[rel] = f.read()
    manifest = rec.manifest({'cfg': cfg})
    store.save('intake', base, cache.digest([base, manifest]),
               {'manifest': manifest, 'outputs': {}, 'seconds': round(seconds, 3), 'log': []},
               {'files': files})
    return 'run'


def print_sheet_check(cfg):
    """Prints the warnings of the sheet check of the intake (out/sheet-check.json)."""
    from studio import consistency  # noqa: PLC0415
    found = _read_json(os.path.join(cfg.paths.out, 'sheet-check.json'))
    if found:
        for line in consistency.summary(found):
            log(f'  {line}')


def build_args(cfg, seed, until=None, clips=None, use_cache=True, gate=True, role=None):
    """Makes the arguments of studio/build.py for one seed."""
    args = [cfg.paths.root, '--seed', str(seed), '--out', cfg.paths.out, '--cache', cache_root()]
    if role:
        args += ['--role', role]
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
    out['clips'] = clip_failures(cfg, stats)
    out['stats'] = {k: stats[k] for k in ('body_triangles', 'median_edge_px', 'sliver_share',
                                          'folded_faces', 'fold_repairs') if k in stats}
    report = checks.run(cfg)
    out['checks_failed'] = report['failed']
    out['status'] = 'contacts' if out['clips_failed'] else 'pass'
    out['pass'] = not out['clips_failed']
    return out


def clip_failures(cfg, stats):
    """Lists the failed gates of each clip of a seed from its stats (studio/build.py
    check_clips): {clip: [] when it passes, else texts such as 'contact 2.13 cm forearm R'}."""
    rc = cfg.role.checks
    out = {}
    for clip, c in stats['contacts']['clips'].items():
        bad = []
        if c['depth'] > rc.contact_depth:
            bad.append(f'contact {c["depth"] * 100:.2f} cm {c.get("part")} {c.get("side")}')
        if c['folded_faces'] > cfg.checks.folded_faces:
            bad.append(f'folds {c["folded_faces"]}')
        if 'scene' in c and c['scene']['depth'] > rc.scene_depth:
            bad.append(f'scene {c["scene"]["depth"] * 100:.2f} cm {c["scene"]["piece"]}')
        if 'seat' in c and abs(c['seat']['gap']) > rc.seat_gap:
            bad.append(f'seat gap {c["seat"]["gap"] * 100:.2f} cm')
        if 'hands' in c and c['hands']['distance'] > rc.hand_targets:
            bad.append(f'hands {c["hands"]["distance"] * 100:.2f} cm {c["hands"]["side"]}')
        if not c['pass'] and not bad:
            bad.append('FAIL')
        out[clip] = bad
    return out


def seed_report_path(cfg):
    """Returns the path of the seed report: the seeds and clips of the last full seed run."""
    return os.path.join(cfg.paths.out, 'seed-report.json')


def seed_report(cfg, summary, key, reason, run_id):
    """Makes the seed report of a full seed run: for each seed, the remesh gate and the failed
    gates of each clip; whether the kept seed passes, whether every seed that passes the remesh
    gate passes every clip (robust), and the result of the seed rule (seeds.require)."""
    rows = []
    for r in summary['results']:
        gate = r.get('gate') or {}
        rows.append({'seed': r['seed'], 'status': r['status'], 'pass': r['pass'],
                     'remesh_gate': None if r['status'] == 'error' else r['status'] != 'gate',
                     'remesh_failed': [f'{c["name"]} {c["value"]}' for c in gate.get('checks', [])
                                       if not c['pass']] if r['status'] == 'gate' else [],
                     'clips': r.get('clips') or {}})
    meshes = [row for row in rows if row['remesh_gate']]
    robust = bool(meshes) and all(row['pass'] for row in meshes)
    require = cfg.seeds.require
    ok = summary['kept'] is not None and (require == 'kept' or robust)
    return {'animal': cfg.animal.id, 'role': cfg.role.role.name, 'run': run_id,
            'made': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'role_key': key, 'reason': reason,
            'require': require, 'kept': summary['kept'], 'robust': robust, 'rule_pass': ok,
            'meshes': len(meshes), 'robust_seeds': sum(row['pass'] for row in meshes),
            'seeds': rows}


def seed_matrix(report):
    """Formats a seed report as a table: one row for each seed, one column for each clip."""
    clips = []
    for row in report['seeds']:
        for clip in row['clips']:
            if clip not in clips:
                clips.append(clip)
    cells = [['seed', 'remesh gate'] + clips]
    for row in report['seeds']:
        if row['remesh_gate'] is None:
            line = [str(row['seed']), row['status']]
        elif not row['remesh_gate']:
            line = [str(row['seed']), 'FAIL ' + ', '.join(row['remesh_failed'])]
        else:
            line = [str(row['seed']), 'pass']
            line += ['; '.join(row['clips'][c]) if row['clips'].get(c) else
                     ('pass' if c in row['clips'] else '-') for c in clips]
        cells.append(line)
    width = [max(len(r[i]) for r in cells if i < len(r)) for i in range(len(cells[0]))]
    out = []
    for r in cells:
        out.append('  ' + '  '.join(f'{v:{width[i]}s}' for i, v in enumerate(r)).rstrip())
    return '\n'.join(out)


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


def run_seeds(cfg, seeds, jobs, search=True, clips=None, use_cache=True, gate=True,
              reason=None):
    """Builds seeds in a pool of Blender processes, each seed in out/seeds/<n>/.

    search: stop when the first seed in the order of seeds that passes is known (each seed
    before it failed), and cancel the other runs. Otherwise build every seed (reason: why).
    Returns (the kept seed or None, the results in the order of seeds), and writes
    out/seeds/summary.json.
    """
    t0 = time.time()
    root = os.path.join(cfg.paths.out, 'seeds')
    if os.path.exists(root):
        shutil.rmtree(root)
    cfgs = {}
    for s in seeds:
        folder = seed_folder(cfg, s)
        os.makedirs(os.path.join(folder, 'stages'))
        shutil.copyfile(cfg.paths.measure, os.path.join(folder, 'measure.json'))
        cfgs[s] = load(cfg.paths.root, folder)
    log(f'[seeds] {len(seeds)} seeds {list(seeds)}, {jobs} at a time, '
        f'{"until the first seed that passes" if search else f"all seeds ({reason})"}')
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
               'reason': reason, 'require': cfg.seeds.require, 'seeds': list(seeds), 'kept': kept,
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


class ModelBuild:
    """The model build of an animal: the config of the animal with the role "model" (the bind
    pose of the sheet, no props, the clip 'reference' only), in <out>/model/.

    The compare with the sheet and the look checks use its GLB, so they do not depend on the
    role: a seated role straightens the legs of its bent bind pose for the sheet pose, which
    changes the silhouette. The build runs in a Blender process of its own beside the role
    build. It keeps the first seed of facets.seeds that passes the remesh gate (the seeds run
    one after the other), so its seed depends on the model only. With the stage cache, it takes
    a few seconds after a change of a role.
    """

    def __init__(self, cfg, use_cache=True):
        """Stores the config of the animal and the cache choice."""
        self.cfg = cfg
        self.folder = os.path.join(cfg.paths.out, 'model')
        self.use_cache = use_cache
        self.seeds = list(cfg.facets.seeds)
        self.proc = None
        self.mcfg = None
        self.seed = None
        self.log_file = None
        self.log_path = None
        self.t0 = time.time()

    def start(self):
        """Starts the Blender build of the next seed in the background. Returns self."""
        if os.path.exists(self.folder):
            shutil.rmtree(self.folder)
        os.makedirs(os.path.join(self.folder, 'stages'))
        shutil.copyfile(self.cfg.paths.measure, os.path.join(self.folder, 'measure.json'))
        self.mcfg = load(self.cfg.paths.root, self.folder, MODEL_ROLE)
        self.seed = self.seeds.pop(0)
        self.log_path = os.path.join(self.mcfg.paths.stages, f'blender-seed{self.seed}.log')
        self.log_file = open(self.log_path, 'w')  # noqa: SIM115 (closed in wait or stop)
        self.proc = subprocess.Popen(
            blender_cmd('studio/build.py', build_args(self.mcfg, self.seed, None, None,
                                                      self.use_cache, True, MODEL_ROLE)),
            stdout=self.log_file, stderr=subprocess.STDOUT, cwd=STUDIO)
        return self

    def wait(self):
        """Waits for the build, and tries the next seed when the remesh gate stops a seed or
        Blender fails. Returns {seed, glb (None when every seed failed), seconds, log, gate
        (the remesh gate passes), gate_failed, stages, cache_hits, tried}."""
        tried = []
        while True:
            code = self.proc.wait()
            self.log_file.close()
            self.proc = None
            ok = code == 0 and os.path.exists(self.mcfg.paths.glb)
            if ok:
                break
            gate = _read_json(os.path.join(self.mcfg.paths.stages, 'remesh-gate.json')) or {}
            bad = [c for c in gate.get('checks', []) if not c['pass']]
            why = (f'the remesh gate fails ({", ".join(f"{c["name"]} {c["value"]}" for c in bad)})'
                   if bad else f'Blender failed (log: {os.path.relpath(self.log_path, STUDIO)})')
            tried.append({'seed': self.seed, 'why': why})
            if not self.seeds:
                break
            log(f'  model build: seed {self.seed}: {why}; it tries seed {self.seeds[0]}')
            self.start()
        run = _read_json(os.path.join(self.mcfg.paths.stages, 'run.json')) or {}
        gate = _read_json(os.path.join(self.mcfg.paths.stages, 'remesh-gate.json')) or {}
        sources = list((run.get('source') or {}).values())
        # The end of the Blender run is the last write of its log (the pool can end later).
        end = os.path.getmtime(self.log_path) if os.path.exists(self.log_path) else time.time()
        return {'seed': self.seed, 'glb': self.mcfg.paths.glb if ok else None,
                'seconds': round(max(end - self.t0, 0.0), 1),
                'log': os.path.relpath(self.log_path, STUDIO), 'gate': gate.get('pass'),
                'gate_failed': gate.get('failed', []), 'stages': len(sources),
                'cache_hits': sum(v == 'cache' for v in sources), 'tried': tried}

    def stop(self):
        """Stops a running build (when the role build stops first)."""
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()
            self.proc.wait()
        if self.log_file and not self.log_file.closed:
            self.log_file.close()


def model_step(cfg, model, timer, run=None):
    """Waits for the model build and records it. Returns the path of its GLB, or None when
    every seed failed (then the compare renders the role GLB, and look.json says so)."""
    t = time.time()
    res = model.wait()
    timer.step('model build', time.time() - t)
    timer.model = {k: res[k] for k in ('seed', 'seconds', 'stages', 'cache_hits', 'tried')}
    if run:
        run.set(model_seed=res['seed'] if res['glb'] else None, model=timer.model)
    outputs.finish_build(cfg, model={'seed': res['seed'] if res['glb'] else None,
                                     'log': res['log'], 'tried': res['tried'],
                                     'glb': outputs.sha256(res['glb']) if res['glb'] else None})
    if not res['glb']:
        log('  WARNING: no seed of the model build passes the remesh gate; the compare renders '
            'the role GLB (look.json: "compare": "role")')
        return None
    skipped = f', after seeds {", ".join(str(t["seed"]) for t in res["tried"])}' if res[
        'tried'] else ''
    log(f'  model build: seed {res["seed"]}{skipped}, {res["seconds"]:.1f} s, '
        f'{res["cache_hits"]} of {res["stages"]} stages from the cache')
    return res['glb']


def step_shots(cfg, model_glb=None):
    """Stage "shots": the compare with the sheet (of the model build when model_glb is given),
    the review frames and the viewer shot of the role build (one node process), and the review
    scripts of the role."""
    node = shutil.which('node') or fail('no node on the path')
    shoot = os.path.join(STUDIO, 'studio', 'shoot.mjs')
    log('[shots] compare' + (' (the model build)' if model_glb else '') + ', frames, viewer')
    extra = ['--compare-glb', viewer_config.url_of(model_glb)] if model_glb else []
    code = subprocess.call([node, shoot, 'compare,frames,viewer', '--out', cfg.paths.out, *extra],
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


def step_measures(cfg, model_glb=None):
    """Stage "measures": the features (eyes, ears, nose, ...) and the shading of the renders,
    and the facets of the GLB (of the model build when model_glb is given)."""
    from studio import measure_features, measure_shading  # noqa: PLC0415
    log(f'[measures] features ({", ".join(cfg.measure.features)}), shading, mesh facets')
    for mod in (measure_features, measure_shading):
        with open(os.devnull, 'w') as quiet:
            stdout, sys.stdout = sys.stdout, quiet
            try:
                mod.measure(cfg)
            finally:
                sys.stdout = stdout
    code, _ = blender('studio/measure_mesh.py', [cfg.paths.root, '--out', cfg.paths.out]
                      + (['--glb', model_glb] if model_glb else []),
                      os.path.join(cfg.paths.stages, 'measure-mesh.log'))
    if code != 0:
        fail('studio/measure_mesh.py failed')


def step_checks(cfg):
    """Stage "checks": the structured report <out>/checks.json with the located failures
    (<out>/diag/), and the look report (<out>/report/index.html and review.png)."""
    from studio import report as look_report  # noqa: PLC0415 (Pillow is needed only here)
    report = checks.run(cfg)
    log(checks.summary(report))
    look = report.get('look') or {}
    if look.get('compare') == 'model':
        log(f'  the look checks come from the model build (seed {look.get("model_seed")}, '
            f'out/model/); the role checks come from the role build (seed {report["seed"]})')
    elif look.get('compare') == 'role':
        log('  the look checks come from the role build: the model build made no GLB')
    folder = os.path.join(cfg.paths.out, 'report')
    if os.path.isdir(folder):
        shutil.rmtree(folder)
    page = look_report.write(cfg, report)
    log(f'look report: {page}')
    return report


def prune_cache():
    """Deletes the least recently used entries of the shared cache above CACHE_LIMIT."""
    from studio import cache  # noqa: PLC0415
    root = cache_root()
    if os.path.isdir(root):
        n = cache.prune(root, CACHE_LIMIT)
        if n:
            log(f'cache: deleted {n} old entries (limit {CACHE_LIMIT / 2**30:.0f} GB)')


def run_build(cfg, seed=None, shots=True, until=None, clips=None, use_cache=True, gate=True,
              jobs=DEFAULT_JOBS, all_seeds=False, run=None):
    """Runs the whole build of an animal. Returns (the checks report or None with --until, the
    seed results of the pool or None).

    One seed (seed, or until): the Blender build runs in out/. Else the seed pool builds the
    seeds of facets.seeds in out/seeds/<n>/ and copies the kept seed into out/. With shots, the
    model build (ModelBuild) runs beside the role build, and the compare and the measures use
    its GLB. run: the run file of the command (runlog.Run), or None.
    """
    timer = Timer(run)
    os.makedirs(cfg.paths.out, exist_ok=True)
    outputs.start_build(cfg, run.id if run else time.strftime('%Y%m%d-%H%M%S-') + str(os.getpid()),
                        run.data['command'] if run else 'build', shots, until)
    t = time.time()
    source = step_intake(cfg, use_cache)
    timer.step('intake', time.time() - t, source)
    viewer_config.write(cfg)
    model = None
    if shots and not until:
        model = ModelBuild(cfg, use_cache).start()
        log(f'[model] the model build (role "{MODEL_ROLE}", seed {model.seed}) runs beside the '
            f'role build in {os.path.relpath(model.folder, STUDIO)}/')
    try:
        pool = role_build(cfg, timer, seed, until, clips, use_cache, gate, jobs, all_seeds, run)
        if until:
            return None, None
        if shots:
            model_glb = model_step(cfg, model, timer, run)
            outputs.clear_look(cfg)
            timer.run('shots', step_shots, cfg, model_glb)
            timer.run('measures', step_measures, cfg, model_glb)
            outputs.write_look(cfg, model_glb)
    finally:
        if model:
            model.stop()
    report = timer.run('checks', step_checks, cfg)
    timer.write(cfg)
    if run:
        run.checks(report)
        if not report['gate_pass']:
            run.result = 'fail'
    if use_cache:
        prune_cache()
    return report, pool


def role_build(cfg, timer, seed, until, clips, use_cache, gate, jobs, all_seeds, run):
    """Builds the GLB of the role: one seed in out/, or the seed pool. Writes the checks and
    stops (fail) when no seed passes the gates. Returns the seed results of the pool or None."""
    if seed is not None or until:
        s = seed if seed is not None else cfg.facets.seeds[0]
        if run:
            run.set(seed=s)
        log(f'[build] seed {s}')
        last = _read_json(seed_report_path(cfg))
        if last and last.get('role_key') != outputs.role_key(cfg, clips):
            log('  note: the role pack, the template, or the clips changed after the seed report; '
                'a build with no --seed runs the role check of every seed')
        t = time.time()
        result = step_blender_build(cfg, s, until, clips, use_cache, gate)
        timer.step('blender build', time.time() - t)
        timer.blender(_read_json(os.path.join(cfg.paths.stages, 'run.json')))
        if until:
            timer.write(cfg)
            return None
        if not result['pass']:
            # studio-diag: the checks of the seed, so that its located failures are there.
            report = timer.run('checks', step_checks, cfg)
            timer.write(cfg)
            if run:
                run.checks(report)
            fail(f'seed {s}: {describe(result)}')
        log(f'  seed {s}: {describe(result)}')
        outputs.finish_build(cfg, seed=s)
        return None
    seeds = list(cfg.facets.seeds)
    key = outputs.role_key(cfg, clips)
    last = _read_json(seed_report_path(cfg)) or {}
    reason = None
    if all_seeds:
        reason = '--all-seeds'
    elif cfg.seeds.require == 'all':
        reason = 'seeds.require = "all"'
    elif last.get('role_key') != key:
        reason = ('a role check: the role pack, the template, or the clips changed since the '
                  'last seed report' if last else 'a role check: no seed report yet')
    t = time.time()
    kept, pool = run_seeds(cfg, seeds, jobs, reason is None, clips, use_cache, gate, reason)
    timer.step('seed pool', time.time() - t)
    summary = _read_json(os.path.join(cfg.paths.out, 'seeds', 'summary.json'))
    if run:
        run.pool(summary)
        run.set(seed=kept)
    if reason:
        report = seed_report(cfg, summary, key, reason, run.id if run else None)
        outputs.write_json(seed_report_path(cfg), report)
        log(f'[seeds] the seed report ({os.path.relpath(seed_report_path(cfg), STUDIO)}): '
            f'{report["robust_seeds"]} of {report["meshes"]} seeds that pass the remesh gate '
            f'pass every clip; seeds.require = "{report["require"]}": '
            f'{"pass" if report["rule_pass"] else "FAIL"}')
        log(seed_matrix(report))
        if run:
            run.set(seed_rule={k: report[k] for k in ('require', 'robust', 'rule_pass',
                                                       'meshes', 'robust_seeds')})
    if kept is None:
        # studio-diag: the checks of the last seed, so that its located failures are there.
        ran = [r['seed'] for r in pool if r['status'] != 'cancelled']
        if ran:
            keep_seed(cfg, ran[-1])
            log(f'  the outputs of seed {ran[-1]} (the last seed) are in out/')
        report = timer.run('checks', step_checks, cfg)
        timer.write(cfg)
        if run:
            run.checks(report)
        fail(f'no seed of {seeds} passes the remesh gate and the contact and fold check')
    log(f'  kept seed {kept}')
    keep_seed(cfg, kept)
    outputs.finish_build(cfg, seed=kept)
    timer.blender(_read_json(os.path.join(cfg.paths.stages, 'run.json')))
    return pool


def cmd_build(a):
    """studio build: builds the GLB of an animal, then the shots, the measures, and the checks."""
    if a.all_seeds and a.seed is not None:
        fail('give --seed or --all-seeds, not both')
    if a.jobs < 1:
        fail('--jobs needs 1 or more')
    cfg = load(a.animal, a.out)
    with runlog.Run(cfg.animal.id, a.command, cfg.paths.out) as run:
        report, pool = run_build(cfg, a.seed, not a.no_shots, a.until, a.clips, not a.no_cache,
                                 not a.no_gate, a.jobs, a.all_seeds, run)
        if report and not report['gate_pass']:
            sys.exit(1)
        rule = (run.data.get('seed_rule') or {}) if pool else {}
        if rule and not rule['rule_pass']:
            log(f'the seed rule fails: seeds.require = "{rule["require"]}", and '
                f'{rule["robust_seeds"]} of {rule["meshes"]} seeds that pass the remesh gate pass '
                f'every clip ({os.path.relpath(seed_report_path(cfg), STUDIO)})')
            run.result = 'fail'
            sys.exit(1)


def cmd_compare(a):
    """studio compare: renders the views of the existing GLB beside the sheet, measures, and
    checks (no new build)."""
    cfg = load(a.animal, a.out)
    if not os.path.exists(cfg.paths.glb):
        fail(f'{cfg.paths.glb} does not exist: run python3 studio build {a.animal}')
    with runlog.Run(cfg.animal.id, a.command, cfg.paths.out) as run:
        timer = Timer(run)
        viewer_config.write(cfg)
        # The model GLB of the build in out/, or a new model build (from the stage cache).
        build = _read_json(outputs.build_path(cfg)) or {}
        model_glb = outputs.model_glb(cfg)
        known = (build.get('model') or {}).get('glb')
        if not known or known != outputs.sha256(model_glb):
            log(f'[model] the model build (role "{MODEL_ROLE}") of the config now')
            model_glb = model_step(cfg, ModelBuild(cfg).start(), timer, run)
        outputs.clear_look(cfg)
        timer.run('shots', step_shots, cfg, model_glb)
        timer.run('measures', step_measures, cfg, model_glb)
        outputs.write_look(cfg, model_glb)
        run.checks(timer.run('checks', step_checks, cfg))
        timer.write(cfg)


def view_file(cfg):
    """Returns the pid file of the viewer server of an animal (<out>/view-server.json)."""
    return os.path.join(cfg.paths.out, 'view-server.json')


def alive(pid):
    """Tells if a process with this pid runs (a zombie child counts as gone)."""
    if not pid:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    try:
        done, _ = os.waitpid(pid, os.WNOHANG)
    except ChildProcessError:
        return True
    return done == 0


def stop_view(cfg):
    """Stops the viewer server of an animal: SIGTERM to the studio process and to the process
    group of its Vite child, then SIGKILL after 5 s. Returns False when no server runs."""
    path = view_file(cfg)
    info = _read_json(path)
    if not info:
        return False
    pids = [info.get('pid'), info.get('vite_pid')]
    for pid in pids:
        if alive(pid):
            os.kill(pid, signal.SIGTERM)
    if alive(info.get('vite_pid')):
        try:
            os.killpg(info['vite_pid'], signal.SIGTERM)
        except (ProcessLookupError, PermissionError):
            pass
    deadline = time.time() + 5.0
    while any(alive(p) for p in pids) and time.time() < deadline:
        time.sleep(0.1)
    for pid in pids:
        if alive(pid):
            os.kill(pid, signal.SIGKILL)
    if os.path.exists(path):
        os.remove(path)
    log(f'stopped the viewer of {cfg.animal.id} (pid {info.get("pid")}, Vite pid '
        f'{info.get("vite_pid")}, port {info.get("port")})')
    return True


def cmd_view(a):
    """studio view: serves the viewer on a free port and prints its URL. Ctrl-C, SIGTERM, or
    `studio view <animal> --stop` stops it. The pid file <out>/view-server.json holds the pids,
    the port, and the URLs."""
    cfg = load(a.animal)
    if a.stop:
        if not stop_view(cfg):
            log(f'no viewer of {cfg.animal.id} runs (no {view_file(cfg)})')
        return
    info = _read_json(view_file(cfg))
    if info and alive(info.get('pid')):
        log(f'a viewer of {cfg.animal.id} runs already (pid {info["pid"]}): {info["viewer"]}')
        log(f'stop it with: python3 studio view {cfg.animal.id} --stop')
        return
    if not os.path.exists(cfg.paths.glb):
        fail(f'{cfg.paths.glb} does not exist: run python3 studio build {a.animal}')
    url = viewer_config.write(cfg)
    port = a.port or free_port()
    if port in RESERVED_PORTS:
        fail(f'port {port} is reserved for the servers of the user')
    vite = find_node_bin('vite')
    pages = {'viewer': f'http://localhost:{port}/viewer/index.html?config={url}',
             'compare': f'http://localhost:{port}/viewer/compare.html?config={url}'}
    log(f'viewer: {pages["viewer"]}')
    log(f'compare: {pages["compare"]}')
    # Vite gets a session of its own: a stop signal reaches it through this process (or through
    # --stop, which signals its process group), also when the shell ignores SIGINT for a
    # background job.
    proc = subprocess.Popen([vite, '--config', os.path.join(STUDIO, 'vite.config.js'), '--port',
                             str(port), '--strictPort', '--clearScreen', 'false'], cwd=STUDIO,
                            start_new_session=True)
    with open(view_file(cfg), 'w') as f:
        json.dump({'pid': os.getpid(), 'vite_pid': proc.pid, 'port': port,
                   'started': time.strftime('%Y-%m-%dT%H:%M:%S%z'), **pages}, f, indent=2)
    log(f'pid file: {view_file(cfg)} (stop: python3 studio view {cfg.animal.id} --stop)')

    def stop(signum, _frame):
        raise KeyboardInterrupt(signal.Signals(signum).name)

    for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
        signal.signal(sig, stop)
    try:
        proc.wait()
    except KeyboardInterrupt:
        pass
    finally:
        if proc.poll() is None:
            with_group = [lambda: os.killpg(proc.pid, signal.SIGTERM), proc.terminate]
            for fn in with_group:
                try:
                    fn()
                except (ProcessLookupError, PermissionError):
                    pass
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait()
        info = _read_json(view_file(cfg))
        if info and info.get('pid') == os.getpid():
            os.remove(view_file(cfg))
        log('viewer stopped')


def cmd_log(a):
    """studio log: prints the timeline of the runs (build, regress, compare) from their run
    files: the start, the time, the command, the seed, the cache hits, the result, the step and
    stage times, and the seeds of the pool."""
    if a.animal:
        load(a.animal)
    runlog.main_log(a.animal, a.all, a.last, a.json, not a.short)


def detect_views(path, foreground='difference'):
    """Finds the background and the view columns of a sheet: the runs of columns that hold
    pixels of the figure (by the intake rule `foreground` with its default values; a ground
    shadow does not count). Returns (size, background rgb, [(x0, x1)], [(top, bottom)]): the
    columns of each view and the rows of its figure."""
    from PIL import Image  # noqa: PLC0415

    from studio import intake  # noqa: PLC0415
    from studio.schema import INTAKE  # noqa: PLC0415
    im = Image.open(path).convert('RGB')
    w, h = im.size
    bg = intake.border_color(im)
    rule = config.Section({k: f.default for k, f in INTAKE.fields.items()},
                          foreground=foreground)
    sheet = config.Section(background=bg, foreground=config.Section(min_saturation=14,
                                                                    max_dark_sum=390))
    figure = intake.figure_of(im, sheet, rule)
    px = im.load() if figure is None else figure.load()

    def on(x, y):
        if figure is not None:
            return px[x, y] > 0
        return intake.is_animal(px[x, y], sheet.foreground)

    used = [sum(1 for y in range(0, h, 2) if on(x, y)) > 2 for x in range(w)]
    runs, start = [], None
    for x, u in enumerate(used + [False]):
        if u and start is None:
            start = x
        elif not u and start is not None:
            if x - start > 20:
                runs.append([start, x])
            start = None
    cols, rows = [], []
    for i, (x0, x1) in enumerate(runs):
        lo = 0 if i == 0 else (runs[i - 1][1] + x0) // 2
        hi = w if i == len(runs) - 1 else (x1 + runs[i + 1][0]) // 2
        cols.append((lo, hi))
        ys = [y for y in range(h) if any(on(x, y) for x in range(x0, x1, 2))]
        rows.append((ys[0], ys[-1]))
    return (w, h), list(bg), cols, rows


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


# The methods of a new animal that `studio new` turns on (an existing animal keeps its own
# values): (table, key, value, note, the table that a new table comes before, table comment).
NEW_METHODS = [
    ('intake', 'foreground', 'difference', None, 'field',
     'The masks of the sheet views: a figure pixel differs from the measured background color.'),
    ('checks', 'feature_pixels', 1.0, 'a feature length may differ by 1 px of the sheet', None,
     None),
]


# The head turn range of the 3/4 compare of a new animal: the turn that the sheet check
# measures, plus or minus this many degrees.
HEAD_TURN_SPAN = 6


def sheet_rows(rows, height):
    """Calculates the sheet rows of the compare tiles: the rows of all figures with a margin of
    8 px, on steps of 5 px."""
    top = max(0, min(r[0] for r in rows) - 8)
    bottom = min(height, max(r[1] for r in rows) + 9)
    return [top // 5 * 5, -(-bottom // 5) * 5]


def cmd_new(a):
    """studio new: makes animals/<animal>/ with the sheet and a config. With --like (and no
    --full) the config is the compact config of the like animal (studio/like.py); else it is
    the scaffold of every field with "TODO" fields."""
    from studio import like  # noqa: PLC0415
    from studio.schema import SCHEMA  # noqa: PLC0415
    if not re.fullmatch(r'[a-z][a-z0-9_-]*', a.animal):
        fail('the animal id is lower case letters, digits, hyphens, and underscores')
    root = config.animal_dir(a.animal)
    if os.path.exists(os.path.join(root, 'animal.toml')) and not a.force:
        fail(f'{root}/animal.toml exists (use --force to write over it)')
    if not os.path.exists(a.sheet):
        fail(f'{a.sheet} does not exist')
    os.makedirs(os.path.join(root, 'reference'), exist_ok=True)
    os.makedirs(os.path.join(root, 'out'), exist_ok=True)
    name = os.path.basename(a.sheet)
    shutil.copyfile(a.sheet, os.path.join(root, 'reference', name))
    size, bg, cols, rows = detect_views(a.sheet, a.foreground)
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
    methods = [m for m in NEW_METHODS if not (m[0] == 'intake' and m[1] == 'foreground')]
    methods.insert(0, NEW_METHODS[0][:2] + (a.foreground,) + NEW_METHODS[0][3:])
    compare_rows = sheet_rows(rows, size[1]) if rows else 'TODO'
    title = re.sub('[_-]', ' ', a.animal).title()
    role = a.role or (config.load(a.like).animal.role if a.like else 'conductor')
    if a.like and not a.full:
        with open(os.path.join(config.animal_dir(a.like), 'animal.toml')) as f:
            like_text = f.read()
        header = (f'The {title}: the config of the animal "{a.animal}". `python3 studio new '
                  f'{a.animal} --like {a.like}`\nwrote it from animals/{a.like}/animal.toml '
                  f'(with its comments) and the measures of the new sheet\n(the fields marked '
                  f'"measured"). Each other value is a start from {a.like}: measure it on this '
                  f'sheet\nwith `python3 studio fit` (the field) and `python3 studio calibrate` '
                  f'(the light, the palette,\nthe color classes). `python3 studio schema` '
                  f'explains each field.\n\nUnits: the animal is 1 unit tall, from the soles '
                  f'to the tops of the ears. Axes of three.js\nand glTF: x is the left of the '
                  f'animal, y is up, z is forward. Colors are sRGB 0..255. Angles\nare in '
                  f'degrees.')
        measured = 'measured by studio new'
        changes = [('animal', 'id', a.animal, None, None, None),
                   ('animal', 'name', title, None, None, None),
                   ('animal', 'role', role, None, None, None),
                   ('sheet', 'image', f'reference/{name}', None, None, None),
                   ('sheet', 'background', bg, measured, None, None)]
        changes += [(f'sheet.views.{n}', 'columns', v['columns'], measured, None, None)
                    for n, v in views.items()]
        changes += [('compare', 'rows', compare_rows, measured, None, None)]
        changes += methods
        try:
            text = like.compact(like_text, header, changes) if len(cols) == 4 else None
        except ValueError as e:
            fail(f'the compact config of --like {a.like}: {e} (use --full)')
        if text is None:
            fail(f'the sheet shows {len(cols)} view column(s), not 4: use --full and set '
                 f'sheet.views.*.columns by hand')
        kind = f'the compact config of {a.like}'
    else:
        src = a.like or start_animal(a.animal)
        start = config.load(src)
        filled = {'animal.id': a.animal, 'animal.name': title,
                  'animal.role': role, 'sheet.image': f'reference/{name}',
                  'sheet.background': bg, 'sheet.views': views, 'compare.rows': compare_rows,
                  '_start': src}
        for n, v in views.items():
            for k, x in v.items():
                filled[f'sheet.views.{n}.{k}'] = x
        for table, key, value, *_ in methods:
            filled[f'{table}.{key}'] = value
        head = (f'# The config of the animal "{a.animal}" (made by python3 studio new). Fill '
                f'each "TODO" and each\n# "TODO: measure"; `python3 studio schema` explains '
                f'each field. A value marked "a start ({src})"\n# comes from animals/{src}/'
                f'animal.toml: tune it. A commented line shows a default.\n#\n# Units: the '
                f'animal is 1 unit tall (sole to ear top). Axes of three.js: x left of the '
                f'animal,\n# y up, z forward. Colors are sRGB 0..255. Angles are in degrees.'
                f'\n\n')
        text = head + scaffold(SCHEMA, config.to_plain(start), filled, '', a.like) + '\n'
        kind = 'the scaffold of every field'
    path = os.path.join(root, 'animal.toml')
    with open(path, 'w') as f:
        f.write(text)
    todo = text.count('"TODO"') + text.count('# TODO: measure')
    lines = text.count('\n')
    log(f'made {root}/: animal.toml ({kind}, {lines} lines'
        f'{f", {todo} TODO fields" if todo else ""}), reference/{name}, out/')
    log(f'sheet {size[0]} x {size[1]} px, background {bg}, '
        f'{len(cols)} view column(s) found: {cols}')
    if len(cols) != 4:
        log('  the sheet does not show four views apart: set sheet.views.*.columns by hand')
    try:
        cfg = config.load(a.animal)
    except ConfigError:
        cfg = None
    if cfg:
        # The intake and its sheet check, and the head turn range of the 3/4 compare around the
        # turn that the sheet check measures (studio/consistency.py).
        step_intake(cfg)
        found = _read_json(os.path.join(cfg.paths.out, 'sheet-check.json')) or {}
        turn = next((c['value'] for c in found.get('checks', [])
                     if c['name'] == 'head_turn.three_quarter'), None)
        if turn is not None and 'three_quarter' in cfg.sheet.views:
            lo, hi = round(turn) - HEAD_TURN_SPAN, round(turn) + HEAD_TURN_SPAN
            doc = like.ConfigText(text)
            doc.set('compare', 'head_turn', {'three_quarter': [float(lo), float(hi)]},
                    f'the sheet check measures a 3/4 head turn of {turn} deg')
            with open(path, 'w') as f:
                f.write(doc.text)
            log(f'compare.head_turn: three_quarter = [{lo}, {hi}] (the sheet check measures '
                f'{turn} deg)')
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
        with runlog.Run(cfg.animal.id, a.command, cfg.paths.out) as run:
            run_build(cfg, golden['stats']['seed'], use_cache=not a.no_cache, run=run)
            ok = regression_table(a.animal, golden, cfg)
            run.set(regress='PASS' if ok else 'FAIL')
            if not ok:
                run.result = 'fail'
    else:
        ok = regression_table(a.animal, golden, cfg)
    if not ok:
        sys.exit(1)


def regression_table(animal, golden, cfg):
    """Compares the build in cfg.paths.out with the golden stats and prints the table. Returns
    True when the regression passes."""
    rows, ok = regress.compare(golden, regress.collect(cfg))
    log('')
    log(f'regression of {animal} against {golden.get("source", "golden.json")}:')
    width = max(len(r[0]) for r in rows)
    for item, verdict, detail in rows:
        log(f'  {item:{width}s}  {verdict:12s}  {detail}')
    log('PASS' if ok else 'FAIL')
    return ok


def cmd_fit(a):
    """studio fit: scores the field against the sheet masks with no mesh (about 2 s)."""
    cfg = load(a.animal, a.out)
    timer = Timer()
    t = time.time()
    timer.step('intake', time.time() - t, step_intake(cfg))
    args = [cfg.paths.root, '--out', cfg.paths.out] + (['--rows'] if a.rows else [])
    if a.azimuths:
        args += ['--azimuths', a.azimuths]
    if a.pose != 'reference':
        args += ['--pose', a.pose]
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


def cmd_calibrate(a):
    """studio calibrate: fits the light, the palette, and the dark classes of an animal to its
    sheet with renders of a GLB (studio/calibrate.py), and with --quads the QuadriFlow target
    (studio/quads.py). Writes the values into animal.toml unless --dry-run."""
    from studio import calibrate  # noqa: PLC0415
    from studio.like import ConfigText  # noqa: PLC0415
    cfg = load(a.animal)
    timer = Timer()
    t = time.time()
    timer.step('intake', time.time() - t, step_intake(cfg))
    if not a.no_look:
        source = load(a.source) if a.source else cfg
        if not os.path.exists(source.paths.glb):
            fail(f'{source.paths.glb} does not exist: build {source.animal.id} first, or give '
                 f'--from <animal> with a GLB (for example the like animal)')
        viewer_config.write(cfg)
        node = shutil.which('node') or fail('no node on the path')
        runs = calibrate.runs(cfg.look.light)
        log(f'[calibrate] {len(runs)} renders of the front view of {source.animal.id}.glb')
        t = time.time()
        code = subprocess.call([node, os.path.join(STUDIO, 'studio', 'shoot.mjs'), 'calibrate',
                                '--out', cfg.paths.out, '--glb', viewer_config.url_of(source.paths.glb),
                                '--runs', json.dumps(runs)], cwd=STUDIO)
        timer.step('renders', time.time() - t)
        if code != 0:
            fail('node studio/shoot.mjs calibrate failed (see its message above)')
        t = time.time()
        res = calibrate.calibrate(cfg, source, os.path.join(cfg.paths.out, 'calibrate'),
                                  a.contrast)
        calibrate.save(cfg, res)
        timer.step('fit', time.time() - t)
        for line in calibrate.summary(res):
            log(line)
        if not a.dry_run:
            calibrate.write(cfg.paths.config, res)
            log(f'wrote the light, the palette, and the dark classes into {cfg.paths.config}')
    if a.quads:
        log('[calibrate] the QuadriFlow target (studio/quads.py)')
        t = time.time()
        code, lines = blender('studio/quads.py', [cfg.paths.root, '--out', cfg.paths.out],
                              os.path.join(cfg.paths.out, 'calibrate', 'quads.log'))
        timer.step('quads', time.time() - t)
        for line in lines:
            if line.startswith(('target', 'ratio', 'wrote', 'Error', 'Traceback')):
                log(f'  {line}')
        if code != 0:
            fail('studio/quads.py failed')
        found = _read_json(os.path.join(cfg.paths.out, 'calibrate', 'quads.json'))
        current = cfg.facets.quadriflow_target or cfg.facets.quads
        if found['target'] != current and not a.dry_run:
            with open(cfg.paths.config) as f:
                doc = ConfigText(f.read())
            doc.set('facets', 'quadriflow_target', found['target'],
                    f'python3 studio calibrate --quads: ratio {found["ratio"]}')
            with open(cfg.paths.config, 'w') as f:
                f.write(doc.text)
            log(f'wrote facets.quadriflow_target = {found["target"]} into {cfg.paths.config}')
    log('time: ' + ', '.join(f'{k} {v:.1f} s' for k, v in timer.steps.items()))


def cmd_cache(a):
    """studio cache: prints the size of the shared stage cache by step and by animal, or deletes
    the entries of one animal or the whole cache (clean)."""
    from studio import cache  # noqa: PLC0415
    root = cache_root()
    found = cache.entries(root) if os.path.isdir(root) else []
    if a.animal:
        found = [e for e in found if e[3] == a.animal]
    total = sum(e[1] for e in found)
    who = f'the entries of {a.animal}' if a.animal else 'all entries'
    if a.action == 'clean':
        if a.animal:
            for meta_path, _, _, _ in found:
                cache.remove_entry(meta_path)
        elif os.path.isdir(root):
            shutil.rmtree(root)
        log(f'deleted {who} of the stage cache: {len(found)} entries, {total / 2**20:.1f} MB '
            f'({root})')
        return
    log(f'stage cache: {root} (all worktrees of the repository share it, limit '
        f'{CACHE_LIMIT / 2**30:.0f} GB)')
    log(f'{who}: {len(found)} entries, {total / 2**20:.1f} MB')
    for title, col in (('step', 2), ('animal', 3)):
        groups = {}
        for e in found:
            n, b = groups.get(e[col] or '-', (0, 0))
            groups[e[col] or '-'] = (n + 1, b + e[1])
        log(f'  by {title}:')
        for name, (n, b) in sorted(groups.items()):
            log(f'    {name:28s} {n:5d} entries {b / 2**20:8.1f} MB')


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
    p.add_argument('--stop', action='store_true',
                   help='stop the viewer server of the animal (its pid file)')
    p.set_defaults(fn=cmd_view)
    p = sub.add_parser('log', help='print the timeline of the builds from their run files')
    p.add_argument('animal', nargs='?', default=None, help='one animal (default: all)')
    p.add_argument('--all', action='store_true', help='the runs of all worktrees')
    p.add_argument('--last', type=int, default=20, help='the last N runs (0: all)')
    p.add_argument('--short', action='store_true', help='one line for each run')
    p.add_argument('--json', action='store_true', help='print the run files as JSON')
    p.set_defaults(fn=cmd_log)
    p = sub.add_parser('new', help='scaffold a new animal from its sheet')
    p.add_argument('animal')
    p.add_argument('--sheet', required=True)
    p.add_argument('--role', default=None,
                   help='the role pack (default: the role of --like, else conductor)')
    p.add_argument('--like', default=None,
                   help='write the compact config of this animal, with the measures of the sheet')
    p.add_argument('--full', action='store_true',
                   help='write the scaffold of every field (with --like: its values as starts)')
    p.add_argument('--foreground', default='difference', choices=('difference', 'colored'),
                   help='the intake rule of the new animal (default: difference)')
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
    p.add_argument('--azimuths', default='',
                   help='try these azimuths of the 3/4 view (a,b,c) and keep the best')
    p.add_argument('--pose', default='reference', help='the pose of the field: reference or bind')
    p.set_defaults(fn=cmd_fit)
    p = sub.add_parser('calibrate', help='fit the light, the palette, the dark classes, and '
                                         'the quad target to the sheet')
    p.add_argument('animal')
    p.add_argument('--from', dest='source', default=None,
                   help='render the GLB of this animal (default: the GLB of the animal)')
    p.add_argument('--contrast', type=float, default=None,
                   help='a target belly contrast in place of the contrast of the sheet')
    p.add_argument('--quads', action='store_true', help='also calibrate the QuadriFlow target')
    p.add_argument('--no-look', action='store_true', help='no light, palette, or classes')
    p.add_argument('--dry-run', action='store_true', help='print, write nothing into the config')
    p.set_defaults(fn=cmd_calibrate)
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
    args.command = ' '.join(sys.argv[1:] if argv is None else argv)
    args.fn(args)
