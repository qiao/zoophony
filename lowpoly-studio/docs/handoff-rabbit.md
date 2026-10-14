# Handoff: rabbit violinist, round 2 (the look)

Branch `rabbit-look`, worktree `.claude/worktrees/rabbit-look`, from main 3f9a9f35.
Brief: close the six gaps that the manager measured against the sheet (2026-10-13). Keep the
rig of round 1, because the app agent fits its holds to the joints of round 1.

## Last finished step

The look round is committed, and the golden file holds the last build (e3ef6fb3).
`python3 studio regress bear` and `python3 studio regress polar-bear` gave identical GLB files
after each of the three studio code commits. `python3 studio regress rabbit` passes. The studio
unit tests pass (21 tests).

| Commit | Step |
|---|---|
| 2fa573fb | The field `field.ears.lean`: a turn of the ear frame about the x axis. |
| 28fcad1e | The field `field.head.width_points`: the head width from the cheeks to the temples. |
| 107d004a | The field `details.ears.subdivisions`: a finer icosphere for the ear shells. |
| 23bee5ee | Gap 1: the snout and the face points (a round face in the side view). |
| 109691f5 | Gap 2: the ears lean back 22 degrees. |
| dfed0b51 | Gap 3: the inner ear (320 faces, a softer pink). |
| 6e446ec3 | Gap 4: the head width points. |
| 7b96a6e4 | Gap 5: the feet and the warp of the heels. |
| 551ca31f | Gap 6: brown foot claws. |
| 42e07c0b, 4f8d0a27 | The build of the round and its golden stats. |
| f0b31596, 61f52fae, e3ef6fb3 | The hollow radius 0.66 (a clean pink edge), its build, and the golden stats. |
| 9c37db84 | The README of the rabbit. |

## Next step

The app: give the app rabbit the GLB of this round (`pnpm studio-body rabbit`). No joint moves,
so the holds of the app agent stay valid. Then a look review with the user (about 30 min):
the ear shape (the sheet ears are narrower and pointed at the tip), the side ears at two
depths, and the shoulders.

## Rig

No joint place moves. The inverse bind matrices of the 32 joints of `out/rabbit.glb` are the
same as in round 1 (largest move 0). `field.arm.joints`, `field.leg.joints`, `rig.*`, and
`field.ears.center` (the start of the ear bones) did not change. The role build keeps seed 5
(round 1: seed 1), so the skin mesh is new.

## Numbers (role seed 5, model seed 6)

| IoU front, side, back, 3/4 | checks pass / all, near, stale | gates | body triangles | seeds pass (seed report) |
|---|---|---|---|---|
| 0.9178, 0.9158, 0.9182, 0.8515 | 68 / 80, 8 near, 0 stale | pass | 1204 | 3 of 3 gated seeds (5, 4, 8) |

GLB 920 kB, model GLB 550 kB, 32 bones.

| # | Gap | Sheet | Round 1 | Round 2 |
|---|---|---|---|---|
| 1 | side front edge, y 0.58 / 0.60 / 0.62 / 0.64 | 0.122 / 0.168 / 0.184 / 0.192 | 0.148 / 0.199 / 0.213 / 0.202 | 0.122 / 0.173 / 0.192 / 0.189 |
| 2 | side ear back edge, y 0.80 / 0.85 / 0.90 / 0.95 | -0.056 / -0.084 / -0.097 / -0.101 | -0.062 / -0.068 / -0.065 / -0.054 | -0.050 / -0.073 / -0.086 / -0.089 |
| 3 | front inner ear share, median RGB | 0.50, 222 175 153 | 0.90, 237 168 145 | 0.57, 222 175 152 |
| 4 | front half width, y 0.66 / 0.70 / 0.72 / 0.74 / 0.76 | 0.098 / 0.082 / 0.073 / 0.062 / 0.067 | 0.105 / 0.088 / 0.081 / 0.073 / 0.057 | 0.098 / 0.085 / 0.079 / 0.072 / 0.060 |
| 5 | side heel y 0.01 / 0.03, toe y 0.01 / 0.03, front foot run y 0.02 | -0.050 / -0.054, 0.098 / 0.101, 0.079 | -0.012 / -0.041, 0.101 / 0.088, 0.046 | -0.037 / -0.050, 0.101 / 0.085, 0.066 |
| 6 | foot claws | brown tips at the toe ends | pink dots below the toes | brown tips at the toe ends |

The probe of these measures is `gaps.py` in the session scratchpad of the brief (`S/gaps.py`).
It reads the masks of `out/masks/` and the renders of `out/compare/`.

## Times (python3 studio log rabbit)

| Part | Start | End | Minutes |
|---|---|---|---|
| Brief, crops, measures, fit, ear lean code | 18:16 | 18:24 | 8 |
| First build, head width code, second build, regressions | 18:24 | 18:33 | 9 |
| Ear shell code, regressions, failed toe and chin builds | 18:33 | 18:40 | 7 |
| All seeds, commits, shoulder try, golden | 18:40 | 18:52 | 12 |

| Step | Count | Typical seconds |
|---|---|---|
| `fit` | 13 | 2 |
| Build, a new field (8 seeds, 2 at a time) | 6 | 68 to 251 |
| Build `--all-seeds`, the stages of some seeds in the cache | 3 | 24 to 91 |
| Build, a paint or detail change (`--seed 5`) | 1 | 24 |
| `regress` (bear, polar bear, rabbit) | 8 | 18 to 63 |

## Failing checks

| Check | Value | Verdict |
|---|---|---|
| `iou.front`, `iou.back` | 0.9178, 0.9182 | open (the sheet symmetry 0.9615, the shoulders 0.01 narrow, the ear bases 0.010 wide at y 0.74) |
| `iou.side` | 0.9158 | limit of the sheet: the side ears are at two depths and two leans |
| `iou.three_quarter` | 0.8515 | limit of the sheet: the head turn and the ears of the 3/4 view |
| `eye_outline.three_quarter.*`, `eye_y.three_quarter.1` | see `animals/rabbit/README.md` | limit of the sheet |
| `ear_dark.front.left_in_image` | 0, 0.16 | limit of the sheet (one inner ear in shade) |
| `ear_width.side` | 0.1194, 0.0611 | measure: the bump finds only the top of the sheet ears |
| `nose_x.side`, `nose_y.side` | x 0.157, 0.187 | limit of the sheet (the side nose is 0.03 higher than the front nose) |
| `fur_hue.side` | 33.5, 32.1 | open (round 1: 32.6; the fur palette did not change) |

## Open problems

- The remesh gate stops 5 of 8 seeds (round 1: 3 of 8): seeds 3, 6, and 7 on slivers (1.05 to
  1.21 percent), seed 1 at the trunk bottom (y 0.145) and the crown (x 0, y 0.769), seed 2 at
  the crown (y 0.770). The model build stops seeds 3, 1, and 5.
- Larger toes failed the remesh gate on every seed (the seated right leg, y 0.10 to 0.12), so
  the toe at y 0.03 stays 0.016 short and the front foot run 0.013 narrow.
- Wider shoulder tops left no model seed, and two role seeds got a seat gap over 2 cm. The seat
  gap of the thighs changes from seed to seed, so a form change near the thighs or the chin
  can fail the seat check on some seeds.
- The ear is an ellipsoid shell: the sheet ears are narrower at the base and pointed at the
  tip. The round ear bases make the head 0.010 too wide at y 0.74.

## Changes outside the files of the task

`lowpoly-studio/studio/schema.py`, `lowpoly-studio/studio/field.py`,
`lowpoly-studio/studio/details.py`, `lowpoly-studio/templates/biped/body.py`, and the schema
tables of `lowpoly-studio/README.md`: the three new fields, each with a default that keeps the
bear and the polar bear identical.
