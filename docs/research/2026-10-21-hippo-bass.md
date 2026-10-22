# The contrabass in the body of the hippo

Date 2026-10-21. Round `hippo-bass`. Decisions:
[`2026-10-21-hippo-bass.md`](../decisions/2026-10-21-hippo-bass.md). The probes and their outputs
are in [`2026-10-21-hippo-bass/`](2026-10-21-hippo-bass/). Each command runs from the root of the
tree.

## 1. The question

The user said: "the hippo is clipping with the contrabass". The screenshot showed the body of the
contrabass inside the belly and the left arm of the hippo, and the left forearm in the
contrabass. The file of the screenshot was not in the folder of the session. The goal is the
contrabass at the body of a real bassist: it touches the body and does not go in. The measures
are the instrument in the body (at most 2 cm), the arms in the contrabass, the reach of both
arms, and the arm gate.

## 2. The cause

`HIPPO_HOLD` of `src/pose/bowed-rig.ts` placed the contrabass with `playShift` `[0.84, 0, -0.04]`
and `playTurn`. `instrumentAt()` of `src/pose/bowed.ts` moves the `instrument` bone by these
values. The contact point of the bow stood 0.18 m in front of the belly, but the back of the
contrabass lies 0.26 m behind the strings (`bassgeo.ts`, `frame.ts`). Thus the back
went 14.8 cm into the belly and the chest (`pose-depth-manager.txt`). The sweep measured this
depth with no limit (`SweepPart.measureOnly`), so no gate saw it.

The belly of the hippo reaches 0.35 m in front of its shoulder joints, and its arms are 0.51 m
long. A contrabass that only touches the belly puts the strings about 0.6 m in front of the
shoulders. So no rigid place of the contrabass alone keeps both arms on the strings.

## 3. The measures

`search.ts` moves and turns the contrabass around its end pin over the play samples of
`beethoven-1`, and gives the deepest corner in the body and the arm factor that reaches the
whole fingerboard (L) and the whole hair (R). `fast.ts` sweeps each arm bone of the real pose
over every sixth play sample, the lift, the rest, and the lowering, with the reached parts.

| Variant | Instrument in body cm | L factor | R factor | Fingerboard | Hair m | File |
|---|---:|---:|---:|---|---|---|
| `5d20f635` | 14.5 | 1.016 | 1.015 | 0.00 to 0.98 | 0.045 to 0.415 | `rigid-scan.txt` |
| 13 cm forward | 2.2 | 1.253 | 1.181 | 0.19 to 0.57 | 0.275 to 0.315 | `rigid-scan.txt` |
| Best rigid place (depth at most 1.5 cm) | 1.3 | 1.208 | 1.161 | 0.52 | 0.270 to 0.310 | `rigid-scan.txt` |
| Left shoulder 20°, tilt 5°, 8 cm forward | 0.6 | 1.143 | 1.132 | 0.08 to 0.79 | 0.200 to 0.240 | `reach-left.txt` |
| Left shoulder 35°, the same place | 0.6 | 1.008 | 1.132 | 0.00 to 0.98 | 0.200 to 0.240 | `reach-left.txt` |
| and string planes 6°, bow slant -30° | 0.6 | 1.008 | 1.126 | 0.00 to 0.98 | 0.195 to 0.415 | `right-arm-scan.txt` |

A smaller contrabass (0.6, 0.7), a trunk lean of 16° or 20°, and turns of the contrabass kept
the factors near 1.2. The trunk lean moves the belly forward with the shoulders. A roll of 20°
cleared the bow arm, but put the left forearm 3.8 cm into the neck in each sample.

The bow arm reaches the frog only straight, and then it crossed the right rim of the upper bout.
`fast-12.txt` gives the free hair at the frog:

| Free hair at the frog m | Right forearm in contrabass | Right upper arm in contrabass |
|---:|---|---|
| 0.18 | 2.7 cm, 2% | 4.7 cm, 3% |
| 0.22 | 2.3 cm, 2% | 4.1 cm, 2% |
| 0.25 | none | none |

The arm gate (`arm-variants-1.txt` to `arm-variants-5.txt`) decided the rest of the hold: a
left shoulder turn of 35° flattened the left arm skin (flat p5 0.49, base 0.69), and 30° gave
0.59. A raised right elbow flattened the bow arm (0.49, base 0.56). The bow via of 2026-10-18
turned the bow paw 2,959°/s in the lowering (base 1,877°/s), and a via 0.3 H higher gave
1,650°/s. A level left rest elbow twisted the left paw 178° in the lowering (limit 176°).

## 4. The result

The round hold: the end pin stands 6 cm further forward and 5 cm further right, the contrabass
leans 33° from the vertical, 5° less back, the left shoulder turns 25°, the string planes are 6°
apart, and the bow plays from 0.25 m of the hair. `pnpm pose-depth bassist --base 5d20f635`
(`pose-depth-round.txt`, and `pose-depth-h1.txt` for the shares of the base):

| Pair | `5d20f635` cm | Round cm | `5d20f635` over 1.5 cm | Round over 1.5 cm |
|---|---:|---:|---:|---:|
| Play: instrument in body | 14.8 | 1.9 | 100% | 0% over 2 cm |
| Lift, lowering: instrument in body | 14.2, 14.1 | 1.8, 1.8 | 100% | 0% over 2 cm |
| Rest: instrument in body | 8.0 | 0.0 | 100% | 0% |
| Play: paws in contrabass | 4.3 | 1.5 | 9.1% | 1.3% |
| Play: forearms in contrabass | 7.3 | 7.7 | 59.0% | 28.8% |
| Play: upper arms in contrabass | 5.0 | 6.4 | 6.6% | 5.8% |
| Play: forearms in body | 6.5 | 5.6 | 18.7% | 4.7% |
| Play: upper arms in body | 6.3 | 0.0 | 3.5% | 0% |
| Lift: forearms in contrabass | 4.9 | 1.8 | 76.7% | 37.3% |
| Lowering: forearms in contrabass | 5.4 | 7.4 | 65.2% | 53.7% |

Most samples over 1.5 cm are the left wrist on the neck at 1.5 cm to 1.8 cm. The deep ones are
the pizzicato of `boulanger-matin` and `brahms-2`: the straight bow arm runs from the shoulder,
0.16 m behind the back of the contrabass, to the strings, through the right rim of the upper
bout (`inbass.ts`). Its pole and its pluck place change nothing. The left forearm crosses the
upper bout in the high positions of `bach-bwv1050` (7.0 cm). The fingerboard reached is 0.02 to
0.93, and the hair 0.25 m to 0.415 m. The bow targets keep 99.9% within 5 mm.

`pnpm arm-check --all --base 5d20f635` has no `FAIL` (`arm-check-all.txt`): the bow arm passes,
and the left arm is `OPEN` with the paw twist of the base (173° against 172°, limit 170°).
`pnpm clip-probe` passes each file (`clip-probe.txt`). `pnpm body-probe --base 5d20f635`
changes only the poses of the hippo (`body-probe.txt`).

The pairs show `5d20f635` on the left: `pair-front-belly.webp` (the view of the user, close at
the belly), `pair-side.webp`, `pair-rest-front.webp`, and `pair-rest-side.webp`. The base shows
the lower bout in the belly. The round shows the whole contrabass in front of the belly.

## 5. The other roles at the new limit

`pnpm pose-depth <role>` on `346ba6db` (the holds of `5d20f635`), `roles/summary.txt`:

| Role | Body | Deepest instrument in body cm | Share over 2 cm |
|---|---|---:|---:|
| hornist | pig | 4.5 | 100% (lift, rest, lowering) |
| tubist | rhino | 2.9 | 100% (play) |
| violinist | red fox, rabbit | 2.9, 2.8 | 6.5% to 10% (lift, lowering) |
| violist | cat | 2.4 | 89.5% (play) |
| cellist, clarinetist, oboist | dog, wolf, mouse | 1.3, 1.2, 1.1 | 0% |
| flutist, trombonist, bassoonist, trumpeter, singer | | 0.1 or less | 0% |
