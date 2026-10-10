# The arms close to the body

Date: 2026-10-10. Branch: `worktree-agent-a3e5b5932630f5412`, from `main` at `6c95dca9`. The
decision file [`2026-10-10-arms-close.md`](../decisions/2026-10-10-arms-close.md) gives the
decisions.

## 1. Summary

Until 2026-10-10, the clearance tests asked each arm to keep 0.01 H from the torso and the head.
Many poses held the elbows out in the air only to pass them. Commits `d0351782` and `c96a714f`
let an arm touch the body up to `ARM_CONTACT_DEPTH` (0.02 H). The user approved a change of the
poses toward the reference images: the upper arms hang close to the sides, the elbows stay near
the torso, and the players hold their instruments close.

This branch changes only pose values: the directions of the elbows, one turn of the flute, and
two values of the hanging arm. No body, skeleton, or color of `src/models/` changes. No test
changes. Each arm stays within `ARM_CONTACT_DEPTH`, and all unit tests pass.

The table gives the angle of each upper arm out to the side, from the vertical: the arcsine of
the sideways part of its unit vector, in the model axes. A negative angle points in, across the
chest. The playing values are the medians of the default demo, sampled every 1 s. The rest values
are the rest pose of the gallery plan. Only the rows that changed by 5° or more are here.

| Player | Pose | Left before | Left after | Right before | Right after |
|---|---|---:|---:|---:|---:|
| Rabbit and red fox, violin | play | 45° | 20° | 1° to 3° | 1° to 3° |
| Cat, viola | play | 49° | 23° | -1° | -1° |
| Dog, cello | play | 70° | 39° | -7° | -7° |
| Hippo, contrabass | play | 59° | 45° | -24° | -24° |
| Tan fox, flute | play | -9° | -13° | 62° | 40° |
| Beaver, bassoon | play | 4° | 4° | 39° | 25° |
| Pig, horn | play | 2° | 2° | 48° | 25° |
| Panda, trombone | play | 21° | 2° | 19° | 1° |
| Rhino, tuba | play | 36° | 29° | 17° | 11° |
| Rabbit, red fox, and cat, violin and viola | rest | 21° to 29° | 3° to 5° | 41° to 42° | 41° to 42° |
| Dog and hippo, cello and contrabass | rest | 60° to 72° | 7° to 15° | 43° | 43° |
| Polar bear, piano | rest | 58° | 31° | 58° | 31° |
| Deer, harp | rest | 52° | 29° | 35° | 17° |
| Beaver, bassoon | rest | 14° | 14° | 48° | 28° |
| Pig, horn | rest | -2° | -9° | 29° | 14° |
| Panda, trombone | rest | 32° | 5° | 14° | 10° |
| Standing players: percussion, conductor, soloists | rest | 33° to 35° | 25° to 28° | 33° to 35° | 25° to 27° |
| Penguin, choir folder | play and rest | 49° | 31° | 49° | 31° |

With the test notes of the gallery, the arms of the badger at the snare drum, the xylophone, and
the bass drum stand 21° to 36° out while they play, 31° to 50° before.

## 2. Method

- A scratch script posed each cast with the real `poseAt()` and measured each arm part with
  `armGaps()` of `pose/test-arm-clearance.ts`, with a limit of 0.6 H. It sampled the default
  demo every 1 s, the Beethoven 9 demo for the timpani and the choir, the test notes of the
  gallery every 0.1 s, and the rest pose at four wall times.
- A grid search tried 4 to 30 candidate directions for each hold. A candidate stayed in the
  list when each arm part kept a gap of at least -0.012 H (a margin above the limit of -0.02 H).
  Of these, the candidate with the elbow nearest to the body won.
- `pnpm test` decided each change. The play clearance test samples the default demo every 0.5 s
  and the lift every 0.1 s. The rest clearance test checks each species with each instrument.
- `pnpm screenshots --sheet --play` gave the images before and after, and a Playwright script
  on the dev server gave close views of the gallery in play and at rest.

## 3. Changed poses

Each change moves a value of the old gap toward the reference images.

- **Left elbow of the violin and the viola** (`BOWED_HOLDS`, `pose/bowed-rig.ts`). In play, it
  points down and forward, under the instrument and near the chest, as the violinists of
  `orchestra-latest.png`. At rest, it points down and a little back, and the upper arm hangs at
  the side.
- **Left elbow of the cello and the contrabass.** In play, it points down, out, and a little
  forward, so that the arm hugs the instrument, as the dogs and the hippos of the references. At
  rest, it points down and a little in.
- **Flute** (`WIND_HOLDS`, `pose/winds.ts`). The right end turns 15° down and 30° back (30°
  down and 20° back before), nearer to level, and the right elbow points down.
- **Woodwind elbows.** The left elbows of the oboe and the clarinet point down, out, and forward,
  as the wolf of `animals.webp`. The right elbow of the bassoon points down. The rest right
  elbows of the flute, the oboe, and the clarinet point down.
- **Brass elbows.** The right elbow of the horn, both elbows of the trumpet, the trombone, and the
  tuba point down. Most rest elbows point down too (out and a little up before).
- **Rest hands of the pianist and the harp player** (`HANDS_HOLDS`, `pose/hands.ts`). The elbows
  point down, a little out, and forward. The palms keep their rest places.
- **Hanging arms** (`HANG`, `pose/hang.ts`). The arm of a standing player swings out until it
  touches the side of the torso and the legs (gap 0, 0.03 H before), and it swings 20° forward
  (8° before), so that it passes in front of the widest part of the hips.
- **Percussion elbows** (`PERCUSSION_HOLDS`, `pose/percussion-rig.ts`). The snare drum, the
  xylophone, and the beater of the bass drum point the elbows nearer to the body.
- **Singers** (`CHOIR_HOLD`, `pose/choir.ts`). The elbows point down and a little out and back,
  and the upper arms touch the sides of the body, as the penguins of `orchestra-side.png`.

## 4. Tests that blocked a pose of the references

No test blocked a pose that the references clearly show, and no test changed. The contact test
(`ARM_CONTACT_DEPTH`) stopped some poses nearer to the body. In each case, the body is the cause:
the torso of the bodies of 2026-10-06 is short, and the haunches and the hips are wide.

| Pose | Measure with the contact test | Cause |
|---|---|---|
| Left elbow of the violin straight down or in, (0, -1, 0) or (0.3, -1, -1) | upper arm 0.08 H to 0.17 H into the haunch and the chest | The neck of the violin is near the shoulder, so the arm folds and the elbow drops to the lap |
| Right elbow of the violin lower at the frog, (0.5, -1, -0.5) | bow arm 0.03 H to 0.12 H into the chest | The bow arm already touches the chest |
| Rest right elbow of the bowed strings nearer to the side, also with the bow grip higher or nearer to the hip | upper arm or forearm 0.06 H to 0.19 H into the haunch and the thigh | The hanging elbow meets the haunch, and the forearm lies along the thigh |
| Flute at 10° down | left upper arm 0.03 H into the chest | The left hand holds the flute to the right of the middle, so the left arm crosses the chest |
| Left elbow of the oboe and the clarinet down and in, (-0.5, -1, -0.5) | arms 0.08 H to 0.13 H into the body | The grips are low and near the belly |
| Elbows of the singers down and back, (0.6, -1, 0.2) | upper arms 0.02 H into the torso, at the limit | The chest of a singer also turns 6° in a phrase |

## 5. Gaps to the references that remain

- **Rest bow arm.** The right elbow of each seated string player stays out at the side (41° to
  43°) while the bow rests on the outer side of the right knee. The references show no rest pose.
- **Elbow angles.** The upper arms of the references hang nearly straight down. Here, the
  standing players keep 25° to 28°, the violinists 20° on the left in play, and the dogs 39°.
- **Level elbows.** The oboe and the clarinet keep the right elbow level and forward, (1, 0, -1),
  and the bassoon and the horn the left elbow. A lower elbow went into the belly or the thighs.
- **Timpani and cymbals.** They keep their elbows (section 6).
- **Conductor.** The playing elbows of the bear stay level with the shoulders (5.4). In
  `orchestra-latest.png`, the elbows of the bear are a little lower. The view tests of 5.4 hold
  the hands beside the head, and the old gap did not set these elbows.
- **Arm forms.** The arms of the bodies are thinner than the thick arms of `animals.webp` and
  `lowpoly-animals.png` (design 4.5), so a touch shows less contact than in the images.

## 6. Open problems

These faults were there before this branch. No play clearance test covers these instruments.

- **Contrabass.** At the tip of a down-bow on the low strings, the bow hand of the hippo goes up
  to 0.25 H into its belly (design 5.3).
- **Piano.** In the default demo, the arms of the polar bear go up to 0.32 H into the trunk and
  up to 0.17 H into the thighs while it plays. The left arm crosses the chest for the high notes.
- **Harp.** In the default demo, the left upper arm of the deer goes up to 0.20 H into the trunk
  while it plays.
- **Timpani.** In the Beethoven 9 demo, the left arm of the elephant goes up to 0.19 H into the
  torso when the left hand reaches across to a far kettle. Elbows nearer to the body made it
  0.22 H to 0.25 H, so the timpani keeps its elbows.
- **Cymbals.** The arms of the badger go 0.07 H into the trunk while it plays.

A play clearance test of the piano, the harp, and the percussion would find these faults.

## 7. Images

![The bowed strings before and after, in play and at rest, and two crops of orchestra-latest.png](2026-10-10-arms-close/bowed-strings.webp)

Close views of the gallery: the rabbit and the red fox with the violin, and the dog with the
cello. In play, the left elbow comes in under the violin and down beside the cello. At rest, the
left arm hangs at the side. The rest bow arm stays out (section 5).

![The flute, the bassoon, the horn, the trombone, and the singer before and after, and crops of the references](2026-10-10-arms-close/winds-brass-choir.webp)

Crops of `species-sheet.webp` of `pnpm screenshots --sheet` before and after, in play, and crops
of `animals.webp`, `orchestra-latest.png`, and `orchestra-side.png`.
