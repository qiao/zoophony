# Audit of the pose and scene code

Date: 2026-10-05. Base commit: `4aef40d`.

This audit is a code quality audit: simplification, reuse, dead code, altitude, and drift from
`AGENTS.md`. It is not a bug hunt. The audit made no change to the code. A manager assigns the
fixes later.

## Scope

- `src/pose/`, `src/scene/`, `src/gallery/`, `gallery.html`, `src/main.ts`,
  `tools/screenshots.ts`, and their tests.
- 62 files and 8,366 lines, in two modules: `pose/` (5,600 lines with the tests), and `scene/`
  with `gallery/`, `main.ts`, and the screenshot tool (2,700 lines).
- The audit did not read `src/models/`, because another agent rebuilds it now. It did not read
  `src/audio/`, `src/midi/`, and `src/score/`. `docs/audits/2026-10-05-steps-0-2.md` audits them.
- Angles: simplification, efficiency, and altitude for each module. Reuse, conventions, and test
  quality over the full scope.
- The audit does not repeat the findings of `docs/reviews/step-3.md` and
  `docs/reviews/step-4.md`. All their findings in this scope have the status `fixed`.

Checks that ran:

| Check | Result |
|---|---|
| `oxlint --type-aware` on the scope | 0 diagnostics |
| `oxfmt --check` on the scope | 61 files, all correct |
| `vitest run src/pose src/scene src/gallery`, 2 workers | 143 tests pass, 10.2 s of file time |
| `poseAt()` with `perf-60.mid`, Node 24, 3,000 frames | 0.29 to 0.30 ms for each frame |
| Bytes that one `poseAt()` frame allocates, `perf-60.mid` | 225 to 241 KB |
| Time of one build of each player model of `perf-60.mid` (21 kinds) | 26 to 29 ms |
| 8 mutations of `src/pose/` in a scratch copy | All 8 pass all tests of `src/pose/` (finding 7) |
| `buildStrokes()` with a held note and 10 later notes | The double stop ends after 8 notes (possible bug 1) |

The load average of the Mac was 7 to 11 during the runs, because other agents worked at the
same time. Thus the times are high. The ratios between them are correct.

The 10 slowest test files of the scope, from one run:

| File | Tests | Time |
|---|---|---|
| `src/pose/pose-timing.test.ts` | 7 | 6,853 ms |
| `src/pose/pose-speed.test.ts` | 2 | 2,231 ms |
| `src/pose/winds.test.ts` | 8 | 458 ms |
| `src/pose/idle.test.ts` | 6 | 280 ms |
| `src/pose/bowed.test.ts` | 12 | 99 ms |
| `src/pose/pose-at.test.ts` | 10 | 87 ms |
| `src/pose/random.test.ts` | 5 | 54 ms |
| `src/scene/player.test.ts` | 3 | 45 ms |
| `src/scene/stage-scene.test.ts` | 1 | 30 ms |
| `src/pose/strokes.test.ts` | 14 | 8 ms |

`pose-timing.test.ts` takes 67% of the time of the scope. Finding 4 makes it about 20 times
faster.

## How to read the findings

The findings are in the order of their payoff: the lines or the complexity that the fix
removes, against the risk of the fix.

- **Lines** is the estimate of the lines that the fix removes. A negative value means that the
  fix adds lines.
- **5b-2** tells if the fix touches files that step 5b-2 changes next: the poses of the piano,
  the harp, the percussion, the choir, and the conductor. Those poses add code to
  `pose-at.ts`, `plan.ts`, `ik.ts`, the test helpers, and new family files. "yes, before" means
  that the fix is cheaper before step 5b-2, because step 5b-2 copies the current pattern again.

| # | Finding | Lines | Risk | 5b-2 |
|---|---|---|---|---|
| 1 | The static violin pose of step 3 and its users | 320 | low | no |
| 2 | Two copies of the arm and shoulder rig in `bowed.ts` and `winds.ts` | 60 | low | yes, before |
| 3 | One nullable field and one scratch state for each motion family | 35 | low | yes, before |
| 4 | The pose timing test poses all players to sample one player | 60 | low | yes, before |
| 5 | Copies of the test helpers in the pose tests | 50 | low | yes, before |
| 6 | Copies of the note grouping in `strokes.ts`, `wind-notes.ts`, and `passages.ts` | 40 | low | yes, before |
| 7 | Eight design values that no test pins | -30 | low | partly |
| 8 | Each player model is built three times for each score | 10 | medium | no |
| 9 | Two copies of the place of the conductor | 8 | low | yes, before |
| 10 | The instrument frame, `TorsoFrames`, and two output forms | 15 | low | yes |
| 11 | The easing helpers live in `rest.ts`, and a copy of the time search | 15 | low | yes |
| 12 | The gallery copies values and code of `scene/` | 15 | low | no |
| 13 | Hand-made notes in two pose tests | 5 | low | no |
| 14 | The screenshot tool builds one shot two times | 6 | low | no |
| 15 | Three files above 400 lines | 0 | low | yes |
| 16 | The allocation of a frame | 0 | none | no |
| 17 | Stale step text and other drift from `AGENTS.md` | 0 | none | partly |
| 18 | Exports with no importer | 0 | none | no |

Total of the table: about 610 lines. Finding 1 waits for the gallery task of step 5. Findings
2 to 6 and 9 are the set to apply before step 5b-2 (about 250 lines).

## Findings

### 1. The static violin pose of step 3 and its users

Sites:

- `src/pose/violin-pose.ts` (176 lines) and `src/pose/violin-pose.test.ts` (106 lines). The
  only importer in the code is `src/scene/player.ts:13`.
- `staticPose()` at `src/scene/player.ts:130-141`, the `pose` field of `PlayerKind` at
  `src/scene/player.ts:126-127`, and its use at `:162` and `:166-168`. The test is at
  `src/scene/player.test.ts:43-50`.
- In the gallery: `BIND_POSE` at `src/gallery/main.ts:82-88`, the `playing` field at `:78-79`,
  `staticPose(model)` at `:118`, and the pose switch at `:285-289`.

Problem: `poseAt()` replaced the static pose (design 4.7, the last item). `bowedRig()` in
`src/pose/bowed.ts:439-509` calculates the same points as `violinPoints()` with other names.
`scene/` now decides a pose rule (`id === 'violin' || id === 'viola'`), and design 7.1 puts the
pose rules in `pose/`. Two TODO tasks of step 5 are still open: "Connect the time slider and
the test note list of the gallery to `poseAt()`", and "Wire the app".

Change: delete the step 3 pose in the commit that connects the gallery to `poseAt()`. Then
`createPlayers()` shows the bind pose until the first frame of `poseAt()`. Update design 7.1
(`docs/design.md:1935`) and the row of section 10 (`docs/design.md:2518`) in the same commit.

The gallery has no `Score` and no `SceneLayout`, but `preparePoses()` needs both. Thus the
gallery task needs a smaller entry. Split `preparePoses()` at `src/pose/plan.ts:227-283` into
a function for one player, and let the gallery call it with the test notes:

```typescript
/** The inputs of the plan of one player, without a full score. */
export interface PlayerInputs {
  readonly model: PlayerModel;
  readonly cast: PlayerCast;
  /** The notes of the player, sorted by start, with their loudness. */
  readonly notes: readonly PlayerNote[];
  readonly loudness: readonly number[];
  readonly position: Vec3;
  readonly facing: number;
  /** The head of the conductor, for the looks. */
  readonly lookTarget: Vec3;
}

/** Calculates the plan of one player. `preparePoses()` calls it for each player. */
export declare function preparePlayer(inputs: PlayerInputs, seed: number): PlayerPlan;
```

Lines: about 320. Risk: low. The bowed tests already cover the playing pose of the violin.

### 2. Two copies of the arm and shoulder rig in `bowed.ts` and `winds.ts`

Sites:

- `REACH = 0.97`: `src/pose/bowed.ts:138` and `src/pose/winds.ts:132`.
- The reach of an arm, `REACH * (|elbow - shoulder| + |wrist - elbow|)`:
  `src/pose/bowed.ts:400` and `src/pose/winds.ts:255-256`.
- The posed shoulder: `ShoulderPlace` and `shoulderAt()` at `src/pose/bowed.ts:241-246` and
  `:330-337`. `PosedShoulder` and `shoulderOf()` at `src/pose/winds.ts:198-203` and
  `:215-227`. The two functions do the same calculation.
- The bind of an arm from the bone names: the `arm` closure at `src/pose/bowed.ts:477-481`,
  and the `side` closure at `src/pose/winds.ts:282-295`. The palms from the hand bones:
  `src/pose/bowed.ts:502-503` and `src/pose/winds.ts:291`.
- The `BONES` tables: `src/pose/bowed.ts:143-156`, `src/pose/winds.ts:134-147`, and
  `src/pose/pose-at.ts:48-57`. The arm entries (8 bones) are in two of them.
- The finger curls: `src/pose/bowed.ts:594-599` and `src/pose/winds.ts:402-411`.

Problem: step 5b-2 adds four more families with arms: the piano hands, the harp hands, the
mallets, and the baton. Each one copies these lines again. A change of the reach share or of
the shoulder rule then needs six edits.

Change: put one arm rig in `src/pose/ik.ts`. Each family rig holds two of them.

```typescript
/** One side of the body in the bind pose, in the model axes. */
export interface ArmRig {
  /** The bind position of the `shoulder` bone. */
  readonly clavicle: Vec3;
  readonly bind: ArmBind;
  /** The palm, from its hand bone. */
  readonly palm: Vec3;
  /** The longest distance from the shoulder joint to the wrist: 97% of the arm. */
  readonly reach: number;
  /** The bone indices of `upperArm`, `forearm`, `hand`, `shoulder`, and `fingers`. */
  readonly bones: ArmBones;
}

/** Reads the arm of one side from a player model. */
export declare function armRig(model: PlayerModel, side: 'L' | 'R'): ArmRig;

/** Turns the shoulder bone and gives its world rotation and the posed shoulder joint. */
export declare function poseShoulder(arm: ArmRig, chest: Frame, chestBind: Vec3, turn: Quat): Frame;
```

```text
              ik.ts
   +-----------------------------+
   | ArmRig, armRig()            |
   | poseShoulder(), writeArm()  |
   | writeCurl()                 |
   +-----------------------------+
      ^        ^         ^      ^
      |        |         |      |
 bowed.ts  winds.ts  keyboard.ts  conductor.ts (step 5b-2)
```

Lines: about 60, and no copies in step 5b-2. Risk: low. `bowed.test.ts` and `winds.test.ts`
check the palms on the grips and the bind lengths of the arms.

### 3. One nullable field and one scratch state for each motion family

Sites:

- `PlayerPlan.bowed` and `PlayerPlan.wind` are nullable, next to `family`:
  `src/pose/plan.ts:60` and `:76-79`.
- Two rig caches and two branches: `src/pose/plan.ts:97-101` and `:235-262`.
- The null guards in `poseAnimal()` for a family that always has its plan:
  `src/pose/pose-at.ts:195-199` and `:207-224`.
- One scratch state for each family as a parameter: `bow` and `wind` at
  `src/pose/pose-at.ts:188-189`, created at `:272-273`.
- Four lists of the families of the instruments: `MOTION_FAMILIES` at
  `src/pose/family.ts:18-41`, `isBowed()` at `src/pose/bowed.ts:41-43`, `WindInstrument` at
  `src/pose/winds.ts:28-36`, and `isWind()` at `src/pose/winds.ts:114-116`.

Problem: step 5b-2 adds five families. With the current pattern, `PlayerPlan` gets five more
nullable fields, `preparePoses()` five more caches, and `poseAnimal()` five more parameters.
The type system cannot tell that a `bowed` player always has its bow plan.

Change: make the note layer a union that the family selects. Derive the instrument types and
the guards from `MOTION_FAMILIES`. Pass one scratch object.

```typescript
/** The note data of one player, by motion family. */
export type NoteLayer =
  | { readonly family: 'bowed'; readonly rig: BowedRig; readonly strokes: readonly Stroke[];
      readonly starts: Float64Array }
  | { readonly family: 'woodwind' | 'brass'; readonly rig: WindRig; readonly track: WindTrack }
  /** The families of step 5b-2 keep the rest pose until their note layer exists. */
  | { readonly family: 'keyboard' | 'harp' | 'percussion' | 'choir' | 'conductor' };

/** The instruments of one motion family. */
export type InstrumentOf<F extends MotionFamily> = {
  [K in InstrumentId]: (typeof MOTION_FAMILIES)[K] extends F ? K : never;
}[InstrumentId];

/** The states that `poseAt()` writes for each player, made one time for each call. */
interface FrameScratch {
  readonly idle: IdleState;
  readonly bow: BowState;
  readonly wind: WindState;
}
```

`PlayerPlan` then holds `note: NoteLayer` in place of `family`, `bowed`, and `wind`. A switch on
`player.note.family` narrows the type, so the guards go away. The tests read
`plan.bowed.strokes` and `plan.wind.track` at about 10 sites. They change to `plan.note`.

Lines: about 35, and no growth in step 5b-2. Risk: low. The type checker finds each site.

### 4. The pose timing test poses all players to sample one player

Sites:

- `eventInPose()` at `src/pose/pose-timing.test.ts:125-134` and `arrivalInPose()` at
  `:250-261` call `poseAt()` for the full scene at each sample of 0.5 ms. They read one player.
- The two sample loops and the two check loops are copies: `:117-145` against `:244-270`, and
  `:156-192` against `:273-305`.
- The two Beethoven tests each load all demos and build the same scene: `:202-206` and
  `:316-320`.
- `chordNotes()` at `:61-63` copies `chord()` of `src/midi/test-smf.ts:176`.
- The block "the seeded offsets" at `:326-341` repeats `src/pose/pose-at.test.ts:143-154`.
- The block "the rest rules" at `:343-371` repeats `src/pose/bowed.test.ts:323-333`,
  `src/pose/winds.test.ts:187-192`, and `src/pose/rest.test.ts:22-65`.

Problem: the file takes 6.9 s of the 10.2 s of the scope. The Beethoven scene has 20 to 60
players, so each sample does 20 to 60 times the needed work. The Beethoven wind test needs a
timeout of 20 s. Step 5b-2 adds timing tests for the mallets and the piano, and they will copy
the sample loop again.

Change:

- Pose only the player under test. `poseAt()` reads the seat from the player plan, so a plan
  with one player gives the same pose: `poseAt({ ...scene.plan, players: [player] }, ...)`.
- Put one sampler in `src/pose/test-kinematics.ts`:
  `sampleAround(plan, player, from, to, measure)`. The bowed and the wind checks use it.
- Build the Beethoven scene one time in a `beforeAll`.
- Delete `chordNotes()`, the offset block, and the rest block. Move the spread check
  (`> 0.005`) of the offset block into `pose-at.test.ts`.

Lines: about 60. Time: from 6.9 s to less than 0.5 s (estimate). Risk: low. The test checks the
same events with the same tolerance.

### 5. Copies of the test helpers in the pose tests

Sites:

- The turn angle `2 * Math.acos(Math.min(1, Math.abs(w)))`: `src/pose/winds.test.ts:118-122`
  (`turnOf`), `src/pose/bowed.test.ts:319-320`, and `src/pose/pose-timing.test.ts:241` and
  `:349-350`.
- `posedAt()`: `src/pose/bowed.test.ts:67-81` and `src/pose/winds.test.ts:82-96`.
- The first player of each instrument with its model: `bowedPlayers` at
  `src/pose/bowed.test.ts:50-65` and `windPlayers` at `src/pose/winds.test.ts:71-80`.
- The check of the bind lengths of the arms: `src/pose/bowed.test.ts:282-299` with `boneLength`
  at `:120`, `src/pose/winds.test.ts:153-171`, and `src/pose/violin-pose.test.ts:86-105`.
- The instrument turn of a muted seat: `src/pose/bowed.test.ts:307-321`,
  `src/pose/winds.test.ts:195-204`, and `src/pose/pose-timing.test.ts:347-351`.

Problem: each family test of step 5b-2 needs the same five helpers. With the current pattern,
it copies them.

Change: move `turnOf()`, `posedAt()`, `armLengthErrors()`, and `instrumentTurn()` to
`src/pose/test-kinematics.ts`. Move `firstPlayers(scene, instruments)` to
`src/pose/test-scene.ts`.

Lines: about 50. Risk: low.

### 6. Copies of the note grouping in `strokes.ts`, `wind-notes.ts`, and `passages.ts`

Sites:

- The chord window of 50 ms: `BOW_MOTION.chordSec` at `src/pose/strokes.ts:11` and
  `WIND_MOTION.chordSec` at `src/pose/wind-notes.ts:11`. Design 5.3 gives the value one time,
  "as a chord of 3.8".
- The phrase gap of 0.5 s: `BOW_MOTION.phraseGapSec` at `src/pose/strokes.ts:13` and
  `WIND_MOTION.phraseGapSec` at `src/pose/wind-notes.ts:13`.
- The chord groups: the loop at `src/pose/strokes.ts:231-265` and `windNotes()` at
  `src/pose/wind-notes.ts:135-150`.
- The join of notes into spans with a gap: `buildPassages()` at `src/pose/passages.ts:38-59`
  and the phrase loop at `src/pose/wind-notes.ts:185-196`.
- The envelope of a span that rises before the start and falls after the end, with the larger
  of the current and the previous span: `passageWeight()` and `activityAt()` at
  `src/pose/passages.ts:69-98`, and `phraseBreath()` with its call at
  `src/pose/wind-notes.ts:245-256` and `:304-305`.
- The gesture size `(0.6 + 0.6 × loudness) × amplitude` (design 5.1, 5.3):
  `src/pose/strokes.ts:278` and `src/pose/pose-at.ts:166`.

Problem: the piano and the harp of step 5b-2 also group chords, and the choir needs phrases.
A change of the chord window now needs two edits, and in step 5b-2 four.

Change: add `src/pose/note-groups.ts` with `CHORD_SEC`, `PHRASE_GAP_SEC`, `groupChords()`,
`joinSpans(notes, gapSec)`, and `spanEnvelope()`. Move `gestureSize(loudness, amplitude)` to
`src/pose/loudness.ts`. Fix possible bug 1 in the same change.

```typescript
/** The notes of one player that start within `CHORD_SEC` of each other. */
export interface NoteGroup {
  readonly start: number;
  /** The latest end of the notes of the group. */
  readonly end: number;
  readonly low: number;
  readonly high: number;
  /** The highest loudness of the notes that start in the group. */
  readonly loudness: number;
  /** The index of the first note of the group in the notes of the player. */
  readonly first: number;
}
```

Lines: about 40. Risk: low. `strokes.test.ts`, `wind-notes.test.ts`, and `passages.test.ts`
cover the three users.

### 7. Eight design values that no test pins

Each mutation below ran in a scratch copy. All tests of `src/pose/` stayed green with each one.
The two Beethoven tests of `pose-timing.test.ts` did not run in the copy, because it had no
demo files. They check only the event times, so they cannot see these values.

| Value (design) | Code | Mutation that passes |
|---|---|---|
| Closed finger 50° (5.3) | `src/pose/winds.ts:126` | `curlClosed` 50° to 30° |
| Tremolo 7 Hz (5.3) | `src/pose/strokes.ts:35` | `tremoloHz` 7 to 12 |
| Look pitch at most 0.5 rad (5.1) | `src/pose/plan.ts:167` | the limit 0.5 to 0.05 |
| Pluck 0.035 m above the strings (5.3) | `src/pose/bowed.ts:127` | `pluckHeight` 0.035 to 0 |
| Ear twitch 12° (5.1) | `src/pose/pose-at.ts:42` | `ear` 12° to 0 |
| Sway 2° (5.1) | `src/pose/pose-at.ts:38` | `sway` 2° to 1° |
| Sway lead 0.3 s (5.1) | `src/pose/passages.ts:10` | `leadSec` 0.3 to 0.5 |
| Timing offset from -20 ms to 20 ms (5.3) | `src/pose/plan.ts:232` | `(next() * 2 - 1)` to `next()` |

The test agent also lists these candidates, which the audit did not run: the blink time
(`src/pose/idle.ts:11`, the test at `src/pose/idle.test.ts:44` has only an upper bound), the
sign of the look yaw (`src/pose/plan.ts:164`), the neck share 40% (`src/pose/pose-at.ts:40`),
the chest breath 1° (`:36`), and the wind lean 3° (`src/pose/winds.ts:121`).

Problem: `AGENTS.md` "Tests" says: "A test that passes both ways pins nothing." Each value is a
number of design 5. A wrong edit of one of them passes CI.

Change: assert each value with a tolerance of about 10%, from the real pose. Examples: measure
the curl of a closed finger on a low woodwind note, count the tremolo turns in 1 s with an upper
bound, and assert both signs of the timing offsets. Read the constants from the code, for
example `BODY_MOTION.ear`, so that the test and the design stay one value.

Lines: about -30. Risk: low. The tests of step 5b-2 must pin their own values from the start.

### 8. Each player model is built three times for each score

Sites:

- `layoutScene()` builds each model for the footprints (`src/models/footprint.ts:120`).
- `preparePoses()` builds each model again: `modelOf()` at `src/pose/plan.ts:112-125`.
- `createPlayers()` builds each model a third time: `src/scene/player.ts:155-164`.
- The two caches use the same key, `${species} ${instrument} ${kettles}`:
  `src/pose/plan.ts:118` and `src/scene/player.ts:158`.

Problem: `perf-60.mid` has 21 kinds of player. One build of all kinds takes 26 to 29 ms on the
development Mac, so each load does about 55 ms of extra work. A phone at the low tier is about
4 times slower. `buildPlayer()` is pure, so the three builds give the same model.

Change: the app wiring of step 5 builds the models one time and gives them to the three users.
For example, `layoutScene()` returns the models with the layout, or the app passes one
`ModelCache` to the three functions. This touches `src/models/`, so the owner of `models/` makes
the change. Make it in the task "Wire the app".

Lines: about 10, and 55 ms for each load. Risk: medium, because three modules change their
signatures.

### 9. Two copies of the place of the conductor

Sites: `src/pose/plan.ts:217-224` and `src/scene/stage-scene.ts:35-45`. Both put the conductor on
`layout.podium` plus `PODIUM_SIZE[1]`, and both read `PODIUM_SIZE` from `src/models/stage.ts`.

Problem: the rule "the conductor stands on the podium top" is a layout rule (design 4.5), and
`layoutScene()` owns the layout. The conductor pose of step 5b-2 needs the place again, for the
cues to the sections (5.4).

Change: add the conductor to `SceneLayout` in `src/models/`, with `position` and `facing`.
`preparePoses()` and `playerSpots()` read it. The owner of `models/` makes the change.

```typescript
interface SceneLayout {
  // ... the current fields
  /** The bear on the podium top. It faces the orchestra (design 4.5). */
  readonly conductor: { readonly position: Vec3; readonly facing: number };
}
```

Lines: about 8. Risk: low.

### 10. The instrument frame, `TorsoFrames`, and two output forms

Sites:

- `InstrumentPlace` and `onInstrument()` at `src/pose/bowed.ts:215-221` and `:302-304`. The
  same calculation is inline at `src/pose/winds.ts:356-358` and `:379`. `posePoint()` at
  `src/pose/frames.ts:86-88` does it for a `Frame`.
- `TorsoFrames` is at `src/pose/bowed.ts:209-212`, but `src/pose/winds.ts:20` imports it, and
  `shoulderOf()` uses `TorsoFrames['chest']` for a `Frame` (`src/pose/winds.ts:219`).
- `poseBowed()` writes into `rotations` (`src/pose/bowed.ts:532`), and `poseWind()` writes into
  `WindPoseOut` (`src/pose/winds.ts:313-318`, `:353`).

Problem: each family of step 5b-2 places an instrument or a hand on a frame, and imports the
torso type from another family. Two output forms mean that `poseAnimal()` passes different
things to each family.

Change: make the instrument place a `Frame` plus its local rotation, and use `posePoint()`. Move
`TorsoFrames` to `frames.ts`. Give each family pose function the `WritablePose` of the player.

Lines: about 15. Risk: low.

### 11. The easing helpers live in `rest.ts`, and a copy of the time search

Sites:

- `clamp01()` and `smoothstep()` at `src/pose/rest.ts:19-32`. Six files import them:
  `bowed.ts:28`, `passages.ts:3`, `wind-notes.ts:3`, `strokes.ts:3`, `pose-at.ts:10`, and
  `idle.ts:2`. Only `rest.ts` is about the rest pose.
- `valueAt()` at `src/pose/loudness.ts:27-42` copies the binary search of `lastAtOrBefore()` at
  `src/pose/blend.ts:41-53`. Commit `7f6cd96` shared the time search, but did not reach this
  copy.

Change: move `clamp01()` and `smoothstep()` to `blend.ts`, next to `mix()`. Store the controller
times in a `Float64Array` and call `lastAtOrBefore()`.

Lines: about 15. Risk: low.

### 12. The gallery copies values and code of `scene/`

Sites:

- `BIND_POSE` at `src/gallery/main.ts:83-88` copies `BIND_ROTATIONS` of
  `src/pose/frames.ts:15-17`. Finding 1 removes it.
- The camera at `src/gallery/main.ts:227` repeats `FIELD_OF_VIEW` and `NEAR` of
  `src/scene/view.ts:5-8` as `30` and `0.1`.
- The floor material at `src/gallery/main.ts:206-210` repeats the roughness and the metalness
  of the matte material at `src/scene/geometry.ts:12-17`.
- The gallery removes the beam with an `instanceof Mesh` filter and changes the shadow radius
  after `createLights()`: `src/gallery/main.ts:216-225`. An option of `createLights()` at
  `src/scene/lights.ts:129` does this directly.
- The beam color `#e8dcc0` is at `src/scene/lights.ts:104` and as `FLOOR_LIGHT.color` at
  `src/scene/stage.ts:28`.
- The turn of the box of a model and the move of its center (`src/gallery/main.ts:169-199`) is
  pure arithmetic with no test. The step 4 review fixed a defect in it (F2).

Change: import the constants. Give `createLights()` the option
`{ beam: boolean; shadowRadius?: number }`. Move the box arithmetic to `src/gallery/items.ts` as
a pure function, with a test. Do this with the gallery task of step 5, because that task changes
`src/gallery/main.ts`.

Lines: about 15. Risk: low.

### 13. Hand-made notes in two pose tests

Sites:

- `n()` at `src/pose/wind-notes.test.ts:18-20` makes `PlayerNote` objects by hand for
  `windNotes()` and `buildWindTrack()` (`:65`, `:71`, `:79`, `:108`).
- `strokesOf()` at `src/pose/strokes.test.ts:28-43` uses a real score, but it groups the notes
  by player again and selects the tuning with `section === 'cello' ? cello : violin`. The code
  uses `TUNINGS[cast.instrument]` (`src/pose/plan.ts:247`).

Problem: `AGENTS.md` "Tests" says: "Build test inputs with the real `midi/` and `score/`
modules." A viola or a contrabass in `strokes.test.ts` gets the wrong tuning.

Change: read the strokes from `sceneOf(file).plan`. Build the wind notes with
`scoreOf(file, 'one-per-part')`. At `tempo(0, 125)` and 480 ticks for each quarter note, one
tick is 1 ms, so the test times stay exact.

Lines: about 5. Risk: low.

### 14. The screenshot tool builds one shot two times

Site: `speciesSheet()` at `tools/screenshots.ts:135-141` builds the shot of the species page.
The `gallery()` helper at `:46-52` builds the same path and the same ready selector.

Change: make `gallery()` a module function and call it in both places.

`tools/screenshots.ts:41` uses the query `?demo=`. Step 6 removes the query
(TODO.md, step 6, the URL hash task). That task must change the screenshot tool in the same
commit.

Lines: about 6. Risk: low.

### 15. Three files above 400 lines

Sites: `src/pose/bowed.ts` (600 lines), `src/pose/strokes.ts` (460), and `src/pose/winds.ts`
(415).

`AGENTS.md` sets no line limit. The task of this audit gives about 400 lines as the mark.
Finding 2 removes about 40 lines from `bowed.ts`. Then move the holds, `bowedRig()`, and
`bowRangeOf()` (`src/pose/bowed.ts:45-122` and `:248-509`, about 330 lines) to a new
`bowed-rig.ts`. `bowed.ts` keeps `poseBowed()` and its helpers.

Lines: 0. Risk: low.

### 16. The allocation of a frame

Measurement: one `poseAt()` frame for `perf-60.mid` allocates 225 to 241 KB. The cause is the
small arrays of `models/math.ts` (each `add`, `rotate`, and `multiply` returns a new tuple),
`chainFrames()`, and the side arrays of `poseWind()` (`src/pose/winds.ts:361-376`). At
60 fps this is about 14 MB of short-lived objects each second. V8 collects them in a scavenge
of 0.04 to 0.08 ms about one time each second. `poseAt()` takes 0.29 to 0.30 ms for each frame.
Both are far below the 4 ms of the main thread (design 9.7).

Problem: the comment at `src/pose/pose-at.ts:18` says "so that a frame allocates no new arrays".
That is false. The pose buffers are reused, but the calculation allocates.

Change: correct the comment to "so that a frame makes no new pose buffers". Do not rewrite the
math with output parameters now. Measure again after step 5b-2, when 14 more players get arms.
If the scavenges then show in the frame trace of 9.7, start with `chainFrames()` and
`writeArm()`.

Lines: 0. Risk: none.

### 17. Stale step text and other drift from `AGENTS.md`

Rule: "When you move or delete code, update all pointers, comments, and TSDoc references."
`poseAt()` exists now. These texts give "step 5" or "before `poseAt()` exists" as the end of the
static pose:

- `docs/design.md:1935` and the row at `docs/design.md:2518`.
- `src/scene/stage-scene.ts:57-58`.
- `src/scene/player.ts:126` and `:131-133`.
- `src/gallery/main.ts:78` and `:267-268`.
- `src/pose/pose-at.ts:233-234`: "comes in later steps (TODO.md, step 5)". Step 5 is the
  current step. Write "later tasks of step 5".

Finding 1 removes most of these. Until then, write "until the gallery uses `poseAt()`".

Rule: "A function or method comment starts with a verb phrase."

- `src/pose/bowed.test.ts:22`, `src/pose/pose-timing.test.ts:60`, `:86`, `:238`,
  `src/pose/winds.test.ts:118`, and `src/scene/lights.test.ts:15` start with a noun phrase.

Rule: "Use `@param`, `@returns`, and `@throws`."

- `pieceOn()` at `src/pose/violin-pose.ts:60-65` has only `@throws`. Finding 1 deletes it.
- `facingOf()` at `src/gallery/main.ts:62-66` has no tags.

Rule: "Use no underscore prefixes."

- `_type` at `src/scene/pixel-ratio.test.ts:15` and `:19`.

Rule: "descriptive sentences of at most 25 words". These sentences have 32 to 37 words:
`src/pose/pose-timing.test.ts:111`, `src/gallery/items.ts:70-71`, `src/pose/plan.ts:204`,
`tools/screenshots.ts:33`, `src/pose/bowed.test.ts:131`, and `tools/screenshots.ts:125`. Each
one is a list after a colon. Split the list into a second sentence.

The audit found no em dash, no semicolon splice, no "X, not Y", no banned word, no banner
comment, no TypeScript `private`, no double cast, no `sort()`, and no conditional spread in the
scope.

Lines: 0. Risk: none.

### 18. Exports with no importer

These constants have no importer outside their own file, also in the tests:

- `src/pose/`: `BODY_MOTION` (`pose-at.ts:33`), `REST_TIMES` (`rest.ts:4`), `LOOK_LIMITS`
  (`plan.ts:39`), `FINGERBOARD_SEMITONES` (`strokes.ts:58`), `BOWED_HANDS` (`bowed.ts:125`), and
  `WIND_HOLDS` (`winds.ts:77`).
- `src/scene/`: `SPOT_HEIGHT_IN_SIDES`, `SPOT_ANGLE`, `SPOT_PENUMBRA`, `SPOT_COLOR`,
  `FILL_COLORS`, `SPOT_ILLUMINANCE`, `BEAM_RADIUS_IN_SIDES`, `BEAM_TOP_OPACITY`
  (`lights.ts:18-50`), `FLOOR_SIZE_IN_SIDES`, `FLOOR_SHADOW_OPACITY`, `createFloorLight`
  (`stage.ts:18-64`), `SMALL_SCREEN_SIDE` (`quality.ts:26`), and `DEFAULT_ELEVATION`,
  `DEFAULT_AZIMUTH`, `DEFAULT_DISTANCE_IN_SIDES` (`view.ts:11-17`).

The exported types are part of exported signatures, so they stay.

Change: let the tests of finding 7 read the pose constants. Remove `export` from each constant
that still has no importer after that.

Lines: 0. Risk: none.

## Possible bugs (out of scope, for a code review)

1. **A held note leaves the double stop after 8 notes.** `src/pose/strokes.ts:245` looks back
   at most 8 notes for a note that still sounds. Design 5.3 says: "A note that still sounds at
   a new stroke joins it." Confirmed with `buildStrokes()`: a G3 from 0 s to 6 s and ten E5 notes
   from 0.5 s, each 0.4 s long. The strokes from 0.5 s to 4.0 s have the string 2.5 (a double
   stop). The strokes at 4.5 s and 5.0 s have the string 3, while the G3 still sounds. Fix: keep
   the notes that still sound in a list, as `src/score/players.ts:281` does.

## Unverified

1. **An assertion that may never run.** `src/pose/pose-at.test.ts:121` checks the head pitch only
   `if (idle.look === 0)`. The look of the window can be active at that wall time, and then the
   test checks nothing. Steps: change `src/pose/pose-at.ts:133` to add `+ 0.01` to `pitch`. Run
   `pnpm vitest run src/pose/pose-at.test.ts`. If the test passes, the branch does not run. Fix:
   select a wall time with no look from `idleAt()`, then assert with no `if`.
2. **The loudness of a unison in a merged seat.** `noteLoudness()` finds the channel of a note
   of a merged seat from the key `seat pitch start` (`src/pose/loudness.ts:69`, `:102`, and `:110`).
   Two sources of one seat that play the same pitch at the same time give one key, and the map
   keeps the channel of the last note on. Both notes then get the controllers of that channel.
   Steps: build a file with two channels that `assignSeats()` merges into one seat. Play the
   same note on both, with CC 7 at 20 on one channel and 127 on the other. Compare the two
   values of `noteLoudness()`. A fix belongs in `score/`: a `PlayerNote` can carry its synth
   channel, because the timeline already links each event to its note.

## Status

Date: 2026-10-05. The fixes of findings 2 to 7 ran before step 5b-2, with no change of behavior
except the three fixes below. Findings 1, 8 to 15, and 18 are not touched, so they stay open.

| Item | Verdict | Commits | What is left |
|---|---|---|---|
| Finding 2 | fixed | `3dc9cf3` | Nothing. `ArmRig`, `armRig()`, `poseShoulder()`, and `writeCurl()` are in `ik.ts`. |
| Finding 3 | fixed | `c634842`, `6bb4927` | Nothing. `PlayerPlan.note` is a `NoteLayer` union, and `poseAt()` passes one `FrameScratch`. |
| Finding 4 | fixed | `a7343ac`, `7809f90` | Nothing. A delay of 6 ms of the note layer fails all four timing tests. |
| Finding 5 | partly fixed | `cfc9928` | The arm length check of `violin-pose.test.ts` stays. Finding 1 deletes that file. |
| Finding 6 | fixed | `dcd2531`, `e9c368f`, `c00b7c5`, `1832a23` | Nothing. `note-groups.ts` holds the chord window, the phrase gap, the chord groups, the span join, and the span envelope. |
| Finding 9 | fixed | `6439067` | Nothing. `SceneLayout.conductor` holds the place of the bear. `preparePoses()`, `playerSpots()`, and the obstacle of `layoutScene()` read it. |
| Finding 7 | fixed | `400b385`, `5b5918d`, `f46be1f`, `f5ea8ec`, `e2002b1`, `e2f933f` | Each of the 8 mutations now fails one new test. The 5 candidates that the audit did not run stay open. |
| Finding 16 | fixed | `e0436ae` | Measure the allocation again after step 5b-2. |
| Finding 17 | partly fixed | `6bb4927` | Only the step text of `pose-at.ts` is correct now. The other items stay open. |
| Possible bug 1 | fixed | `2a9bd8a` | Nothing. The strokes keep the notes that still sound in a list. |
| Unverified 1 | rejected | `b9635a9` | Nothing. A head pitch 0.01 rad too high fails the check in the branch (now `pose-at.test.ts:129`), so the branch runs. The test now asserts the end of the look with no `if`. |
| Unverified 2 | fixed | `5694198`, `960df89` | Nothing. The bug was real: a unison on two channels gave both notes 0.787, and the note with CC 7 at 20 must get 0.124. `PlayerNote` now carries `synthChannel` (design 3.2, row in section 10). |

Three commits change behavior on purpose:

- `dcd2531`: a passage ends at a rest of exactly 0.3 s, as design 5.1 says ("rests shorter than
  0.3 s"). This rule lets the passages and the phrases share one span join.
- `2a9bd8a`: a held note stays in the double stop after 8 later notes (possible bug 1).
- `960df89`: each note of a unison in a merged seat reads its own controllers (unverified 2).

Measurements after the fixes (the load average of the Mac was 10 to 20):

| Measure | Before | After |
|---|---|---|
| `poseAt()` with `perf-60.mid`, 5 runs of 3,000 frames | 0.29 to 0.30 ms | 0.30 to 0.31 ms |
| File time of `vitest run src/pose` | 10.5 s, 105 tests | 4.7 s, 121 tests |
| `src/pose/pose-timing.test.ts` | 6.8 s, 7 tests | 1.0 s, 4 tests |

`pose-speed.test.ts` failed in some runs of the full suite (1.02 to 1.58 ms against the limit of
1 ms). The base commit `f7d6cf5` also failed it in the same load (1.18 ms). The test passes alone.

Step 5b-2 (the percussion and the conductor, up to `5cdd62e`) measured finding 16 again. A
young generation of 512 MB kept the scavenges out of the window of 200 frames:

| Measure (`perf-60.mid`, Node 24) | Base `51faba0` | After step 5b-2 |
|---|---|---|
| `poseAt()`, 5 runs of 3,000 frames | 0.33 to 0.37 ms | 0.35 to 0.38 ms |
| Bytes that one frame allocates | 2.16 MB | 2.32 MB |

The value of 225 to 241 KB above was low, because scavenges ran in its window. Each player
allocates 35 to 45 KB in a frame, and the conductor with the frame states 31 KB. The TODO task
that replaces the tuple math (step 5) cuts this allocation.

The step 5 task that replaced the tuple math with the math classes of three.js (`77c80f9` to
`1c04801`) measured finding 16 again. A semi-space of 256 MB (a young generation of 512 MB) kept
the scavenges out of a window of 80 frames:

| Measure (`perf-60.mid`, Node 24) | Base `c1ade43` | After `1c04801` |
|---|---|---|
| `poseAt()`, 5 runs of 3,000 frames | 0.36 to 0.40 ms | 0.088 to 0.091 ms |
| Bytes that one frame allocates | 2.36 MB | 0.08 MB |

The step 5 app wiring (2026-10-05, `b5be387` to `4b3d4a3`) fixed findings 1 and 8, and a part of
finding 12:

| Item | Verdict | Commits | What is left |
|---|---|---|---|
| Finding 1 | fixed | `fe40aa0`, `63b4924`, `4b3d4a3` | Nothing. `preparePlayer()` and `prepareConductor()` give the plan of one animal. The gallery plays the test notes with them, and the violin pose of step 3 and `staticPose()` are gone. |
| Finding 5 | fixed | `4b3d4a3` | Nothing. The arm length check of `violin-pose.test.ts` went with that file. |
| Finding 8 | fixed | `b5be387`, `70fa4a0`, `36f4e52`, `e014543`, `b05d179` | Nothing. The page makes one `ModelCache` for each demo, and `layoutScene()`, `preparePoses()`, and `StageScene.show()` share it. A footprint comes from a model. |
| Finding 12 | partly fixed | `63b4924` | `BIND_POSE` of the gallery is gone. The camera values, the floor material, the beam filter, the beam color, and the box arithmetic of the gallery stay open. |
