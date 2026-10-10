# 5. Animation

## 5.1 Pose function

The pose of each animal is a **pure function** of its inputs. The app keeps no state that events
change. Thus seek, pause, and speed changes are always correct, and the animation cannot drift
from the audio.

```typescript
/** The play state. It changes only on play, pause, and stop. */
interface Transport {
  playing: boolean;
  /** Wall clock seconds of the last play, pause, or stop. `null` before the first play. */
  changedAtWall: number | null;
  /** The transport before the last change, or `null` for the rest pose (5.2). */
  before: Transport | null;
  /** The song time of the first sound of the last play: 0, or the pause point (5.2, 6.5). */
  startSec: number;
  /** The time that the instruments stay up after a pause: 3 s, or 0 after a pause in the count-in. */
  holdSec: number;
  /** For a play, the wall clock seconds to its first sound: the count-in divided by the speed. */
  leadSec: number;
}

/** The mute and solo result of one seat (6.6). */
interface SeatAudibility {
  audible: boolean;
  /** Wall clock seconds of the last change. */
  changedAtWall: number;
  /** The audibility before the last change, or `null` for a seat that sounded (5.5). */
  before: SeatAudibility | null;
}

/** The pose of one animal for one frame. */
interface AnimalPose {
  /** One quaternion (x, y, z, w) for each bone, in the order of `BoneName` (4.7). */
  rotations: Float32Array;
  /** The offset of the root bone, for the sway. */
  rootOffset: readonly [number, number, number];
  /**
   * The move of the `slide` bone from its bind place, in the axes of the `instrument` bone. It is
   * (0, 0, 0) for each instrument except the trombone (4.6). The scene adds it to the bind
   * position of the bone.
   */
  slideOffset: readonly [number, number, number];
  /**
   * The move of the `instrument` bone from its bind place, in the axes of its parent bone. The
   * rest pose of the violin and the viola moves it to the lap (5.2). The scene adds it to the
   * bind position of the bone. A pose with no move can leave it out.
   */
  instrumentOffset?: readonly [number, number, number];
  /** 0 is open eyes, 1 is closed eyes. The eye bones scale on y by `max(0.05, 1 - blink)`. */
  blink: number;
}

/** The poses of the scene for one frame. */
interface ScenePose {
  /** One entry for each player, in the order of the seats, then of the players in a seat. */
  players: AnimalPose[];
  /** `null` for a chamber group, which has no conductor (4.2). */
  conductor: AnimalPose | null;
}

/** A `ScenePose` with writable poses. `poseAt()` writes each frame into it. */
interface ScenePoseBuffer extends ScenePose {}

/** The data of one `Score` that each frame needs. `preparePoses()` makes it. */
interface PosePlan {
  /** The bind skeleton, the seeded values, and the note data of each player. */
  players: readonly PlayerPlan[];
  /** `null` for a chamber group, which has no conductor (4.2). */
  conductor: PlayerPlan | null;
  /** The index of the player that leads a chamber group, or `null` with a conductor (5.4). */
  leader: number | null;
  /** The times of `Score.beats`. */
  beats: Float64Array;
}

type Vec3 = readonly [number, number, number];

/** The positions of the scene for one `Score`. `models/` calculates it with `layoutScene()`. */
interface SceneLayout {
  /** The stage side `S`, in meters (4.5). */
  stageSide: number;
  /** The center of the arcs of the seats. The podium stands here when there is a conductor. */
  podium: Vec3;
  /**
   * The bear on the podium top. It faces the orchestra: `facing` is 0. It is not in `players`.
   * `preparePoses()` and the scene both read this place. `null` for a chamber group, which has
   * no conductor and no podium (4.2).
   */
  conductor: { position: Vec3; facing: number } | null;
  /** One entry for each player, in the order of `ScenePose.players`. */
  players: readonly {
    position: Vec3;
    /** Radians around y. 0 faces -z (the back). */
    facing: number;
    support: 'chair' | 'stool' | 'high-stool' | 'bench' | 'stand' | 'riser';
    /** The species and the instrument of the player, from `castScore()` (4.6). */
    cast: PlayerCast;
  }[];
  stands: readonly { position: Vec3; facing: number }[];
  /** Each level is an arc centered on 0°, from `-halfAngle` to `halfAngle` (radians). */
  risers: readonly { level: number; radius: number; height: number; halfAngle: number }[];
}

/** Pure. Calculates the positions of 4.5 for a score. */
declare function layoutScene(score: Score, models?: ModelCache): SceneLayout;

/**
 * Pure. Calculates the data of a score that each frame needs: the bind skeletons, the bow
 * strokes, the passages, the seeded offsets, and the looks at the conductor.
 */
declare function preparePoses(
  score: Score,
  layout: SceneLayout,
  seed: number,
  models?: ModelCache,
): PosePlan;

/** Pure. Calculates the poses of all players and of the conductor. */
declare function poseAt(
  plan: PosePlan,
  songTime: number,
  wallTime: number,
  transport: Transport,
  /** One entry for each seat of `score.seats`. A missing entry sounds. */
  audibility: readonly SeatAudibility[],
  /** The poses to write in place, from `createScenePose(plan)`. A new buffer by default. */
  out?: ScenePoseBuffer,
): ScenePose;
```

`poseAt()` also calculates the IK targets of 4.7 and solves the arms, so the scene only copies
the rotations to the bones. The IK targets, the looks at the conductor, and the cues use the
positions of `layout`. The app calls `layoutScene()` and `preparePoses()` one time for each
`Score`. A `ModelCache` of `models/` holds the player models of one `Score`. The layout, the pose
plan, and the scene share it, so that each kind of player builds its model one time.
`preparePoses()` calls `preparePlayer()` for each player and `prepareConductor()` for the bear.
These two functions take the notes and the places of one animal, so that a page with no `Score`
can also make a plan. Then each frame only looks up the song time in sorted lists, and writes
into one buffer.
Thus the poses of 60 players take much less than the 4 ms of the main thread (9.7).

In each animation frame, `src/main.ts` calls `poseAt()` with the song time of `Player.now()`
(6.7), the wall time `performance.now() / 1000`, the transport of the last play or pause, and
the audibility of the seats. Then `StageScene.pose()` copies the poses to the bones. Until the
`Player` has loaded the samples of the demo, the song time is 0 and the players keep the rest
pose. Until the seat list of step 6, the audibility list is empty, so all seats sound.

The pose has three layers:

| Layer | Clock | Motion |
|---|---|---|
| Note | song time | Bow strokes, fingers, breath, mallets, hands (5.3) |
| Beat | song time | A small sway with the beat, and the conductor (5.4) |
| Idle | wall clock time | Breath, eye blinks, looks at the conductor |

The idle layer uses the wall clock time, so the animals stay alive while the music stops.

- **Motion families.** Each instrument has a motion family: `bowed`, `woodwind`, `brass`,
  `keyboard`, `harp`, `percussion`, `choir`, or `conductor`. Each family has its own note layer.
  No layer moves the legs or the trunk (4.7).
- **Beat layer.** A player sways the spine to the side, to one side on one beat and to the other
  side on the next beat: 2° for a gesture size of 1. It sways only in a passage: notes with rests
  shorter than 0.3 s. The sway starts 0.3 s before a passage and ends 1 s after it. The gesture
  size of a passage is `(0.6 + 0.6 × loudness) × amplitude`, with the highest loudness of its
  notes (5.3).
- **Idle layer.** Each animal breathes with a seeded period of 3.2 to 4.4 s: the spine turns
  0.6° and the chest 1°. It blinks once in each window of 4 s, at a seeded time, for 0.16 s.
  45% of the windows of 9 s hold a look at the conductor of 2.4 s, with turns of 0.4 s. The neck
  turns 40% of the look and the head 60%, at most 1.2 rad to the side and 0.5 rad up or down. In
  a chamber group (4.2), the players look at the head of the leader (5.4), the leader looks at
  the middle of the heads of the others, and a player alone looks ahead, to the audience.
  40% of the windows of 6 s hold an ear twitch of 0.3 s and 12°. The tail sways 8° and 12° in
  5.5 s. A seeded time in a window of the wall clock needs no state.

## 5.2 Rest pose

- Before the first play, the players are in the rest pose. A real orchestra also lifts the
  instruments only when the conductor signals the start.
- While `transport.changedAtWall` is `null`, the players stay in the rest pose.
- When play starts, the players lift their instruments in the count-in (5.4, 6.5). 3 s after a
  pause or a stop, the players lower their instruments.
- **Natural motion.** On 2026-10-05, the user asked first for a bit of randomness in the times
  of the lift and the lowering. Then the user decided (user feedback of 2026-10-05): "The animals
  are still lifting / dropping their arms too synchronized and too fast. Make it more natural."
  Thus each player has its own seeded lift and lowering, with a delay, a duration, and a curve.
  `preparePoses()` chooses them one time from the seed (`restMotion()` in `pose/rest.ts`), so
  `poseAt()` stays a pure function of its inputs.

  ```typescript
  /** The timing of one move of the instruments of an animal: a lift or a lowering. */
  interface RestMove {
    /** The wait before the move starts, in wall clock seconds. */
    delaySec: number;
    /** The duration of the move, in wall clock seconds, above 0. */
    durationSec: number;
    /** The seeded skew of the curve, from 0.8 to 1.25. */
    skew: number;
  }

  /** The seeded lift and lowering of one animal (`PlayerPlan.motion`). */
  interface RestMotion {
    lift: RestMove;
    lower: RestMove;
    /** The longest lift of the group, with its delay: 1.55 s (players) or 0.3 s (bear). */
    fitSec: number;
  }
  ```

  - A lift takes 0.6 to 0.9 s, and a lowering 1.0 to 1.6 s. The curve is
    `smoothstep(x ** skew)` of the linear progress `x`, so each move starts and ends slowly, and
    the largest speed comes a bit earlier or later for each player.
  - The principal of a seat (player 0) moves first, after the seeded delay of its seat. The later
    players follow in a ripple, as real players watch their leader: each player closes a seeded
    part of 0.3 to 0.5 of the ripple that remains, and the ripple comes nearer to 0.45 s. In a seat
    of 4 players, the last player starts 0.3 to 0.4 s after the principal. The players of a seat
    share the seed of the seat (`seatSeedOf()` in `pose/plan.ts`).
  - The delay of a seat is 0 to 0.1 s for the lift of the woodwinds and the brass, which also take
    a breath before the first note, and 0.05 to 0.2 s for the lift of the other seats. It is 0 to
    0.25 s for the lowering of each seat, after the hold. Thus the starts of the players spread
    over at most 0.65 s for a lift and 0.7 s for a lowering, and over more than 0.5 s in the
    default demo.
  - The lift and the lowering have separate seeded values. Thus an early lifter does not have to
    lower late, and the principal lifts first and also lowers first.
  - The conductor gives the count-in, so it does not vary: it lifts in 0.3 s and lowers in 0.6 s,
    with no delay and the skew 1 (`CONDUCTOR_MOTION`). A silent seat uses the same motion of each
    player (5.5).
- **No jump.** A lift or a lowering of each player starts from its height at the change. Thus a
  play within 3 s of a pause keeps the instruments up. `transport.before` keeps the transport
  before the change, so the pose calculates the height of each player at the change, then eases
  from it to the new height. A player in a lowering at a play keeps its height for its delay, then
  lifts. `changeTransport()` of `app/transport.ts` sets `before`. When all players stood still at
  the change, it cuts the older transports, so the chain stays short: a play is still for
  everyone 1.55 s after it, and a pause 3 s plus 2.3 s after it. Thus fast changes move the
  instruments with no jump: a play, a pause 0.1 s later, and a play 0.1 s after that hold the
  height of each player at the pause, then lift from it. The first rule kept the time of the
  change before, and it supposed that the weight was steady before that change. That play jumped
  (review of step 5, F8). The second rule kept one linear weight of the transport, so each player
  moved in a seeded part of the same 0.3 s and 0.6 s.
- **Count-in.** From the song start, the lift ends before the downbeat. The ready pause is 1.2 s
  (5.4), so the count-in of the Boulanger demo is 1.617 s. It holds the slowest lift (1.55 s)
  with a margin of 0.05 s at the speed 1. The Bach demo (8.2) has the shortest count-in of the
  demos, 1.5 s, so its slowest lifts scale by 0.935 at the speed 1 (the rule below). Until the
  user decision of 2026-10-05, the Boulanger demo had the shortest count-in. A shorter count-in in wall
  time, at a higher speed or on a resume, scales the delays and the durations of all lifts by one
  factor, so that they end 0.05 s before the first sound and keep their order (`liftScale()`).
  `startPlay()` of `app/transport.ts` gives the play its `transport.leadSec`: the count-in in
  song seconds divided by the speed. A speed change in the count-in does not change the factor.
- The note layers run with the song time, so the players also show the motion before the first
  notes (5.3), such as the breath and the landing of the bow.
- In the count-in after a pause, the note layer and the beat layer hold the song time of the
  pause point, because the notes before it do not sound again (`noteLayerTime()` in
  `pose/count-in.ts`). A play within 3 s of the pause keeps the instruments up. After a longer
  pause, the lifts fit in the preparatory beat: in the Boulanger demo (0.417 s) at the speed 1,
  the lifts take about a quarter of their time, and at the speed 1.5 about a seventh.
- A pause in the count-in (6.5), before the song time passes the start point, has no hold of
  3 s: the players and the conductor lower their instruments at once, and the song time goes
  back to the start point. `changeTransport()` gives such a pause `transport.holdSec` 0.
  `transport.startSec` keeps the start point of the last play for the count-in of the pose. A
  seek during play moves it to the seek point (6.5).
- The rest pose comes from `transport`, so the pose function still keeps no state.
- **Arm clearance.** In the rest pose, no arm goes through the body. The forearm, the hand, and the
  lower half of the upper arm can touch the torso, the head, and the thighs, as the arms of the
  reference images touch the body. They go no deeper into them than `ARM_CONTACT_DEPTH` of
  `pose/test-arm-clearance.ts`. The shoulder ball sinks into the torso (4.5). The elbows point out
  to the sides, and their direction turns from the rest to the hold at an even speed
  (`mixDirection()`). `pose/rest-clearance.test.ts` checks each species with each instrument,
  the soloists who stand, and the conductor, with the signed distance of the posed parts. The
  first rest poses put the right forearm of the violins 0.37 H into the torso, and the hanging
  arms of the standing players 0.25 H into the hips (user report of 2026-10-07: "the arms are
  clipping in rest mode").
- **Hanging arms.** A standing player without a lap hangs its arms (`pose/hang.ts`): the upper
  arm swings 8° forward and out to the side by the smallest angle at which it and the elbow keep
  0.03 H from the torso and the legs of the mesh, seen along x. Then the forearm and the hand do
  the same from the elbow, and the elbow bends 30° forward. A wider torso or a thicker arm thus
  swings the arm further out.

## 5.3 Instrument motion

- Bowed strings: the bow changes direction on each note. The bow speed comes from the note
  length. The left hand moves along the neck with the pitch.
- Pizzicato plucks the string. Tremolo makes short fast strokes.
- **Bowed strings in detail** (`pose/strokes.ts`, `pose/bowed-rig.ts`, `pose/bowed.ts`):
  - Notes of a player that start within 50 ms of each other form one stroke, as a chord of 3.8.
    A note that still sounds at a new stroke joins it. Two pitches in a stroke are a double
    stop: the high note takes its string, the low note the string below, and the bow lies
    between the two strings.
  - A note takes the highest open string at or below its pitch. The open strings are G3 D4 A4 E5
    (violin), C3 G3 D4 A4 (viola), C2 G2 D3 A3 (cello), and E1 A1 D2 G2 (contrabass). The bow
    turns 9° around the strings for each string (7° on the contrabass), to the bass side for a
    low string.
  - The middle of the left finger block presses the strings at the place of the note on the
    target `fingerboard`, with the string length: one octave is half of the string, and the end
    of the fingerboard is 20 semitones above the open string. The fingers point up from the
    strings, tilted 30° over the neck to the side of the fingers, and the palm faces the neck
    from below. The fingers curl 40°, and 15° more at the note start (the press). The press
    does not move the hand. The places of the notes map evenly into the part of the fingerboard
    that the left arm reaches with 97% of its length: the full fingerboard of the violin, the
    viola, and the cello, and 0.13 to 1 of it on the contrabass of the hippo. Its nut is 1.09
    of the arm length from the shoulder. The first left palm held the neck from below, 0.063 m
    under the strings at the size of the violin model (0.08 m on the violin and 0.30 m on the
    contrabass), with the fingers beside the neck. Thus the hand did not touch the fingerboard
    (user report of 2026-10-06).
  - A stroke starts at its full speed and slows to a stop at its end, so the turn of the bow at
    the next note is sharp. Its length is `0.1 + 0.4 × duration` of the bow range, from 0.06 to
    0.8, times the gesture size. A rest of at least 0.5 s ends a phrase: the next stroke is a
    down-bow from 12% of the bow range, and the bow moves there in the rest.
  - In a rest, the bow lifts up to 0.03 m (fully after 0.4 s of rest) in at most 0.1 s, and lands
    in at most 0.15 s before the next note. The left hand and the string of the bow move to the
    next note in the last 0.1 s before it.
  - Tremolo strokes run at 7 cycles a second with an amplitude of 0.02 m times the gesture size.
    Pizzicato keeps the bow in the hand with its tip up. The right palm is 0.035 m above the
    strings and flicks 0.012 m across them in 0.06 s at the note start. Between two plucks, the
    finger goes back and rests on the string for up to 0.04 s. The change between the bow and
    pizzicato happens from 0.3 s to 0.05 s before the note.
  - The arms of the animals are a little short for their instruments (4.5). In the playing
    pose, the right shoulder bone turns forward (30° violin, viola, and contrabass, 40° cello),
    the bow slants 20° from square in the plane of the strings with the frog to the right
    shoulder, and the cello and the contrabass players lean forward 10° and 5°. The bow
    range is the part of the hair that the arm reaches on all strings with 97% of its length.
    With the arms of 4.5, it is the full hair from 0.03 m after the frog to 0.03 m before the
    tip, on each of the four instruments. The first arms needed turns of 40°, 50°, 30°, and 50°,
    and still reached only 87% to 92% of the hair of the viola, the cello, and the contrabass.
    With the turn of 30°, the dog of the cellos reached 94.5% of the hair. A larger forward lean
    also reaches the full hair (99.5% at 20°), but the head of the dog then touches the neck.
    Each hold of the stage and of the views page lets the bow arm reach the full hair. A turn of
    the torso does not help a short arm, because the violin rests on the chest and turns with
    the shoulder.
  - In the playing pose, the head keeps at least 0.03 m from the neck of the cello and of the
    contrabass, with the looks at the conductor of the demo layouts. The neck passes the left of
    the head (4.6): 0.032 m from the head of the dog and 0.08 m from the head of the hippo. The
    holds of step 4 put the neck through the face, and the leans of 15° and 20° moved the head
    further into it (review of step 5, F2).
  - The stick lies in the fingers of the right hand (4.6), and the fingers curl 45° around it,
    also in the rest pose. The hand can roll around the stick and keep its grip, and the `bow`
    bone turns back by the roll, so that the hair stays on the strings. The hand rolls so that
    its back points to the elbow, from -120° to 100°: past this range, the hair at the frog goes
    into the palm or the fingers. The roll fades to 0 when the elbow is near the far side of the
    stick or near its line. The roll follows the elbow three times in each frame.
  - **Bow arm clearance.** While the player plays, the right elbow points to the directions of
    the hold, so that the arms stay out of the body: the forearm, the hand, and the lower half of
    the upper arm go no deeper into the torso, the head, and the thighs than the contact of the rest
    pose (5.2). On the violin and the viola, the elbow points out, forward, and down at the
    frog, (1, -1, -1), and out and up at the tip, (0.5, 1, -1), with an even turn over the bow
    range. In pizzicato, it points to (1, -0.5, -1). The left elbow points down and forward,
    under the instrument and near the chest, as in the reference images (`poleL` of
    `BOWED_HOLDS`, `pose/bowed-rig.ts`). Out and down, (-1, -1, 0), it stood 45° out from the
    side (user decision of 2026-10-10). Straight down or in, the upper arm went 0.08 H to
    0.17 H into the haunch, because the arm folds and the elbow drops to the lap. The right
    elbow already touches the chest, so it keeps its directions. The instrument moves 0.05 H down and 0.15 H forward (0.04 H on the viola), so
    that the bow hand at the frog on the lowest string stays off the chin and the long muzzle of
    the fox. On the bodies of 2026-10-06, a move of 0.08 H to the left and an elbow forward and
    down, (0.5, -1, -1), put the bow arm 0.065 H into the chest at the frog on the highest string.
    A move of more than 0.1 H forward needs the shoulder turn of 30° (20° before), so that the bow
    arm still reaches the tip. On the cello and the contrabass, the elbow points out and up,
    (1, 1.4, -0.3) and (0.5, 1, 0.5), and to the side in pizzicato, (1, 0, 0). The left elbow
    points down, out, and a little forward, so that the arm hugs the instrument: level and out,
    (-1, 0, 0.3), the left upper arm of the dog stood 70° out from the side. The cello moves 0.05 H forward, so that the bow hand at the tip
    of a down-bow on the C string stays off the right thigh. A hold can also turn the instrument
    around its bone while the player plays (`BowedHold.playTurn`). The holds of the stage keep the
    turn of the bind pose, and the views page turns the violin to the shoulder (7.1). In the middle of a change between
    the bow and pizzicato, the right elbow turns 0.3 of the way to the back of the hand on the
    cello and the contrabass, with `sin(π × change)`: the frog end of the stick otherwise touches
    the forearm in the change. The play clearance test checks the default demo
    (`pose/play-clearance-*.test.ts`, one file for each family of instruments). With the hold of
    2026-10-06 (the right elbow back and out, and turned to the back of the hand), the
    bow arms went up to 0.48 H into the torso while the players played. The contrabass is still
    open: at the tip of a down-bow on its low strings, the bow hand of the hippo goes up to
    0.25 H into its belly, in 16% of the samples of the default demo. A move of the contrabass
    forward put the nut out of reach of the left hand, and a move to the right put the neck
    0.028 m from the head.
  - Each hold of the bow (play, pizzicato, rest) has its own roll. A change between the bow and
    pizzicato turns the hand between its two holds, and the bow turns in the hand by the mix of
    the two rolls. A lift or a lowering moves the bow between its rest place and the strings, and
    the roll of the hand stays within 30° of the mix of the rolls of the two holds. Thus the
    pose has no jump, and the wrist bends at most 19° (violin), 14° (viola), 40° (cello), and 61°
    (contrabass) in the first 60 s of the Beethoven 9 demo. In each pose of the six demos,
    sampled every 5 ms, the stick and the hair stay out of the hand, the fingers, and the arm,
    with one exception: in one change to pizzicato of the cello in the Boulanger demo, the frog
    end of the stick touches the forearm, 0.003 m deep, for less than 10 ms. With the bow hand of
    the hold, the frog end of the stick went up to 0.13 H into the forearm of the dog and 0.09 H
    into the forearm of the hippo (user report of 2026-10-06).
  - The pizzicato hand plucks above the strings at 90% of the way from the end of the
    fingerboard to the bow contact on the violin and the viola, and at 30% on the cello and the
    contrabass.
  - In the rest pose, the violin and the viola stand on the left thigh, with the scroll up and a
    bit forward and out, and the top plate to the front: the tail end is 0.85 of the way from
    the hip to the knee, 0.06 H above the top of the thigh. At 0.65 of the way and 0.1 H to the
    inner side, the instrument was 0.003 m from the belly, and it touched the plump torso of
    option B. The rested violin, viola, and bows can touch the torso and the head, as the
    instruments of the reference images lie against the body, but they do not cross them
    (`pose/rest-clearance.test.ts`). The pose moves the instrument bone there with the instrument
    offset (5.1). The left fingers stay on
    the strings at 0.4 of the fingerboard, and the left elbow points down and a little back, so
    that the upper arm hangs at the side (`restPoleL` of `BOWED_HOLDS`). The left elbow of the
    cello and the contrabass points down and a little in, toward the side of the body.
    The right hand holds the bow on the outer side of the right knee: the grip is 0.08 H above
    the top of the leg at the knee, 0.18 H to the outer side, and the bow lies across the knees
    to the left and 0.3 to the front, away from the scroll, with the hair down. The cello and the contrabass stay on the floor, and the bow
    lies on the outer side of the right knee, 0.08 H above it and 0.2 H out, and points to the
    front, with the hair down, (0, -1, 0.3). On the dog of 2026-10-06, the hair down and out,
    (1, -1, 0.3), turned the hand so that the wrist hung beside the knee, and the forearm went
    0.07 H into the thigh. In the rest pose, the right elbow points out, down, and a little forward,
    (1, -0.9, -0.5) on the violin and the viola, so that the forearm passes over the thin front
    of the thigh, and (1, -0.6, -0.5) on the cello and the contrabass. A right elbow nearer to
    the side put the upper arm or the forearm 0.06 H to 0.19 H into the haunch and the thigh,
    also with the grip higher or nearer to the hip (2026-10-10): the short torso and the wide
    haunches of the bodies hold this elbow out. The back of the hand does
    not turn it. Thus both elbows bend, and the instrument, the bow, and the arms stay out
    of the body. A violin or viola soloist who stands hangs both arms (5.2): the left hand holds
    the instrument with the scroll up and the top plate out, and the right hand holds the bow as
    in the bind pose. The first rest pose
    turned the violin down around its bone under the chin, so it hung from the chin in front of
    the chest, the left arm hung along it, and the bow arm hung beside the chair (user reports of
    2026-10-06: "by default the animals' arms are drooping").
- Woodwinds: the player breathes in before a phrase. The fingers move on each note.
- Brass: the player breathes in before a phrase. The trombone slide follows the pitch.
- **Woodwinds and brass in detail** (`pose/wind-notes.ts`, `pose/winds.ts`):
  - A wind instrument plays one note, but a seat at its cap can give one player two notes at a
    time (3.8). The player shows the last note that started. Of the notes that start within
    50 ms of each other (a chord), it shows the highest. Thus the tuba (cap 1) shows the top
    note of a chord, and a held note gives way to a new note.
  - The mouthpiece stays at the mouth while the player plays: the head and the instrument both
    follow the chest, and the look at the conductor does not turn the head. The palms stay on
    their grips, and the two-bone IK places each arm. The hand points from the shoulder to the
    grip. Each hold of `WIND_HOLDS` (`pose/winds.ts`) gives the directions of the elbows. They
    point as far down and in as the arms permit, as the elbows near the torso of the reference
    images (user decision of 2026-10-10): the forearm, the hand, and the lower half of the upper
    arm go no deeper into the torso, the head, and the thighs than the contact of the rest pose
    (5.2). The left elbows of the oboe, the clarinet, the trumpet, the trombone, and the tuba
    point down, out, and forward, and the right elbows of the flute, the bassoon, and the brass
    point down. The old gap of 0.01 H held the elbows
    level, out and forward, (±1, 0, -1). The elbows down and out, (±0.6, -1, 0.2), put the arms
    of the woodwinds and the horn up to 0.3 H into the thighs and 0.2 H into the belly
    (2026-10-07). While it plays, the bassoon turns its lower end 20° forward and 20° to the
    right around the mouthpiece. The flute turns its right end 15° down and 30° back, nearer to
    level, with the left elbow out, forward, and a little up, (-1, 0.5, -1). At 10° down, the
    left upper arm went 0.03 H into the chest of the tan fox, and 30° down held the right elbow
    62° out from the side. The left hand of the flute holds it in front of the face, to the
    right of the middle, so the left arm crosses the chest: level and square to the front, the
    left upper arm of the tan fox went 0.067 H into the chest.
  - A rest of at least 0.5 s ends a phrase. The player breathes in during the 0.4 s before a
    phrase: the spine leans back by up to 3° times the amplitude of the player. It breathes out
    over the phrase, in at least 1 s.
  - The fingers follow the pitch, and they arrive at the note start after a move of at most
    60 ms. A woodwind player closes the holes with both hands: a low note of an octave closes
    both hands, and up the octave the right hand opens first, then the left hand. Thus each
    pitch class has its own hands. A brass player presses the valves with one hand (the left
    hand on the horn, the right hand on the trumpet and the tuba): none on a partial of the
    tube, and 1 to 3 valves for 1 to 6 semitones below it. The fundamentals are F2 (horn), B♭2
    (trumpet), B♭1 (trombone), and B♭0 (tuba). An open finger curls 15°, a closed finger 50°,
    and a hand that only holds the instrument 35°.
  - The trombone slide takes the position of the pitch: 1 on a partial of B♭1, and 1 more for
    each semitone below it, up to 7. It moves in at most 0.1 s, and arrives at the note start.
    No probable arm reaches the seventh position: the brace is 1.86 times the reach of the arm
    there (review of step 4). Thus the positions map evenly into the part of the travel that the
    right arm reaches with 97% of its length: position `p` moves the slide `(p - 1) / 6` of
    that part. For the panda, it is 0.17 m of the 0.55 m, and for the pig of the first map 0.13 m.
    The bodies of `animals.webp` put the mouth of the pig 0.03 m farther in front of the
    shoulder, so the part of the pig was 0.16 m before.
  - The right shoulder bone turns forward 20° on the oboe and the clarinet and 45° on the
    trombone, so that the right arm reaches the low hands of the oboe and the clarinet, and the
    slide. The long snout of the wolf puts the clarinet far in front of the chest. The horn coil
    stands near the player (4.6). With the arms of 4.5, each palm grip is then in reach with 97%
    of the arm length.
  - In the rest pose, the head lifts 12° off the mouthpiece, and the instrument moves off the
    mouth and tilts: the rest shift moves the instrument bone (in H, in the axes of the chest),
    and the rest turn turns it around the mouthpiece. The right end of the flute turns down 45°,
    the trumpet 50° and 20° to the side, and the trombone 45°. The other instruments tilt by up
    to 30°. Most shifts go 0.13 to 0.19 H to the side, and the horn comes up 0.29 H, so that its
    bell sits on the right thigh. The elbows have their own rest directions. A random search
    gave the values of `WIND_HOLDS` with the old gap of 0.01 H. Since 2026-10-10, most rest
    elbows point down. The palms keep their grips, the fingers relax to the
    hold curl, and the slide closes. The first rest pose kept the instruments at the mouth, and
    the arms went up to 0.18 H into the torso and 0.29 H into the thighs.
- Mallets and percussion: the mallet lifts before the note and strikes at the note start.
- **Percussion in detail** (`pose/strikes.ts`, `pose/percussion-rig.ts`, `pose/percussion.ts`):
  - The notes of a player that start within 50 ms of each other strike together. A drum player
    strikes its own instrument for each of its notes, also for the notes of another key group
    (3.8).
  - A timpani note plays on the kettle whose key range has its middle nearest to the key. Of two
    kettles at the same distance, the larger kettle plays it. A xylophone note strikes the bar of
    its key (4.6). The small percussion player strikes the tambourine for key 54 and the triangle
    for the other keys. Of a chord with both, the triangle sounds.
  - The timpani, the snare drum, and the xylophone have two mallets. A chord with two or more
    targets takes both hands: the left hand strikes the target farthest to the left. A single
    strike within 0.5 s of the strike before takes the other hand, so that a roll alternates the
    hands. A later strike takes the hand on the side of its target. A hand does not cross the
    other hand: a target to the right of the last target of the right hand takes the right hand
    again, and the same on the left. Thus a fast run on the xylophone keeps the mallets apart.
    The two mallets strike 0.05 m left and right of the middle of a kettle, and 0.04 m on the
    snare drum.
  - The bass drum player strikes the right head with the beater in its right hand, and its left
    arm hangs. The small percussion player holds the triangle up in its left hand: the clip is
    1.0 H in front of the left shoulder joint and 0.3 H inward. The beater in the right hand
    strikes the triangle or the tambourine.
  - Between two strikes, the head of a mallet rests above its last target. Before a strike, it
    moves to the new target and lifts, in at most 0.25 s and in at most 0.6 of the time from the
    strike before of the same hand. The lift is lower in proportion to a shorter time. The head
    comes down with its full speed and reaches the target at the note start. Then it rebounds to
    its rest height in at most 0.1 s and in at most 0.4 of the time to the next strike.
  - The rest heights and the lifts at a gesture size of 1 are: timpani 0.04 m and 0.12 m, bass
    drum 0.05 m and 0.12 m, snare drum 0.03 m and 0.10 m, xylophone 0.03 m and 0.08 m, and the
    beater of the small percussion 0.02 m and 0.05 m.
  - A mallet points to its head from a home 0.2 H below and 0.75 H in front of the shoulder joint
    of its side. Thus the wrist stays in front of the body and below the shoulder, and the mallet
    slants down to a head or a bar. The fingers curl 60° around the mallet, and the elbows point
    down and out.
  - The cymbals keep the turn of the bind pose, with their inner faces to each other. Their inner
    faces meet at the note start, 1.1 H in front of the middle of the shoulder joints and 0.09 H
    below it. Between two crashes, each face is 0.06 m from that point, and before a crash it
    opens by up to 0.15 m more, as the lift of a mallet.
  - In the rest pose, the arms hang a little out to the sides (5.2). The free left arm of the
    bass drum player hangs so also while it plays.
- Piano: the hands move to the key position. The left hand plays low notes and the right hand
  plays high notes.
- **Piano and harp in detail** (`pose/hand-notes.ts`, `pose/hands.ts`):
  - The notes of a player that start within 50 ms of each other form a chord. A chord wider than
    one octave splits at its largest interval: the left hand plays the notes below it, and the
    right hand the notes above it. Of two equal intervals, the one nearer to the middle of the
    chord splits it. A chord within one octave goes to the nearer hand, so that a melody stays in
    one hand. At the same distance, a chord from middle C up goes to the right hand. The hands
    start at C3 and C5.
  - A hand plays a chord at the middle of its lowest and its highest key. The piano keys do not
    move, because they are not separate meshes.
  - The piano palm faces down, 0.04 m above the keys and over the front edge of a white key. Over
    a black key, it is 0.06 m further in. The fingers curl 30°, down onto the keys. A hand moves
    to its next keys in at most 0.15 s and in at most 0.6 of the time from its last note. It
    lifts up to 0.03 m times the gesture size in the move, strikes the keys at the note start,
    and stays on them until its next move. The elbows point out, down, and back,
    (±1, -0.6, 0.4).
  - The harp palm is 0.03 m from the strings, at the middle of the string of its note: the left
    hand on the left side of the strings, and the right hand on the right side. The palm faces
    the strings. A hand moves to its next string in at most 0.15 s, and rests on it for up to
    0.04 s (at most 0.2 of the time from its last note). At the note start, it plucks: in up to
    0.08 s (at most 0.3 of the time to its next note), the palm pulls 0.025 m away from the
    strings times the gesture size, and the fingers curl from 15° to 60°. The hand comes back to
    the strings in the move to its next note.
  - The polar bear reaches each piano key from A0 to C8 with 97% of the arm length. For a key
    out of reach, the hand stops short of it at 97% of the reach, so that the elbow keeps its
    bend. The harp player leans forward 8°. Without the lean, the left palm on the lowest string
    needed 1.01 of 97% of the arm length (the first arms). With the arms of
    4.5, the lean, and the turn of the harp (4.6), the left palm needs at most 0.997 of it, on
    the highest strings, and 0.984 on the lowest string.
  - While the harp player plays, the head keeps at least 0.03 m from the harp, with the looks
    at the conductor of the demo layouts: 0.034 m for the deer.
  - In the rest pose, the pianist and the harp player rest the palms on the thighs, palm down,
    to the outer side: the pianist 0.25 H out and 0.12 H above the top of the leg at 0.7 of the
    way from the hip to the knee, and the left hand of the harp player 0.25 H out and 0.13 H
    above it at 0.85 of the way, so that the forearm passes over the thigh. The fingers point to
    the front, and the elbows point down, a little out, and forward (`HANDS_HOLDS` of
    `pose/hands.ts`). Out, down, and forward, (±1, -1, -1), the elbows of the polar bear stood
    58° out from the side (31° now, user decision of 2026-10-10). The harp stands at the right
    knee of the harp player, so its right hand rests on the string of C4, 0.02 m further from the
    strings than in the playing pose, and its elbow points down. A
    place on the right thigh put the hand into the harp or the forearm into the belly. The
    elbows bend, and the harp player sits up. The first rest pose hung the arms beside the seat (user reports of
    2026-10-06: "by default the animals' arms are drooping").
- Choir: the beak or mouth opens with each note, the singer breathes in before a phrase, and it
  sways.
- **Choir in detail** (`pose/choir-notes.ts`, `pose/choir.ts`):
  - A singer sings one note at a time. The notes that start within 50 ms of each other are one
    sung note, from the first start to the last end.
  - The `jaw` bone turns down: the lower beak of the penguin opens. It opens 50° times the
    gesture size in the 0.1 s before a note (at most half the time from the note before), and it
    is fully open at the note start. It stays open while the note sounds and closes in 0.12 s
    after it. Between two notes, an open jaw closes to half and opens again, so that each note
    shows.
  - The neck and the head lift with the jaw: 22° times its opening, as a part of 50°. The neck
    turns 40% of the lift and the head 60%, as in a look. In the default view of the removed
    Handel demo at 1440 × 900, a singer of the front row is about 20 px tall. There, a beak
    point moved 3.9 to 4.0 px for a note with the jaw of 35° and the lift of 15°, and the gap
    between the beak tips opened 2.5 px. With the jaw of 18° and no lift, the beak moved 1.0 px
    (review of step 5, F6). In a section shot of the Ode to Joy, the beak of 35° did not show,
    and the penguins barely moved in 6 s (UX audit 2026-10-06, N8).
  - A rest of at least 0.5 s ends a phrase. The singer breathes in during the 0.4 s before a
    phrase: the spine leans back by up to 4° times the amplitude of the singer, as the breath
    of a wind player. It breathes out over the phrase, in at least 1 s.
  - In a phrase, the chest turns 6° times the gesture size of the loudest note of the phrase to
    each side, one side every 2 beats. Neighbor voices turn to opposite sides: a seat with an
    even index turns right on the first beat, and a seat with an odd index left. The turn rises
    in the 0.4 s before the phrase and fades in 1 s after it. The beat layer also sways the
    spine. With 3° and one side for all voices, the choir moved as one block.
  - The palms keep their grips on the folder, which follows the chest. The hand points from the
    shoulder to the grip, the elbows point out and down, (1, -0.6, 0), and the fingers curl
    35°. With the elbows down and back, (0.6, -1, 0.2), the upper arms went 0.022 H into the
    torso.
  - In the rest pose, the jaw closes and the chest stops its turn. The singer keeps the folder in
    its hands.
- The motion starts 100 to 400 ms before the note, by the action. This is possible because the
  app reads the full file first.
- Each player has a small seeded offset in timing (about 20 ms) and in amplitude. Thus players
  that play in unison do not move as copies. The timing offset is from -20 ms to 20 ms, and the
  amplitude from 0.85 to 1.15, both uniform from mulberry32 with the seed of the player. The
  note layer and the beat layer of a player run at the song time minus its offset.
- Each note event happens at the note start: a bow stroke starts, or a finger plucks. The motion
  before it (the landing of the bow, the retake, the shift of the hand, and the return of the
  finger) ends at the note start.
- The loudness for the size of a gesture is the velocity, multiplied by CC 7 (volume) and CC 11
  (expression), each as a part of 127. The controllers have their values at the start of the
  note, on the synth channel of the note. Before the first change, CC 7 is 100 and CC 11 is 127,
  as in General MIDI. CC 121 (reset all controllers) sets CC 11 back to 127. `pose/` reads the
  controllers from `Score.synthEvents`, so the sound and the gestures use the same events.
- Version 1 has no extra effects, for example no music-note particles and no light on the
  soloist.

## 5.4 Conductor

- The bear uses real beat patterns. The patterns come from the time signature events and the
  tempo map. The beat tempo is the count of beat units (the denominator of the time signature)
  for each minute. A MIDI tempo counts quarter notes, so the eighth tempo is two times the
  quarter tempo.

  | Time signature | Pattern |
  |---|---|
  | 2/x, 3/x | 1 (one beat in a bar) if the beat tempo is 168 or more, else 2 or 3 |
  | 4/x | 4 |
  | 6/8 | 2 (dotted beats) if the eighth tempo is 150 or more, else 6 |
  | 9/8, 12/8 | 3 or 4 (dotted beats) |
  | 6/4 | 2 if the quarter tempo is 150 or more, else 6 |
  | all others, for example 5/4 and 7/8 | `generic`: one down-up motion for each beat unit, larger on the downbeat |

  For example, the first movement of Beethoven's Symphony No. 5 (2/4 at 192) uses pattern 1,
  and the Beethoven 8 demo (2/4 at a quarter tempo of 44) uses pattern 2. The Mozart K. 488 demo
  (6/8 at an eighth tempo of 84) used pattern 6 until the user removed it on 2026-10-05.
- The first bar starts at tick 0. Each time signature event starts a new bar, also inside a bar.
  The tempo at the downbeat of a bar selects the pattern of the bar, so a tempo change can change
  the pattern at the next bar. The tempo is rounded to 0.01 BPM before the comparison, because a
  file stores whole microseconds: 168 BPM reads as 167.99997.
- The beats end before the last note-off (`Score.durationSec`).
- The size of the gestures follows the loudness of all notes.
- Between its cues, the left hand shows the dynamics and the held chords of the score, and it
  mirrors the beat in loud passages (user report of 2026-10-06). "Left hand between the cues"
  below gives the rules.
- The conductor cues each section entry, as a real conductor does (user decision of
  2026-10-05). It turns the head and the upper body to the section one beat before the entry,
  and the left hand or the baton lands on the entry. "Cues" below gives the rules.
- If a file has no time signature or tempo events, the MIDI defaults apply: 4/4 at 120 BPM.
- **Conductor in detail** (`pose/conductor-notes.ts`, `pose/cues.ts`, `pose/conductor.ts`):
  - At each beat time, the tip of the baton is at the point of the beat. The points follow the
    pattern of the bar, as the conductor sees them, in units of the pattern (x to the right, y
    up, in the beat plane). Beat 1 comes down at (0, 0). Beat 2 of four and beats 2 and 3 of six go inward, the
    next beats outward, and the last beat goes up. A `generic` bar gives each beat (0, 0).

    | Pattern | Points of the beats |
    |---|---|
    | 1 | (0, 0) |
    | 2 | (0, 0), (0.35, 0.15) |
    | 3 | (0, 0), (0.6, 0.1), (0.3, 0.3) |
    | 4 | (0, 0), (-0.5, 0.1), (0.6, 0.1), (0.3, 0.3) |
    | 6 | (0, 0), (-0.25, 0.05), (-0.5, 0.1), (0.45, 0.05), (0.7, 0.1), (0.3, 0.3) |

  - Between two beats, the tip rises in an arc and comes down into the next point with its full
    speed, so that each beat is the low point of a bounce. The arc is 0.5 units high before a
    downbeat and 0.3 units before another beat. Before the first beat, the baton waits at the
    point of the last beat of the first bar, and comes to the first beat in the time of the first
    beat. After the last beat, it goes back to that point.
  - **Count-in.** The user decided on 2026-10-05 that a click on play does not start the music at
    once. The conductor first signals the players to get ready, and then the music plays. The
    transport starts at a song time before the start point (6.5). Thus the count-in is a set of
    poses at those song times, and the pose function keeps no state. `pose/count-in.ts` holds
    the rules, and `Transport.startSec` gives the start point of the last play (5.1).
  - From the song start, the count-in is a ready pause of 1.2 s, then one preparatory beat. The
    players lift their instruments in the ready pause (5.2). The preparatory beat is the first
    conducted beat of the score (`beats[1] - beats[0]`): one beat of the pattern of the first bar
    at the first tempo. Thus the count-in `T` is 1.617 s for the
    Boulanger demo, the default demo (pattern 3, 0.417 s), 1.5 s for the Bach demo (pattern 4,
    0.3 s), and 1.95 s for the Beethoven 9 demo (pattern 3, 0.75 s). The removed Beethoven 5
    demo had 1.825 s (pattern 1 at 96 bars a minute).
  - The preparatory beat is at most 0.9 s, also after a pause, as a conductor gives a slow beat
    in two. Thus the count-in of the K. 315 demo (46 BPM, a beat of 1.3 s) is 2.1 s. With the
    full beat, it was 2.5 s, and the first sound came 3.1 s after the tap on a phone (UX audit
    2026-10-06, N11).
  - The ready gesture: in the first 0.2 s of the count-in, the tip of the baton rises 0.4 units
    above the point of the last beat of the first bar, and the left hand rises to point 40° up
    and 25° outward, with the reach of a cue, so that it shows beside the head from behind. At 5°
    inward, it was in front of the face. At 10° inward, the left forearm came 0.8 cm from the
    head with the forearms of option B (0.17 H at the elbow), in the count-in of K. 525. It keeps
    14 cm now (2 cm in `pose/test-conductor-clearance.ts`). Both hands stay up until the
    downbeat. The left hand goes back to its place between the cues in 0.6 s after the downbeat.
    When the left hand also cues an entry, the cue wins by its weight: the ready direction keeps
    the weight `ready × (1 - cue)`.
  - The preparatory beat: the tip leaves the ready point upward, in the arc of the downbeat, and
    comes down into the point of the first beat with its full speed at the song time 0. The
    first note sounds there (6.5).
  - After a pause in the song, the count-in is one preparatory beat with no ready pause: the
    conducted beat at the pause point, at its tempo. The baton holds its point of the pause
    point. In the beat, the tip rises in the arc of the next beat and comes down to that point
    with its full speed at the pause point (`resumeLift()`). A cue holds its pose of the pause
    point, as the players hold their poses (5.2).
  - One unit is 0.5 m times the gesture size of the beat, `0.6 + 0.6 × loudness`. The loudness
    of a beat is the highest loudness of the notes that sound in it. The first unit of 0.35 m
    gave a small motion of the wrist (UX audit 2026-10-05, AM1).
  - At beat 1, the tip of the baton is 0.94 H above the right shoulder joint, 1.58 H in front of
    it, and 0.39 H outward. The baton points to the tip from a pivot 0.16 H below the shoulder
    joint, 0.1 H in front of it, and 0.67 H outward: up 37° and a little inward. The beat plane
    is square to the baton at beat 1: its x axis is level, and its y axis points up and back.
    Thus the tip moves around the pivot, and the arcs and the lift of a baton cue rise in the
    plane. The pivot is 0.84 H behind the wrist, so the wrist follows 0.45 of the motion of the
    tip, and the arm beats with the baton. At beat 1, the wrist is about 0.4 H up, 0.7 H forward,
    and 0.55 H out from the shoulder joint: above the shoulder and beside the head from behind,
    as in `mockup.png` and in views 02 and 05 of `scene.png`. The fingers curl 60° around the
    baton. The elbows point out to the sides and a little back, (±1, -0.1, 0.25), level with the
    shoulders, so that the forearms rise to the hands in the view from behind.
  - The beat plane turns by half of the turn of the upper body (the cues below), around the
    vertical through the `spine` bone. Thus the arm opens to the right in a turn to the left.
    With the full turn of 30° to the left, the right hand went behind the head in the view from
    behind.
  - The first beat point, 0.9 H up and 1.2 H forward, with the pivot 0.6 H up, kept the hand next
    to the head, and the beat read as a hand at the ear (UX audit 2026-10-05, AM1). The second
    beat point, 0.45 H up and 1.3 H forward, with the pivot 0.1 H up and 0.3 H forward, kept the
    wrist at the pivot: the baton turned in a still hand at the height of the mouth. From behind,
    both hands were 0 to 10 px from the outline of the head, and the bear seemed to hold its
    head (review of 2026-10-07).
  - In the rest pose, the arms hang a little out to the sides (5.2). In the lift and in the
    lowering of the arms (5.2), the baton turns out to the right and down, toward
    (0.8, -0.6, 0), by `sin(π × weight)` of the turn. Thus its tip leaves the width of the desk
    while the hand is still high, and the baton does
    not sweep through the desk and the score. With a straight lowering, the tip came 0.006 m near
    the desk after the song end. A test samples a full play of each demo, and the lift, the bow,
    and the lowering at a finer step (`pose/test-conductor-clearance.ts`, in a few shard files).
    It keeps the bear 0.02 m from the stand. It also keeps the left forearm and hand 0.02 m from
    the head, the right hand, and the baton, and in the playing pose from the body.
  - **View from behind.** `pose/conductor-view.test.ts` samples a full play of each demo every
    0.1 s. It looks at the bear from behind, 10° above the level (the conductor shot, 5.6) and
    34° above it (the default view at the podium). No hand is ever inside the outline of the
    head, the median distance of each hand from the outline is at least 0.2 H, and the median
    height of each wrist above its shoulder joint is at least 0.35 H. The table gives the medians
    of the six demos, in the two views.

    | Hand | From the outline, before | From the outline, now | `mockup.png` | Above the shoulder, before | Above the shoulder, now |
    |---|---|---|---|---|---|
    | Left | -0.04 to 0.14 H | 0.23 to 0.28 H | about 0.15 H | 0.17 to 0.32 H | 0.41 to 0.50 H |
    | Right (baton) | -0.11 to 0.11 H | 0.36 to 0.48 H | about 0.6 H | 0.24 to 0.29 H | 0.50 to 0.54 H |

    Before, the left hand was inside the outline in 21% to 68% of the samples, and the baton hand
    in 2% to 100%.
  - **Bow at the song end.** At the pause at the song end (6.5), the bear bows to the orchestra:
    0.8 s after the pause, while the instruments are still up (the hold of 5.2), the spine bends
    forward 32° in 0.7 s with a smoothstep, holds 0.6 s, and comes up in 0.7 s. The head bends half of that angle more. The
    bow is a function of the wall seconds since the pause at the end, so it keeps no state. A
    pause before the end gives no bow. Nothing marked the end of a piece: the last wide shot held,
    and the players lowered their instruments (UX audit 2026-10-05, AM2). The bear does not turn
    to the audience, because the transport does not tell a pause at the end from a later play,
    and a turn back at the next play would jump.
- **Chamber group.** A chamber group of 4.2 has no conductor (user decision of 2026-10-06, UX
  audit 2026-10-06, N9). Thus its players give the count-in, as a string quartet does, and it
  has no cues and no bow at the song end. The agent chose these values on 2026-10-06:
  - The count-in keeps its times: the ready pause of 1.2 s from the song start, then one
    preparatory beat with the conducted beat of the score, at most 0.9 s. The players lift their
    instruments in the ready pause (5.2).
  - The leader is the principal player of the first seat of the first section of this list: the
    violins, the piano, the flutes, the oboes, the clarinets, the trumpets, and the horns. With
    none of them, the principal player of the first seat leads. Thus the first violin leads a
    string quartet and a violin sonata, the pianist a piano solo, and the flute a wind quintet
    (`leaderOf()` in `pose/plan.ts`).
  - The leader breathes in on the first half of the preparatory beat: the upper body leans back
    4° with a smoothstep. On the second half, it nods: the upper body leans forward along a
    quarter cosine, and reaches 6° with its full speed on the downbeat, where the first note
    sounds. Then it comes back up in 0.4 s with a smoothstep (`leaderNodAt()` in
    `pose/count-in.ts`). The table gives the lean with a beat of 0.5 s. A positive lean is forward.

    | Song time | -0.5 s | -0.375 s | -0.25 s | -0.125 s | 0 (downbeat) | 0.2 s | 0.4 s |
    |---|---:|---:|---:|---:|---:|---:|---:|
    | Lean | 0° | -2° | -4° | -1.1° | 6° | 3° | 0° |

  - The spine takes the lean. A pianist, a harpist, a percussion player, and a singer also nod
    the head by the same angle, with the neck and the head as in a look (5.1). A violinist and a
    violist hold the instrument under the chin, and a wind player holds the mouthpiece at the
    mouth, so their head does not nod. A cello and a contrabass stand on the floor and do not
    lean with the player, so their leader does not lean: its head lifts with the breath and
    drops to level on the downbeat, and does not go down. A lean brought the head of a cellist
    0.025 m from the neck of the cello, and a nod of the head down 0.029 m (5.3 keeps 0.03 m).
  - After a pause, the nod comes on the preparatory beat at the pause point, with no ready pause.
  - The nod follows the playing pose of the leader (5.2, 5.5). Thus the first screen shows no
    nod, and a muted leader does not nod.
- **Cues** (`pose/cues.ts`). The user asked on 2026-10-05 for "a more realistic conductor that
  cues each section before it plays". The first rule cued only an entry after a rest of two full
  bars, with the left hand, toward the first seat of the entries. `findCues()` calculates the
  cues of a score one time (`prepareConductor()`), and `cueStateAt()` gives the motion at a song
  time. The diagram shows one cue of the left hand that lands at 0 s, with a beat of 0.5 s.

  ```text
  time (s)    -1.1        -0.5      0           0.6         1.2
  head, body  |--- turn --|--- on the section --|--- back --|
  left hand     |-- rise -|-- down -|-hold|--- down --|
  baton       the beat pattern goes on in a beat plane that turns half as far as the upper body
  ```

  ```typescript
  /** One cue of the conductor (`pose/cues.ts`). A positive turn turns to the left. */
  interface Cue {
    /** The start of the first note of the cued entry, in song seconds. */
    entrySec: number;
    /** The time at which the gesture lands: the entry, or the downbeat of the count-in. */
    landSec: number;
    /** The conducted beat before the landing, in seconds. */
    beatSec: number;
    kind: 'hand' | 'baton';
    /** The seats that enter in the cue, sorted. */
    seats: readonly number[];
    /** The turns of the upper body and of the head, and the angle of the head up or down. */
    torsoYaw: number;
    headYaw: number;
    headPitch: number;
    /** The turn of the left hand to the section. */
    handYaw: number;
    /** The extra height of the arc of the baton into the landing, in meters. */
    batonLift: number;
  }
  ```

  - **Entries.** An entry is the first note of a seat with players, or a note after a rest of
    the seat of at least one bar, from 1.2 s to 3 s. Thus a fast bar of one beat (0.625 s, as in
    the first movement of Beethoven's Symphony No. 5) needs about two beats of rest, and a slow
    bar of 4.8 s (as in Grieg's "Åse's Death") needs 3 s. A note after a general rest of at
    least 0.75 of a conducted beat, in which no seat
    sounds, is also an entry. The rest of a seat is the time from the end of all its earlier
    notes.
  - **Moments and groups.** Entries that start within 0.1 s of the first entry of a moment form
    the moment. The entries of one motion family (5.1) form a group. In a tutti, at least 3 seats
    and half of the seats with players enter, and all entries form one group.
  - **Dense music.** The window of a moment is the two bars before it. A seat is busy when its
    notes cover 80% of the window. When at least 3 other seats have players and 75% of them are
    busy, the moment gets no cue. The conductor keeps the pattern.
  - **Priority.** The priority of a group is its highest loudness (5.3), plus its exposure (the
    part of the other seats that is not busy), plus 0.25 when it holds a first entry, plus 0.5
    in a tutti. The group with the highest priority gets the cue of the moment. At a tie, the
    group of the first entry wins. Of two cues whose landings are less than 1.5 s apart, the cue
    with the higher priority stays.
  - **Hand of the cue.** The entries of the first moment of the song, when it starts before the
    second beat, get the downbeat of the count-in: the cue lands on the first beat. A strong
    entry (a tutti, or a loudness of at least 0.6), or an entry of a section more than 45° to the
    right, gets the baton when it starts within 5 ms of a beat. Each other entry gets the left
    hand.
  - **Direction.** A cue turns to the middle of the players of its group, by the count of
    players, 1.1 m above their places. The turn starts from the eyes of the bear (the `head`
    bone). The upper body turns 40% of the turn, at most 30°, and the head turns the rest, at
    most 50°. Thus the turn is at most 80°. The head also turns down or up to the players, at
    most 25° down and 15° up. The spine and the chest each turn half of the upper body. The neck
    turns 40% of the head turn, as in the idle look (5.1).
  - **Times.** The preparation is the conducted beat before the landing, from 0.3 s to 0.8 s.
    The head and the upper body turn in the 0.6 s before the preparation. Thus the eyes are on
    the section one beat before the entry. They stay on it for 0.6 s after the landing, and turn
    back in 0.6 s.
  - **Left hand.** The hand rises in the 0.5 s before the preparation, to 15° above the cue
    point at 0.75 of the reach of the arm. In the preparation, it comes down to the cue point
    along a quarter cosine, so that it lands at its full speed at the entry. The cue point is 30°
    up, at 0.85 of the reach, in the direction of the section from the left shoulder joint. The
    hand points no further right than the front of the upper body, so that it does not cross the
    body. With a limit of 20° to the right, the forearm crossed in front of the head, which turns
    further to the section, and went through its muzzle (2026-10-06). It also points at least 25°
    to the left of the front of the bear, so that it shows beside the head from behind. At the
    front of the upper body, a cue to a section in the middle or at the right put the hand behind
    the head in the view from behind (review of 2026-10-07). It stays at the cue point
    for 0.3 s, then goes back in 0.6 s to its place between the cues (below). The fingers open to
    10°.
  - **Baton.** The beat plane turns by half of the turn of the upper body, around the vertical
    through the `spine` bone. A baton cue makes the arc into its beat 1.6 times as high, so that
    the gesture before the entry is larger. The tip still comes down to the point of the beat at the entry.
    The downbeat of the count-in keeps its arc, because the preparatory beat is the gesture.
  - **Overlaps.** The times of two cues can overlap. The turns are the sums of the turns of the
    cues by their weights, divided by the larger of 1 and the sum of the weights. The direction
    of the left hand is the mean of the hands by their weights, and the hand has the largest
    weight. Thus the motion goes from one cue to the next with no jump. In the first 60 s of the
    Boulanger demo at 60 frames a second, the left wrist moves at most 0.022 m in a frame, and
    the head turns at most 0.074 rad. In a full play of each demo, the left wrist moves at most
    0.023 m in a frame (Mozart K. 315). With the places in front of the chest, it was 0.028 m and
    0.035 m (Beethoven 9). When the hand hung at the side between the cues, the step was 0.056 m
    in the Boulanger demo.
  - **Silent seats.** A cue has the highest audible weight of its seats (5.5). Thus a cue to
    silent seats does not show, and a cue to a group with one audible seat shows. The cue of a
    moment does not go to another group of the moment when its own seats are silent.
  - **No state.** The cues follow the song time. Thus a seek gives the same cue as an unbroken
    play. In the count-in after a pause, a cue holds its pose of the pause point (5.2). The turns
    and the hand follow the weight of the playing pose, so the rest pose has no turn.
  - **Count.** The demos have these cues:

    | Demo | Cues | Left hand | Baton | Cues each minute |
    |---|---|---|---|---|
    | Boulanger | 81 | 58 | 23 | 17.3 |
    | Beethoven 9 | 30 | 24 | 6 | 9.3 |
    | Beethoven 8 | 34 | 31 | 3 | 9.3 |
    | Eine kleine Nachtmusik | 23 | 7 | 16 | 5.6 |
    | Mozart K. 315 | 20 | 14 | 6 | 4.7 |
    | Bach | 2 | 1 | 1 | 0.4 |

    The Bach demo has a dense texture with no rests, so most of its moments get no cue. The demos
    that the user removed on 2026-10-05 (8.2) had Beethoven 5 66 cues (12.5 each minute),
    Mozart K. 488 43 (6.1), and Grieg 5 (1.4).
- **Left hand between the cues** (`pose/conductor-left.ts`, `pose/conductor.ts`). The user
  reported on 2026-10-06 that the left arm of the bear moved too little: it hung at the side
  between the cues. In `scene.png` (02, 05), both arms of the bear are up. A real conductor uses
  the left hand for the dynamics, for held notes, and for a mirror of the beat. The rules below
  come from the score, so the pose keeps no state. `buildLeftHandTrack()` calculates the data one
  time (`prepareConductor()`), and `leftHandAt()` gives the weights at a song time.

  ```text
  quiet place --mirror--> --swell--> --fade--> --hold--> --cue or ready--> wrist and fingers
   (always)    (level)    (trend>0)  (trend<0)  (chord)    (5.4 cues)
  each arrow mixes the next place in by its weight, from 0 to 1. A later place wins.
  the playing pose (5.2) then mixes the hanging arm into the result.
  ```

  ```typescript
  /** The data of the left hand that the pose looks up at each frame (`pose/conductor-left.ts`). */
  interface LeftHandTrack {
    /** The times of the conducted beats, sorted. */
    beats: Float64Array;
    /** The weights of the mirror, of the raised hand, and of the lowered hand at each beat. */
    mirror: Float32Array;
    swell: Float32Array;
    fade: Float32Array;
    /** The held chords, sorted by start. */
    holds: readonly Hold[];
  }

  /** A held chord: a time with sound and with no new note. */
  interface Hold {
    startSec: number;
    /** The end of the sound, or the start of the next notes. */
    endSec: number;
    /** Whether the sound stops before the next notes, so that the hand cuts it off. */
    cutOff: boolean;
  }
  ```

  - **Level.** The level of a beat is the root of the sum of the squares of the loudness (5.3) of
    the notes that sound in it. Thus more players and louder notes give a higher level. Each
    level is a part of the 95th percentile of the levels of the beats with sound, at most 1, so
    that each song has its own loud passages. The level at a beat is the mean of the beats from
    1 s before it to 1 s after it.
  - **Trend.** The trend at a beat is the mean level of the beats in the 2 s after it, minus the
    mean level of the beats in the 2 s before it.
  - **Weights.** The mirror has a weight from 0 at the level 0.7 to 1 at the level 0.9. The
    swell has a weight from 0 at the trend 0.06 to 1 at the trend 0.2, and the fade the same for
    a falling trend. Each weight uses a smoothstep. Then a weight changes by at most 1.5 in 1 s
    from beat to beat: a forward pass lowers each rise, and a backward pass lowers each fall.
    Thus a gesture takes at least 0.67 s, and a short peak gives a smaller gesture. Between two
    beats, the weights mix with a smoothstep. With no limit, a weight changed by up to 0.13 in a
    frame of 1/60 s in fast music.
  - **Held chord.** A held chord starts at the last notes before a gap of at least 1.2 s with no
    new note, when the sound goes on for at least 1.2 s. The sound goes on until the end of all
    earlier notes. A held chord that starts at the end of the last one, with no cut-off between
    them, makes the last one longer, so that the palm stays up over a run of long notes. The
    hold rises in 0.4 s and goes back in 0.5 s after its end. When the sound stops before the
    next notes, the hand cuts it off: the fingers close to 80° in the last 0.25 s of the sound.
    At the song end, the closed hand stays for the bow.
  - **Places.** Each place gives the wrist from the left shoulder joint, in head heights `H`, in
    the model axes (`LEFT_HAND_PLACES`). The fingers point along a direction, and curl by an
    angle. The places are out at the left of the head, and all but the fade are above the
    shoulder, so that from behind the hand shows beside the head, as in `mockup.png`. The places
    stay above the desk of the conductor stand. The first places were in front of the left of
    the chest, and from behind the bear seemed to hold its head (review of 2026-10-07).

    | Place | Wrist (outward, up, forward) | Fingers | Curl | Shows |
    |---|---|---|---|---|
    | Quiet | 0.45 H, 0.4 H, 0.7 H | forward, 11° inward and 6° down | 25° | the hand raised and ready beside the head, as in `mockup.png` |
    | Mirror | 0.5 H, 0.5 H, 0.7 H at beat 1 | forward, 6° inward | 15° | the beat in a loud passage. The place 0.7 H forward keeps the hand within 97% of the reach in the loudest beats of Boulanger |
    | Swell | 0.4 H, 0.9 H, 0.65 H | forward and 31° up | 5° | a crescendo: the open hand rises |
    | Fade | 0.6 H, 0.05 H, 0.65 H | forward and 31° down | 5° | a diminuendo: the palm presses down at the side |
    | Hold | 0.4 H, 0.55 H, 1.0 H | forward and 17° up | 5° | the open palm holds the chord |

  - **Mirror.** The wrist moves by 0.45 of the motion of the tip of the baton in the beat plane,
    as the right wrist does, mirrored from the right to the left. Thus beat 2 of a pattern of 4,
    which goes inward with the baton, also goes inward with the left hand.
  - **Turn.** The places turn with the upper body around the `spine` bone when it turns to the
    left. In a turn to the right, they stay: a turn of 27° to the right brought the lowered hand
    of a fade into the desk.
  - **Cues and count-in.** A cue and the ready gesture mix in after the places by the larger of
    their weights, with the rules above. Thus the left hand lands on the cue point as before,
    and rises to a cue from its place between the cues.
  - **Rest pose and bow.** The playing pose mixes the hanging arm into the place, so the arm
    hangs in the rest pose. In the bow at the song end, the left arm comes down to the side in the
    0.7 s of the bend, and stays down. With the hand up, the head bowed into the held palm.
  - **Count.** The share of the play in which each weight is above 0.5, and the held chords:

    | Demo | Mirror | Swell | Fade | Hold | Held chords |
    |---|---:|---:|---:|---:|---:|
    | Boulanger | 20% | 9% | 9% | 0% | 1 |
    | Beethoven 9 | 8% | 11% | 8% | 8% | 5 |
    | Beethoven 8 | 13% | 14% | 13% | 1% | 1 |
    | Eine kleine Nachtmusik | 28% | 13% | 14% | 0% | 0 |
    | Mozart K. 315 | 11% | 16% | 14% | 7% | 8 |
    | Bach | 28% | 10% | 12% | 0% | 1 |

## 5.5 Silent seats

A muted seat, or a seat that a solo makes silent, rests: its instruments go down, and only the
idle motion continues. Thus what the user sees agrees with what the user hears. Each player
lowers its instruments with its seeded lowering after the change, and lifts them with its seeded
lift when the seat sounds again, with no hold and no scale (5.2). The principal moves first. The
pose function reads the change time from `SeatAudibility`. As in 5.2, a change starts from the
height of each player at the change, from `before`. `changeAudibility()` of `app/transport.ts`
sets it, so that fast mutes and unmutes move the instruments with no jump. A seat with no change
sounds.

## 5.6 Camera shots

The automatic camera of 2.5 films the piece as a concert film does. The pure module `shots/`
holds the rules. [`research/cinematic-camera.md`](../research/cinematic-camera.md) gives the
practice of concert films with sources, the prototype, and its faults. Each rule below that
comes from a fault of the prototype names it.

The camera is a pure function of the song time, as the pose is (5.1). `prepareShots()` makes a
shot plan one time for each score, and `cameraAt()` gives the camera of each frame. Thus a seek,
a pause, and a speed change are always correct, and the same piece gives the same film.

```text
 score ──> layoutScene() ──> layout ──┬──> preparePoses() ──> PosePlan ──> poseAt() ───┐
   │                                  │                                                │
   └──────────────────────────────────┴──> prepareShots() ──> ShotPlan ──> cameraAt() ─┤
                                       (one time for each score)          (each frame) │
                         songTime, transport (6.7, 5.1) ──────────────────────────────>│
                                                                                       v
                                         StageScene.pose() and StageScene.follow(camera)
```

```typescript
type ShotKind = 'wide' | 'high' | 'conductor' | 'side' | 'section' | 'solo';

interface ShotKey {
  azimuth: number;   // radians around y, from +z (the audience) to +x
  elevation: number; // radians above the stage plane
  zoom: number;      // a factor of the fit distance, or of the wide distance
  fov: number;       // the vertical field of view, in degrees
}

interface Shot {
  kind: ShotKind;
  startSec: number;    // the first shot starts at -Infinity
  endSec: number;      // the last shot ends at Infinity
  moveEndSec: number;  // endSec, or the song end for the last shot
  seats: readonly number[];
  part: readonly number[] | null; // the players of a choir part, such as the sopranos
  target: Vec3;
  radius: number;      // the subject sphere, or 0 for a wide or a high shot
  from: ShotKey;       // the camera at the start of the move
  to: ShotKey;         // the camera at moveEndSec
  blendSec: number;    // 0 is a hard cut
}
```

`shots/types.ts` holds the full types: `ShotPlan` adds the stage side and the starts of the
shots, and `cameraAt()` writes a `CameraPoseBuffer` (the position, the target, the field of view,
and the factor of the beam opacity) for a `CameraView` (the aspect, and `still` for reduced
motion).

**Camera key.** Each shot keeps its camera on a sphere around its target, as the default view of
4.5 does: `position = target + d × (sin az × cos el, sin el, cos az × cos el)`. The distance `d`
is the fit distance of the subject sphere at the current aspect, times the zoom. The fit distance
is `radius / sin(min(v, h)) × 1.05`, where `v` is half the vertical field of view and
`h = atan(tan(v) × aspect)`. A phone in portrait thus gets a camera about 2.1 times farther away
than a desktop. A wide shot uses the distance of the default view of 4.5, and a high shot the
default distance of 4.5, in place of a fit.

**Kinds.** The angles are in degrees. Each seeded value comes from the seed of the plan.

- Each decision of the plan has its own seeded numbers: a hash of the seed, the time of the cut
  (or of the start of the shot), and the name of the decision, such as `jitter solo 3` or `end`.
  Thus a change of one search does not change the numbers of the other decisions. With one
  generator for the full plan, each camera search took numbers from it. When the players moved
  by 1 to 2 cm (cast branch, 2026-10-06), one search changed, and all later shots changed: 30 of
  31 shots of the Boulanger demo. With each player moved by 2 cm in a seeded direction, 5 sets
  of 4 moves, the demos kept 61% to 63% of their shots and 75% to 78% of their cuts. Now they
  keep 80% to 87% of their shots and 92% to 97% of their cuts. One changed choice can still
  shift the later cuts of one demo, for example in 6 of 20 moves of the Bach demo. The
  stability tests of `shots/prepare.test.ts` need 75% of the shots and 90% of the cuts of all
  demos, and the horn shot at its entry for 5 seeds and 4 moves.

| Kind | Target | Azimuth | Elevation | Distance | FOV | Move in the shot |
|---|---|---|---|---|---|---|
| wide | 0.25 m below the stage top, 0.7 m behind its center (4.5) | 0, -24, 24, or 0 | 33, 24, 24, or 20 | the distance of the default view times 1.0, 1.1, 1.1, or 1.0 | 30 | a push-in to 0.92, or an arc of 6 (the variants from the sides arc) |
| high | `(0, 0, -0.05 × S)` | 0 to ±12 | 40 to 44 | 0.75 × the default distance | 30 | an arc of 8 to the middle and past it, and a rise of 4 |
| conductor, close | 0.3 m below the middle of the head of the bear: its shoulders | 0 ± 6 to 18 (from the audience side) | 10 | the fit of a sphere of 1.1 m | 26 | a push-in to 0.92 |
| conductor, over the shoulder | `0.4 × S` in front of the head of the bear, toward the players who play, 1.0 m above the stage top | the back of that line ± 0 to 8 (from the audience side) | 22 | the fit of a sphere of `0.3 × S` | 30 | a push-in to 0.95 |
| side | 1.0 m above the middle of the players of the seats of one side, at least `0.15 × S` from the middle line | 50 to the side ± 0 to 12 (from the audience side of that side) | 14 | the fit of a sphere of `0.27 × S` | 30 | an arc of 6 and a push-in to 0.95 |
| section | 0.8 m above the middle of the players of the group | the front of the group ± 8 to 22 | `14 + 8 × back`, plus 20 for the piano | the fit of the group sphere | 30 | an arc of 6 and a push-in to 0.92 |
| solo | 0.9 m above the principal player of the seat | the front of the player ± 20 to 40 | `12 + 10 × back`, plus 20 for the piano | the fit of a sphere of 0.95 m, or more to hold the head | 24 | a push-in to 0.9 and an arc of 4 |

- Each wide shot follows the landscape rule and the portrait rule of 4.5. In a portrait view,
  the camera is more frontal, lower, and nearer, with no zoom of its variant.
- The first wide shot is the default view of 4.5, with its elevation (33° since the newest
  reference of 2026-10-07, 25° for `mockup.png` before, and 28° until 2026-10-07). The variants
  from the sides have the zoom
  1.1, so that each player stays in the frame of a landscape view. Thus they arc and do not push
  in: a push-in to 1.01 put a stage corner of K. 525 out of a view of the aspect 1.6. The
  push-in stops at 0.92, so that each wide camera stays outside the beam fade of Free mode (4.5). Until the nearer
  default view of 2026-10-06, the variants had the azimuths 30, -28, 0, and 38, the push-in
  went to 0.88, and the frontal variant had the zoom 0.82, so that the stage corners stayed in
  the frame.
- The conductor shots take turns between two framings from the audience side, which have the
  kind `conductor`. The first one, and each odd one, is view 02 of `scene.png`: it looks over the
  shoulder of the bear at the orchestra. Its target is `0.4 × S` in front of the head of the
  bear, toward the middle of the principal players of the window, weighted by their activity.
  The line to the target turns at most 20° from the line to the back of the stage, so the camera
  stays behind the bear. The bear stands at the bottom middle of the frame, and the orchestra
  fills it. All players are subject players of this framing, so their heads do not count in the
  foreground rule. The other shots are view 05: the back, the head, and the raised arms of the
  bear, close, with the players out of focus behind it (4.5). When the framing of the turn has
  no clear camera, the other one fills in.
- Until 2026-10-06, the second framing showed the face of the bear from the orchestra side, with
  the light of 4.5 on the face, and the view over the shoulder had its target 2.0 m in front of
  the bear. The polished reference images show the conductor only from behind (1). All conductor
  shots had the frame of the face from one dark angle before: 12 of 35 shots of the Bach demo (UX
  audit 2026-10-05, SC3).
- The side views are views 03 and 04 of `scene.png`: one side of the stage from the front of that
  side and low, for example the piano and the first violins from the front left. The side of a
  seat is the side of its principal player, and a player within 0.25 m of the middle line has
  no side. A side view holds the seats of its side that play or enter in the window, with 2 or
  more such seats. Its sphere holds about the front half of the side, and the frame cuts the
  rest. All players of the side and the conductor are subject players, so their heads do not
  count in the foreground rule. The camera stays within 30° of the front of the side (75° for
  the other close shots), so it never looks along the side from behind.
- The front of a player is the direction of its facing: `(-sin f, 0, -cos f)`. The front of a
  group is the mean of the fronts of its players.
- The front of a piano subject turns 88° from the front of the pianist to its right: the side of
  the high keys and of the open lid. The seeded offset of a piano shot is a quarter of the offset
  of its kind, so the camera shows the profile of the pianist over the keys. With a turn of 100°
  and the full offset, the camera stood 128° from the front of the pianist and showed its back. The case stands in front of the pianist, so a camera in front
  of the player looked into the black case, which filled about 60% of the frame, and the hands
  and the keys did not show (UX audit 2026-10-05, SC1). The camera of the Boulanger piano solo
  now looks down on the keys from the right of the pianist.
- `back` is 0 at the podium and 1 at the back edge of the stage:
  `clamp((podium.z - target.z) / (podium.z + S / 2), 0, 1)`. A back row thus gets a higher
  camera, which looks over the front rows. With `18 + 24 × back` and `14 + 26 × back`, and a
  search up to 60°, the close shots of the back rows looked down at 40° to 60°. The animals
  showed the tops of their heads, and the dark area beside the stage filled 30% to 45% of the
  frame (UX audit 2026-10-06, N4). The close shots of `scene.png` (06 to 08) look at the players
  almost level, so the section and solo shots start at `14 + 8 × back` and `12 + 10 × back`
  since 2026-10-06 (were `18 + 10 × back` and `14 + 12 × back`). The front rows thus get a camera
  4° and 2° lower. With `12 + 8 × back` and `10 + 10 × back`, the horns of a test file had no
  clear camera at their entry.
- The section groups: violins, low strings (viola, cello, contrabass), woodwinds, brass,
  percussion (timpani and percussion), harp, piano, and choir. The two-shot of a small group has
  the group `ensemble` (below). A group holds its active seats and
  the seats that enter at the cut. Its sphere holds each player plus 0.75 m in the stage plane,
  and each head point plus 0.3 m. If the sphere is larger than 2.6 m, the group keeps the seat
  with the most activity, and the next seat if both still fit. If one seat alone is too large,
  the shot keeps the players nearest to its principal player. The full group of the prototype
  gave a "section" 7 m wide that looked like a high wide shot.
- A part shot is a section shot of the part of a choir seat that sings the tune (the tune of a
  choir, below), for example the sopranos. Its group is `choir`, so rules 1 and 2 keep it apart
  from a section shot of the full choir. Its sphere holds each player of the part plus 1.35 m
  in the stage plane: the section margin and the place of one more singer (0.6 m, 4.5) on each
  side. The sopranos of the Ode to Joy demo stand at the left end of the risers, 1.2 m behind
  the contrabasses. With the section margin, the large heads of the contrabass players refused
  each camera of the sopranos below 50° within 60° of their front. Now the sopranos have clear cameras from 18° in front
  of them, and the plan of the demo opens the close shots with them at 8.6 s, 21° high.
- Each move blends the azimuth, the elevation, the zoom, and the field of view with a smoothstep
  over the full shot, `u² × (3 - 2u)`, so the move starts and ends at rest. The move turns around
  the target, so it never cuts through the subject. The plan uses no change of the field of view
  in a shot.

**Cut points.**

- A cut falls on a downbeat, or on the middle beat of a bar with an even number of beats. The
  planner scores each such beat from 4 s to 14 s after the start of the shot (18 s for a wide or
  a high shot): `-|length - wanted| / 3`, +0.5 on a downbeat with a bar index that is a multiple
  of 4 (a phrase line), +0.2 on a multiple of 2, -0.3 on a middle beat, and the bonus of an entry
  below. The wanted length is seeded: 5 to 12 s for a conductor, a section, or a solo shot, and 9
  to 12 s for a wide or a high shot.
- The user asked on 2026-10-07 that the automatic camera films the player who just started to
  play. A cut from a quarter of a bar before an entry (below) to one bar after it is a cut at the
  entry, and it gets +5, less 0.5 for each bar after the start of the entry. The bonus is larger
  than the phrase bonus and the penalty of a repeated length together, so a cut at an entry wins
  over a cut near it with no entry. The first entry with a cut point in reach after the shortest
  length ends the shot: the wanted end moves to the start of the entry, and the planner first
  scores only the cut points in its reach. When none fits the room before the last shot, it
  scores the full window. Until 2026-10-07, an entry gave +1.5 only to a beat within a quarter of
  a bar, and the wanted length often won. The plans of the demos then cut to an entering seat
  within one bar at 23 of 95 entries (24%).
- With cuts only on downbeats, a phrase bonus of +1.0, and a wanted length of 6.5 to 9.5 s, the
  cuts of a piece with a steady tempo fell on a grid: in Bach, 30 of 34 shots lasted 9.6 s, and
  K. 525 had three lengths (UX audit 2026-10-06, N5). Each demo now has at least 5 lengths, and
  no length holds more than half of its shots. The bars of K. 525 (3.6 s) allow only 5 lengths
  from 4 s to 14 s.
- A cut that gives the shot the length of the previous shot loses 1.0: more than the phrase
  bonus, and less than the entry bonus. With the side views of 2026-10-06 and no such rule, the
  cuts of the Bach demo fell on whole bars of 2.4 s, and 37 shots had 4 lengths. 13 of 36
  neighbor shots had the same length. Now each demo has at most 15% of neighbor shots with the
  same length. With a penalty of 0.4, the phrase bonus of 0.5 still made such pairs, and 68 of
  180 plans (the 6 demos with 30 seeds) had more than 15%. The polished cast gave Boulanger 5
  equal pairs of 30 (cast branch, 2026-10-06). With 1.0, 3 of 180 plans have more than 15%.
- With no downbeat in the window, the cut falls on the beat nearest to the wanted time. A bar of
  4/4 at 40 BPM is 6 s, so this case is real.
- The lengths are in song seconds. At 1.5x, a shot of 4 s lasts 2.7 s of wall time.
- The first shot is a wide shot from `-Infinity` to the first cut, which the rule of a wide shot
  sets: 4 s to 18 s after the downbeat. It is the default view of 4.5, so the first screen, the
  count-in, and the first phrase show one view with no cut. After the downbeat, it pushes in to
  the zoom 0.92. Choice D of the report opened on the conductor. The UX audit of 2026-10-05
  (FI1) showed that this cut lost the full orchestra for 5.5 s to 10.4 s, at the first click and
  at each demo switch, and showed a dark frame with no player. A concert film also starts with
  an establishing shot (S7 of the report).
- The last shot is a wide shot of the default view. It starts on the last downbeat that is at
  least 8 s before the song end, pulls out from the zoom 0.92 to 1.0 until the song end, and holds
  after it.
- The end of each shot leaves room for the shots that rule 3 below needs before the last shot:
  9.5 s for each missing shot. With 5 s, and later
  with 6.5 s, a slow last phrase of the Beethoven 8 demo left room for two shots only. The
  second time, no subject fitted at the last cuts, after the phone view of the foreground rule
  changed the plan (UX audit 2026-10-06, N3).

**Choice of the next shot.** The planner reads the music of the 8 s after the cut from the
`Score`:

- The coverage of a seat is the part of the window that the merged note spans of the seat cover.
  The loudness of a seat is the highest `noteLoudness()` of its notes in the window (5.3).
- An active seat has players and a coverage of 0.3 or more. The activity of a seat is
  `coverage × (0.3 + loudness)`, and the share of a group is its activity divided by the activity
  of all seats.
- An entry is the first note of a seat after a rest of at least two full bars and at least 4 s,
  or its first note after the song start with the same rest (`findEntries()` in
  `shots/entries.ts`). The seat then plays a passage: its notes cover 0.3 of the 8 s after the
  entry, or more (`prepareMusic()` in `shots/music.ts`). Two bars of the Boulanger demo last
  2.5 s, and with the bars alone it had 125 entries in 280 s, one in each 2.2 s. A single stroke
  of the triangle after a rest was an entry too. A seat enters at a cut when its entry starts
  from one bar before the cut to a quarter of a bar after it. The cues of the conductor (5.4) have
  their own rule in `pose/cues.ts`, so a change of the cues does not change the shots.
- A seat that rests at the cut and enters later in the window is no subject of the cut, also when
  it is active in the window: its entry gets its own cut. A test file with a piano that rests
  until 26 s had a solo shot of the silent pianist from 22 s, and rule 1 then cut away from the
  piano at its entry.
- A tutti: 65% or more of the seats with players are active, with a mean loudness of 0.55 or
  more.
- The lead: an active seat with a pitched instrument (not the timpani and not the percussion)
  carries the lead when it holds the top line, the highest key of the pitched seats, in half the
  window or more. The window is read every 0.25 s, and a tie gives the step to each seat of the
  tie. A seat also carries the lead when its loudness is 0.15 or more above the mean loudness of
  the other active seats: one loud seat over a quiet accompaniment. A concert film follows the
  instrument with the melody (S1 of the report). The solo flute of the K. 315 concerto plays
  softer than the strings in the file, so the loudness alone did not find it.
- The tune of a choir: an active choir seat sings the tune when its top voice has the key of
  the top line, or that key one or more octaves lower, in half the window or more. It then
  carries the lead too. The players of that seat that sing its top voice in half of its sung
  steps or more are the part of the tune, for example the first two of 8 singers in chords of
  four keys (divisi, 3.8). The flutes and the violins double the sopranos of the Ode to Joy
  an octave higher, so the top line alone gave the choir 0% to 34% of each window, and the
  choir never carried the lead. With the octaves, its top voice sings the top line in 81% to
  97% of each window of the theme (0 s to 64 s).
- The first voice: at the first cut after the opening, each active seat that played its first
  note in the opening counts as an entry at the cut. The entry rule needs two full bars of rest,
  and the song start is the end of a rest, so the baritone of the Ode to Joy excerpt until
  2026-10-06, which sang alone from 1.5 s, had no entry. The test file
  `score/test-first-voice.ts` holds this case: an oboe plays alone from 1 s, and four string
  seats enter at the first cut (8 s). With the rule, the oboe has the first close shot for the
  seeds 1 to 5. Without it, the strings have it.

| Candidate | Score |
|---|---|
| wide | 0.8, plus 2.2 in a tutti, plus 8 when it is due |
| high | 0.3, plus 1.6 in a tutti, plus 0.4 with 6 or more active seats, plus 8 when it is due. Only with 3 or more seats |
| conductor | 1.1, plus 0.5 with 5 or more active seats. Only with a conductor and 3 or more seats |
| side view of a side | 0.4 + 2 × share of the seats of the side, plus 0.8 if a seat of it enters at the cut, plus 0.6 with the piano. Only with 3 or more seats on the stage, and 2 or more seats of the side in the window |
| section of a group | 0.6 + 3 × share, plus 1.5 if a seat of the group enters at the cut, plus 0.6 if a seat of the group carries the lead, minus 0.8 in a tutti |
| part of a choir seat that sings the tune | the score of a section shot of that seat alone. Only with 3 or more seats, and with fewer players in the part than in the seat |
| solo of a seat (its player 0) | 0.2 + 2.5 × share, plus 1.2 with 3 or fewer active seats or at an entry, plus 1.2 at its own entry, plus 1.2 if it carries the lead, plus 0.4 for the piano and the harp, minus 1.0 in a tutti |

Before the scores, each candidate has a rank. A wide or a high shot that cannot wait for the
next cut comes first: the shortest close shot from the cut would end more than 60 s after the
end of the last wide view, or the cut is in the last 46.5 s before a last shot that starts more
than 60 s after the last wide view (N6, below). Then the solo shot of a soloist that enters at
the cut: the soloist of the score (3.8), or a seat with one player that carries the lead. Then
each other candidate that shows a seat that enters at the cut. Then the other candidates. The
rules below change the scores in each rank. Thus the entering seat wins the cut over a tutti and
over a wide view that is only due, and a soloist wins it over the sections that enter with it. In
a test file with loud strings that enter with a piano soloist, the solo shot of the first violins
or of the cellos won the cut in 2 of 5 plans before the rank of a soloist. An
exception to rule 2 for the solo shot of an entering seat gave 3 more cuts at an entry of 95,
but two shots of the violins then came in a row in the Boulanger demo, so rule 2 stays.

The bonuses of the lead come from the UX audit of 2026-10-05 (SC4). The solo flute of the K. 315
concerto had its first solo shot at 94 s, and the first singer of the Ode to Joy excerpt until
2026-10-06 at 18 s. Then the flute had the first close shot at 10.4 s, and the baritone the first
close shot at 9.0 s. The choir of the Ode to Joy excerpt since 2026-10-06 sings the tune from
0 s, and the plan opens the close shots with its sopranos at 8.6 s (the tune of a choir, above).

A wide view is due 45 s after the end of the last wide or high shot (the opening counts), and
at the cuts in the last 46.5 s with room for a wide shot before the last shot (rule 3), when the
last shot starts more than 60 s after the last wide view. A close shot also ends at most 60 s
after the last wide view, when its shortest length allows it. Thus a wide or high shot comes at
least every 60 s. K. 315 showed no wide view from 10 s to 183 s, and Boulanger none from 114 s
to 232 s (UX audit 2026-10-06, N6).

Then these rules apply, in this order:

1. No repeat: the kind and the subject of the previous shot get no score.
2. No same group: a section or solo shot of the group of the previous shot gets no score. Without
   this rule, the prototype gave four woodwind shots in a row.
3. No two wide shots near: a wide or high shot needs at least three other shots since the last
   wide or high shot, or since the start, and room for three shots of 9.5 s before the last shot
   (the room of the cut points above). Thus the
   wide and high shots after the opening are at most 25% of the shots after it. A conductor shot
   needs at least five other shots since the last conductor shot, or since the start. Thus the
   conductor shots are at most 17% of the shots, as the 15% of S1 in the report, and the bear
   shows after the opening phrase. With two shots, the Beethoven 5 demo
   (removed on 2026-10-05, 8.2) had 12 wide and high shots of 38 (32%). A side view needs at
   least three other shots since the last side view, or since the start.
4. Variety: a subject of the last 4 shots loses 1.6. A side, section, or solo subject loses 0.5
   for each earlier use. Without this rule, the harp got 6 solo shots in the Boulanger demo.
5. Seeded jitter: each score gets a seeded value from -0.25 to 0.25.
6. Clear camera: the best candidate with a clear camera wins. When no candidate has a clear
   camera, for example when no seat is active in the window after the cut, the previous shot
   holds on to the cut that a shot of its kind from there would get, within its own longest
   length. Until 2026-10-06, the hold took the cut of a new shot, and it failed when that cut
   came after the longest length. In a rest of a plan of the Beethoven 8 demo, a conductor shot
   then came after a conductor shot. Else a conductor shot fills the time, also against the spacing of rule 3,
   because the bear conducts the rest. After a conductor shot, it has the other framing. Else a
   wide shot fills the time. In the Beethoven 8 demo, such a wide shot came just before the last
   shot, against rule 3, and made a jump cut with it. A test file with a rest of 32 s before its
   last bar showed this wide shot again, after a conductor shot, until the other framing of the
   conductor could fill in.

**Chamber groups and small groups.** The user decided on 2026-10-06 that a chamber group (4.2)
has no conductor, and that a group with fewer than 3 seats gets no conductor shot (UX audit
2026-10-06, N9). The shots of the bear's back were the weakest frames of the film of a piano
solo. The agent chose the details on 2026-10-06:

- A score with no conductor has no conductor shot. Where rule 6 lets a conductor shot fill the
  time, a wide shot fills it.
- A score with fewer than 3 seats with players (`SMALL_GROUP_SEATS`) gets only the solo shots of
  the principal players, a two-shot, and the wide shots: no high shot, no section shot, and no
  conductor shot, also when it has a conductor.
- The two-shot is a section shot of all players on the stage, also of a seat that rests, with
  the group `ensemble`. A group with one player has no two-shot. Its score is the score of a
  section shot of all seats. Its sphere holds each player plus 0.5 m in the stage plane, in place
  of 0.75 m: with 0.75 m, each camera of the two-shot of the duo test file was 0.45 to 0.46 of the
  default distance away, beyond the limit of 0.44 of the close shots, so the duo had no two-shot.
- With one seat, rules 1 and 2 do not stop a solo shot of that seat after a solo shot of the same
  seat. The jump cut rule and the rule of no repeat of a framing keep the two cameras at least
  20° apart. Thus a piano solo shows the pianist from several sides between its wide shots.
- The opening wide shot holds through the count-in of the leader (5.4), as for an orchestra.
- The plans of the chamber test files (`models/test-chamber.ts` and the piano solo of the audit)
  with the seed of the app:

  | File | Shots after the opening |
  |---|---|
  | Piano solo (one seat) | solo, solo, solo, solo, solo, wide |
  | Violin and piano (two seats) | two-shot, solo of the piano, solo of the violin, two-shot, wide |
  | String quartet | solo, section, section, side, wide |
  | Wind quintet | solo, section, side, solo, solo, wide |

Mute and solo do not change the plan. The plan is made one time for each score, and a solo would
need a new plan (choice C of the report).

**Clearance.** The camera must never stand inside a player, and the subject must not hide behind
an item. The obstacles are the boxes of `layoutObstacles()`: the footprints of 4.5. A player
footprint has one box for the parts of each bone in each band of 0.2 m, so the body of a player
is several boxes.

- The line of sight from 0.3 m outside the target to the camera at the aspect 0.46 crosses no box.
  A narrower aspect moves the camera back along the same ray, so one test covers the aspects from
  0.46 up. The test skips the boxes within 0.4 m of the target: the body of the subject and the
  instrument at its chest. A far part of a large instrument, such as the piano case or the harp
  frame, still counts. The first prototype skipped all boxes of the pianist and looked into the
  piano case.
- A solo or a conductor shot also has sight points: the middle of the head, each palm that holds
  the instrument in the playing pose, and one point of the instrument (the middle of its first
  play target, such as the bow contact, the keys, or the harp strings, else the mouthpiece). The
  conductor has its head and the point of beat 1 (5.4) with its mirror for the left hand. Each
  line of sight starts 0.15 m from its point and ends at the camera of the aspect 1 and of the
  aspect 0.46, at the start, the middle, and the end of the move. The line to the head crosses no
  box. It skips the boxes of its own player, because
  the box of the head band holds the head. Of the lines to the hands and the instrument, at most
  one crosses a box. Each of these lines skips the body boxes of the target and each box within
  0.25 m of its point. One line to the target passed when a front-row head covered the harp, a
  stand crossed the flute of the K. 315 soloist, or the piano case hid the keys (UX audit
  2026-10-05, SC1).
- No head of another player stands in the foreground of a close shot, at the start and at the
  end of its move, in a desktop view (aspect 1.6) and in a phone view in portrait (aspect 0.46).
  The plan is the same for all views, so the camera must pass in both. A head in the foreground is nearer to the
  camera than 0.75 of the distance of the focus of the subject, and a part of it shows in the
  frame. A head nearer than 0.95 of that distance also counts when a part of it shows in the
  middle of the frame (half its width 0.4, half its height 0.6, in the units of the view). The
  focus is the middle of the head of a solo player or of the conductor, or the target of a
  section. The heads of the subject players do not count. Each head is a sphere of 0.6 `H`. Two
  rabbit heads of the first violins covered the harp of the Boulanger demo at 1.3 times the size
  of the head of the deer.
- A choir shot looks at the singers over the orchestra, and the heads of the back rows stand
  in front of them. A head with its top under the chest of each singer of the subject on the
  screen covers no face and no music folder. The two rules above skip it, and the rule of a
  large head below still applies. The chest is the `chest` bone of the bind pose, where the
  singer holds its folder (4.5). All singers of the choir seat are subject players. With no
  such rule, the heads of the contrabasses, the timpani, and the woodwinds refused each
  camera of the choir section of the Ode to Joy demo below 50° (below 55° in front of it), and
  the plan had no choir section shot. The rule with the feet of the singers in place of their
  chests still refused each camera below 50°: the contrabass players stand 1.2 m in front of
  the risers, and their heads are 0.6 m above the riser top. Now the choir section has clear
  cameras from 26° in front of it.
- A head nearer than 0.75 of that distance counts only when more than a thin cap of it shows:
  its middle is less than half its radius outside the frame. A low camera shows the tops of the
  heads of the front rows at the frame bottom (N4).
- A head nearer than 0.95 of that distance also counts when its radius on the screen is more
  than 0.24 of half the height of a landscape frame, or of the geometric mean of the half sides
  of a portrait frame, and its middle is less than half its radius outside the frame. A solo shot shows the head of its player with a radius of about 0.22. In 12
  of 175 desktop frames, heads with a radius of 0.26 to 0.39 stood at the frame edges, and the
  rule of the middle did not see them (UX audit 2026-10-06, N2).
- No other object covers more than 15% of the frame of a close shot, at the start and at the end
  of its move, in the same two views. The objects are each player with its instrument, the conductor
  with the podium, and each stand. The subject players and the risers do not count. A box of an
  object counts when its middle is nearer to the camera than 0.9 of the depth of the focus, so a
  neighbor at the depth of the subject does not count. The test marks the cells of a grid of
  20 × 20 over the frame that the screen rectangle of each box covers. The piano case of the
  soloist place covered 30% to 45% of the solo shots of the first violins, and the head rule did
  not see it (UX audit 2026-10-06, N1). The planner tests the heads before the clearance, and the
  cover of the objects after it, because the cover test costs more.
- The tall frame of a phone shows more of the area in front of the subject. With the test in a
  desktop view only, the head and the baton of the bear and the case of the celesta filled the
  lower third of the phone frames of the first violins (UX audit 2026-10-06, N3). The size of a
  head in a portrait frame counts against the geometric mean of its half sides, because the
  area of the frame sets how large a head looks. With the narrow half width as the unit, a
  single horn behind the strings had almost no clear camera.
- The middle of the body of the bear (0.8 m above the podium top) stays out of the desktop frame
  of a solo shot of the soloist, at the 5 test points of the move. The soloist stands beside the
  podium, and a camera from its other side showed the bear behind it. With the low elevation
  bands of N4, the plan of K. 315 took such a camera.
- Each close camera stays nearer to the stage center than 0.44 of the default distance at the
  aspects 1, 0.7, and 0.46, so that a change to Free mode keeps the beam of the shot (4.5).
- Each camera from the aspect 1 to the aspect 0.46 keeps 0.6 m from each box, and 1.0 m from
  each box of the podium and the conductor. The arms and the baton of the bear reach out of its
  bind footprint: in a frame of the prototype, the camera was 0.9 m from the bear, and its arm
  filled a fifth of the frame.
- The camera stays at least 0.6 m above the stage top.
- The camera stays inside or outside the cone of the visible beam (4.5) for a full shot, 0.3 m or
  more from its surface, at the aspects 1, 0.7, and 0.46. The beam draws only its outer faces,
  so a camera inside the cone sees no beam. In the first plans, a section camera crossed the cone
  in its push-in, and the image got darker at once in the middle of the shot. A cut or a blend
  that changes the side is a hard cut. `models/beam.ts` holds the cone.
- The planner tests 5 points of each move, the line of sight to the target at 17 points, 1/16 of
  the move apart, and the line of sight of a blend at 65 points, 1/64 of the move apart. With 5
  points, the sight line of a blend of the Beethoven 8 demo crossed a box between two points at
  the aspect 0.46. With 17 points, a later blend of that demo crossed a box between two points
  too. A section camera of the K. 525 demo crossed a box at 15/16 of its move. It tries the
  wanted azimuth, then ±12°, ±24°, ±36°, ±48°, ±60°, and ±72°, then the same azimuths 8°, 16°,
  24°, 32°, and 40° higher, up to the top of the elevation band. A full search (below) then also
  tries, at each elevation, each place of the 6° grid up to 150° from the wanted azimuth, with
  the seeded arc and then with the arc to the other side. The camera stays within 75° of the
  front of the subject (30° for a side view), so it never shows the back of a player. A search
  over the full circle showed players from behind.
- The elevation bands: up to 30°, from 30° to 40°, and from 40° to 50°, each 20° higher for a
  piano shot. At a cut, each candidate first gets a search in the lowest band, so a lower
  camera of a candidate with a lower score wins over a higher camera of a better candidate. The
  best candidate of the cut gets all bands at once when a seat of it enters at the cut. Each
  candidate that shows an entering seat gets the band up to 40° and a full search, and a
  candidate within 1.0 of the best score the band up to 40°, so that an entry or the lead keeps
  its shot. With all bands for each candidate of an entry, 13 of 82 section and solo shots of
  the demos (16%) looked down at more than 40°, above the limit of 15% of N4. With all bands for
  each best candidate, 21% of the section and solo shots looked down at more than 40°. The other
  candidates get the higher bands only when no candidate has a clear camera before. With the low
  band first for all candidates, the single horn of a test file behind the strings had no shot
  at its entry for 3 of 5 seeds, and the baritone of the Ode to Joy excerpt until 2026-10-06, on
  the lowest riser, no shot at the first cut. A conductor shot that fills the time searches all
  bands. The shot statistics below give the elevations of the plans of the demos.
- The shares of N4 (at least 60% of the section and solo cameras at 30° or lower, and at most
  15% above 40°) hold where no player blocks a camera. `shots/prepare.test.ts` checks them on
  the layouts of the demos spread 3 times. In the demos, the bodies block some low cameras, so
  a new body moves the shares, and the test of the demos checks only the limit of 50°.
- The other framings of that entry come next, before the other candidates: each candidate that
  shows a seat that enters with the best candidate, for example the section of the horn after the
  solo of the horn.
- The full search and the other framings keep the shot of an entry when a small change of the
  player footprints takes away one camera. The single horn of the test file has 14 clear solo
  cameras of 336 at its entry, all 40° to 50° high and most of them on its left. For seed 4, the
  steps from the wanted azimuth reached one of them, and it cleared a head at the frame edge by
  0.002 of the half frame width. A move of the players by 1 cm took it away (cast branch,
  2026-10-06), and the section of the horn missed the band up to 40° by 0.01 of score. The first
  horn shot then came 6 s late. The baritone of the Ode to Joy excerpt until 2026-10-06 had 3
  clear solo cameras of about 350, all 50° high. Now the horn has its shot at the entry for 10 seeds, also when each player
  moves by 2 cm.
- The seeded offset of the wanted azimuth from the front of the subject is a multiple of 6°. Thus
  each camera of the search of a subject stands on one grid around its front, and the planner
  keeps the result of the foreground and the clearance tests of each camera of each subject for
  the later cuts. The same subjects come back at many cuts.
- A wide or a high shot needs no test, because its camera is far outside the stage. Each player
  of the stage stays in the frame of each wide shot, with its feet and its head. In a landscape
  view, the 4 top corners of the stage also stay in the frame. A wide shot in a portrait view
  follows the portrait rule of 4.5, so the stage corners can leave the frame. At 1440 × 900
  with the drawer open (2.8), each player of the opening stays in the free area left of the
  drawer, between the title and the bar.
- The test reads a circle of each obstacle and a sphere of each box before it tests the box.

**Jump cuts.** Two neighbor shots differ by at least 30° in the view direction, or by a factor of
1.5 in the size of the subject (a wide or a high shot has the size `0.7 × S`). A camera of the
search that breaks the rule does not count. The conductor shots look in the direction of the
section shots, so the jump cut rule alone keeps them apart. The two conductor framings differ in
size by more than 1.5 times.

**No repeat of a framing.** The camera of a side, section, or solo shot stays at least 20° in
azimuth from the camera of the last shot of the same subject (the same side, the same seat, or the
same section group).
A part shot of a choir seat, such as the sopranos, has the section group of its seat, `choir`.
Until 2026-10-07, the planner kept the part and the full choir apart. With the entry shots, a
section shot of the choir of the Ode to Joy demo then started 2.6° from the camera of its part
shot.
A camera of the search that breaks the rule does not count. K. 315 showed the solo flute six
times from almost the same angle, and Beethoven 8 its oboes and clarinets three times from the
same high angle (UX audit 2026-10-06, N7).

**Transitions.** A hard cut is the default. A blend is a short camera move from the end of the
previous shot to the new shot, over one beat of 0.5 to 1.2 s, after the downbeat. It replaces the
dissolve of a concert film, because a true dissolve needs two renders for each frame. A blend
applies only when all of these are true:

- the beat is 0.75 s or longer, or the mean loudness of the window is 0.35 or less,
- both shots are conductor, section, or solo shots,
- the two cameras of a desktop view are less than `0.35 × S` apart,
- the straight path between them passes the clearance test at the aspects 1 and 0.46, and stays
  on one side of the cone of the beam.

With reduced motion, each cut is hard.

**Frame.** `cameraAt()` marks a close shot with `close`, and the frame of a close shot fits into
the free area above the bar and left of the open drawer (4.5). The planner tests the full frame,
so the user sees each part of it. The camera of the shot does not change.

**Beam.** The manager decided on 2026-10-05 that the visible beam (4.5) fades in the close shots.
A close camera outside the cone saw the additive beam over the full image, and the close shots
looked washed out.

```typescript
const SHOT_BEAM_OPACITY = {
  wide: 1,
  high: 1,
  conductor: 0.15, // CLOSE_BEAM_OPACITY: a hint of the light stays
  side: 0.15,
  section: 0.15,
  solo: 0.15,
} as const satisfies Record<ShotKind, number>;
```

- The factor multiplies the opacity of the beam (4.5). It comes from the kind of the shot, so it
  is constant in a shot, and the beam never changes in the middle of a shot.
- A hard cut changes the factor at once. A blend blends it with the weight of the camera.
- A camera inside the cone sees no beam at each factor, because the beam draws only its outer
  faces.
- Free mode reads the factor from the camera distance (2.5, 4.5). The close shots of the demos
  are at 0.37 of the default distance or nearer, and the high shots at 0.74, so a change to Free
  mode keeps the factor.
- `shots/beam-opacity.ts` holds the values.

**One frame.** `cameraAt()` does these steps:

1. Before the first play (`transport.changedAtWall === null`), it gives the default view of 4.5.
2. It takes the time `t`. During play, `t = max(songTime, transport.startSec)`, so the count-in
   holds the camera of the start point. While paused, `t = songTime`, because a seek while paused
   does not change `startSec`.
3. A binary search in the starts of the shots finds the shot.
4. It blends the keys with `smoothstep((t - start) / (moveEndSec - start))`. The move of the
   first shot starts at the downbeat. With `still`, it uses the `from` key.
5. It calculates the distance from the aspect and multiplies it by the zoom.
6. In the blend time after the start, it blends from the end camera of the previous shot.
7. It takes the factor of the beam from the kind of the shot, and blends it in the blend time.
   The default view has the factor 1.

| Case | Camera |
|---|---|
| Before the first play | The default view of 4.5. The first screen does not change |
| Count-in from the song start | The first shot: the default view, still. Its move starts at the downbeat |
| Count-in after a pause | The camera of the pause point holds, as the players hold their poses (5.2) |
| Pause | The camera of the pause point holds, with no drift |
| Song end | The last wide shot holds at the end of its pull-out |
| Seek | The shot of the new song time shows at once. A seek is a cut |
| Speed | All times are song times, so the cuts and the moves follow the speed |

**Shot statistics** of the plan with the seed of the app, for the demos of the user decision of
2026-10-05 (8.2), after the fixes of the second UX audit of 2026-10-06 (the shot composition, and
the layout of N1 and N8), after the conductor views from behind, the side views, and the lower
close shots of 2026-10-06 (1), after the polished cast and the stable planner of 2026-10-06
(the seeded numbers of each decision, the full search of an entry, the hold within the longest
length, and the penalty of 1.0 of a repeated length), after the Ode to Joy excerpt and the
choir shots of 2026-10-06, and after the entry shots of 2026-10-07. The median and the shortest
length leave out the last shot, which holds after the song end. The wide shots hold the opening and the last shot. "Gap" is the
longest time from the end of a wide or high shot to the start of the next one. "Above 40°" counts
the section and solo shots with a camera higher than 40° (no piano).

| Demo | Shots | Conductor | Side | Section | Solo | Wide | High | Median length | Shortest | Blends | Gap | Above 40° |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Boulanger | 42 | 3 | 8 | 8 | 17 | 6 | 0 | 5.8 s | 4.0 s | 0 | 56 s | 3 of 22 |
| Beethoven 9 | 18 | 2 | 4 | 5 | 3 | 3 | 1 | 8.6 s | 4.1 s | 0 | 52 s | 0 of 8 |
| Eine kleine Nachtmusik | 27 | 4 | 6 | 0 | 10 | 4 | 3 | 9.1 s | 5.5 s | 0 | 35 s | 2 of 10 |
| Bach | 34 | 5 | 6 | 10 | 5 | 6 | 2 | 9.6 s | 4.8 s | 0 | 42 s | 0 of 13 |
| Beethoven 8 | 26 | 4 | 4 | 6 | 6 | 4 | 2 | 8.2 s | 4.1 s | 1 | 46 s | 2 of 12 |
| Mozart K. 315 | 28 | 2 | 4 | 7 | 10 | 5 | 0 | 9.1 s | 5.2 s | 0 | 60 s | 3 of 17 |

Main of 2026-10-07, before the entry shots, had these rows: Boulanger 31 shots (4, 5, 4, 12, 5,
and 1), a median of 9.8 s, a shortest of 5.0 s, a gap of 51 s, and 3 of 14 above 40°. Beethoven
9: 19 shots (3, 3, 6, 2, 3, and 2), 8.4 s, 4.3 s, 42 s, and 1 of 8. Eine kleine Nachtmusik: the
same row as now. Bach: 35 shots (5, 7, 10, 5, 6, and 2) and a gap of 47 s. Beethoven 8: 25 shots
(4, 5, 3, 7, 3, and 3), no blend, and 2 of 10. K. 315: 29 shots (3, 4, 7, 9, 5, and 1), a gap of
55 s, and 2 of 16. The other values were the values of the table. The rows of Eine kleine
Nachtmusik, Beethoven 9, and K. 315 in this table before 2026-10-07 came from older plans.

**Entry statistics.** `shots/entry-cuts.test.ts` measures the request of 2026-10-07 with its own
reading of the notes: an entry event is the first note of one or more seats after a rest of two
full bars and 4 s, with a passage after it, within a quarter of a bar of each other. The plan
cuts to the event when the first cut from a quarter of a bar before it, at most one bar after
it, shows an entering seat. The events in the last shot do not count. The test needs 50%.

| Demo | Entry events | Cut to the entry on main | Cut to the entry now |
|---|---:|---:|---:|
| Boulanger | 61 | 9 | 29 |
| Beethoven 9 | 5 | 1 | 5 |
| Eine kleine Nachtmusik | 1 | 1 | 1 |
| Bach | 2 | 0 | 1 |
| Beethoven 8 | 11 | 5 | 8 |
| Mozart K. 315 | 15 | 7 | 9 |
| All | 95 | 23 (24%) | 53 (56%) |

The reasons of the misses come from a run with debug records of the planner, which reads 94 events:
one less than the test, because of a small difference of the tolerance of a rest. On main, the cut
fell elsewhere in 33 of 71 misses: the wanted length and the phrase lines won over the bonus of
1.5. In 14, no shot of the entering seats had a clear camera, in 11 the cut before came less than 4
s before the entry, in 8 another candidate had a higher score, in 3 the cut came more than a
quarter of a bar after the entry, so the planner did not see the entry, and in 2 rule 1 or rule 2
stopped it. Now, of 41 misses: in 15, the cut at another entry came less than 4 s before (the
Boulanger demo has an entry every 4.5 s), and in 1 another cut did. In 13, no shot of the entering
seats had a clear camera, mostly the woodwinds and the brass behind the strings, where heads of
other players stand in the foreground. In 4, a wide or a high view could not wait (N6). In 4,
another seat that entered at the same cut won it. In 3, rule 1 stopped the shot, because the
previous shot had the same subject, and in 1 rule 2 did.

With the entry shots, all demos together keep 94% of their cuts and 77% of their shots when each
player moves by 2 cm (main of 2026-10-07: 92% and 78%).

The choir shots changed only the plan of the Ode to Joy demo, because the other demos have no
choir. Before them, the plan of the new excerpt had the same row, but 5 section and 3 solo
shots, and no close shot of the choir: the choir showed only in a side view at 22.9 s, and in
the wide and the high shots. Now the sopranos have a part shot at 8.6 s (21° high), the full
choir a section shot at 48.6 s (29° high), and the principal singer a solo shot at 127.7 s. The
choir sings the theme until about 64 s. With the Ode to Joy excerpt until 2026-10-06, the row
was 22 shots (3, 4, 4, 6, 3, and 2), a median of 9.0 s, a shortest of 6.0 s, no blend, a gap of
57 s, and 2 of 10 above 40°.

Between the plans of the stable planner and the choir shots, other changes of 2026-10-06 also
changed two rows. Boulanger had 6 section, 10 solo, 6 wide, and 0 high shots, a median of 9.1 s,
a shortest of 5.1 s, and a gap of 50 s. Bach had 9 section and 6 solo shots, and 0 of 14 above
40°. The plans of the chamber test files did not change.

Before the stable planner, the same plans had 31, 24, 30, 39, 25, and 31 shots, a median of
9.0 s, 7.5 s, 7.3 s, 9.0 s, 9.5 s, and 7.8 s, and 7 of 84 section and solo shots above 40°. The
polished cast then gave Boulanger 33 shots. The penalty of a repeated length makes the median
longer, because a cut of the previous length often fell on the phrase line nearest to the
wanted length. The full search of an entry finds more high cameras: now 10 of 74 section and
solo shots are above 40°.

With the conductor shot of the face, the same plans had 30, 22, 29, 38, 27, and 31 shots, and
1 blend in Beethoven 8 and K. 315 each. Before the side views, the plans with the conductor views
from behind had 30, 22, 30, 38, 27, and 31 shots. Before the lower section and solo shots,
the plans with the side views had 30, 24, 30, 39, 25, and 31 shots.

With the layout of the second audit and the planner before its shot fixes, the same plans had
33, 22, 30, 36, 24, and 30 shots, a gap of 109 s, 70 s, 55 s, 67 s, 82 s, and 151 s, and 34 of 119
section and solo shots above 40°. The shot frames of the second audit had a large object or
head of another player in 50 of 169 desktop frames and 47 of 169 phone frames. After the fixes,
the count is in the status of the audit.

The first plans after the fixes of the UX audit of 2026-10-05 had 33, 22, 30, 36, 24, and 30
shots, with 2, 3, 4, 5, 4, and 3 conductor shots, and a median of 8.3 s, 9.0 s, 7.3 s, 9.6 s,
10.9 s, and 10.4 s.

Before the audit fixes, the plans had 38, 23, 31, 35, 25, and 30 shots, with 4, 5, 6, 12, 6, and
6 conductor shots, and 0, 1, 0, 0, 2, and 0 blends. The other demos have no blend: the blend
paths of the slow demos cross a box, or the two cameras are too far apart.

The soloist place of 4.5 (2026-10-06, AM3) changed only the plan of K. 315. Before it, the plan
had 32 shots (3, 10, 16, 3, and 0), a median of 7.8 s, and no blend. The solo flute keeps 3 solo
shots, and the first one still starts at 10.4 s. A solo shot of the soloist looks at its front
from the audience side, and the bear stays out of its frame.

Before the stable planner, no shot of Eine kleine Nachtmusik was shorter than four bars (7.3 s).
Now the shortest is three bars (5.5 s). Before the user decision, the
removed demos had Beethoven 5 37 shots (8.8 s median, 0 blends), Grieg 23 (9.6 s, 1 blend), and
Mozart K. 488 49 (8.6 s, 0 blends).

S1 of the report measured a median of 8.3 s and 9.1 s, and 11% wide shots.
