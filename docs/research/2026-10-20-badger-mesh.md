# The badger mesh of the user as the percussion player

Date 2026-10-20. Round `mesh-badger`. Decisions:
[`2026-10-20-mesh-badger.md`](../decisions/2026-10-20-mesh-badger.md). The probes and their
outputs are in [`2026-10-20-badger-mesh/`](2026-10-20-badger-mesh/). Each command runs from the
root of the tree, and the base is `24e47a7e`, the commit before the round.

## 1. The question

The user gave a textured mesh of a badger with no skeleton (`assets/models/badger/badger.glb`), and
slept. The percussion badgers get it by route 3. The measures that decide are the reach of the
strikes of each part, the clearance of the sweeps, the arm gate, and the colors and the face
against `badger-turnaround.png`.

## 2. The measures

**Mesh.** One part of 1,567 vertices and 3,129 triangles, with 2 open edges (`facts.txt`). The
badger stands upright on very short legs (crotch at y 0.12 u), with short arms apart from the body
from x 0.16 u, and a short tail (`sections-*.txt`, `measures.txt`, `arm-axis.txt`, `paw.txt`,
`free-arm.txt`, `source-views.webp`). `make_config.py` writes the rig config.

**Parts of the demos.** `part-use.ts`: the demos play the bass drum (127 strikes), the cymbals
(864), and the small percussion (611), in `beethoven-9` and `boulanger-matin`. No demo has a snare
drum or a xylophone, so the probes also read the percussion test score of `tools/probe-demos.ts`
(6 players).

**Size.** No reference image shows a badger, so the mesh takes the head top of the parametric
badger, 1.038 m (`landmark-probe.ts`, `landmark-probe.txt`). The skull top is the highest point of
the mesh, so the scale is 1.038 m for each unit, and H is 0.244 m.

**Arms.** `pnpm mesh-options badger <dir> --size param=1.038 --legs 1 --arms 1,1.1,1.2,1.25
--instrument <id> --species badger` with the holds of the base (`options-*.md`, `options-*.log`):

| Arm factor | Reach | Bass drum | Cymbals | Small percussion | Snare drum | Xylophone |
|---|---|---|---|---|---|---|
| 1 | 0.273 m | 100% | 0%, 84 mm | 83%, 107 mm | 0%, 67 mm | 0%, 375 mm |
| 1.1 | 0.297 m | 100% | 0%, 60 mm | 83%, 83 mm | 0%, 44 mm | 11%, 351 mm |
| 1.25 | 0.334 m | 100% | 0%, 24 mm | 83%, 48 mm | 59%, 8 mm | 30%, 316 mm |

A cell gives the strikes within 5 mm and the worst error. The snare drum at 0.45 m and the
tambourine at 0.35 m in front reach 100% at the factor 1 (`hold-reach.txt`).

**Cymbals.** `cymbal-scan.sh` (`cymbal-scan.txt`), `boulanger-matin`, each crash place `C` of
`PERCUSSION_PLACES.crash` in H:

| Arm factor | Plates in the body, crash at C, best of C | Crash error at C, best of C |
|---|---|---|
| 1 | 11.3 cm, 8.4 cm | 84 mm, 56 mm |
| 1.1 | 10.6 cm, 8.3 cm | 60 mm, 32 mm |
| 1.2 | 9.6 cm, 8.5 cm | 36 mm, 8 mm |
| 1.25 | 9.6 cm, 7.4 cm | 24 mm, 0 mm (with 9.9 cm in the body) |

A plate of 0.12 m in radius at the factor 1 still goes 4.9 cm in, and misses by 56 mm or more. No
factor up to 1.25 keeps the plates out of the body, so the hold of the cymbals stops here.

**Xylophone.** `xylophone-scan.txt`: the best variant, the factor 1.25 with the bars 0.22 m in
front and 0.5 m high, reaches 85% of the strikes, with a worst error of 15 cm. The xylophone is
0.72 m wide, and the body does not step from side to side, so the hold stops here.

**Holds.** The research of `docs/reference/percussion-technique.md` 5 to 9 gives the targets. The
stick directions come from `stick-dirs.ts` (`stick-dirs.txt`), and the mean turns of the paws on
the forearms from `paw-turn.ts` (`paw-turn.txt`): 45° for the beater of the bass drum, 18° to 28°
for the snare sticks and the triangle beater, and 96° for the strap of a cymbal. Between strikes,
the beater of the bass drum points across the body, 98° in from forward.

| Hold | Change | Arm gate before, after |
|---|---|---|
| Bass drum | drum 6 cm left, 3 cm back; strike 12 cm below the middle; beater across, ready | R paw swing 126°, after 40°; jumps 9.7%, after 0% |
| Snare drum | drum 0.45 m in front, 0.46 m high; sticks tilt 1.3, V 66°, 9° down | paw swing 65°, after 25° to 32° |
| Small percussion | clip 0.12 m higher; paw turn holdTurn(-90, 40); ready; tambourine 0.35 m in front | L folds 17, after 5; L swing 107°, after 59° |
| Cymbals | elbows down and a little out | L folds 9, after 7 |
| Xylophone | mallets tilt 1.3, across | L folds 10, after 8 |

**Rig.** `pnpm fold-probe <role> --faces 8`: faces 550, 1172, and 1254 of the left shoulder folded
in each sample of each role, and face 574 of the right paw when the fingers curl. Rigid weights
remove these folds. `pnpm raise-fit` gives two shapes (`raise-*.json`): the shape of the right arm
removes the folds of faces 61, 90, and 91, and the shape of the left arm leaves faces 144, 567,
and 570 turned (86% of the play of the percussionist).

**Clearance.** `pnpm pose-depth <role> --gaps` (`pose-depth-*.txt`): the upper arms go 1.7 cm to
2.1 cm into the side of the body in each set, where the arm of the mesh lies, and the ball of the
bass drum beater 4.5 cm into the head. Each strike of the bass drum, the snare drum (worst 3.1 mm),
and the small percussion reaches its point. The cymbals go 8 cm to 11 cm into the body, and the
xylophone forearms 4.9 cm.

**Arm gate.** `pnpm arm-check <5 roles> --base 24e47a7e` (`arm-check-roles.txt`) and `pnpm
arm-check --all --base 24e47a7e` (`arm-check-all.txt`): no `FAIL`, and each `OPEN` of the other
roles has the value of the base. `arms-*.webp` gives the 2x crops of a strike and of a rest.

**Colors and face.** `colors_probe.py` (`colors.txt`), `dark_probe.py`, and `face_colors.py`
(`face-colors.txt`), as Oklab L, hue, and chroma:

| Part | Mesh texture | Sheet | Gallery render |
|---|---|---|---|
| Front fur | 0.28, 23°, 0.008 | 0.40, 25°, 0.010 | 0.27, 48°, 0.021 |
| Eye stripes | 0.27, 44°, 0.010 | 0.41, 358°, 0.008 | 0.62, 59°, 0.054 |
| White stripe | 0.96, 58°, 0.015 | 0.96, 58°, 0.013 | 0.96, 70°, 0.010 |
| Back fur | 0.58, 42°, 0.016 | 0.61, 39°, 0.021 | - |

The hues match, so the rig has no tone rule. The mesh is darker than the sheet. In the warm light
of the gallery, the eye stripes on the top of the head show as a mid brown. From the stage camera,
the white stripe and the black eye stripes show (`faces.webp`). The face reads calm to happy, and
the smile line shows at 60°.

**Other bodies.** `pnpm body-probe --base 24e47a7e` (`body-probe.txt`): 85 of 95 bodies, 17 of 23
players, and 1,465 of 1,492 pose sets stay equal. The others are the wolf colors of phase 0, the
badgers, and two hippos and the conductor of `beethoven-9`, which the smaller badger footprint
moves. The shot tests pass (`shots-test.log`). The first download grows by 29,644 B to 713,403 B
(`size.txt`).

**Images.** The close views of each role (`*-views.webp`), and `pnpm close-views batch <dir>
--species badger,pig,wolf --lineup --camera default --base 24e47a7e` (`lineup-base-views.webp`,
`play-base-views.webp`, `species-*-base-views.webp`).

## 3. The result

The badger mesh stands at its instruments at the size of the parametric badger, with its own arms.
It plays the bass drum, the snare drum, the triangle, and the tambourine with holds of real
players, and each strike reaches its point. The arm gate passes. The cymbals and the xylophone of
the app need longer arms or smaller instruments, which the user chooses.
