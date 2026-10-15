# The bench of the polar bear pianist

Date 2026-10-14. Branch `polar-bench`, base `main` 4ad311ab.

On 2026-10-14 the user said: "polar bear seat too low". On `main`, the bench under the studio
polar bear fits its legs, and its top is 0.118 m high. The keys of the piano are 0.70 m high, and
they set the scale of the bear (`ANIMALS` of `tools/studio-body.ts`). The manager set the target:
the bench height of a real pianist, with the forearms about level with the keys. This report
measures the elbows of the playing pose for eight bench heights. The bench of the rule is 0.18 m.
The brief stopped the round there, because the bench of the rule was below 0.20 m. The manager
then chose a bench of 0.25 m and a fit of the piano hold (section 6).

## 1. The rule of a real pianist

Two piano teaching sources give the rule:

- Rob Young, "Kids Piano Posture Tips", Prodigies
  (<https://prodigies.com/blogs/music-appreciation/kids-piano-posture-tips>): "When you place
  your fingers on the piano keys, your forearm needs to be parallel to your floor." "If your arm
  is sloping downward, you're too high up." "If it's sloping up, you're not high enough."
- "Fundamentals of Piano Practice", chapter 1, section II.3, "Bench Height and Distance from
  Piano" (<https://fundamentals-of-piano-practice.readthedocs.io/chapter1/ch1_procedures/II.3.html>):
  "With your hands on the keys in playing position, the elbows should be slightly below the height
  of the hands, about level with the keys." The same page says: "the standard bench height of
  fixed height benches tend to be one to two inches too high". The fetched page does not name
  the author. The book is known as the book of Chuan C. Chang (not verified on the page).

Both rules hold for a human arm, whose forearm is thin. The forearm of the studio polar bear is
thick: the skin under the elbow is about 14 cm below the elbow joint (section 3). So this report
measures the rule on the joints: the line from the elbow joint to the wrist joint is the forearm.

## 2. The method

```text
                 shoulder joint
                      o
                       \   upper arm
                        \
          wrist joint    o elbow joint ---- elbow above the key top
     palm  o------------'                   (head of the forearm bone)
    ====== keys (top 0.70 m) ======
           slope: the angle of the line from the wrist joint to the elbow joint
           above the level, positive when the elbow is higher than the wrist
```

- `make-variant.ts` writes the module of the polar bear with a `seat` value, as
  `pnpm studio-body polar-bear` does with `seat` in its entry of `ANIMALS`. The body rises until
  its seat is at that height, and the feet hang (`sceneFrame()` of `tools/studio-body.ts`). With
  `none`, the script gives the module of `main` byte for byte.
- `elbow-probe.ts` poses the pianist at each note start of each paw plus 0.02 s, where the palm is
  on its keys: the note targets of the sweep (`PIANIST_SWEEP` of `src/pose/test-sweep-roles.ts`).
  It takes the four demos with a piano: `bach-bwv1047`, `bach-bwv1048`, `bach-bwv1050`, and
  `boulanger-matin`, with 2,526 samples of the left paw and 1,373 of the right paw. It prints the
  elbow joint, the wrist joint, and the shoulder joint above the key top, the slope of the
  forearm, the distance of the palm from its note target, and the head top in the rest pose. In
  each tenth sample, it also prints the lowest point of the arm skin within 0.15 m of the elbow
  joint (the vertices whose largest weight is on the upper arm or the forearm).
- `benches.sh` runs both for each bench and writes `elbow-<bench>.txt`. It restores the module of
  the commit at the end.

## 3. The measures

The median over the samples of both paws (`elbow-<bench>.txt`, line `BOTH`). The medians of the
left and the right paw differ by at most 0.3 cm in the elbow height and 3.2° in the
slope (lines `ALL`).

| Bench (m) | Elbow joint above the key top (cm) | Forearm slope (°) | Elbow skin bottom above the key top (cm) | Shoulder joint above the key top (cm) | Notes with the palm more than 1 mm off | Head top at rest (m) |
|---|---:|---:|---:|---:|---:|---:|
| 0.118 (`main`) | 2.2 | -10.9 | -11.7 | 27.3 | 0.0% | 1.609 |
| 0.15 | 4.3 | -5.6 | -9.8 | 30.5 | 0.0% | 1.641 |
| 0.18 | 6.4 | -0.1 | -7.7 | 33.5 | 0.1% (max 0.4 cm) | 1.671 |
| 0.20 | 8.0 | 3.8 | -6.2 | 35.5 | 1.3% (max 1.3 cm) | 1.691 |
| 0.25 | 12.3 | 14.7 | -1.9 | 40.5 | 7.1% (max 3.9 cm) | 1.741 |
| 0.32 | 19.0 | 30.6 | 5.2 | 47.5 | 58.0% (max 8.1 cm) | 1.811 |
| 0.40 | 25.4 | 36.8 | 12.0 | 55.5 | 100.0% (max 13.6 cm) | 1.891 |
| 0.45 | 29.6 | 39.3 | 16.4 | 60.5 | 100.0% (max 17.3 cm) | 1.941 |

The wrist joint stays 6.5 cm above the key top while the palm reaches its keys: the palm is
0.065 m above the keys (`HANDS_HOLDS.piano.palmL` of `src/pose/hands.ts`). From 0.32 m, the
arms do not reach down to the keys, and the median wrist joint is 6.8 cm to 15.0 cm above the
key top.

## 4. The bench of the rule

- The forearm is parallel to the floor at 0.18 m: the median slope is -0.2° for the left paw and
  -0.1° for the right paw. On `main`, the forearm slopes up by 10.9° to the paw. By the rule of
  Young, the bear sits "not high enough", as the user said.
- The rule of the second source holds from 0.118 m to 0.18 m: the elbow joint is below the wrist
  joint or level with it, and 2.2 cm to 6.4 cm above the key top. At 0.20 m, the elbow is higher
  than the wrist.
- The skin under the elbow is at the key top at about 0.27 m, on a line between -1.9 cm at
  0.25 m and 5.2 cm at 0.32 m. On the same line, the forearm slopes down by about 19° at that
  bench. The rule of Young calls a downward slope "too high".
- The arms of the studio bear reach 0.625 m from the shoulder joint to the middle of the palm
  (`studio-inspect.txt`). With the holds of `main`, the palms start to miss their keys at
  0.18 m: 0.1% of the notes by up to 0.4 cm, and 1.3% at 0.20 m. The sweep accepts 0.1 mm
  (`targetError` of `PIANIST_SWEEP`). A higher bench thus needs a hold change too, such as a
  larger lean or keys nearer to the body.

So the bench of the rule is 0.18 m. It is 6.2 cm higher than the bench of `main`, and below the
range of the brief (0.20 m to 0.45 m).

`pnpm hold-fit pianist --base main` with the module of each bench in the working tree, on the
demos of `FIT_DEMOS` with a piano (`hold-fit-0.18-base-main.txt`, `hold-fit-0.25-base-main.txt`):

| Measure | `main` (0.118 m) | 0.18 m | 0.25 m |
|---|---|---|---|
| Play samples with a fold | 17.3% | 21.5% | 32.1% |
| Lift samples with a fold | 0.0% | 0.0% | 0.0% |
| Play: forearms in the body (limit 9.0 cm) | 7.8 cm | 7.6 cm | 8.7 cm |
| Play: upper arms in the body (limit 4.0 cm) | 2.9 cm | 3.7 cm | 3.8 cm |
| Rest and lift: forearms in the body (limit 3.0 cm) | 2.7 cm | 2.7 cm | 2.7 cm |
| Lower: forearms in the body (limit 9.0 cm) | 8.1 cm | 7.9 cm | 9.2 cm, over |
| Lower: upper arms in the body (limit 4.0 cm) | 2.7 cm | 3.6 cm | 3.8 cm |

## 5. The images

`pnpm close-views pianist <dir>` with the module of each bench in the working tree. The camera
turns around the box of the body, so each cell frames the bear at the same size.

- `benches-above.webp`: the left view and the low view from the left at a chord, and the left view
  in the rest pose, for the benches 0.118 m, 0.18 m, 0.25 m, 0.32 m, and 0.40 m.
- `benches-level.webp`: a level view from the left (azimuth -90°, elevation 2°) at a chord,
  between two chords, and in the rest pose, for the benches 0.118 m, 0.18 m, 0.25 m, and 0.32 m. A
  temporary edit of the view `keys` of `ROLE_VIEWS` in `tools/close-views.ts` gave this camera.
  The edit is not in the commit.

`strip.py` puts the cells side by side:
`uv run --no-project --with pillow python -I strip.py <root> <out> <views> <benches> <labels>`.

In the level view, the forearm of `main` rises to the paw, the forearm at 0.18 m is level, and the
forearms at 0.25 m and 0.32 m slope down to the keys.

## 6. The fit of the bench of 0.25 m

The manager: "the user asked for a higher seat, and 0.18 m (+6 cm) is too small to see. Use the
bench of 0.25 m (about twice main), and fit the piano hold to it." The goals, in this order: the
palms on their keys (less than 1% of the notes more than 1 mm off), the depths within the accepted
limits, and the play folds at most 25%.

### 6.1 The lean

At 0.25 m with the hold of `main`, each note that misses is near the middle of the keyboard
(`reach-leans.txt`, the lines `x0.0`). There, the keys are 0.25 m to 0.29 m from the shoulder of
the paw to the middle, and the wrist target is 0.563 m from the shoulder joint, the reach of the arm
(`limitReach()` of `src/pose/ik.ts`). A larger lean moves the shoulders forward and down
(`node docs/research/2026-10-14-polar-bench/reach-probe.ts <changes>...`, `reach-leans.txt`):

| Lean | Notes more than 1 mm off | Largest miss | Elbow joint above the key top | Forearm slope |
|---|---:|---:|---:|---:|
| 20° (`main`) | 7.08% | 3.9 cm | 13.7 cm | 18.5° |
| 24° | 1.38% | 1.3 cm | 11.2 cm | 11.9° |
| 25° | 0.33% | 0.6 cm | 10.6 cm | 10.3° |
| 26° | 0.00% | 0.0 cm | 10.0 cm | 8.8° |
| 28° | 0.00% | 0.0 cm | 8.8 cm | 5.7° |

The head comes near the case of the piano with the lean (`pnpm pose-depth pianist --gaps --demo
boulanger-matin --set ...`, `pose-depth-gaps-lean.txt`, and `pose-depth-gaps-base-main.txt`). The
smallest gap of the head to the case in a play is 10.6 cm on `main`
(`pose-depth-gaps-main.txt`). At 0.25 m, it is 6.7 cm with 20°, 3.9 cm with 24°, 2.2 cm with
26°, and 0.2 cm with 28°. The paused test of the pianist clearance asks for 1 cm. So the lean is
26°.

### 6.2 The elbows and the arc of the paws

`pnpm hold-fit pianist --demo all --set ...` over the four demos with a piano:

| Hold | Play folds | Play: deepest point (limit) | Lower: deepest point (limit) | Log |
|---|---:|---|---|---|
| `main`, bench 0.118 m | 16.1% | forearms 8.0 cm (9.0) | forearms 8.1 cm (9.0) | `hold-fit-all-base-main.txt` |
| bench 0.25 m, hold of `main` | 61.0% | upper arms 3.9 cm (4.0) | forearms 9.2 cm (9.0), over | `hold-fit-all-lean-28-base-main.txt` |
| lean 28°, arc 0.1 H forward | 30.2% | upper arms 3.5 cm (4.0) | upper arms 3.5 cm (4.0) | `hold-fit-all-lean-28-base-main.txt` |
| lean 28°, poles (±1, -0.5, 0.3) | 16.5% | forearms 8.2 cm (9.0) | forearms 8.1 cm (9.0) | `hold-fit-pole-lean-28-b.txt` |
| lean 26°, poles of `main` | 30.3% | upper arms 3.2 cm (4.0) | forearms 8.2 cm (9.0) | `hold-fit-pole-lean-26.txt` (base row) |
| lean 26°, poles (±1, -0.4, 0.3) | 27.2% | forearms 8.1 cm (9.0) | forearms 8.2 cm (9.0) | `hold-fit-pole-lean-26.txt` |
| lean 26°, poles (±1, -0.5, 0.2) | 29.3% | forearms 8.0 cm (9.0) | forearms 8.3 cm (9.0) | `hold-fit-pole-lean-26.txt` |
| lean 26°, poles (±1, -0.4, 0.2) | 23.6% | forearms 8.3 cm (9.0) | forearms 8.3 cm (9.0) | `hold-fit-pole-lean-26.txt` |
| lean 26°, poles (±1, -0.3, 0.3) | 21.9% | forearms 8.4 cm (9.0) | forearms 8.3 cm (9.0) | `hold-fit-pole-lean-26.txt` |

The rows with a lean have the arc 0.1 H forward. A deepest point is the pair with the largest depth
less its limit.

Of the poles tried with the lean of 26°, (±1, -0.4, 0.2) are the poles nearest to the poles of
`main` that keep the play folds below 25%. The poles (±1, -0.3, 0.3) fold less, with the elbows
further out.

With no move forward in the arc of the paws (`restArc`), the claws of the left paw went 1.6 cm
(lean 26°) and 1.9 cm (lean 28°) into the belly when the paws lowered after the song end of
`boulanger-matin` (`hold-fit-lean.txt`). With 0.1 H or 0.2 H forward, the lowering stays within
its limits, and an arc of 0.55 H up put the claws 5.3 cm into the belly (`hold-fit-arc.txt`).

### 6.3 The result

The hold of the branch: the lean 26°, the poles (±1, -0.4, 0.2), and the arc (0, 0.4, 0.1) H.
`elbow-branch.txt`, `hold-fit-all-base-main.txt`, `pose-depth-gaps-base-main.txt`,
`fold-probe.txt`, and `fold-probe-main.txt`:

| Measure | `main` | Branch |
|---|---|---|
| Bench | 0.118 m | 0.25 m |
| Elbow joint above the key top | 2.2 cm | 10.0 cm |
| Forearm slope | -10.9° (up to the paw) | 8.8° (down to the paw) |
| Elbow skin bottom above the key top | -11.7 cm | -4.3 cm |
| Head top at rest | 1.609 m | 1.741 m |
| Notes with the palm more than 1 mm off | 0% | 0% |
| Play: forearms and upper arms in the body | 8.0 cm and 2.9 cm | 8.3 cm and 2.5 cm |
| Lower: forearms and upper arms in the body | 8.1 cm and 2.7 cm | 8.3 cm and 2.5 cm |
| Rest and lift: forearms in the body | 2.8 cm | 2.8 cm |
| Smallest gap of the head to the case in a play | 10.6 cm | 2.2 cm |
| Play folds (`pnpm fold-probe pianist`, step 0.25 s) | 17.0% | 23.5% |
| Lift folds | 15.3% | 15.3% |
| Folded faces by main bone, all samples | head 1455, neck 1436, clavicle R 518, upper arm R 182, upper arm L 168 | head 1455, neck 1435, clavicle R 499, upper arm R 431, clavicle L 303, upper arm L 268 |

`pnpm body-probe --base main` (`body-probe-base-main.txt`): only the bodies of the polar bear, its
player, and its 16 pose sets differ. `pnpm size --base main` (`size.txt`): +19 B after gzip.

`main-branch.webp` shows the close views of `pnpm close-views pianist <dir> --base main`: from the
left and low from the left at a chord, from the right at rest, and the level view from the left of
section 5 at a chord and at rest. The row of `main` is at the top.
