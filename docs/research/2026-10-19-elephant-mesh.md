# The elephant mesh of the user as the timpanist

Date 2026-10-19. Round `mesh-elephant`. Decisions:
[`2026-10-19-mesh-elephant.md`](../decisions/2026-10-19-mesh-elephant.md). The probes and their
outputs are in [`2026-10-19-elephant-mesh/`](2026-10-19-elephant-mesh/). Each command runs from the
root of the tree, and the base is `ab002346`, the commit before the round.

## 1. The question

The user gave a textured mesh of an elephant with no skeleton
(`assets/models/elephant/elephant.glb`), and asked for no questions. The timpani elephant gets it
by route 3. The measures that decide are the size against the reference images, the reach of the
mallets to the kettles, the clearance of the arms, the mallets, and the trunk, and the folds.

## 2. The measures

**Size.** The pixels of the reference images (`ruler.py`, the crops `ref-*.webp`). The elephant
and the hippos stand in the back row at about one depth. The red fox sits in front, so its head is
scaled by the desk of its music stand, which is 0.5 m wide in the app.

| Measure | `orchestra-latest.png` | `orchestra-side.png` |
|---|---|---|
| Elephant: skull top to the soles behind the kettles | 335 to 580, 245 px | 372 to 630, 258 px |
| Hippo: skull top to the soles | 360 to 550, 190 px | 425 to 650, 225 px |
| Elephant over hippo, standing height | 1.29 | 1.15 |
| Elephant over hippo, skull top to chin | 95 / 67 px, 1.42 | 108 / 70 px, 1.54 |
| Elephant head over red fox head, each by the desk at its depth | 0.625 / 0.278, 2.25 | - |

The app puts the skull top of the hippo and of the red fox at 1.570 m, and of the parametric
elephant of `main` at 1.462 m. The reference elephant is clearly larger than the fox, so the round
takes the size of the reference: the mean ratio 1.22 to the hippo gives 1.920 m. The reference
range of 1.81 m to 2.03 m lies inside the sizes of the mid-report (`options.md`, `options.webp`,
from `pnpm mesh-options elephant <dir> --size main=1.462 --size fox=1.57 --size ref-low=1.81
--size ref-high=2.03 --size ref=1.92 --legs 1 --arms 1.3,1.45,1.55,1.7`).

| Size of the mid-report | Skull top | H | Reach, arm factor 1 |
|---|---|---|---|
| `main` | 1.462 m | 0.455 m | 0.344 m |
| Red fox | 1.570 m | 0.489 m | 0.369 m |
| Reference, low and high | 1.810 m, 2.030 m | 0.563 m, 0.632 m | 0.425 m, 0.477 m |
| Reference, chosen | 1.920 m | 0.598 m | 0.451 m |

**Arms.** The arms of the mesh are 0.57 of the trunk from the hips joint to the shoulder joints.
Arms of 0.93 of the trunk need the arm factor 1.7, above the stop of 1.6, so the arms keep the
mesh, and the kettles and the hold move (`options.md`).

**Trunk and head.** Bone heat gave the lower trunk to the chest and the spine, and as a part of the
head the trunk set the chin of the head measures, so H was 1.303 m (`pnpm rig-mesh --check` before
`headFloor`). `noseFront` gives 146 vertices in front of z 0.17 u below the head line to the head,
and `headFloor` 0.69 u leaves the trunk out: H is 0.598 m.

**Colors.** The plain faces have the hue 48° to 63° and the chroma 0.021 to 0.043 in Oklab, and
`SPECIES_COLORS.elephant` has the hue 74° and the chroma 0.015 (`fur-colors.txt`). The eyes are
12 and 9 dark faces at y 0.85 u (`head-colors.txt`). The face looks friendly from the front and
at 60° (`face.webp`), with no dark brow, so no face rule changes it.

**Reach of the mallets.** `mallet-reach.ts` gives the error of each strike on a tree, and
`reach-scan.ts` scans variants of `--set` on this tree (`reach-scan.txt`). The parametric
elephant of `main` reaches each strike with arms of 0.734 m (`mallet-reach-main.txt`).

| Hold on the mesh | Strikes within 5 mm | Worst error |
|---|---|---|
| Kettles and hold of `main` | 0% | 42.5 cm |
| Same, each hand on its side (`sides`) | 0% | 23.4 cm |
| Front gap 0.12 m and the final hold, hands alternate | 60.4% | 21.6 cm |
| Front gap, `sides`, spot 0.055 m from the rim, home (0, 0, -0.2) H | 100% | 0.0 cm |
| Final hold with the arc of 0.8 m | 16.3% | 6.2 cm |
| Final: home (0, -0.1, -0.3) H, elbows out and back | 100% | 0.0 cm (`mallet-reach.txt`) |

The misses of the alternate hands are the strikes of a roll, in which the other hand reaches
across the trunk to the far kettle. The real playing spot is "about 3 inches in from the edge of
the bowl and directly in front of the player", closer to 2 inches on a 23 inch drum
([freepercussionlessons.com](https://freepercussionlessons.com/where-is-the-best-playing-spot-on-timpani)).
The kettles of the app are 0.7 of the real size, so the spot lies 0.055 m in from the rim.

**Clearance.** `pnpm pose-depth timpanist --gaps` on the 4 demos with timpani, with the final hold
(`pose-depth-timpanist.txt`):

| Pair | Deepest, all sets | Limit |
|---|---|---|
| Head with the trunk, the tusks, and the ears to the kettles | gap of 9.1 cm or more | contact 1.5 cm |
| Upper arms in the body | 2.8 cm (the hanging arm of the lowering) | accepted 3 cm |
| Mallets in the kettles | 2.3 cm (the ball at a strike) | accepted 3 cm |
| Paws and forearms in the body | 0.5 cm | contact 1.5 cm |

With the home (0, 0, -0.2) H, a left paw went 5.8 cm into the body in `beethoven-8-4`, where the
largest of three kettles stands beside the player. With the home (0, 0, -0.4) H, the mallets missed
by up to 2.7 cm (`pose-depth-homes.txt`). The elbows down put the upper arms 2.6 cm into the body
in the play (`pose-depth-poles.txt`). With no front gap, the trunk went 3.8 cm into the kettles
(`pose-depth-first.txt`).

**Folds.** Each sample folds a face (`fold-probe-timpanist.txt`). With the final hold and no
corrective shape, the folded face-samples are 143,420 (`fold-probe-no-shapes.txt`). The paws turn
about 170° (left) and 164° (right) from their bind on the forearms at the strikes
(`wrist-turn-L.txt`, `wrist-turn-R.txt`), and the upper arms 83° at the armpits
(`keys-read.txt`). Four shapes at these turns cut the face-samples to 34,294. Face 137 of the
right armpit still folds in 94% of the play, the left forearm in 61%, and the left arm that waits
over the side kettle in 37%.

**Other bodies.** `pnpm body-probe --base ab002346` (`body-probe.txt`): 90 of 95 bodies, 22 of 23
players, and 1,414 of 1,492 pose sets stay equal. The other sets are the elephant and the players
that the larger elephant and the wider arc of the kettles move: the hippos, the penguins, the
beavers, the monkey, the panda, the badger, and the conductor. The folds of the bassist and the
trombonist stay as on `main`, and no depth grows (`fold-probe-*-base-main.txt`,
`pose-depth-*-base-main.txt`). The paused shot test keeps 74.7% of the shots, 74.2% on the base,
with the limit 75% (`shots-test.log`, `shots-test-base.log`). The first download grows by 31,279 B
to 567,294 B.

## 3. The result

The elephant mesh stands at the timpani at the size of the reference, 1.920 m to the skull top,
with the arms and the legs of the mesh. The kettles leave a gap at the front for the trunk, each
hand strikes the playing spot of the kettles on its side, and each mallet reaches each target.
The trunk keeps 9 cm from the kettles, and the arms touch only the side of the body. The folds and
the dark shading of the arm seam stay open for a round of their own.
