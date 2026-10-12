"""The look report of a build: one HTML page and one review image.

Pure Python with Pillow. It reads the outputs of a build (checks.json, compare/, frames/, diag/,
stages/) and writes into <out>/report/:

    index.html           the page: the sheet beside the render for each view with the silhouette
                         overlap, the head, feature, and facet crops, every check with its value,
                         limit, and result, the located failures with their crops, the fold
                         debug list, the contacts, and the stage times
    review.png           one image with the key crops and the numbers, for agents that read
                         only images
    views/<view>.jpg     the sheet column, the render, and the overlap of each view
    features/<f>_<v>_<r>.png  the crops of each feature in each view and region, sheet beside
                         render, with the measured boxes and the numbers of its checks

The page uses relative links only, so it works as a static file and from the server of
`python3 studio report <animal>`. A missing output (no shots, no diagnostics) leaves its section
out.
"""

import html
import json
import os

from PIL import Image

from studio import drawing
from studio.measure_features import singular

# The margin around the measured items of a feature crop, in animal heights.
MARGIN = 0.03

# The width of the review image in pixels.
REVIEW_WIDTH = 1800

# The overlap colors of the compare page (viewer/compare.js): both, the sheet only, the render
# only, and neither.
OVERLAP = {(True, True): (150, 150, 150), (True, False): (220, 40, 40),
           (False, True): (40, 90, 230), (False, False): (255, 255, 255)}


def _load(path):
    """Reads a JSON file, or returns None when it does not exist."""
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def _union(boxes):
    """Returns the box around boxes [x0, y0, x1, y1]."""
    return [min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes),
            max(b[3] for b in boxes)]


def _fmt(v):
    """Formats a value for a label or a table cell."""
    if v is None:
        return '-'
    if isinstance(v, bool):
        return str(v).lower()
    if isinstance(v, float):
        if v == 0:
            return '0'
        if abs(v) >= 100:
            return f'{v:.1f}'
        return f'{v:.4f}'.rstrip('0').rstrip('.')
    if isinstance(v, list):
        return '[' + ', '.join(_fmt(x) for x in v) + ']'
    return str(v)


def _value_text(c):
    """Formats the value of a check: 'render | sheet' for a compare with the sheet."""
    v = c['value']
    if c['op'] in ('abs<=', 'rel<=') and isinstance(v, list):
        return f'{_fmt(v[0])} | sheet {_fmt(v[1])}'
    return _fmt(v)


def _state(c):
    """Returns the result word of a check: FAIL, near, or pass."""
    return 'FAIL' if not c['pass'] else 'near' if c.get('near') else 'pass'


class Pictures:
    """The sheet columns and the renders of the views, loaded once."""

    def __init__(self, cfg):
        """Reads measure.json and the sheet."""
        self.cfg = cfg
        self.meta = (_load(cfg.paths.measure) or {}).get('views', {})
        self.sheet = Image.open(cfg.paths.sheet).convert('RGB')
        self._renders = {}

    def sheet_column(self, view):
        """Returns the column of a view of the sheet."""
        c0, c1 = self.meta[view]['column']
        return self.sheet.crop((c0, 0, c1, self.sheet.size[1]))

    def render(self, view):
        """Returns the render of a view (the size of the column), or None."""
        if view not in self._renders:
            path = os.path.join(self.cfg.paths.compare, f'render_{view}.png')
            self._renders[view] = Image.open(path).convert('RGB') if os.path.exists(path) else None
        return self._renders[view]


def view_tiles(cfg, pics, folder):
    """Writes one image of each view: the sheet, the render, and the silhouette overlap (gray:
    both, red: the sheet only, blue: the render only), cut to the rows of the compare. Returns
    {view: file name}."""
    os.makedirs(folder, exist_ok=True)
    out = {}
    r0, r1 = cfg.compare.rows
    bg = cfg.sheet.background
    diff = cfg.measure.background_diff
    for view in pics.meta:
        render = pics.render(view)
        mask_path = os.path.join(cfg.paths.masks, f'{view}.png')
        if render is None or not os.path.exists(mask_path):
            continue
        c0, c1 = pics.meta[view]['column']
        w = c1 - c0
        sheet = pics.sheet_column(view).crop((0, r0, w, r1))
        rend = render.crop((0, r0, w, r1))
        mask = Image.open(mask_path).convert('L').crop((c0, r0, c1, r1))
        mp, rp = mask.load(), rend.load()
        over = Image.new('RGB', (w, r1 - r0))
        op = over.load()
        for y in range(r1 - r0):
            for x in range(w):
                a = mp[x, y] > 127
                b = sum(abs(p - q) for p, q in zip(rp[x, y], bg)) > diff
                op[x, y] = OVERLAP[(a, b)]
        tile = Image.new('RGB', (3 * w + 12, r1 - r0), drawing.PAPER)
        for i, im in enumerate((sheet, rend, over)):
            tile.paste(im, (i * (w + 6), 0))
        file = f'{view}.jpg'
        tile.save(os.path.join(folder, file), quality=88)
        out[view] = file
    return out


def feature_crops(cfg, pics, features, results, folder):
    """Writes one crop for each feature, view, and region: the sheet beside the render around
    the measured items, with the sheet boxes (blue) and the render boxes (orange) on both, and
    the numbers of each check below. Returns {(feature, view, region): file name}."""
    os.makedirs(folder, exist_ok=True)
    for name in os.listdir(folder):
        if name.endswith('.png'):
            os.remove(os.path.join(folder, name))
    out = {}
    for name, res in features.items():
        feature = cfg.measure.features.get(name)
        if not feature:
            continue
        one = singular(name, feature)
        for view, regions in res['views'].items():
            render = pics.render(view)
            if render is None:
                continue
            h = pics.meta[view]['height_px']
            column = pics.sheet_column(view)
            for region, both in regions.items():
                boxes = [item['box_px'] for who in ('sheet', 'render')
                         for item in both[who]['items']] or [both['box_px']]
                m = round(MARGIN * h)
                x0, y0, x1, y1 = _union(boxes)
                crop = (max(0, x0 - m), max(0, y0 - m), min(column.size[0], x1 + m),
                        min(column.size[1], y1 + m))
                marks = []
                for who, color in (('sheet', drawing.SHEET), ('render', drawing.RENDER)):
                    for item in both[who]['items']:
                        bx = item['box_px']
                        marks.append((bx[0] - crop[0], bx[1] - crop[1], bx[2] - crop[0],
                                      bx[3] - crop[1], color))
                tile = drawing.pair(column.crop(crop), render.crop(crop), marks, marks,
                                    height=180, width=300)
                title = name if len(regions) == 1 else f'{name}, {region}'
                rows = [(f'{title} - {view} (blue: sheet, orange: render)', drawing.INK)]
                for c in results:
                    stem, _, rest = c['name'].partition(f'.{view}.')
                    if not rest or not stem.startswith(f'{one}_'):
                        continue
                    check = stem[len(one) + 1:]
                    if check not in feature.checks:
                        continue
                    if len(regions) > 1 and rest != region and not rest.startswith(f'{region}.'):
                        continue
                    color = drawing.FAIL if not c['pass'] else drawing.WARN if c['near'] else \
                        drawing.PASS
                    rows.append((f'{rest} {check}: render {_fmt(c["value"][0])}, sheet '
                                 f'{_fmt(c["value"][1])} ({c["op"]} {c["limit"]}) {_state(c)}',
                                 color))
                width = max(tile.size[0], 380)
                rows = drawing.wrapped(rows, 13, width - 8)
                board = Image.new('RGB', (width, tile.size[1] + 10 + 17 * len(rows)),
                                  drawing.PAPER)
                board.paste(tile, (0, 0))
                drawing.lines(board, (4, tile.size[1] + 4), rows, 13, gap=4)
                file = feature_file(name, view, region)
                board.save(os.path.join(folder, file))
                out[(name, view, region)] = file
    return out


def feature_file(feature, view, region):
    """Returns the file name of the crop of a feature in a region of a view."""
    return f'{feature}_{view}_{region}.png'


CSS = """
:root { --bg: #f6f5f2; --card: #ffffff; --fg: #1d1d1f; --muted: #5f6368; --line: #dcdcd8;
  --fail: #c62828; --near: #9a6700; --pass: #2e7d32; --sheet: #2868dc; --render: #d96a0b;
  --code: #f0efeb; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #161618;
  --card: #1f1f22; --fg: #ececec; --muted: #a0a0a6; --line: #3a3a3f; --fail: #ff6b6b;
  --near: #f0b429; --pass: #6fcf73; --sheet: #7aa7ff; --render: #ffa45c; --code: #2a2a2e; } }
:root[data-theme="dark"] { --bg: #161618; --card: #1f1f22; --fg: #ececec; --muted: #a0a0a6;
  --line: #3a3a3f; --fail: #ff6b6b; --near: #f0b429; --pass: #6fcf73; --sheet: #7aa7ff;
  --render: #ffa45c; --code: #2a2a2e; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg);
  font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1500px; margin: 0 auto; padding: 16px; }
h1 { font-size: 24px; margin: 8px 0 4px; }
h2 { font-size: 19px; margin: 28px 0 8px; border-bottom: 1px solid var(--line);
  padding-bottom: 4px; }
h3 { font-size: 15px; margin: 12px 0 6px; }
nav { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 8px 0 4px; font-size: 14px; }
a { color: var(--sheet); }
.muted { color: var(--muted); }
.fail { color: var(--fail); font-weight: 600; }
.near { color: var(--near); font-weight: 600; }
.pass { color: var(--pass); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
.chip { background: var(--card); border: 1px solid var(--line); border-radius: 8px;
  padding: 6px 10px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.wide { display: grid; grid-template-columns: repeat(auto-fill, minmax(560px, 1fr)); gap: 12px; }
figure { margin: 0; background: var(--card); border: 1px solid var(--line); border-radius: 8px;
  padding: 8px; overflow: hidden; }
figure img { width: 100%; height: auto; display: block; background: #fff; }
figcaption { font-size: 13px; color: var(--muted); margin-top: 6px; overflow-wrap: anywhere; }
.scroll { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; background: var(--card); font-size: 13px; }
th, td { border-bottom: 1px solid var(--line); padding: 4px 8px; text-align: left;
  vertical-align: top; }
th { position: sticky; top: 0; background: var(--card); }
td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
code { background: var(--code); padding: 1px 4px; border-radius: 4px; font-size: 12px; }
.where { font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }
@media (max-width: 640px) { .grid, .wide { grid-template-columns: 1fr; } }
"""


def _e(text):
    """Escapes a text for HTML."""
    return html.escape(str(text))


def _where_html(where, link_prefix='../', crop=True):
    """Formats the place of a failure as a short line, with a link to its crop."""
    keys = ('clip', 'time_s', 'frame', 'side', 'part', 'bone', 'into_bone', 'face', 'region',
            'position', 'rest_position', 'depth', 'angle_deg', 'smallest_angle_deg', 'rest_dot',
            'view')
    text = ', '.join(f'{k} {_fmt(where[k])}' for k in keys if k in where)
    link = ''
    if crop and where.get('crop'):
        link = f' <a href="{_e(link_prefix + where["crop"])}">crop</a>'
    return f'<div class="where">{_e(text)}{link}</div>'


def _figure(src, caption, href=None):
    """Makes a figure with an image and a caption."""
    href = href or src
    return (f'<figure><a href="{_e(href)}"><img src="{_e(src)}" alt="{_e(caption)}" '
            f'loading="lazy"></a><figcaption>{_e(caption)}</figcaption></figure>')


def _exists(cfg, rel):
    """Tells if a file exists under the output folder."""
    return os.path.exists(os.path.join(cfg.paths.out, rel))


def page(cfg, report, views, feature_files, folds, contacts, times):
    """Builds the HTML of the look report."""
    checks = report.get('checks', []) if report else []
    failed = [c for c in checks if not c['pass']]
    near = [c for c in checks if c['pass'] and c.get('near')]
    title = f'{cfg.animal.name} look report'
    out = [f'<!doctype html><html lang="en"><head><meta charset="utf-8">'
           f'<meta name="viewport" content="width=device-width, initial-scale=1">'
           f'<title>{_e(title)}</title><style>{CSS}</style></head><body><main>']
    out.append(f'<h1>{_e(title)}</h1>')
    if report:
        gates = 'pass' if report['gate_pass'] else 'FAIL'
        out.append('<div class="chips">'
                   f'<span class="chip">role <b>{_e(report["role"])}</b></span>'
                   f'<span class="chip">seed <b>{_e(report["seed"])}</b></span>'
                   f'<span class="chip">gates <b class="{"pass" if report["gate_pass"] else "fail"}">'
                   f'{gates}</b></span>'
                   f'<span class="chip">checks <b>{len(checks) - len(failed)} of {len(checks)}'
                   f'</b> pass</span>'
                   f'<span class="chip"><b class="fail">{len(failed)}</b> fail</span>'
                   f'<span class="chip"><b class="near">{len(near)}</b> near the limit</span>'
                   '</div>')
    links = [('#failures', 'Failures'), ('#views', 'Views'), ('#face', 'Head'),
             ('#features', 'Features'), ('#facets', 'Facets'), ('#located', 'Located places'),
             ('#checks', 'All checks'), ('#times', 'Stage times'), ('#frames', 'Frames')]
    files = [('../checks.json', 'checks.json'), ('../diag/folds.json', 'folds.json'),
             ('../diag/contacts.json', 'contacts.json'), ('review.png', 'review image')]
    out.append('<nav>' + ''.join(f'<a href="{h}">{_e(t)}</a>' for h, t in links)
               + '<span class="muted">|</span>'
               + ''.join(f'<a href="{h}">{_e(t)}</a>' for h, t in files
                         if _exists(cfg, h.replace('../', '')) or h == 'review.png')
               + '</nav>')

    # The failing and near checks, each with its place and crop.
    out.append('<h2 id="failures">Failures and checks near the limit</h2>')
    if not failed and not near:
        out.append('<p class="pass">Every check passes, and no check is near its limit.</p>')
    groups = {}
    for c in failed + near:
        crop = (c.get('where') or {}).get('crop')
        groups.setdefault(crop if crop and _exists(cfg, crop) else c['name'], []).append(c)
    cards = []
    for key, group in groups.items():
        lines_ = []
        for c in group:
            state = _state(c)
            where = c.get('where') or {}
            lines_.append(f'<div><b class="{"fail" if state == "FAIL" else "near"}">'
                          f'{"GATE " if c["gate"] else ""}{state}</b> <code>{_e(c["name"])}</code> '
                          f'{_e(_value_text(c))} ({_e(c["op"])} {_e(_fmt(c["limit"]))})'
                          f'{_where_html(where, crop=False) if where else ""}</div>')
        text = ''.join(lines_)
        if key.endswith(('.png', '.jpg')):
            cards.append(f'<figure><a href="../{_e(key)}"><img src="../{_e(key)}" '
                         f'alt="{_e(group[0]["name"])}" loading="lazy"></a><figcaption>{text}'
                         f'</figcaption></figure>')
        else:
            cards.append(f'<figure><figcaption>{text}</figcaption></figure>')
    if cards:
        out.append('<div class="grid">' + ''.join(cards) + '</div>')

    # The views: sheet, render, overlap.
    if views:
        iou = (_load(os.path.join(cfg.paths.compare, 'iou.json')) or {}).get('views', {})
        by_name = {c['name']: c for c in checks}
        out.append('<h2 id="views">Views: sheet, render, and silhouette overlap</h2>'
                   '<p class="muted">Overlap: gray is both, red is the sheet only, blue is the '
                   'render only.</p><div class="wide">')
        for view, file in views.items():
            v = iou.get(view, {})
            cap = [view]
            c = by_name.get(f'iou.{view}')
            if c:
                cap.append(f'IoU {_fmt(c["value"])} ({c["op"]} {_fmt(c["limit"])}, {_state(c)})')
            if v:
                m, s = v['modelFurHSV'], v['refFurHSV']
                cap.append(f'fur hue {m["hue"]} | sheet {s["hue"]}, saturation {m["sat"]} | '
                           f'{s["sat"]}, value {m["val"]} | {s["val"]}')
            out.append(_figure(f'views/{file}', '; '.join(cap)))
        out.append('</div>')

    # The head crops of the compare page, the feature crops, and the facet crops.
    heads = [(f'../compare/face_{v}.png', f'head, {v}: sheet left, render right')
             for v in cfg.sheet.views if _exists(cfg, f'compare/face_{v}.png')]
    if heads:
        out.append('<h2 id="face">Head</h2><div class="wide">'
                   + ''.join(_figure(src, cap) for src, cap in heads) + '</div>')
    if feature_files:
        out.append('<h2 id="features">Features</h2><p class="muted">Blue boxes: the items '
                   'measured on the sheet; orange boxes: on the render. The numbers are the '
                   'checks of measure.features.</p><div class="grid">')
        for (name, view, region), file in feature_files.items():
            out.append(_figure(f'features/{file}', f'{name}, {view}, {region}'))
        out.append('</div>')
    facets = [(f'../compare/facets_{n}.png', f'facets, {n}: sheet left, render right')
              for n in cfg.compare.facet_crops if _exists(cfg, f'compare/facets_{n}.png')]
    if facets:
        out.append('<h2 id="facets">Facets</h2><div class="wide">'
                   + ''.join(_figure(src, cap) for src, cap in facets) + '</div>')

    # The located places: the contacts, the closest approaches, and the fold debug list.
    out.append('<h2 id="located">Located places</h2>')
    if contacts is None and folds is None:
        out.append('<p class="muted">No diagnostics: the last Blender build has no stage '
                   '"diagnostics".</p>')
    if contacts is not None:
        out.append('<h3>Contacts and closest approach of each clip</h3><div class="scroll">'
                   '<table><tr><th>clip</th><th>deepest contact</th><th>closest approach'
                   '</th></tr>')
        clips = list(dict.fromkeys(list(contacts.get('contacts', {}))
                                   + list(contacts.get('gaps', {}))))
        for clip in clips:
            deep = contacts['contacts'].get(clip)
            gap = contacts['gaps'].get(clip)
            dtext = '-'
            if deep:
                link = f' <a href="../{_e(deep["crop"])}">crop</a>' if deep.get('crop') else ''
                dtext = (f'<span class="fail">{deep["depth"] * 100:.2f} cm</span> {_e(deep["part"])} '
                         f'{_e(deep["side"])} into {_e(deep["region"])} at {deep["time_s"]} s'
                         f'{link}')
            gtext = (f'{gap["gap"] * 100:.2f} cm: {_e(gap["part"])} {_e(gap["side"])} to '
                     f'{_e(gap["region"])} at {gap["time_s"]} s' if gap else '-')
            out.append(f'<tr><td>{_e(clip)}</td><td>{dtext}</td><td>{gtext}</td></tr>')
        out.append('</table></div>')
    if folds is not None:
        counts = folds.get('counts') or {}
        out.append(f'<h3>Fold debug list</h3><p class="muted">Each folded (past 120 degrees), '
                   f'turned (past 90 degrees), repaired, inward, or sliver face of the body. '
                   f'{counts.get("body_faces", "-")} body faces, {folds.get("rounds", "-")} '
                   f'check rounds. Rest dot: the cosine between the face normal and the outward '
                   f'direction (below 0: the face points in).</p><div class="scroll"><table>'
                   '<tr><th>face</th><th>status</th><th>region</th><th>clips</th>'
                   '<th>angle</th><th>smallest angle</th><th>rest dot</th><th>weights</th>'
                   '<th>crops</th></tr>')
        for item in folds.get('faces', []):
            status = item['status']
            cls = 'fail' if status in ('folded', 'inward') else 'near' if status in (
                'turned', 'sliver') else 'muted'
            clips = ', '.join(f'{c} {r["time_s"]} s' for c, r in item.get('clips', {}).items())
            crops = [r['crop'] for r in item.get('clips', {}).values() if r.get('crop')]
            if item.get('crop'):
                crops.append(item['crop'])
            links = ' '.join(f'<a href="../{_e(c)}">{i + 1}</a>' for i, c in enumerate(crops))
            weights = ', '.join(f'{b} {w:.2f}' for b, w in item['weights'])
            if item.get('weights_before_repair'):
                weights += ' (before the repair: ' + ', '.join(
                    f'{b} {w:.2f}' for b, w in item['weights_before_repair']) + ')'
            angle = f'{item["angle_deg"]} deg' if 'angle_deg' in item else '-'
            out.append(f'<tr><td>{item["face"]}</td><td class="{cls}">{_e(", ".join(item["tags"]))}'
                       f'</td><td>{_e(item["region"])}</td><td>{_e(clips) or "rest mesh"}</td>'
                       f'<td class="num">{angle}</td><td class="num">'
                       f'{item["smallest_angle_deg"]} deg</td><td class="num">{item["rest_dot"]}'
                       f'</td><td>{_e(weights)}</td><td>{links}</td></tr>')
        out.append('</table></div>')
        crops = [(f'../{r["crop"]}', f'face {item["face"]}, {item["status"]}, {clip}')
                 for item in folds.get('faces', []) for clip, r in item.get('clips', {}).items()
                 if r.get('crop')]
        crops += [(f'../{item["crop"]}', f'face {item["face"]}, {item["status"]}, rest mesh')
                  for item in folds.get('faces', []) if item.get('crop')]
        if crops:
            out.append('<div class="grid">' + ''.join(_figure(s, c) for s, c in crops[:24])
                       + '</div>')

    # Every check.
    out.append('<h2 id="checks">All checks</h2><div class="scroll"><table><tr><th>check</th>'
               '<th>value (render | sheet)</th><th>limit</th><th>result</th><th>gate</th>'
               '<th>place</th></tr>')
    for c in checks:
        state = _state(c)
        cls = {'FAIL': 'fail', 'near': 'near', 'pass': 'pass'}[state]
        where = _where_html(c['where']) if c.get('where') else ''
        out.append(f'<tr><td><code>{_e(c["name"])}</code></td><td class="num">'
                   f'{_e(_value_text(c))}</td><td class="num">{_e(c["op"])} {_e(_fmt(c["limit"]))}'
                   f'</td><td class="{cls}">{state}</td><td>{"gate" if c["gate"] else ""}</td>'
                   f'<td>{where}</td></tr>')
    out.append('</table></div>')

    # The stage times.
    if times:
        out.append('<h2 id="times">Stage times</h2><div class="scroll"><table><tr><th>stage'
                   '</th><th>seconds</th></tr>')
        for name, sec in times:
            out.append(f'<tr><td>{_e(name)}</td><td class="num">{sec:.2f}</td></tr>')
        out.append('</table></div>')

    # The review frames of the role.
    frames = sorted(f for f in os.listdir(cfg.paths.frames)) if os.path.isdir(
        cfg.paths.frames) else []
    if frames:
        out.append('<h2 id="frames">Frames</h2><div class="grid">'
                   + ''.join(_figure(f'../frames/{f}', f[:-4]) for f in frames
                             if f.endswith('.png'))
                   + '</div>')
    out.append('</main></body></html>\n')
    return ''.join(out)


def stage_times(cfg):
    """Lists (name, seconds) of the CLI steps and of the Blender stages of the last build."""
    out = []
    pipeline = _load(os.path.join(cfg.paths.stages, 'pipeline.json'))
    run = _load(os.path.join(cfg.paths.stages, 'run.json'))
    if pipeline:
        out += [(f'step {k}', v) for k, v in pipeline['steps'].items()]
        out.append(('total', pipeline['total']))
    if run:
        out += [(f'blender {k}', v) for k, v in run['seconds'].items()]
    return out


def review_image(cfg, report, pics, views, feature_files, folder):
    """Makes the review image: the numbers, the four views, the head, the feature crops, and
    the located crops, in one PNG of REVIEW_WIDTH pixels."""
    checks = report.get('checks', []) if report else []
    failed = [c for c in checks if not c['pass']]
    near = [c for c in checks if c['pass'] and c.get('near')]
    tiles = []
    head = [(f'{cfg.animal.name} {report["role"] if report else ""}, seed '
             f'{report["seed"] if report else "-"}: gates '
             f'{"pass" if report and report["gate_pass"] else "FAIL"}, '
             f'{len(checks) - len(failed)} of {len(checks)} checks pass, {len(near)} near the '
             f'limit', drawing.INK)]
    head += [(f'FAIL {"(gate) " if c["gate"] else ""}{c["name"]}: {_value_text(c)} '
              f'({c["op"]} {_fmt(c["limit"])})', drawing.FAIL) for c in failed]
    head += [(f'near {c["name"]}: {_value_text(c)} ({c["op"]} {_fmt(c["limit"])})',
              drawing.WARN) for c in near]
    rows = drawing.wrapped(head, 14, REVIEW_WIDTH - 16)
    board = Image.new('RGB', (REVIEW_WIDTH, 12 + 19 * len(rows)), drawing.PAPER)
    drawing.lines(board, (8, 6), rows, 14, gap=5)
    tiles.append(board)

    def load(path, height):
        im = Image.open(path).convert('RGB')
        z = height / im.size[1]
        return im.resize((max(1, round(im.size[0] * z)), height), Image.LANCZOS)

    by_name = {c['name']: c for c in checks}
    view_tiles_ = []
    for view, file in views.items():
        c = by_name.get(f'iou.{view}')
        cap = f'{view}: sheet, render, overlap' + (f'; IoU {_fmt(c["value"])} ({_state(c)})'
                                                   if c else '')
        view_tiles_.append(drawing.framed(load(os.path.join(folder, 'views', file), 215), cap,
                                          14, drawing.FAIL if c and not c['pass'] else drawing.INK))
    if view_tiles_:
        tiles.append(drawing.stack(view_tiles_, REVIEW_WIDTH))
    face = os.path.join(cfg.paths.compare, 'face_front.png')
    crops = []
    if os.path.exists(face):
        crops.append(drawing.framed(load(face, 260), 'head, front: sheet left, render right', 14))
    for file in feature_files.values():
        crops.append(Image.open(os.path.join(folder, 'features', file)).convert('RGB'))
    if crops:
        tiles.append(drawing.stack(crops, REVIEW_WIDTH))
    located = []
    seen = set()
    for c in failed + near:
        crop = (c.get('where') or {}).get('crop')
        if crop and crop.startswith('diag/') and crop not in seen and os.path.exists(
                os.path.join(cfg.paths.out, crop)):
            seen.add(crop)
            located.append(drawing.framed(Image.open(os.path.join(cfg.paths.out, crop)).convert(
                'RGB'), f'{_state(c)} {c["name"]}', 14,
                drawing.FAIL if not c['pass'] else drawing.WARN))
    if located:
        tiles.append(drawing.framed(drawing.stack(located[:8], REVIEW_WIDTH),
                                    'Located failures and near checks', 16))
    out = drawing.stack(tiles, REVIEW_WIDTH, gap=12)
    out.save(os.path.join(folder, 'review.png'), optimize=True)
    return 'review.png'


def write(cfg, report=None):
    """Writes the look report of the outputs in cfg.paths.out. Returns the path of the page."""
    folder = os.path.join(cfg.paths.out, 'report')
    os.makedirs(folder, exist_ok=True)
    report = report or _load(os.path.join(cfg.paths.out, 'checks.json'))
    features = _load(os.path.join(cfg.paths.compare, 'features.json')) or {}
    folds = _load(os.path.join(cfg.paths.out, 'diag', 'folds.json'))
    contacts = _load(os.path.join(cfg.paths.out, 'diag', 'contacts.json'))
    views, feature_files = {}, {}
    if os.path.exists(cfg.paths.measure):
        pics = Pictures(cfg)
        views = view_tiles(cfg, pics, os.path.join(folder, 'views'))
        feature_files = feature_crops(cfg, pics, features,
                                      report.get('checks', []) if report else [],
                                      os.path.join(folder, 'features'))
        review_image(cfg, report, pics, views, feature_files, folder)
    path = os.path.join(folder, 'index.html')
    with open(path, 'w') as f:
        f.write(page(cfg, report, views, feature_files, folds, contacts, stage_times(cfg)))
    return path
