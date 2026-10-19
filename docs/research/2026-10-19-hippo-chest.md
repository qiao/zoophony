# The chest of the hippo bassist

Date 2026-10-19. Round `hippo-chest`. Decisions:
[`2026-10-19-hippo-chest.md`](../decisions/2026-10-19-hippo-chest.md). The probes and their outputs
are in [`2026-10-19-hippo-chest/`](2026-10-19-hippo-chest/). Each command runs from the root of
the tree.

## 1. The question

The user said: "the hippo's chest is clipping when playing", with a screenshot of the hippo bassist
from the front and a little above. The goal is a render of the same view with no clip. The
measures are the depth of the top plate of the contrabass in the body, the folds of the chest, the
depths of the arms, and the bow targets.

## 2. The measures

**The cause.** `chest-views.ts` renders the gallery of the hippo at a camera 30° above the floor,
at the moments of `pnpm close-views bassist`. `compare.py` puts the crops beside the screenshot
(`chest-compare.webp`). In the screenshot and in the base render, the chest under the chin covers
the half of the upper bout on the right side of the hippo, and a thin strip of the bout shows at
the edge of the chest. The upper bout of the contrabass lies in the chest. Faces 617 and 618 of the
chest fold at the same place, and the skin does not draw a turned face.

The sweep measures the arms only. `pnpm pose-depth bassist --bones instrument --into body` gives
the contrabass 18.5 cm into the body in the play on `boulanger-matin`
(`pose-depth-instrument-base.txt`), at the back of the upper bout. `top-plate.ts` measures only the
corners of the top plate of the body of the contrabass:

| Variant (`boulanger-matin`, each 4th play sample) | Top plate mean cm | Top plate max cm | Deepest arm, play cm | Deepest arm, lowering cm |
|---|---:|---:|---:|---:|
| Base: trunk 15°, end pin z 0.004 H | 4.5 | 5.6 | 6.7 | 4.9 |
| Trunk 11.5° | 2.3 | 3.3 | 8.1 | 8.1 |
| End pin 2.7 cm forward | 2.0 | 3.1 | 7.2 | 6.9 |
| Trunk 11.5°, end pin 2.2 cm forward | 0.3 | 1.2 | 7.5 | 7.2 |
| Trunk 12.6°, end pin 3.2 cm forward | 0.2 | 1.0 | 7.4 | 7.2 |
| Trunk 8° | 0.3 | 1.0 | 8.2 | 8.0 |
| End pin 5.3 cm forward | 0.1 | 0.7 | 7.7 | 7.4 |
| Roll of 10° to the left | 2.6 | 3.0 | - | - |
| Roll of 20° to the left | 6.2 | 6.7 | - | - |
| Round: trunk 12°, end pin 2.2 cm forward, new rig | 0.6 | 1.5 | - | - |

The files are `top-plate-holds.txt`, `top-plate-more.txt`, `top-plate-round.txt`,
`hold-fit-moderate.txt`, and `hold-fit-lean8-forward5.txt`. `roll.py` turns the contrabass around
the line from the contact point to the nut, so that the top plate turns to the left, and the end
pin leaves the floor by 1.8 cm (10°) and 3.7 cm (20°). Other right
elbows did not change the arm depths (`hold-fit-poles.txt`). Each variant keeps 97.6% of the 127
bow targets within 5 mm.

**The folds.** Bone heat gave the chest under the chin the weights of both clavicles (0.12 to 0.21)
and of the head. The bow arm turns the right clavicle far, so faces 617 and 618 on the middle plane
folded in each play sample. Face 323 of the back of the right side of the neck joins the head, the
neck, and a corner with a clavicle weight of 0.51. `pnpm rig-mesh hippo --check --demo
boulanger-matin` gives the folded samples of each face (of 1,162):

| Rule | 617 | 618 | 323 | Faces that fold more | File |
|---|---:|---:|---:|---|---|
| Base | 1153 | 1154 | 1155 | - | `rig-clavicle-from.txt` |
| `clavicleFrom` 0.58 to 0.63 | 0 | 0 | 1155 | 338, 459, 350, 248 in each sample | `rig-clavicle-from.txt` |
| `clavicleMiddle` 0.04 to 0.10 | 0 | 0 | 1155 | 350 in each sample | `rig-middle-narrow.txt` |
| `clavicleMiddle` 0.05 to 0.25 | 0 | 0 | 1153 | 69, 233, 248 | `rig-middle-wide.txt` |
| and `armTop` 0.62 to 0.68 | 0 | 0 | 0 | 240 (1065), 239, 234 | `rig-middle-armtop.txt` |
| and one `raise` of the play | 0 | 0 | 341 | 477, 461, 248, 262 | `rig-raise.txt` |
| and `rigid` on face 323 | 0 | 0 | 0 | 477, 461, 248, 514 | `rig-variants-boulanger.txt` |

`pnpm raise-fit bassist --faces 323 --side R` gives the shape (`raise-fit-323.txt`). On all demos
with the new hold (`pnpm fold-probe bassist --base bb2a8026`, `fold-probe-base.txt`), faces 617,
618, 323, and 338 fold in no sample. Faces 240, 286, and 480 of the front of the shoulder fold in
1.0%, 1.6%, and 4.5% of the play samples (88.9%, 95.2%, and 36.9% before). Faces 477, 461, and 68
of the right upper arm fold in 93.2%, 34.4%, and 25.3% (0% before), and face 1356 of the left upper
arm in 53.5% (19.6%). The folded face samples fall from 212,236 to 154,921 (`rig-final.txt`).

**The other measures.** `pnpm pose-depth bassist --base bb2a8026` (`pose-depth-base.txt`):

| Pair | Base cm | Round cm |
|---|---:|---:|
| Play: paws in body | 4.4 | 2.8 |
| Play: forearms in body | 5.3 | 8.1 |
| Play: forearms in contrabass | 5.2 | 7.4 |
| Play: upper arms in body | 5.5 | 7.4 |
| Play: upper arms in contrabass | 6.7 | 7.4 |
| Lowering: paws in body | 3.8 | 1.7 |
| Lowering: forearms in body | 5.0 | 8.0 |
| Lowering: forearms in contrabass | 3.6 | 7.0 |
| Lowering: upper arms in body | 4.9 | 7.3 |
| Lowering: upper arms in contrabass | 2.3 | 7.1 |

The bow targets of `boulanger-matin` keep 97.6% within 5 mm, and each other demo 100%.
`pnpm body-probe --base bb2a8026` changes only the hippo (`body-probe.txt`). The first download
grows by 137 B (`size.txt`).

## 3. The result

The round keeps the upper bout in front of the chest: the trunk leans 12°, and the end pin stands
2 cm further forward. The top plate goes at most 1.5 cm into the chest, against 5.6 cm. The front
views of `pnpm close-views bassist --base bb2a8026` show the whole upper bout at the frog, the tip,
and the string crossing (`close-views-front.webp`, `close-views-grid.webp`). The rig removes the
folds of the chest under the chin and of the back of the neck. The cost is deeper arms, most in the
lowering, and new folds of the right upper arm, which the round reports as open.

## 4. The arms after the chest fix

The round `hippo-arms` brings the arms back out of the body and the contrabass, and keeps the
chest fix. The probes and their outputs are in
[`2026-10-19-hippo-chest/arms/`](2026-10-19-hippo-chest/arms/).
`pnpm pose-depth bassist --demo boulanger-matin` gives the variants (`pd-b1.txt` to
`pd-b6.txt`, read with `pdtab.py`), and the rows with the left tilt of 55° also take `brahms-2`.
Each cell is the deepest point in cm:

| Variant | Play forearms in body | Play forearms in contrabass | Play upper arms in body | Lowering upper arms in contrabass | Chest faces |
|---|---:|---:|---:|---:|---|
| `61e7b8cf` | 8.1 | 7.4 | 7.3 | 7.1 | no fold |
| Right elbow poles and the slant -10° (5 variants) | 8.1 | 7.4 | 7.3 | 7.1 | - |
| Shoulder turn 35° | 10.0 | 7.4 | 8.7 | 4.0 | - |
| Shoulder turn 60° | 6.9 | 7.4 | 6.9 | 0.6 | 616 in 99% |
| Shoulder turn 55°, left tilt 55° | 4.6 | 7.4 | 5.4 | 2.3 | 616 in 94% |
| Shoulder turn 50°, left tilt 55° | 4.7 | 7.4 | 6.0 | 4.7 | no fold |
| Shoulder turn 60°, left tilt 45°, contrabass 6 cm to 12 cm left | 3.7 to 7.0 | 7.4 | 5.7 to 8.1 | 1.3 to 3.8 | - |

The bow arm is straight in its deepest samples, so no right elbow pole changes a depth. The
shoulder turn brings the shoulder joint nearer to the bow, but from 55° the front of the right
shoulder and the chest under the chin fold (`fold-r55t55.txt`, `fold-r50t55.txt`). The shoulder
turn and the place of the contrabass do not change the top plate in the chest (`tp-final.txt`).

The left forearm in the contrabass keeps 7.4 cm, half the thickness of the upper bout: in the high
positions, the forearm goes through it. `left-forearm.ts` counts the samples over 5.7 cm. Each
left elbow, tilt, and turn keeps 45 to 95 of 1,189 samples over it (`lf-a.txt`, `lf-b.txt`). Only
the place of the contrabass before the chest fix gives no sample over it.

`pnpm raise-fit bassist --faces 477,461 --side R` gives the turns of the old rule of the bow arm
with the new clavicle turn. In the pose of that rule, 13 faces stay turned after the relax
(`rig-check-raise.txt`), so the round keeps the old rule. A rule of the left arm for face 1356
relaxes both of its turned faces (`raise-fit-1356.txt`, `rig-check-r55-L.txt`).

| Measure | `bb2a8026` | `61e7b8cf` | Round |
|---|---:|---:|---:|
| Top plate in the chest, play, mean / max (`boulanger-matin`) | 4.5 / 5.6 | 0.6 / 1.5 | 0.6 / 1.5 |
| Play: forearms in body / contrabass | 5.3 / 5.2 | 8.1 / 7.4 | 4.8 / 7.4 |
| Play: upper arms in body / contrabass | 5.5 / 6.7 | 7.4 / 7.4 | 6.0 / 5.0 |
| Lowering: forearms in body / contrabass | 5.0 / 3.6 | 8.0 / 7.0 | 4.4 / 4.2 |
| Lowering: upper arms in body / contrabass | 4.9 / 2.3 | 7.3 / 7.1 | 5.6 / 4.7 |
| Play folds of faces 477 / 461 / 68 / 1356 | 0% / 0% / 0.1% / 19.6% | 93.2% / 34.4% / 25.3% / 53.5% | 92.0% / 73.6% / 15.6% / 2.2% |
| Play folds of faces 617 / 618 / 323 | 100% / 100% / 100% | 0% / 0% / 0% | 0% / 0% / 0% |
| Bow targets within 5 mm (`boulanger-matin`, 127) | 97.6% | 97.6% | 97.6% |

The depths come from `pnpm pose-depth bassist --base bb2a8026` (`pose-depth-final.txt`), the
folds from `pnpm fold-probe bassist --base bb2a8026` (`fold-final.txt`), and the top plate from
`top-plate.ts`. `pnpm body-probe --base 61e7b8cf` changes only the hippo (`body-probe.txt`). The
first download grows by 62 B (`size.txt`). `user-view.webp` shows the view of the screenshot of
the user, and `close-views-front.webp` and `close-views-grid.webp` show the close views against
`61e7b8cf`: the upper bout stays in front of the chest.
