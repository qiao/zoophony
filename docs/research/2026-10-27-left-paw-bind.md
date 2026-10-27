# The bind of the left paw

Date 2026-10-27. Round `fifth-bind`. Decisions:
[`2026-10-27-left-paw-bind.md`](../decisions/2026-10-27-left-paw-bind.md). The probes and their
outputs are in [`2026-10-27-left-paw-bind/`](2026-10-27-left-paw-bind/). Each command runs from the
root of the tree. The base is `main` (`67eeb20f`).

## 1. The question

The rabbit, the red fox, and the cat carry the violin or the viola rigidly in the left paw. The
paw twist on the forearm counts from the bind of the mesh paw, which is pronated. In each lift and
lowering, the paw supinated from about -91° at rest through 180° to 118° to 169° in the play, and
the forearm skin unwound in the band of `TWIST_FADE_BAND`. The round turns the bind of the left paw
toward supination, so that each twist stays on one side of 180°. The twists (`bind-scan.ts`), the
forearm skin in each move (`move-skin.ts`), the arm gate, the carry, the depths, and the sheets
decide.

## 2. Two ways to move the zero

The forearm of the app turns with its elbow hinge (`poseArm()` of `src/models/studio-rig.ts`), and
the upper arm too. A turn of the bind forearm about the bind upper arm, as on the rhino (route A),
moves the zero of the paw twist and of the upper arm roll by about the same angle. A turn of the
bind paw about its forearm (route B, `studio.bindSupination`, `paw_supination()` of
`tools/blender/rig_mesh.py`) moves only the zero of the paw twist. The forearm segments share it
in the bind (`driven_turns()`).

`node docs/research/2026-10-27-left-paw-bind/bind-scan.ts`, outputs `bind-scan-main.txt` and
`bind-scan.txt`, gives the twists of each sample of the rest, the play, and the 84 moves, and the
largest |twist + d| for each shift d:

| Role | Rest twist | Play twist | Play roll of the upper arm | Smallest d for ±150° | Largest upper arm roll at that d, route A |
|---|---|---|---|---|---|
| Rabbit | -91° | 141° to 169° | -12° to 14° | 70° | 82° |
| Red fox | -94° to -93° | 133° to 150° | -14° to 7° | 80° | 94° |
| Cat | -94° | 118° to 151° | 28° to 42° | 100° | 72° |
| Tan fox | -113° to -44° | -115° | 36° to 37° | 0° | 53° |

The 60° of the plan is too small: the cat play twist then reaches -180°. Route A puts the play roll
of the upper arm at 72° to 94°, where the gate limit of the upper arm twist is 55°. The round
takes route B.

## 3. The scan of route B

`pnpm rig-mesh <animal> --check --keep <dir> --set 'studio.bindSupination={"L":<d>}'` for each
angle (`rig-scan.txt`), and `pnpm arm-check <role> --glb <dir>/variant-<k>.glb --base main` for
each rig (`gate-scan.txt`). The folds count the folded faces of each left bone over all samples.

| Body, angle | Rest twist | Play twist | Left folds of the rig check | Forearm twist p95 of the gate |
|---|---|---|---|---|
| Rabbit, 0° (`main`) | -91° | 141° to 169° | 57,304 (wrist 18,144) | 80 |
| Rabbit, 60° | -31° | -159° to -131° | 22,243 (wrist 18,250) | |
| Rabbit, 80° | -11° | -139° to -111° | 4,655 (wrist 98) | 67 |
| Rabbit, 100° (kept) | 9° | -119° to -91° | 5,565 (wrist 0) | 58 |
| Rabbit, 120° | 29° | -99° to -71° | 27,168 (wrist 18,044) | |
| Red fox, 0° (`main`) | -94° | 133° to 150° | violin 251, flute 17,510 | violin 67, flute 48 |
| Red fox, 80° | -14° | -147° to -130° | violin 750, flute 15,997 | violin 75, flute 26 |
| Red fox, 100° | 6° | -127° to -110° | violin 1,221, flute 16,025 | violin 65, flute 35 |
| Red fox, 110° (kept) | 16° | -117° to -100° | violin 765, flute 15,993 | violin 60, flute 40 |
| Red fox, 120° | 26° | -107° to -90° | violin 712, flute 16,026 | violin 55, flute 45 |
| Cat, 0° (`main`) | -94° | 118° to 151° | 18,160 (paw) | 66 |
| Cat, 90° to 110° | -4° to 16° | -152° to -99° | 0 | 64, 60, 55 |
| Cat, 120° (kept) | 26° | -122° to -89° | 0 | 50 |

Each kept angle splits the supination of the play from the pronated bind (210° to 235°) about
evenly between the bind and the pose. On the rabbit, 60° and 120° kept the folds of the left wrist. On
the red fox, a larger angle helps the violin and hurts the flute, and 110° keeps both below `main`.
On the cat, each angle removes the paw folds, and 120° has the smallest forearm twist.

## 4. The measures

| Measure | Rabbit | Red fox | Cat | Tan fox |
|---|---|---|---|---|
| Rest twist, play twist | 9°, -119° to -91° (-91°, 141° to 169°) | 16°, -117° to -100° (-94°, 133° to 150°) | 26°, -122° to -89° (-94°, 118° to 151°) | -3° to 66°, -5° (-113° to -44°, -115°) |
| Largest change of the left forearm twist in 0.05 s, all moves | 8.4° (51.8°) | 8.7° (56.6°) | 9.6° (58.1°) | |
| Windows over 20° in 0.05 s, all moves | 0 (833) | 0 (913) | 0 (1,181) | |
| Smallest flat share in the moves | 0.88 (0.26) | 0.81 (0.27) | 0.74 (0.23) | |
| Gate: forearm twist p95 | 58 (80) | 60 (67) | 50 (66) | 40 (48) |
| Gate: flat p5 | 0.88 (0.73) | 0.82 (0.82) | 0.74 (0.72) | 0.81 (0.81) |
| Gate: paw twist p95 | 119 (165) | 115 (161) | 118 (164) | 66 (115) |
| Gate: move twist max | 119 (162) | 116 (153) | 118 (153) | 67 (124) |
| Gate: move turn max, °/s | 135 (1,410) | 158 (1,487) | 226 (2,067) | 284 (284) |
| Gate against `57849ac5`: move turn max, °/s | 135 (273) | 158 (271) | 226 (290) | 284 (284) |
| Carry: opposite steps, net turn in the paw | 0, 22° (0, 22°) | 0, 27° (0, 27°) | 0, 25° (0, 25°) | |
| Mean radius of the left forearm at rest, play, cm | 4.19, 3.81 (3.87, 3.60) | 5.66, 5.00 (5.11, 4.79) | 4.99, 4.39 (4.73, 4.47) | 5.55, 5.02 (5.28, 4.87) |

The values in parentheses are `main`, or `57849ac5` where the row names it.
`node docs/research/2026-10-27-left-paw-bind/move-skin.ts` (`move-skin.txt`, `move-skin-main.txt`)
follows the forearm twist of the trace in each move at steps of 0.01 s. `trace-<role>.txt` gives
one lift (`pnpm arm-check <role> --trace mozart-k525:lift0-1.2`), and `trace-rabbit-<d>.txt` the
rigs of the scan (`swap-run.ts`). The low point of each trace is the bind, which the paw passes.

The arm gate: `pnpm arm-check violinist fox-violinist violist flutist --base 57849ac5`
(`gate-57849ac5.txt`) and `pnpm arm-check --all --base main` (`gate-all-main.txt`). No value
fails on either arm. Against `main`, only the known open values of the pianist and the bassist
stay. The accepted left grips moved by the bind angle, so the
grip turns stay 17°, 3°, 22°, and 5°.
`pnpm carry-check violinist,fox-violinist,violist --base main` (`carry.txt`).
`pnpm pose-depth violinist --base main` and `pnpm pose-depth violist --base main`
(`depth-violinist.txt`, `depth-violist.txt`), and `pnpm hold-fit flutist --base main`
(`hold-fit-flutist.txt`). The instrument goes at most 1.9 cm into the body. Each pair of the
flutist is equal. Four pairs grow by 0.1 cm to 0.2 cm:

| Body | Set | Pair | `main` cm | Round cm |
|---|---|---|---:|---:|
| Rabbit | lift | paws in violin | 0.7 | 0.9 |
| Rabbit | rest | forearms in violin | 0.0 | 0.1 |
| Red fox | lower | forearms in violin | 2.0 | 2.1 |
| Cat | play | paws in viola | 0.7 | 0.9 |

Each other pair is equal or less.

`node docs/research/2026-10-27-left-paw-bind/forearm-radius.ts` (`forearm-radius.txt`,
`forearm-radius-main.txt`) gives the distance of the forearm vertices from the forearm axis. The
bind twist shrinks the bind forearm by 4% to 8% in the linear skin. The arm-down shape of the clip
`reference` restores the loss twice, so the rest forearm is 3% to 9% thicker than the forearm of
the bind of `main`, where `main` is within 3% of it. In the play, the forearm is nearer to that
forearm than on `main` on the rabbit, the red fox, and the tan fox (3% to 4% thinner in place of 6%
to 8%), and 2% thinner than `main` on the cat.

## 5. The images

Each sheet shows `main` above the round. `pnpm close-views <role> <dir> --base main --sheet`:

- `lift-<role>-<view>.webp` and `lower-<role>-<view>.webp`: the moves in steps of 10% from the
  front, the left, az-35, and az150 (`--box 0.2,0.25,0.6,0.5 --scale 2`).
- `fine-lift-<role>-<view>.webp` and `fine-lower-<role>-<view>.webp`: lift40 to lift90 and lower10
  to lower60 in steps of 2%, from the left and az-35.
- `play-<role>.webp`: `frog` and `tip` from the front, the back, the left, and the right.
- `rest-above-<role>.webp`: the rest from 40° above in seven views.
- `flutist-e20.webp` and `flutist-e40.webp`: each moment of `ROLE_VIEWS` of the flutist from the
  four sides, az150, and az-150, at the camera heights 20° and 40°.

The base shows a narrow left wrist near the old pass (rabbit lift60 to lift70 and lower30, red fox
lift60 to lift70), and the round keeps the forearm round there. The rest and the play match the
base from each side, with the same grips.

The user reported two faults on these rigs after the round. `cat-back.webp` gives the cat from the
back at `frog`, `tip`, and rest: the arms of the round have the form and the length of `main`, and
the rig check gives the same left reach (0.479 m). `flutist-paws.webp` gives the tan fox at the
note and in the standing play: the paws hold the flute as on `main`. The bind of this round thus
causes neither fault.

## 6. Open

- The rest forearm is 3% to 9% thicker than the bind forearm of `main`, and four depth pairs grow
  by 0.1 cm to 0.2 cm (section 4). A mask of the forearm part of the arm-down shape on a supinated
  side can remove both.
- The left grips of the cellist, the bassist, and the hornist twist -146° to -164° from their
  pronated binds. A supinated bind can lower them.
