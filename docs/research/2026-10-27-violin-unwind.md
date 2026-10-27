# The unwind of the left forearm in the violin carry

Date 2026-10-27. Round `fifth-strings3`. Decisions:
[`2026-10-27-violin-unwind.md`](../decisions/2026-10-27-violin-unwind.md). The probes and their
outputs are in [`2026-10-27-violin-unwind/`](2026-10-27-violin-unwind/). Each command runs from the
root of the tree. The base is `main` (`13d9ecea`).

## 1. The question

The rabbit, the red fox, and the cat carry the violin or the viola rigidly in the left paw. In each
lift and lowering, the paw twist on the forearm passes 180° from the bind of the mesh paw, and the
forearm skin unwinds in the band of `TWIST_FADE_BAND`: the forearm twist dips from about 58° to 6°
and back in about 0.1 s. Near the jaw, the carried instrument goes up to 2.1 cm into the body
(limit 2.0). The measures that decide are the wraps of the paw twist (`path-probe.ts`), the arm
gate (`pnpm arm-check`), the carry (`pnpm carry-check`), and the depths (`pnpm pose-depth`).

## 2. Why the pass stays

`path-probe.ts` follows the studio twist of the left paw (from the bind of the mesh) in one lift
at steps of 0.01 s. The rest twist is -91° to -94°, and the play twist is 126° to 145°. The paw
supinates 124° to 140° on the short turn of the instrument, so its path goes from -91° through
-180° to the play.

The rest and the play fix both ends of the path. Each continuous change of the rest (a turn of
the instrument, of the grip, or of the elbow) moves the rest twist and the change of the twist by
equal and opposite amounts, so the end of the path stays at the play twist minus 360°. A path
with no pass needs a rest twist between the play twist and 180°, as twisted as the play. Some
joint of the arm must pass a relative twist of 180° in each move, so the unwind of the skin can
move in time but cannot go away.

## 3. The tries

| Idea | Change | Wraps | Cost |
|---|---|---|---|
| Rest roll (`roll-scan.txt`) | rest instrument turned 30° to 120° around the top normal | 0 only at 60° to 75° (cat) and 90° (rabbit, red fox) | rest twist 142° to 172°, rest wrist bend 86° to 104°, the scroll to the left |
| Elbow path in the middle (`mid-pole-scan.txt`) | 5 poles of `liftPoleL` | 1 in each | the instrument turns 156° to 346° on a direct turn of 117° to 141° |
| Play elbow toward the middle (`play-scan.txt`) | 18 poles and tilts | 0, play twist -89° to -175° | see the gate below |

The rest roll needs the instrument nearly level with the scroll to the left, as the banjo hold of
[83] of `string-technique.md`, a rare hold to play. The image of the user shows an upright rest
with the top plate to the front. At the lap place of `main`, the rolled violin lies under the lap
and the paw does not reach it (`try-rest-roll.webp`).

A swing of the elbow in the middle of the move turns the frame of the arm, and the paw keeps its
twist in that frame (`mixTwist()`), so the paw and the instrument turn with the arm.

The play elbow toward the middle moves the play twist to the side of a supination, as the 90° of a
real violinist. Then no move passes 180°, and the move turn falls from 1,410 to 2,067°/s to 148 to
286°/s. The gate of the play fails, `pnpm arm-check violinist fox-violinist violist --base main`
with six variants of `--set` (`play-gate-main.txt`):

| Variant | Rabbit | Red fox | Cat |
|---|---|---|---|
| A: pole (1, -0.5, -1), tilt 0 / 0 / 15° | folds 10 (7), swing 54° (30°) | forearm twist 92° (67°), flat 0.68 (0.82) | flat 0.36 (0.72) |
| B: pole (1, 0, -1) | forearm twist 88° (80°), folds 11 | forearm twist 102°, folds 10 | flat 0.26 |
| F: pole (1, -0.5, -1), tilt 15° / 15° / 30° | forearm twist 85°, folds 11 | forearm twist 99°, flat 0.67 | flat 0.34 |

The values in parentheses are `main`. The other variants fail in the same way. The flat ring of the
cat is the shoulder ring, at 0.30 of its bind (`play-flat-cat.txt`): the elbow comes up to the
height of the shoulder. Lower elbows put the play twist at -150° to -175°, where the rabbit forearm
twists 85° to 91° (`play-gate-rabbit.txt`, `play-gate-cat.txt` against `57849ac5`). From the back,
the cat paw of variant A stands open beside the neck (`try-play-cat.webp`).

## 4. The depth near the jaw

The wrist via (`BowedHold.liftReach`) moves the paw and the instrument together, so it changes no
twist. `pnpm pose-depth violinist --demo mozart-k525 --demo boulanger-matin --demo beethoven-9` with
five vias of the red fox (`via-fox.txt`):

| Red fox via, H | Lift: instrument in body | Lower: instrument in body | Lower: forearms in violin |
|---|---:|---:|---:|
| (0, 0, -0.1), `main` | 2.1 | 2.0 | 2.3 |
| (0, 0, -0.2) | 1.9 | 1.9 | 2.0 |
| (-0.1, 0, -0.15), kept | 1.9 | 1.9 | 2.0 |
| (-0.15, 0, -0.1) | 1.9 | 1.9 | 2.0 |
| (0, -0.1, -0.15) | 2.0 | 2.0 | 2.3 |

The cat via trades the viola near the jaw against the right claws and the bow in the viola,
`pnpm pose-depth violist` on four demos with `--every 40 --json` (`via-cat.txt`, `via-cat.py`, in
cm; the first row of each file is the tree at (-0.1, 0.3, -0.2)):

| Cat via, H | Lower: instrument in body | Lower: right claws in viola | Lower: bow in viola |
|---|---:|---:|---:|
| (0, 0.25, -0.2), `main` | 2.09 | 1.38 | 0.24 |
| (-0.1, 0.3, -0.2) | 1.92 | 1.52 | 0.22 |
| (-0.12, 0.28, -0.195) | 1.95 | 1.41 | 0.28 |
| (-0.12, 0.27, -0.19) | 1.99 | 1.30 | 0.58 |
| (-0.14, 0.29, -0.19), kept | 1.95 | 1.36 | 0.19 |

With (-0.1, 0.3, -0.2), the full sweep marked the right claws `GROWS` (1.4 cm to 1.5 cm).

## 5. The measures

| Measure | Rabbit | Red fox | Cat |
|---|---|---|---|
| Steps >90° of the fast steps | 0 of 8,528 (0) | 0 of 8,428 (0) | 0 of 7,611 (0) |
| Turn in the paw: path, net | 26°, 22° (26°, 22°) | 31°, 27° (30°, 27°) | 30°, 25° (30°, 25°) |
| Left arm, gate against `main` | PASS | PASS | PASS |
| Left flat p5 (`57849ac5`) | 0.73 (0.86) FAIL | 0.82 (0.81) | 0.72 (0.77) FAIL |
| Left move turn max (`57849ac5`) | 1,410°/s (273) FAIL | 1,487°/s (271) FAIL | 2,067°/s (290) FAIL |
| Left move twist max (`57849ac5`) | 162° (162°) | 153° (147°) FAIL | 153° (131°) FAIL |
| Instrument in body near the jaw, cm | 1.7 (1.7) | 1.9 (2.1) | 1.9 (2.1) |
| Forearm twist at the pass (trace) | 9° | 7° | 5° |

The values in parentheses are `main`, or `57849ac5` where the row names it. `pnpm carry-check
violinist,fox-violinist,violist --base main` (`carry.txt`), `pnpm arm-check violinist
fox-violinist violist --base main` and `--base 57849ac5` (`gate-main.txt`, `gate-57849ac5.txt`),
`pnpm pose-depth violinist --base main` and `pnpm pose-depth violist --base main`
(`depth-violinist.txt`, `depth-violist.txt`: no pair `GROWS`), and `pnpm arm-check <role> --trace
mozart-k525:lift0-1.2` (`trace-<role>.txt`). Against `main`, each value of the gate is equal,
except the cat left folds p95 (3, `main` 4). The values of the moves against `57849ac5` are the
values of `main`, because the via changes no twist. The right arms pass against both bases.

## 6. The result

The forearm skin still unwinds near 180° in each move, as on `main`: with an upright rest, the
top plate to the front, and the play twist that the skin takes well, the pass is a fact of the
path. A new bind of the mesh paw, supinated about 60° in Blender, puts the rest twist near -31°
and the play twist near -155°, on one side of 180°. It is the route that stays, and no probe of
this round measures its play skin. The red fox and the cat now
carry the instrument at most 1.9 cm into the body near the jaw (2.1 cm), with no deeper pair.

The sheets, each with `main` above the round: `lift-<role>-<view>.webp` and
`lower-<role>-<view>.webp` (steps of 10% from the front, the left, az-35, and az150),
`fine-lift-<role>-<view>.webp` and `fine-lower-<role>-<view>.webp` (steps of 2% from the left and
az-35, for the red fox and the cat: the rabbit has no change), `rest-above-<role>.webp` (the rest from 40° above in 7 views), and `play-<role>.webp`
(`frog` and `tip` from the front, the back, the left, and the right). The rest and the play are
the images of `main` within render noise (a mean pixel change of 0.3 to 1.6 of 255, as on the
rabbit, which has no change). `try-rest-roll.webp`, `try-mid-pole.webp`, and `try-play-cat.webp`
give the tries of section 3.
