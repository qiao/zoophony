"""The stage runner of the build: each stage is a function with named inputs and named outputs.

A stage reads its inputs from the build context (a dict), and returns a dict of outputs. The
runner checks the outputs, adds them to the context, and writes them into the stage folder
<out>/stages/<nn>-<name>/:

    stage.json   the name, the inputs, the outputs with their kinds, and the time in seconds
    arrays.npz   the outputs of kind 'array' (an array, or a dict of arrays: keys 'name/key')
    data.json    the outputs of kind 'json' (numpy values become lists)

Outputs of kind 'live' (Blender objects, functions, field parts) stay in memory only. The runner
also writes <out>/stages/run.json with the order and the times of all stages.

This is the seam for a stage cache: a stage whose inputs hash the same as in an earlier run can
load its outputs from its folder in place of running. That needs a way to rebuild the live
outputs (the Blender scene) from the saved ones; see the handoff notes.
"""

import json
import os
import time

import numpy as np


class Stage:
    """One stage of the build."""

    def __init__(self, name, fn, inputs, outputs, doc):
        """Stores the function, the input names, the outputs {name: 'array'|'json'|'live'}, and
        a one-line doc."""
        self.name = name
        self.fn = fn
        self.inputs = tuple(inputs)
        self.outputs = dict(outputs)
        self.doc = doc


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


def save(folder, stage, result, seconds):
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
    if arrays:
        np.savez(os.path.join(folder, 'arrays.npz'), **arrays)
    if data:
        with open(os.path.join(folder, 'data.json'), 'w') as f:
            json.dump(data, f)
    with open(os.path.join(folder, 'stage.json'), 'w') as f:
        json.dump({'stage': stage.name, 'doc': stage.doc, 'inputs': list(stage.inputs),
                   'outputs': stage.outputs, 'seconds': round(seconds, 3)}, f, indent=2)


def run(stages, ctx, stage_dir, until=None):
    """Runs the stages in order (up to and including the stage 'until'). Returns the times."""
    times = {}
    for i, stage in enumerate(stages):
        missing = [k for k in stage.inputs if k not in ctx]
        if missing:
            raise KeyError(f'stage {stage.name}: no input {missing} in the build context')
        t0 = time.time()
        result = stage.fn(**{k: ctx[k] for k in stage.inputs})
        seconds = time.time() - t0
        absent = [k for k in stage.outputs if k not in result]
        if absent:
            raise KeyError(f'stage {stage.name}: the function returned no {absent}')
        ctx.update(result)
        save(os.path.join(stage_dir, f'{i + 1:02d}-{stage.name}'), stage, result, seconds)
        times[stage.name] = round(seconds, 2)
        if stage.name == until:
            break
    with open(os.path.join(stage_dir, 'run.json'), 'w') as f:
        json.dump({'stages': [s.name for s in stages], 'seconds': times}, f, indent=2)
    return times
