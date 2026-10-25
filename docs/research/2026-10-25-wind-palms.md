# The wind palms and the oboe hands

Date 2026-10-25. Round `wind-palms`. Decisions:
[`2026-10-25-wind-palms.md`](../decisions/2026-10-25-wind-palms.md). The probes and their outputs
are in [`2026-10-25-wind-palms/`](2026-10-25-wind-palms/). "Main" is `main` at b2f59e6a. Each
command runs from the root of the tree.

## 1. The question

The user asked if the animals hold the wind instruments in the opposite direction, and then said:
"look closer at the screenshot of the wind players, their palm are facing outwards and thumbs
downwards". The manager gave a hypothesis: the palm hint of the mesh rigs (`palm` of
`tools/mesh-rigs/<species>.json`) points to the back of the paw. The manager also asked to move
the left oboe paw up to the upper joint, with a gap of at least 3 cm between the paws.

## 2. The palm hint is the true palm

`paw_views.py` (Blender, batch) renders the left paw of each source mesh with the hint, and
writes its vertices. `paw_geo.py` cuts each paw across its axis and finds the separate digit, the
thumb (`paw-geo.txt`). For a left hand, the thumb lies at palm × fingers. On each paw with a
thumb (mouse, wolf, beaver, fox, monkey, panda), the thumb lies at -(axis × hint), the side that
a true palm gives, with no part toward the hint or the back. The rhino and the pig paws have no
separate digit.

`palm-probe.ts` repeats the test in the app: it finds the thumb in the bind mesh of each player,
takes the true palm from its side, turns it into each play sample with the best-fit rotation of
the hand corners, and compares it with the palm of the hold. The true palm is 4° to 26° from the
hint. Thus the hypothesis is false, and the rigs stay.

## 3. The cause: the paws behind the tube

The probe shows the fault in the holds. On main, each woodwind paw lies behind its tube (the place
rule of `tools/wind-grip.ts` asked for that side), and turns half toward the side across the tube
(`aimSide` 0.5). Its palm faces the tube, so it faces the audience, and with the fingers across
the tube, a left thumb must point down. The table gives main / branch. "Front" is the share of
the true palm toward the audience. The chirality thumb is palm × fingers (left) or fingers × palm
(right), from the hint, as a share along the tube.

| Role | Paw | Hint to true palm (°) | True palm to tube (°) | Front | Thumb tip along the tube (cm) | Thumb tip behind the axis (cm) | Chirality thumb |
|---|---|---:|---:|---:|---:|---:|---:|
| oboist | L | 20 / 23 | 104 / 39 | +0.41 / +0.02 | -3.05 / +2.53 | -1.13 / -1.16 | -1.00 / +1.00 |
| oboist | R | - | - | - | - | - | -1.00 / +1.00 |
| clarinetist | L | 8 / 7 | 14 / 45 | +0.73 / -0.23 | -3.37 / +5.59 | -0.90 / +1.90 | -1.00 / +1.00 |
| clarinetist | R | 9 / 7 | 36 / 58 | +0.79 / -0.28 | -4.88 / +4.55 | +5.34 / +0.08 | -1.00 / +1.00 |
| bassoonist | L | 14 / 22 | 27 / 14 | +0.71 / -0.11 | -3.79 / +3.69 | +2.73 / +0.32 | -1.00 / +1.00 |
| bassoonist | R | 13 / 4 | 12 / 15 | +0.89 / -0.42 | -1.85 / +1.88 | +2.85 / -5.02 | -1.00 / +1.00 |
| trombonist | R | 7 | 19 | +0.93 | -6.46 | +5.06 | -1.00 |

The flute, the trumpet, the left trombone paw, the tuba, and the horn do not change
(`palm-main.txt`, `palm-branch.txt`). The right mouse paw has no thumb in the cut, so only its
chirality column counts. The right trombone paw has the same fault, and it is open: no source
gives the side of the right palm on the slide brace.

## 4. The fix

Each grip of the three woodwinds moves across the tube toward the shoulder of its paw, at rest
too, so that the paw holds the tube from its own side. The side aim is 0 on the mouse and 0.25 on
the wolf and the beaver. The scans are `scan-og*.sh`, `scan-cg*.sh`, and `scan-bg*.sh` with `pnpm wind-grip
--set`, and the gates of the candidates are `scan-gate*.sh`. The grip tool now names the side of the own arm as the place of a woodwind paw.

The left oboe grip moves 0.05 H down the oboe in place of 0.3 H, and the left elbow points out
and a little down, as at rest. With the elbow down, out, and forward, the left tips stood 0.7 cm
to 1.3 cm off the tube on each high grip.

## 5. The measures, main against the branch

| Measure | Main | Branch |
|---|---|---|
| Oboe `Along`, left and right (cm) | 17.4, 22.3 | 9.7, 20.9 |
| Oboe `Paws gap min` in the play (cm) | 0.2 | 6.0 |
| Clarinet `Along`, left and right (cm) | 20.8, 39.9 | 20.7, 38.9 |
| `pnpm wind-grip` grasps in the play, each woodwind paw | 100% with the old place rule | 100% |
| Grasps at rest, oboe left, clarinet both, bassoon right | 0%, 0% and 0%, 0% | 100%, 100% and 100%, 0% |
| `pnpm clip-probe --base main --jobs 4` (`clip.txt`) | 15 files PASS | 15 files PASS |
| Largest left forearm step, oboe (`twist-*.txt`) | 23.3° | 34.2° |
| Left forearm twist link, bassoon (no arm segments) | 28.6° | 64.6° |
| Largest left forearm step, clarinet | 27.7° | 22.2° |

`pnpm arm-check --all --base main` (`gate.txt`): the other 20 roles keep the values of main. The
clarinet passes each value. Five of the six grip turns of the woodwinds drop from 163° to 176° to
6° to 21°, near the grips of 2026-10-24. These values grow on the margin, inside their limits:

| Role, arm | Value (limit) | Main | Branch |
|---|---|---:|---:|
| Oboist L | paw twist p95 (170) | 93 | 137 |
| Oboist L | grip turn p50 (45) | 10 | 140 |
| Oboist L, R | move twist max (176) | 93, 99 | 137, 121 |
| Bassoonist L | forearm twist p95 (80) | 14 | 38 |
| Bassoonist L | paw twist p95 (170) | 57 | 135 |
| Bassoonist L | paw swing p95 (70) | 27 | 54 |
| Bassoonist R | folds p95 at rest (8) | 4 | 8 |

The accepted grip of the left oboe paw dates from the oboe of 0.62 at 15°, before the left elbow
pointed out, so its grip turn has no meaning for the new hold.

## 6. The images

Main is above the branch in each pair, from `pnpm close-views <role> <dir> --views
front,left,right,back,35,-35 --zoom 1.4 --scale 3 --moments note,rest,lift50,lower50 --base main`.
`<role>-play.webp`, `<role>-rest.webp`, `<role>-lift50.webp`, and `<role>-lower50.webp` crop
the paws of the oboist, the clarinetist, and the bassoonist at 3 times the size of a cell, from
the front, ±35°, the left, the right, and the back (`crops.py`). `source-paws.webp` shows the left
source paw of each wind species from six sides, with the hint as a red rod (`paw_views.py`).
`<role>-audit-e20-play.webp` and `-e40-` are the play rows of `pnpm close-views audit <dir>
--roles oboist,clarinetist,bassoonist --base main`, with main at 896ae293, whose wind holds are
those of b2f59e6a. The audit shows no slit, flap, or dark band in any moment.

In main, the camera sees the palms and the inner side of the curled fingers, and the thumbs point
down. In the branch, each paw holds the tube from its own side, the backs of the curled fingers
cross the front of the tube, and the thumbs point up. At rest and in the moves, the left oboe paw
stays above the right paw. These faults stay: the left oboe elbow points out near the height of
the shoulder, so from ±35° and from the back, the left arm reads as a raised wing. At rest, the
right bassoon paw hangs beside the boot joint, as on main. No image shows a band on the left
bassoon forearm.
