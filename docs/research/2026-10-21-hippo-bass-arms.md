# The arms of the hippo against its contrabass

Date 2026-10-21. Round `hippo-bass-2`. Decisions:
[`2026-10-21-hippo-bass-arms.md`](../decisions/2026-10-21-hippo-bass-arms.md). The probes and their
outputs are in [`2026-10-21-hippo-bass-arms/`](2026-10-21-hippo-bass-arms/). Each command runs from
the root of the tree.

## 1. The question

The user accepted the place of the contrabass and the shorter strokes of round `hippo-bass`, and
chose "Merge, then fix arms". Three arm problems stayed on `f5209e90`: the left wrist on the neck,
the bow arm in pizzicato through the right rim of the upper bout (7.7 cm), and the left forearm
through the upper bout in the high positions (7.0 cm). The goal of the brief is the forearms and
the upper arms in the contrabass at 1.5 cm or less in at most 1% of the play samples.

## 2. The measures

`fast.ts` sweeps each arm bone of the real pose over every n-th play sample and each sample of
the lift, the rest, and the lowering, and `score.py` ranks the variants. `inbass.ts` gives the
place of each corner in the contrabass in its own frame, with the joints. `cams.ts` and
`sheet.py` make the crop pairs of four directions.

**Pizzicato.** The right shoulder lies 0.16 m behind the back of the contrabass, so the arm
reaches the strings nearly straight, and no elbow pole or pluck place along the strings changed
the depth (`fast-p1.txt`). A move of the palm to the frog side (`pluckSide`) does:

| Variant (`boulanger-matin`) | Right forearm in contrabass | Right upper arm in contrabass | File |
|---|---|---|---|
| `f5209e90` | 7.7 cm, 52% | 3.8 cm, 49% | `fast-p1.txt` |
| side 0.12 m | 4.8 cm to 5.3 cm, 52% | 5.7 cm to 6.4 cm, 52% | `fast-p1.txt` |
| side 0.15 m, elbow out | 3.5 cm, 23% | 4.7 cm, 27% | `fast-p2.txt` |
| side 0.18 m | none | none | `fast-p3.txt` |
| side 0.18 m, the elbow and the tip of the round | 4.2 cm, 0.0% (one change sample) | none | `fast-z3.txt` |

The arm gate then needed the elbow out, a little up, and forward, and the bow tip up, left, and
forward: with the elbow of the bow, the paw twisted 153° in the lowering after the last
pizzicato (base 110°, `arm-variants-2.txt` to `arm-variants-4.txt`).

**High positions.** The left shoulder lies behind the upper bout, about 0.15 m from the middle
of the contrabass. Each left elbow, extra elbow turn, and extra tilt kept the forearm 6.3 cm to
7.5 cm in (`fast-h1.txt`, `fast-h2.txt`). An end of the stops (`stopEnd`) keeps the paw over the
neck: 0.8 gave 5.4 cm, 0.76 3.6 cm, 0.73 2.4 cm, and 0.7 none (`fast-h3.txt`, `fast-z2.txt`).

**The left wrist.** The paw is 5.9 cm long from the wrist to the middle of the finger block, and
the skin of the forearm near the wrist lies 8.3 cm from its bone on the mean (`paw.txt`). With
the fingers on the strings, 70 to 90 corners of the forearm lie in the neck, with the wrist joint
3 cm behind the strings (`inbass.ts`). A real bassist touches the back of the neck with the thumb
alone (string-technique, section 2.8), so this is a clip. Tilts of 58° to 85°, other rest elbows,
other rest places, more finger curl, and a stop lifted or moved by 1 cm to 2 cm kept the depth
near 1.5 cm (`fast-w1.txt` to `fast-w5.txt`). Tilts above 62° or a rest place of 0.3 failed the
arm gate (`arm-variants-1.txt`, `arm-variants-5.txt` to `arm-variants-7.txt`). So the round keeps
the wrist of `f5209e90`.

## 3. The result

`pnpm pose-depth bassist --base f5209e90` (`pose-depth-round.txt`), and `--goal 2` for the share
over 2 cm (`pose-depth-goal2.txt`):

| Pair | `f5209e90` cm | Round cm | Round over 1.5 cm | Round over 2 cm |
|---|---:|---:|---:|---:|
| Play: instrument in body | 1.9 | 1.9 | 0% over 2 cm | 0% |
| Play: forearms in contrabass | 7.7 | 4.2 | 19.7% | 0.1% (`boulanger-matin`), 0% elsewhere |
| Play: upper arms in contrabass | 6.4 | 1.3 | 0% | 0% |
| Play: forearms in body | 5.6 | 0.0 | 0% | 0% |
| Lowering: forearms in contrabass | 7.4 | 2.0 | 55.2% | - |
| Lowering: upper arms in contrabass | 4.3 | 0.1 | 0% | - |
| Rest, lift: forearms in contrabass | 1.8, 1.8 | 1.8, 1.8 | 100%, 31.5% | - |

The play samples over 1.5 cm in each demo (11.5% to 29.7%) are the left wrist on the neck at
1.5 cm to 2.0 cm. Only the change from the bow to pizzicato at 248.13 s of `boulanger-matin` goes
deeper. The fingerboard reached is 0.02 to 0.70, and the hair 0.25 m to 0.415 m.

`pnpm arm-check --all --base f5209e90` has no `FAIL` (`arm-check-all.txt`): the bow arm passes,
and the left arm is `OPEN` with the paw twist of the base (174° against 173°, limit 170°).
`pnpm clip-probe` passes each file (`clip-probe.txt`). `pnpm body-probe --base f5209e90` changes
only the poses of the hippo (`body-probe.txt`).

The crop pairs show `f5209e90` on the left and the round on the right, from the front, the back,
the left, and the right of the hippo: `pairs-pizz.webp` (`boulanger-matin` 262.63 s),
`pairs-high.webp` (`bach-bwv1050` 304.80 s), `pairs-wrist.webp` (`beethoven-1` 242.40 s), and
`pairs-hold.webp` (the frog of the close views, with the front at the belly and the sides). From
the back, and for the right arm from the left, the body hides the arm. In the front and the
right views of pizzicato, the round paw stays outside the rim. In the front and the left views
of the high position, the round forearm stays above the upper bout.
