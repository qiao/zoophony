# The wind elbows, the trombone palm, and the bassoon rest

Date 2026-10-25. Round `wind-elbows`. Decisions:
[`2026-10-25-wind-elbows.md`](../decisions/2026-10-25-wind-elbows.md). The probes and their
outputs are in [`2026-10-25-wind-elbows/`](2026-10-25-wind-elbows/). "Main" is `main` at
09ccf54d. Each command runs from the root of the tree.

## 1. The question

The user said that the wind players hold the instruments with "their palm are facing outwards
and thumbs downwards". After the round `wind-palms`, three faults stayed. The left oboe elbow stood
near the height of the shoulder and read as a raised wing. The right trombone palm faced the
audience with the thumb down the brace. The right bassoon paw missed the boot joint at rest. The
measures that decide are the elbow drop (`elbow-probe.ts`), the palm and the thumb
(`palm-probe.ts`, a copy of the probe of `2026-10-25-wind-palms/` with the sample set and the
palm up), the grasp (`pnpm wind-grip`), and the whole arm gate.

## 2. The sources of the trombone hand

`docs/reference/wind-technique.md` 1.1 has the facts with quotes. The thumb lies on the top of the
brace and the fingers below it (pBone, Smith, Hello Music Theory), and the ring and little fingers
go below the lower tube (Old Dominion University). The sources disagree on the palm: "Palm faces
floor" (Old Dominion), "palm facing the chest" (Mumford), and a range from the wrist "sideways in
relation to the face" to "the bottom of the wrist" toward the player (Burtis). No source puts the
palm toward the audience or the thumb under the brace. The target is thus a palm with no share
toward the audience and a thumb up the brace. For the oboe, the arms "hang loosely" and the
elbows neither "stick out" nor stay "held" close to the body (Garvey, Rollins, Cline).

## 3. The scans

- **Oboe** (`scan-oe1.sh` to `scan-oe4.sh`). Each left elbow down grasps in each set. With the
  rest elbow down too, the left arm folds 9 faces at rest (limit 8). The play elbow (-0.5, -1, 0)
  with the rest elbow of main passes the gate, with no new depth (`depth-oe4.txt`).
- **Trombone** (`scan-tb1.sh` to `scan-tb11.sh`). The slide points 45° to the right, so the right
  side of the panda is the far right side of the brace. Only a grip there turns the palm off the
  audience, and then the chirality turns the thumb up (`scan-tb1.txt`). It costs slide reach, and
  with the elbow of main it turned the paw 166° to 169° on its forearm (`scan-tb3-gate.txt`). The
  elbow down and a little forward gives 141°. The elbow straight down put the right upper arm
  8.7 cm into the body at rest (`depth-tb8.txt`).
- **Bassoon** (`scan-br1.sh` to `scan-br3.sh`). The rest of main puts the right grip 5.2 cm out
  of reach (`pnpm hold-reach beaver --instrument bassoon`). The bind turn of the bassoon at rest,
  0.15 H forward, brings it 1.2 cm into reach, and both paws grasp. The left elbow a little back
  lowers the left forearm twist.

## 4. The measures, main against the branch

| Measure | Main | Branch |
|---|---|---|
| Left oboe upper arm below the level, play (°, `elbow-*.txt`) | 3.5 | 32.5 |
| Left oboe elbow drop below the shoulder joint, play (cm) | 0.9 | 7.8 |
| Left oboe paw along the oboe, gap to the right paw (cm) | 9.7, 6.0 | 9.1, 7.1 |
| Left oboe palm to the front, thumb along the tube (cm, `palm-*.txt`) | +0.02, +2.53 | +0.14, +3.07 |
| Right trombone palm to the front | +0.93 | -0.17 |
| Right trombone thumb tip along the brace (cm, + up) | -6.46 | +5.79 |
| Right trombone palm at rest: to the front, up (`palm-rest-branch.txt`) | - | -0.40, +0.73 |
| Slide reach (m, `pnpm hold-reach panda --instrument trombone`) | 0.170 | 0.105 |
| Right bassoon paw at rest: grasps, axis distance (cm, `grip-*.txt`) | 0%, 10.1 | 100%, 6.3 |
| Right bassoon grip at rest, spare reach (cm) | -5.2 | +1.2 |
| Left oboe forearm step, mean and largest (°, `twist-*.txt`) | 34.2, 34.2 | 21.3, 30.5 |
| Left bassoon forearm link, mean and largest (°) | 64.6, 67.7 | 55.4, 61.9 |
| Right trombone forearm link, mean and largest (°) | 5.4, 15.8 | 42.8, 70.6 |

`pnpm wind-grip oboist trombonist bassoonist` (`grip-*.txt`): each paw of the three roles holds
and grasps in each sample of each set, except the left trombone paw at rest (0%) and in the
lowering (43%), as on main.

`pnpm arm-check --all --base main` (`gate.txt`): the bassoonist passes each value, and the other
20 roles keep the values of main. These values fail on the margin against main, inside their
limits:

| Role, arm | Value (limit) | Main | Branch | Reason |
|---|---|---:|---:|---|
| Oboist L | flat p5 (0.55) | 0.75 | 0.68 | The hanging upper arm turns its broad side more to the front. No image shows a plank |
| Trombonist R | forearm twist p95 (80), rest | 9 | 45 | The palm to the side turns the paw on its forearm, most at rest |
| Trombonist R | paw twist p95 (170), rest | 32 | 141 | As above. The elbow out gave 166° |
| Trombonist R | move twist max (176) | 32 | 141 | As above |
| Trombonist R | flat p5 (0.55), lift | 0.79 | 0.66 | The elbow down. A shoulder turn of 55° gave 0.60 |

With the new `ACCEPTED_GRIPS` entries, the grip turn of the left oboe paw and of the right
trombone paw is 0° and 1°, and the holds of main turn 52° and 96° from them. On main, with the
entry before, the right trombone paw failed its grip turn (51°, `gate-main-3.txt`).

## 5. The images

Main is above the branch in each pair, from `views.sh` (`pnpm close-views <role> --views
front,left,right,back,35,-35 --zoom 1.4 --base main`) and `pairs.py`.

- `oboist-play.webp`, `oboist-lift50.webp`: the left elbow hangs below the shoulder from the
  front, the back, and ±35°. On main, the left arm stands out as a wing.
- `trombonist-first.webp`, and `trombonist-right-paw-first.webp` and
  `trombonist-right-arm-rest.webp` at 3 times the size (`crops.sh`): the right paw holds the low
  brace from the right side of the panda, below the lower tube, and the right elbow hangs lower.
  No image shows a band on the right forearm.
- `bassoonist-rest.webp`: at rest, the right paw closes on the boot joint. On main, it hangs
  beside the bassoon. `bassoonist-play.webp` shows the play with the left elbow back.

`<role>-audit-e20.webp` and `-e40.webp` are the sheets of `audit.sh` (`pnpm close-views audit
--roles oboist,trombonist,bassoonist --base main`), at a third of the size. They show no new slit,
flap, or dark band in any moment. From the back and az-150, the left oboe elbow of main stands out
of the body outline, and the branch hides it. The soft dark crease at the front of the right
beaver arm root stays, as on main.

`pnpm clip-probe --base main --jobs 4` (`clip.txt`): 15 files PASS, as on main.

## 6. The faults that stay

- From the front, the right trombone paw lies below the lower slide tube with its finger tips on
  the brace, so it reads as a paw under the slide.
- The right trombone forearm twists up to 70.6° for each link at rest, and the slide reach is 18%
  of a real slide.
- The left bassoon forearm twists 55.4° for each link, because the beaver has no arm segments.
