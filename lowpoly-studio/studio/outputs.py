"""The outputs of a build: the build record, the look record, the clearing of old outputs, and
the state of the look checks (current or stale).

Pure Python. A build owns its output folder. When it starts, it writes <out>/build.json (a new
run id) and deletes the outputs of the earlier build that it makes again or no longer makes: the
GLB, the stats, checks.json, stages/, diag/, and report/. The shots delete compare/, frames/, and
look.json before they render, and write look.json when the renders and the measures are done:

    build.json   {run, command, started, seed, shots, until, glb}   (glb: sha256 at the end)
    look.json    {run, made, glb, model_glb}   the run and the GLBs that the renders show

The look checks (IoU, fur color, features, facet contrast) read the renders. They are current
only when look.json names the run of build.json and the GLBs in out/ still have the digests of
look.json. Else checks.json, the look report, and review.png mark them "stale" with the reason,
and they count as neither pass nor fail. A build with --no-shots therefore never shows the
look checks of an earlier build as current.

out/seeds/ is the report of the last seed pool (summary.json names its run), and a one-seed
build keeps it. out/regress/ is the output folder of `studio regress`, and a build keeps it.
"""

import hashlib
import json
import os
import shutil
import time


def sha256(path):
    """Returns the sha256 (hex) of a file, or None when it does not exist."""
    if not os.path.exists(path):
        return None
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()


def _load(path):
    """Reads a JSON file, or returns None."""
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def write_json(path, data):
    """Writes a JSON file (a report of the build)."""
    _write(path, data)


def _write(path, data):
    """Writes a JSON file."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n')


def _remove(path):
    """Deletes a file or a folder, when it exists."""
    if os.path.isdir(path):
        shutil.rmtree(path)
    elif os.path.exists(path):
        os.remove(path)


def role_key(cfg, clips=None):
    """Calculates the digest of the role pack (each file of roles/<role>/), of the template
    package (its solver makes the poses of the clips), and of the --clips choice. A new digest
    makes the next pool build a role check of every seed (studio/cli.py role_build)."""
    from studio import cache  # noqa: PLC0415 (cache imports subprocess and tempfile)
    studio = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    parts = []
    for top in (cfg.role.paths.root, os.path.join(studio, 'templates', cfg.animal.template)):
        for folder, dirs, names in os.walk(top):
            dirs[:] = sorted(d for d in dirs if d != '__pycache__')
            for n in sorted(names):
                if n.endswith(('.py', '.toml', '.json')):
                    path = os.path.join(folder, n)
                    with open(path, 'rb') as f:
                        parts.append([os.path.relpath(path, studio), f.read()])
    return cache.digest([parts, clips or ''])[:16]


def build_path(cfg):
    """Returns the path of the build record."""
    return os.path.join(cfg.paths.out, 'build.json')


def look_path(cfg):
    """Returns the path of the look record."""
    return os.path.join(cfg.paths.out, 'look.json')


def model_glb(cfg):
    """Returns the path of the GLB of the model build (<out>/model/<id>.glb)."""
    return os.path.join(cfg.paths.out, 'model', os.path.basename(cfg.paths.glb))


def start_build(cfg, run, command, shots, until=None):
    """Starts a build in cfg.paths.out: deletes the outputs that the build makes again or no
    longer makes, and writes build.json with the run id. Returns the run id."""
    for path in (cfg.paths.glb, cfg.paths.stats, os.path.join(cfg.paths.out, 'checks.json'),
                 cfg.paths.stages, os.path.join(cfg.paths.out, 'diag'),
                 os.path.join(cfg.paths.out, 'report')):
        _remove(path)
    _write(build_path(cfg), {'run': run, 'command': command,
                             'started': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'seed': None,
                             'shots': shots, 'until': until, 'glb': None})
    return run


def finish_build(cfg, **fields):
    """Adds fields to build.json (the seed), and the digest of the GLB."""
    data = _load(build_path(cfg)) or {}
    data.update(fields, glb=sha256(cfg.paths.glb))
    _write(build_path(cfg), data)


def clear_look(cfg):
    """Deletes the renders, the frames, the measures, and look.json before the shots."""
    for path in (cfg.paths.compare, cfg.paths.frames, look_path(cfg)):
        _remove(path)


def write_look(cfg, model=None):
    """Writes look.json after the shots and the measures: the run of build.json and the digests
    of the GLBs that the renders show. model: the GLB of the compare (the model build), or
    None when the compare showed the role GLB."""
    build = _load(build_path(cfg)) or {}
    _write(look_path(cfg), {'run': build.get('run'), 'made': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
                            'glb': sha256(cfg.paths.glb),
                            'model_glb': sha256(model) if model else None,
                            'compare': 'model' if model else 'role',
                            'model_seed': (build.get('model') or {}).get('seed') if model else None})


def look_state(cfg):
    """Tells if the renders and the measures in out/ belong to the build in out/.

    Returns {'current': bool, 'reason': text or None, 'run': run of the build, 'look_run': run
    of the renders, 'made': the time of the renders, 'compare': 'model' or 'role'}.
    """
    build = _load(build_path(cfg))
    look = _load(look_path(cfg))
    state = {'current': False, 'reason': None, 'run': (build or {}).get('run'),
             'look_run': (look or {}).get('run'), 'made': (look or {}).get('made'),
             'compare': (look or {}).get('compare'), 'model_seed': (look or {}).get('model_seed')}
    if not look:
        state['reason'] = ('no renders of this build (it ran with --no-shots, or the shots '
                           'stopped)' if os.path.isdir(cfg.paths.compare) else 'no renders')
    elif build and look.get('run') != build.get('run'):
        state['reason'] = (f'the renders are of an earlier build (run {look.get("run")}); the '
                           f'build in out/ (run {build.get("run")}) made none')
    elif look.get('glb') != sha256(cfg.paths.glb):
        state['reason'] = 'the GLB in out/ changed after the renders'
    elif look.get('model_glb') and os.path.exists(model_glb(cfg)) and \
            look['model_glb'] != sha256(model_glb(cfg)):
        state['reason'] = 'the GLB of the model build changed after the renders'
    else:
        state['current'] = True
    return state


def mark_look(report, first, state):
    """Marks the look checks of a check report (the checks from index first on) with
    look: true, and with stale: true when the look state is not current. Then counts only the
    current checks in 'failed' and 'near', lists the stale checks in 'stale', and keeps the
    state in 'look'. 'pass' needs no failed and no stale check."""
    for c in report['checks'][first:]:
        c['look'] = True
        if not state['current']:
            c['stale'] = True
    current = [c for c in report['checks'] if not c.get('stale')]
    report['failed'] = [c['name'] for c in current if not c['pass']]
    report['near'] = [c['name'] for c in current if c.get('near')]
    report['stale'] = [c['name'] for c in report['checks'] if c.get('stale')]
    report['pass'] = not report['failed'] and not report['stale']
    report['look'] = state
    return report
