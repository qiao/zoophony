# The carry of the violin and the viola

Date 2026-10-27. Round `fifth-strings2`. Decisions:
[`2026-10-27-violin-carry.md`](../decisions/2026-10-27-violin-carry.md). The probes and their
outputs are in [`2026-10-27-violin-carry/`](2026-10-27-violin-carry/). Each command runs from the
root of the tree. The base is `main` (`8a58282b`, and `7d54f482` for the runs after its merge,
with the same pose code).

## 1. The question

The round `fifth-strings` let the rabbit, the red fox, and the cat carry the instrument rigidly in
the left paw. Two faults stayed: the grip in the paw changed by 56° to 79° in a move (goal 30° or
less), and the forearm skin unwound fast near 180° of twist. The measures that decide are the net
turn of the instrument in the paw (`pnpm carry-check`), the left arm of the gate (`pnpm
arm-check`), the depths (`pnpm pose-depth`, `pnpm hold-fit`), and the sheets.

## 2. The cause of the turn in the paw

`carry-geo.ts` gives the arm in the axes of the neck (ax: to the scroll, top: the normal of the
top plate). The paw keeps the palm of the playing grip at rest. The forearm runs along the top
normal at rest (ax -0.04 to -0.28) and toward the scroll in the play (ax 0.57 to 0.73). The
retarget turns the paw in the plane of its palm toward the forearm (`PAW_TURN`): -19° to 25° at
rest, 34° to 55° in the play. The turn around the top normal of the old rest grip (`restTurnL`, 30°
to 45°) added to it.

The forearm cannot follow the neck at rest. The rabbit wrist is 0.51 H below the shoulder and the
upper arm is 0.57 H, so the forearm rises at most about 6° to the scroll. A grip near the nut
(`restPlace` 0.1) raised it to ax 0.3, but the user rejected a paw over the scroll. A forward lean
of the violin moved the paw with the neck (ax -0.10 at 31°).

## 3. Why the forearm skin still passes 180°

The elbow-plane twist of the hand of the player goes from about 0° at rest (a thumb-up hold of the
neck) to -153° to -170° in the play. The bind paw of each mesh is pronated about 55°, so the skin
holds the play as a pronation of 126° to 145°: 215° to 234° of supination from the bind. A rigid
carry with the short turn of the instrument supinates the paw, and 12 rest elbows of
`pole-scan.sh` give rest twists of -177° to 28° (`pole-scan.txt`): each path passes 180°. A
pronation path turned the instrument the long way in the round `fifth-strings`. The twist bone and
the segments can switch from one side of 180° to the other only while the wrist holds the rest of
the twist, so a short pinch of the wrist stays. A playing grip near the 90° of supination of a real
violinist, or a supinated bind of the paw, removes it.

## 4. The tries

| Try | Grip net, rabbit / fox / cat | Cost |
|---|---|---|
| `main` | 56° / 79° / 73° | none |
| No `restTurnL` | 39° / 66° / 68° (k525) | none alone |
| Rest turn of the play paw (first position, 59° / 64° / 70°) around the strings | 24° / 17° / 17° (k525) | rest wrist bend 83° / 109° / 105° |
| Half of it, around the middle of the neck, a linear mix in the move | 18° / 21° / 24° | rest wrist bend 44° / 62° / 58° |
| 30° around the wrist, a linear mix in the move | 19° / 23° / 29° | cat viola 2.7 cm in the body, claws 2.5 cm in the viola |
| Retarget turn plus the rest difference times `1 - weight` | 18° / 18° / 29° | cat claws 2.4 cm in a lowering (1.8) |
| Times `(1 - weight)²` (kept) | 22° / 27° / 25° | see section 5 |
| Rest turn around the top normal 45° kept on the cat | 64° | none |

`node docs/research/2026-10-27-violin-carry/carry-geo.ts --brief --set <changes>` and `pnpm
carry-check violinist,fox-violinist,violist --set <changes>`. With a pivot of the rest turn at the
strings or at the middle of the neck, the wrist moved and bent 44° to 68° at rest. The kept pivot is
the wrist.

The band of the unwind, `pnpm arm-check violinist fox-violinist violist --base main`, with the rest
turns of the scan (rabbit 25°, red fox 35°, cat 40° and 10° around the top normal):

| Band | Flat p5 rabbit / cat (0.76 / 0.75) | Move twist fox / cat (151 / 151) | Move turn max |
|---|---|---|---|
| 30° | 0.64 / 0.65 | 151 / 151 | 1,866 |
| 28° | 0.68 / 0.69 | 153 / 152 | 2,007 |
| 27° (kept) | 0.70 / 0.71 | 153 / 153 | 2,082 |
| 26° | 0.72 / 0.73 | 154 / 154 | 2,161 |
| 24° | 0.77 / 0.74 | 156 / 156 | 2,327 |

At 27°, a rest turn around the top normal of -5° on the rabbit and 10° on the cat brings the flat
p5 to 0.73 and 0.72.

## 5. The measures

`pnpm carry-check violinist,fox-violinist,violist --base main`, output `carry.txt`. The value of
`main` is in parentheses:

| Role | Steps >90° | Largest angle | Turn in the paw: path | Turn in the paw: net |
|---|---|---|---|---|
| Rabbit | 0 of 8,528 (0 of 8,488) | 26° (42°) | 26° (62°) | 22° (56°) |
| Red fox | 0 of 8,410 (0 of 8,490) | 18° (27°) | 30° (84°) | 27° (79°) |
| Cat | 0 of 7,592 (0 of 7,671) | 17° (36°) | 30° (76°) | 25° (73°) |

The left arm of `pnpm arm-check violinist fox-violinist violist --base main` and `--base
57849ac5`, outputs `gate-main.txt` and `gate-57849ac5.txt`. Each value passes against `main`.
Against `57849ac5`, the values of the moves fail by their margins, within each limit:

| Role | Flat p5 | Move twist max | Move turn max | Paw twist p95 |
|---|---|---|---|---|
| Rabbit | 0.73 (0.76, 0.86) | 162° (162°, 162°) | 1,410°/s (1,579, 273) | 165° (163°, 159°) |
| Red fox | 0.82 (0.72, 0.81) | 153° (151°, 147°) | 1,487°/s (1,660, 271) | 161° (164°, 147°) |
| Cat | 0.72 (0.75, 0.77) | 153° (151°, 131°) | 2,067°/s (2,197, 290) | 164° (158°, 129°) |

The values in parentheses are `main` and `57849ac5`. `trace-<role>.txt` gives the paw of one lift
of `mozart-k525` at steps of 0.01 s: the forearm twist dips from about 58° to 6° to 9° and back in
about 0.1 s at the pass of 180°, as on `main` (62°, 54°, 6°, 60° at steps of 0.05 s).

`pnpm pose-depth violinist --base main` and `pnpm pose-depth violist --base main`, outputs
`depth-violinist.txt` and `depth-violist.txt`: no pair grows. These pairs fall, in cm:

| Body | Set | Pair | `main` | Round |
|---|---|---|---:|---:|
| Rabbit | rest | paws in violin | 0.4 | 0.2 |
| Rabbit | rest | claws in violin | 0.4 | 0.3 |
| Rabbit | lift | paws in violin | 1.0 | 0.7 |
| Rabbit | lower | upper arms in violin | 1.3 | 0.6 |
| Rabbit | lower | instrument in body | 2.0 | 1.7 |
| Red fox | lower | paws in violin | 1.2 | 0.9 |
| Red fox | lower | instrument in body | 2.2 | 2.0 |
| Cat | rest | paws in viola | 0.8 | 0.0 |
| Cat | lift | paws in viola | 1.1 | 0.2 |
| Cat | lower | paws in viola | 1.1 | 0.6 |
| Cat | lower | claws in viola | 1.8 | 1.4 |

`pnpm hold-fit <role> --sets rest,lift,lower --base main`, outputs `hold-fit-<role>.txt`: the rest
paw swings 26°, 34°, and 23° on its forearm (35°, 34°, 25°), and twists -91° to -94° from the bind
(-56° to -65°), so the rest wrist bends no more than on `main`.

## 6. The result

The rest paw takes the turn in the plane of its palm near the turn of the play, so the instrument
keeps nearly its place in the paw: 22° to 27° in a move (56° to 79°). The fast opposite steps stay
at 0, and the largest angle between the turn axes falls to 17° to 26° (27° to 42°). The left arm
passes the gate against `main`, and the wrist pinch near 180° stays, as on `main`.

The sheets: `lift-<role>-<view>.webp` and `lower-<role>-<view>.webp` give the moves in steps of
10%, the base above the round, `fine-violist-<view>.webp` the cat lift in steps of 2% around the
unwind, and `rest-above-<role>.webp` the rest from 40° above in 7 views.
