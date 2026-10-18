# 5. Animation

## Pose index

The table lists each role of the app. A role is a kind of player with a pose of its own: an
instrument with the species of its section (`SECTION_SPECIES` of `models/cast.ts`). A species
with a hold of its own is a role of its own (`SPECIES_HOLDS` of `pose/bowed-rig.ts`,
`SPECIES_WIND_HOLDS` of `pose/winds.ts`). The code holds the values of each hold, so the table
gives no angle and no length.

- **Support.** A role that "stands as a soloist" stands when it is the soloist of an orchestra, a
  player alone, or the partner of a pianist in a recital (`supportOf()` of `models/player.ts`,
  4.2, 4.5). Its rest cell also gives the standing rest when it differs.
- **Source.** The real player that the pose follows, with the file that holds the source. The word
  "none" means that the repository holds no real player for the pose. Each seated role also
  follows the seated posture of 5.2 and its sources.
- **Play and rest.** The playing pose and the rest pose (5.2), each in one short phrase.
- **Code.** The hold constant and its file in `src/`.
- **Docs.** The design text and the newest decision files of the pose in `docs/decisions/`. "5.3
  bowed strings" names the paragraph "Bowed strings in detail" of 5.3, and the same for the other
  families.
- **View.** A command that shows the pose. `pnpm close-views species <species> <dir>` shows a
  species on its support during play, and `--moment rest` shows its rest pose (7.1). A query opens
  `/gallery.html` of `pnpm dev` at one percussion instrument of the badger.

Each new role and each new hold adds its row to this table in the same commit.

| Role | Support | Source | Play | Rest | Code | Docs | View |
|---|---|---|---|---|---|---|---|
| Conductor, bear | Stands on the podium | none | Beats the patterns of 5.4 with the baton, turns to cue each entry, and shows the dynamics with the left paw | The arms hang a little out to the sides | `CONDUCTOR_HOLD`, `pose/conductor.ts` | 5.2, 5.4, `2026-10-12-studio-bear.md` | `pnpm close-views conductor <dir>` |
| Piano, polar bear | Bench | Play: the forearm rule of Prodigies and "Fundamentals of Piano Practice" (`2026-10-14-polar-bench.md`). Rest: a Suzuki checklist (`docs/research/2026-10-13-pianist-lap.md`) | Leans toward the keys, with the palms down at the front of the keys and the elbows out, down, and back | Sits tall with a small lean to the piano and the head up, with the paws on the low belly over the thighs | `HANDS_HOLDS.piano`, `pose/hands.ts` | 5.2, 5.3 piano and harp, `2026-10-14-polar-fix.md` | `pnpm close-views pianist <dir>` |
| Harp, deer | Stool | none | Leans forward, and each palm faces the strings and plucks the string of its note | Sits up, with the left palm on the left thigh and the right hand on a string | `HANDS_HOLDS.harp`, `pose/hands.ts` | 5.2, 5.3 piano and harp, `2026-10-11-short-legs.md` | `pnpm close-views species deer <dir>` |
| Violin, rabbit | Chair, stands as a soloist | Play: violinonline.com and Simon Fischer (`docs/research/2026-10-14-fox-rabbit-form.md`). Rest: the image of a seated violinist that the user gave (`docs/research/2026-10-16-bow-rest.md`). Hands and bow in play: `docs/reference/string-technique.md` | Holds the violin on the left shoulder under the jaw, with the back straight and the bow nearly square. The stick passes through the middle of the closed right paw | The violin stands upright on the left thigh, and the bow stands upright at the right side, with the right elbow at the side and the frog at the outer side of the right knee. A soloist holds the violin at its left side and hangs the bow with the tip down | `SHOULDER_HOLD`, `UPRIGHT_BOW`, `HANGING_BOW`, and `STANDING_REST`, `pose/bowed-rig.ts`, and `bowGrip` of `models/species.ts` | 5.2, 5.3 bowed strings, `2026-10-17-rabbit-pose.md`, `2026-10-17-grip-all.md`, `2026-10-17-left-hand.md`, `2026-10-17-bow-arm.md` | `pnpm close-views violinist <dir>` |
| Violin, red fox | Chair, stands as a soloist | The sources of the rabbit | The hold of the rabbit, with the tail end against the left side of the short neck under the long jaw. In pizzicato, the bow tip points up and back | The rest of the rabbit, with the frog at the outer side of the right thigh. A soloist hangs the bow with the tip down | `FOX_HOLD`, `UPRIGHT_BOW`, `HANGING_BOW`, and `STANDING_REST`, `pose/bowed-rig.ts`, and `bowGrip` of `models/species.ts` | 5.2, 5.3 bowed strings, `2026-10-17-fox-form.md`, `2026-10-17-grip-all.md`, `2026-10-17-left-hand.md`, `2026-10-17-bow-arm.md` | `pnpm close-views fox-violinist <dir>` |
| Viola, cat | Chair, stands as a soloist | Rest: the image of a seated violinist that the user gave (`docs/research/2026-10-16-bow-rest.md`). Hands and bow in play: `docs/reference/string-technique.md` | Holds the viola under the chin, back toward the neck so that the left paw reaches the nut, with both elbows out. In the high positions, the left paw tilts over the upper bout | The rest of the rabbit, with the left paw at the top of the upper bout and the right paw over the outer side of the right thigh. A soloist holds the viola at its left side and hangs the bow with the tip down | `CAT_HOLD`, `LAP_VIOLIN`, `UPRIGHT_BOW`, `HANGING_BOW`, and `STANDING_REST`, `pose/bowed-rig.ts`, and `bowGrip` of `models/species.ts` | 5.2, 5.3 bowed strings, `2026-10-17-cat-bow.md`, `2026-10-17-cat-hand.md`, `2026-10-17-cat-look.md` | `pnpm close-views violist <dir>` |
| Cello, dog | Chair | Play and rest: the cellists of `docs/reference/string-technique.md`, section 2.7 | The cello leans back in front of the knees, with the upper bout at the chest and the neck at the left of the head. The left paw tilts over the neck from the bass side. The bow plays no hair near the frog (`frogHair`) | The cello stays between the knees, held by the left paw with the elbow down. The bow stands over the right knee with the tip up and leaned out and forward | `DOG_HOLD` and `UPRIGHT_BOW`, `pose/bowed-rig.ts` | 5.2, 5.3 bowed strings, `2026-10-17-dog-arms.md`, `2026-10-17-dog-rest.md`, `2026-10-17-left-hand.md`, `2026-10-17-bow-arm.md` | `pnpm close-views cellist <dir>` |
| Contrabass, hippo | High stool | Hands and bow in play: `docs/reference/string-technique.md` | The contrabass stands on the floor at the left side, the player leans forward, the right elbow points out and up, and the left arm hugs the contrabass | The contrabass stays on the floor, and the bow lies on the outer side of the right knee | `BOWED_HOLDS.contrabass`, `pose/bowed-rig.ts` | 5.3 bowed strings, `2026-10-17-left-hand.md`, `2026-10-17-bow-arm.md` | `pnpm close-views species hippo <dir>` |
| Flute, tan fox | Chair, stands as a soloist | Play: Michel Debost, Flute Talk, May/June 1996 (`2026-10-14-fox-flute.md`). Rest: Patricia George, The Instrumentalist, December 2018 (`2026-10-15-flute-rest.md`) | Turns the head to the left, with the flute nearly square to the face and the shoulders square and low | The flute stands upright on the right leg in the right paw, and the left arm hangs near the side. A soloist hangs the left arm | `FOX_FLUTE`, `pose/winds.ts` | 5.2, 5.3 woodwinds and brass, `2026-10-17-fox-form.md`, `2026-10-17-tan-rest.md` | `pnpm close-views flutist <dir>` |
| Oboe, mouse | Chair, stands as a soloist | none | Holds the oboe at the mouth with both paws on their grips and the right shoulder turned forward | The oboe moves off the mouth and tilts, the head lifts, and the paws keep their grips | `WIND_HOLDS.oboe`, `pose/winds.ts` | 5.3 woodwinds and brass, `2026-10-11-short-legs.md` | `pnpm close-views species mouse <dir>` |
| Clarinet, wolf | Chair, stands as a soloist | none | Holds the clarinet at the mouth with both paws on their grips and the right shoulder turned forward | The clarinet moves off the mouth and tilts, the head lifts, and the paws keep their grips | `WIND_HOLDS.clarinet`, `pose/winds.ts` | 5.3 woodwinds and brass, `2026-10-11-short-legs.md` | `pnpm close-views species wolf <dir>` |
| Bassoon, beaver | Chair | none | The bassoon turns its lower end forward and to the right, and the right elbow points down | The bassoon moves off the mouth and tilts, the head lifts, and the paws keep their grips | `WIND_HOLDS.bassoon`, `pose/winds.ts` | 5.3 woodwinds and brass, `2026-10-11-short-legs.md` | `pnpm close-views species beaver <dir>` |
| Horn, pig | Chair, stands as a soloist | none | The left hand presses the valves, and the right elbow points down | The horn comes up, so that its bell sits on the right thigh | `WIND_HOLDS.horn`, `pose/winds.ts` | 5.3 woodwinds and brass, `2026-10-11-low-seats.md` | `pnpm close-views species pig <dir>` |
| Trumpet, monkey | Chair, stands as a soloist | none | The right hand presses the valves, and the elbows point down | The trumpet moves off the mouth and turns down and to the side | `WIND_HOLDS.trumpet`, `pose/winds.ts` | 5.3 woodwinds and brass, `2026-10-11-low-seats.md` | `pnpm close-views species monkey <dir>` |
| Trombone, panda | Chair, stands as a soloist | none | The right arm moves the slide with the pitch, with the right shoulder turned forward | The trombone moves off the mouth and turns down | `WIND_HOLDS.trombone`, `pose/winds.ts` | 5.3 woodwinds and brass, `2026-10-11-low-seats.md` | `pnpm close-views species panda <dir>` |
| Tuba, rhino | Chair | none | The right hand presses the valves, and the elbows point down | The tuba moves off the mouth and tilts | `WIND_HOLDS.tuba`, `pose/winds.ts` | 5.3 woodwinds and brass, `2026-10-11-low-seats.md` | `pnpm close-views species rhino <dir>` |
| Timpani, elephant | Stands | none | Two mallets strike the kettle of each note, and a roll alternates the hands | The arms hang a little out to the sides | `PERCUSSION_HOLDS.timpani`, `pose/percussion-rig.ts` | 5.2, 5.3 percussion, `2026-10-10-arms-close.md` | `pnpm close-views species elephant <dir>` |
| Bass drum, badger | Stands | none | The beater in the right hand strikes the right head, and the left arm hangs | The rest of the timpani | `PERCUSSION_HOLDS['bass-drum']`, `pose/percussion-rig.ts` | 5.2, 5.3 percussion, `2026-10-10-arms-close.md` | `pnpm close-views species badger <dir>` |
| Snare drum, badger | Stands | none | Two mallets strike the head, and a roll alternates the hands, with the elbows nearer to the body | The rest of the timpani | `PERCUSSION_HOLDS['snare-drum']`, `pose/percussion-rig.ts` | 5.2, 5.3 percussion, `2026-10-10-arms-close.md` | `?page=species&only=snare-drum&body` |
| Cymbals, badger | Stands | none | The inner faces of the two cymbals meet in front of the shoulders at the note start | The rest of the timpani | `PERCUSSION_HOLDS.cymbals`, `pose/percussion-rig.ts` | 5.2, 5.3 percussion, `2026-10-10-arms-close.md` | `?page=species&only=cymbals&body` |
| Small percussion, badger | Stands | none | The left hand holds the triangle up, and the beater in the right hand strikes the triangle or the tambourine | The rest of the timpani | `PERCUSSION_HOLDS['small-percussion']`, `pose/percussion-rig.ts` | 5.2, 5.3 percussion, `2026-10-10-arms-close.md` | `?page=species&only=small-percussion&body` |
| Xylophone, badger | Stands | none | Two mallets strike the bar of each key, and a hand does not cross the other hand | The rest of the timpani | `PERCUSSION_HOLDS.xylophone`, `pose/percussion-rig.ts` | 5.2, 5.3 percussion, `2026-10-10-arms-close.md` | `?page=species&only=xylophone&body` |
| Choir, penguin | Stands on a riser | none | The beak opens with each note, the chest turns from side to side in a phrase, and the flippers hold the folder close | The beak closes, the chest stops its turn, and the flippers keep the folder | `CHOIR_HOLD`, `pose/choir.ts` | 5.3 choir, `2026-10-11-penguin-body.md` | `pnpm close-views species penguin <dir>` |

`BOWED_HOLDS.violin` (the chin hold), `BOWED_HOLDS.cello`, and `WIND_HOLDS.flute` have no row. No
player of the cast uses them, because each species of the violin, the cello, and the flute
sections has a hold of its own. A new species of these sections takes them.

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
`Score`. A `ModelCache` of `models/` holds the player models of one `Score`, so that each kind of
player builds its model one time. `preparePoses()` calls `preparePlayer()` for each player and
`prepareConductor()` for the bear, so that a page with no `Score` can also make a plan. Then each
frame only looks up the song time in sorted lists, and writes into one buffer. Thus the poses of
60 players take much less than the 4 ms of the main thread (9.7).

In each animation frame, `src/main.ts` calls `poseAt()` with the song time of `Player.now()`
(6.7), the wall time `performance.now() / 1000`, the transport, and the audibility of the seats.
Then `StageScene.pose()` copies the poses to the bones. Until the `Player` has loaded the samples
of the demo, the song time is 0 and the players keep the rest pose.

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
- **Beat layer.** A player sways the spine to one side on one beat and to the other side on the
  next beat (`beatSway()` of `pose/pose-at.ts`). It sways only in a passage: notes with short
  rests between them. The sway starts a little before a passage and ends after it, and its size
  follows the highest loudness of the notes of the passage (`PASSAGE_MOTION` of
  `pose/passages.ts`, 5.3).
- **Idle layer.** Each animal breathes with a seeded period, blinks once in each window at a
  seeded time, and looks at the conductor in a seeded part of the windows (`IDLE_MOTION` of
  `pose/idle.ts`). The neck and the head share the turn of a look. In a chamber group (4.2), the
  players look at the head of the leader (5.4), the leader looks at the middle of the heads of
  the others, and a player alone looks ahead, to the audience. The ears twitch, and the tail
  sways. Ears that hang beside the head do not twitch (`PlayerPlan.earTwitch`,
  `OwnBodyParams.hangingEars`), because a real hanging ear does not twitch to the side. A seated
  tail that lies curled on the seat does not sway (`PlayerPlan.tailSway`,
  `OwnBodyParams.seatedTail`), because the sway moved the curled tail of the cat into its thigh.
  A seeded time in a window of the wall clock needs no state.

## 5.2 Rest pose

- Before the first play, the players are in the rest pose. A real orchestra also lifts the
  instruments only when the conductor signals the start. While `transport.changedAtWall` is
  `null`, the players stay in the rest pose.
- When play starts, the players lift their instruments in the count-in (5.4, 6.5). After a pause
  or a stop, the players lower their instruments when the hold of `transport.holdSec` ends.
- **Natural motion.** The user asked for a natural lift and lowering: "The animals are still
  lifting / dropping their arms too synchronized and too fast. Make it more natural." Thus each
  player has its own seeded lift and lowering, with a delay, a duration, and a curve.
  `preparePoses()` chooses them one time from the seed (`restMotion()` and `REST_MOTION` of
  `pose/rest.ts`), so `poseAt()` stays a pure function of its inputs.

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

  - The curve is `smoothstep(x ** skew)` of the linear progress `x`, so each move starts and ends
    slowly, and the largest speed comes a bit earlier or later for each player.
  - The principal of a seat (player 0) moves first, after the seeded delay of its seat. The later
    players follow in a ripple, as real players watch their leader. The players of a seat share
    the seed of the seat (`seatSeedOf()` of `pose/plan.ts`).
  - The woodwinds and the brass lift with a shorter seat delay, because they also take a breath
    before the first note.
  - The lift and the lowering have separate seeded values. Thus an early lifter does not have to
    lower late.
  - The conductor gives the count-in, so its motion does not vary (`CONDUCTOR_MOTION`). A silent
    seat uses the same motion of each player (5.5).
- **No jump.** A lift or a lowering of each player starts from its height at the change.
  `transport.before` keeps the transport before the change, so the pose calculates the height of
  each player at the change, then eases from it to the new height. `changeTransport()` of
  `app/transport.ts` sets `before`. When all players stood still at the change, it cuts the older
  transports, so the chain stays short. Thus fast changes of play and pause move the instruments
  with no jump.
- **Count-in.** From the song start, the lift ends before the downbeat. The count-in of each demo
  holds the slowest lift at the speed 1 (5.4). A shorter count-in in wall time, at a higher speed
  or on a resume, scales the delays and the durations of all lifts by one factor, so that they
  end just before the first sound and keep their order (`liftScale()`). `startPlay()` of
  `app/transport.ts` gives the play its `transport.leadSec`: the count-in in song seconds divided
  by the speed. A speed change in the count-in does not change the factor.
- The note layers run with the song time, so the players also show the motion before the first
  notes (5.3), such as the breath and the landing of the bow.
- In the count-in after a pause, the note layer and the beat layer hold the song time of the
  pause point, because the notes before it do not sound again (`noteLayerTime()` of
  `pose/count-in.ts`). A play within the hold of a pause keeps the instruments up.
- A pause in the count-in (6.5), before the song time passes the start point, has no hold: the
  players and the conductor lower their instruments at once, and the song time goes back to the
  start point. `changeTransport()` gives such a pause `transport.holdSec` 0. `transport.startSec`
  keeps the start point of the last play for the count-in of the pose. A seek during play moves
  it to the seek point (6.5).
- The rest pose comes from `transport`, so the pose function still keeps no state.
- **Seated posture.** Each seated player sits tall, with a straight upright back that does not
  lean on the chair back. The hips are above the knees, the thighs slope down to the knees, the
  shins are vertical, and the soles are flat on the floor. The seat is level, its height fits the
  legs, and its front edge ends where the thighs leave it. Real seated string players sit so: "The
  main point is that your hips are higher than your knees" (violinist.com, discussion 9372), and
  chairs are "high enough to allow your knees to be below your waist" (Internet Cello Society,
  tim14). The user refused a tilted seat, so the seat stays level and the thighs alone slope
  down. The user asked for taller chairs and legs more perpendicular to the floor with no change
  of the leg lengths (`docs/decisions/2026-10-17-fox-form.md`). The rig of a mesh makes the
  posture: the turn of the trunk of the seated bind (`studio.trunk`), the slope of the thighs and
  the shins (`studio.legTurns`), and the level chair of the rig that ends under the thighs
  (`chair` of the rig config). The chair of the app fits the legs (`seatHeights()` and
  `buildChair()` of `models/props.ts`, 4.4, 4.5). The rabbit sits further forward on a deeper
  seat, so that its back keeps off the chair back (`backRoom` of `ANIMALS`, 4.4,
  `docs/decisions/2026-10-17-rabbit-pose.md`).
- **Seated lean.** The pianist sits tall in the rest pose, as a real pianist before a
  performance: the trunk leans a little toward the piano, less than in a play (`restLean` of
  `HANDS_HOLDS` in `pose/hands.ts`). The hands rest in the lap, and the lift of the count-in
  brings them to the keys, as a pianist lifts the hands when the conductor signals. The pose
  mixes the rest lean and the play lean by the weight of the playing pose. The harp player sits
  up in the rest pose.
  - The neck and the head of the pianist lift against the lean in the rest pose (`restHeadLift`),
    so that the gaze is about level and the face shows over the lid.
- **Arm clearance.** In the rest pose, no arm goes through the body. The forearm, the hand, and the
  lower half of the upper arm can touch the torso, the head, and the thighs, as the arms of the
  reference images touch the body. They go no deeper into them than `ARM_CONTACT_DEPTH` of
  `pose/test-arm-clearance.ts`. The shoulder ball sinks into the torso (4.5). The elbows point out
  to the sides, and their direction turns from the rest to the hold at an even speed
  (`mixDirection()`). `pose/rest-clearance.test.ts` checks each species with each instrument,
  the soloists who stand, and the conductor.
- **Upright bow.** The seated rabbits and red foxes rest as a seated violinist: the violin stands
  upright on the left thigh, and the bow stands upright at the right side, with the frog in the
  right paw (5.3, `docs/decisions/2026-10-16-bow-rest.md`). The right elbow hangs near the side.
  The round belly keeps the right paw off the top of the right thigh, so the paw holds the frog at
  the outer side of the thigh (red fox) or of the knee (rabbit). The left elbow of the rabbit
  points a little out, so that the upper arm keeps off the violin. In the lift and the lowering,
  the tip of the upright bow turns through the front, so that the bow passes in front of the head
  and the belly (`BowVia` of `pose/bowed-rig.ts`). The seated cats rest as the violinists too,
  with the viola upright on the left thigh and the bow upright at the outer side of the right
  thigh (`CAT_HOLD`, 5.3), because a real violist rests as a violinist. The left paw of the cat
  holds the viola at the top of the upper bout. Its right paw stays above the outer side of the
  thigh, because a paw on the thigh put the forearm into the deep belly
  (`docs/decisions/2026-10-17-cat-look.md`). In the lift and the lowering, the viola of the cat
  moves out and to the front (`BowedHold.liftReach`), so that it passes in front of the belly.
- **Cello between the knees.** The seated dog keeps the cello at its playing place between the
  knees in the rest pose, and the left paw holds it on the fingerboard with the elbow down near
  the side. A floor instrument rests at its playing place (`BowedHold.rest` null, `restPivotOf()`
  of `pose/bowed-rig.ts`), so the cello does not move in the lift and the lowering, as a seated
  cellist keeps it. The right paw holds the bow over the right knee, with the tip up and leaned
  out and forward, as a cellist stands the frog on the right knee
  (`docs/reference/string-technique.md`, section 2.7). The short arm of the dog does not reach
  the knee, so the grip stays above the thigh (`docs/decisions/2026-10-17-dog-rest.md`). In the
  lift and the lowering, the bow turns through the front, as the upright bow of the violinists.
- **Free arm of the flute.** The seated tan fox rests the flute upright on the right leg in the
  right paw (5.3). Its free left arm hangs near the side with a soft bend of the elbow, with the
  paw beside the haunch, because the top of the left thigh is out of reach of the short arm
  (`docs/decisions/2026-10-17-tan-rest.md`). A seated flutist at rest lays the left hand on the
  left thigh, or lets the left arm hang near the side.
- **Hanging arms.** A standing player without a lap hangs its arms (`pose/hang.ts`): the upper
  arm swings forward and out by the smallest angle at which it and the elbow touch the side of the
  torso and the legs of the mesh (`HANG`). Then the forearm and the hand do the same from the
  elbow, and the elbow bends forward, so that the palms rest at the height of the hips, as an
  animal of the reference images holds its arms at its belly. The palms of a standing player stay
  at least at the height of its hip joints. The arms touch the body as in the reference images
  (user decision of 2026-10-10). The arm swings out at least `HANG.minOut`, so that the long paws
  of the studio bear do not rest in the front of its round belly.

## 5.3 Instrument motion

The pose index at the top of this file gives the hold constant, the source, and the view command
of each role. The code constants of each family hold the times, the angles, and the lengths of
the motion.

- Bowed strings: the bow changes direction on each note, or on each slur of short notes. The bow
  speed comes from the note length. The left hand keeps a position on the neck, and the fingers
  play the notes of the position. The hand shifts only when the notes leave its position.
- Pizzicato plucks the string. Tremolo makes short fast strokes.
- **Bowed strings in detail** (`pose/fingering.ts`, `pose/strokes.ts`, `pose/bowed-rig.ts`,
  `pose/bowed.ts`):
  - `docs/reference/string-technique.md` is the target of the motion of the hands and the bow of
    the four instruments, with the source of each fact. Its section 3 gives the rules of the app
    that follow it, and lists where the app differs from it.
  - Notes of a player that start within 50 ms of each other form one stroke, as a chord of 3.8.
    A note that still sounds at a new stroke joins it. Two pitches in a stroke are a double
    stop: the high note takes its string, the low note the string below, and the bow lies
    between the two strings.
  - **Position plan** (`planHand()` of `pose/fingering.ts`). A plan from the score gives each
    stroke its string, its position, and its finger before the play, so the pose after a seek is
    the same. The plan is a search (Viterbi) over the candidates of each stroke: each string that
    has the note, and each position whose hand frame reaches it (`TUNINGS`, `HAND_FRAMES`). The
    cost of a plan (`FINGERING_COSTS`) counts the shifts, the high positions, the extensions, the
    open strings of long notes, and the string crossings. Each player takes the orchestral style:
    low positions and open strings. An open string keeps the position of the stroke before it.
  - The bow turns around the strings to the plane of each string (`BowedHold.stringTurn`), as the
    string planes of the reference. A mesh rig takes a smaller turn when a larger turn folds the
    skin of the right arm or puts the paw into the rim of the instrument. The short arms of the
    dog play no hair near the frog (`BowedHold.frogHair`), where the forearm crossed the rim.
  - The middle of the left finger block presses the strings at the middle of the hand frame of
    the position, with the real string length: one octave is half of the string. The fingers
    point up from the strings, and the palm faces the neck from below. The fingers curl more at
    the note start (the press), and the press does not move the hand. The places of the hand map
    evenly into the part of the fingerboard that the left arm reaches with 97% of its length.
  - **Slurs** (`slurSizes()` of `pose/strokes.ts`). The MIDI files have no slurs, so the app
    guesses them: short connected notes of a player in one conducted beat that change the pitch
    join into one bow. A longer run in one beat splits into slurs of nearly equal size. The bow
    keeps one direction over the notes of a slur, and the left hand plays each note.
  - A bow starts at its full speed, keeps it until its last note, and slows to a stop in its last
    note, so the turn at the next bow is sharp. Its length grows with the duration and a little
    with the gesture size. A louder note mostly changes the sounding point, as for real players.
    A fast bow moves toward the balance point of the bow (`balanceShift()`), as real players play
    fast strokes there. A rest ends a phrase, and the next bow is a down-bow near the frog
    (`BOW_MOTION` of `pose/strokes.ts`). In a rest, the bow lifts off the strings and lands again
    before the next note.
  - **Sounding point** (`soundingPointAt()` of `pose/bowed.ts`). The bow plays nearer to the
    bridge in a loud note (`BowedHold.soundingPoint`). The place follows the loudness with a time
    constant (`followLoudness()` of `pose/strokes.ts`), so a change of the loudness does not make
    the bow jump.
  - **String crossing** (`bowStateAt()` of `pose/strokes.ts`). The bow turns to the string of the
    next note just before the note, as the crossing of a violinist leads the bow change. In a fast
    run across two neighbor strings, the right elbow stays on the mean string of the two strings
    (`crossStrings()`, `crossPole()` of `pose/bowed.ts`), and the forearm and the wrist make the
    rest of the crossing, as a small forearm turn replaces a large move of the upper arm.
  - **Shift** (`LEFT_HAND` of `pose/strokes.ts`). The hand moves along the neck only between two
    strokes with different positions, as one piece. The shift starts in the second half of the
    note before it, as Simon Fischer advises, and ends when the finger of the new note lands,
    just before the bow change. It follows a quintic ease, so its speed has no jump at the ends.
  - **Fingers.** The paws have one finger bone, so the four fingers are one block. The finger of
    a stopped note lands before the note and presses at the note start. An open string has no
    press. The hand turns and rolls a little toward the finger and the string of the note
    (`BOWED_HANDS.reachTurn` and `BOWED_HANDS.rollL` of `pose/bowed.ts`).
  - **Vibrato** (`LEFT_HAND.vibrato`). A long stopped note gets vibrato after a short delay. The
    hand moves along the strings with the sine of the rate from the note start, so the pose has
    no state. Each player has a seeded rate, and the width is wider in a high position and in a
    loud note. An open string, a pizzicato note, and a shift have no vibrato.
  - **Left elbow** (`leftElbow()` of `pose/bowed.ts`). The left elbow turns with the string of the
    finger (`BowedHold.elbowToward`, `BowedHold.elbowPerString`): toward the body on the violin
    and the viola, and up on the cello and the contrabass. In the high positions, it turns further
    (`BowedHold.highElbow`), as the hand goes over the shoulder of the instrument.
  - **Left hand in high positions** (`leftTilt()` of `pose/bowed.ts`). In the high positions, the
    left hand tilts further over the neck (`BowedHold.highTilt`), so that the wrist comes up beside
    the upper bout, as a real hand goes over the shoulder of the instrument. Only the cat tilts
    (`CAT_HOLD`), because its viola sits back toward the neck and its forearm runs under the viola.
  - Tremolo makes short fast strokes with the gesture size. Pizzicato keeps the bow in the hand
    with its tip up, and the right palm flicks across the strings at the note start, at a place
    between the fingerboard and the bow contact (`BOWED_HANDS`). The change between the bow and
    pizzicato happens just before the note.
  - **Playing pose.** The arms of the animals are a little short for their instruments (4.5). In
    the playing pose, the right shoulder bone turns forward, the bow slants from square with the
    frog to the right shoulder, and the stick leans toward the fingerboard around the hair
    (`BowedHold.bowTilt`), as the reference gives. The fingers turn the stick in the paw by the
    tilt, and the hand keeps the turn of the bow with no tilt (`heldBowAt()` of `pose/bowed.ts`).
    The floor holds of the cello and the contrabass lean the player forward. The bow range is the
    part of the hair that the arm reaches on all strings with 97% of its length, and each hold
    lets the bow arm reach the full hair. A turn of the torso does not help a short arm, because
    the violin rests on the chest and turns with the shoulder.
  - In the playing pose, the head keeps a gap from the neck of the cello and of the contrabass,
    also with the looks at the conductor. The neck passes the left of the head (4.6).
  - **Grip.** The stick lies in the fingers of the right hand (4.6), and the fingers curl around
    it, also in the rest pose. The stick of the rabbit, the red fox, and the cat passes through the
    middle of the closed paw (`bowGrip` of `models/species.ts`, `stickGrip()` of
    `tools/bow-grip.ts`, `docs/decisions/2026-10-17-grip-all.md`). The place of the grip along the
    stick sets the wrist and the folds of the right upper arm. The hand can roll around the stick
    and keep its grip, and the `bow` bone turns back by the roll, so that the hair stays on the
    strings. The roll stays in a range, because past it the hair at the frog goes into the palm.
  - **Bow arm clearance.** While the player plays, the elbows point to the directions of the hold,
    so that the forearm, the hand, and the lower half of the upper arm go no deeper into the
    torso, the head, and the thighs than the contact of the rest pose (5.2). On the violin and the
    viola, the right elbow points out, forward, and down at the frog, and out and up at the tip,
    with an even turn over the bow range. The left elbow points down and forward, under the
    instrument and near the chest, as in the reference images (`poleL` of `BOWED_HOLDS`). The
    instrument moves down and forward, so that the bow hand at the frog stays off the chin and the
    muzzle. On the cello and the contrabass, the right elbow points out and up, and the left elbow
    points down, out, and a little forward, so that the arm hugs the instrument. In a change
    between the bow and pizzicato on these two, the right elbow turns a little toward the back of
    the hand, because the frog end of the stick otherwise touches the forearm. A hold can turn the
    instrument while the player plays (`BowedHold.playTurn`). Each hold of the bow (play,
    pizzicato, rest) has its own roll of the hand, and the changes mix the rolls, so the pose has
    no jump. The contrabass is still open: at the tip of a down-bow on its low strings, the bow
    hand of the hippo goes into its belly.
  - **Holds of the species** (`holdOf()` and `SPECIES_HOLDS` of `pose/bowed-rig.ts`). A species can
    hold a bowed string in its own way:
    - The rabbits hold the violin on the left shoulder as a real violinist does
      (`SHOULDER_HOLD`): the tail end lies on the left collarbone against the left side of the
      neck, under the jaw, and the jaw lies on the violin. The violin turns toward the front, the
      strings are about level, the bow lies nearly square across the strings, and the back stays
      straight. The violin sits back toward the neck, so that the left paw reaches the nut with the
      size that the user set (`SpeciesParams.violinScale`). The left elbow points further out than
      in the chin hold, so that the left paw keeps off the violin and fewer faces fold. The bow
      keeps a free hair at each end (`BowedHold.freeHair`), so that the bow paw stays out of the
      body at the frog. At the tip, the right elbow points down, because up the skin of the upper
      arm folds.
    - The red foxes take the shoulder hold of the rabbits (`FOX_HOLD`), with the tail end against
      the left side of the short neck under the long jaw, and with their own slant of the bow,
      turn of the right shoulder, right elbow, and free hair, because the bow of the rabbit folded
      the skin of the right shoulder of the fox mesh. In pizzicato, the bow tip points up and back,
      so that the bent wrist keeps the stick in the paw.
    - The cat holds the viola under the chin with its own hold (`CAT_HOLD`): the chin hold of the
      viola, with the viola further right and back toward the neck, so that the left paw reaches
      the nut (`docs/decisions/2026-10-16-mesh-cat.md`).
    - The dog holds the cello between its knees (`DOG_HOLD`), as real cellists hold it
      (`docs/reference/string-technique.md`, section 2.7): the endpin on the floor in front of the
      chair, the back of the upper bout against the chest, and the neck at the left of the head,
      above the left shoulder. The cello leans back and to the left, as the user chose
      (`docs/decisions/2026-10-17-dog-rest.md`). The trunk leans only a little, because the belly
      pushes into the cello. The left paw tilts further over the neck (`BowedHold.tiltL`), as the
      hand of a cellist comes over the fingerboard from the bass side, and the left elbow points
      out nearly level. The short arms reach the strings only nearly straight
      (`docs/decisions/2026-10-17-dog-arms.md`), so the right elbow points out and down at the
      frog, and pizzicato plucks over the fingerboard.
  - **Rest of the bowed strings.** The rested instruments and bows can touch the torso and the
    head, as the instruments of the reference images lie against the body, but they do not cross
    them (`pose/rest-clearance.test.ts`). The pose moves the instrument bone with the instrument
    offset (5.1).
    - The seated rabbits and red foxes rest as the seated violinist of the image of the user
      (`docs/research/2026-10-16-bow-rest.md`): the violin stands upright on the left thigh, with
      the scroll up and the top plate to the front, held at the bottom of its neck. The bow stands
      upright at the right side, with the tip up and the frog in the right paw, and the stick
      passes in front of the shoulder (`UPRIGHT_BOW`). The elbows hang near the sides. The lap of
      each species gives its own places (`SHOULDER_HOLD`, `FOX_HOLD`). The round belly of the
      rabbit covers the top of its thighs, so its violin stands near the knee, and its paw holds
      the frog at the outer side of the right knee (`docs/decisions/2026-10-16-rabbit-arm.md`). The
      long right arm of the red fox reaches its thigh only nearly straight, so its paw holds the
      frog at the outer side of the thigh. In the lift and the lowering, the tip of the bow turns
      through the front and the grip moves to the front (`BowVia` of `pose/bowed-rig.ts`), because
      a direct mix of the rest bow and the playing bow turned the tip through the head.
    - The seated cat rests as the violinists: the viola upright on the left thigh, and the bow
      upright at the right side, with the paw at the outer side of the right thigh. In the lift
      and the lowering, the bow turns through the front with the grip further out and forward
      (`CAT_HOLD`, `docs/decisions/2026-10-17-cat-bow.md`).
    - The dog keeps the cello between its knees and holds the bow over the right knee, with the
      tip up and leaned out and forward (5.2, `DOG_HOLD`).
    - The contrabass stays on the floor, and the bow lies on the outer side of the right knee,
      pointing to the front with the hair down. The holds of `BOWED_HOLDS` rest the bow on the
      outer side of the right knee with the hair down, with the right elbow out, because the short
      torso and the wide haunches hold the elbow out. The left fingers stay on the strings, and the
      left upper arm hangs at the side (`restPoleL`).
    - A violin or viola soloist who stands hangs both arms (5.2): the left hand holds the
      instrument at the side, with the scroll forward and the top plate out. A hold can give the
      bow of the standing rest its own direction (`BowedHold.standBow`): the cat, the rabbit, and
      the red fox hang the bow with the tip down (`HANGING_BOW`), because their long forearms held
      the bow of the bind pose up in front of the face. In the lift and the lowering, the hanging
      bow turns through the front, as the upright bow, because a direct mix put the bow into the
      arms (`docs/decisions/2026-10-16-cat-seat.md`).
    - Each player and its instrument stay above the floor at rest and while it plays.
- Woodwinds: the player breathes in before a phrase. The fingers move on each note.
- Brass: the player breathes in before a phrase. The trombone slide follows the pitch.
- **Woodwinds and brass in detail** (`pose/wind-notes.ts`, `pose/winds.ts`):
  - A wind instrument plays one note, but a seat at its cap can give one player two notes at a
    time (3.8). The player shows the last note that started. Of the notes that start within
    50 ms of each other (a chord), it shows the highest.
  - The mouthpiece stays at the mouth while the player plays: the head and the instrument both
    follow the chest, and the look at the conductor does not turn the head. A hold can turn the
    head to the left while the player plays (`WindHold.headTurn`), as a real flutist does. The
    palms stay on their grips, and the two-bone IK places each arm. Each hold of `WIND_HOLDS`
    gives the directions of the elbows. They point as far down and in as the arms permit, as the
    elbows near the torso of the reference images (user decision of 2026-10-10), within the
    contact of the rest pose (5.2). While it plays, the bassoon turns its lower end forward and to
    the right, and the flute turns its right end down and back. The left hand of the flute holds
    it in front of the face, to the right of the middle, so the left arm crosses the chest.
  - A species can hold a wind instrument in its own way (`SPECIES_WIND_HOLDS` and `windHoldOf()`
    of `pose/winds.ts`). The tan fox holds the flute as a real flutist (`FOX_FLUTE`, Debost, Flute
    Talk, May/June 1996): the head turns to the left, the flute lies about square to the face with
    a small slope down to the right, and the shoulders stay square and low, with no forward turn
    of the right shoulder. The right end of the flute turns a little back from square, so that the
    right paw reaches its grip and the skin of the right shoulder does not fold. A long muzzle
    reaches past the mouth, so the lip plate sits under it (`WindHold.lipShift`). At rest, the
    flute stands upright on the right leg with the foot joint down at the outer side of the right
    knee, and the right paw holds it at the right-hand keys, as a real flutist rests it (George,
    The Instrumentalist, December 2018). The foot joint stays a little above the leg, because a
    flute nearer to the leg put the right upper arm into the body. The left paw leaves its grip
    and hangs beside the haunch (5.2, `docs/decisions/2026-10-17-tan-rest.md`).
  - A rest ends a phrase. The player breathes in before a phrase, with the spine leaning back
    with the amplitude of the player, and breathes out over the phrase (`WIND_MOTION`).
  - The fingers follow the pitch, and they arrive at the note start. A woodwind player closes the
    holes with both hands: a low note of an octave closes both hands, and up the octave the right
    hand opens first, then the left hand. A brass player presses the valves with one hand (the
    left hand on the horn, the right hand on the trumpet and the tuba): none on a partial of the
    tube, and 1 to 3 valves for 1 to 6 semitones below it (`BRASS_FUNDAMENTALS`).
  - The trombone slide takes the position of the pitch: 1 on a partial of B♭1, and 1 more for
    each semitone below it, up to 7. No probable arm reaches the seventh position, so the positions
    map evenly into the part of the travel that the right arm reaches with 97% of its length.
  - The right shoulder bone turns forward on the oboe, the clarinet, and the trombone, so that the
    right arm reaches the low hands and the slide. Each palm grip is in reach with 97% of the arm
    length.
  - In the rest pose, the head lifts off the mouthpiece, and the instrument moves off the mouth
    and tilts around the mouthpiece. The horn comes up, so that its bell sits on the right thigh.
    The elbows have their own rest directions. The palms keep their grips, unless the hold frees
    the left paw (`WindHold.restFreeL`). Then the left palm of a seated player goes to a place from
    the top of its left thigh (`lapHand()` of `pose/lap.ts`): on the thigh, or beside it with the
    arm hanging, as for the tan fox. The left arm of a standing player hangs (5.2). The lift and
    the lowering move the free paw by the weight that moves the instrument, so the pose stays
    stateless. The wrist goes out, up, and forward from the straight line (`FreePaw.arc`), so that
    the paw passes in front of a round belly. The fingers relax, and the slide closes.
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
    strike soon after the strike before takes the other hand, so that a roll alternates the
    hands. A later strike takes the hand on the side of its target. A hand does not cross the
    other hand, so a fast run on the xylophone keeps the mallets apart.
  - The bass drum player strikes the right head with the beater in its right hand, and its left
    arm hangs, also while it plays. The small percussion player holds the triangle up in its left
    hand, and the beater in the right hand strikes the triangle or the tambourine.
  - Between two strikes, the head of a mallet rests above its last target. Before a strike, it
    moves to the new target and lifts, with a lower lift in a shorter time. It comes down with its
    full speed, reaches the target at the note start, and rebounds (`STRIKE_MOTION`, the `sizes`
    of `PERCUSSION_HOLDS`).
  - A mallet points to its head from a home in front of and below the shoulder joint, so the wrist
    stays in front of the body and the mallet slants down to a head or a bar. The elbows point
    down and out, and on the snare drum, the xylophone, and the bass drum nearer to the body
    (`PERCUSSION_HOLDS` of `pose/percussion-rig.ts`, user decision of 2026-10-10). The timpani
    keeps its elbows, and the left arm of the elephant still goes into the torso when the left
    hand reaches across to a far kettle.
  - The cymbals keep the turn of the bind pose, with their inner faces to each other. Their inner
    faces meet in front of the shoulders at the note start, and open before a crash, as the lift
    of a mallet.
  - In the rest pose, the arms hang a little out to the sides (5.2).
- Piano: the hands move to the key position. The left hand plays low notes and the right hand
  plays high notes.
- **Piano and harp in detail** (`pose/hand-notes.ts`, `pose/hands.ts`):
  - The notes of a player that start within 50 ms of each other form a chord. A chord wider than
    one octave splits at its largest interval that keeps each hand in its reach: the left hand
    plays the notes below it, and the right hand the notes above it. Of two equal intervals, the
    one nearer to the middle of the chord splits it. A chord within one octave goes to the nearer
    hand, so that a melody stays in one hand. At the same distance, a chord from middle C up goes
    to the right hand. A chord past the reach of the nearer hand goes to the other hand. `reach`
    of `HANDS_HOLDS` gives the highest key of the left paw of the polar bear and the lowest key of
    its right paw. The harp has no limit. The hands start at C3 and C5.
  - A hand plays a chord at the middle of its lowest and its highest key. The piano keys do not
    move, because they are not separate meshes.
  - The piano palm faces down, a little above the keys and in front of their front edge
    (`pianoKeyFront()` of `pose/hands.ts`), because the paw of the polar bear is longer than a
    white key: the curled claws lie on the keys. A hand moves to its next keys, lifts with the
    gesture size, strikes the keys at the note start, and stays on them until its next move
    (`HAND_MOTION` of `pose/hand-notes.ts`). The elbows point out, down, and back. The pianist
    leans forward while it plays (`lean` of `HANDS_HOLDS`), so that its paws reach the keys in
    front of its round belly. The keys stand far enough in front of it that its muzzle keeps off
    the open lid (`docs/decisions/2026-10-14-polar-fix.md`). A real pianist sits with the
    forearms parallel to the floor. The polar bear sits higher, as the user asked, so its forearms
    slope a little down to the keys (`docs/decisions/2026-10-14-polar-bench.md`).
  - The harp palm faces the strings near the middle of the string of its note: the left hand on
    the left side of the strings, and the right hand on the right side. At the note start, the
    palm pulls away from the strings with the gesture size, and the fingers curl.
  - Each paw of the polar bear reaches each key of its range with 97% of the arm length. For a
    key out of reach, the hand stops short, so that the elbow keeps its bend. The harp player
    leans forward, so that the left palm reaches the lowest string.
  - While the harp player plays, its head keeps a gap from the harp, also with the looks at the
    conductor.
  - In the rest pose, the harp player rests its left palm on the left thigh, palm down. The harp
    stands at its right knee, so its right hand rests on the string of C4, because a place on the
    right thigh put the hand into the harp. The pianist rests its paws in the lap. The round
    belly of the polar bear covers its thighs, so each paw rests on the low front of the belly
    over its thigh, with the palm back and down. A rest hand of the kind `lap` thus has the side
    of its palm: down on a thigh, or back and down on a round belly. The top of the lap of a
    studio body is the top of its hips, its belly, and its legs (`pose/lap.ts`). The elbows of
    the pianist hang by the sides, and the short arms lie a little on the belly. The paws keep a
    gap from the case of the piano. Between the rest pose and the playing pose, the wrists of the
    pianist go up over the case (`restArc`), so that the claws pass in front of the belly.
- Choir: the beak or mouth opens with each note, the singer breathes in before a phrase, and it
  sways.
- **Choir in detail** (`pose/choir-notes.ts`, `pose/choir.ts`):
  - A singer sings one note at a time. The notes that start within 50 ms of each other are one
    sung note, from the first start to the last end.
  - The `jaw` bone turns down: the lower beak of the penguin opens before a note, stays open while
    the note sounds, and closes after it. Between two notes, an open jaw closes to half and opens
    again, so that each note shows (`CHOIR_MOTION` of `pose/choir-notes.ts`).
  - The neck and the head lift with the jaw, as in a look, because a beak alone moved too little
    to show in the default view and in a section shot.
  - A rest ends a phrase. The singer breathes in before a phrase, as a wind player.
  - In a phrase, the chest turns to each side with the gesture size, one side every 2 beats.
    Neighbor voices turn to opposite sides, because one side for all voices moved the choir as one
    block. The beat layer also sways the spine.
  - The palms keep their grips on the folder, which follows the chest. The elbows point down and
    a little out and back (`CHOIR_HOLD` of `pose/choir.ts`), and the upper arms touch the sides of
    the body, as the penguins of the reference images hold their folders close (user decision of
    2026-10-10).
  - The penguins have the egg body of 4.4. The palm is a point near the tip of each flipper, so
    the flipper reaches from the shoulder to the grip with a small bend at the elbow. The
    `fingers` bone has no part. The folder hold of 4.6 shows the folder at the height of the
    folders of the two newest reference images. The folder and the flippers stay out of the body
    (`pose/choir.test.ts`).
  - In the rest pose, the jaw closes and the chest stops its turn. The singer keeps the folder in
    its hands.
- The motion starts 100 to 400 ms before the note, by the action. This is possible because the
  app reads the full file first.
- Each player has a small seeded offset in timing (up to 20 ms) and in amplitude, from mulberry32
  with the seed of the player (`PLAYER_OFFSETS` of `pose/plan.ts`). Thus players that play in
  unison do not move as copies. The note layer and the beat layer of a player run at the song
  time minus its offset.
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

- The first bar starts at tick 0. Each time signature event starts a new bar, also inside a bar.
  The tempo at the downbeat of a bar selects the pattern of the bar, so a tempo change can change
  the pattern at the next bar. The tempo is rounded to 0.01 BPM before the comparison, because a
  file stores whole microseconds: 168 BPM reads as 167.99997.
- The beats end before the last note-off (`Score.durationSec`).
- The size of the gestures follows the loudness of all notes.
- Between its cues, the left hand shows the dynamics and the held chords of the score, and it
  mirrors the beat in loud passages. "Left hand between the cues" below gives the rules.
- The conductor cues each section entry, as a real conductor does (user decision of
  2026-10-05). It turns the head and the upper body to the section one beat before the entry,
  and the left hand or the baton lands on the entry. "Cues" below gives the rules.
- If a file has no time signature or tempo events, the MIDI defaults apply: 4/4 at 120 BPM.
- **Conductor in detail** (`pose/conductor-notes.ts`, `pose/cues.ts`, `pose/conductor.ts`):
  - At each beat time, the tip of the baton is at the point of the beat. The points follow the
    pattern of the bar, as the conductor sees them, in the beat plane (`BEAT_PATTERNS` of
    `pose/conductor-notes.ts`). Beat 1 comes down at the bottom. Beat 2 of four and beats 2 and
    3 of six go inward, the next beats outward, and the last beat goes up.
  - Between two beats, the tip rises in an arc and comes down into the next point with its full
    speed, so that each beat is the low point of a bounce. The arc before a downbeat is higher.
    Before the first beat and after the last beat, the baton waits at the point of the last beat
    of the first bar.
  - **Count-in.** The user decided that a click on play does not start the music at once. The
    conductor first signals the players to get ready, and then the music plays. The transport
    starts at a song time before the start point (6.5). Thus the count-in is a set of poses at
    those song times, and the pose function keeps no state. `pose/count-in.ts` holds the rules
    (`COUNT_IN`), and `Transport.startSec` gives the start point of the last play (5.1).
  - From the song start, the count-in is a ready pause, then one preparatory beat. The players
    lift their instruments in the ready pause (5.2). The preparatory beat is the first conducted
    beat of the score, with a limit, as a conductor gives a slow beat in two.
  - **Ready gesture.** At the start of the count-in, the tip of the baton rises above the point
    of beat 1. The left hand rises up and outward and closes to a loose fist. Thus both paws of
    the bear are up at about the same height, a little above the chin, as in `bear-views.png`.
    The right paw is further out than the left paw, because a right paw further in met the long
    muzzle in the cues to the right. Both hands stay up until the downbeat. When the left hand
    also cues an entry, the cue wins by its weight.
  - The preparatory beat: the tip leaves the ready point upward, in the arc of the downbeat, and
    comes down into the point of the first beat with its full speed at the song time 0. The
    first note sounds there (6.5).
  - After a pause in the song, the count-in is one preparatory beat with no ready pause: the
    conducted beat at the pause point. The tip rises in the arc of the next beat and comes down
    with its full speed at the pause point (`resumeLift()`). A cue holds its pose of the pause
    point, as the players hold their poses (5.2).
  - The size of a beat follows the gesture size of the highest loudness of the notes that sound
    in it (`CONDUCTOR_MOTION` of `pose/conductor-notes.ts`).
  - **Hold of the baton.** The places of the hands are in head heights `H` of the studio bear
    (4.3, 4.4), in `CONDUCTOR_HOLD` and `LEFT_HAND_PLACES` of `pose/conductor.ts`, so they scale
    with the head and the arms. The baton keeps its length, so its point and pivot fit the studio
    bear (`docs/research/2026-10-12-studio-bear.md`). At beat 1, the tip of the baton is at
    `beatPoint` from the right shoulder joint, and the baton points to it from `batonPivot`, so
    the baton points up and a little inward. The beat plane is square to the baton at beat 1. The
    pivot is behind the wrist, as far as the wrist is behind the tip, so the wrist follows about
    half of the motion of the tip, and the arm beats with the baton. At a soft beat 1, the wrist
    is a little below the chin, in front of the shoulder, and out beside the head from behind,
    as in `mockup.png` and in views 02 and 05 of `scene.png`. A wrist further in hid the paw
    behind the body from behind, or put the claws into the muzzle in a turn to the right. The
    fingers curl around the baton. The elbows point down, a little out, and a little forward
    (`poleL` and `poleR`), so that the forearms lean out to the paws, as in `bear-views.png`.
  - The beat plane turns by half of a turn of the upper body to the left, and by the whole turn
    to the right (the cues below), around the vertical through the `spine` bone. In a turn to the
    right, the head turns further than the upper body, and with half of the turn, the long muzzle
    came into the right paw.
  - In the rest pose, the arms hang a little out to the sides (5.2). In the lift and in the
    lowering, the baton turns out to the right and down, so that it does not sweep through the
    desk and the score. `pose/test-conductor-clearance.ts` keeps the bear off the stand, the paws
    and the baton out of the trunk and the head, and the left hand off the head and the baton.
  - **View from behind.** From behind, both hands show beside the head and above the shoulders,
    as in `mockup.png`. `pnpm close-views conductor` shows the bear from behind at the beats of a
    bar (7.1).
  - **Bow at the song end.** At the pause at the song end (6.5), the bear bows to the orchestra,
    while the instruments are still up (the hold of 5.2). A hanging arm of the bear follows half
    of the bend (`HANG_FOLLOW` of `pose/conductor.ts`), because with the whole bend the paws swung
    into the belly, and with no bend the left paw touched the stand. The bow is a function of the
    wall seconds since the pause at the end, so it keeps no state. A pause before the end gives no
    bow. The bear does not turn to the audience, because the transport does not tell a pause at
    the end from a later play, and a turn back at the next play would jump.
- **Chamber group.** A chamber group of 4.2 has no conductor (user decision of 2026-10-06). Thus
  its players give the count-in, as a string quartet does, and it has no cues and no bow at the
  song end.
  - The count-in keeps its times: a ready pause, then one preparatory beat. The players lift
    their instruments in the ready pause (5.2).
  - The leader is the principal player of the first seat of the first section of this list: the
    violins, the piano, the flutes, the oboes, the clarinets, the trumpets, and the horns. With
    none of them, the principal player of the first seat leads (`leaderOf()` of `pose/plan.ts`).
  - The leader breathes in on the first half of the preparatory beat, with a small lean back. On
    the second half, it nods: the upper body leans forward and reaches its full speed on the
    downbeat, where the first note sounds. Then it comes back up (`leaderNodAt()` and
    `LEADER_NOD` of `pose/count-in.ts`).
  - The spine takes the lean. A pianist, a harpist, a percussion player, and a singer also nod
    the head, with the neck and the head as in a look (5.1). A violinist and a violist hold the
    instrument under the chin, and a wind player holds the mouthpiece at the mouth, so their
    head does not nod. A cello and a contrabass stand on the floor and do not lean with the
    player, so their leader does not lean: its head lifts with the breath and drops to level on
    the downbeat, because a lean or a nod brought the head too near the neck of the cello.
  - After a pause, the nod comes on the preparatory beat at the pause point.
  - The nod follows the playing pose of the leader (5.2, 5.5). Thus the first screen shows no
    nod, and a muted leader does not nod.
- **Cues** (`pose/cues.ts`). The user asked for "a more realistic conductor that cues each
  section before it plays". `findCues()` calculates the cues of a score one time
  (`prepareConductor()`), and `cueStateAt()` gives the motion at a song time. `CUE_RULES` and
  `CUE_MOTION` hold the values. The diagram shows one cue of the left hand that lands at 0 s,
  with a beat of 0.5 s.

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
    the seat of at least one bar, within a lower and an upper limit in seconds. Thus a fast bar
    needs a rest of about two beats, and a slow bar does not need a full bar. A note after a
    general rest, in which no seat sounds, is also an entry. The rest of a seat is the time from
    the end of all its earlier notes.
  - **Moments and groups.** Entries that start close to the first entry of a moment form the
    moment. The entries of one motion family (5.1) form a group. In a tutti, at least 3 seats and
    half of the seats with players enter, and all entries form one group.
  - **Dense music.** A seat is busy when its notes cover most of the two bars before a moment.
    When most of the other seats are busy, the moment gets no cue, and the conductor keeps the
    pattern.
  - **Priority.** The priority of a group is its highest loudness (5.3), plus its exposure (the
    part of the other seats that is not busy), plus a bonus for a first entry and for a tutti. The
    group with the highest priority gets the cue of the moment. At a tie, the group of the first
    entry wins. Of two cues whose landings are close, the cue with the higher priority stays.
  - **Hand of the cue.** The entries of the first moment of the song get the downbeat of the
    count-in: the cue lands on the first beat. A strong entry (a tutti, or a loud entry), or an
    entry of a section far to the right, gets the baton when it starts on a beat. Each other
    entry gets the left hand.
  - **Direction.** A cue turns to the middle of the players of its group, above their places. The
    turn starts from the eyes of the bear (the `head` bone). The upper body turns a part of the
    turn, with a limit, and the head turns the rest, with a limit. The head also turns down or up
    to the players. The spine and the chest each turn half of the upper body, and the neck shares
    the head turn as in the idle look (5.1).
  - **Times.** The preparation is the conducted beat before the landing, within limits. The head
    and the upper body turn before the preparation, so the eyes are on the section one beat
    before the entry. They stay on it a short time after the landing, and turn back.
  - **Left hand.** The hand rises before the preparation above the cue point. In the
    preparation, it comes down to the cue point, so that it lands at its full speed at the entry.
    The cue point is up and in the direction of the section from the left shoulder joint. The
    hand points no further right than the front of the upper body, so that the forearm does not
    cross in front of the head, which turns further to the section. It also points far enough to
    the left of the front of the bear that it shows beside the head from behind. It holds at the
    cue point, then goes back to its place between the cues (below), and the fingers open.
  - **Baton.** The beat plane turns by half of the turn of the upper body. A baton cue makes a
    higher arc into its beat, so that the gesture before the entry is larger. The tip still comes
    down to the point of the beat at the entry. The downbeat of the count-in keeps its arc,
    because the preparatory beat is the gesture.
  - **Overlaps.** The times of two cues can overlap. The turns are the sums of the turns of the
    cues by their weights, divided by the larger of 1 and the sum of the weights. The direction
    of the left hand is the mean of the hands by their weights. Thus the motion goes from one cue
    to the next with no jump.
  - **Silent seats.** A cue has the highest audible weight of its seats (5.5). Thus a cue to
    silent seats does not show, and a cue to a group with one audible seat shows. The cue of a
    moment does not go to another group of the moment when its own seats are silent.
  - **No state.** The cues follow the song time. Thus a seek gives the same cue as an unbroken
    play. In the count-in after a pause, a cue holds its pose of the pause point (5.2). The turns
    and the hand follow the weight of the playing pose, so the rest pose has no turn.
- **Left hand between the cues** (`pose/conductor-left.ts`, `pose/conductor.ts`). A real
  conductor uses the left hand for the dynamics, for held notes, and for a mirror of the beat,
  and in `scene.png` (02, 05) both arms of the bear are up. The user reported that the left arm
  moved too little when it hung at the side between the cues. The rules below come from the
  score, so the pose keeps no state. `buildLeftHandTrack()` calculates the data one time
  (`prepareConductor()`), `leftHandAt()` gives the weights at a song time, and `LEFT_HAND_RULES`
  holds the values.

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
    level is a part of a high percentile of the levels of the beats with sound, so that each song
    has its own loud passages. The level at a beat is a mean over the beats near it.
  - **Trend.** The trend at a beat is the mean level of the beats after it, minus the mean level
    of the beats before it.
  - **Weights.** The mirror grows with a high level, the swell with a rising trend, and the fade
    with a falling trend, each with a smoothstep. A weight changes at a limited speed from beat to
    beat, so a gesture has a minimum length and a short peak gives a smaller gesture. Between two
    beats, the weights mix with a smoothstep.
  - **Held chord.** A held chord starts at the last notes before a long gap with no new note,
    when the sound goes on. A held chord that starts at the end of the last one, with no cut-off
    between them, makes the last one longer, so that the palm stays up over a run of long notes.
    When the sound stops before the next notes, the hand cuts it off: the fingers close at the end
    of the sound. At the song end, the closed hand stays for the bow.
  - **Places.** Each place of `LEFT_HAND_PLACES` gives the wrist from the left shoulder joint in
    `H`, the direction of the fingers, and their curl. The places are out at the left of the
    head, and all but the fade are above the shoulder, so that from behind the hand shows beside
    the head, as in `mockup.png`. The places stay above the desk of the conductor stand.

    | Place | Wrist and fingers | Shows |
    |---|---|---|
    | `quiet` | out beside the head and above the shoulder, a little lower than the paw of the ready gesture, with the fingers forward and a loose curl | the hand raised and ready beside the head, as in `mockup.png` |
    | `mirror` | out beside the head and above the shoulder at beat 1, with the fingers forward | the beat in a loud passage |
    | `swell` | high above the shoulder, with the fingers forward and up and the hand open | a crescendo: the open hand rises |
    | `fade` | out at the side at the height of the shoulder, with the fingers forward and down and the hand open | a diminuendo: the palm presses down at the side |
    | `hold` | above the shoulder and furthest forward, with the fingers forward and up and the hand open | the open palm holds the chord |

  - **Mirror.** The wrist moves by a part of the motion of the tip of the baton in the beat plane
    (`MIRROR_SCALE`), mirrored from the right to the left. Thus beat 2 of a pattern of 4, which
    goes inward with the baton, also goes inward with the left hand.
  - **Turn.** The places turn with the upper body around the `spine` bone when it turns to the
    left. In a turn to the right, they stay, because a turn to the right brought the lowered hand
    of a fade into the desk.
  - **Cues and count-in.** A cue and the ready gesture mix in after the places by the larger of
    their weights. Thus the left hand lands on the cue point, and rises to a cue from its place
    between the cues.
  - **Rest pose and bow.** The playing pose mixes the hanging arm into the place, so the arm
    hangs in the rest pose. In the bow at the song end, the left arm comes down to the side in the
    bend, because with the hand up, the head bowed into the held palm.

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
holds the rules and the values (`SHOT_TIMES`, `CUT_BONUS`, `CHOICE_WEIGHTS`, `SHOT_KEYS`,
`KEY_SEARCH`, and `BLEND_RULES` of `shots/prepare.ts`, `CLEARANCE` and `SIGHT` of
`shots/clearance.ts`, `FOREGROUND` of `shots/foreground.ts`, and `SUBJECT_SIZES` of
`shots/subjects.ts`). [`research/cinematic-camera.md`](../research/cinematic-camera.md) gives the
practice of concert films with sources, the prototype, and its faults.

The camera is a pure function of the song time, as the pose is (5.1). `prepareShots()` makes a
shot plan one time for each score, and `cameraAt()` gives the camera of each frame. Thus a seek,
a pause, and a speed change are always correct, and the same piece gives the same film.

`traceShots()` makes the same plan and gives the choice at each cut of a time range as plain
data: the candidates that a rule drops, with the rule, the other candidates in the order of the
search, and each tested camera with the test that refuses it. A camera that failed a test at an
earlier cut keeps the refusal of that test, so the trace of a cut does not depend on the range.
`pnpm shot-trace` prints it, also for a commit beside the working tree.

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
is `radius / sin(min(v, h)) × FIT_MARGIN`, where `v` is half the vertical field of view and
`h = atan(tan(v) × aspect)`. A phone in portrait thus gets a camera about 2 times farther away
than a desktop. A wide shot and a high shot use the default distance of 4.5 in place of a fit.

**Kinds.** Each decision of the plan has its own seeded numbers: a hash of the seed, the time of
the cut, and the name of the decision, such as `jitter solo 3`. Thus a change of one search does
not change the numbers of the other decisions, and a small move of the players keeps most of the
plan. `SHOT_KEYS` and `WIDE_VARIANTS` of `shots/prepare.ts` hold the angles and the moves.

| Kind | Target | Camera | Move in the shot |
|---|---|---|---|
| wide | the target of the default view (4.5) | the default view, or a variant from a side or lower | a push-in, or an arc for the variants from the sides |
| high | a little behind the stage center | high, near the front | an arc to the middle and past it, and a rise |
| conductor, close | the shoulders of the bear | low, behind the bear from the audience side | a push-in |
| conductor, over the shoulder | in front of the head of the bear, toward the players who play | behind the bear from the audience side | a push-in |
| side | above the middle of the players of the seats of one side | low, from the front of that side | an arc and a push-in |
| section | above the middle of the players of the group | low, from the front of the group, higher for a back row and for the piano | an arc and a push-in |
| solo | above the principal player of the seat | low, from the front of the player to one side, higher for a back row and for the piano | a push-in and an arc |

- Each wide shot follows the landscape rule and the portrait rule of 4.5. In a portrait view,
  the camera is more frontal, lower, and nearer. The first wide shot is the default view of 4.5.
  The variants from the sides arc and do not push in, so that each player stays in the frame of
  a landscape view. The push-in stops before the beam fade of Free mode (4.5).
- The conductor shots take turns between two framings from the audience side. The first one,
  and each odd one, is view 02 of `scene.png`: it looks over the shoulder of the bear at the
  orchestra, toward the principal players of the window, weighted by their activity. The camera
  stays behind the bear, the bear stands at the bottom middle of the frame, and the orchestra
  fills it. The other shots are view 05: the back, the head, and the raised arms of the bear,
  close, with the players out of focus behind it (4.5). The reference images show the conductor
  only from behind (1). When the framing of the turn has no clear camera, the other one fills in.
- The side views are views 03 and 04 of `scene.png`: one side of the stage from the front of that
  side and low. The side of a seat is the side of its principal player, and a player near the
  middle line has no side. A side view holds the seats of its side that play or enter in the
  window, with 2 or more such seats, and its sphere holds about the front half of the side. All
  players of the side and the conductor are subject players, so their heads do not count in the
  foreground rule. The camera stays near the front of the side, so it never looks along the side
  from behind.
- The front of a player is the direction of its facing: `(-sin f, 0, -cos f)`. The front of a
  group is the mean of the fronts of its players.
- The front of a piano subject turns from the front of the pianist to its right: the side of the
  high keys and of the open lid. Thus the camera shows the profile of the pianist and looks down
  on the keys, because a camera in front of the player looked into the black case.
- A back row gets a higher camera, which looks over the front rows. The close shots of
  `scene.png` (06 to 08) look at the players almost level, so the section and solo shots start
  low, because high cameras showed the tops of the heads and the dark area beside the stage.
- The section groups (`SECTION_GROUPS` of `shots/subjects.ts`): violins, low strings (viola,
  cello, contrabass), woodwinds, brass, percussion (timpani and percussion), harp, piano, and
  choir. The two-shot of a small group has the group `ensemble` (below). A group holds its active
  seats and the seats that enter at the cut. Its sphere holds each player and each head with a
  margin. If the sphere is too large, the group keeps the seat with the most activity, and the
  next seat if both still fit, so that a section shot does not look like a high wide shot.
- A part shot is a section shot of the part of a choir seat that sings the tune (the tune of a
  choir, below), for example the sopranos. Its group is `choir`, so rules 1 and 2 keep it apart
  from a section shot of the full choir.
- Each move blends the azimuth, the elevation, the zoom, and the field of view with a smoothstep
  over the full shot, so the move starts and ends at rest. The move turns around the target, so
  it never cuts through the subject. The plan uses no change of the field of view in a shot.

**Cut points.**

- A cut falls on a downbeat, or on the middle beat of a bar with an even number of beats. The
  planner scores each such beat in a window after the start of the shot by the distance to a
  seeded wanted length, with a bonus for a phrase line (a bar index that is a multiple of 4 or
  2), a penalty for a middle beat, and the bonus of an entry below (`CUT_BONUS`).
- The user asked that the automatic camera films the player who just started to play. A cut
  near the start of an entry (`ENTRY_REACH`) is a cut at the entry, and it gets a bonus that is
  larger than the phrase bonus and the penalty of a repeated length together. The first entry
  with a cut point in reach after the shortest length ends the shot.
- A cut that gives the shot the length of the previous shot gets a penalty: more than the phrase
  bonus, and less than the entry bonus. Thus the cuts of a piece with a steady tempo do not fall
  on a grid of equal lengths.
- With no downbeat in the window, the cut falls on the beat nearest to the wanted time, because
  a slow bar can be longer than the window.
- The lengths are in song seconds, so the cuts follow the speed.
- The first shot is a wide shot from `-Infinity` to the first cut. It is the default view of 4.5,
  so the first screen, the count-in, and the first phrase show one view with no cut. After the
  downbeat, it pushes in. A concert film also starts with an establishing shot, and an opening
  on the conductor lost the full orchestra at each demo switch.
- The last shot is a wide shot of the default view. It starts on a downbeat before the song end,
  pulls out until the song end, and holds after it.
- The end of each shot leaves room for the shots that rule 3 below needs before the last shot.

**Choice of the next shot.** The planner reads the music of a window after the cut from the
`Score` (`MUSIC_RULES` of `shots/music.ts`):

- The coverage of a seat is the part of the window that the merged note spans of the seat cover.
  The loudness of a seat is the highest `noteLoudness()` of its notes in the window (5.3).
- An active seat has players and a minimum coverage. The activity of a seat grows with its
  coverage and its loudness, and the share of a group is its activity divided by the activity of
  all seats.
- An entry is the first note of a seat after a rest of at least two full bars and 4 s, or its
  first note after the song start (`findEntries()` of `shots/entries.ts`), when a passage follows
  it (`prepareMusic()` of `shots/music.ts`). A seat enters at a cut when its entry starts near
  the cut. The cues of the conductor (5.4) have their own rule in `pose/cues.ts`, so a change of
  the cues does not change the shots.
- A seat that rests at the cut and enters later in the window is no subject of the cut: its
  entry gets its own cut.
- A tutti: most of the seats with players are active and loud.
- The lead: an active seat with a pitched instrument carries the lead when it holds the top line
  (the highest key of the pitched seats) in half the window or more, or when it is clearly louder
  than the other active seats. A concert film follows the instrument with the melody.
- The tune of a choir: an active choir seat sings the tune when its top voice has the key of
  the top line, or that key one or more octaves lower, in half the window or more, because the
  flutes and the violins can double the sopranos an octave higher. It then carries the lead too.
  The players of that seat that sing its top voice are the part of the tune (divisi, 3.8).
- The first voice: at the first cut after the opening, each active seat that played its first
  note in the opening counts as an entry at the cut, because the song start is the end of no
  rest. `score/test-first-voice.ts` holds this case.

Each candidate gets a score (`CHOICE_WEIGHTS` of `shots/prepare.ts`):

| Candidate | Score rises with | Only with |
|---|---|---|
| wide | a tutti, and a due wide view | |
| high | a tutti, many active seats, and a due wide view | 3 or more seats |
| conductor | many active seats | a conductor and 3 or more seats |
| side view of a side | the share of the side, an entry of its seat at the cut, and the piano | 3 or more seats on the stage, and 2 or more seats of the side in the window |
| section of a group | the share, an entry at the cut, and the lead. It falls in a tutti | |
| part of a choir seat that sings the tune | the score of a section shot of that seat alone | 3 or more seats, and fewer players in the part than in the seat |
| solo of a seat (its player 0) | the share, few active seats, its own entry, the lead, and the piano and the harp. It falls in a tutti | |

Before the scores, each candidate has a rank. A wide or a high shot that cannot wait for the
next cut comes first, so that a wide view comes at least every 60 s. Then the solo shot of a
soloist that enters at the cut: the soloist of the score (3.8), or a seat with one player that
carries the lead. Then each other candidate that shows a seat that enters at the cut. Then the
other candidates. The rules below change the scores in each rank. Thus the entering seat wins the
cut over a tutti and over a wide view that is only due, and a soloist wins it over the sections
that enter with it.

A wide view is due a time after the end of the last wide or high shot (the opening counts), and
near the end with room for a wide shot before the last shot. A close shot also ends before the
limit of 60 s after the last wide view, when its shortest length allows it.

Then these rules apply, in this order:

1. No repeat: the kind and the subject of the previous shot get no score.
2. No same group: a section or solo shot of the group of the previous shot gets no score. Without
   this rule, the prototype gave four woodwind shots in a row.
3. Spacing (`SHOT_TIMES`):
   - 3a. A wide or high shot needs at least three other shots since the last wide or high shot,
     or since the start, and room for three shots before the last shot.
   - 3b. A conductor shot needs at least five other shots since the last conductor shot, or since
     the start, as the share of S1 in the report. Thus the bear shows after the opening phrase.
   - 3c. A side view needs at least three other shots since the last side view, or since the
     start.
4. Variety: a subject of the last 4 shots loses score, and a side, section, or solo subject loses
   score for each earlier use. Without this rule, the harp got 6 solo shots in the Boulanger demo.
5. Seeded jitter: each score gets a small seeded value.
6. Clear camera: the best candidate with a clear camera wins. When no candidate has a clear
   camera, for example when no seat is active in the window after the cut, the previous shot
   holds on to the cut that a shot of its kind from there would get, within its own longest
   length. Else a conductor shot fills the time, also against rule 3b, because the bear conducts
   the rest. After a conductor shot, it has the other framing. Else a wide shot fills the time.

**Chamber groups and small groups.** The user decided that a chamber group (4.2) has no
conductor, and that a group with fewer than 3 seats gets no conductor shot, because the shots of
the back of the bear were the weakest frames of the film of a piano solo.

- A score with no conductor has no conductor shot. Where rule 6 lets a conductor shot fill the
  time, a wide shot fills it.
- A score with fewer than 3 seats with players (`SMALL_GROUP_SEATS`) gets only the solo shots of
  the principal players, a two-shot, and the wide shots: no high shot, no section shot, and no
  conductor shot, also when it has a conductor.
- The two-shot is a section shot of all players on the stage, also of a seat that rests, with
  the group `ensemble`. A group with one player has no two-shot. Its score is the score of a
  section shot of all seats. Its sphere has a smaller margin (`SUBJECT_SIZES.twoShotMargin` of
  `shots/subjects.ts`), so that its cameras stay within the close distance.
- With one seat, rules 1 and 2 do not stop a solo shot of that seat after a solo shot of the same
  seat. The jump cut rule and the rule of no repeat of a framing keep the two cameras apart. Thus
  a piano solo shows the pianist from several sides between its wide shots.
- The opening wide shot holds through the count-in of the leader (5.4), as for an orchestra.

Mute and solo do not change the plan. The plan is made one time for each score, and a solo would
need a new plan (choice C of the report).

**Clearance.** The camera must never stand inside a player, and the subject must not hide behind
an item. The obstacles are the boxes of `layoutObstacles()`: the footprints of 4.5. A player
footprint has one box for the parts of each bone in each height band, so the body of a player is
several boxes.

- The line of sight from just outside the target to the camera at the narrowest aspect crosses no
  box. A narrower aspect moves the camera back along the same ray, so one test covers the aspects
  from 0.46 up. The test skips the boxes near the target (the body of the subject and the
  instrument at its chest). A far part of a large instrument, such as the piano case or the harp
  frame, still counts.
- A solo or a conductor shot also has sight points: the middle of the head, each palm that holds
  the instrument, and one point of the instrument (such as the bow contact, the keys, or the harp
  strings). The conductor has its head and the point of beat 1 (5.4) with its mirror for the left
  hand. The line to the head crosses no box. Of the lines to the hands and the instrument, at
  most one crosses a box. The lines are tested at the aspects 1 and 0.46, at the start, the
  middle, and the end of the move.
- No head of another player stands in the foreground of a close shot, at the start and at the
  end of its move, in a desktop view (aspect 1.6) and in a phone view in portrait (aspect 0.46).
  The plan is the same for all views, so the camera must pass in both. A head in the foreground
  is nearer to the camera than the focus of the subject, and a part of it shows in the frame, in
  the middle of the frame, or large on the screen (`FOREGROUND` of `shots/foreground.ts`). The
  focus is the middle of the head of a solo player or of the conductor, or the target of a
  section. The heads of the subject players do not count. A head counts only when more than a
  thin cap of it shows, because a low camera shows the tops of the heads of the front rows at
  the frame bottom.
- A choir shot looks at the singers over the orchestra. A head with its top under the chest of
  each singer of the subject on the screen covers no face and no music folder, so the head rules
  skip it, and the rule of a large head still applies. All singers of the choir seat are subject
  players.
- No other object covers more than 15% of the frame of a close shot, at the start and at the end
  of its move, in the same two views. The objects are each player with its instrument, the
  conductor with the podium, and each stand. The subject players, the risers, and the neighbors at
  the depth of the subject do not count. The planner tests the heads before the clearance, and the
  cover of the objects after it, because the cover test costs more.
- The size of a head in a portrait frame counts against the geometric mean of its half sides,
  because the area of the frame sets how large a head looks.
- The middle of the body of the bear stays out of the desktop frame of a solo shot of the
  soloist, because the soloist stands beside the podium.
- Each close camera stays nearer to the stage center than `CLOSE_DISTANCE_SHARE` of the default
  distance, so that a change to Free mode keeps the beam of the shot (4.5).
- Each camera keeps a distance from each box, and a larger distance from the podium and the
  conductor, because the arms and the baton of the bear reach out of its footprint. The camera
  stays above the stage top.
- The camera stays inside or outside the cone of the visible beam (4.5) for a full shot, with a
  margin (`BEAM_MARGIN`). The beam draws only its outer faces, so a camera that crosses the cone
  makes the image darker at once. A cut or a blend that changes the side is a hard cut.
  `models/beam.ts` holds the cone.
- The planner tests points along each move, and more points along the sight lines and a blend,
  because a line between two test points crossed a box. It tries the wanted azimuth, then steps
  to each side, then the same azimuths higher, up to the top of the elevation band
  (`KEY_SEARCH`). A full search (below) also tries each place of the grid up to a limit from the
  wanted azimuth. The camera stays within 75° of the front of the subject (30° for a side view),
  so it never shows the back of a player.
- The elevation bands: up to 30°, from 30° to 40°, and from 40° to 50°, each higher for a piano
  shot. At a cut, each candidate first gets a search in the lowest band, so a lower camera of a
  candidate with a lower score wins over a higher camera of a better candidate. The best candidate
  gets all bands when a seat of it enters at the cut, and each candidate that shows an entering
  seat or has a score near the best gets the band up to 40° and a full search, so that an entry
  or the lead keeps its shot. The other candidates get the higher bands only when no candidate
  has a clear camera. A conductor shot that fills the time searches all bands.
- The shares of the UX audit (at least 60% of the section and solo cameras at 30° or lower, and
  at most 15% above 40°) hold where no player blocks a camera. `shots/prepare.test.ts` checks
  them on the layouts of the demos spread 3 times. In the demos, the bodies block some low
  cameras, so a new body moves the shares, and the test of the demos checks only the limit of 50°.
- The other framings of that entry come next, before the other candidates: each candidate that
  shows a seat that enters with the best candidate. The full search and the other framings keep
  the shot of an entry when a small change of the player footprints takes away one camera.
- The seeded offset of the wanted azimuth from the front of the subject is a multiple of the grid
  step. Thus each camera of a subject stands on one grid around its front, and the planner keeps
  the result of the tests of each camera of each subject for the later cuts.
- A wide or a high shot needs no test, because its camera is far outside the stage. Each player
  stays in the frame of each wide shot, with its feet and its head. In a landscape view, the 4 top
  corners of the stage also stay in the frame. With the drawer open (2.8), each player of the
  opening stays in the free area left of the drawer, between the title and the bar.

**Jump cuts.** Two neighbor shots differ by at least 30° in the view direction, or by a factor of
1.5 in the size of the subject (`JUMP_CUT`). A camera of the search that breaks the rule does not
count. The conductor shots look in the direction of the section shots, so the jump cut rule
alone keeps them apart. The two conductor framings differ in size by more than 1.5 times.

**No repeat of a framing.** The camera of a side, section, or solo shot stays at least 20° in
azimuth from the camera of the last shot of the same subject (the same side, the same seat, or the
same section group). A part shot of a choir seat has the section group of its seat, `choir`. A
camera of the search that breaks the rule does not count.

**Transitions.** A hard cut is the default. A blend is a short camera move from the end of the
previous shot to the new shot, over one beat, after the downbeat. It replaces the dissolve of a
concert film, because a true dissolve needs two renders for each frame. A blend applies only when
all of these are true (`BLEND_RULES`):

- the beat is slow, or the window is quiet,
- both shots are conductor, section, or solo shots,
- the two cameras of a desktop view are near each other,
- the straight path between them passes the clearance test at the aspects 1 and 0.46, and stays
  on one side of the cone of the beam.

With reduced motion, each cut is hard.

**Frame.** `cameraAt()` marks a close shot with `close`, and the frame of a close shot fits into
the free area above the bar and left of the open drawer (4.5). The planner tests the full frame,
so the user sees each part of it. The camera of the shot does not change.

**Beam.** The visible beam (4.5) fades in the close shots, because a close camera outside the
cone saw the additive beam over the full image, and the close shots looked washed out.

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
- Free mode reads the factor from the camera distance (2.5, 4.5), so a change to Free mode keeps
  the factor.
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

**Entry statistics.** `shots/entry-cuts.test.ts` measures the cuts at the entries with its own
reading of the notes: an entry event is the first note of one or more seats after a rest of two
full bars and 4 s, with a passage after it. The plan cuts to the event when the first cut near it
shows an entering seat. The events in the last shot do not count. The test needs 50%. The stability
tests of `shots/prepare.test.ts` keep most of the shots and the cuts when each player moves by
2 cm.
