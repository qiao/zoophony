"""The stage runner of the build: each stage is a function with named inputs and named outputs.

A stage reads its inputs from the build context (a dict), and returns a dict of outputs. The
runner checks the outputs, adds them to the context, and writes them into the stage folder
<out>/stages/<nn>-<name>/:

    stage.json   the name, the inputs, the outputs with their kinds, the time in seconds, and the
                 source ("run", or "cache" with the time of the run that made the entry)
    arrays.npz   the outputs of kind 'array' (an array, or a dict of arrays: keys 'name/key')
    data.json    the outputs of kind 'json' (numpy values become lists)

Outputs of kind 'live' (Blender objects, functions, field parts) stay in memory only. The runner
also writes <out>/stages/run.json with the order, the times, and the source of all stages.

The cache (studio/cache.py). With a store, each stage gets a key from its inputs, the config
values that it read, and its code. A stage of cache kind 'store' looks up its entry first:

    hit     the outputs come from the entry, and restore(saved, ...) makes the Blender state
            again (the same calls as in the run that made the entry), so the GLB stays the same
    miss    the stage runs, and the runner saves its outputs and its restore data

A stage of cache kind 'run' always runs: it is cheap, and it changes the Blender scene (paint,
rig, assemble). Its key still comes from its inputs, so the stages after it can hit.

The fingerprint of an output: the digest of its value ('array', 'json'), or the key of its stage
('live'). A stage with scene=True reads the whole Blender scene (the export): its key also holds
the keys of all stages before it.
"""

import json
import os
import time

import numpy as np

from studio import cache


class Stage:
    """One stage of the build."""

    def __init__(self, name, fn, inputs, outputs, doc, cache='store', keep=None, restore=None,
                 restore_inputs=(), track=(), scene=False):
        """Stores the stage.

        fn(**inputs) returns the outputs, and '_restore' (the data of restore) when the stage
        has a restore function. outputs: {name: 'array'|'json'|'live'}. cache: 'store' or 'run'.
        keep: the outputs that a cache entry holds (default: the 'array' and 'json' outputs).
        restore(saved, **restore_inputs) returns the other outputs and makes the Blender state;
        the runner calls it after fn and after a cache hit. track: the inputs whose reads go into
        the key one by one (a list of dicts), in place of their whole value. scene: the stage
        reads the whole Blender scene.
        """
        self.name = name
        self.fn = fn
        self.inputs = tuple(inputs)
        self.outputs = dict(outputs)
        self.doc = doc
        self.cache = cache
        self.keep = tuple(keep) if keep is not None else tuple(
            k for k, kind in self.outputs.items() if kind != 'live')
        self.restore = restore
        self.restore_inputs = tuple(restore_inputs)
        self.track = tuple(track)
        self.scene = scene


def _plain(value):
    """Turns numpy values inside a JSON value into plain Python values."""
    if isinstance(value, dict):
        return {str(k): _plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_plain(v) for v in value]
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.generic):
        return value.item()
    return value


def save(folder, stage, result, seconds, source='run', ran_seconds=None):
    """Writes the outputs of one stage into its folder."""
    os.makedirs(folder, exist_ok=True)
    arrays = {}
    data = {}
    for name, kind in stage.outputs.items():
        value = result[name]
        if kind == 'array':
            if isinstance(value, dict):
                for k, v in value.items():
                    arrays[f'{name}/{k}'] = np.asarray(v)
            else:
                arrays[name] = np.asarray(value)
        elif kind == 'json':
            data[name] = _plain(value)
    for name, content in (('arrays.npz', arrays), ('data.json', data)):
        path = os.path.join(folder, name)
        if not content and os.path.exists(path):
            os.remove(path)
    if arrays:
        np.savez(os.path.join(folder, 'arrays.npz'), **arrays)
    if data:
        with open(os.path.join(folder, 'data.json'), 'w') as f:
            json.dump(data, f)
    info = {'stage': stage.name, 'doc': stage.doc, 'inputs': list(stage.inputs),
            'outputs': stage.outputs, 'seconds': round(seconds, 3), 'source': source}
    if ran_seconds is not None:
        info['ran_seconds'] = ran_seconds
    with open(os.path.join(folder, 'stage.json'), 'w') as f:
        json.dump(info, f, indent=2)


def _values(ctx, names):
    """Returns {name: ctx[name]} for the names."""
    return {k: ctx[k] for k in names}


def _check(stage, result):
    """Stops when a stage did not return each of its outputs."""
    absent = [k for k in stage.outputs if k not in result]
    if absent:
        raise KeyError(f'stage {stage.name}: the function returned no {absent}')


def _restore(stage, ctx, result, saved):
    """Calls the restore function of a stage and adds its outputs to the result. The restore
    inputs come from the outputs of the stage first, then from the context."""
    if stage.restore:
        args = {k: result[k] if k in result else ctx[k] for k in stage.restore_inputs}
        result.update(stage.restore(saved, **args))


class Cache:
    """The cache state of one build: the store, the raw config, the fingerprints of the values
    in the context, and the keys of the stages so far."""

    def __init__(self, store, cfg_raw, fingerprints):
        """Stores the store (cache.Store), the raw config (the root of the config reads), and the
        fingerprints of the setup values {name: digest}."""
        self.store = store
        self.cfg_raw = cfg_raw
        self.fps = dict(fingerprints)
        self.keys = []

    def base(self, stage):
        """Calculates the base key of a stage: its name and the fingerprints of its inputs."""
        missing = [k for k in stage.inputs
                   if k != 'cfg' and k not in stage.track and k not in self.fps]
        if missing:
            raise KeyError(f'stage {stage.name}: no fingerprint of {missing}')
        inputs = [[k, self.fps[k]] for k in stage.inputs if k != 'cfg' and k not in stage.track]
        return cache.digest([stage.name, inputs, self.keys if stage.scene else []])

    def run(self, stage, ctx):
        """Runs a stage with the cache. Returns (result, source, seconds of the run that made
        the entry or None)."""
        base = self.base(stage)
        roots = {'cfg': self.cfg_raw, **_values(ctx, stage.track)}
        if stage.cache == 'store':
            hit = self.store.lookup(stage.name, base, roots)
            if hit:
                meta, data = hit
                for line in meta['log']:
                    print(line)
                result = dict(data['outputs'])
                with cache.quiet():
                    _restore(stage, ctx, result, data['restore'])
                self.fps.update(meta['outputs'])
                self.keys.append(meta['key'])
                return result, 'cache', meta['seconds']
        rec = cache.Recorder(stage.name)
        t0 = time.time()
        with cache.capture() as log, cache.recording(rec):
            inputs = {k: cache.track(ctx[k], k) if k in stage.track else ctx[k]
                      for k in stage.inputs}
            result = stage.fn(**inputs)
            saved = result.pop('_restore', None)
            _restore(stage, ctx, result, saved)
        seconds = time.time() - t0
        _check(stage, result)
        manifest = rec.manifest(roots)
        key = cache.digest([base, manifest])
        fps = {name: cache.digest([key, name]) if kind == 'live' else cache.digest(result[name])
               for name, kind in stage.outputs.items()}
        self.fps.update(fps)
        self.keys.append(key)
        if stage.cache == 'store':
            self.store.save(stage.name, base, key,
                            {'manifest': manifest, 'outputs': fps, 'seconds': round(seconds, 3),
                             'log': log.lines()},
                            {'outputs': _values(result, stage.keep), 'restore': saved})
        return result, 'run', None


def run(stages, ctx, stage_dir, until=None, cached=None, after=None):
    """Runs the stages in order (up to and including the stage 'until').

    cached: a Cache, or None (no cache). after(name, ctx): called after each stage; a result of
    False stops the run. Returns the run record (also written to run.json): the order, the
    seconds and the source of each stage, the seconds of the runs that made the cache entries,
    and the stage after which the run stopped early (or None).
    """
    record = {'stages': [s.name for s in stages], 'seconds': {}, 'source': {}, 'ran_seconds': {},
              'cache': cached is not None, 'stopped': None}
    for i, stage in enumerate(stages):
        missing = [k for k in stage.inputs + stage.restore_inputs
                   if k not in ctx and k not in stage.outputs]
        if missing:
            raise KeyError(f'stage {stage.name}: no input {missing} in the build context')
        t0 = time.time()
        if cached is None:
            result = stage.fn(**_values(ctx, stage.inputs))
            saved = result.pop('_restore', None)
            _restore(stage, ctx, result, saved)
            _check(stage, result)
            source, ran = 'run', None
        else:
            result, source, ran = cached.run(stage, ctx)
        seconds = time.time() - t0
        ctx.update(result)
        save(os.path.join(stage_dir, f'{i + 1:02d}-{stage.name}'), stage, result, seconds, source,
             ran)
        record['seconds'][stage.name] = round(seconds, 2)
        record['source'][stage.name] = source
        if ran is not None:
            record['ran_seconds'][stage.name] = ran
        if after and after(stage.name, ctx) is False:
            record['stopped'] = stage.name
            break
        if stage.name == until:
            break
    with open(os.path.join(stage_dir, 'run.json'), 'w') as f:
        json.dump(record, f, indent=2)
    return record
