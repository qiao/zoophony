"""Loads and checks an animal config (animals/<id>/animal.toml) against studio/schema.py.

Pure Python 3.11 or later (tomllib), so the CLI and Blender's Python both use it. The result is a
tree of Section objects (dicts with attribute access). Numbers become floats, vectors become
tuples, and every field that the file leaves out takes its default. Each error names the file and
the dotted key, and all errors come in one report.
"""

import os
import tomllib

from studio.schema import REQUIRED, ROLE, SCHEMA, A, F, M, T

STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANIMALS = os.path.join(STUDIO, 'animals')


class ConfigError(Exception):
    """A config that does not match the schema. The message lists every problem."""


class Section(dict):
    """A dict whose keys can also be read as attributes (cfg.field.arm.joints.shoulder)."""

    def __getattr__(self, key):
        """Reads a key as an attribute."""
        try:
            return self[key]
        except KeyError:
            raise AttributeError(f'the config has no field {key!r} here '
                                 f'(fields: {", ".join(self)})') from None


def _number(v):
    """Tells if a TOML value is a number (bool is not one)."""
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _vector(value, n, path, errors):
    """Checks a list of n numbers and returns a tuple of floats."""
    if not isinstance(value, list) or len(value) != n or not all(_number(x) for x in value):
        errors.append(f'{path}: expected a list of {n} numbers, got {value!r}')
        return None
    return tuple(float(x) for x in value)


def _check_value(kind, value, path, errors):
    """Checks one value against a field kind and converts it."""
    if value == 'TODO':
        errors.append(f'{path}: still TODO (measure it on the sheet, see the intake checklist)')
        return None
    if kind == 'str':
        if not isinstance(value, str):
            errors.append(f'{path}: expected a string, got {value!r}')
        return value
    if kind == 'bool':
        if not isinstance(value, bool):
            errors.append(f'{path}: expected true or false, got {value!r}')
        return value
    if kind == 'int':
        if not isinstance(value, int) or isinstance(value, bool):
            errors.append(f'{path}: expected an integer, got {value!r}')
        return value
    if kind == 'num':
        if not _number(value):
            errors.append(f'{path}: expected a number, got {value!r}')
            return None
        return float(value)
    if kind in ('vec2', 'vec3', 'range3', 'rect'):
        return _vector(value, {'vec2': 2, 'vec3': 3, 'range3': 3, 'rect': 4}[kind], path, errors)
    if kind == 'rgb':
        if (not isinstance(value, list) or len(value) != 3
                or not all(isinstance(x, int) and not isinstance(x, bool) and 0 <= x <= 255
                           for x in value)):
            errors.append(f'{path}: expected [r, g, b] with ints from 0 to 255, got {value!r}')
            return None
        return tuple(value)
    if kind == 'ivec2':
        if (not isinstance(value, list) or len(value) != 2
                or not all(isinstance(x, int) and not isinstance(x, bool) for x in value)):
            errors.append(f'{path}: expected a list of 2 integers, got {value!r}')
            return None
        return tuple(value)
    if kind in ('nums', 'ints', 'strs'):
        ok = {'nums': _number, 'ints': lambda x: isinstance(x, int) and not isinstance(x, bool),
              'strs': lambda x: isinstance(x, str)}[kind]
        if not isinstance(value, list) or not all(ok(x) for x in value):
            errors.append(f'{path}: expected a list of {kind[:-1]}s, got {value!r}')
            return None
        return tuple(float(x) for x in value) if kind == 'nums' else tuple(value)
    if kind in ('pairs', 'box', 'seg'):
        n, count = {'pairs': (2, None), 'box': (3, 2), 'seg': (2, 2)}[kind]
        if not isinstance(value, list) or (count and len(value) != count):
            errors.append(f'{path}: expected a list of {count or "any number of"} lists of {n} '
                          f'numbers, got {value!r}')
            return None
        return tuple(_vector(v, n, f'{path}[{i}]', errors) for i, v in enumerate(value))
    raise ValueError(f'unknown kind {kind!r} in the schema at {path}')


def _default(schema):
    """Returns the default of a schema node, or REQUIRED."""
    if isinstance(schema, F):
        return schema.default
    if isinstance(schema, (M, A)):
        return schema.default
    return {}


def _resolve(schema, value, path, errors):
    """Checks a value against a schema node and fills the defaults."""
    if isinstance(schema, F):
        if value is None:
            return None
        return _check_value(schema.kind, value, path, errors)
    if isinstance(schema, T):
        if not isinstance(value, dict):
            errors.append(f'{path}: expected a table, got {value!r}')
            return None
        out = Section()
        for key in value:
            if key not in schema.fields:
                errors.append(f'{path}.{key}: unknown field (fields here: '
                              f'{", ".join(schema.fields)})')
        for key, sub in schema.fields.items():
            sub_path = f'{path}.{key}' if path else key
            if key in value:
                out[key] = _resolve(sub, value[key], sub_path, errors)
                continue
            if isinstance(sub, T) and sub.optional:
                out[key] = None
                continue
            default = _default(sub)
            if default is REQUIRED:
                errors.append(f'{sub_path}: missing ({_doc(sub)})')
                out[key] = None
            elif isinstance(sub, T):
                out[key] = _resolve(sub, {}, sub_path, errors)
            elif isinstance(sub, M):
                out[key] = _resolve(sub, dict(default), sub_path, errors)
            elif isinstance(sub, A):
                out[key] = tuple(_resolve(sub.item, item, f'{sub_path}[{i}]', errors)
                                 for i, item in enumerate(default))
            else:
                out[key] = default
        return out
    if isinstance(schema, M):
        if not isinstance(value, dict):
            errors.append(f'{path}: expected a table, got {value!r}')
            return None
        out = Section()
        for key, item in value.items():
            if schema.keys and key not in schema.keys:
                errors.append(f'{path}.{key}: unknown key (keys here: {", ".join(schema.keys)})')
            out[key] = _resolve(schema.item, item, f'{path}.{key}', errors)
        return out
    if isinstance(schema, A):
        if not isinstance(value, list):
            errors.append(f'{path}: expected an array of tables ([[{path}]]), got {value!r}')
            return None
        return tuple(_resolve(schema.item, item, f'{path}[{i}]', errors)
                     for i, item in enumerate(value))
    raise ValueError(f'unknown schema node at {path}')


def _doc(schema):
    """Returns the first sentence of the doc of a schema node."""
    return schema.doc.split('. ')[0].rstrip('.')


def _cross_checks(cfg, errors):
    """Checks the rules that span fields of an animal config."""
    for i, warp in enumerate(cfg.facets.warps or ()):
        if warp and (warp.center is None) == (warp.at is None):
            errors.append(f'facets.warps[{i}]: give exactly one of "center" and "at"')
    views = cfg.sheet.views or {}
    for name in views:
        if views[name] and views[name].axis not in ('hips', 'shin'):
            errors.append(f'sheet.views.{name}.axis: expected "hips" or "shin"')
    palette = cfg.paint.palette or {}
    for name in ('fur', 'belly', 'muzzle', 'ear', 'ear_inner', 'eye', 'eye_outline', 'sclera',
                 'catchlight', 'nose', 'mouth', 'brow', 'claw'):
        if name not in palette:
            errors.append(f'paint.palette.{name}: missing (the body or a detail uses it)')
    for name in ('fur', 'gloss'):
        if name not in (cfg.look.materials or {}):
            errors.append(f'look.materials.{name}: missing')


def _role_checks(role, errors):
    """Checks the rules that span fields of a role pack."""
    if role.role.stance not in ('standing', 'seated'):
        errors.append('role.stance: expected "standing" or "seated"')
    for i, prop in enumerate(role.props or ()):
        if prop.attach.bone not in ('hand', 'scene'):
            errors.append(f'props[{i}].attach.bone: expected "hand" or "scene"')
        if prop.attach.side not in ('L', 'R'):
            errors.append(f'props[{i}].attach.side: expected "L" or "R"')
        kinds = {'stick': ('hand', ('grip', 'direction', 'length', 'handle', 'shaft')),
                 'piano': ('scene', ('piano',)), 'bench': ('scene', ('bench',))}
        if prop.kind not in kinds:
            errors.append(f'props[{i}].kind: expected one of {", ".join(kinds)}')
            continue
        bone, needs = kinds[prop.kind]
        if prop.attach.bone != bone:
            errors.append(f'props[{i}]: a "{prop.kind}" needs attach.bone = "{bone}"')
        for key in needs:
            if prop[key] is None:
                errors.append(f'props[{i}].{key}: missing (a "{prop.kind}" needs it)')


def role_dir(name):
    """Returns the folder of a role pack."""
    return os.path.join(STUDIO, 'roles', name)


def load_role(name):
    """Loads and checks a role pack (roles/<name>/role.toml). Raises ConfigError."""
    path = os.path.join(role_dir(name), 'role.toml')
    if not os.path.exists(path):
        known = sorted(d for d in os.listdir(os.path.join(STUDIO, 'roles'))
                       if os.path.exists(os.path.join(role_dir(d), 'role.toml')))
        raise ConfigError(f'{path}: no such role pack (role packs: {", ".join(known)})')
    with open(path, 'rb') as f:
        try:
            raw = tomllib.load(f)
        except tomllib.TOMLDecodeError as e:
            raise ConfigError(f'{path}: {e}') from None
    errors = []
    role = _resolve(ROLE, raw, '', errors)
    if not errors:
        _role_checks(role, errors)
    if errors:
        raise ConfigError(f'{path}: {len(errors)} problem(s)\n  ' + '\n  '.join(errors))
    role['paths'] = Section(root=role_dir(name), config=path)
    return role


def animal_dir(animal):
    """Returns the folder of an animal (a name under animals/, or a path)."""
    if os.sep in animal or os.path.isdir(animal):
        return os.path.abspath(animal)
    return os.path.join(ANIMALS, animal)


def load(animal, out_dir=None):
    """Loads and checks the config of an animal. Raises ConfigError with all problems.

    out_dir: the folder of the outputs (default: <animal folder>/out). Parallel seed runs and the
    regression use folders of their own.
    """
    root = animal_dir(animal)
    path = os.path.join(root, 'animal.toml')
    if not os.path.exists(path):
        raise ConfigError(f'{path}: no such file (make one with: python3 studio new <id> '
                          f'--sheet <png>)')
    with open(path, 'rb') as f:
        try:
            raw = tomllib.load(f)
        except tomllib.TOMLDecodeError as e:
            raise ConfigError(f'{path}: {e}') from None
    errors = []
    cfg = _resolve(SCHEMA, raw, '', errors)
    if not errors:
        _cross_checks(cfg, errors)
    if errors:
        raise ConfigError(f'{path}: {len(errors)} problem(s)\n  ' + '\n  '.join(errors))
    cfg['role'] = load_role(cfg.animal.role)
    if cfg.role.role.template != cfg.animal.template:
        raise ConfigError(f'{path}: the role {cfg.animal.role!r} needs the template '
                          f'{cfg.role.role.template!r}, and the animal has {cfg.animal.template!r}')
    out = os.path.abspath(out_dir) if out_dir else os.path.join(root, 'out')
    cfg['paths'] = Section(root=root, config=path, out=out,
                           sheet=os.path.join(root, cfg.sheet.image),
                           measure=os.path.join(out, 'measure.json'),
                           masks=os.path.join(out, 'masks'),
                           glb=os.path.join(out, f'{cfg.animal.id}.glb'),
                           stats=os.path.join(out, f'{cfg.animal.id}.stats.json'),
                           stages=os.path.join(out, 'stages'),
                           compare=os.path.join(out, 'compare'),
                           frames=os.path.join(out, 'frames'))
    return cfg


def to_plain(value):
    """Turns a config tree into plain dicts and lists (for JSON)."""
    if isinstance(value, dict):
        return {k: to_plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_plain(v) for v in value]
    return value
