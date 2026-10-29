# Output: the places of `tools/mesh-rigs/wolf.json` at the width 1.2 and the height 0.9.
"""Moves the places of the wolf rig config of round mesh-wolf onto the source at the proportions
(width 1.2, height 0.9, depth 1): x takes 1.2, y takes 0.9, and z keeps its value. The cuts of
the scaled source (measures.txt, arm-axis.txt, paw.txt) check the places. The palm normal is the
measure of paw.txt. Prints the JSON of the changed values; the notes change by hand.

    python3 -I tools/rig/wolf_shape_config.py <wolf.json of 980f2bf5> <out.json>
"""
import json
import sys

W, H = 1.2, 0.9


def num(x):
    x = round(x, 6)
    return int(x) if x == int(x) else x


def point(p):
    return [num(p[0] * W), num(p[1] * H), p[2]]


with open(sys.argv[1]) as f:
    c = json.load(f)
# The rule goes after `weld`, and the shoulder joints take the height factor in meters, so that
# the meters for each unit stay.
c = {k: v for pair in [((k, v), ('proportions', {'width': W, 'height': H})) if k == 'weld'
                       else ((k, v),) for k, v in c.items()] for k, v in pair}
c['app']['shoulders'] = num(c['app']['shoulders'] * H)
for joint in c['joints'].values():
    joint['head'] = point(joint['head'])
    if isinstance(joint['tail'], list):
        joint['tail'] = point(joint['tail'])
c['palm'] = [-0.55, -0.662, -0.51]
# leg-turns.txt: tools/rig/leg_turns.py <config> 25 15 0.
c['studio']['legTurns']['thigh'] = [0.597901, 0.061058, -0.130731, 0.788477]
c['studio']['legTurns']['shin'] = [-0.03511, 0, 0.084263, 0.995825]
w = c['weights']
w['armSplit'] = num(w['armSplit'] * W)
w['headFrom'] = num(w['headFrom'] * H)
for key in ('earBase', 'clavicleFrom', 'armTop'):
    w[key] = [num(y * H) for y in w[key]]
w['shoulderHead'] = [num(x * W) for x in w['shoulderHead']]
w['haunch']['height'] = [num(y * H) for y in w['haunch']['height']]
w['tail']['root'] = [num(s * H) for s in w['tail']['root']]
w['tail']['bend'] = num(w['tail']['bend'] * H)
w['rigid'] = [point(p) for p in w['rigid']]
# Face 229, a thin face of the right shoulder, folded in each sample (fold-faces-first.txt).
w['rigid'].append([-0.1016, 0.511, 0.0442])
# Faces 69 and 148 (one item, they share corners) and 76 of the right forearm, and face 2093 of
# the left shoulder top, folded in each rest sample (fold-faces-first.txt, fold-faces-2093.txt,
# check-rigid2.log, check-rigid3.log).
w['rigid'] += [[-0.191, 0.4325, 0.0996], [-0.1545, 0.4687, 0.0826], [0.0989, 0.6541, 0.0315]]
c['armFactor'] = 1.178
# tail-variants.txt: the root 40 degrees below the level keeps the tail out of the seat.
c['studio']['tailBind']['tail'] = [0, -0.6428, -0.766]
for key in ('eyeBox', 'noseBox'):
    c['colors'][key] = [point(p) for p in c['colors'][key]]
c['chair']['halfWidth'] = num(c['chair']['halfWidth'] * W)
NOTES = {
    'proportionsNote': 'The user, 2026-10-20: "make the wolf 0.9x shorter while keeping its width", then "actually, make the wolf 1.2x the width, for it to have similar body ratio as the fox", then "both change". The source takes 1.2 of its width (x) and 0.9 of its height (y) after its scale to 1 unit high, and keeps its depth (z), a choice of the manager. The meters for each unit stay, so the standing body is 0.9 times as high and 1.2 times as wide as in round mesh-wolf. Each place, height, width, and box of this config is in the units of the scaled source. The notes give the measures of round mesh-wolf on the source before the scale: x then takes 1.2, and y 0.9 (tools/rig/wolf_shape_config.py). The cuts of the scaled source check the joints (docs/research/2026-10-20-wolf-shape/arm-axis.txt, paw.txt).',
}
c = {k: v for pair in [((k, v), ('proportionsNote', NOTES['proportionsNote']))
                       if k == 'proportions' else ((k, v),) for k, v in c.items()]
     for k, v in pair}
c['app']['note'] = ('The size of the reference images, then the proportions above. In round mesh-wolf, the seated wolf sat 1.10 times as high as the seated dog cellist of the app, the middle of the range 1.03 to 1.16 of orchestra-latest.png and orchestra-side.png (docs/research/2026-10-20-wolf-mesh/landmark-probe.txt): the seated skull top at 1.600 m, and the standing skull top (the highest vertex within 0.03 u of the middle plane, 0.9459 u) at 1.765 m. The proportions keep the meters for each unit, 1.8659 m, so the standing shoulder joints go from 0.615 u (1.147526 m) to 0.5535 u (1.032773 m), the standing skull top to 0.8513 u (1.589 m), and the seated skull top to 1.441 m (docs/research/2026-10-20-wolf-shape/size-round.txt). The reach is the reach of round mesh-wolf, from the shoulder joint to the middle of the palm. With no --check, pnpm rig-mesh stops until the arm factor gives this reach.')
c['armFactorNote'] = ('The factor of the upper arm and the forearm. The parametric wolf of 3268680f plays the clarinet with a reach of 0.516 m, and round mesh-wolf took 0.508 m, the smallest stretch for that reach. On the scaled source, the arm with no factor reaches 0.439 m, and the factor 1.178 gives 0.508 m, below the limit 1.25 of a mesh of the user (pnpm rig-mesh wolf --check, docs/research/2026-10-20-wolf-shape/check-first.log).')
c['studio']['note'] = c['studio']['note'].replace('The source shin slants 3.7 degrees forward.', 'The shin of the scaled source slants 4.1 degrees forward (docs/research/2026-10-20-wolf-shape/leg-turns.txt).').replace('the root goes back and down over the back of the seat, 45 degrees below the level, and the tip hangs down behind the seat, 76 degrees below the level (docs/research/2026-10-20-wolf-mesh/tail-variants.txt)', 'the root goes back and down over the back of the seat, 40 degrees below the level, and the tip hangs down behind the seat, 76 degrees below the level. On the scaled source, the root at 45 degrees went 2.0 cm into the seat at rest, and at 40 degrees 0.6 cm (docs/research/2026-10-20-wolf-shape/tail-variants.txt)')
w['rigidNote'] = w['rigidNote'].replace('With both rules, no sample folds (check-rigid.log).', 'With both rules, no sample folded in round mesh-wolf (check-rigid.log). On the scaled source, face 229, a sliver of the right shoulder, folded in each sample, and faces 69, 148 (one item, because they share corners), and 76 of the right forearm and face 2093 of the top of the left shoulder folded in each rest sample. With the four more points, no sample folds (docs/research/2026-10-20-wolf-shape/check-rigid3.log).')
c['chair']['note'] = c['chair']['note'].replace('(x 0.12)', '(x 0.144 on the scaled source)')
with open(sys.argv[2], 'w') as f:
    json.dump(c, f, indent=2, ensure_ascii=True)
    f.write('\n')
