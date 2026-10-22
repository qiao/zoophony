# The arm seams of the deer and the dog

Date 2026-10-22. Round `deer-dog-seams`, base `ffd03c4b`. Decisions:
[`2026-10-22-deer-dog-seams.md`](../decisions/2026-10-22-deer-dog-seams.md). The probes and their
outputs are in [`2026-10-22-deer-dog-seams/`](2026-10-22-deer-dog-seams/). Each command runs from
the root of the tree. The probes `flap.ts`, `dump.ts`, `faces.py`, and `with-glb.ts` are in the
folders of the bear armpit and the panda armpit rounds. Copy a probe to `scratch/` before you run
it.

## 1. The question

The user said: "the bear has deformed meshes under the arm", then "the panda and rhino's arms also
got deformed", then "note that many animals are having this issue now". The audit found dark
shards at both shoulders of the deer harpist (back, az150) and of the dog cellist (back). The
goal: a clean arm root and arm at each moment, from six views, at the heights 20° and 40°.

## 2. The cause

`dump.ts` and `faces.py` put the deer shards on faces 980 and 585 (left) and 263 and 275 (right)
of the base. Face 980 joins trunk vertex 710 above the back notch (y 0.562 u, arm weight 0.14)
to the back of the upper arm (y 0.487 u, 0.83 to 0.88). The arms that reach the harp stretch it
into a dark wedge. The arm skin joins the trunk down to 0.86 (left) and 0.94 (right) of the upper
arm (`node tools/arm-gap.ts`).

The base deer folds in each sample (`fold-harpist-base.txt`). At rest and in the lift, faces 970
and 968 of the left root fold. In the play, faces 187, 211, 40, and 183 at the right inner elbow
fold with a forearm turn of 150° to 170°. The root faces are seam faces, and the elbow faces are
no part of the seam.

## 3. The deer

`variants.txt` gives each variant with its log. A cut with the top 0.56 kept face 980 and its
shard. A cut with the top 0.575 or 0.59 removed the shards, but the flat cap of the arm showed as
a dark sheet behind the raised right arm at az150 (`deer-cut-only-chord-e20.webp`). The chosen
variant takes a copy with a round patch on the inner side of each arm (`arm_patch.py`, step
0.025), the cut 0.575, the islands of the free arm, and the mean weights of one sliver of the
right patch (`weights.rigid`). The rig has 3,209 triangles with the gloss, and the packed mesh
gzip falls from 18,430 B to 18,346 B (`rig-write-deer.txt`).

| Measure | red fox | base | round |
|---|---:|---:|---:|
| Down area own L / R, play p50 (cm², `flap.ts --step 2`) | 4.7 / 5.3 | 10.2 / 13.8 | 4.5 / 13.3 |
| Join end L / R (`node tools/arm-gap.ts`) | 0.57 / 0.52 | 0.86 / 0.94 | none / none |
| Crease share L / R (`pnpm arm-look`) | 3.5% / 7.3% | 8.2% / 9.8% | 5.8% / 8.3% |
| Section L / R (`pnpm arm-look`) | 0.74 / 0.93 | 0.72 / 0.83 | 0.81 / 0.70 |
| Folds rest / play / lift (`pnpm fold-probe harpist`) | | 100% / 100% / 100% | 0% / 100% / 83.9% |
| Most folded faces in one sample | | 15 | 11 |
| Upper arms in body, play / rest / lower (cm, `--every 4`) | | 3.2 / 1.9 / 3.1 | 4.9 / 3.7 / 4.5 |

The play keeps 100% from the right inner elbow (faces 159, 154, 40, and 331 of the round are
faces 187, 211, 40, and 183 of the base). The upper arms go deeper into the body: the flat caps
of the body close the notches of the trunk, so the closed trunk takes in the root of the arm.
The deepest point is on the left upper arm at 0.60 of its length. A smaller patch radius (0.7
and 0.55) keeps 4.9 cm, so the patch form is not the cause (`check-deer-s.txt`).

## 4. The dog

The dog stops after six variants with no clean root and the folds of the base (`variants.txt`).
The cut needs a top above 0.63: at 0.62 and 0.63, the cut leaves a vertex with two loop edges.
At 0.65, `tail_weights()` stopped on the vertex that a fin removal left with no face, and the
round fixed it (`f0385ad3`). The best look is the cut 0.64 with a patch of step 0.02 (d4):

| Measure | red fox | base | d4 (not shipped) |
|---|---:|---:|---:|
| Down area own L / R, play p50 (cm²) | 4.7 / 5.3 | 16.5 / 18.4 | 0.0 / 0.0 |
| Join end L / R | 0.57 / 0.52 | 0.80 / 0.81 | 0.43 / 0.38 |
| Crease share L / R | 3.5% / 7.3% | 10.3% / 4.7% | 8.8% / 3.8% |
| Section L / R | 0.74 / 0.93 | 0.76 / 0.76 | 0.76 / 0.78 |
| Folds rest / play / lift | | 0% / 7.1% / 16.1% | 0% / 4.7% / 17.5% |
| Upper arms in body, play / lift / lower (cm) | | 2.0 / 0.5 / 2.0 | 5.5 / 4.8 / 5.4 |

The lift folds rise: face 342 at the top of the right shoulder folds in 5.3% of the lift samples
(`fold-cellist-pa.txt`). The mean weights of its corners folded the right clavicle in 33.2% of
the play (d6). `dog-patch-<moment>-e20.webp` give the base above d4 at `tip`, `crossing`, `rest`,
and `lift50` from the back, az150, az-150, and the right. The dark wedge at the right arm root
is softer, and a dark corner stays where the arm meets the trunk at `tip`.

## 5. The images

`audit-harpist-e20.webp` and `-e40.webp` are the audit sheets (`pnpm close-views audit <dir>
--roles harpist --base ffd03c4b`, half size): each moment from the back, az150, az-150, the
front, and each side, the base above the round. `deer-root-<moment>-e20.webp` and `-e40.webp`
are 3x crops of the arm roots from the back, az150, az-150, the left, and the right. The
`strip-deer-az<a>.webp` give the play of boulanger-matin from 184 s at steps of 0.5 s (`--zoom
1.8 --elevation 30`, `--zoom 2.6` at az90, because the default camera stands in the piano and
the wolf). At az-90, the harp neck covers the arms.

The shards are gone at each moment, from each view, at both heights
(`strip-deer-az180-185.5-zoom.webp`). Two marks stay. At az150, a dark area with a light jagged
line lies on the back of the right upper arm root, most at rest from 40°. At az-150, a small dark
V lies under the left arm root. Both are smaller than the base shards. The arm roots read as
round stubs at the shoulder from the back. No sample shows the depth of section 3.

## 6. The gates

`pnpm arm-check harpist cellist --base ffd03c4b` (`arm-check-harpist-cellist.txt`, base in
brackets):

| Role | Arm | folds p95 | twist p95 | forearm twist p95 | flat p5 | paw twist p95 | stretch p95 | Verdict |
|---|---|---|---|---|---|---|---|---|
| harpist | L | 1 (4) | 30 (22) | 22 (22) | 0.83 (0.70) | 69 (69) | 0.10 (0.10) | PASS |
| harpist | R | 7 (7) | 55 (40) | 41 (41) | 0.84 (0.72) | 102 (102) | 0.07 (0.07) | FAIL |
| cellist | L | 1 (1) | 31 (31) | 49 (49) | 0.75 (0.75) | 155 (155) | 0.32 (0.32) | PASS |
| cellist | R | 0 (0) | 46 (46) | 35 (35) | 0.68 (0.68) | 116 (116) | 0.19 (0.19) | PASS |

The twist of a sample is the largest change of the roll from the chest to the shoulder ring, and
from one ring of the upper arm to the next (`tools/arm-shape.ts`). `pnpm arm-shape harpist
--rings` (`arm-shape-harpist-*.txt`) gives, for the right arm in the play, the rolls of the
shoulder, upper, and elbow rings -37°, -54°, and -59° on the base, and -53°, -59°, and -60° in
the round, with the bone roll -60°. On the base, the root skin joined the trunk and held the
shoulder ring back. In the round, the free root turns with the bone, so the step from the chest
grows, and the steps along the upper arm fall from 17° to 6°. The crops of the worst sample
(`gate-harpist-185.63.webp`, az60) and the strips show no twisted skin, so the `FAIL` is a step at
the cut.

`pnpm arm-check --all --base ffd03c4b` gives this `FAIL` and no other (`arm-check-all.txt`). Each
`OPEN` row has its base value. `pnpm body-probe --base ffd03c4b` changes only the 5 deer bodies
and the deer harpist, and all 1,492 pose sets are equal (`body-probe.txt`). `pnpm fold-probe
harpist` is in `fold-harpist-base.txt` and `fold-harpist-round.txt`.
