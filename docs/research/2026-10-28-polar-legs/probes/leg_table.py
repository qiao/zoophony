"""Gives the leg proportions of the source mesh and of the leg factors, standing, in units of the
source (1 unit from the soles to the skull top) and in meters at 1.438901 m for each unit.

    uv run --no-project --with numpy python -I leg_table.py tools/mesh-rigs/polar-bear.json

The joints come from the config. The thigh grows by the leg factor and the shin by the shin
factor along their bones, the foot keeps its size, and the body rises by the growth, as
`legRise()` of `tools/rig-mesh.ts` gives it. The crotch is the lowest vertex of
`polar-bear-tpose.glb` within 0.01 units of the middle plane (0.2006 units, from the dump of
`dump_source.py` of `2026-10-27-polar-legs-rebuild/probes/`). H is the head height of the studio
module, 0.295354 m. The trunk is the hip joint to the shoulder joint."""
import json, sys
import numpy as np
cfg = json.load(open(sys.argv[1]))
J = {k: np.array(v['head'], float) for k, v in cfg['joints'].items()}
S = 1.438901
H = 0.295354 / S
hip, knee, ankle = J['thigh_L'], J['shin_L'], J['foot_L']
crotch = 0.2006
shoulder = J['upper_arm_L'][1]
rows = [('source mesh', 1, 1), ('main', 1.6, 3.208), ('1.0', 1, 1), ('1.2', 1.2, 1.2), ('1.4', 1.4, 1.4)]
print('| Body | Thigh | Shin | Shin / thigh | Hip joint (leg) | Crotch | Height | Leg / trunk | Leg / H | Crotch / height |')
print('|---|---|---|---|---|---|---|---|---|---|')
for name, f, s in rows:
    thigh = f * np.linalg.norm(knee - hip)
    shin = s * np.linalg.norm(ankle - knee)
    rise = (f - 1) * (hip[1] - knee[1]) + (s - 1) * (knee[1] - ankle[1])
    leg = hip[1] + rise
    cr = knee[1] + (s - 1) * (knee[1] - ankle[1]) + f * (crotch - knee[1])
    height = 1 + rise
    trunk = shoulder - hip[1]
    m = lambda u: f'{u:.3f} u ({u * S:.3f} m)'
    print(f'| {name} | {m(thigh)} | {m(shin)} | {shin / thigh:.2f} | {m(leg)} | {m(cr)} | {m(height)} | {leg / trunk:.2f} | {leg / H:.2f} | {cr / height:.2f} |')
print(f'trunk (hip joint to shoulder joint) {shoulder - hip[1]:.3f} u ({(shoulder - hip[1]) * S:.3f} m), H {H:.4f} u ({H * S:.3f} m), foot (ankle joint) {ankle[1]:.3f} u ({ankle[1] * S:.3f} m)')
