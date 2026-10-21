"""Gives the rig config of the penguin the split beak and its jaw: the source of the edited mesh
(`beak_split.py`), the joint of the jaw at the hinge between the corners of the mouth, and the
rule that gives the lower beak to the jaw. The other keys keep the values of the round
`mesh-penguin` (`docs/research/2026-10-21-mesh-penguin/make_config.py`).

    python3 -I config_jaw.py <tools/mesh-rigs/penguin.json>
"""
import json
import sys

#: The height of the mouth plane of `beak_split.py`, in studio units.
MOUTH_Y = 0.883

path = sys.argv[1]
with open(path) as f:
    config = json.load(f)
config['source'] = 'assets/models/penguin/penguin-beak.glb'
config['sourceNote'] = (
    'The mesh of the user with the beak split along the mouth line and closed with caps of a dark '
    'mouth color (docs/research/2026-10-21-penguin-beak/beak_split.py, '
    'assets/models/penguin/README.md). The file of the user, penguin.glb, does not change.')
joints = config['joints']
joints['jaw'] = {'head': [0, MOUTH_Y, 0.14], 'tail': [0, MOUTH_Y, 0.234], 'roll': [0, 1, 0]}
config['jointsNote'] += (
    ' The jaw joint lies at the hinge of the beak, the middle of the two corners of the mouth '
    '(x -0.045 and 0.045, y 0.883, z 0.14, beak-split.log), and its tail at the tip of the beak.')
weights = config['weights']
weights['jaw'] = {
    'box': [[-0.07, 0.84, 0.135], [0.07, 0.95, 0.3]],
    'below': MOUTH_Y - 0.0001,
    'note': ('Each vertex of the lower part of the beak, in the box of the beak of beak_split.py '
             'and below the mouth plane (y 0.883), follows the jaw only. The gap of the split puts '
             'the lower edge of the cut 0.00026 u below the plane. The corners of the mouth lie on '
             'the plane and stay on the head.'),
}
with open(path, 'w') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)
    f.write('\n')
