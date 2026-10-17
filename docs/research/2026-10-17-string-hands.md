# The hands of the string players: the app, a position planner, and a motion spec

Research of 2026-10-17, round `string-hands`, base commit `35121846`. The round changes no app
code. On 2026-10-17 the user wrote: "currently, the violin, viola, and cello players are moving
their left hand up and down too much, whereas in reality many notes do not need to move hand, just
need to move fingers. Do a deep research on how professional players move their hands/fingers
(both left and right) and adjust the the movement's accordingly". The user then asked to
"document the professional movements so that they can be referenced later".

The facts of the technique, with their sources, are in the reference
[`docs/reference/string-technique.md`](../reference/string-technique.md). This report points to its
sections as "reference 1.5" and so on. The report holds the measures of the app, the prototype of
a position planner, and the motion spec of the code round. The probes are in
[`2026-10-17-string-hands/`](2026-10-17-string-hands/).

## 1. The fault

`stopOf()` of `pose/strokes.ts` takes the highest open string at or below the pitch, and
`fingerboardPlace()` gives each pitch its own place of the hand. `stopHandAt()` of `pose/bowed.ts`
puts the middle of the finger block on that place. Thus each new pitch moves the whole hand. A real
player keeps the hand in a position, and the fingers reach the notes of the position on all strings
(reference 1.2).

```text
 App today: the hand follows each pitch       A player: the hand keeps its position
 (violin, A string, notes B C# D E)           (first position, the fingers reach)

 nut                              bridge      nut                              bridge
  |--B----C#---D----E--------------|           |--B----C#---D----E--------------|
     ^                                            [1    2    3    4]  hand frame
     hand (note 1)                                 ^ middle of the frame, still
          ^ hand (note 2)
               ^ hand (note 3)                     fingers 1 to 4 press in turn,
                    ^ hand (note 4)                and the hand does not move
```

## 2. The facts that the spec uses

| Fact | Value | Reference |
|---|---|---|
| Frame of the hand, first finger to fourth finger | Violin and viola 5 semitones, cello 3 (4 with an extension), double bass 2 (closed hand) | 1.2 |
| Thumb position | Cello and double bass, from the octave of the string, thumb to third finger 5 semitones on the cello | 1.2 |
| When to shift | As few shifts as possible, on or after an open string, after a rest or a long note, with the time taken from the note before | 1.4 |
| Shift time | 294 ms to 461 ms for a shift of a third (means of six professionals) | 1.5 |
| Finger against the bow | The new finger lands 26 ms to 41 ms before the bow change, also with a shift or a string change | 1.5, 1.6 |
| What moves in a shift | The forearm at the elbow in the low positions, the elbow a little to the right over the shoulder of the violin, the wrist alone in the high positions | 1.5 |
| Vibrato | 5 Hz to 6.5 Hz, about ±20 cents, wider in high positions and in loud notes | 1.7 |
| Left elbow and string | Violin and viola: to the right for the lower strings. Cello: higher for the lower strings | 1.8 |
| String planes | Violin 15° to 18° between neighbor planes, double bass about 25° | 2.2 |
| String crossing | The shoulder makes it, with a little forearm turn. It leads the bow change by about 15° of the phase of a stroke pair | 2.3 |
| Bow speed and sounding point | About 20 cm/s on the violin. Louder notes move the bow from about 1/8 to about 1/18 of the string from the bridge, with the force from 0.5 N to 2 N, and the speed changes little | 2.4 |
| Fast strokes | The balance point, about 1/3 from the frog, to the middle. 4 to 8 notes a second in fast patterns | 2.3, 2.5 |

## 3. The app today, measured

`hand-moves.ts` runs `buildStrokes()` of `pose/strokes.ts` on the part of the first player of each
bowed seat of the 14 demos. The other players of a seat copy its notes. Each place is in mm from the
nut on a real instrument (328 mm, 370 mm, 690 mm, and 1,060 mm strings), so the measure does not
depend on the body of an animal. A move is a change of the hand place of more than 0.1 mm from one
stroke to the next. The command takes 4.5 s, and `hand-moves.txt` holds its output.

| Instrument | Parts | Strokes | Strokes that move the hand | Mean move | Largest move | Moves for each second of sound | Hand travel |
|---|---|---|---|---|---|---|---|
| Violin | 30 | 29,220 | 19,114 (65.4%) | 37.5 mm | 206 mm | 2.86 | 108 mm/s |
| Viola | 14 | 12,198 | 6,720 (55.1%) | 42.8 mm | 184 mm | 2.23 | 95 mm/s |
| Cello | 14 | 9,014 | 6,563 (72.8%) | 82.4 mm | 306 mm | 2.41 | 199 mm/s |
| Contrabass | 9 | 5,819 | 4,077 (70.1%) | 118.4 mm | 555 mm | 2.48 | 293 mm/s |

Each part moves the hand on 29.5% (violin seat 1 of `beethoven-8-4`) to 91.1% (violin seat 0 of
`bach-bwv1050`) of its strokes. The first violins of the default demo
`boulanger-matin` alternate B5 and A5 in their first 24 strokes. The app moves the hand 27 mm seven
times, and a player keeps the first position and changes between the third and the fourth finger.

## 4. The prototype of a position planner

### 4.1 The model

`planner.ts` holds `planHand()`, a pure function. It reads the pitches and the times of the strokes
of one player and gives each stroke a string, a position, a finger, and the place of the middle of
the hand frame. It is a Viterbi search over the candidates of each stroke: each string that has the
note, and each position whose frame reaches it. A double stop takes two neighbor strings in one
position. The cost of a plan is the sum of these terms:

| Term | Prototype | Sources of the term |
|---|---|---|
| Each shift | 3, times `1 + 0.15 s / dt` (`dt` is the time from the last note start), times 0.3 after an open string or a rest of 0.15 s | Nagata et al. use a Laplace cost of the change of the hand position, with a separate scale after an open string and a rest counted four times as a note (reference [18]). Noguchi: 2.5 for each shift, half after an open string ([19]). Hori and Sagayama scale the hand move by the onset interval (ISMIR 2016). Fischer: take the time from the note before (reference 1.4) |
| Each semitone of a shift | 0.4 | Noguchi: 3.0 for each position of about 2 semitones on the violin, 1.0 on the cello |
| Height of the position | 0.4 for each semitone above the first position, 1 more for the half position, 2 more for the thumb position | Noguchi: 0.06 to 0.2 for the positions II to VII, then 0.1 more for each position. Cheung et al.: professionals prefer the first and the third positions |
| Extension | 2 | Fischer: use extensions sparingly. Noguchi: 0.4 for each semitone past the frame |
| Open string | −0.1 for a short note, 1.5 for a note of at least 0.6 s | Noguchi: 0.25 (G) to 0.65 (E). Cheung et al.: avoid open strings in a lyric line |
| String crossing | 0.2 for each string | Noguchi: 0.5 to a neighbor string, 2.5 for a skip of one string. Bontempi et al.: position change, hand spread, and string change in the ratio 4 : 2 : 1 |

The frames come from reference 1.2:

| Instrument | Reach of the fingers from the first finger | Extension | Thumb position |
|---|---|---|---|
| Violin, viola | −1 to +5 semitones (low first finger to fourth finger) | +1 | None |
| Cello | 0 to +3 | −1 and +1 | From 12 semitones, thumb to third finger 5 semitones |
| Contrabass | 0 to +2 | −1 and +1 (pivot) | From 12 semitones, thumb to third finger 4 semitones |

Hori and Sagayama: "Minimax Viterbi algorithm for HMM-based guitar fingering decision", ISMIR
2016, https://archives.ismir.net/ismir2016/paper/000285.pdf. Bontempi and others, SMC 2024,
arXiv 2407.09052. The other sources are in the reference.

### 4.2 The results

Same parts, same counts. `hand-moves-noguchi.txt` holds a second run with the ratios of the cost
table of Noguchi (the command is in the header of `hand-moves.ts`).

| Instrument | App | Prototype | Prototype, Noguchi ratios | Mean move (prototype) | Moves for each second (prototype) |
|---|---|---|---|---|---|
| Violin | 65.4% | 1.9% (559) | 0.9% (275) | 44.0 mm | 0.08 |
| Viola | 55.1% | 0.5% (61) | 0.4% (44) | 38.0 mm | 0.02 |
| Cello | 72.8% | 4.6% (419) | 2.9% (257) | 83.2 mm | 0.15 |
| Contrabass | 70.1% | 10.0% (579) | 5.1% (296) | 158.3 mm | 0.35 |

A move of the prototype is a shift, so it is larger than a move of the app (44 mm against 37.5 mm on
the violin), and much rarer. The string changes stay near the app: 21.6% against 25.3% of the violin
strokes, and 38% on the cello.

| Instrument | Position of the first finger at most 5 semitones | Open strings | Extensions | Thumb position |
|---|---|---|---|---|
| Violin | 94.7% (88.2% in the first position) | 14.5% | 0.9% | 0% |
| Viola | 99.7% | 18.5% | 0.2% | 0% |
| Cello | 93.5% | 21.0% | 12.6% | 0.2% |
| Contrabass | 86.9% | 23.8% | 8.9% | 1.6% |

These shares agree with the pitch ranges of reference 1.3: most notes of the inner parts fit in the
first position. No source gives the share of the positions of a professional orchestral part, so
the shares are a check of the plan and are no target.

The time from the start of the stroke before a shift to the shift note:

| Instrument | Shifts | 10th percentile | Median | Less than 0.15 s | After an open string or a rest |
|---|---|---|---|---|---|
| Violin | 559 | 0.114 s | 0.357 s | 18.6% | 61.7% |
| Viola | 61 | 0.086 s | 0.231 s | 26.2% | 57.4% |
| Cello | 419 | 0.170 s | 0.417 s | 9.3% | 75.7% |
| Contrabass | 579 | 0.170 s | 0.417 s | 5.2% | 78.1% |

Half of the shifts have less than 0.36 s to 0.42 s, so a shift of the measured 0.3 s to 0.45 s
(reference 1.5) does not fit in each note before it. The spec takes half of the note before, as
Fischer advises (section 5.2).

### 4.3 The passages checked by hand

`hand-moves.txt` prints seven passages and two demo excerpts, note by note, beside the plan of the
app. A star marks a move of the hand.

| Passage | App moves | Prototype moves | Check |
|---|---|---|---|
| Violin, G major scale over three octaves | 21 of 21 | 1 of 21 | Correct. The first position reaches G3 to C6 with the open strings (C6 with the extended fourth finger), and one shift to the ninth semitone takes D6 to G6. A teacher fingers a scale with more and smaller shifts, so the prototype keeps fewer shifts than a scale book |
| Violin, broken G major chord over four strings | 8 of 15 | 0 of 15 | Correct: first position, open D and A, the bow crosses each string |
| Violin, melody on the E string, A5 to E6 and back | 11 of 11 | 1 of 11 | Correct: the hand stays in a high position for the top of the phrase (A5 to E6 with the first finger on A5), then one shift down |
| Cello, C major scale over two octaves | 14 of 14 | 0 of 14 | Correct: first position, fingers 1-3-4 and the open strings, as in a cello method |
| Cello, A major scale up the A string and down | 14 of 14 | 4 of 14 | Correct: one string, so the hand shifts at E4 and G♯4 on the way up and at E4 and D4 on the way down |
| Contrabass, G major scale over two octaves | 14 of 14 | 2 of 14 | Correct: a closed hand of a whole tone needs a shift for each new pair of notes above the open strings |
| Viola, double stops in thirds | 8 of 8 | 0 of 8 | Correct: both notes of each third fit in one position on two neighbor strings |
| First violins of `boulanger-matin`, strokes 1 to 24 | 7 of 23 | 0 of 23 | Correct: B5 and A5 are the fourth and the third finger in the first position |
| Cellos of `beethoven-9`, strokes 1 to 24 | 22 of 23 | 2 of 23 | Correct: a shift up for E4 and F♯4 on the A string, then back down |

## 5. The motion spec

### 5.1 The rule of the plan

The plan comes from the score before the play, as the strokes do today. `buildStrokes()` calls the
planner, and each stroke keeps its step of the plan. `bowStateAt()` reads the strokes and the song
time only, so seek, pause, and speed stay correct (rule "Stateless poses" of `AGENTS.md`).

```text
 Score (notes of one player)
    | preparePoses() -> noteLayerOf()                      (pose/plan.ts)
    v
 buildStrokes()  --- planHand() (new, pose/fingering.ts) ---> HandStep for each stroke
    |                 HAND_FRAMES, FINGERING_COSTS
    v
 Stroke[] { ..., hand: HandStep, slur }                    (pose/strokes.ts)
    | bowStateAt(strokes, starts, time)    shift, finger landing, vibrato,
    v                                      crossing lead, sounding point
 BowState { fingerboard, reach, stopString, vibrato, sounding, ... }
    | poseBowed()                                          (pose/bowed.ts)
    v
 stopHandAt(hand place, stop string, vibrato) + left elbow pole for the string
 bowAt(string, sounding point, tilt) + right arm
```

### 5.2 The left hand

- **L1. Position plan.** A new pure module `pose/fingering.ts` holds `planHand()` of the
  prototype, with the frames of section 4.1 (`HAND_FRAMES`) and the weights (`FINGERING_COSTS`).
  `buildStrokes()` calls it with the strokes and `TUNINGS[instrument]`. It replaces `stopOf()` and
  `stringsOf()`. The hand place of a stroke is the middle of its frame,
  `fingerboardPlace(position + (reach[0] + reach[1]) / 2)`, on the target `fingerboard`. An open
  string keeps the position of the stroke before it. Target: at most 5% of the strokes of the
  violin, the viola, and the cello, and 10% of the contrabass strokes, move the hand
  (`hand-moves.ts`).
- **L2. Shift time and shape.** The hand moves only between two strokes with different positions.
  The shift ends 0.03 s before the new note (the finger lands 26 ms to 41 ms before the bow change,
  reference 1.5). It starts at `max(half of the note before, end − 0.35 s)`: it takes half of the
  note before (Fischer), and at most 0.35 s (the measured 0.29 s to 0.46 s). The shape is the
  quintic ease `10x³ − 15x⁴ + 6x⁵`, so the speed is a bell with no jump at the ends. The finger
  block keeps a light contact in the shift (the guide finger): the press is 0, and the curl stays.
  Replaces `BOW_MOTION.shiftSec` for the hand. The string of the bow keeps its own time (B3).
- **L3. The fingers.** The studio paws have one finger bone (`fingersL`), so the four fingers
  cannot move one by one. In a position, the press of each stopped note (`pressL`) starts 0.03 s
  before the note, with the finger landing, and an open string has no press. The hand turns a
  little toward the finger of the note: a turn of the hand around the normal of the strings of
  `reachTurn × reach`, with `reach` from −1 (the first finger) to +1 (the fourth finger) and
  `reachTurn` about 8°. The finger block also moves across the strings to the stop string: the hand
  rolls around the neck by the string spacing at its place. Default of open question 5.
- **L4. Vibrato.** A stopped note of at least 0.35 s gets vibrato after 0.15 s, with a fade in of
  0.2 s: the hand moves along the string by `width × sin(2π × rate × (t − start))`. Rate 5.5 Hz on
  the violin and the viola, 5.5 Hz on the cello, and 5 Hz on the contrabass, with a seeded change of
  ±0.4 Hz for each player. Width ±20 cents on the violin and the viola, ±15 cents on the cello and
  the contrabass, wider by up to 50% in a high position and in a loud note. In mm at the place of the
  note: `width × L × ln 2 / 1200 × 2^(−k/12)` (reference 1.7), about ±3 mm on the violin and ±5 mm
  on the cello in the first position. The phase comes from the note start, so the pose is
  stateless. An open string and a note in a shift get no vibrato. Default of open question 2.
- **L5. The left elbow and the string.** The left elbow pole (`poleL`) turns with the stop string
  of the finger. Violin and viola: toward the body, under the instrument, by `elbowPerString` (about
  5°) for each string below the highest string. Cello and contrabass: up by about 10° for each
  string below the A string or the G string (reference 1.8). The turn follows the stop string with
  the time of the shift. Above the neck heel (the fourth position of the violin and the viola), the
  elbow swings a further 4° toward the body at the sixth position (reference 1.5). The cello in the
  thumb position raises the elbow (no source of a number: tune in the close views).

### 5.3 The bow arm

- **B1. String planes.** `stringTurn` of `BowedHold` goes from 9° to 16° on the violin and the
  viola, 16° on the cello (no measure, the value of the violin), and from 7° to 20° on the
  contrabass, short of the 25° of reference 2.2. A larger turn needs more reach of the right arm on
  the outer strings, so `bowRangeOf()` can shrink the bow range. The code round checks the range with
  `pnpm hold-reach` and `pnpm pose-depth`, and keeps the largest turn that keeps the full hair.
  Default of open question 4.
- **B2. Arm levels.** The geometry gives them: the bow plane of each string turns the hand, and the
  IK raises the arm. Check in the close views that the right elbow is higher on the G string of the
  violin and on the A string of the cello (reference 2.2).
- **B3. String crossings.** The string of the bow moves before the bow change. The crossing takes
  `min(0.08 s, 0.3 × the note before)` and ends 0.01 s before the new note (the lead of about 15° of
  phase, reference 2.3). In a fast alternation of two strings (notes shorter than 0.2 s), the right
  elbow pole keeps the mean string of the pattern, and the hand rolls at the wrist for the rest of
  the turn, so the upper arm moves less (reference 2.3, Fischer). Replaces `BOW_MOTION.shiftSec`
  for the bow.
- **B4. Slurs.** The app changes the bow on each note. The MIDI file has no slurs. A slur rule in
  `buildStrokes()` joins two to four normal notes of one player into one bow when each note is
  shorter than 0.25 s, each gap is less than 0.03 s, and the notes are in one beat. The bow then
  moves on in one direction, and the length of the bow is the sum of the lengths of the notes. The
  left hand still plays each note. Default of open question 1.
- **B5. Bow speed and length.** Keep `BOW_MOTION.length`: 6 cm plus 24 cm for each second on a bow
  range of 0.6 m is near the measures (reference 2.4, 3). The gesture size of the loudness changes
  the length less: from `0.7 + 0.3 × gesture` of the length in place of `gesture`, because real
  players change the sounding point and the force more than the speed (reference 2.4).
- **B6. The part of the bow.** A run of strokes shorter than 0.2 s moves to the balance point and
  the middle of the bow: the middle of each stroke pair moves 20% of the way to 0.45 of the bow range
  on each stroke (reference 2.5). A note of more than 1 s keeps the whole bow.
- **B7. Sounding point.** A new value of each instrument gives the place of the bow on the string
  as a share of the string length from the bridge: from 1/8 in piano to 1/18 in forte on the violin
  and the viola (reference 2.4), and a proposal of 1/9 to 1/15 on the cello and the contrabass (the
  cello means of reference 2.4 are 59 mm and 76 mm, 1/12 and 1/9 of a 690 mm string). `poseBowed()` moves `strings.contact` along `strings.axis` by the loudness of
  the stroke. Its change follows the loudness with a time constant of 0.2 s.
- **B8. Bow tilt.** The stick tilts toward the fingerboard about 30° on the violin and the viola,
  20° on the cello, and 10° on the contrabass (reference 2.1: 30° on the violin, and less on the
  lower instruments). `bowAt()` turns the bow around its hair by `bowTilt` of the hold.
- **B9. Tremolo and the bow change.** Keep the tremolo of 7 cycles a second (14 strokes): no
  source measures a tremolo, and 10 to 20 bounces a second is the rate of a ricochet (reference 2.5).
  The bow change gets no loop in this round. A figure eight of the hand at the change is a later
  step (reference 2.6).

### 5.4 The code that changes

| Rule | File | Function or data | New data |
|---|---|---|---|
| L1 | `pose/fingering.ts` (new) | `planHand()` | `HandFrame`, `FingeringCosts`, `HandStep`, `HAND_FRAMES`, `FINGERING_COSTS` |
| L1 | `pose/strokes.ts` | `buildStrokes()`, remove `stopOf()` and `stringsOf()` | `Stroke.hand: HandStep` |
| L2, L3, L4 | `pose/strokes.ts` | `bowStateAt()` | `BowState.reach`, `stopString`, `vibrato`; `HAND_MOTION_STRINGS` (shift and vibrato values) |
| L3 | `pose/bowed.ts` | `stopHandAt()`, `poseBowed()` | `BOWED_HANDS.reachTurn` |
| L5 | `pose/bowed-rig.ts` | `BowedHold`, `BOWED_HOLDS`, `SPECIES_HOLDS` | `elbowPerString`, `highElbow` |
| L5 | `pose/bowed.ts` | `poseBowed()` (the `poleL` mix) | none |
| B1 | `pose/bowed-rig.ts` | `stringTurn` of each hold, `bowRangeOf()` | none |
| B3 | `pose/strokes.ts` | `bowStateAt()` | `BOW_MOTION.crossSec`, `crossLeadSec` |
| B3 | `pose/bowed.ts` | `poseBowed()` (the right pole) | `BowState.crossMean` |
| B4, B5, B6 | `pose/strokes.ts` | `buildStrokes()` | `Stroke.slur`, `BOW_MOTION.slur`, `BOW_MOTION.balance` |
| B7 | `models/instruments/strings.ts`, `pose/bowed.ts` | the instrument targets, `stringsAt()` or `poseBowed()` | `soundingPoint: [piano, forte]`, `BowState.sounding` |
| B8 | `pose/bowed-rig.ts`, `pose/bowed.ts` | `BowedHold`, `bowAt()` | `bowTilt` |
| Docs | `docs/design/05-animation.md` 5.3, `docs/reference/string-technique.md` section 3 | | |

The new data:

```typescript
/** The hand frame of a bowed string: the notes that the fingers reach in one position. */
export interface HandFrame {
  /** The semitones from the position that the fingers reach with no extension. */
  readonly reach: readonly [low: number, high: number];
  /** The semitones that an extension or a pivot adds below and above the reach. */
  readonly extend: readonly [down: number, up: number];
  /** The finger of each semitone from `reach[0] - extend[0]` up: 1 to 4. */
  readonly fingers: readonly number[];
  /** The lowest position of the thumb position, in semitones. `Infinity` for none. */
  readonly thumbFrom: number;
  /** The semitones from the thumb to the highest finger in the thumb position. */
  readonly thumbReach: number;
  /** The highest position, in semitones of the first finger above the open string. */
  readonly top: number;
}

/** The weights of the cost of a plan of the left hand. Only the ratios count. */
export interface FingeringCosts {
  /** The cost of each shift, and of each semitone of a shift. */
  readonly shift: number;
  readonly shiftPerSemitone: number;
  /** A shift costs `1 + quickSec / dt` times more, with `dt` the time from the last note start. */
  readonly quickSec: number;
  /** The factor of a shift after an open string or a rest of at least `freeGapSec`. */
  readonly freeShift: number;
  readonly freeGapSec: number;
  /** The cost of each semitone of the position above the first position. */
  readonly height: number;
  /** The extra cost of the half position, of the thumb position, and of an extension. */
  readonly halfPosition: number;
  readonly thumb: number;
  readonly extension: number;
  /** The cost of an open string for a short note and for a note of at least `longSec`. */
  readonly open: number;
  readonly openLong: number;
  readonly longSec: number;
  /** The cost of each string that the bow crosses. */
  readonly crossing: number;
}

/** The plan of the left hand for one stroke. */
export interface HandStep {
  /** The semitones of the first finger (or the thumb) above the open string: 2 is the first position. */
  readonly position: number;
  /** The middle of the hand frame on the target `fingerboard`: 0 at the nut, 1 at the end. */
  readonly hand: number;
  /** The reach of the finger of the high note from the middle of the frame: -1 to 1. */
  readonly reach: number;
  /** The string under the finger of the high note, from 0 (the lowest) to 3. */
  readonly stopString: number;
  /** The finger of the high note: 0 for an open string or the thumb, 1 to 4. */
  readonly finger: number;
}

/** The new fields of `BowState` (pose/strokes.ts). */
export interface HandState {
  /** The middle of the hand frame on the target `fingerboard`. It replaces the note place. */
  fingerboard: number;
  /** The reach of the finger from the middle of the frame, -1 to 1. */
  reach: number;
  /** The string under the finger, from 0 to 3, with the time of the shift. */
  stopString: number;
  /** The vibrato offset along the string, as a part of the target `fingerboard`. */
  vibrato: number;
  /** The sounding point, as a share of the string length from the bridge. */
  sounding: number;
}
```

### 5.5 The order of the code round

1. L1 and L2 in one change: the plan and the shift. Run `hand-moves.ts` again with the code of the
   app in place of the prototype, and `pnpm close-views violinist <dir> --base main` and the cello
   in `pnpm close-views species dog <dir> --base main`.
2. L3 to L5: the fingers, vibrato, and the left elbow. Run `pnpm pose-depth violinist`,
   `pnpm fold-probe violinist`, and `pnpm fold-probe fox-violinist`, because the left elbow moves.
3. B1 to B3: the string planes and the crossings, with `pnpm hold-reach` and `pnpm pose-depth`.
4. B4 to B8: the slurs, the part of the bow, the sounding point, and the tilt.

Each step updates design 5.3 and section 3 of the reference in the same commit.

## 6. Open questions

| Question | Proposed default |
|---|---|
| 1. Join fast notes into slurs (B4)? The MIDI files have no slurs, so the app guesses them | Yes: two to four notes of one beat, each shorter than 0.25 s, with no rest |
| 2. How large is the vibrato (L4)? The real width moves the hand about ±3 mm on the violin, which is hard to see on the stage | The real width, with up to 50% more in high and loud notes. A larger width only when the user asks |
| 3. Which style of fingering? An orchestral player stays low and uses the open strings, and a soloist shifts more for the color of one string | The orchestral style of the prototype for each player. No soloist style in this round |
| 4. The string planes (B1): the real 16° to 25° can cost the short arms of the animals a part of the bow | The largest turn up to the real value that keeps the full hair in `bowRangeOf()` |
| 5. The fingers (L3): the paws have one finger bone | One finger block: the press of each note, a small turn of the hand toward the finger, and a roll across the strings. No new bones |
| 6. The shift time (L2): the real shift takes 0.3 s to 0.45 s, longer than the 0.1 s of the app | Half of the note before, at most 0.35 s, and the finger lands 0.03 s before the note |

## 7. The probes

| File | Command | Time | Output |
|---|---|---|---|
| `planner.ts` | Imported by `hand-moves.ts` | | |
| `hand-moves.ts` | `node docs/research/2026-10-17-string-hands/hand-moves.ts` | 4.5 s | `hand-moves.txt` |
| `hand-moves.ts` with the ratios of Noguchi | The command in the header of `hand-moves.ts` | 4.5 s | `hand-moves-noguchi.txt` |

Two helper agents searched the bow arm and the papers of the fingering, the shifts, and the
fingers. The main agent checked the vibrato, the positions, the string lengths, and the left arm.
The reference gives each source, and marks each fact that only an abstract gave.
