# The timpani mallets and the rest of the pianist

Date 2026-10-25. Round `timpani-piano-rest`. Decisions:
[`2026-10-25-timpani-piano-rest.md`](../decisions/2026-10-25-timpani-piano-rest.md). The probes
and their outputs are in [`2026-10-25-timpani-piano-rest/`](2026-10-25-timpani-piano-rest/). Each
command runs from the root of the tree. `main` is `ac9f9cb7`.

## 1. The question

The visual audit (`docs/audits/2026-10-25-role-visual-audit.md`) gave four faults:

1. At rest and between strikes, the right timpani mallet lies level across the belly.
2. The timpani moments look almost the same, with no visible stroke.
3. At rest, the paws of the polar bear pianist hang in front of the chest at the height of the
   keys. The arm gate fails the pianist folds.
4. Each forearm of the pianist folds into a hard dark V at the elbow in the chord.

## 2. The sources

`docs/reference/percussion-technique.md` 3 and `docs/reference/piano-technique.md` 8 give each
fact with its source. A timpanist sets the mallets about one inch above the head before the first
note, with the shafts level (source 41, a search summary only). A stroke starts above the head,
and the mallet lifts at once after the attack (40). A pianist rests both hands on the lap before
the first note (Suzuki checklist, piano source 21).

## 3. The timpani

`timp.ts` poses the elephant over each demo with a timpani part at steps of 0.01 s
(`timp-branch.txt`). `timp-main.txt` sets the values of `main` with `SET` on a tree with no
roll: `timpani.across.pitch=null;timpani.sizes.rest=0.2;timpani.sizes.lift=0.1;`
`timpani.across.peak=1;timpani.home=[0.1,-0.37,-0.2]`. The height is the head above the plane of
the kettle heads. "In" is the angle of the shaft in from forward, seen from above.

| Measure | `main` | Branch |
|---|---|---|
| Head between strikes, p50, L / R | 8.6 to 12.1 / 1.7 to 9.2 cm | 2.4 to 4.7 / 4.5 to 6.9 cm |
| Shaft in from forward, p50, L / R | 52° to 57° / 34° to 51° | 29° to 32° / 24° to 26° |
| Shaft down from the level, p50 | 3° to 21° | 15° to 21° |
| Highest head in a lift | 3.5 to 13.9 cm | 10.7 to 21.3 cm |
| Largest paw turn in 0.01 s | 42.6° (117 turns over 30°) | 7.1° (0) |

On `main`, the paw turned the mallet across the forearm between strikes (`MalletAcross.rest`),
so the right mallet pointed 51° in, almost level, toward the middle of the belly. The lift ended
at the height of between strikes, so no stroke showed. In the branch, each mallet keeps its
strike direction, the wrist lifts the head a little (`pitch` 0.1), and the lift before a strike
goes 10 cm to 15 cm higher (`peak`, `sizes.lift` 0.2).

`pnpm wind-grip timpanist` (`grip-main.txt` with the `main` values, `grip-branch.txt`):

| Paw | `main` play, lift, rest | Branch play, lift, rest | Branch exit, butt |
|---|---|---|---|
| L | 96%, 68%, 100% | 93%, 94%, 100% | 54°, 2.5 cm |
| R | 95%, 100%, 100% | 97%, 100%, 100% | 51°, 2.0 cm |

The trades (`scans.txt`):

| Variant | Result |
|---|---|
| Pitch 0.2, homes 0.1 H to 0.3 H, no roll | Grasps 0%: the shafts leave the paws 80° to 109° from the thumb side |
| Strike roll, homes 0.3 H to 0.35 H | Left grasps 10% to 73% |
| Strike roll, home 0.4 H | Right grip turn 28° (`main` 0°) and move twist 38° (20°), margin fails |
| Strike roll, home 0.45 H | Right move twist 25° (20°), over the margin of 3°: the home went to 0.48 H |
| Pitch 0.2 or 0.3 with the roll | Left exit 60° to 68°, grasps 5% to 32% on `beethoven-1` |
| Left offset 0 | The left mallet points 17° in and the right 22° |

## 4. The pianist

`pian.ts` measures the rest pose (`pian-branch.txt`, and `pian-main.txt` with the rest offsets of
`main` through `SET`). `pian-profile.ts` cuts the posed skin at x = 0.2 m (`pian-profile.txt`).

| Measure | `main` | Branch |
|---|---|---|
| Palm height, L / R (key top 0.81 m) | 0.800 / 0.776 m | 0.709 / 0.729 m |
| Paw gap to the body, L / R | 4.5 / 3.9 cm | 1.1 / 1.9 cm |
| Paw depth in the body | 0.0 cm | 0.0 cm |
| Paw depth in the lift and the lowering (`pian-lift.ts`) | 0.0 cm | 0.0 cm |

The rest place took the top of the leg skin under a point of the thigh (`lapPoint()`). The belly
covers the thigh there, so the top was the belly at 0.73 m, and the offset lifted the paws 7 cm
higher. The belly covers the thighs up to 0.45 m in front of the hips. The top of the thigh past
it stands 0.70 m from the shoulder joint, and the arm reaches 0.49 m. So no paw reaches a thigh.

`pnpm arm-check pianist --base main` with each variant (`scans.txt`): the left folds stay 19 to
22 in each variant, and `main` has 20. Lower paws folded the right shoulder 16 to 21 times
(`main` 13, margin 2). `pnpm fold-probe pianist --bins 1750` shows the cause: an arm-root face
folds in 97% of the samples in which the upper arm turns 60° to 80° from the T bind, and in 2% at
40° to 60°. The same faces fold in most play samples. This is a fault of the rig.

The elbow V of the chord: the right inner elbow faces 574, 575, and 576 fold in 54% to 77% of
the play samples at each of four elbow poles (`scans.txt`). This is a fault of the rig.

## 5. The gates

`pnpm arm-check --all --base main` (`arm-check.txt`): only the timpanist and the pianist change.
The values give the tree and `main` in parentheses.

| Role | Arm | Value | Verdict | Reason |
|---|---|---|---|---|
| timpanist | L, R | grip turn p50 0 / 0, move twist max 9° / 20° (22° / 20°) | `PASS` | The manager accepted the new grips of the strike roll, and `ACCEPTED_GRIPS` holds their play medians, -9° and -20° (`main` -21° and -7°). The 3x crops show the homes at 0.45 H, 1 cm from the 0.48 H of the tree |
| timpanist | L, R | folds 4 / 1 (8 / 4), paw twist 9 / 21 (23 / 20), paw swing 45 / 35 (46 / 43) | `PASS` | |
| pianist | L | folds p95 19 (20) at rest | `OPEN` | The left shoulder of the rig (section 4) |
| pianist | R | folds p95 15 (13) at rest | `OPEN` | Inside the margin of 2 |

`pnpm clip-probe --base main --jobs 4` (`clip-probe.txt`, homes at 0.45 H): each demo and the
percussion test score pass, with the values of `main`. With the homes at 0.48 H, the four demos
with a timpani part pass (`clip-probe-048.txt`).

## 6. The images

`pairs/` holds the pair sheets, `main` above the branch, from `pnpm close-views <role> <dir>
--views front,back,left,right,35,-35 --zoom <1|2> --elevation <20|40> --base main` and
`pairs.py`, and the 3x crops of `--lineup --crop 3`.

- On `main`, the right mallet lies level across the belly at rest and between strikes, with
  its head in front of the middle of the belly (`timpanist-rest-crop3.webp`, az-35). In the
  branch, each mallet points forward and in from the closed paw to its kettle, with the head a
  little above the head of the drum, from each side.
- At the moment `up`, the right head of the branch stands high over the kettle before the
  strike. On `main`, `up` shows the mallet turning in from the rest direction.
- The pianist paws lie lower against the belly at rest, from the left, the right, and az35
  (`pianist-rest-crop3.webp`). From az35, the left forearm still rises along the chest to a paw
  at the lower belly. The play moments do not change.
- No new seam, clip, or dark line shows from the back. The dark creases of the inner elbows of
  the elephant and the polar bear show on both trees.

The pixel share that changes from the rest cell to each moment (`moment-diff.py`, az-35 and the
front at elevation 20, zoom 2) is 2% to 15% on both trees, because the mallets are thin. The
head heights of section 3 measure the stroke.
