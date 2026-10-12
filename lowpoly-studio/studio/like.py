"""Writes the compact config of a new animal (python3 studio new <id> --sheet <png> --like <A>).

The compact config is the config file of the like animal, with its comments, and these changes:

- a header that names the new animal and the like animal;
- the measured fields of the new sheet (the id, the name, the role, the image, the background,
  the view columns, and the rows of the compare tiles);
- the methods of a new animal (studio/cli.py NEW_METHODS), for example the difference rule of
  the intake and the pixel floor of the feature checks.

Each other value comes from the like animal. The tools measure it on the new sheet: `fit`
(the field), `calibrate` (the light, the palette, the color classes, and the quad target).

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
        header, or the comment block right above it."""
        heads = [(i, m.group(1)) for i, line in enumerate(self.lines)
                 if (m := HEADER.match(line))]
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
        block), or at the end of the file, with table_note as its comment."""
        text = f'{key} = {toml_value(value)}' + (f'  # {note}' if note else '')
        tables = {name: (i, end) for name, i, end in self._tables()}
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
                self.lines[k] = text
                return
        self.lines.insert(end, text)


def apply(plain, table, key, value):
    """Sets a value in a plain dict tree (the parsed TOML) at table.key."""
    node = plain
    for part in table.split('.'):
        node = node.setdefault(part, {})
    node[key] = value


def compact(like_text, header, changes):
    """Writes the compact config text: the like text, a new header, and the changes.

    changes: a list of (table, key, value, note, before, table_note). Returns the text. Raises
    ValueError when the result does not parse to the like config with the changes applied.
    """
    doc = ConfigText(like_text)
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
