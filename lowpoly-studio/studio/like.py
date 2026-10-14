"""Writes the compact config of a new animal (python3 studio new <id> --sheet <png> --like <A>).

The compact config is the config file of the like animal, with its comments, and these changes:

- a header that names the new animal and the like animal;
- the measured fields of the new sheet (the id, the name, the role, the image, the background,
  the view columns, and the rows of the compare tiles);
- the methods of a new animal (studio/cli.py NEW_METHODS), for example the difference rule of
  the intake and the pixel floor of the feature checks.

Each other value comes from the like animal. The tools measure it on the new sheet: `fit`
(the field), `calibrate` (the light, the palette, the color classes, and the quad target).

When the body of the new sheet has another height than the body of the like animal (long ears
take a share of the animal height), `new` scales the values of SCALED by the body height ratio
(scale_changes): the warps, the squeeze, the protected regions, the skin offset, the spine
joints, the tail bone, the finger length, the weights, the measure boxes, and the facet crops.
The body height is the crown: the top of the head at the axis of the front view, between the
ears (crown).

The writer edits the text line by line, so it changes only single-line values. It parses the
result again and checks it against the like config with the changes applied.
"""

import json
import re
import tomllib

HEADER = re.compile(r'^\s*\[\[?\s*([^\]\s]+)\s*\]\]?\s*(#.*)?$')


def toml_value(v):
    """Writes one value as TOML."""
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, str):
        return json.dumps(v)
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (list, tuple)):
        return '[' + ', '.join(toml_value(x) for x in v) + ']'
    if isinstance(v, dict):
        return '{ ' + ', '.join(f'{k} = {toml_value(x)}' for k, x in v.items()) + ' }'
    raise ValueError(f'no TOML for {v!r}')


class ConfigText:
    """The lines of a TOML config, with edits of single-line values that keep the comments."""

    def __init__(self, text):
        """Splits the text into lines."""
        self.lines = text.split('\n')

    @property
    def text(self):
        """Returns the text of the lines."""
        return '\n'.join(self.lines)

    def _tables(self):
        """Lists the tables in file order: (name, header line, end line). The end is the next
        header, or the comment block right above it. Item k of an array of tables is named
        "<name>[k]"."""
        heads = []
        items = {}
        for i, line in enumerate(self.lines):
            m = HEADER.match(line)
            if not m:
                continue
            name = m.group(1)
            if line.lstrip().startswith('[['):
                k = items.get(name, 0)
                items[name] = k + 1
                name = f'{name}[{k}]'
            heads.append((i, name))
        out = []
        for k, (i, name) in enumerate(heads):
            end = heads[k + 1][0] if k + 1 < len(heads) else len(self.lines)
            while end - 1 > i and (not self.lines[end - 1].strip()
                                   or self.lines[end - 1].lstrip().startswith('#')):
                end -= 1
            out.append((name, i, end))
        return out

    def _block_start(self, header):
        """Finds the first line of the comment block right above a header line."""
        start = header
        while start > 0 and self.lines[start - 1].lstrip().startswith('#'):
            start -= 1
        return start

    def replace_header(self, comment):
        """Replaces the comment block at the top of the file with comment lines."""
        end = 0
        while end < len(self.lines) and self.lines[end].lstrip().startswith('#'):
            end += 1
        self.lines[:end] = [f'# {line}'.rstrip() for line in comment.split('\n')]

    def set(self, table, key, value, note=None, before=None, table_note=None):
        """Sets key = value in a table. Replaces a single-line value in place, or adds the key at
        the end of the table. A missing table comes before the table `before` (with its comment
        block), or at the end of the file, with table_note as its comment. value None removes
        the key (a single line), so that the default rule of the field applies."""
        text = (f'{key} = {toml_value(value)}' if value is not None else '') + (
            f'  # {note}' if note and value is not None else '')
        tables = {name: (i, end) for name, i, end in self._tables()}
        if value is None and table not in tables:
            return
        if table not in tables:
            block = ([f'# {table_note}'] if table_note else []) + [f'[{table}]', text, '']
            if before in tables:
                at = self._block_start(tables[before][0])
                self.lines[at:at] = block
            else:
                self.lines += [''] + block
            return
        i, end = tables[table]
        pattern = re.compile(rf'^\s*{re.escape(key)}\s*=')
        for k in range(i + 1, end):
            if pattern.match(self.lines[k]):
                try:
                    tomllib.loads(self.lines[k])
                except tomllib.TOMLDecodeError:
                    raise ValueError(f'[{table}] {key}: the value spans lines, the compact '
                                     f'writer changes only single-line values') from None
                if value is None:
                    del self.lines[k]
                else:
                    self.lines[k] = text
                return
        if value is not None:
            self.lines.insert(end, text)


def apply(plain, table, key, value):
    """Sets a value in a plain dict tree (the parsed TOML) at table.key. value None removes
    the key. A table part "name[k]" is item k of an array of tables."""
    node = plain
    for part in table.split('.'):
        m = re.fullmatch(r'(.+)\[(\d+)\]', part)
        node = node[m.group(1)][int(m.group(2))] if m else node.setdefault(part, {})
    if value is None:
        node.pop(key, None)
    else:
        node[key] = value


def compact(like_text, header, changes):
    """Writes the compact config text: the like text, a new header, and the changes.

    changes: a list of (table, key, value, note, before, table_note). header None keeps the
    header of the like text. Returns the text. Raises
    ValueError when the result does not parse to the like config with the changes applied.
    """
    doc = ConfigText(like_text)
    if header is not None:
        doc.replace_header(header)
    for table, key, value, note, before, table_note in changes:
        doc.set(table, key, value, note, before, table_note)
    text = doc.text.rstrip('\n') + '\n'
    expected = tomllib.loads(like_text)
    for table, key, value, *_ in changes:
        apply(expected, table, key, value)
    got = tomllib.loads(text)
    if json.dumps(got, sort_keys=True) != json.dumps(json.loads(json.dumps(expected)),
                                                      sort_keys=True):
        raise ValueError('the compact config does not match the like config with the changes')
    return text


# The values in animal heights that come from the like animal and not from the sheet, which
# `new --like` scales by the body height ratio: (table, key). key None: each key of the table.
# "[]" marks an array of tables (each item), "*" each table of a map.
SCALED = (
    ('facets', 'offset'),
    ('facets', 'squeeze'),
    ('facets.warps[]', None),
    ('facets.protect', None),
    ('rig.spine', None),
    ('rig', 'tail_bone'),
    ('rig', 'fingers_length'),
    ('rig.weights', None),
    ('rig.weights.trunk', None),
    ('measure', 'mesh_belly'),
    ('measure.shading', None),
    ('measure.features.*', 'regions'),
    ('compare.facet_crops', None),
)

# The keys inside SCALED that hold no length: factors, shares, names, flags, and a luminance step.
UNITLESS = ('factor', 'mirror', 'at', 'part', 'x_scale', 'muzzle_scale', 'jump')

# A body height ratio nearer to 1 than this keeps the values of the like animal.
SCALE_MIN = 0.03


def crown(profile):
    """Returns the height of the highest row of a view profile (measure.json) whose runs hold the
    axis (x 0): the top of the head between the ears. Returns None when no row holds it."""
    rows = [row['y'] for row in profile if any(a <= 0 <= b for a, b in row['runs'])]
    return max(rows) if rows else None


def body_ratio(new_views, like_views):
    """Returns the body height of the new sheet over the body height of the like sheet (the
    crowns of the front views of measure.json), or None when a crown is missing."""
    new, old = crown(new_views['front']['profile']), crown(like_views['front']['profile'])
    if not new or not old:
        return None
    return round(new / old, 4)


def scale_value(value, ratio, key=None):
    """Scales the lengths of a value: a number, a list, or an inline table (each key but the
    keys of UNITLESS)."""
    if key in UNITLESS or isinstance(value, (bool, str)):
        return value
    if isinstance(value, (int, float)):
        return round(value * ratio, 4)
    if isinstance(value, list):
        return [scale_value(v, ratio) for v in value]
    if isinstance(value, dict):
        return {k: scale_value(v, ratio, k) for k, v in value.items()}
    return value


def scale_changes(text, ratio, note):
    """Lists the changes that scale the values of SCALED in a config text by ratio.

    Returns (changes, scaled, left): changes as compact() takes them, the names of the scaled
    values, and the names of the values that stay (a feature of the method "bump" measures the
    top of the silhouette, and the top stays at 1). A key of a table that holds an inline table
    scales as one value. A table with a header of its own is not a value of its parent."""
    plain = tomllib.loads(text)
    headers = {name for name, _, _ in ConfigText(text)._tables()}
    changes, scaled, left = [], [], []

    def add(table, node, key):
        if key in UNITLESS or key not in node:
            return
        new = scale_value(node[key], ratio, key)
        if new != node[key]:
            changes.append((table, key, new, note, None, None))
            scaled.append(f'{table}.{key}')

    for table, key in SCALED:
        parts = table.split('.')
        nodes = [('', plain)]
        for part in parts:
            nxt = []
            for name, node in nodes:
                prefix = f'{name}.' if name else ''
                if part == '*':
                    nxt += [(f'{prefix}{k}', v) for k, v in node.items() if isinstance(v, dict)]
                elif part.endswith('[]'):
                    items = node.get(part[:-2]) or []
                    nxt += [(f'{prefix}{part[:-2]}[{i}]', v) for i, v in enumerate(items)]
                elif isinstance(node.get(part), dict):
                    nxt.append((f'{prefix}{part}', node[part]))
            nodes = nxt
        for name, node in nodes:
            if name.startswith('measure.features.') and node.get('method') == 'bump':
                left.append(f'{name}.{key}')
                continue
            keys = [key] if key else [k for k, v in node.items()
                                      if not (isinstance(v, dict) and f'{name}.{k}' in headers)
                                      and not (isinstance(v, list) and v
                                               and isinstance(v[0], dict))]
            for k in keys:
                add(name, node, k)
    return changes, scaled, left
