# The twisted arms of the hippo bassist

Date 2026-10-19. Round `arms-hippo`, base `16f16e44`. Decisions:
[`2026-10-19-hippo-arms.md`](../decisions/2026-10-19-hippo-arms.md). The probes and their outputs
are in [`2026-10-19-hippo-arms/`](2026-10-19-hippo-arms/). Each command runs from the root of the
tree.

## 1. The question

The user said: "the arms for hippo and elephant seem twisted and deformed", with a screenshot of
the app from a camera at the right side of the stage. The goal is a render of that view with round
arms in the play, the lift, and the rest. The measures are the play folds (goal: at most 1% of the
play samples), the top plate of the contrabass in the chest, the chest faces, the bow targets, and
the depths of the arms.

## 2. The view of the user

`pnpm close-views species hippo <dir> --views front60 --zoom 1.6 --elevation 20` gives the view
of the screenshot. `user-view.webp` puts the screenshot, the base, and the round side by side, and
`arm-crop.webp` shows the right arm at twice the size. On the base, the bow arm is a flat band
from the shoulder to the bow. Dark wedges stand on the shoulder, and a long dark slit runs under
the upper arm. The slit and the wedges are thin faces of the right armpit and of the front of the
right shoulder, which fold in 33% to 100% of the play samples (`fold-probe-base.txt`). The band
is a twist: the right upper arm turns 107° from its bind on the mean of the play
(`hold-fit-base.txt`). Of the mean turn of its folded samples, `twist.py` gives 92° of twist
around the bind direction of the arm and 56° of swing (`raise-fit-r-cut.txt`).

## 3. The measures

**The cut.** `pnpm rig-mesh hippo --check --set 'cut={"top":<u>}'` (`rig-cut.txt` on all demos,
`rig-cut-more.txt` on `bach-bwv1050` and `boulanger-matin`). Each cut replaces its faces with the
same number of new faces, so the rig keeps 3,141 triangles:

| `top` (u) | Faces cut, L / R | Face 462, play | Folded face samples of `upper_arm_R` | Note |
|---|---|---:|---:|---|
| none | - | 100% | 86,971 | |
| 0.50, 0.52 | 11 / 12 | 100% | 48,659 | |
| 0.54, 0.545 | 16 / 14 | 0% | 12,852 | |
| 0.55, 0.56 | 16 / 16 | 0% | - | the neck and the chest fold more |

At 0.54, faces 462, 248, 249, 477, 461, 30, and 28 of the right armpit fold in no play sample.
The top plate stays at 0.6 cm on the mean and 1.5 cm at most (`top-plate-cut.txt`).

**The rings.** A ring at the left wrist cuts 32 edges, 3,205 triangles, above the budget of
3,200. A ring at the forearm twist cuts 3 edges and changes no fold (`rig-rings.txt`).

**The elbows.** `pnpm hold-fit bassist --faces-of <list> --set ...` on the cut body
(`hold-fit-pole-r.txt`, `hold-fit-pole-l.txt`, `hold-fit-combo.txt`). The turns are the mean play
turns from the bind:

| Variant | Upper arm R | Upper arm L | Faces that fold more |
|---|---:|---:|---|
| `poleR` (1.5, 1, -1), `poleL` (-1, 0.5, 0.3) | 107° | 80° | - |
| `poleR` (1.5, 0, -1) | 95° | - | 517 in each play sample |
| `poleR` (1.5, -1, -1) or (1, -1, -0.3) | 88°, 85° | - | 517, 116, and 486. With (1, -1, -0.3), the forearm goes 9.3 cm into the body |
| `poleL` (-1, -0.3, -0.7) | - | 28° | fewer: faces 1380, 1381, and 1383 of the left upper arm fold in 4% to 6% (17% to 20%) |

Each left elbow moves the folds of the left wrist to other faces (`fold-hold-v0.txt` to
`fold-hold-v2.txt`). The paw turns about 163° on its forearm on the neck, also in the rest, and
`twist.py` gives 160.6° of twist around the paw (`raise-fit-wrist.txt`).

**The shapes and the rigid faces.** On the cut mesh with the new hold, `pnpm raise-fit` gives a
third shape for face 517 at the back of the right shoulder and a shape of the bent left wrist
(`rig-level.txt`, `rig-wrist.txt`). In the pose of the wrist rule, face 1498 stays turned, also
with `grow` 1 or `below` 0.5 (`rig-wrist-relax.txt`). `weights.rigid` then gives a thin face the
mean of its weights (`rig-rigid.txt`, `rig-rigid-more.txt`, all demos for the second file):

| Rigid face | Play share with a fold | Note |
|---|---:|---|
| none (4 shapes, `rig-candidates.txt`) | 99.6% | 1498 in nearly each sample, 51 in 41% |
| 1498 and 51 | 42.8% | rest 0% |
| and 463 | 30.0% | chosen |
| and 116 | 100% | faces 125 and 241 of the neck fold |
| and 52 | 43.1% | the fold goes back to face 51 |

**Pizzicato.** Faces 486, 897, 53, 96, 97, 195, and 157 fold in about 5% of the play samples, in
the pizzicato of `boulanger-matin` (`technique.txt`). A raised pizzicato elbow with the bow tip
up moves the folds to 11 other faces of the right paw and arm (`fold-pizz-tip.txt`). The level
elbow of the bow keeps the folds and takes the pizzicato depths down (`pose-depth-scan.txt`,
`fold-pizz-level.txt`).

## 4. The result

`pnpm fold-probe bassist --base 16f16e44` (`fold-probe.txt`):

| Measure | `16f16e44` | Round |
|---|---:|---:|
| Rest samples with a fold | 100% (12 faces) | 0% |
| Play samples with a fold | 100% (23 faces) | 30.0% (11 faces) |
| Lift samples with a fold | 100% (15 faces) | 28.7% (2 faces) |
| Folded face samples | 164,307 | 13,065 |
| Upper arm R / L, mean play turn | 107° / 80° | 96° / 28° |

`arm-twist.ts` of `docs/research/2026-10-18-hippo-arm/` splits each play turn into a swing and a
twist (medians, `twist-base.txt` with the old poles, `twist-final.txt`), and `roll-all.sh` counts
the jumps of the roll of the bow paw (`roll-base.txt`, `roll-final.txt`):

| Measure | Old poles | Round |
|---|---:|---:|
| Right upper arm: swing / twist | 58° / -96° | 46° / -86° |
| Left upper arm: swing / twist | 54° / 56° | 17° / 7° |
| Right paw on the forearm, twist (5% to 95%) | 11° to 116° | -26° to 19° |
| Jumps of the roll of the bow paw above 90° in 0.25 s | 24 | 6 |

Faces 617 and 618 under the chin and 323 of the neck are faces 633, 634, and 337 of the cut mesh
(`face-near.txt`). They fold in no play sample of all demos (`hold-fit-chest.txt`). The top plate
keeps 0.6 cm on the mean and 1.5 cm at most (`top-plate-final.txt`). The bow targets keep 99.9%
within 5 mm.

`pnpm pose-depth --base` fails on `16f16e44`: the probe of the commit runs in a temporary folder
with no git, and the time file of the sweep needs the common folder of git (`timesFile()`). So
`pose-depth-base.txt` comes from this tree before the first commit, and `pdtab.py` compares it
(`pose-depth-compare.txt`). Five pairs go more than 0.5 cm deeper:

| Pair | Base cm | Round cm | Part |
|---|---:|---:|---|
| Play: paws in contrabass | 3.6 | 4.2 | right paw |
| Play: forearms in body | 4.8 | 5.7 | left forearm at the elbow |
| Lift: forearms in contrabass | 2.8 | 3.7 | right forearm |
| Lowering: paws in contrabass | 1.5 | 3.7 | right paw |
| Lowering: forearms in contrabass | 4.2 | 4.8 | right forearm |

The rest upper arms go 1.5 cm less deep, the lift upper arms 0.8 cm, and the share of the play
samples with the forearms over 1.5 cm in the contrabass falls from 91.9% to 49.4%.

`pnpm body-probe --base 16f16e44` changes the hippo and the conductor poses of six demos
(`body-probe.txt`). Each rest joint of the hippo moves at most 0.0014 mm with the new module
(`joints.py`, `joints.txt`), and the cues of the conductor look at the eyes of the players. The
first download shrinks by 73 B (`size.txt`).

The images are `user-view.webp`, `arm-crop.webp`, `pairs.webp` (the base on the left, cropped
cells of `pnpm close-views bassist <dir> --base 16f16e44 --pairs ...`), `close-views.webp` (the
base above), and `rest-lift-round.webp`. In the user view, the bow arm hangs from the shoulder and
then comes forward to the bow, as a round arm. The slit under the arm and the wedges on the
shoulder are gone. A dark slot stays at the front of the right armpit, at the caps of the cut.

## 5. The second step

Round `arms-hippo2`, base `395f3f8a`. The outputs are in
[`2026-10-19-hippo-arms/step2/`](2026-10-19-hippo-arms/step2/). `probe-keys.ts` bins the play
samples by the bone turns (`keys-*.txt`), and `corners.ts` gives the weights:

| Faces | Place | They fold when |
|---|---|---|
| 116 | back of the right shoulder: one corner on the clavicle and the upper arm, two on the neck | the upper arm turns less than 70° and the elbow bends more than 60° |
| 52 | right paw, two corners shared with the rigid face 51 | the bow wrist turns 50° to 70° |
| 486, 897, 53, 96, 97, 195, 157 | lower right armpit and right paw | in each pizzicato sample of `boulanger-matin`: the upper arm turns 111°, the paw 131° on the forearm |

`pnpm rig-mesh hippo --check --step 1` on all demos (`rig-a.txt` to `rig-j.txt`):

| Variant | Play | Lift | Note |
|---|---:|---:|---|
| base | 30.6% | 28.7% | |
| no shape 1 (left arm, face 1356) | 30.6% | 28.7% | the shape changes no fold |
| no shape 0, 2, or 3 | 99.9% to 100% | 78% to 100% | |
| `armTop` 0.62 to 0.7 | 24.7% | 14.0% | face 116 0%, faces 237 and 238 new |
| `armTop` 0.6, 0.61, 0.615 to 0.7, or 0.62 to 0.69, with a wrist shape | 44% to 99.8% | 58% to 84% | a relax of a shape fails |
| `armTop` 0.625 to 0.7, with a wrist shape for face 52 | 15.5% | 0% | |
| `armTop` 0.625 to 0.7, faces 51 and 52 as one rigid group | 15.5% | 0% | faces 52 and 53 0%, no wrist shape |
| and a shape of the bent right elbow that turns the forearm only | 13.7% | 0% | chosen: faces 232 and 233 0.3% and 2.2% |
| the elbow shape with all arm turns of the fit | 19.6% | 0% | chest faces 463, 336, and 337 fold |
| a shape for face 237, or rigid faces 486 and 897 | 22.3%, 16.3% | 4.7%, 9.7% | |

**The pizzicato.** 35 variants of `pizzicatoTip`, `pluckPlace`, and `polePizzicato`
(`hf-pizz-*.txt`) keep folds in about 52% of the play samples of `boulanger-matin`. A tip moves the
folds to other paw faces, and a raised elbow moves the armpit folds to faces 602, 114, and 244. A
shape in the pizzicato pose keeps 5 to 12 faces turned (`rig-c.txt`, `rig-g.txt`).

**The look.** `probe-patch.py` swaps the material of the hippo (`slot-probe.webp`, `395f3f8a`).
With no shadow, the slot at the front of the right armpit stays dark, and the face colors are even.
The normals of the caps of the cut point away from the light. With faces in pure colors
(`shoulder-faces.webp`), the light streak at the shoulder is faces 114, 115, 116, and 238, which
the 50° shoulder turn squeezes to slivers.

## 6. The result of the second step

`pnpm fold-probe bassist --base 395f3f8a` (`fold-probe.txt`), `top-plate.ts` of the chest round,
and `pnpm pose-depth bassist --base 395f3f8a`:

| Measure | `16f16e44` | `395f3f8a` | Round |
|---|---:|---:|---:|
| Play samples with a fold | 100% | 30.0% | 13.6% |
| Lift samples with a fold | 100% | 28.7% | 0% |
| Rest samples with a fold | 100% | 0% | 0% |
| Faces 116 and 52, play | | 13.7%, 11.6% | 0%, 0% |
| Top plate in the chest, mean and max | | 0.6 cm, 1.5 cm | 0.6 cm, 1.5 cm |
| Bow targets within 5 mm | | 99.9% | 99.9% |

The chest faces 633, 634, and 337 fold in no play sample, and each depth of the sweep keeps its
value. `pnpm body-probe` changes only the hippo, and the first download grows by 30 B. Face 237
is new (6.5%, most in the pizzicato). `user-view.webp`, `pairs.webp`, and `batch-species.webp`
show a smaller light wedge at the back of the right shoulder. The dark slot and the slivers stay.
