"""Prints the fingerprints of the setup values of a build as one JSON line (run in Blender).

    blender -b --factory-startup --python-exit-code 1 --python tests/setup_keys.py -- <animal> [<role>]

The setup values (the body, its parts, the role pack) go into the key of each Blender stage. Two
worktrees with the same files, and a role build and a model build with the same bind pose, must
get the same fingerprints of the model stages. tests/test_cache.py runs this script.
"""

import argparse
import json
import os
import sys

STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, STUDIO)

from studio import build, config  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:]
cfg = config.load(argv[0], None, argv[1] if len(argv) > 1 else None)
_, fingerprints = build.setup(cfg, argparse.Namespace(seed=3, clips='', no_cache=False))
print('SETUP-KEYS ' + json.dumps(fingerprints, sort_keys=True))
