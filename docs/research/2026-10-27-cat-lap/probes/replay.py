"""Runs tools/blender/cat_arms.py with the keys of the JSON in BELLY over CAT['belly'] (a try of
the form, with the same steps as the replay).

    Blender -b --factory-startup -P scratch/replay.py -- [<out dir>]
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.getcwd(), 'tools/blender'))
import cat_arms as ca  # noqa: E402

if os.environ.get('BELLY'):
    ca.CAT['belly'].update(json.loads(os.environ['BELLY']))
print('belly', ca.CAT['belly'])
ca.main()
