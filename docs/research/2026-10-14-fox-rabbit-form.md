# The form of the red fox and the rabbit, and their violins (2026-10-14)

This report gives the measures, the sources, and the probes of the branch `fox-rabbit-form`. The
decisions are in [`2026-10-14-fox-rabbit-form.md`](../decisions/2026-10-14-fox-rabbit-form.md).
The probes and the logs are in [`2026-10-14-fox-rabbit-form/`](2026-10-14-fox-rabbit-form/).

## The requests of the user

On 2026-10-14, the user looked at the rabbits and the red foxes in the rest pose and asked for
four changes:

1. "make the head of the fox larger so that it appears cuter"
2. "make the legs of the fox and rabbits longer, and the seat higher."
3. "fix the size of the violin on the fox and rabbit."
4. "optimize the default rest pose of the rabbit and fox so that they're more natural."

During the round, the user saw the images of the first two forms and said "head too big and leg
too long", and then "it's ok for the animals to have their feet not touching the floor while
sitting. it may be even cuter?"

## The reference

`grid_crop.py` writes crops of `orchestra-latest.png` with a grid of the source pixels. The points
are read on these crops. H is the head height with no ears, from the chin to the crown.

| Measure | Rabbit, bottom left | Fox, bottom right |
|---|---|---|
| Crown and chin (y) | 677 and 718 px: H 41 px | 688 and 733 px: H 45 px |
| Seat top and floor (y) | 805 px (front edge of the seat) and 849 px (foot of the front chair leg): 44 px, 1.07 H | the music stand hides the seat. The lap is at about 795 px and the feet at about 862 px: 1.0 to 1.5 H |
| Shoulder (y) | 727 px | 735 px |
| Seat top to shoulders | 78 px, 1.9 H at the front edge, about 1.7 H at the hips | about 60 px, 1.3 H |
| Head over seated trunk | about 0.53 to 0.59 | about 0.77 |

## The app

`landmark-probe.ts` measures the players of a source tree on the chair and standing
(`landmark-probe.txt` for the branch, `landmark-probe-main.txt` for `main`). The visible head is
the extent of the corners of the head bone.

| Measure | Main fox | Branch fox | Main rabbit | Branch rabbit |
|---|---|---|---|---|
| H of the holds | 0.323 m | 0.323 m | 0.323 m | 0.323 m |
| Visible head | 0.323 m | 0.395 m | 0.325 m | 0.325 m |
| Seat | 0.164 m | 0.360 m | 0.123 m | 0.360 m |
| Seated trunk | 0.684 m | 0.693 m | 0.518 m | 0.503 m |
| Head over seated trunk | 0.47 | 0.57 | 0.63 | 0.65 |
| Standing head top | 1.408 m | 1.626 m | 1.120 m | 1.274 m |
| Seated head top | 1.288 m | 1.571 m | 1.064 m | 1.286 m |

The seated head top of a rabbit is 0.82 of the head top of a red fox (0.83 on `main`, 0.76 to 0.90
in the reference).

## The form

### The rig

`tools/blender/rig_mesh.py` gets two factors of the config:

- `legFactor` makes the thigh and the shin longer. Each bone stretches only between its joints
  (`segment_stretch()`): a linear stretch along the axis of the shin pushed the soles below the
  ankle 0.029 units under the floor, and the standing body of the app stood 43 mm higher than the
  source. The feet keep their size, and the body rises so that the soles stay at y 0. The scale
  of the app stays, because `ANIMALS` puts the shoulder joints higher by the rise.
- `headFactor` grows the head and the ears around the neck joint. The rig writes the factor into
  the extras of the asset of the GLB file, and `pnpm studio-body` measures the head height and the
  head center of the holds on the head before the growth (`ungrown()`). With the head center of
  a head grown 1.5 times, the violin went 15 cm further from the left shoulder, and the upper arms
  folded in each play sample.

With both factors at 1, the rigs give the bytes of `main` (SHA-256 `0e2de32e` and `2c4c7d94`).
`break-leg-rise.txt` and `break-head-factor.txt` give the break tests of the wrapper and the
export.

### The factors

| Form | Fox head | Fox legs | Rabbit legs | Fox seat | Rabbit seat | Standing fox head top |
|---|---|---|---|---|---|---|
| First | 1.5 | 3.25 | 2.75 (level thighs) | 0.484 m | 0.332 m | 2.23 m |
| The manager after the images | 1.5 | 2.0 | 2.5 | 0.306 m | 0.303 m | 1.88 m |
| The user: "head too big and leg too long" | 1.2 | 1.5 | 1.75 | 0.235 m | 0.215 m | 1.63 m |
| The user: hanging feet | 1.2 | 1.5 | 1.75 | 0.36 m (`seat`) | 0.36 m (`seat`) | 1.63 m |

The head variants 1.2, 1.35, and 1.5 at the leg factor 3.25 give a head of 0.57, 0.64, and 0.71 of
the seated trunk in the rig (`head-variants.webp`). The head factor 1.25 of the manager folded the
fox in 15.0% of the play samples (`rig-mesh-check-fox-head-variants.log`): a thin face between the
neck and the head (face 1040, corner angles 3.7°, 176.1°, and 0.2°) turned over when the head
turned (`fold-faces-fox-head-1.25.txt`). The factors 1.2 and 1.3 gave 3.3% and 6.5%.

The seat of the rabbit has level thighs: the thigh lies 10° below the level and 8° out, the shin
hangs straight down, and the feet turn 20° further down than in the source, as relaxed feet
(`leg_turns.py`). The fox keeps the seat of its long thigh, 15° below the level, with the same
relaxed feet. With the seat of 0.36 m, the soles hang 10.0 cm (rabbit) and 7.7 cm (fox) above
the floor (`rig-mesh-check-*.log`).

`pnpm rig-mesh <animal> --check` of the last form, with the holds of `main`: the fox folds in 3.4%
and the rabbit in 6.0% of the play samples, the standing bodies give back the sources within
0.23 mm and 0.27 mm, and the packed meshes are 28,491 B and 24,480 B after gzip.

### The scene

| Check | Result | Probe |
|---|---|---|
| Stage growth | `mozart-k525` +10.7%, `bach-bwv1047` and `bach-bwv1048` +5.4%, the others 0.0% to -2.9% | `stage-sides.ts`, `stage-sides.txt`, `stage-sides-main.txt` |
| Footprints | fox 0.571 m by 1.063 m (0.556 m by 0.993 m), rabbit unchanged | `footprint-probe.ts`, `footprint-probe.txt` |
| Touching obstacles | none in each demo and chamber test file | `overlap-probe.ts`, `overlap-probe.txt`, `overlap-probe-main.txt` |
| Paused layout test | the 2 checks of the stage growth fail, as on `main` | `layout-scene-paused.txt` |

The first forms put the stands of the second violin and the viola of the string quartet test file
into each other. The arc between two players of a row now also keeps the stands apart
(`break-stands.txt`).

The two-shot of the violin and piano duo had a small margin on `main`: its only clear camera stood
0.4394 of the default distance from the stage center, and the limit of the close shots is 0.44.
The standing rabbit with the longer legs put it at 0.4404, and the plan lost the two-shot. The
sphere of the two-shot now holds each player plus 0.48 m, and the camera stands at 0.4362
(`duo-share.patch`, `duo-share.txt`, `break-two-shot.txt`).

The higher seats change three checks of the shot plans:

- N4: with each layout spread 3 times, the red foxes on the seats of 0.36 m still blocked a low
  camera to the flutes of the Boulanger demo (34.5°). The check spreads the layouts 4 times
  (`elev-probe.ts`, `elev-probe.txt`). A planner that starts its search 20° higher still fails it
  (`break-n4.txt`).
- K. 315: the seated players hide the low cameras of the solo of the horns at 78.3 s. The plan of
  `main` took it from its second band (30° to 40°), and the branch has no clear camera there. The
  plan then takes a side shot that holds the flute soloist, so its solo at 93.9 s drops out, and 2
  solo shots of the soloist stay.
- N2: the plan of K. 525 puts 75 heads of other players in front of its close cameras, and none of
  them shows in a frame.

## The violin

### The hold

The sources of the hold of a real violinist:

- violinonline.com, "How to hold the violin": "Place the violin on your left collar bone", "The
  violin is held horizontally (parallel with the floor) and is angled to the left of a straight
  forward position", the left side of the jaw on the chin rest, and "The elbow should be under the
  center of the violin".
- Simon Fischer, "Basics: Holding the violin" (simonfischeronline.com): the scroll is raised so
  that the strings are flat, and "shorter arms, point the scroll more to the right".

`hold-probe.ts` measures the collarbone, the jaw, the nose, and the violin of each species on the
chair (`hold-probe.txt`). The tail end of the violin of `main` lay 5 cm to 6 cm in front of the
collarbone. The new `playShift` puts it on the collarbone next to the neck, about 5 cm back and
3 cm toward the middle. The violin keeps the turn of the hold of the rabbit: 38° to the left of
the front, with the scroll 3° up. The animals have no head turn to the chin rest, so the jaw of the
rabbit sits at the tail end, and the long jaw of the fox over the violin.

### The size

The rule of a violin shop (`pnpm hold-reach`): with the left arm extended, the scroll lies in the
middle of the palm.

| Species | Main | Real hold, 38° | 42° | 47° |
|---|---|---|---|---|
| Red fox | 0.563 (0.285 m) | 0.700 (0.355 m) | 0.719 | 0.739 |
| Rabbit | 0.643 (0.326 m) | 0.741 (0.376 m) | 0.757 | 0.773 |

Both stay below 0.80 of the app violin, the stop of the brief. The deep chests put the collarbone
0.15 m to 0.16 m in front of the shoulder joints. Two lengths of the violin give the distance of
the tail end from the left shoulder joint and the part of it along the violin, so the reach for a
violin length L is `sqrt(t² + 2 L (t·d) + L²)`:

| Species | Violin 0.85 (0.431 m) | Violin 1.0 (0.507 m) |
|---|---|---|
| Red fox (reach 0.490 m, arm factor 1.078) | reach 0.563 m, arm factor about 1.25 | reach 0.637 m, arm factor about 1.43 |
| Rabbit (reach 0.452 m, arm factor 1.445) | reach 0.505 m, arm factor about 1.63 | reach 0.578 m, arm factor about 1.88 |

The arm factor makes the upper arm and the forearm longer, and the paw keeps its size (0.039 m for
the fox and 0.036 m for the rabbit, from the reach with and with no factor). The violins have the
size of the rule of the real hold: 0.70 for the fox and 0.74 for the rabbit.

### The bow arm

With the violins of the rule, the bow paw went 3.2 cm (rabbit) and 3.6 cm (fox) into the body at
the frog. A free hair of 0.06 m at each end of the bow (commit `8ac34f69` of the branch
`rabbit-hair`) and the right elbow at the frog further out give 1.9 cm and 2.4 cm
(`hold-fit-*-free-hair.txt`). For the fox, a slant of the bow, a shoulder turn, a turn of the
violin, and a lower violin each folded more faces (`hold-fit-fox-violinist-play-variants*.txt`).

## The rest

The sources of the rest of a seated violinist between the passages:

- violinspiration.com, "Violin posture": "You would have the violin resting on your left leg with
  the neck in your left hand", and "The bow will also be pointing up with just a gentle fist
  around the frog using your other hand".
- Gerald Elias, "Tales of an orchestral violinist: sitting correctly", The Strad, 2021-03-10: "Out
  in front, straight up and down, with the fiddle resting on your knee."

The rabbit holds the violin upright on the left thigh near the knee, at its neck, and the bow on
the right thigh, up and forward at 45°. Straight up, the bow went 5.4 cm into the body during the
lift and the lowering (`hold-fit-violinist-rest.txt`). The shoulder joints of the fox are 0.65 m
above the top of its thighs, and its arms reach 0.49 m, so its paws do not reach its thighs. Its
violin stands on the left thigh nearer to the hip and further out, and its right paw holds the bow
beside the right thigh, with the tip down and forward. With the rest of the rabbit, its right upper
arm went 6.5 cm to 8.2 cm into the body (`hold-fit-fox-violinist-rest.txt`).

## The checks

| Check | Result | Log |
|---|---|---|
| Play folds, 14 demos, step 0.25 s | fox 6.5% (3.4% on `main`), rabbit 4.6% (6.1%) | `fold-probe-*.txt` |
| Rest folds | fox 13 faces at most (6), rabbit 24 (7) | `fold-probe-*.txt` |
| Hold fit, all demos, step 1 s | fox play 5.6% (2.6%); rabbit 4.5% (6.5%) | `hold-fit-*-all-base-main.txt` |
| Deepest points over 1.5 cm | fox play and lift 2.4 cm (2.4 cm and 1.4 cm), fox lowering 2.9 cm (1.3 cm), rabbit play 1.9 cm (1.6 cm), rabbit lowering 3.6 cm (1.6 cm) | `hold-fit-*-all-base-main.txt` |
| Bodies and poses | 85 of 95 bodies, 21 of 23 players, and 748 of 1,492 pose sets equal | `body-probe-base-main.txt` |
| First download | +689 B after gzip | `size.txt` |

## The images

- `head-variants.webp`: the reference fox beside the rig previews of the head factors 1.2, 1.35,
  and 1.5 at the leg factor 3.25.
- `lineup.webp` and `lineup-seated.webp`: `main` above the branch, standing from the front and
  seated from 40° to the side (`frames.ts`).
- `violins-user-camera.webp`: the violins of the Beethoven 9 demo in the rest and in the play,
  `main` left and the branch right.
- `close-views-violinist.webp` and `close-views-fox-violinist.webp`: `main` above the branch, the
  rest from the front and both sides, the frog from the front and the left, and the soloist.
- `beethoven-9-play.webp` and `k525-play.webp`: the play frames, `main` above the branch.
