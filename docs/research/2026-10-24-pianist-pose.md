# The pose of the polar bear pianist

Date 2026-10-24. Round `polar-bear-arms`. Decisions:
[`2026-10-24-pianist-pose.md`](../decisions/2026-10-24-pianist-pose.md). The target is
[`piano-technique.md`](../reference/piano-technique.md). The probes, their outputs, and the
images are in [`2026-10-24-pianist-pose/`](2026-10-24-pianist-pose/). Each command runs from the
root of the tree. "Before" is `1911ff02`.

## 1. The question

After the arm rebuild, the user said: "make sure the pose more professional. you can also adjust
the height of seat and size of the piano if needed". In the round, the user also said: "the polar
bear's paws are not touching the keys". The target is a professional pianist: forearms level with
the keys, elbows at 90° to 110°, an upright trunk with a small lean, low shoulders, a lean toward
the far keys, and the fingertips on the keys. The look from the stage camera decides, with the
probe numbers below.

## 2. The posture

`posture.ts` poses the pianist at each 0.25 s of the 4 demos with a piano and measures the joints
in the model axes. "Far" is the 5% of the play samples with a paw furthest out. The values are
means, for the left and the right paw.

```bash
node docs/research/2026-10-24-pianist-pose/posture.ts 0.25
```

| Measure | Target | Before | After |
|---|---|---|---|
| Spine lean from the bind, in the play | small | 28° | 14° |
| Hips to neck from the vertical | upright | 17.7° | 6.9° |
| Gaze below the level | to the keys and the music | 22° | 9° |
| Head center in front of the floor point | over the hips | 64 cm | 45 cm |
| Elbow joint above the key top | about 0 to 2.5 cm on a human hand | 14.6 cm, 15.3 cm | 7.1 cm, 6.3 cm |
| Forearm slope to the paw | level | -17.5°, -21.1° | -4.9°, -2.6° |
| Paw on the forearm, up | in line | 17.5°, 21.1° | 4.9°, 2.6° |
| Elbow angle | 90° to 110° | 106°, 108° | 104°, 102° |
| Upper arm forward of the vertical | 0° to 20° | 24°, 23° | 29°, 28° |
| Upper arm out from the trunk | near the body | 31°, 36° | 35°, 38° |
| Side lean, far left and far right | toward the far keys | 0°, 0° | 2.6°, -9.9° |
| Outer upper arm out, far keys | | 47.5°, 47.7° | 46.6°, 42.2° |

The paw is thick, so a level forearm puts the elbow joint about 7 cm above the key top.

## 3. The paws on the keys

`key-gap.ts` poses the pianist at each note start of each paw (2,907 left and 1,005 right
strikes) and takes the lowest point of the paw over the keys, above the white or the black key
top under it.

| Item | Before | After |
|---|---|---|
| Strikes with no part of the paw over the keys, left and right | 2,798 and 912 | 0 and 0 |
| Claws past the front edge of the keys, median | -0.7 cm, -0.6 cm | 3.6 cm, 3.6 cm |
| Lowest paw point above the white key top, median | 2.1 cm, 1.2 cm | 0.0 cm, 0.2 cm |
| Gap to the key top under the paw, range | (paw in front of the keys) | -0.02 to 0.18 cm, -0.09 to 0.40 cm |

The palm of the hold stood 0.065 m above the keys and 0.07 m in front of them, so the claws
stopped at the front edge of the keys, about 2 cm above them. The scale of the piano did not
cause it. The palm now stands 0.03 m in front of the keys, 0.044 m above them on the left and
0.0505 m on the right. With 0.04 m in front, the right claws stood up to 9 mm above the keys.
The palm reached 4 cm further, so the keys came 0.12 H nearer (1.16 H) to keep the elbows bent.

## 4. The variants

| Variant | Forearm slope | Elbow angle | Upper arm forward | Note |
|---|---|---|---|---|
| Lean 14°, piano 1.12, keys 1.55 H | -13° | 145° | 45° | the arms reach straight |
| Lean 14°, piano 1.12, keys 1.37 H | -4° | 117° | 28° | elbows down: upper arms 11 cm in the trunk |
| Lean 14°, piano 1.12, keys 1.28 H | -8° | 106° | 27° | |
| Piano 1.16, keys 1.28 H | -1° | 100° | 29° | claws 2 cm above the keys |
| Claws on the keys, keys 1.28 H | -6° | 116° | 37° | |
| Claws on the keys, keys 1.16 H (chosen) | -4° | 103° | 28° | |
| Side lean up to 16° | +12° far right | | | the far right forearm rises to the paw |

The pole sweep (`pnpm pose-depth pianist --set 'piano.poleL=...'`, two demos) gave play depths of
the upper arms of 11.0 cm for (±0.6, -1, 0.4), 9.4 cm for (±0.8, -1, 0.2), 8.8 cm for (±1, -0.8,
0.4), 8.6 cm for (±1, -0.5, 0.5), and 8.0 cm for (±1, -0.3, 0.2). The chosen poles (±1, -0.8,
0.4) keep the elbows lower than the poles of before, with a small cost in depth.

## 5. The clearance and the other players

`pnpm pose-depth pianist` (`depth-before.txt`, `depth-after.txt`):

| Item | Limit | Before | After |
|---|---|---|---|
| Play: forearms in the body | 9 cm | 7.2 cm | 7.9 cm |
| Play: upper arms in the body | 4 cm | 9.7 cm, 11.7% over | 8.2 cm, 4.4% over |
| Play: forearms in the case | 1.5 cm | 0 cm | 1.1 cm |
| Lift: upper arms in the body | 3 cm | 3.3 cm, 41.9% over | 2.8 cm, 0% over |
| Lower: upper arms in the body | 4 cm | 9.9 cm, 19.7% over | 8.3 cm, 17.5% over |
| Note targets within 5 mm | | 100% | 100% |

The forearm in the case is the wrist at the front edge of the keys, now that the claws lie on
them. The twist probe of the arm rebuild (`twist-before.txt`, `twist-after.txt`) gives a mean
total twist of 68.7° and 67.2° (72.0° and 76.1° before). The largest step between two arm bones
stays 18.9°, in the rest.

`pnpm body-probe --base 1911ff02` (`body-probe.txt`): the bodies stay. The pose code alone
changes only the 12 pose sets of the 4 pianists. The larger piano grows the stage of 3 of the 4
demos with a piano by up to 0.26 m, and moves other players by up to 0.39 m, so 67 more pose sets
change through their places. `src/models/layout-scene.test.ts` fails the same 5 tests as before,
and its footprint test passes. The first download grows by 159 B.

## 6. The result

- The trunk sits upright, and the head stays over the hips (`e20-chord.png`, `crops.png`).
  Before, the head hung over the music desk.
- The piano is 1.16 times larger, and the keys stand 1.16 H in front of the floor point. The
  forearms are nearly level, and the elbows bend about 103°. The bench stays: it fits the legs
  of the rig, and a lower bench puts the knees above the hips. The bear keeps its size.
- The claws lie on the key tops at each strike (`paws-low.png`, `paws-e40.png`).
- The shoulders turn down 6°, and the trunk leans up to 10° toward the keys of the two paws
  (`e20-far.png`, `e40-far.png`).
- The rest keeps the paws on the thighs, and the knees stand under the keys (`e20-rest.png`,
  `e40-rest.png`).
- The stage views (`stage.png`, `stage-at.png`) show the bear upright at its piano from the
  default camera, and from az 150 and az -150 at elevation 40.

No view shows a spiral crease, a sharp elbow, or a seam on the arms. The feet stay on the floor.

## 7. The open faults

- From the front (az 0), the larger lid hides the bear and its paws. From az 150 and az -150 at
  elevation 40, the body hides most of the paws.
- At the far keys, the outer upper arm stands 42° to 47° out, as before.
- The upper arms stand about 36° out and 28° forward, more than the 0° to 20° of a human pianist,
  because the round trunk and belly sit in the way.
- No foot moves to the damper pedal.
