# The open grips of the winds

Date 2026-10-25. Round `open-grips`. Decisions:
[`2026-10-25-open-grips.md`](../decisions/2026-10-25-open-grips.md). The probes and their outputs
are in [`2026-10-25-open-grips/`](2026-10-25-open-grips/). Each command runs from the root of the
tree. `main` is 0cfe7ee6.

## 1. The question

The manager listed seven grip faults that stayed open after the round `grips`. A grip is good when
a person sees a paw that holds the instrument where a real player holds it
(`docs/reference/wind-technique.md`), with the finger tips on the tube. The 2x crops decide, with
`pnpm wind-grip` and the gates beside them.

## 2. The faults and the fixes

| Role | Fault on `main` | Fix | Commit |
|---|---|---|---|
| trombonist | The right paw at the left of the slide brace, tips 2.0 cm off, place 143° | The grip moves back along the slide, out to the right of the brace, and down it, the paw points 0.8 along the slide, the curl is 110° | b8a029d8 |
| trombonist | Slide travel 0.075 m of 0.55 m | The grip at the finger tips gives 0.17 m | b8a029d8 |
| clarinetist | The right paw a fist at the left of the tube, tips 4.3 cm off | The grip moves 0.24 H toward the axis and 0.07 H to its side, the curl is 110° | 99f3f98c |
| tubist | The left paw with the back to the main branch | The palm faces the branch at its back left, both paws keep the play hold at rest | 9e89d0fe |
| trumpeter | The trumpet 20° below the level | 10° below the level, the left grip 0.03 H low | 6c8ada54 |
| flutist | Check the lift and the lowering | No change (section 5) | - |
| bassoonist | Grip turns 175° and 163° | No change: an old entry of `ACCEPTED_GRIPS` (section 6) | - |

Two code changes made the fixes possible. `pnpm wind-grip` measures the trombone places in the axes
of the slide (5308880a): in the axes of the chest, the place of the right paw pointed out along the
slide. The side aim of a wind paw takes its sign once in the playing pose (0e83be61): the sign of
each frame flipped the trombone paw in the lowering (9,106°/s to 10,708°/s).
`pnpm body-probe --base main` gives the same poses after 0e83be61.

## 3. The grips

`pnpm wind-grip <roles>` (`grip-main.txt` on `main`, `grip-tree.txt` on the tree,
`grip-trombone-mainhold.txt` for the trombone of `main` with the places of the slide). Each cell
gives the share of the play samples in which the paw grasps, then the median gap of the finger
tips, and the place angle.

| Role | Paw | Main | Tree | Main at rest | Tree at rest |
|---|---|---|---|---|---|
| trombonist | R | 0%, 2.0 cm, 143° | 100%, 0.5 cm, 42° | 0%, 4.6 cm | 100%, 0.4 cm |
| trombonist | L | 100%, 0.1 cm | 100%, 0.2 cm | 100%, 0.4 cm | 0%, 0.7 cm |
| clarinetist | R | 0%, 4.3 cm | 100%, 0.1 cm | 0%, 4.5 cm | 100%, 0.1 cm |
| tubist | L | 100%, 0.4 cm, palm 60° | 100%, 0.2 cm, palm 18° | 100% | 100% |
| trumpeter | L | 100%, 0.0 cm, top -1.4 cm | 100%, 0.2 cm, top -0.3 cm | 100% | 100% |
| trumpeter | R | 100%, 0.3 cm, top -1.1 cm | 100%, 0.4 cm, top 0.9 cm | 100% | 100% |

The trombone keeps the play hold at rest, so the left trombone tips stand 0.7 cm from the tubes at
rest (limit 0.6 cm). The scans of each hold are in `tromb-grip-*.txt`, `arm-tromb-v*.txt`,
`clar-scan*.txt`, `arm-clar.txt`, `depth-clar-c1.txt`, `arm-tuba*.txt`, `depth-tuba-*.txt`, and
`arm-trp.txt`. The grips of the tuba tree are in `grip-tuba-tree.txt`.

## 4. The slide travel

A real seventh position is 0.568 m from the first position (wind-technique 1.2). The panda arm is
0.578 m from the shoulder joint to the middle of the palm, and the mouth is 0.40 m in front of the
shoulder joints, so the brace of the first position is 0.51 m from the right shoulder joint.
`node docs/research/2026-10-25-open-grips/probes/slide-scan.ts 0,30,45,60,75,90 -5 45 '<hold>'`
gives the travel for each turn of the slide to the right, 10° below the level
(`slide-scan-main.txt`, `slide-scan-final.txt`).

| Turn to the right | 0° | 30° | 45° | 60° | 75° | 90° |
|---|---:|---:|---:|---:|---:|---:|
| `main`, travel cm | 0.0 | 1.0 | 7.5 | 16.5 | 27.0 | 37.5 |
| tree, travel cm | 0.5 | 10.0 | 17.0 | 26.0 | 35.5 | 45.5 |

The slide keeps 45°, the angle of the manager review of the round `grips`. A forward turn of the
right shoulder that grew from the fifth to the seventh position gave 19.5 cm, but bent the right
wrist 74° to 76° to the side (limit 70°, `arm-tromb-v9.txt`). A larger fixed turn bent the rest
wrist 98° to 100° (`arm-tromb-v8.txt`). `pnpm hold-reach panda --instrument trombone` now gives
0.170 m (0.075 m on `main`).

## 5. The flute in the lift and the lowering

`pnpm wind-grip flutist --lines` (`flute-lines.txt`) gives each step of 0.1 s. The right paw keeps
a skin gap of at most 0.7 cm and finger tips at most 0.9 cm from the flute in each step of the lift
and the lowering, and it grasps in 84% and 90% of the steps. The steps that do not grasp are the
first 0.4 s of the lift and the last 0.4 s of the lowering, where the tips are 0.6 cm to 0.9 cm off.
`pnpm pose-depth flutist` gives 0.0 cm of the flute in the body in each set (`depth-flute.txt`).
In the play and at rest, both paws close on the flute (`crops/flute-play.webp`,
`crops/flute-rest.webp`). A larger curl or another rest grip did not raise the share
(`flute-scan.txt`).

## 6. The bassoon grip turns

`pnpm arm-check bassoonist --states dc0beb23~1,a15f8679,4e84fdc3,1ffd11e4` (`bsn-states.txt`)
shows that the grip turns went from 0° to 175° (left) and 163° (right) at 4e84fdc3, the commit that
put the bassoon on its diagonal and turned each palm to the tube. The paw twist fell from 118° to
57° on the left and rose from 78° to 110° on the right, with no jump and no fast turn. The entry of
`ACCEPTED_GRIPS` is the median of the hold before, with the back of each paw to the tube. In the
crops (`crops/bassoon-paws.webp`, `crops/bassoon-sides.webp`), the left paw holds the wing joint
under the bocal and the right paw holds the boot joint 16 cm lower, each palm on the tube from the
side of the body and the claws curled over its front, as a real bassoonist holds it (wind-technique
3). `pnpm wind-grip` gives 100% grasps of both paws in the play. Thus the turn is a measure of an
old entry, and the grip is correct. The bassoon has no seat strap in the app.

## 7. The gates

`pnpm arm-check --all --base main` (`arm-check.txt`) fails 6 values. Each one is a margin against
`main` inside its limit, or a grip turn that changes on purpose:

| Role | Arm | Value (main), limit | Reason |
|---|---|---|---|
| trombonist | R | folds 5 (0), 8 | The paw points along the slide |
| trombonist | R | paw swing 68 (33), 70 | The finger tips reach forward to the brace |
| clarinetist | R | flat 0.81 (0.91), at least 0.55 | The grip past the axis |
| tubist | L | flat 0.63 (0.76), at least 0.55 | The palm on the branch |
| tubist | L | grip turn 96 (0), 45 | The palm faces the branch on purpose |
| tubist | L | move twist 148 (129), 176 | The palm faces the branch on purpose |

The other values that are over a limit are `OPEN` and the same as on `main`, such as the grip turns
of the oboist, the bassoonist, the clarinetist, and the trumpeter. The trombonist grip turn falls
from 134° to 51°.

`pnpm pose-depth <role> --base main` (`depth-<role>.txt`) gives no new pair over its limit. The
clarinet claws grow from 0.5 cm to 0.9 cm in the play and to 1.0 cm in the lift (limit 1.5 cm).
The paws of the rhino go 1.1 cm into the tuba in the play (1.7 cm on `main`). The trombone and the
trumpet depths are as on `main` or smaller. The note-target error of the right trombone palm grows
from 37.7 mm to 81.3 mm (`targets-trombone.txt`), because the middle of the paw now stays behind
the brace, and the finger tips hold it. `pnpm body-probe --base main` (`body-probe.txt`)
changes only the poses of the trombonist, the trumpeter, the tubist, and the clarinetist.

## 8. The images

`crops/<instrument>-paws.webp` puts the 2x paw crops of `main` above those of the tree. The gate
images of `pnpm close-views <role> <dir> --base main` at zoom 2 and 1.2 are in `<role>/`.
