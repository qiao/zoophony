# The longer legs of the polar bear pianist

Date 2026-10-22. Round `polar-legs`. Decisions:
[`2026-10-22-polar-legs.md`](../decisions/2026-10-22-polar-legs.md). The probes and their outputs
are in [`2026-10-22-polar-legs/`](2026-10-22-polar-legs/), the logs in its folder `logs/`. Each
command runs from the root of the tree.

## 1. The question

After the round `polar-seat`, the seated polar bear still read almost as standing: the short legs
of the mesh gave a bench of 0.153 m, and the round belly hid the lap. The user chose "Longer legs,
keep size (Recommended)": thighs and shins about 1.6 times as long, the feet at their size, and
the bear at its size. The measure that decides is the look of the knees from the side beside the
seated rabbit and red fox, with the gates of the brief: the note targets, the folds, and the arm
gate.

## 2. The measures

`pnpm rig-mesh polar-bear --check --set legFactor=<f> --keep scratch/rigs` keeps the meters for
each unit (`logs/rig-legs.txt`). `variants.sh` sets the kept landmark height in `ANIMALS` for the
probes of each kept file (`seat-probe.ts`, `pnpm pose-depth pianist --every 4 --gaps --glb`), and
`knees.sh` renders the knees (`knees-variants.webp`, joined by `knees.py`). The hold of these rows
is the hold of `main` (lean 24°, palm 0.09 m above the keys).

| Leg factor | Bench | Knees in front of the belly, rest | Seated head top | Play folds | Targets within 5 mm, worst | Upper arms in the body, play |
|---|---|---|---|---|---|---|
| 1 (`main`) | 0.153 m | -12.4 cm | 1.729 m | 36.5% | 100%, 0 mm | 8.1 cm |
| 1.4 | 0.230 m | -3.3 cm | 1.814 m | 29.1% | 99.4%, 22 mm | 10.2 cm |
| 1.6 | 0.269 m | +1.3 cm | 1.857 m | 34.9% | 96.5%, 39 mm | 11.4 cm |
| 1.8 | 0.307 m | +5.8 cm | 1.900 m | 51.7% | 91.2%, 57 mm | 11.6 cm |

`H` is 0.453 m in each row. The landmark of each row is the standing shoulder joints after the
leg rise: 1.3233, 1.4062, and 1.4892 m. A bench front 1 cm behind the calves (`chair.front=0.06`)
lowered the seat 4 mm and changed no fold (`logs/rig-front.txt`).

The seat of `main` and of the round (factor 1.6 and the hold g4 of the manager), from
`node docs/research/2026-10-22-polar-legs/seat-probe.ts` (`logs/seat-base.txt`,
`logs/seat-g4.txt`), the sweep (`logs/pose-depth-base.txt`, `logs/pose-depth-g4.txt`), the note
targets (`pnpm pose-depth pianist --targets --json`, `logs/targets.json`), and
`pnpm fold-probe pianist --base 2da5c8ec` (`logs/fold-final.txt`):

| Measure | `main` | Round |
|---|---|---|
| Hip angle, rest / play | 90° / 76° | 90° / 73° |
| Knee / ankle angle | 95° / 107° | 95° / 107° |
| Haunch to the bench top | 0.1 cm | 0.1 cm |
| Lowest sole above the floor | 0.0 cm | 0.0 cm |
| Bench top | 0.153 m | 0.269 m |
| Head top, rest / `H` | 1.734 m / 0.453 m | 1.862 m / 0.453 m |
| Center of mass in front of the bench front, rest / play | 5.5 / 15.1 cm | 6.9 / 17.4 cm |
| Knee top below the case | 26.0 cm | 13.8 cm |
| Shoulder joints, play | 0.939 m | 1.057 m |
| Elbows above the key tops / forearm slope, play | 8.9 cm / 0.5° | 17.5 cm / -14.6° |
| Note targets within 5 mm, worst | 100%, 0 mm | 3,924 of 3,931, 10.4 mm |
| Play: forearms / upper arms in the body | 6.2 / 8.1 cm | 7.7 / 9.4 cm |
| Lowering: forearms / upper arms in the body | 6.7 / 11.4 cm | 8.7 / 12.4 cm |
| Head to the case, play | 12.0 cm | 6.3 cm |
| Rest paws to the belly | 4.0 / 4.3 cm | 7.1 / 6.8 cm |
| Folds, rest / play / lift | 75.0% / 36.5% / 57.3% | 100% / 28.1% / 73.4% |

The hold variants on the 1.6 legs. `pnpm hold-fit` samples 2 demos at 1 s
(`logs/fit-*.txt`), so its fold shares differ from `pnpm fold-probe` (4 demos at 0.25 s,
`logs/fold-*.txt`). The arm gate is `pnpm arm-check pianist --base 2da5c8ec --variant`
(`logs/arm-v*.txt`). Each row has the rest place along 0.7 of the thigh.

| Hold | Targets, worst | Over a limit | Play / lift folds (`fold-probe`) | Arm gate |
|---|---|---|---|---|
| Hold of `main` (lean 24°, palm 0.09 m, rest at the knee) | 94.0%, 39 mm | 4 sets | 34.9% / 89.5% | FAIL: move twist 62°, flat 0.62, paw swing 53° |
| First hold of the round: lean 28°, palm 0.12 m, rest 0.2 H up | 100%, 0 mm | none | 52.1% / 64.5% | FAIL: move twist 53° (base 42°, margin 3°) |
| Lean 27°, palm 0.105 m | 99.8%, 10 mm | lowering 12.7 cm | 28.5% / 62.9% | FAIL: move twist 54°, flat 0.66 |
| Lean 26°, palm 0.105 m | 99.6%, 18 mm | lowering 12.6 cm | 28.9% / 63.7% | FAIL: move twist 53°, flat 0.65 |
| Lean 27°, palm 0.105 m, elbows level (`poleL` -1, 0, 0) | not run | not run | not run | FAIL: paw swing 43° / 45° |
| g4, the hold of the manager: lean 27°, palm 0.105 m, `poleL` -1, -0.05, 0, rest 0.14 H up | 99.8%, 10 mm | lowering 12.4 cm | 28.1% / 73.4% | FAIL: move twist 46° (base 42°) |

The poles trade the move twist against the paw swing: no pole of `logs/arm-v4.txt` and
`logs/arm-v5.txt` passes both. The rest place and the arc of the lift do not change the move twist
(`logs/arm-v2.txt`, `logs/arm-v3.txt`). The grip turn of each paw drops from 10° to 1°: the play paw
lies nearer its accepted grip, and the move twist rises with it.

On g4, `pnpm arm-check pianist --base 2da5c8ec` (`logs/arm-check-final.txt`) fails only the move
twist of each paw: 46° (base 42° and 41°, margin 3°), at the lift of `bach-bwv1047`. The manager
accepted it. `pnpm arm-check --all --base 2da5c8ec` (`logs/arm-check-all-final.txt`): no other role
fails. `pnpm body-probe --base 2da5c8ec` (`logs/body-probe-final.txt`): only the polar bear bodies
and the 16 pose sets of the pianist change. The layout does not move.

## 3. The result

The factor 1.6 gives the clearest lap within the gates of the rig: the knees stand out in front of
the belly, the bench is 0.269 m high, and the haunch rests on it. From the side, the bear now reads
as seated at each moment and at both camera heights (`pairs-e20-*.webp`, `pairs-e40-*.webp`,
`knees-chord.webp`, `knees-rest.webp`). The factor 1.4 hides the knees behind the belly, and 1.8
folds more and misses more notes.

The landmark rises with the legs, so the bear keeps 1.929 m for each unit and `H` stays 0.453 m.
The seated head top then rises 7.4%, because the haunch sits 0.116 m higher. The brief asked for
the head top and `H` within 2%, and both cannot hold with longer legs under the same trunk.

The shoulders sit 11 cm higher above the keys, so the hold of `main` misses the far keys. No hold
of this round passes the whole arm gate. The manager chose g4 and accepted its values as the new
base of the pianist (decision row "Manager"). g4 folds less than `main` in the play (28.1% against
36.5%) and more in the lift (73.4% against 57.3%). Its lowering takes the upper arms 12.4 cm into
the belly, so `PIANIST_SWEEP` accepts 12.5 cm. Its left paw misses 7 of 3,931 notes by more than
5 mm, at most 10.4 mm, on the far bass keys. The elbows sit higher above the keys, so the forearms
slope down 15° to the paws, and a real pianist keeps them about level.

The images on g4: each moment, six views, and both camera heights in `pairs-e*.webp` and in the
seam audit `audit-e20.webp` and `audit-e40.webp`; the play strips `strip-az*.webp`; the 2x arm
crops in `arms/` (from a run with a temporary patch of `tools/arm-views.ts`, because the crops
take the worst play sample of a failing value, and the move twist has none); and the knees
`knees-chord.webp` and `knees-rest.webp`. No crop shows a new clip, fold, or twist. The dark wedges
at the outer upper arms from behind are the same as on `main`. From the right at rest, a dark
crease lies between the thigh and the belly at the knee, as on `main`.

The rest paws lie on the thighs, but the lap point takes the top of the belly over the thigh, so
the paws still rest at chest height. Lower places put the upper arms up to 11 cm into the belly
(`logs/fit-rest3.txt`).
