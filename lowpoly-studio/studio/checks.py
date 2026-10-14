"""Stage "checks": one structured report of every check of a build, with its value, its limit,
pass or fail, and the place of each failure.

Pure Python. It reads the outputs of the earlier stages (stats, stage data, IoU, measures) and
the limits of the config (animal [checks], the feature checks of measure.features, and role
[checks]), and writes <out>/checks.json:

    {"animal": ..., "role": ..., "seed": ..., "gate_pass": bool, "pass": bool,
     "failed": [names], "near": [names],
     "checks": [{"name", "value", "limit", "op", "pass", "near", "gate", "where"}]}

A gate check fails the build (the contact and fold checks of each clip). The other checks are
reported. A passing check is "near" when it uses NEAR or more of its allowance. Each failing or
near check that the tools can locate gets "where": the clip, the frame, the bone, the side, the
body region, the world position, the depth or the angle, and a crop image (studio/locate.py for
the contacts, the folds, and the mesh; the feature crops of the look report for the features).
"""

import glob
import json
import os

from studio import consistency, locate, measure_features, outputs

# A passing check is near its limit when it uses this share of its allowance.
NEAR = 0.75


def _load(path):
    """Reads a JSON file, or returns None when it does not exist."""
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def stage_data(cfg, stage):
    """Reads data.json of a stage of the last Blender build (out/stages/<nn>-<stage>/), or
    returns None."""
    found = sorted(glob.glob(os.path.join(cfg.paths.stages, f'[0-9][0-9]-{stage}', 'data.json')))
    return _load(found[-1]) if found else None


def judge(op, value, limit, floor=0.0):
    """Judges a value against a limit. Returns (pass, near).

    op: '<=' (value at most limit), '>=', 'in' (limit is [lo, hi]), 'abs<=' (value is [model,
    sheet], |model - sheet| at most limit), or 'rel<=' (|model - sheet| / |sheet| at most
    limit). A value that is None, or a pair with a None, fails. floor: the smallest allowed
    |model - sheet| of an 'abs<=' or a 'rel<=' check (the pixel floor of a feature length).
    """
    if value is None or (isinstance(value, list) and None in value):
        return False, False
    if op == '<=':
        ok = value <= limit
        return ok, ok and limit > 0 and value >= NEAR * limit
    if op == '>=':
        # The values of a '>=' check (IoU) are at most 1: the allowance is the room above.
        ok = value >= limit
        return ok, ok and limit < 1 and value < limit + (1 - NEAR) * (1 - limit)
    if op == 'in':
        lo, hi = limit
        ok = lo <= value <= hi
        band = 0.5 * (1 - NEAR) * (hi - lo)
        return ok, ok and (value < lo + band or value > hi - band)
    if op in ('abs<=', 'rel<='):
        diff = abs(value[0] - value[1])
        allowed = max(limit if op == 'abs<=' else limit * abs(value[1]), floor)
        ok = diff <= allowed
        return ok, ok and allowed > 0 and diff >= NEAR * allowed
    raise ValueError(f'unknown op {op!r}')


class Report:
    """The checks of one build."""

    def __init__(self):
        """Starts an empty list of checks."""
        self.items = []

    def add(self, name, value, op, limit, gate=False, where=None, near=None, floor=0.0):
        """Adds one check (see judge). where: the place of a failure, kept only when the check
        fails or is near its limit. near: overrides the near rule (a fold check is near when
        faces turn past 90 degrees, under the fold limit). floor: the pixel floor of a feature
        length (see judge), kept in the check when it is over 0."""
        ok, close = judge(op, value, limit, floor)
        if near is not None:
            close = ok and near
        item = {'name': name, 'value': value, 'op': op, 'limit': limit, 'pass': bool(ok),
                'near': bool(close), 'gate': gate}
        if floor > 0:
            item['floor'] = round(floor, 5)
        if where and (not ok or close):
            item['where'] = where
        self.items.append(item)
        return item

    def result(self, cfg, seed):
        """Returns the report as a dict."""
        failed = [c['name'] for c in self.items if not c['pass']]
        return {'animal': cfg.animal.id, 'role': cfg.role.role.name, 'seed': seed,
                'gate_pass': all(c['pass'] for c in self.items if c['gate']),
                'pass': not failed, 'failed': failed,
                'near': [c['name'] for c in self.items if c['near']], 'checks': self.items}


def feature_where(where):
    """Adds the crop of the look report to the place of a feature check."""
    out = dict(where)
    out['crop'] = f'report/features/{where["feature"]}_{where["view"]}_{where["region"]}.png'
    return out


def run(cfg):
    """Runs all checks on the outputs in cfg.paths.out and writes <out>/checks.json."""
    lim = cfg.checks
    r = Report()
    stats = _load(cfg.paths.stats) or {}
    seed = stats.get('seed')
    diag = locate.load(cfg, stage_data)
    if diag:
        diag.write()

    def where(fn):
        return fn() if diag else None

    # The gates: the contacts and the folds of each clip, after the fold repair.
    contacts = (stats.get('contacts') or {}).get('clips', {})
    for clip, c in contacts.items():
        r.add(f'contact.{clip}', c['depth'], '<=', cfg.role.checks.contact_depth, True,
              where(lambda: diag.where_contact(clip)))
        r.add(f'folds.{clip}', c['folded_faces'], '<=', lim.folded_faces, True,
              where(lambda: diag.where_fold(clip, ('folded', 'turned'))),
              near=c.get('turned_faces', 0) > 0)
        # The scene checks of a role with scene props or hand targets (studio/scene_check.py):
        # the body in a prop, the body on the seat, the knuckles on the targets.
        rc = cfg.role.checks
        if 'scene' in c:
            s = c['scene']
            r.add(f'scene.{clip}', s['depth'], '<=', rc.scene_depth, True,
                  {'clip': clip, 'frame': s['frame'], 'time_s': s['time_s'], 'part': s['piece'],
                   'bone': s['bone'], 'position': s['position'], 'depth': s['depth']})
        if 'seat' in c:
            r.add(f'seat.{clip}', c['seat']['gap'], 'in', [-rc.seat_gap, rc.seat_gap], True,
                  {'clip': clip, 'frame': c['seat']['frame'], 'time_s': c['seat']['time_s']})
        if 'hands' in c:
            h = c['hands']
            r.add(f'hands.{clip}', h['distance'], '<=', rc.hand_targets, True,
                  {'clip': clip, 'frame': h['frame'], 'time_s': h['time_s'], 'side': h['side']})

    # The rest mesh.
    if stats:
        r.add('rest_inward_faces', stats['folded_faces'], '<=', lim.rest_inward_faces,
              where=where(lambda: diag.where_mesh('inward')))
        r.add('body_triangles', stats['body_triangles'], 'in', list(lim.body_triangles))
        r.add('slivers', stats['sliver_share'], '<=', lim.slivers,
              where=where(lambda: diag.where_mesh('sliver')))
    remesh = stage_data(cfg, 'remesh')
    if remesh:
        r.add('unpaired_vertices', remesh['remesh_info']['unpaired_vertices'], '<=',
              lim.unpaired_vertices)
    # studio-speed: the remesh gate of the build (studio/remesh.py, stages/remesh-gate.json).
    gate = _load(os.path.join(cfg.paths.stages, 'remesh-gate.json')) or {}
    for c in gate.get('checks', []):
        r.add(f'remesh_gate.{c["name"]}', c['value'], c['op'], c['limit'], True, c.get('where'))

    # The arm reach of a role with a held instrument (the data of the stage "clips").
    reach_line = reach_checks(r, (stage_data(cfg, 'clips') or {}).get('reach'), cfg.role.checks,
                              cfg.role.clips.fps)

    # studio-runtime: each check from here on is a look check of the renders. outputs.mark_look
    # marks them stale when the renders are not of the build in out/.
    first_look = len(r.items)

    # The silhouette and the fur color of each view (studio/shoot.mjs compare).
    iou = _load(os.path.join(cfg.paths.compare, 'iou.json'))
    for view, v in ((iou or {}).get('views') or {}).items():
        tile = {'view': view, 'crop': f'report/views/{view}.jpg'}
        if view in lim.iou:
            r.add(f'iou.{view}', v['iou'], '>=', lim.iou[view], where=tile)
        if 'headTurn' in v and view in cfg.compare.head_turn:
            # The head turn of the compare render (compare.head_turn): near or out of its range
            # when the best turn is at an end of the range.
            r.add(f'head_turn.{view}', v['headTurn'], 'in', list(cfg.compare.head_turn[view]),
                  where=tile)
        hue, sat, val = lim.fur_color
        m, s = v['modelFurHSV'], v['refFurHSV']
        r.add(f'fur_hue.{view}', [m['hue'], s['hue']], 'abs<=', hue, where=tile)
        r.add(f'fur_saturation.{view}', [m['sat'], s['sat']], 'abs<=', sat, where=tile)
        r.add(f'fur_value.{view}', [m['val'], s['val']], 'abs<=', val, where=tile)

    # The features (studio/measure_features.py) and the facet contrast. The pixel floor of a
    # feature length: checks.feature_pixels pixels of the sheet view in animal heights, plus the
    # rounding step of the measures.
    features = _load(os.path.join(cfg.paths.compare, 'features.json')) or {}
    floors = {}
    if lim.feature_pixels > 0:
        views = (_load(cfg.paths.measure) or {}).get('views', {})
        floors = {v: lim.feature_pixels / m['height_px'] + measure_features.STEP
                  for v, m in views.items()}
    for name, res in features.items():
        feature = cfg.measure.features.get(name)
        if not feature:
            continue
        for check, value, op, limit, where, floor in measure_features.pairs(name, feature, res,
                                                                            floors):
            r.add(check, value, op, limit, where=feature_where(where), floor=floor)
    topo = _load(os.path.join(cfg.paths.compare, 'topology.json')) or {}
    if 'reference' in topo and 'render_front.png' in topo:
        r.add('facet_contrast', [topo['render_front.png']['belly_contrast']['fine_std'],
                                 topo['reference']['belly_contrast']['fine_std']],
              'rel<=', lim.facet_contrast)

    report = r.result(cfg, seed)
    report = outputs.mark_look(report, first_look, outputs.look_state(cfg))  # studio-runtime
    # studio-intake: the warnings of the sheet check (studio/consistency.py), and the failing or
    # near checks that a warning can cause.
    sheet = _load(os.path.join(cfg.paths.out, 'sheet-check.json'))
    if sheet:
        report['sheet'] = {'warnings': sheet['warnings']}
        for c in report['checks']:
            found = consistency.causes(sheet, c['name']) if not c['pass'] or c['near'] else []
            if found:
                c['sheet'] = found
    if reach_line:
        report['reach'] = reach_line
    if diag:
        report['diagnostics'] = {'folds': 'diag/folds.json', 'contacts': 'diag/contacts.json',
                                 'faces': len(diag.faces), 'contacts_found': len(diag.contacts)}
    with open(os.path.join(cfg.paths.out, 'checks.json'), 'w') as f:
        json.dump(report, f, indent=2)
        f.write('\n')
    return report


def reach_checks(r, reach, rc, fps):
    """Adds the reach checks of a role with a held instrument to the report r, and returns the
    reach line of the report (None for a role with no held instrument).

    reach: the data of studio/reach.py reach_report with "instruments" (studio/props.py
    held_instruments). rc: the role [checks]. fps: the frames of a second of the clips. The
    checks: the instrument length over the reach to the middle of the palm (instrument_reach),
    and the largest share of the reach that the IK wrist targets of each clip ask for
    (ik_reach)."""
    if not reach or not reach.get('instruments'):
        return None
    line = {'palm': reach['palm'], 'instruments': reach['instruments'],
            'range': list(rc.instrument_reach), 'ik_limit': rc.ik_reach, 'ik': None}
    for ins in reach['instruments']:
        r.add(f'instrument_reach.{ins["name"]}', round(ins['length'] / reach['palm'], 3), 'in',
              list(rc.instrument_reach),
              where={'part': ins['name'], 'length': ins['length'], 'reach': reach['palm']})
    for clip, arms in reach['clips'].items():
        if not arms:
            continue
        side, (share, frame) = max(arms.items(), key=lambda a: a[1][0])
        r.add(f'ik_reach.{clip}', share, '<=', rc.ik_reach,
              where={'clip': clip, 'frame': frame, 'time_s': round(frame / fps, 3), 'side': side})
        if line['ik'] is None or share > line['ik']['share']:
            line['ik'] = {'share': share, 'clip': clip, 'frame': frame, 'side': side}
    return line


def _where_text(where):
    """Formats the place of a failure in one line."""
    keys = ('clip', 'time_s', 'frame', 'side', 'part', 'bone', 'into_bone', 'face', 'region',
            'position', 'rest_position', 'depth', 'angle_deg', 'smallest_angle_deg', 'rest_dot',
            'view', 'crop')
    return ' '.join(f'{k}={where[k]}' for k in keys if k in where)


def reach_text(report):
    """Formats the reach line of a role with a held instrument (report["reach"]), or returns
    (None, False). Returns (the line, True when a value is out of its range)."""
    reach = report.get('reach') if report else None
    if not reach:
        return None, False
    lo, hi = reach['range']
    parts, bad = [], False
    for ins in reach['instruments']:
        ratio = round(ins['length'] / reach['palm'], 3)
        out = not lo <= ratio <= hi
        bad = bad or out
        parts.append(f'the {ins["name"]} {ins["length"]}, ratio {ratio} (a real player {lo} to '
                     f'{hi}' + (': OUT OF RANGE, a blocker for the app)' if out else ')'))
    line = f'reach: the arm to the middle of the palm {reach["palm"]}, ' + ', '.join(parts)
    ik = reach['ik']
    if ik:
        over = ik['share'] > reach['ik_limit']
        bad = bad or over
        line += (f'; the IK targets ask for up to {ik["share"]} of the reach ({ik["clip"]}, '
                 f'frame {ik["frame"]}, side {ik["side"]})'
                 + (': MORE THAN THE REACH, the paw misses its target' if over else ''))
    return line, bad


def summary(report):
    """Formats the report as a few lines for the terminal."""
    n = len(report['checks'])
    stale = report.get('stale', [])
    lines = [f'checks: {n - len(report["failed"]) - len(stale)} of {n} pass, '
             f'{len(report.get("near", []))} near the limit, gates '
             f'{"pass" if report["gate_pass"] else "FAIL"}']
    line, _ = reach_text(report)
    if line:
        lines.append(f'  {line}')
    # studio-runtime: a stale look check is neither pass nor fail (studio/outputs.py).
    if stale:
        lines.append(f'  STALE: {len(stale)} look checks, {report["look"]["reason"]}')
    warnings = (report.get('sheet') or {}).get('warnings')
    if warnings:
        lines.append(f'  the sheet check warns: {", ".join(warnings)} (out/sheet-check.json)')
    for c in report['checks']:
        if not c['pass'] and not c.get('stale'):
            where = f'\n      at {_where_text(c["where"])}' if c.get('where') else ''
            sheet = f' [sheet: {", ".join(c["sheet"])}]' if c.get('sheet') else ''
            lines.append(f'  {"GATE " if c["gate"] else ""}FAIL {c["name"]}: {c["value"]} '
                         f'{c["op"]} {c["limit"]}{sheet}{where}')
    return '\n'.join(lines)
