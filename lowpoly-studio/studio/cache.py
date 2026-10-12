"""The stage cache of the build: content keys, read tracking, and the entry store.

Pure Python (numpy only when the process has it), so the CLI and Blender's Python both use it.

A cached step (a Blender stage, or the intake of the CLI) gets its key from three parts:

    inputs   the fingerprint of each input value: a digest of an array or a JSON value, or the
             key of the stage that made a live value (a Blender object, a function)
    reads    the config values that the step read while it ran (Tracked records each read)
    code     the source files whose functions ran in the step (sys.monitoring), and the studio
             files that these files import; in build.py, each stage function on its own

The base key (the step name and the input fingerprints) names a folder. Each entry in it holds
the reads and the code of one run with their digests (the manifest) and the outputs. A lookup
takes the newest entry whose reads and code still have the same digests. Thus a change of a
config value that a step did not read keeps its entry valid, and a change of a value that it
read makes a new entry.

    <root>/<space>/<step>/<base key>/<entry key>.json   the manifest, the output fingerprints,
                                                        the log, the animal
    <root>/<space>/<step>/<base key>/<entry key>.pkl    the outputs (pickle)

All worktrees of the repository share one root (default_root: <git common dir>/lowpoly-studio/
cache), so the first build in a new worktree takes its stages from the builds of the other
worktrees. The keys hold only content digests (no path, no worktree, no animal name). The space
is the program that made the entry ('blender-5.2.0' or 'cli'), so a new Blender version starts an
empty space. A writer writes each file to a unique temporary name and renames it, so a reader in
another process never sees a part of a file.

Two rules keep a cache hit correct:
- A step reads the config only through the Tracked view, and reads no clock and no file that is
  not an input. The output paths (cfg.paths) are not inputs, so they are not recorded.
- A live object that remembers config values across steps hides those reads from the later
  step. Make such a memo inside one step, or in the setup (its reads go to its value).

One rule keeps a key the same in each worktree: a key holds no path of the studio folder. The
digest of a whole-table read leaves out the untracked tables below it (UNTRACKED), so a read of
the whole cfg or of cfg.role holds no folder. A truth test of a table records only whether the
table is empty. The manifest refuses a read whose value holds a path in the studio folder.
"""

import ast
import contextlib
import functools
import hashlib
import json
import os
import pickle
import struct
import subprocess
import sys
import tempfile
import time
import types

from studio.config import STUDIO, Section

# A change of the entry format or of the key rules: all old entries become invalid.
VERSION = 1

# The code of these files does not go into a key: the cache, the stage runner, and the config
# loader (the config values that a step reads are in its key already).
NOT_CODE = ('studio/cache.py', 'studio/stages.py', 'studio/config.py', 'studio/schema.py',
            'studio/cli.py', 'studio/__main__.py')

# The config paths that are output places, not inputs.
UNTRACKED = (('paths',), ('role', 'paths'))

# The marker of a length read in a path (the length of a tracked list).
LEN = '#len'

# The marker of a truth test in a path (whether a tracked table has a key).
TRUTH = '#bool'

_MISSING = object()

# The recorder of the running step (None between steps).
_active = None

# The modules whose functions get keys of their own (build.py): {relative path: globals}.
_function_modules = {}


def _numpy():
    """Returns the numpy module when this process has loaded it, or None."""
    return sys.modules.get('numpy')


def _feed(h, v):
    """Feeds one value into a hash: the type and the exact value (float bits, array bytes)."""
    if isinstance(v, Tracked):
        v = v._tk[0]
    if v is None:
        h.update(b'N;')
    elif v is _MISSING:
        h.update(b'M;')
    elif isinstance(v, bool):
        h.update(b'T;' if v else b'F;')
    elif isinstance(v, int):
        h.update(b'i%d;' % v)
    elif isinstance(v, float):
        h.update(b'f' + struct.pack('<d', v))
    elif isinstance(v, str):
        b = v.encode()
        h.update(b's%d:' % len(b) + b)
    elif isinstance(v, (bytes, bytearray)):
        h.update(b'b%d:' % len(v) + bytes(v))
    elif isinstance(v, dict):
        h.update(b'd%d{' % len(v))
        for k, x in dict.items(v):
            _feed(h, k)
            _feed(h, x)
        h.update(b'}')
    elif isinstance(v, (list, tuple)):
        h.update((b'l' if isinstance(v, list) else b't') + b'%d[' % len(v))
        for x in v:
            _feed(h, x)
        h.update(b']')
    elif isinstance(v, (set, frozenset)):
        parts = sorted(digest(x) for x in v)
        h.update(b'S%d{' % len(parts) + ''.join(parts).encode() + b'}')
    elif isinstance(v, types.CodeType):
        _feed_code(h, v)
    else:
        np = _numpy()
        if np is not None and isinstance(v, np.ndarray):
            if v.dtype == object:
                h.update(b'o' + repr(v.shape).encode())
                for x in v.ravel():
                    _feed(h, x)
            else:
                a = np.ascontiguousarray(v)
                h.update(b'a' + a.dtype.str.encode() + repr(a.shape).encode() + b':')
                h.update(a.tobytes())
        elif np is not None and isinstance(v, np.generic):
            h.update(b'g' + v.dtype.str.encode() + v.tobytes())
        else:
            raise TypeError(f'the cache has no digest for a {type(v).__name__}')


def _feed_code(h, co):
    """Feeds a code object: the bytecode, the names, and the constants (nested code too), with
    no line numbers, so a move of a function keeps its digest."""
    h.update(b'c' + co.co_code + co.co_exceptiontable)
    h.update(repr((co.co_names, co.co_varnames, co.co_freevars, co.co_cellvars,
                   co.co_argcount, co.co_posonlyargcount, co.co_kwonlyargcount,
                   co.co_flags)).encode())
    for c in co.co_consts:
        _feed(h, c)


def digest(value):
    """Calculates the sha256 digest (hex) of a value: None, bool, int, float, str, bytes, a dict,
    list, tuple, or set of these, a numpy array or scalar, or a code object."""
    h = hashlib.sha256()
    _feed(h, value)
    return h.hexdigest()


class Tracked(Section):
    """A read-only view of a config table (or of a dict) that records each read.

    Each read goes into the recorder of the running step as (root, path). A read of a table
    returns a Tracked view of it; a read of any other value records that value, whole. Iteration,
    length, and equality record the whole table. A truth test (`if cfg.role:`) records only
    whether the table has a key. The storage holds the raw values, so the C code of dict (repr,
    a compare with a plain dict) sees the same content.

    Speed: an attribute read keeps its result in the instance dict, so the next read of the same
    attribute skips the hooks. A table view stays there. A value stays there until the next step
    starts (recording() clears it), so each step records its own first read.
    """

    def __init__(self, raw, root, path):
        """Stores the raw table, the root name, and the path of the table in the root."""
        dict.__init__(self, raw)
        object.__setattr__(self, '_tk', (raw, root, tuple(path), {}))

    def _whole(self):
        """Records a read of the whole table."""
        _, root, path, _ = self._tk
        note(root, path)

    def __bool__(self):
        """Tells if the table has a key (records only that fact, not the whole table)."""
        raw, root, path, _ = self._tk
        note(root, path + (TRUTH,))
        return dict.__len__(raw) > 0

    def __getitem__(self, key):
        """Reads one key: a Tracked view of a table, or the value (recorded)."""
        raw, root, path, kids = self._tk
        p = path + (key,)
        if not dict.__contains__(raw, key):
            note(root, p)
            raise KeyError(key)
        v = dict.__getitem__(raw, key)
        if (root, p) in _UNTRACKED_KEYS:
            return v
        memo = type(key) is str and key not in _CLASS_ATTRS
        if isinstance(v, dict):
            kid = kids.get(key)
            if kid is None:
                kid = kids[key] = Tracked(v, root, p)
            if memo:
                self.__dict__[key] = kid
            return kid
        note(root, p)
        if memo and _active is not None:
            self.__dict__[key] = v
            _memo.append((self, key))
        return v

    def __getattr__(self, key):
        """Reads one key as an attribute (a missing key records only that key)."""
        try:
            return self[key]
        except KeyError:
            raise AttributeError(f'the config has no field {key!r} here') from None

    def get(self, key, default=None):
        """Reads one key, or returns the default."""
        try:
            return self[key]
        except KeyError:
            return default

    def __contains__(self, key):
        """Tells if the table has a key (records the value at that key)."""
        raw, root, path, _ = self._tk
        note(root, path + (key,))
        return dict.__contains__(raw, key)

    def __iter__(self):
        """Iterates the keys (records the whole table)."""
        self._whole()
        return iter(dict.keys(self._tk[0]))

    def keys(self):
        """Returns the keys (records the whole table)."""
        self._whole()
        return dict.keys(self._tk[0])

    def values(self):
        """Returns the raw values (records the whole table)."""
        self._whole()
        return dict.values(self._tk[0])

    def items(self):
        """Returns the raw items (records the whole table)."""
        self._whole()
        return dict.items(self._tk[0])

    def __len__(self):
        """Returns the number of keys (records the whole table)."""
        self._whole()
        return dict.__len__(self._tk[0])

    def __eq__(self, other):
        """Compares the raw table (records the whole table)."""
        self._whole()
        if isinstance(other, Tracked):
            other = other._tk[0]
        return self._tk[0] == other

    def __ne__(self, other):
        """Compares the raw table (records the whole table)."""
        return not self == other

    __hash__ = None

    def copy(self):
        """Returns a raw copy (records the whole table)."""
        self._whole()
        return Section(self._tk[0])

    def __reduce_ex__(self, protocol):
        """Pickles the raw table, with no recorder (records the whole table)."""
        self._whole()
        return self._tk[0].__reduce_ex__(protocol)

    def __deepcopy__(self, memo):
        """Copies the raw table (records the whole table)."""
        import copy  # noqa: PLC0415
        self._whole()
        return copy.deepcopy(self._tk[0], memo)

    def __repr__(self):
        """Shows the raw table (no record: printing only)."""
        return repr(self._tk[0])


_UNTRACKED_KEYS = {('cfg', p) for p in UNTRACKED}

# The names that a key must not hide on a view (the methods of dict and Tracked).
_CLASS_ATTRS = frozenset(dir(Tracked))

# The values that attribute reads keep on the views in the running step: (view, key).
_memo = []


def _clear_memo():
    """Removes the values that attribute reads kept on the views."""
    for view, key in _memo:
        view.__dict__.pop(key, None)
    _memo.clear()


def note(root, path):
    """Records a read of (root, path) in the running step."""
    rec = _active
    if rec is not None:
        rec.reads[(root, path)] = None


def track(value, root):
    """Returns a tracked view of an input of a step: a Tracked table for a dict, a list of
    Tracked tables for a list of dicts (its length recorded), or the value (recorded whole)."""
    if isinstance(value, Tracked):
        return value
    if isinstance(value, dict):
        return Tracked(value, root, ())
    if isinstance(value, list) and all(isinstance(x, dict) for x in value):
        note(root, (LEN,))
        return [Tracked(x, root, (i,)) for i, x in enumerate(value)]
    note(root, ())
    return value


def value_at(root, path):
    """Returns the raw value at a path of a root, or the missing marker."""
    v = root
    for k in path:
        if isinstance(v, Tracked):
            v = v._tk[0]
        if k == LEN:
            return len(v)
        if k == TRUTH:
            return bool(len(v))
        if isinstance(v, dict):
            if not dict.__contains__(v, k):
                return _MISSING
            v = dict.__getitem__(v, k)
        elif isinstance(v, (list, tuple)) and isinstance(k, int):
            if not 0 <= k < len(v):
                return _MISSING
            v = v[k]
        else:
            return _MISSING
    return v


def _drop(value, rest):
    """Returns a table without the value at the key path rest. Copies only the tables on the
    way, as plain dicts (the digest of a dict does not depend on its class)."""
    if isinstance(value, Tracked):
        value = value._tk[0]
    if not isinstance(value, dict) or not dict.__contains__(value, rest[0]):
        return value
    out = dict(dict.items(value))
    if len(rest) == 1:
        del out[rest[0]]
    else:
        out[rest[0]] = _drop(dict.__getitem__(value, rest[0]), rest[1:])
    return out


def recorded_value(roots, root, path):
    """Returns the value of a read for its digest: the raw value at the path, without the
    untracked tables below the path. Thus a read of the whole cfg or of cfg.role holds no
    output path and no folder of a role pack."""
    value = value_at(roots[root], path)
    for r, u in _UNTRACKED_KEYS:
        if r == root and len(u) > len(path) and u[:len(path)] == path:
            value = _drop(value, u[len(path):])
    return value


def studio_path(value):
    """Returns the first string in a value that is the studio folder or a path in it, or None.
    Such a string differs in each worktree."""
    if isinstance(value, Tracked):
        value = value._tk[0]
    if isinstance(value, str):
        return value if value == STUDIO or value.startswith(STUDIO + os.sep) else None
    if isinstance(value, dict):
        items = [x for kv in dict.items(value) for x in kv]
    elif isinstance(value, (list, tuple, set, frozenset)):
        items = value
    else:
        return None
    for x in items:
        hit = studio_path(x)
        if hit is not None:
            return hit
    return None


class _Files:
    """The digests of the source files, and of the studio files that each one imports."""

    def __init__(self):
        """Starts empty memos."""
        self.digests = {}
        self.imports = {}

    def digest(self, rel):
        """Returns the digest of a file under lowpoly-studio/ (a missing file has its own)."""
        path = os.path.join(STUDIO, rel)
        try:
            st = os.stat(path)
        except OSError:
            return digest(None)
        stamp = (st.st_mtime_ns, st.st_size)
        hit = self.digests.get(rel)
        if hit and hit[0] == stamp:
            return hit[1]
        with open(path, 'rb') as f:
            d = hashlib.sha256(f.read()).hexdigest()
        self.digests[rel] = (stamp, d)
        return d

    def imported(self, rel):
        """Lists the studio files that a file imports (import and from-import, no relative
        imports): studio/, templates/, and roles/."""
        d = self.digest(rel)
        hit = self.imports.get(rel)
        if hit and hit[0] == d:
            return hit[1]
        with open(os.path.join(STUDIO, rel), encoding='utf-8') as f:
            tree = ast.parse(f.read())
        mods = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                mods.update(a.name for a in node.names)
            elif isinstance(node, ast.ImportFrom) and node.module and not node.level:
                mods.add(node.module)
                mods.update(f'{node.module}.{a.name}' for a in node.names)
        out = set()
        for m in mods:
            if m.split('.')[0] not in ('studio', 'templates', 'roles'):
                continue
            base = m.replace('.', '/')
            for cand in (f'{base}.py', f'{base}/__init__.py'):
                if os.path.exists(os.path.join(STUDIO, cand)):
                    out.add(cand)
        out = sorted(out)
        self.imports[rel] = (d, out)
        return out


FILES = _Files()


def register_functions(rel, namespace):
    """Gives each function of a module its own code key (build.py: one key per stage function,
    plus one for the plain module constants). namespace: the globals of the module."""
    _function_modules[rel] = namespace


def _code_digest(key):
    """Returns the digest of one code key: a file, 'file::function', or 'file::<globals>'."""
    if '::' not in key:
        return FILES.digest(key)
    rel, name = key.split('::', 1)
    ns = _function_modules.get(rel)
    if ns is None:
        return digest(None)
    if name == '<globals>':
        plain = {}
        for k, v in sorted(ns.items()):
            if k.startswith('__') or k == 'STUDIO':
                continue
            if isinstance(v, (int, float, str, bool, type(None))):
                plain[k] = v
            elif isinstance(v, tuple) and all(isinstance(x, (int, float, str, bool)) for x in v):
                plain[k] = v
        return digest(plain)
    fn = ns.get(name)
    if not isinstance(fn, types.FunctionType):
        return digest(None)
    return digest([fn.__code__, fn.__defaults__ or (), sorted((fn.__kwdefaults__ or {}).items())])


def _relative(filename):
    """Returns a path under lowpoly-studio/ in the form 'studio/x.py', or None."""
    prefix = STUDIO + os.sep
    if not filename.startswith(prefix):
        return None
    return filename[len(prefix):].replace(os.sep, '/')


def _on_code(code, offset):
    """Records the code of a function that starts in the running step (sys.monitoring)."""
    rec = _active
    if rec is not None:
        rel = _relative(code.co_filename)
        if rel is not None and rel not in NOT_CODE:
            if rel in _function_modules:
                rec.code[f'{rel}::{code.co_qualname.split(".")[0]}'] = None
                rec.code[f'{rel}::<globals>'] = None
            else:
                rec.code[rel] = None
    return sys.monitoring.DISABLE


_monitor = {'tool': None, 'started': False}


def _start_monitor():
    """Starts the code monitor once per process. Returns False when the Python has no
    sys.monitoring (then each step depends on every studio file)."""
    if _monitor['started']:
        return _monitor['tool'] is not None
    _monitor['started'] = True
    mon = getattr(sys, 'monitoring', None)
    if mon is None:
        return False
    for tool in (4, 3):
        if mon.get_tool(tool) is None:
            mon.use_tool_id(tool, 'studio-cache')
            _monitor['tool'] = tool
            break
    else:
        return False
    tool = _monitor['tool']
    mon.register_callback(tool, mon.events.PY_START, _on_code)
    mon.register_callback(tool, mon.events.PY_RESUME, _on_code)
    mon.set_events(tool, mon.events.PY_START | mon.events.PY_RESUME)
    return True


def _all_code():
    """Lists every studio source file (the code of a step when there is no monitor)."""
    out = []
    for top in ('studio', 'templates', 'roles'):
        for folder, _, names in os.walk(os.path.join(STUDIO, top)):
            for n in names:
                rel = _relative(os.path.join(folder, n))
                if n.endswith('.py') and rel not in NOT_CODE:
                    out.append(rel)
    return out


class Recorder:
    """The reads and the code of one step."""

    def __init__(self, name):
        """Starts an empty record."""
        self.name = name
        self.reads = {}
        self.code = {}

    def manifest(self, roots):
        """Makes the manifest: each read with the digest of its value in roots, and each code
        key with its digest. roots: {root name: raw value}."""
        reads = []
        for root, path in self.reads:
            if root not in roots:
                raise KeyError(f'step {self.name}: no root {root!r} for the read {path}')
            value = recorded_value(roots, root, path)
            leak = studio_path(value)
            if leak is not None:
                raise ValueError(f'step {self.name}: the read {root} {list(path)} holds the path '
                                 f'{leak!r}. A path differs in each worktree, so the key misses '
                                 f'the shared cache. Read only the fields that the step needs.')
            reads.append([root, list(path), digest(value)])
        reads.sort(key=lambda r: json.dumps(r[:2]))
        keys = set(self.code) if _monitor['tool'] is not None else set(_all_code())
        for rel in [k for k in keys if '::' not in k]:
            keys.update(r for r in FILES.imported(rel)
                        if r not in NOT_CODE and r not in _function_modules)
        code = sorted([k, _code_digest(k)] for k in keys)
        return {'reads': reads, 'code': code}


@contextlib.contextmanager
def recording(rec):
    """Makes rec the recorder of the reads and the code until the block ends."""
    global _active
    _start_monitor()
    _clear_memo()
    prev = _active
    _active = rec
    if _monitor['tool'] is not None:
        sys.monitoring.restart_events()
    try:
        yield rec
    finally:
        _clear_memo()
        _active = prev


def matches(manifest, roots):
    """Tells if each recorded read and each code key still has the digest of the manifest."""
    for root, path, d in manifest['reads']:
        if root not in roots or digest(recorded_value(roots, root, tuple(path))) != d:
            return False
    return all(_code_digest(key) == d for key, d in manifest['code'])


def setup_value(name, fn, roots, parents):
    """Runs fn() (a value of the setup, such as the body or the role pack) under a recorder.
    Returns (value, fingerprint): the digest of the parents and the manifest of the run."""
    rec = Recorder(name)
    with recording(rec):
        value = fn()
    return value, digest([name, list(parents), rec.manifest(roots)])


class Tee:
    """A text stream that writes through to another stream and keeps the lines."""

    def __init__(self, out):
        """Wraps the stream out."""
        self.out = out
        self.text = []

    def write(self, s):
        """Writes s through and keeps it."""
        self.text.append(s)
        return self.out.write(s)

    def flush(self):
        """Flushes the stream below."""
        self.out.flush()

    def lines(self):
        """Returns the kept text as lines."""
        return ''.join(self.text).splitlines()


@contextlib.contextmanager
def capture():
    """Keeps the lines that the block prints (they still print)."""
    tee = Tee(sys.stdout)
    prev = sys.stdout
    sys.stdout = tee
    try:
        yield tee
    finally:
        sys.stdout = prev


@contextlib.contextmanager
def quiet():
    """Drops the lines that the block prints."""
    prev = sys.stdout
    with open(os.devnull, 'w') as null:
        sys.stdout = null
        try:
            yield
        finally:
            sys.stdout = prev


@functools.cache
def shared_root():
    """Returns the folder of the studio state that all worktrees of the repository share: the
    variable STUDIO_SHARED, or <git common dir>/lowpoly-studio, or ~/.cache/lowpoly-studio
    outside a git repository."""
    env = os.environ.get('STUDIO_SHARED')
    if env:
        return os.path.abspath(env)
    try:
        common = subprocess.run(['git', 'rev-parse', '--path-format=absolute',
                                 '--git-common-dir'], cwd=STUDIO, capture_output=True,
                                text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        common = ''
    if common:
        return os.path.join(common, 'lowpoly-studio')
    return os.path.join(os.path.expanduser('~'), '.cache', 'lowpoly-studio')


def default_root():
    """Returns the folder of the stage cache that all worktrees share."""
    return os.path.join(shared_root(), 'cache')


def _write_atomic(path, data):
    """Writes bytes to a file through a unique temporary file in the same folder, then renames
    it, so a reader never sees a part and two writers never share a temporary file."""
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path),
                               prefix=os.path.basename(path) + '.tmp')
    try:
        with os.fdopen(fd, 'wb') as f:
            f.write(data)
        os.replace(tmp, path)
    except BaseException:
        with contextlib.suppress(OSError):
            os.remove(tmp)
        raise


class Store:
    """The cache entries of one program space in the shared cache root."""

    def __init__(self, root, animal=None, space='cli'):
        """Stores the root folder of the cache, the animal of the build (it goes into the meta
        of each entry, for `cache info` and `cache clean <animal>`; it is not a part of a key),
        and the space: the program that makes the entries ('blender-<version>' or 'cli')."""
        self.root = root
        self.animal = animal
        self.space = space

    def lookup(self, step, base, roots):
        """Finds the newest valid entry of a step. Returns (meta, data) or None."""
        folder = os.path.join(self.root, self.space, step, base)
        try:
            names = [n for n in os.listdir(folder) if n.endswith('.json')]
        except OSError:
            return None
        paths = sorted((os.path.join(folder, n) for n in names), key=_mtime, reverse=True)
        for meta_path in paths:
            try:
                with open(meta_path) as f:
                    meta = json.load(f)
            except (OSError, ValueError):
                continue
            if meta.get('version') != VERSION or not matches(meta['manifest'], roots):
                continue
            data_path = meta_path[:-5] + '.pkl'
            try:
                with open(data_path, 'rb') as f:
                    data = pickle.load(f)
            except (OSError, pickle.UnpicklingError, EOFError):
                continue
            now = time.time()
            for p in (meta_path, data_path):
                with contextlib.suppress(OSError):
                    os.utime(p, (now, now))
            return meta, data
        return None

    def save(self, step, base, key, meta, data):
        """Writes an entry: the data first, then the meta (a meta means a whole entry)."""
        folder = os.path.join(self.root, self.space, step, base)
        os.makedirs(folder, exist_ok=True)
        meta = dict(meta, version=VERSION, step=step, base=base, key=key, animal=self.animal)
        _write_atomic(os.path.join(folder, f'{key}.pkl'),
                      pickle.dumps(data, protocol=pickle.HIGHEST_PROTOCOL))
        _write_atomic(os.path.join(folder, f'{key}.json'),
                      json.dumps(meta, indent=1).encode())


def _mtime(path):
    """Returns the modification time of a file, or 0."""
    try:
        return os.stat(path).st_mtime
    except OSError:
        return 0.0


def size(root):
    """Returns (bytes, entries) of a cache folder."""
    total = entries = 0
    for folder, _, names in os.walk(root):
        for n in names:
            with contextlib.suppress(OSError):
                total += os.path.getsize(os.path.join(folder, n))
            entries += n.endswith('.json')
    return total, entries


def entries(root):
    """Lists the entries of a cache folder: (meta path, bytes of the meta and the data, the
    space/step folder, the animal of the meta or None)."""
    out = []
    for folder, _, names in os.walk(root):
        for n in names:
            if not n.endswith('.json') or '.tmp' in n:
                continue
            p = os.path.join(folder, n)
            pkl = p[:-5] + '.pkl'
            b = 0
            for q in (p, pkl):
                with contextlib.suppress(OSError):
                    b += os.path.getsize(q)
            try:
                with open(p) as f:
                    animal = json.load(f).get('animal')
            except (OSError, ValueError):
                animal = None
            step = os.path.relpath(os.path.dirname(os.path.dirname(p)), root)
            out.append((p, b, step, animal))
    return out


def remove_entry(meta_path):
    """Deletes one entry (its meta and its data)."""
    for p in (meta_path, meta_path[:-5] + '.pkl'):
        with contextlib.suppress(OSError):
            os.remove(p)


def prune(root, limit_bytes):
    """Deletes the least recently used entries until the cache is at most limit_bytes. Also
    deletes the temporary files of stopped writers. Returns the number of deleted entries.

    Another process can write, read, or prune the same root at the same time: a file that
    goes away during the walk counts as no file."""
    files = []
    for folder, _, names in os.walk(root):
        for n in names:
            p = os.path.join(folder, n)
            if '.tmp' in n and time.time() - _mtime(p) > 600:
                with contextlib.suppress(OSError):
                    os.remove(p)
            elif n.endswith('.json'):
                b = 0
                for q in (p, p[:-5] + '.pkl'):
                    with contextlib.suppress(OSError):
                        b += os.path.getsize(q)
                files.append((_mtime(p), b, p))
    total = sum(f[1] for f in files)
    deleted = 0
    for _, b, meta in sorted(files):
        if total <= limit_bytes:
            break
        remove_entry(meta)
        total -= b
        deleted += 1
    return deleted
