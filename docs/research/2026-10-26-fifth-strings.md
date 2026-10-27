# The fifth review of the strings

Date 2026-10-26. Round `fifth-strings`. Decisions:
[`2026-10-26-fifth-review-strings.md`](../decisions/2026-10-26-fifth-review-strings.md). The probes
and their outputs are in [`2026-10-26-fifth-strings/`](2026-10-26-fifth-strings/). Each command runs
from the root of the tree. The base is `57849ac5`.

## 1. The question

The user named four faults of the rabbit, the red fox, and the cat with the violin and the viola:
the cat arms bend strangely, the bow arms are tense at rest, the left paw clips the instrument at
rest, and the instrument turns against the wrist in the lift and the lowering. The measures that
decide are the turn of the instrument against the turn of the left paw at steps of 0.01 s, the
place and the wrist bend of the bow paw at rest, the depth of the paw in the instrument, and the
arm gate.

## 2. The cause of the turn against the wrist

On the base, the instrument took its own short turn (118° to 143°), and the left paw turned on its
forearm by the other side (193° to 232°). Nearly each fast step turned the two in opposite senses.

| Role | Base: steps >90° of the fast steps | Base: largest angle | Round: steps >90° | Round: largest angle |
|---|---|---|---|---|
| Rabbit | 8,277 of 8,277 | 163° | 0 of 8,488 | 42° |
| Red fox | 8,361 of 8,361 | 179° | 0 of 8,490 | 27° |
| Cat | 6,816 of 7,416 | 161° | 0 of 7,671 | 36° |

`node docs/research/2026-10-26-fifth-strings/carry-probe.ts`, outputs `carry-base.txt` (an earlier
version of the probe, with the same first columns) and `carry-round.txt`.

`twist-offset.ts` gives the cause. The playing grip lies about 155° from a thumb-up neutral in the
frame of the elbow, near the anatomical end of a supination. The bind paw of each mesh is
pronated about 55°, so the studio skin shows the playing grip as a pronation of 126° to 145°. A
rigid carry with the short turn supinates the paw through 180° of the skin. With a pronation, the
instrument in the paw turned the long way, 250° to 290° (`tries.webp`).

## 3. The tries for a rigid carry

| Try | Move | Play skin | Gate |
|---|---|---|---|
| Instrument in the paw, pronation | turns 250° to 290°, upside down | as base | pass |
| Instrument in the paw, supination, no unwind | right | as base | twist bone flips (17,900°/s) |
| Twist zero of the range | right | forearm twist 107° to 113° (80) | FAIL, fox forearm thin |
| Play elbow nearer the middle | right | flat 0.31 to 0.78 (0.77 to 0.86) | FAIL in the play |
| Supination with an unwind near 180° | right | as base | FAIL in the moves only |

A skin that equals the base at the rest and at the play cannot follow a continuous supination:
the steps of the twist along the forearm must change by 360° more than the paw turns, so one step
passes 180° once. The round keeps the last try: the forearm segments unwind in the last 30° before
180° (`skinTwist()`), and the wrist takes the twist for a moment near the jaw.

## 4. The measures of the round

| Measure | Rabbit | Red fox | Cat |
|---|---|---|---|
| Bow paw above the hip, H | 0.73 (0.88) | 0.56 (0.49) | 0.56 (1.04) |
| Bow paw out from the hip, H | 0.33 (0.48) | 0.30 (0.38) | 0.44 (0.38) |
| Bow wrist bend | 1° (1°) | 0° (0°) | 0° (18°) |
| Bow elbow | 128° (128°) | 132° (150°) | 111° (76°) |
| Bow upper arm from the vertical | 19° (30°) | 30° (25°) | 35° (34°) |
| Left upper arm from the vertical | 31° (26°) | 29° (27°) | 48° (48°) |
| Left wrist bend at rest | 27° (1°) | 21° (1°) | 11° (1°) |
| Paws in the instrument at rest, cm | 0.4 (0.6) | 0.5 (0.4) | 0.8 (0.8) |
| Claws in the instrument at rest, cm | 0.4 (0.7) | 0 (0) | 0.3 (1.0) |
| Relative turn of the instrument in the paw, path | 62° (338°) | 84° (330°) | 76° (320°) |
| Relative turn of the instrument in the paw, net | 56° (64°) | 79° (80°) | 73° (82°) |

The values in parentheses are on the base. `rest-probe.ts` gives the arms (`rest-base.txt`,
`rest-round.txt`), and `pnpm hold-fit <role> --sets rest --base 57849ac5` the depths. The
relative turn stays above the goal of 30°: the retarget turns each paw toward its forearm
(`PAW_TURN`), and the forearm crosses the neck at rest and runs along it in the play.

## 5. The arm gate

`pnpm arm-check violinist fox-violinist violist --base 57849ac5`, output `gate.txt`. Each value is
inside its limit. The rest, the play, and each right arm pass. The left arm in the moves fails
against the base margins: the lift flat p5 is 0.72 to 0.76 (0.81 to 0.86), the move turn is up to
2,197°/s (up to 290°/s, limit 3,000), the move twist is 151° (147° and 131°, limit 176), and the
cat lift folds are 6 (3, limit 8). A band of 60° in place of 30° fixed the move twist but put the
lift flat p5 at 0.43 to 0.51. `trace-<role>.txt` gives the paw of one lift at steps of 0.05 s,
with no jump.

With the bow on the strings of the carried instrument, the cat right paw twisted 163° in the moves
and the bow arm went 6.3 cm into the body in a lowering of `brahms-2`. The bow of a move now plays
on the short path of the instrument, as on the base, and the cat bow grip moves 0.45 H out in the
middle of a move, so that the arm passes outside the round belly.

## 6. The clearance

`pnpm pose-depth violinist --base 57849ac5` and `pnpm pose-depth violist --base 57849ac5`, outputs
`depth-violinist.txt` and `depth-violist.txt`. The play does not change. The marks `GROWS`:

| Role | Set | Pair | Base cm | Round cm |
|---|---|---|---:|---:|
| Rabbit | rest, lift | upper arms in body | 0.0 | 0.7 |
| Rabbit | rest, lift | forearms in body | 0.0 | 0.2 |
| Rabbit | lower | paws in violin | 1.5 | 1.9 |
| Rabbit | lower | upper arms in violin | 0.6 | 1.3 |
| Rabbit | lower | instrument in body | 1.7 | 2.0 |
| Red fox | lift | paws in violin | 0.9 | 1.0 |
| Red fox | lift | instrument in body | 1.8 | 2.1 |
| Red fox | lower | upper arms in body | 2.6 | 2.9 |
| Red fox | lower | instrument in body | 1.9 | 2.2 |
| Cat | rest | instrument in body | 0.0 | 0.2 |
| Cat | lower | claws in viola | 1.1 | 1.8 |
| Cat | lower | bow in viola | 0.0 | 0.2 |
| Cat | lower | instrument in body | 1.0 | 2.2 |

Each other pair is equal or less. The red fox upper arm at rest falls from 2.2 cm to 0.6 cm, and
the cat upper arm in a lowering from 3.6 cm to 2.0 cm. The instrument near the jaw goes up to
2.2 cm into the body (limit 2.0), because it hangs from the paw there. Each other wrist via of the
scans went deeper.

## 7. The result

The instrument now turns with the left paw in each move of the three roles, the left paw holds the
neck at rest, and the bow paws rest low with straight wrists. The cost is a short wrist pinch of the
left forearm skin near the jaw in each move. A playing grip near the 90° of supination of a real
violinist, with the left hand under the neck, removes it, and the open items of `TODO.md` name it.

The sheets: `lift-<role>.webp` gives the lift of each role from the front in steps, the base
above the round. `rest-play.webp` gives the 2x crops at rest (front, left, and az-35) and of the
left forearm in the play (frog, left), each pair with the base on the left. `tries.webp` gives two
tries that failed: the violin that turns the long way with a pronation, and the thin fox forearm
with a twist zero. The play strips of `close-views play` freeze the wall clock after the lift, so
`close-views <role> --moments lift20,...,lower90` shows the moves in steps in place of them.
