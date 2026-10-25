# The angle of the violin and the viola

Date 2026-10-25. Round `string-angle`. Decisions:
[`2026-10-25-string-angle.md`](../decisions/2026-10-25-string-angle.md). The probes and their
outputs are in [`2026-10-25-string-angle/`](2026-10-25-string-angle/). Each command runs from the
root of the tree. "main" is `7d27a881`.

## 1. The question

A real player holds the violin and the viola about 45° to the left of the front
(`docs/reference/string-technique.md`, [78]). The rabbit and the red fox held the violin at 60°,
and the cat the viola at 70°, because a turn to the front took the nut out of the reach of the
short left arms. The goal: an angle near 45°, the left paw from the nut to the high positions, and
no arm in the body or the instrument (limits 1.5 cm, the instrument in the chest 2.0 cm).

## 2. The probes

| Probe | It measures |
|---|---|
| `angle-probe.ts` | the angle of the middle line of the body (the +x axis of the violin model), of the strings, and of the end line of the chin probe of 2026-10-24, the slope, the head on the chin rest, the instrument in the chest, the reach (`stopRange`), the turn of the left upper arm, and the forward move of the left shoulder joint |
| `reach-grid.ts` | the reach of the nut over a grid of turns, shoulder turns, and moves, with no sweep (1 s) |
| `species-depth.ts` | the depth of each arm bone for one species of a role, with variants (`pnpm pose-depth --per-bone` sweeps the rabbit and the red fox together) |
| `sizes.ts`, `layout-move.ts` | the body length of each instrument, and the move of the seats by the smaller viola |
| `variants/` | the scans of the session: each script and its output, run on the tree of its step, with the holds of `cand.sh` of that step |

The old chin probe measured the line between the two farthest vertices of the instrument. That
line reads 4° to 7° more than the middle line: 64° and 74° on `main`, 54°, 49°, and 49° now
(`chin-tree.txt`). This report gives the middle line.

```text
            front (-z)
               ^
     45°   .   |
  scroll  .    |          the turn moves the scroll to the front;
       \ .     |          the nut goes away from the left shoulder,
  nut   \      |          so the shoulder comes forward (reachL)
         \_____|____
     tail end  |  chest
   (on the collarbone)
```

## 3. The tries

| Try | Result |
|---|---|
| Rabbit and red fox: turn only, to 45° | rabbit nut from 0.27, red fox from 0.00 (`reach-grid.txt`) |
| Rabbit at 45°: shoulder 15.5°, violin 0.04 H back | nut from 0.06, violin 2.6 cm into the chest |
| Rabbit at 45°: violin 0.03 H higher, head 17° down | chest 1.8 cm, but the bow paw at the frog 1.9 cm into the jaw |
| Rabbit at 45°: frog hair, pluck, elbows, moves to the left | right forearm 1.9 cm to 2.3 cm into the body at best |
| Rabbit at 50°, frog hair 0.11 m, pluck at the end of the fingerboard | right forearm 1.2 cm, nut from 0.01 |
| Cat at 45°: shoulder turns of 0° to 40° with the viola of the app | nut from 0.31 to 0.12 |
| Cat: violas of 0.94, 0.9, 0.87 at 45° | the shoulder turn for the nut: 30°, 15° to 20°, 15° |
| Cat at 45° with no move | viola 3.5 cm into the chest; 0.06 H up, 0.03 H forward: 1.6 cm |
| Cat bow slant -20°, -11°, 0° | right paw swing 76°, 65°, 55° |
| Elbows under the instrument (`variants/pole1-*`, `variants/pole2-*`) | each step in turned the paw more on the forearm: rabbit 157°, 174°, 180° |
| Red fox middle turn of the rabbit | move twist 180° to 147°; the violin 5.6 cm into the body until it moves 0.1 H up and 0.2 H forward |

The real shoulder moves forward by 0.5 cm to about 3 cm [80], so the shoulder turns stay at or
below 2.9 cm. Real violists choose the viola by the arm length [81, 82]: the cat viola of 304 mm
is a 1/2 viola, the size of the red fox violin (`sizes.txt`). The viola of the app has a body of
350 mm, near 14 inches, already below the 380 mm of a full viola.

## 4. The measures

`angle-main.txt` and `angle-tree.txt`, main in brackets:

| Species | Angle | Nut reached from | Shoulder forward | Upper arm to the side | Head in the instrument | Instrument in the chest |
|---|---|---|---|---|---|---|
| rabbit | 50° (60°) | 0.01 (0.08) | 2.9 cm (0) | 46° (57°) | 0.8 cm (0.0) | 1.8 cm (1.7) |
| red fox | 45° (60°) | 0.00 (0.00) | 1.1 cm (0) | 29° (30°) | 0.6 cm (0.1) | 1.8 cm (1.8) |
| cat | 45° (70°) | 0.00 (0.03) | 1.9 cm (0) | 38° (43°) | 0.2 cm (0.1) | 1.6 cm (2.6) |

`pnpm pose-depth <role> --base main` (`pose-depth-violinist.txt`, `pose-depth-violist.txt`), the
pairs of the faults, in cm:

| Pair | rabbit | red fox | cat |
|---|---|---|---|
| Instrument in the chest, play | 1.8 (1.7) | 1.9 (1.8) | 1.6 (2.6) |
| Forearms in the body, play and moves | 1.4 (0.8) | 1.4 (1.7) | 0.0 (0.0) |
| Upper arms in the body, play | 1.5 (0.0) | 1.2 (2.3) | 1.2 (1.3) |
| Upper arms in the body, moves | 1.6 (1.6) | 2.5 (2.9) | 2.2 (1.5) |
| Forearms in the instrument, play | 2.1 (2.1) | 2.5 (2.5) | 1.5 (2.5) |
| Arms in the instrument, moves | 2.1 (2.1) | 2.5 (2.4) | 2.5 (2.9) |
| Claws in the instrument, play | 1.6 (1.6) | - | 2.2 (1.5) |

The bow in the rabbit arms in the lowering stays 2.5 cm (`shares-rabbit-lower-*.txt`): no via of
the rest bow changed it.

`pnpm arm-check --all --base main` (`gate.txt`): only the three string roles change, and each
value is in its limit. The red fox left paw twist of the moves falls from 180° (OPEN) to 147°,
and its move turn from 17,985°/s to 824°/s. The FAIL rows are margins against main: red fox right
move twist 145° (124°) and move turn 1,216°/s (184°/s), cat left folds 7 (4) in the lift, and cat
right move twist 144° (128°). The red fox violin paw keeps its grip (grip turn 3°, 11° on main,
`grip-*.txt`), and the cat bow paw turns 18° from its grip (13°).

The largest twist step between two arm bones (`twist-*.txt`, the probe of
`2026-10-24-violin-arms/`): rabbit 42.2° (42.1°), red fox 37.4° (44.5°), cat 38.7° (40.8°) on the
left forearm, and 36.0° (31.6°) on the cat right forearm.

`pnpm body-probe --base main` (`body-probe.txt`): each body is equal, and only the cat player
changes, by its viola. The smaller viola moves the seats of the layout by up to 9.5 cm
(`layout-move.txt`), so the poses of the other players change too (`body-probe-cat-commit.txt`
compares the cat commit alone).

## 5. The images

`<role>-2x.webp` and `<role>-1.2x.webp` (`pnpm close-views <role> <dir> --moments
frog,tip,crossing,rest,stand --views front,left,right,back,35,-35 --zoom <z> --base main`): each
moment from the front, the left, the right, the back, and ±35°, main above the tree.
`<role>-top.webp`: the frog and the tip from above (`--elevation 75`), where the turn to the front
shows best. The 2x cells show the paws: the red fox paw closes on the neck as on main, and the cat
bow paw holds the stick through the middle of the paw.

## 6. The result

The red fox and the cat hold the instrument at 45°, and the rabbit at 50°. The rabbit stops at
50°, because at 45° its bow arm went into the body and the jaw at the frog. The cat needs the 1/2
viola: no shoulder turn inside the real range brings the nut of the viola of the app to its paw at
45°. The elbows stay more to the side than a real player, because the paw twist on the forearm
limits them.
