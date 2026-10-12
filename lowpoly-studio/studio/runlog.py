"""The run files of the CLI commands that build or render, and the timeline of `studio log`.

Pure Python. Each run of `build`, `regress`, or `compare` writes one JSON file into the folder
that all worktrees of the repository share (studio/cache.py shared_root):

    <shared root>/runs/<animal>/<id>.json      id: <local start time>-<pid>

The CLI writes the file when the run starts (status "running") and again when it ends, with the
real clock times: the start and the end, the command, the worktree, the seed, the time and the
source (a run or the cache) of each CLI step and each Blender stage, the outcome of each seed of
the pool, and the result of the checks. A run that a signal or a crash stopped keeps the status
"running" and no end. `studio log` prints the runs as a timeline, so that an agent reports the
real times and does not guess them.
"""

import datetime
import json
import os
import subprocess
import sys

from studio import cache
from studio.config import STUDIO


def runs_root():
    """Returns the folder of the run files that all worktrees share."""
    return os.path.join(cache.shared_root(), 'runs')


def _now():
    """Returns the local time now, with its UTC offset."""
    return datetime.datetime.now().astimezone()


def _branch():
    """Returns the git branch of this worktree, or None."""
    try:
        out = subprocess.run(['git', 'branch', '--show-current'], cwd=STUDIO,
                             capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None
    return out or None


def _write(path, data):
    """Writes a JSON file through a temporary file in the same folder."""
    tmp = f'{path}.tmp{os.getpid()}'
    with open(tmp, 'w') as f:
        json.dump(data, f, indent=1)
        f.write('\n')
    os.replace(tmp, path)


class Run:
    """The run file of one CLI command. Use it as a context manager around the command: the
    exit writes the end time and the status ("pass", "fail", or "error")."""

    def __init__(self, animal, command, out):
        """Starts the record of a run of a command on an animal with an output folder."""
        self.started = _now()
        self.id = f'{self.started:%Y%m%d-%H%M%S}-{os.getpid()}'
        self.path = os.path.join(runs_root(), animal, f'{self.id}.json')
        self.data = {'id': self.id, 'animal': animal, 'command': command,
                     'worktree': STUDIO, 'branch': _branch(),
                     'out': os.path.relpath(out, STUDIO),
                     'started': self.started.isoformat(timespec='seconds'),
                     'ended': None, 'seconds': None, 'status': 'running', 'seed': None,
                     'model_seed': None, 'steps': {}, 'sources': {}, 'stages': None,
                     'cache': None, 'pool': None, 'checks': None, 'error': None}
        self.result = None

    def __enter__(self):
        """Writes the file with the status "running"."""
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        _write(self.path, self.data)
        return self

    def set(self, **values):
        """Sets fields of the record (seed, model_seed, ...)."""
        self.data.update(values)

    def timer(self, steps, sources, stages):
        """Keeps the CLI steps, their sources, and the Blender stages (run.json) of the run."""
        self.data['steps'] = dict(steps)
        self.data['sources'] = dict(sources)
        if stages:
            self.data['stages'] = {k: stages.get(k) for k in ('seconds', 'source', 'ran_seconds',
                                                               'stopped')}
        source = list((stages or {}).get('source', {}).values()) + list(sources.values())
        self.data['cache'] = {'hits': sum(s == 'cache' for s in source), 'steps': len(source)}

    def pool(self, summary):
        """Keeps the outcome of each seed of the seed pool."""
        self.data['pool'] = {
            'mode': summary['mode'], 'kept': summary['kept'], 'require': summary.get('require'),
            'wall_seconds': summary['wall_seconds'],
            'results': [{'seed': r['seed'], 'status': r['status'], 'seconds': r['seconds'],
                         'clips_failed': r.get('clips_failed') or [],
                         'cache_hits': sum(v == 'cache' for v in (r.get('source') or {}).values())}
                        for r in summary['results']]}

    def checks(self, report):
        """Keeps the result of the checks."""
        if not report:
            return
        n = len(report['checks'])
        self.data['checks'] = {'gate_pass': report['gate_pass'], 'total': n,
                               'passed': n - len(report['failed'])
                               - len(report.get('stale', [])),
                               'failed': report['failed'], 'stale': report.get('stale', [])}

    def __exit__(self, kind, value, tb):
        """Writes the end time and the status: an explicit result, else the exit code."""
        end = _now()
        status = self.result
        if status is None:
            if kind is None:
                status = 'pass'
            elif issubclass(kind, SystemExit):
                status = 'pass' if value.code in (None, 0) else 'fail'
            elif issubclass(kind, KeyboardInterrupt):
                status = 'stopped'
            else:
                status = 'error'
        if kind is not None and not issubclass(kind, SystemExit):
            self.data['error'] = f'{kind.__name__}: {value}'
        self.data.update(ended=end.isoformat(timespec='seconds'),
                         seconds=round((end - self.started).total_seconds(), 1), status=status)
        _write(self.path, self.data)
        return False


def load(animal=None, everywhere=False):
    """Reads the run files of one animal (or of all animals), of this worktree (or of all
    worktrees with everywhere). Returns the records, the oldest first."""
    root = runs_root()
    if not os.path.isdir(root):
        return []
    names = [animal] if animal else sorted(os.listdir(root))
    out = []
    for name in names:
        folder = os.path.join(root, name)
        if not os.path.isdir(folder):
            continue
        for file in os.listdir(folder):
            if not file.endswith('.json'):
                continue
            try:
                with open(os.path.join(folder, file)) as f:
                    rec = json.load(f)
            except (OSError, ValueError):
                continue
            if everywhere or rec.get('worktree') == STUDIO:
                out.append(rec)
    return sorted(out, key=lambda r: r['started'])


def _clock(iso):
    """Formats an ISO time as 'MM-DD HH:MM:SS'."""
    return datetime.datetime.fromisoformat(iso).strftime('%m-%d %H:%M:%S')


def _wrap(prefix, items, width=100):
    """Joins items after a prefix into lines of at most width characters."""
    lines, line = [], prefix
    for item in items:
        if len(line) + len(item) + 2 > width and line.strip() != prefix.strip():
            lines.append(line.rstrip().rstrip(','))
            line = ' ' * len(prefix)
        line += item + ', '
    lines.append(line.rstrip().rstrip(','))
    return lines


def describe(rec, stages=True):
    """Formats one run as lines: the start, the time, the command, the seed, the cache hits,
    and the result; then the steps, the Blender stages, and the seeds of the pool."""
    seconds = f'{rec["seconds"]:.1f} s' if rec.get('seconds') is not None else 'no end'
    seed = f'seed {rec["seed"]}' if rec.get('seed') is not None else 'no seed'
    if rec.get('model_seed') is not None:
        seed += f', model seed {rec["model_seed"]}'
    cache = rec.get('cache')
    hits = f'cache {cache["hits"]} of {cache["steps"]}' if cache else 'cache -'
    result = rec['status']
    c = rec.get('checks')
    if c:
        result += (f', gates {"pass" if c["gate_pass"] else "FAIL"}, {c["passed"]} of '
                   f'{c["total"]} checks pass')
        if c.get('stale'):
            result += f', {len(c["stale"])} stale'
    if rec.get('regress'):
        result += f', regress {rec["regress"]}'
    if rec.get('error'):
        result += f' ({rec["error"]})'
    where = '' if rec.get('worktree') == STUDIO else f'  [{rec.get("branch") or rec["worktree"]}]'
    lines = [f'{_clock(rec["started"])}  {seconds:>8s}  {rec["command"]}  ({seed}; {hits}; '
             f'{result}){where}']
    if not stages:
        return lines
    pad = ' ' * 18
    steps = [f'{k} {v:.1f}' + (f' ({rec["sources"][k]})' if k in rec.get('sources', {}) else '')
             for k, v in rec.get('steps', {}).items()]
    if steps:
        lines += _wrap(f'{pad}steps: ', steps)
    st = rec.get('stages')
    if st and st.get('seconds'):
        items = []
        for k, v in st['seconds'].items():
            src = (st.get('source') or {}).get(k, 'run')
            items.append(f'{k} {v:.2f}' + (' (cache)' if src == 'cache' else ''))
        if st.get('stopped'):
            items.append(f'stopped after {st["stopped"]} (the remesh gate fails)')
        lines += _wrap(f'{pad}stages: ', items)
    pool = rec.get('pool')
    if pool:
        items = []
        for r in pool['results']:
            why = f' {",".join(r["clips_failed"])}' if r['clips_failed'] else ''
            items.append(f'{r["seed"]} {r["status"]}{why} {r["seconds"]:.0f} s')
        lines += _wrap(f'{pad}seeds ({pool["mode"]}, kept {pool["kept"]}): ', items)
    return lines


def main_log(animal=None, everywhere=False, last=20, as_json=False, stages=True):
    """Prints the timeline of the runs (studio log)."""
    recs = load(animal, everywhere)[-last:] if last else load(animal, everywhere)
    if as_json:
        json.dump(recs, sys.stdout, indent=1)
        sys.stdout.write('\n')
        return
    scope = 'all worktrees' if everywhere else f'this worktree ({STUDIO})'
    print(f'runs of {animal or "all animals"} in {scope}, the oldest first '
          f'(run files: {runs_root()}):')
    if not recs:
        print('  no runs')
    last_animal = None
    for rec in recs:
        if not animal and rec['animal'] != last_animal:
            print(f'{rec["animal"]}:')
            last_animal = rec['animal']
        for line in describe(rec, stages):
            print(f'  {line}')
