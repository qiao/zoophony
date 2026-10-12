"""Stage "checks": one structured report of every check of a build, with its value, its limit,
and pass or fail.

Pure Python. It reads the outputs of the earlier stages (stats, stage data, IoU, measures) and
the limits of the config (animal [checks] and role [checks]), and writes <out>/checks.json:

    {"animal": ..., "role": ..., "seed": ..., "gate_pass": bool, "pass": bool,
     "failed": [names], "checks": [{"name", "value", "limit", "op", "pass", "gate", "where"}]}

A gate check fails the build (the contact and fold checks of each clip). The other checks are
reported. "where" holds the place of a failure when the check knows it (the clip, the side, the
part, the time); a later phase can add the faces and the bones of each failure there.
"""

import json
import os

from studio import measure_features


def _load(path):
    """Reads a JSON file, or returns None when it does not exist."""
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


class Report:
    """The checks of one build."""

    def __init__(self):
        """Starts an empty list of checks."""
        self.items = []

    def add(self, name, value, op, limit, gate=False, where=None):
        """Adds one check. op: '<=' (value at most limit), '>=', 'in' (limit is [lo, hi]),
        'abs<=' (value is [model, sheet], |model - sheet| at most limit), or 'rel<=' (|model -
        sheet| / |sheet| at most limit)."""
        if value is None or (isinstance(value, list) and None in value):
            ok = False
        elif op == '<=':
            ok = value <= limit
        elif op == '>=':
            ok = value >= limit
        elif op == 'in':
            ok = limit[0] <= value <= limit[1]
        elif op == 'abs<=':
            ok = abs(value[0] - value[1]) <= limit
        elif op == 'rel<=':
            ok = abs(value[0] - value[1]) <= limit * abs(value[1])
        else:
            raise ValueError(f'unknown op {op!r}')
        item = {'name': name, 'value': value, 'op': op, 'limit': limit, 'pass': bool(ok),
                'gate': gate}
        if where:
            item['where'] = where
        self.items.append(item)

    def result(self, cfg, seed):
        """Returns the report as a dict."""
        failed = [c['name'] for c in self.items if not c['pass']]
        return {'animal': cfg.animal.id, 'role': cfg.role.role.name, 'seed': seed,
                'gate_pass': all(c['pass'] for c in self.items if c['gate']),
                'pass': not failed, 'failed': failed, 'checks': self.items}


def run(cfg):
    """Runs all checks on the outputs in cfg.paths.out and writes <out>/checks.json."""
    lim = cfg.checks
    r = Report()
    stats = _load(cfg.paths.stats) or {}
    seed = stats.get('seed')

    # The gates: the contacts and the folds of each clip, after the fold repair.
    contacts = (stats.get('contacts') or {}).get('clips', {})
    for clip, c in contacts.items():
        where = {'clip': clip, 'side': c['side'], 'part': c['part'], 'time_s': c['time_s']}
        r.add(f'contact.{clip}', c['depth'], '<=', cfg.role.checks.contact_depth, True, where)
        r.add(f'folds.{clip}', c['folded_faces'], '<=', lim.folded_faces, True, {'clip': clip})

    # The rest mesh.
    if stats:
        r.add('rest_inward_faces', stats['folded_faces'], '<=', lim.rest_inward_faces)
        r.add('body_triangles', stats['body_triangles'], 'in', list(lim.body_triangles))
        r.add('slivers', stats['sliver_share'], '<=', lim.slivers)
    remesh = _load(os.path.join(cfg.paths.stages, '02-remesh', 'data.json'))
    if remesh:
        r.add('unpaired_vertices', remesh['remesh_info']['unpaired_vertices'], '<=',
              lim.unpaired_vertices)

    # The silhouette and the fur color of each view (studio/shoot.mjs compare).
    iou = _load(os.path.join(cfg.paths.compare, 'iou.json'))
    for view, v in ((iou or {}).get('views') or {}).items():
        if view in lim.iou:
            r.add(f'iou.{view}', v['iou'], '>=', lim.iou[view])
        hue, sat, val = lim.fur_color
        m, s = v['modelFurHSV'], v['refFurHSV']
        r.add(f'fur_hue.{view}', [m['hue'], s['hue']], 'abs<=', hue)
        r.add(f'fur_saturation.{view}', [m['sat'], s['sat']], 'abs<=', sat)
        r.add(f'fur_value.{view}', [m['val'], s['val']], 'abs<=', val)

    # The features (studio/measure_features.py) and the facet contrast.
    features = _load(os.path.join(cfg.paths.compare, 'features.json')) or {}
    for name, res in features.items():
        feature = cfg.measure.features.get(name)
        if not feature:
            continue
        for check, value, op, limit, where in measure_features.pairs(name, feature, res):
            r.add(check, value, op, limit, where=where)
    topo = _load(os.path.join(cfg.paths.compare, 'topology.json')) or {}
    if 'reference' in topo and 'render_front.png' in topo:
        r.add('facet_contrast', [topo['render_front.png']['belly_contrast']['fine_std'],
                                 topo['reference']['belly_contrast']['fine_std']],
              'rel<=', lim.facet_contrast)

    report = r.result(cfg, seed)
    with open(os.path.join(cfg.paths.out, 'checks.json'), 'w') as f:
        json.dump(report, f, indent=2)
        f.write('\n')
    return report


def summary(report):
    """Formats the report as a few lines for the terminal."""
    n = len(report['checks'])
    lines = [f'checks: {n - len(report["failed"])} of {n} pass, gates '
             f'{"pass" if report["gate_pass"] else "FAIL"}']
    for c in report['checks']:
        if not c['pass']:
            where = f'  {c["where"]}' if c.get('where') else ''
            lines.append(f'  {"GATE " if c["gate"] else ""}FAIL {c["name"]}: {c["value"]} '
                         f'{c["op"]} {c["limit"]}{where}')
    return '\n'.join(lines)
