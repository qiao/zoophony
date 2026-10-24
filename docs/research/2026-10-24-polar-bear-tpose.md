# The T-pose polar bear mesh

Date 2026-10-24. The user gave a new polar bear mesh in a T-pose, with the eye size of the bear.
The decisions are in [`2026-10-24-polar-bear-tpose.md`](../decisions/2026-10-24-polar-bear-tpose.md).
The probes and the images are in [`2026-10-24-polar-bear-tpose/`](2026-10-24-polar-bear-tpose/).
The probe scripts are those of [`2026-10-23-rabbit-apose/`](2026-10-23-rabbit-apose/).

## The mesh

The mesh has 3,144 triangles and 1,574 vertices after the weld, in one part with no open edge, and
251 faces with a corner angle below 10° (`assets/models/polar-bear/README.md`). Each round arm goes
out level at y 0.73 and is free of the trunk beyond x 0.145 (`sections-x.txt`, `arm-axis.txt`).
The legs part below y 0.20, the neck is narrowest at y 0.63, and a ball tail sits at y 0.26 to
0.33 (`source-views.webp`). The eyes are 5 dark faces each, and the nose 59 (`head-colors.txt`).

## The rig

`make_config.py` writes `tools/mesh-rigs/polar-bear.json` from the polar bear config of
2026-10-22: the bench, the sit rule, the color shift, and the leg factor 1.6. Three values of the
old config did not fit the T-pose mesh:

- The leg turns of the seated bind: `leg_turns.py` of `2026-10-16-hip-open/` gives them for the new
  joints (thighs 5° down and 15° out, shins vertical).
- The thigh joint: at the crotch (y 0.20), the thigh was too short to sit level, the bear perched
  on the bench edge, and the sit rule pulled the rump down 44 cm. Inside the haunch (y 0.28), as on
  the old mesh, the bear sits with near level thighs (`seated-bind.webp`).
- `armTop`: from y 0.68, the rule gave the top of each level arm to the neck, and up to 38 faces
  folded in each sample. Above the arm top (from y 0.80), 26 fold at most (`fold-probe.txt`).

## The arms

The play pose is clean from each side: the paws reach the keys, and the arms are round
(`views.webp`, `arm-crops.webp`, the fourth panel). At rest, long thin faces along each hanging
upper arm show as slivers (`arm-crops.webp`), and the right arm folds 12 faces at rest (limit 8).
The level arm of the T-pose turns about 75° down there, and long faces cross the shoulder.
`gate-variants.txt` gives the rules that did not change the folds: corrective shapes of the play
and of the rest, `armBelow`, the plane of the arm split, the line and sliver rules, the share of
the upper arm twist, and rest paws further forward on the thighs. As at the rabbit elbows, a ring
at each shoulder would split these faces, which needs the user.

The depths stay near the studio polar bear: in the play, the forearms go 3.1 cm into the body
(8.2 cm before), and the upper arms 7.6 cm (7.2 cm before).
