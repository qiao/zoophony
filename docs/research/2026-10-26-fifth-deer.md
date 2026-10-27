# The deer arms of the fifth review

Date 2026-10-27. Round `fifth-deer`. Decisions:
[`2026-10-26-fifth-review-deer.md`](../decisions/2026-10-26-fifth-review-deer.md). The probes and
their outputs are in [`2026-10-26-fifth-deer/`](2026-10-26-fifth-deer/). Each command runs from the
root of the tree. "Main" is `4ce616c7`. Its deer is the deer of `b00aa7dd`, the start of the
round. Copy a probe to `scratch/` before you run it, and run a probe of `main` in a tree of
`git archive main`.

## 1. The question

On 2026-10-26, the user said: "the deer's upper arm are missing pieces (have dent)", and "note
that the previous decision files may be incorrect". The image of the user shows the deer harpist
from behind and to the left, with a notch at the back of the left upper arm. The round decides by
the 2x crops of both arms from six views at each moment of the role, at the elevations 20° and 40°,
by the play strip at the angle of the user, by the arm gate, by the folds, by the depths of the
arms in the body and in the harp, and by the note targets of the paws.

## 2. The cause

Each upper arm of the user mesh `deer.glb` joins the side of the trunk down to 0.86 (left) and
0.94 (right) of its length. The copy `deer-arms.glb` of 2026-10-22 removed the faces that join
each arm to the trunk below y 0.575 u and closed the inner side of each arm with a round patch.
The cut of the rig closed the hole of the trunk with 17 flat caps. Thus the arm and the trunk were
two shells below the shoulder. In the play and at rest, the harp arms reach forward, the back of
each upper arm moves off the trunk, and the flat caps show in the gap as a step with a dark
triangle (`cause.webp`). The user mesh has no notch there (`source.webp`): the rig made it.

`probes/caps-view.ts` draws the posed body from behind and measures the visible area of the caps.
On `main`, the caps show in each sample of the rest, the play, and the lift
(`caps-view-main.txt`):

| View | Rest cm² | Play p50 / p95 cm² | Lift p95 cm² |
|---|---:|---:|---:|
| az-150, elevation 20 | 41.0 | 40.1 / 41.7 | 41.7 |
| az150, elevation 20 | 40.2 | 42.7 / 44.2 | 42.1 |
| az-150, elevation 40 | 32.4 | 31.2 / 33.2 | 32.8 |
| az180, elevation 40 | 0.0 | 0.0 / 0.2 | 0.0 |

On `main`, the shoulder ring of each arm moved as a rigid island: `pnpm arm-shape harpist
--rings` gives a flat share of 1.02 to 1.05 at the shoulder (`arm-shape-main.txt`).

## 3. The fix

`tools/blender/deer_arms.py` rebuilds the arms headless with the route of the cat and the fox: a
seam cut, a side wall of the trunk under each arm, a quad tube with a flat inner side on the wall,
the bake of the fur, arms 1.25 times longer (the arm factor of the rig before), Blender weights,
and arm segments. Two runs give the same bytes. `variants.txt` gives each variant.

| Variant | Value | Output |
|---|---|---|
| Plane of the seam alone | the hole takes the shoulder top up to y 0.6 u, 25 of 46 bridge faces face into the arm | `variants.txt` |
| Cap plane at 0.2 of the upper arm, turned 30° to the trunk | 0 of 45 bridge faces face into the arm | `variants.txt` |
| No ring, a ruled ring, a cap of 0.15 or 0.25, armpit 0.48 or 0.49 | the left socket folds in each sample | `variants.txt` |
| Chest anchor 0.4 within 0.06 u | the outer upper arm takes 0.24 of the chest (0.93 to 0.95 on the arm on `main`) | `weights-near-shoulder.txt` |
| Anchor 0, 0.1 within 0.02, 0.2 within 0.03 | the same folds and gate values | `variants.txt` |
| Rigid painted weights on the six crease faces of the left socket | left folds 5,976 face samples to 75, rest and lift 0% | `variants.txt` |
| One group of the six faces | 3,486 | `variants.txt` |
| Skin normals of the roots within 0.08 or 0.12 u | no dark slit, the same look | `root-normals.webp` |
| Bind of the other meshes | flat p5 left 0.72, `FAIL` against 0.79 | `gate-first.txt` |
| Bind upper arm (0.64, -0.64, 0.43), (0.6, -0.65, 0.46) | flat p5 right 0.74, `FAIL` against 0.81 | `variants.txt` |
| Bind upper arm (0.5, -0.8, 0.33), (0.45, -0.85, 0.27) | paw swing left 69° and 70° (limit 70°), twist 45° and 51° | `variants.txt` |
| Bind upper arm (0.702, -0.451, 0.551) | each value passes, chosen | `gate.txt` |

The cap plane keeps the round top of the shoulder on the trunk, and the socket is a loop around
the arm root. The rigid faces lie where the socket keeps the rule weights and the first ring the
Blender weights. The chosen bind points 18° nearer to the hanging arm of the mesh. A bind nearer
than that raised the paw swing of the left arm to the limit.

## 4. The measures

| Measure | Main | Round | Command, output |
|---|---|---|---|
| Visible caps, az±150 elevation 20, play p95 | 41.7 / 44.2 cm² | no caps | `probes/caps-view.ts`, `caps-view-main.txt` |
| Gate: folds p95 L / R | 2 / 7 | 0 / 1 | `pnpm arm-check harpist --base main`, `gate.txt` |
| Gate: twist p95 L / R | 37 / 50 | 26 / 25 | `gate.txt` |
| Gate: forearm twist p95 L / R | 23 / 43 | 28 / 39 | `gate.txt` |
| Gate: flat p5 L / R | 0.79 / 0.81 | 0.79 / 0.91 | `gate.txt` |
| Gate: paw twist p95 L / R | 75 / 108 | 75 / 106 | `gate.txt` |
| Gate: paw swing p95 L / R | 62 / 29 | 66 / 31 | `gate.txt` |
| Gate: stretch p95 L / R | 0.10 / 0.05 | 0.03 / 0.04 | `gate.txt` |
| Folds rest / play / lift | 100% / 100% / 100% | 0% / 8.3% / 0% | `pnpm fold-probe harpist --base main`, `fold-probe.txt` |
| Most folded faces in a sample | 11 | 1 | `fold-probe.txt` |
| Upper arms in body, play / rest / lift / lowering | 3.2 / 2.4 / 2.7 / 2.9 cm | 1.0 / 0.8 / 0.8 / 0.9 cm | `pnpm pose-depth harpist --base main`, `pose-depth.txt` |
| Forearms in harp, play / lift (limit 4.0 cm) | 1.8 / 0.8 cm | 2.8 / 2.5 cm | `pose-depth.txt` |
| Paws in harp, play (limit 1.5 cm) | 0.6 cm | 0.8 cm | `pose-depth.txt` |
| Note targets within 5 mm | 100% | 100% | `pnpm pose-depth harpist --targets`, `targets.txt` |
| First download | 810,333 B | 818,995 B | `pnpm size --base main`, `size.txt` |

The first download grows by 8,662 B for 963 more triangles of the arm tubes and the side walls,
and 20 more bones. `pnpm body-probe --base main` (`body-probe.txt`):
only the 5 deer bodies, the deer harpist, and its 4 pose sets change.

## 5. The images

Each pair shows `main` first: on the left, or on the top in `crops.webp`.

- `user-angle.webp`: the angle of the user, az-165, az-150, and az-120 at elevation 30, at 184 s
  of `boulanger-matin`. On `main`, the left upper arm ends in a step at its back. In the round, it
  joins the shoulder as one round tube.
- `strip.webp`: the play strip at az-150 from 182 s to 187.5 s.
- `arms-e20.webp` and `arms-e40.webp`: the front, the back, each side, az150, and az-150 at each
  moment, at the elevations 20 and 40.
- `crops.webp`: 2x crops of both arms at the chord and at rest from the same six views.

In the round, both arms are round tubes that join the shoulder from each view, at rest, in the
play, and in the moves. From straight behind, the corner of the left armpit under the raised arm
shows dark, with no fold and no dark color (`armpit-probes.webp`).

## 6. Open

- The left armpit corner from straight behind: its outline has small steps where the bridge faces
  of the socket meet the side wall.
- The face of the right inner elbow folds in 8.3% of the play samples, as on `main` (100%).
- The forearms come 1.0 cm deeper into the harp in the play (2.8 cm, limit 4.0 cm), and the paw
  swing of the left arm is 66° (limit 70°).
- The other parts of the forward bind of the rhino (the elbow) were not tried on the deer.
