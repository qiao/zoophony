# 5. Animation

## Pose index

The table lists each role of the app. A role is a kind of player with a pose of its own: an
instrument with the species of its section (`SECTION_SPECIES` of `models/cast.ts`). A species
with a hold of its own is a role of its own (`SPECIES_HOLDS` of `pose/bowed-rig.ts`,
`SPECIES_WIND_HOLDS` of `pose/winds.ts`). The code holds the values of each hold, so the table
gives no angle and no length.

- **Support.** A role that "stands as a soloist" stands when it is the soloist of an orchestra, a
  player alone, or the partner of a pianist in a recital (`supportOf()` of `models/player.ts`,
  4.2, 4.5).
- **Source.** The real player that the pose follows, with the file that holds the source. "none"
  means that the repository holds no real player for the pose. Each seated role also follows the
  seated posture of 5.2.
- **Docs.** The design text and the newest decision files of the pose in `docs/decisions/`. "5.3
  bowed strings" names the paragraph "Bowed strings in detail" of 5.3, and the same for the other
  families. `2026-10-17-left-hand.md` and `2026-10-17-bow-arm.md` hold the hands and the bow of
  each bowed role.
- **View.** `pnpm close-views species <species> <dir>` shows a species on its support during
  play, and `--moment rest` shows its rest pose (7.1). A query opens `/gallery.html` of `pnpm dev`
  at one percussion instrument of the badger.

Each new role and each new hold adds its row to this table in the same commit.

| Role | Support | Source | Play | Rest | Code | Docs | View |
|---|---|---|---|---|---|---|---|
| Conductor, bear | Stands on the podium | none | Beats the patterns of 5.4 with the baton, cues each entry, and shows the dynamics with the left paw | The arms hang a little out to the sides | `CONDUCTOR_HOLD`, `pose/conductor.ts` | 5.2, 5.4, `2026-10-22-studio-bears.md` | `pnpm close-views conductor <dir>` |
| Piano, polar bear | Bench | Play: `docs/reference/piano-technique.md`. Rest: a Suzuki checklist (`docs/research/2026-10-13-pianist-lap.md`) | Sits upright with level forearms and low shoulders, the claws on the key tops, and a lean toward the far keys | Sits tall with the head up, with the paws on the thighs and the elbows bent | `HANDS_HOLDS.piano`, `pose/hands.ts` | 5.2, 5.3 piano and harp, `2026-10-14-polar-fix.md`, `2026-10-22-studio-bears.md`, `2026-10-24-polar-bear-seat.md`, `2026-10-24-pianist-pose.md` | `pnpm close-views pianist <dir>` |
| Harp, deer | Stool that fits its legs, with the whole haunch on the seat (4.4, seat) | Play and rest: `docs/reference/harp-technique.md` | Sits erect with a small lean, the smaller harp leaned back onto its right shoulder, the elbows out, and each palm plucks the string of its note | Sits up, with each hand on a string, a little away from it, and the elbows out | `HANDS_HOLDS.harp`, `HARP_PLACE`, `pose/hands.ts` | 5.2, 5.3 piano and harp, `2026-10-21-mesh-deer.md`, `2026-10-25-harp-lean.md` | `pnpm close-views harpist <dir>` |
| Violin, rabbit | Chair, stands as a soloist | Play: violinonline.com and Simon Fischer (`docs/research/2026-10-14-fox-rabbit-form.md`). Rest: the image of the user (`docs/research/2026-10-16-bow-rest.md`). Hands and bow: `docs/reference/string-technique.md` | Holds a violin of 0.83 on the left shoulder under the jaw, with the bow nearly square and the stick through the closed right paw | The violin upright on the top of the left knee, held at the upper neck with the left elbow bent, carried by the left paw and upright in the middle of the lift, and the bow upright at the right side with the frog above the outer side of the right knee and the right elbow bent. A soloist hangs the bow with the tip down | `SHOULDER_HOLD`, `UPRIGHT_BOW`, `HANGING_BOW`, `STANDING_REST`, `pose/bowed-rig.ts` | 5.2, 5.3 bowed strings, `2026-10-17-rabbit-pose.md`, `2026-10-17-grip-all.md`, `2026-10-23-rabbit-arms.md`, `2026-10-24-rabbit-hold.md`, `2026-10-24-violin-rest.md`, `2026-10-24-violin-poses.md` | `pnpm close-views violinist <dir>` |
| Violin, red fox | Chair, stands as a soloist | The sources of the rabbit | The hold of the rabbit, with the tail end under the long jaw. In pizzicato, the bow tip points up and back | The rest of the rabbit, with the frog at the outer side of the right thigh | `FOX_HOLD`, `UPRIGHT_BOW`, `HANGING_BOW`, `STANDING_REST`, `pose/bowed-rig.ts` | 5.2, 5.3 bowed strings, `2026-10-17-fox-form.md`, `2026-10-17-grip-all.md` | `pnpm close-views fox-violinist <dir>` |
| Viola, cat | Chair, stands as a soloist | Rest: the image of the user (`docs/research/2026-10-16-bow-rest.md`). Hands and bow: `docs/reference/string-technique.md` | Holds the viola under the chin, back toward the neck. The left paw curls around the neck, and in the high positions it tilts further over the upper bout | The viola upright on the front of the left knee, with the top plate to the front and 30° to the left, carried by the left paw and upright with the top plate to the body in the middle of the lift, and the right paw over the outer side of the right thigh | `CAT_HOLD`, `LAP_VIOLIN`, `UPRIGHT_BOW`, `HANGING_BOW`, `STANDING_REST`, `pose/bowed-rig.ts` | 5.2, 5.3 bowed strings, `2026-10-17-cat-bow.md`, `2026-10-17-cat-hand.md`, `2026-10-17-cat-look.md`, `2026-10-20-cat-left-arm.md`, `2026-10-24-violin-rest.md`, `2026-10-24-violin-poses.md`, `2026-10-25-cat-arms.md` | `pnpm close-views violist <dir>` |
| Cello, dog | Chair | The cellists of `docs/reference/string-technique.md`, section 2.7 | The cello leans back in front of the knees, with its neck at the left of the head. The bow plays no hair near the frog. In pizzicato, the right paw comes up from the side near the end of the fingerboard | The cello stays between the knees, and the bow stands over the right knee with the tip up | `DOG_HOLD`, `UPRIGHT_BOW`, `pose/bowed-rig.ts` | 5.2, 5.3 bowed strings, `2026-10-17-dog-arms.md`, `2026-10-17-dog-rest.md` | `pnpm close-views cellist <dir>` |
| Contrabass, hippo | Stands | Hands and bow: `docs/reference/string-technique.md` | The smaller contrabass leans to the left of the head on its short end pin, its back touches the front of the belly and does not go in, the player leans forward, and both shoulders turn forward | The contrabass stays at its playing place with the left paw on the neck, and the bow hangs from the right paw beside the belly | `HIPPO_HOLD`, `HANGING_BOW`, `pose/bowed-rig.ts` | 5.3 bowed strings, `2026-10-18-mesh-hippo.md`, `2026-10-19-hippo-chest.md`, `2026-10-19-hippo-arms.md`, `2026-10-19-arm-skin.md`, `2026-10-21-hippo-bass.md`, `2026-10-21-hippo-bass-arms.md` | `pnpm close-views bassist <dir>` |
| Flute, tan fox | Chair, stands as a soloist | Play: Michel Debost, Flute Talk, May/June 1996 (`2026-10-14-fox-flute.md`). Rest: Patricia George, The Instrumentalist, December 2018 (`2026-10-15-flute-rest.md`). Technique: `docs/reference/wind-technique.md` | Turns the head to the left, with the flute about square to the face and the shoulders square and low. Both palms face the flute, and the fingers curl over it | The flute stands nearly upright with the foot joint on the top of the right thigh, in the closed right paw on the upper body of the flute, and the left arm hangs near the side | `FOX_FLUTE`, `pose/winds.ts` | 5.2, 5.3 woodwinds and brass, `2026-10-17-fox-form.md`, `2026-10-17-tan-rest.md`, `2026-10-24-wind-grips.md`, `2026-10-25-wind-arms.md`, `2026-10-25-fox-arms.md` | `pnpm close-views flutist <dir>` |
| Oboe, mouse | No chair, in the seated pose at the seat height of its legs (4.5, props), stands as a soloist | Technique: Cline, "Oboe for Starters", and `docs/reference/wind-technique.md` 2.3 (`docs/research/2026-10-19-mouse-mesh.md`) | Holds a small oboe with the reed in the mouth under the long muzzle, 40° from the vertical, both paws closed on it from the front, and the elbows down near the body | The oboe stands upright in front of the belly, close to it, both paws closed on its middle, and the head lifts. The round belly covers the thighs, so the oboe does not rest on a leg | `MOUSE_OBOE`, `pose/winds.ts` | 5.2, 5.3 woodwinds and brass, `2026-10-19-mesh-mouse.md`, `2026-10-24-wind-grips.md`, `2026-10-25-wind-arms.md`, `2026-10-25-grips.md`, `2026-10-25-wind-angle.md` | `pnpm close-views oboist <dir>` |
| Clarinet, wolf | Chair that fits its legs, stands as a soloist | Technique: `docs/reference/wind-technique.md` 3 (`docs/research/2026-10-20-wolf-mesh.md`) | Holds the clarinet at the middle of the body, 30° from the vertical, with the mouthpiece in the mouth under the long muzzle, both paws closed around it from the side of the body with the fingers over its front, and the elbows down | The bell stands on the front of the seat between the knees, the clarinet leans forward, both paws close on its upper half, and the head lifts | `WOLF_CLARINET` of `SPECIES_WIND_HOLDS`, `pose/winds.ts` | 5.2, 5.3 woodwinds and brass, `2026-10-20-mesh-wolf.md`, `2026-10-24-wind-grips.md`, `2026-10-25-wind-arms.md`, `2026-10-25-grips.md`, `2026-10-25-wind-angle.md` | `pnpm close-views clarinetist <dir>` |
| Bassoon, beaver | No chair, in the seated pose at the seat height of its legs (4.5, props) | Technique: `docs/reference/wind-technique.md` 3 (`docs/research/2026-10-19-beaver-mesh.md`) | The smaller bassoon crosses the body from the right hip up past the left shoulder, with the bell above the head, the left paw high on the wing joint and the right paw low on the boot joint, the reed in the mouth under the front teeth, and the bocal nearly level | The bassoon keeps its diagonal and moves forward off the mouth, both paws keep their grips, the left elbow keeps its play direction, and the head lifts | `BEAVER_BASSOON` of `SPECIES_WIND_HOLDS`, `pose/winds.ts` | 5.2, 5.3 woodwinds and brass, `2026-10-19-mesh-beaver.md`, `2026-10-25-grips.md` | `pnpm close-views bassoonist <dir>` |
| Horn, pig | Chair that fits its short legs, stands as a soloist | Technique: `docs/reference/wind-technique.md` 2.2 (`docs/research/2026-10-19-pig-mesh.md`) | The left paw holds the valves at the middle of the body, the right paw is in the bell, and the horn lies across the body from the mouth to the bell at the right of the torso, turned back toward the body | The horn comes down and forward onto the round belly over the lap, with the bell at the right beside the haunch, and both paws keep their grips | `PIG_TURNS`, `PIG_HORN`, `pose/winds.ts` | 5.2, 5.3 woodwinds and brass, `2026-10-19-mesh-pig.md` | `pnpm close-views hornist <dir>` |
| Trumpet, monkey | No chair: it stands with the feet under the hips and the trunk leaned forward, so that the center of mass is over the middle of the soles (4.4, seat), and stands upright as a soloist | Technique: `docs/reference/wind-technique.md` 2.1 (`docs/research/2026-10-20-mesh-monkey.md`). Stand: the stability range of the center of foot pressure (`docs/research/2026-10-20-monkey-stand.md`) | The smaller trumpet points forward and down from the mouth, the paws close around the valve block below the mouth, the right fingers press the valves, and the elbows point down | The trumpet moves off the mouth and turns down in front of the chest, both paws keep their grips, and the head lifts | `MONKEY_TRUMPET` of `SPECIES_WIND_HOLDS`, `pose/winds.ts` | 5.2, 5.3 woodwinds and brass, `2026-10-20-mesh-monkey.md`, `2026-10-21-monkey-stand.md`, `2026-10-25-grips.md` | `pnpm close-views trumpeter <dir>` |
| Trombone, panda | Chair, stands as a soloist | Play: pBone, "How To Hold A Trombone", and Western Carolina University, "Slide Technique" (`docs/research/2026-10-18-panda-mesh.md`). Left shoulder: Human Kinetics (`docs/research/2026-10-18-panda-folds.md`). Technique: `docs/reference/wind-technique.md` | The left paw holds the weight at the grip near the mouthpiece, with the left shoulder forward, and the right paw moves the slide with the pitch. The slide points forward and a little down, turned to the right toward the right shoulder as far as the reach of the slide travel needs | The trombone moves off the mouth and stands upright at the right side | `PANDA_PLAY`, `PANDA_TROMBONE`, `pose/winds.ts` | 5.2, 5.3 woodwinds and brass, `2026-10-18-mesh-panda.md`, `2026-10-18-trombone-fit.md`, `2026-10-25-grips.md` | `pnpm close-views trombonist <dir>` |
| Tuba, rhino | Stands in each seat, in the standing pose of its mesh, as a tubist on a strap | Technique: `docs/reference/wind-technique.md` 3 (`docs/research/2026-10-21-mesh-rhino.md`) | The tuba with a longer lead pipe stands under the muzzle in front of the chest, with the bell at the left of the horn and the head. The left paw holds the main branch, the right paw presses the valves from their front right, where it shows from the front, and the elbows point out, down, and forward | The tuba moves off the mouth and its lower end turns forward, and both paws keep their grips | `RHINO_TUBA` of `SPECIES_WIND_HOLDS`, `pose/winds.ts` | 5.2, 5.3 woodwinds and brass, `2026-10-21-mesh-rhino.md`, `2026-10-25-grips.md` | `pnpm close-views tubist <dir>` |
| Timpani, elephant | Stands | The reference images (`docs/research/2026-10-19-elephant-pose.md`) | Each mallet strikes the front kettle of its side, 0.25 m in from the near rim, and turns up and out between strikes. The trunk hangs in the gap between the two front kettles | The paws stay above the near rims with the mallets up | `PERCUSSION_HOLDS.timpani`, `TIMPANI`, `pose/percussion-rig.ts` | 5.2, 5.3 percussion, `2026-10-19-elephant-pose.md` | `pnpm close-views timpanist <dir>` |
| Bass drum, badger | Stands behind the drum | `docs/reference/percussion-technique.md` 5 | The beater in the right paw strikes 12 cm below the middle of the right head, and leaves the side of the fist at the angle of no paw twist between strikes | The beater stays over the drum, and the left arm hangs | `PERCUSSION_HOLDS['bass-drum']`, `BASS_DRUM`, `pose/percussion-rig.ts` | 5.3 percussion, `2026-10-20-mesh-badger.md` | `pnpm close-views bass-drummer <dir>` |
| Snare drum, badger | Stands | `docs/reference/percussion-technique.md` 6 | The drum stands at the height of the wrists, and the sticks leave the front of the fists in a V of about 66°, almost level, with the paws in turn | The arms hang | `PERCUSSION_HOLDS['snare-drum']`, `SNARE_DRUM`, `pose/percussion-rig.ts` | 5.3 percussion, `2026-10-20-mesh-badger.md` | `pnpm close-views snare-drummer <dir>` |
| Cymbals, badger | Stands | `docs/reference/percussion-technique.md` 7 | A suspended cymbal on a stand: the yarn mallets leave the front of the fists, as the snare sticks, and the paws strike in turn near the edge, opposite each other | The arms hang | `SUSPENDED_CYMBAL_HOLD`, `SUSPENDED_CYMBAL`, `pose/percussion-rig.ts` | 5.3 percussion, `2026-10-20-badger-cymbals.md` | `pnpm close-views cymbalist <dir>` |
| Small percussion, badger | Stands | `docs/reference/percussion-technique.md` 8 | The left paw holds the triangle by its clip at the height of the mouth, and the beater in the right paw strikes it, or the tambourine on its stand at the front right | The left paw keeps the triangle up, and the beater stays near it | `PERCUSSION_HOLDS['small-percussion']`, `PERCUSSION_PLACES`, `TAMBOURINE`, `TRIANGLE`, `pose/percussion-rig.ts` | 5.3 percussion, `2026-10-20-mesh-badger.md`, `2026-10-25-grips.md` | `pnpm close-views percussionist <dir>` |
| Xylophone, badger | Stands, and moves from side to side behind the notes with the feet in place | `docs/reference/percussion-technique.md` 9 | The mallets leave the front of the fists, as the snare sticks, and strike the bar of each key. The spine leans over the bars. The bars are smaller than real bars, so that the short arms reach each bar | The arms hang | `PERCUSSION_HOLDS.xylophone`, `XYLOPHONE`, `pose/percussion-rig.ts` | 5.3 percussion, `2026-10-20-mesh-badger.md` | `pnpm close-views xylophonist <dir>` |
| Choir, penguin | Stands on a riser, in the standing pose of its mesh, with the center of mass over the soles (4.4, seat) | The reference images (`docs/research/2026-10-21-mesh-penguin.md`) | The beak opens with each note and closes to half between two notes, the head lifts a little, and the flippers hold the lower corners of the folder in front of the chest | The beak closes, the head comes down, and the flippers keep the folder | `CHOIR_HOLD`, `CHOIR_MOTION`, `CHOIR_FOLDER`, `pose/choir.ts` | 5.3 choir, `2026-10-21-mesh-penguin.md`, `2026-10-21-penguin-beak.md` | `pnpm close-views singer <dir>` |

`BOWED_HOLDS.violin` (the chin hold), `BOWED_HOLDS.cello`, `WIND_HOLDS.flute`, and
`WIND_HOLDS.trombone` have no row.
Each species of these sections has a hold of its own. A new species of these sections takes them.

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
  /** The offset of the root bone: the side move of the hips of a percussion player (5.3). */
  rootOffset: readonly [number, number, number];
  /**
   * The move of the `slide` bone from its bind place, in the axes of the `instrument` bone. It is
   * (0, 0, 0) for each instrument except the trombone and the damper pedal of the piano (4.6,
   * 5.3). The scene adds it to the bind position of the bone.
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

`poseAt()` also solves the IK of 4.7, so the scene only copies the rotations to the bones
(`StageScene.pose()`). The app calls `layoutScene()` and `preparePoses()` one time for each
`Score`, so each frame only looks up the song time in sorted lists and writes into one buffer.
Thus the poses of 60 players take much less than the 4 ms of the main thread (9.7).
`preparePlayer()` and `prepareConductor()` plan one animal for a page with no `Score`.

The pose has three layers:

| Layer | Clock | Motion |
|---|---|---|
| Note | song time | Bow strokes, fingers, breath, mallets, hands (5.3) |
| Beat | song time | A small sway with the felt pulse, and the conductor (5.4) |
| Idle | wall clock time | Breath, eye blinks, looks at the conductor |

The idle layer uses the wall clock time, so the animals stay alive while the music stops.

- **Motion families.** Each instrument has a motion family: `bowed`, `woodwind`, `brass`,
  `keyboard`, `harp`, `percussion`, `choir`, or `conductor`. Each family has its own note layer.
  No layer moves the legs or the trunk (4.7).
- **Beat layer.** In a passage (notes with short rests), a player sways the spine to one side on
  one pulse of the felt pulse and to the other side on the next pulse, with the loudness of the
  passage (`beatSway()` of `pose/pose-at.ts`, `PASSAGE_MOTION` of `pose/passages.ts`).
- **Felt pulse.** A real player sways with a slow level of the meter, and a dancer sways from
  side to side once in a bar of 4 beats (`docs/research/2026-10-21-beat-fold.md`). The pulse
  of a song is its conducted beat (5.4), when the median conducted beat is at most
  `PULSE_TEMPO` (`score/beats.ts`), the preferred tempo of a listener. A faster song takes
  a pulse of 2 or 4 conducted beats. The song has one pulse length in note values
  (`markPulses()`), so a tempo change slows or speeds up the sway with the music. A bar whose
  length is no multiple of the pulse, such as a bar of 3/4 with a pulse of a half note, has one
  pulse at its downbeat. The pulse is part of the plan, so the sway stays a function of the song
  time, with no jump at a change of the conducted pattern.
- **Idle layer.** Each animal breathes, blinks, twitches its ears, sways its tail, and looks at
  the conductor at seeded times in windows of the wall clock, so it needs no state (`IDLE_MOTION`
  of `pose/idle.ts`). In a chamber group (4.2), the players look at the leader (5.4), the leader
  looks at the others, and a player alone looks at the audience. Ears that hang beside the head
  do not twitch (`OwnBodyParams.hangingEars`), as a real hanging ear does not. A curled tail on
  the seat does not sway (`OwnBodyParams.seatedTail`), because the sway moved it into the thigh.

## 5.2 Rest pose

- Before the first play, the players are in the rest pose, because a real orchestra lifts the
  instruments only when the conductor signals the start. The players lift their instruments in
  the count-in (5.4, 6.5), and lower them when the hold of `transport.holdSec` after a pause or a
  stop ends.
- **Natural motion.** The user said: "The animals are still lifting / dropping their arms too
  synchronized and too fast. Make it more natural." Thus each player has its own seeded lift and
  lowering, which `preparePoses()` chooses one time (`restMotion()` and `REST_MOTION` of
  `pose/rest.ts`), so `poseAt()` stays pure. The principal of a seat moves first, and the others
  follow in a ripple, as real players watch their leader. The woodwinds and the brass lift
  sooner, because they also breathe before the first note. The conductor gives the count-in, so
  its motion does not vary (`CONDUCTOR_MOTION`).

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

- **No jump.** A move starts from the height of each player at the change. `transport.before`,
  which `changeTransport()` of `app/transport.ts` sets, keeps the transport before the change, so
  fast changes of play and pause move the instruments with no jump.
- **No wrist flip.** In a lift and a lowering, a paw does not turn past 180° on its forearm, and a
  mix of two turns does not jump to the other side. The twist bone of the forearm takes half of the
  paw twist (`TWIST_SHARE` of `models/studio-rig.ts`), so a twist past 180° turns it by 180° in one
  frame. The bow of a string player takes the side of its mix from the bow at the play place of the
  instrument (`liftMix()` of `pose/bowed.ts`), and the baton turn of the conductor keeps at most
  `CONDUCTOR_HOLD.liftTwist` of twist. The arm gate measures each move at steps of 0.01 s
  (`probeMoves()` of `tools/arm-check.ts`). The rest twist of the left paw of the violins and of the
  viola lies on the far side of 180° from its play twist, so their moves still pass 180° (open,
  `docs/decisions/2026-10-21-wrist-lift.md`).
- **Count-in.** The slowest lift ends before the downbeat. A shorter count-in in wall time
  scales all lifts by one factor (`liftScale()`). After a pause, the note and beat layers hold
  the song time of the pause point (`noteLayerTime()`). A pause in the count-in has no hold: the
  instruments go down at once, and the song time goes back to the start point.
- **Seated posture.** Each seated player sits tall with a straight upright back off the chair
  back, the hips above the knees, the thighs sloping down, vertical shins, and the soles flat on
  the floor. Real seated string players sit so: "The main point is that your hips are higher
  than your knees" (violinist.com, discussion 9372). The user refused a tilted seat, so the seat
  stays level, its height fits the legs, and its front edge ends where the thighs leave it. The
  rig of a mesh makes the posture (`studio.trunk`, `studio.legTurns`, and `chair` of the rig
  config), and the chair of the app fits the legs (`seatHeights()` and `buildChair()` of
  `models/props.ts`, 4.4, `docs/decisions/2026-10-17-fox-form.md`). The rabbit sits further
  forward on a deeper seat (`backRoom` of `ANIMALS`, `docs/decisions/2026-10-17-rabbit-pose.md`).
  The polar bear pianist sits with the thighs near level, the knees near 90°, and the soles on
  the floor, as a real pianist sits "on the front half of the bench, with your feet firmly on the
  floor" (merriammusic.com, "5 Keys to Piano Posture"; `docs/decisions/2026-10-22-studio-bears.md`).
  In the play, its right foot moves onto the damper pedal (5.3).
- **Seated lean.** The polar bear pianist sits tall in the rest pose with a small lean to the piano and the
  head up, as a real pianist before a performance (`restLean` and `restHeadLift` of
  `HANDS_HOLDS`). The lift brings the hands from the lap to the keys. The harp deer sits up, with
  each hand on a string, and the lift brings each hand to the string of its first note.
- **Arm clearance.** In the rest pose, no arm goes through the body. The forearm, the hand, and
  the lower upper arm can touch the body, as in the reference images, up to `ARM_CONTACT_DEPTH`
  of `pose/test-arm-clearance.ts`.
- **Upright bow.** The seated rabbits, red foxes, and cats rest as a seated violinist: the
  violin or the viola upright on the left knee or thigh with the left arm to the neck, and the
  bow upright at the right side with the frog in the right paw (5.3,
  `docs/decisions/2026-10-16-bow-rest.md`, `docs/decisions/2026-10-24-violin-rest.md`). A real
  violist rests as a violinist. Each elbow bends at rest, as the arms of a seated player: the
  short left arm of the rabbit holds the upper neck, and its right paw holds the frog above the
  outer side of the knee (`docs/decisions/2026-10-24-violin-poses.md`). The round belly keeps the
  right paw at the outer side of the thigh (red fox) or of the knee (rabbit), and above the thigh
  (cat), because a paw on the thigh put the forearm into the deep belly. The right elbow of the
  cat points down, out, and a little back, because the rebuilt upper arm lies against the trunk in
  the bind, and an elbow further back took it into the back (`docs/decisions/2026-10-25-cat-arms.md`). In the lift and the
  lowering, the bow tip turns through the front (`BowVia` of `pose/bowed-rig.ts`). The cat
  raises the bow up and forward beside the viola, because a bow across the belly went into the
  viola (`docs/decisions/2026-10-24-violin-review.md`). The left paw
  of the rabbit and of the cat carries the instrument by the end of the fingerboard
  (`BowedHold.liftPlace`), as a player brings the violin up by its neck. The paw moves on a line
  from its rest place to its playing place, with a move off the line in the middle
  (`BowedHold.liftReach`). The instrument hangs from the paw and turns upright in the middle of
  the move, with the top plate to the chest (`BowedHold.liftTurn`). Thus the short left arm stays
  bent near the body: when the tail end moves on the path, the short arm reaches the neck only
  straight, far in front of the round belly. Near the chin, the instrument goes smoothly back to
  the path of its tail end (`CARRY_FADE` of `pose/bowed.ts`), because a carry up to the chin
  brings the tail end into the chest from below. The long arms of the red fox reach the neck with
  the tail end on the path, and its violin also turns upright with the top plate to the chest in
  the middle of the move, so that its left paw does not turn past 180° on the forearm
  (`docs/decisions/2026-10-25-string-angle.md`). The viola of the cat rests with the top plate toward the audience, and
  turns with the top plate to the body in the middle of the move, as the violin of the rabbit, so
  that the twist of the left paw on its forearm does not pass 180°.
- **Cello between the knees.** The seated dog keeps the cello at its playing place, as a seated
  cellist does (`BowedHold.rest` null), and holds the bow over the right knee with the tip up and
  leaned out and forward, as a cellist stands the frog on the knee
  (`docs/reference/string-technique.md`, section 2.7). The short arm does not reach the knee, so
  the grip stays above the thigh (`docs/decisions/2026-10-17-dog-rest.md`).
- **Contrabass, standing.** The standing hippo keeps the contrabass at its playing place with the
  left paw on the neck, and the bow hangs from the right paw beside the belly with the tip down
  (`HANGING_BOW`), because its short knee is under the belly. In the lift and the lowering, the
  tip turns through the front (`BowVia`, `docs/decisions/2026-10-18-mesh-hippo.md`).
- **Free arm of the flute.** The seated tan fox rests the flute nearly upright with the foot joint
  on the top of the right thigh near the knee, as a real flutist rests it on the right leg. The
  closed right paw holds it on its upper body, with the fingers on the tube
  (`docs/decisions/2026-10-25-fox-arms.md`). Its free
  left arm hangs near the side with a soft bend, because the top of the left thigh is out of its
  reach (`docs/decisions/2026-10-17-tan-rest.md`).
- **Oboe at rest.** The seated and the standing mouse hold the oboe upright in front of the
  belly, close to it, as a real oboist holds it vertical in a short rest. Both paws close on its
  middle, the right paw below the left paw, and both keep the aim of the play (`restGripShiftL`,
  `restGripShiftR`, `restAim` of `MOUSE_OBOE`). With the right paw low near the bell, the right
  forearm went into the belly. The round belly of
  the mouse covers its short thighs, so the oboe does not rest on a leg
  (`docs/decisions/2026-10-19-mouse-size.md`, `docs/decisions/2026-10-25-wind-arms.md`).
- **Bassoon at rest.** The beaver keeps the diagonal of the play and moves the bassoon forward
  off the mouth, and both paws keep their grips, so that the lift does not turn them
  (`BEAVER_BASSOON`, `docs/decisions/2026-10-25-grips.md`). It does not rest on a leg, because the
  round belly of the beaver covers its short thighs (`docs/decisions/2026-10-19-mesh-beaver.md`).
- **Trumpet at rest.** The monkey takes the rest of the trumpet of `WIND_HOLDS`: the trumpet
  moves off the mouth and turns down in front of the chest, with the bell down, and both paws
  keep their grips (`docs/decisions/2026-10-20-mesh-monkey.md`). No source of
  `docs/reference/wind-technique.md` gives the rest of an orchestral trumpet player.
- **Tuba at rest.** The standing rhino moves the tuba off the mouth, and the lower end turns a
  little forward, and both paws keep their grips (`RHINO_TUBA`). No source of
  `docs/reference/wind-technique.md` gives the rest of a tubist between two entrances
  (`docs/decisions/2026-10-21-mesh-rhino.md`).
- **Horn at rest.** The seated and the standing pig move the horn off the mouth, lower and
  further forward, onto the round belly, with the bell at the right beside the haunch, and both
  paws keep their grips (`PIG_HORN`). A real hornist rests the horn on the lap with the bell to
  the right, but the round belly of the pig covers its short thighs, and a lower horn put the
  right forearm into the belly (`docs/decisions/2026-10-19-mesh-pig.md`).
- **Clarinet at rest.** The seated wolf stands the bell on the front of the seat between the
  knees, as a real clarinetist does (`docs/reference/wind-technique.md` 3), and the clarinet leans
  forward from it. Both paws close on its upper half, at grips of the rest higher on the tube than
  in the play, and keep the grip of the play (`restGripShiftL`, `restAim` of `WOLF_CLARINET`), so
  that the forearms stay out of the belly. The arm segments (4.4) keep the roll of the right upper
  arm within the arm gate, and at rest the left elbow points down and out, so that the left paw
  turns less on its forearm (`docs/decisions/2026-10-25-wind-arms.md`). The rest of
  `WIND_HOLDS` in front of the chest bent the right elbow so far that the right arm folded
  (`docs/decisions/2026-10-20-mesh-wolf.md`).
- **Trombone at rest.** The seated and the standing panda take the rest of the trombone of
  `WIND_HOLDS`: the trombone moves off the mouth and stands upright at the right side, with the
  bell down, and both paws keep their grips. It does not rest on a leg
  (`docs/decisions/2026-10-18-mesh-panda.md`).
- **Timpani, standing.** The elephant does not hang its arms: its paws stay above the near rims,
  with the mallets up, as between two strikes (`PercussionHold.ready`). The hanging paws reached
  into the large kettles in front of it. The trunk hangs in the gap at the front of the kettles
  (`docs/decisions/2026-10-19-elephant-pose.md`).
- **Percussion, standing.** The badger holds the beater of the bass drum over the drum and the
  triangle up also at rest (`PercussionHold.ready`), because the lift from the hanging arms swept
  the beater through the body and swung the left paw far on its forearm. With the snare drum, the
  cymbals, and the xylophone, its arms hang (`docs/decisions/2026-10-20-mesh-badger.md`).
- **Folder at rest.** The penguin keeps the choir folder in its flippers in front of the chest
  also at rest, as a choir holds its folders between two pieces (`poseChoir()`,
  `docs/decisions/2026-10-21-mesh-penguin.md`).
- **Hanging arms.** A standing player without a lap hangs its arms (`HANG` of `pose/hang.ts`):
  each part of the arm swings out by the smallest angle at which it touches the side of the body,
  so that the palms rest at the height of the hips, as an animal of the reference images holds
  its arms at its belly (user decision of 2026-10-10).

## 5.3 Instrument motion

The pose index at the top of this file gives the hold, the source, and the view of each role.
The code constants of each family hold the times, the angles, and the lengths of the motion.

- Bowed strings: the bow changes direction on each note, or on each slur of short notes. The bow
  speed comes from the note length. The left hand keeps a position on the neck, and the fingers
  play the notes of the position. The hand shifts only when the notes leave its position.
- Pizzicato plucks the string. Tremolo makes short fast strokes.
- **Bowed strings in detail** (`pose/fingering.ts`, `pose/strokes.ts`, `pose/bowed-rig.ts`,
  `pose/bowed.ts`):
  - `docs/reference/string-technique.md` is the target of the motion of the hands and the bow,
    with the source of each fact. Its section 3 gives the rules of the app that follow it, and
    lists where the app differs from it.
  - Notes of a player that start within 50 ms of each other form one stroke, as a chord of 3.8.
    Two pitches in a stroke are a double stop on two neighbor strings.
  - **Position plan** (`planHand()` of `pose/fingering.ts`). A search (Viterbi) gives each stroke
    its string, its position, and its finger before the play, so the pose after a seek is the
    same. Its cost (`FINGERING_COSTS`) gives the orchestral style: low positions and open strings.
    The finger block presses at the place of the note on the real string length, mapped into the
    part of the fingerboard that the left arm reaches with 97% of its length.
  - **Bow** (`BOW_MOTION` of `pose/strokes.ts`). The MIDI files have no slurs, so short connected
    notes in one beat that change the pitch join into one bow (`slurSizes()`). A bow keeps its
    full speed until its last note, so the turn at the next bow is sharp. A louder note mostly
    moves the sounding point toward the bridge (`soundingPointAt()`), and a fast bow moves toward
    the balance point (`balanceShift()`), as for real players. The bow turns to the plane of each
    string (`BowedHold.stringTurn`), and to the next string just before the note, as a violinist
    leads the bow change. In a fast run across two strings, the elbow stays on the mean string,
    and the forearm makes the crossing (`crossPole()`).
  - **Left hand** (`LEFT_HAND` of `pose/strokes.ts`, `leftElbow()` and `leftTilt()` of
    `pose/bowed.ts`). The paws have one finger bone, so the four fingers are one block that lands
    before the note and presses at its start. The hand shifts only between strokes with different
    positions, from the second half of the note before, as Simon Fischer advises. A long stopped
    note gets vibrato, a sine of the time from the note start, so the pose has no state. The left
    elbow turns with the string, and further in the high positions. Only the cat also tilts the
    left paw over the upper bout (`BowedHold.highTilt`), because its viola sits back toward the
    neck.
  - **Playing pose.** The arms of the animals are a little short for their instruments (4.5). The
    right shoulder turns forward, and the stick leans toward the fingerboard
    (`BowedHold.bowTilt`), as the reference gives, so the bow arm reaches the full hair on all
    strings with 97% of its length. The fingers curl around the stick, also at rest, and the stick
    of the rabbit, the red fox, the cat, and the hippo passes through the middle of the closed paw
    (`bowGrip` of `models/species.ts`). The head keeps a gap from the neck of the cello and the contrabass,
    which passes the left of the head (4.6).
  - **Bow arm clearance.** The elbows point to the directions of the hold, so that the arms go no
    deeper into the body than the contact of the rest pose (5.2). Each hold of the bow (play,
    pizzicato, rest) has its own roll of the hand, and the changes mix them with no jump. At the
    tip of a down-bow on its low strings, the bow hand of the hippo still goes into its belly.
    The hand rolls around the stick so that its back points to the elbow. At the far side of the
    stick, the roll changes from one end of its range to the other end, so no elbow of a hold
    stays near that side. The elbow of the hippo lies near the line of the stick, and its hold
    moves the far side to the angles that no elbow of its play takes (`BowedHold.farSideR`).
  - **Holds of the species** (`holdOf()` and `SPECIES_HOLDS` of `pose/bowed-rig.ts`):
    - The rabbits hold the violin on the left shoulder as a real violinist does
      (`SHOULDER_HOLD`): the tail end on the collarbone under the jaw, the strings about level,
      the bow nearly square, and the back straight. The head turns down while the rabbit plays
      (`BowedHold.headDrop`), so that the jaw lies on the chin rest
      (`docs/reference/string-technique.md`, section 1.10,
      `docs/decisions/2026-10-24-violin-review.md`). The violin points about 45° to the left of
      the front, as a real player holds it, and the left shoulder comes forward in the play, so
      that the left paw reaches the nut with the size that the user set
      (`SpeciesParams.violinScale`, `BowedHold.reachL`, `shoulderTurnL()` of `pose/bowed.ts`,
      `docs/decisions/2026-10-25-string-angle.md`). The left elbow points down and forward under
      the violin. The bow keeps a free hair at each end and near the frog (`BowedHold.freeHair`,
      `BowedHold.frogHair`), so that the paw stays out of the body and the jaw at the frog. The bow elbow points out and forward as the elbow of the red fox
      (`BowedHold.poleR`), so that the flat upper arm reads across the body and does not turn its
      broad side to the front (`docs/decisions/2026-10-21-arm-form.md`).
    - The red foxes take the shoulder hold (`FOX_HOLD`) with the tail end under the long jaw and
      their own bow arm, because the bow of the rabbit folded the skin of the fox mesh. The long
      rebuilt arm reaches the nut at 45° with a small forward turn of the left shoulder.
    - The cat holds the viola under the chin (`CAT_HOLD`), back toward the neck, so that the left
      paw reaches the nut (`docs/decisions/2026-10-16-mesh-cat.md`). Its left paw tilts further
      over the neck than in the chin hold (`BowedHold.tiltL`), so that the paw curls around the
      neck and the fingers come down on the strings from above
      (`docs/reference/string-technique.md`, section 1.9). With the tilt of the chin hold, the
      paw turned far on its forearm, and the skin of the wrist pinched into a twisted band
      (`docs/decisions/2026-10-20-cat-left-arm.md`). The viola points 45° to the left, as a real
      player holds it, and sits so that the jaw lies on the chin rest. The cat plays a 1/2 viola
      (`SpeciesParams.violaScale`), a real size for its arms, and its left shoulder comes forward
      in the play, because the viola of the app at 45° put the nut out of the reach of the left
      paw (`docs/decisions/2026-10-25-string-angle.md`). The bow lies square across the strings.
      The right elbow of the play points
      out, forward, and less down than the chin hold, as a violist at the frog, so that the
      rebuilt upper arm stays off the trunk (`docs/decisions/2026-10-25-cat-arms.md`).
    - The dog holds the cello between its knees as real cellists do (`DOG_HOLD`,
      `docs/reference/string-technique.md`, section 2.7), leaned back and to the left as the user
      chose (`docs/decisions/2026-10-17-dog-rest.md`). The short arms reach the strings only nearly
      straight, so the bow plays no hair near the frog (`BowedHold.frogHair`).
    - The hippo stands at the contrabass with its own hold (`HIPPO_HOLD`). The back of the
      contrabass touches the front of the round belly and does not go in, as a real bassist leans
      the contrabass on the body (`docs/reference/string-technique.md`, section 2.8). Its bow arm
      reaches the strings only straight past the belly, so its right shoulder turns further forward
      than the shoulders of the other players, its left shoulder turns forward too
      (`BowedHold.reachL`), and the bow plays no hair near the frog
      (`docs/decisions/2026-10-21-hippo-bass.md`). In pizzicato, the paw plucks from the side of
      the fingerboard (`BowedHold.pluckSide`), and the left paw stops the strings only over the
      neck, not over the upper bout (`BowedHold.stopEnd`,
      `docs/decisions/2026-10-21-hippo-bass-arms.md`). Its thick left paw tilts over the neck as the paw of the
      dog, so that the left arm keeps off the body (`docs/decisions/2026-10-19-hippo-chest.md`).
      The left elbow points out, a little down, and forward. The right elbow points forward, out,
      and a little down, also in pizzicato, with the twist bone of the upper arm, because a raised
      or level elbow twists the thick upper arm of the mesh into a flat band, and a lower elbow
      goes into the round belly (`docs/decisions/2026-10-19-arm-skin.md`).
  - **Rest of the bowed strings.** The rested instruments and bows can touch the body, as in the
    reference images, but do not cross it (`pose/rest-clearance.test.ts`). The seated rabbits, red
    foxes, and cats rest as the seated violinist of the image of the user
    (`docs/research/2026-10-16-bow-rest.md`): the instrument upright on the left thigh, held at
    its neck, and the bow upright at the right side (`UPRIGHT_BOW`, 5.2). In the
    lift and the lowering, the tip turns through the front (`BowVia`), because a direct mix turned
    it through the head. The dog keeps the cello between its knees with the bow over the right knee
    (5.2). The contrabass stays on the floor with the bow on the outer side of the right knee. A
    standing cat, rabbit, or red fox holds the instrument at its left side and hangs the bow with
    the tip down (`HANGING_BOW`), because their long forearms held the bow of the bind pose in
    front of the face (`docs/decisions/2026-10-16-cat-seat.md`).
- Woodwinds: the player breathes in before a phrase. The fingers move on each note.
- Brass: the player breathes in before a phrase. The trombone slide follows the pitch.
- **Woodwinds and brass in detail** (`pose/wind-notes.ts`, `pose/winds.ts`):
  - `docs/reference/wind-technique.md` is the target of the hold, the trombone slide, the hands,
    the breath, and the rest of the winds, with the source of each fact. Its section 4 gives the
    rules of the app that follow it, and lists where the app differs from it.
  - A wind player shows one note: the last note that started, and the highest of a chord (3.8).
  - The mouthpiece stays at the mouth: the head and the instrument follow the chest, and the
    look at the conductor does not turn the head. The palms stay on their grips, and the elbows
    point as far down and in as the arms permit (`WIND_HOLDS`, user decision of 2026-10-10).
  - A paw on a wind instrument closes around its tube, as the left paw of the red fox closes on
    the violin neck. The tube is the tube that the instrument names for the palm
    (`InstrumentGrips.tubeL`), such as the valve block of a trumpet or the brace of a trombone
    slide, else the line of a woodwind through its mouthpiece. A hold names the side of each paw
    that faces its tube (`WindHold.faceTube`): the palm, so that the fingers curl over the front of
    the tube with the thumb behind it, as a real player holds a woodwind
    (`docs/reference/wind-technique.md` 2.3), the back, with the tube through the closed paw, or
    none, when a palm on the tube twists the forearm too far. The
    fingers keep a grip curl at rest and in the play (`WindHold.gripCurl`), and close further for
    the closed keys or the pressed valves. A hold moves each grip around the tube
    (`WindHold.gripShiftL`, `gripShiftR`): the palm point of the IK is the middle of the paw, and
    the retarget turns each paw in the plane of its palm toward the forearm (4.4), so a paw on the
    grip of the instrument can lie beside the tube and point away from it. A hold can give the
    rest its own grips (`restGripShiftL`, `restGripShiftR`), and keep the aim and the roll of the
    play at rest (`restAim`). A hold can move each grip around its tube in the lift and the
    lowering (`WindHold.gripAround`): a grip that slides on a straight line between two sides of
    the tube crosses its axis, and a paw that faces the tube then turns over in one frame.
    `pnpm wind-grip` measures the contact of each paw in the play, the
    lift, the rest, and the lowering, because the arm gate does not see a paw that misses the
    tube. A paw grasps when its finger tips are on the instrument, its palm faces the tube, and it
    is on the side of the tube that the technique names (`docs/decisions/2026-10-24-wind-grips.md`,
    `docs/decisions/2026-10-25-grips.md`).
  - The tan fox holds the flute as a real flutist (`FOX_FLUTE` of `SPECIES_WIND_HOLDS`, Debost,
    Flute Talk, May/June 1996): the head turns to the left, the flute lies about square to the
    face, and the shoulders stay square and low. The lip plate sits under the long muzzle
    (`WindHold.lipShift`). Both palms face the flute, and the fingers curl over it: the left paw
    near the lip plate with the palm toward the player, and the right paw out to the right. At
    rest, the flute stands nearly upright with the foot joint on the top of the right thigh, in
    the closed right paw on the upper body of the flute, as a real flutist rests it vertically on
    the right leg (George, The Instrumentalist, December 2018), and the left paw hangs (5.2).
  - The mouse holds the oboe as a real oboist (`MOUSE_OBOE` of `SPECIES_WIND_HOLDS`, Cline): the
    oboe hangs from the mouth 40° from the vertical, as Cline gives it, and the arms stay a
    little away from the sides with the wrists down. The long muzzle puts the reed far in front
    of the chest, so on a larger oboe the arms reached forward straight at that angle. The user
    prefers a smaller instrument to longer arms, so the mouse plays an oboe small enough that
    the elbows bend near the body (`docs/decisions/2026-10-25-wind-angle.md`). The long muzzle puts the tip of the nose far in
    front of the mouth, so the reed sits back under the muzzle, in the mouth (`WindHold.lipShift`). The small
    mouse plays a smaller oboe (4.6), and about half of the reed goes into the mouth, so that the
    right paw reaches its grip. As a real oboist, the mouse holds the upper joint near the reed
    in the left paw and the lower joint above the bell in the right paw, with a clear gap between
    the paws (`docs/decisions/2026-10-25-oboe-hands.md`). The big head puts the reed high above
    the shoulders, so the right elbow points down, and the right upper arm does not turn into a
    twisted band. The right grip moves down the oboe, away from the reed, so that the right
    forearm does not rise steeply. The left elbow points out to the side, as at rest, so that the
    left paw reaches its high grip and closes around the tube.
  - The beaver holds the bassoon as a real bassoonist (`BEAVER_BASSOON` of `SPECIES_WIND_HOLDS`,
    `docs/reference/wind-technique.md` 3): the bassoon crosses the body on a diagonal from the
    right hip up past the left shoulder, with the bell above the head, the left paw high on the
    wing joint, the right paw low on the boot joint, and the bocal brings the reed to the mouth
    nearly level. The
    long muzzle and the front teeth put the tip of the nose far in front of the mouth, so the reed
    sits under the front teeth (`WindHold.lipShift`). The beaver plays a smaller bassoon (4.6),
    and its shoulder bones turn forward, so that each paw reaches its grip. The app has no seat
    strap.
  - The monkey holds the trumpet as a real trumpet player (`MONKEY_TRUMPET` of
    `SPECIES_WIND_HOLDS`, `docs/reference/wind-technique.md` 2.1): the trumpet points forward and
    down from the mouth, the left paw wraps the valve casings, and the right fingers come over
    the valve tops. The monkey plays a smaller trumpet with longer arms (4.6). Its big head puts
    the mouthpiece high above the shoulders, so the elbows point down, and the upper arms do not
    turn into flat bands. A paw on its grip lies along the line from its shoulder, so both palms
    face the valve block from below its middle, and the long fingers curl over the casings and
    the valve tops. The bell points slightly down, as the sources of a real player say, and the
    left grip lies a little low on the valve block, so that the paws stay below the mouth and the
    face shows in the front view.
  - The rhino holds the tuba as a real tubist who stands with the tuba on a strap (`RHINO_TUBA` of
    `SPECIES_WIND_HOLDS`, `docs/reference/wind-technique.md` 3): the tuba stands against the body,
    the bell at the left of the head, the left paw on the main branch, and the right paw on the
    valves. The long muzzle puts the mouthpiece far in front of the chest, so the tuba has a longer
    lead pipe (4.6), and the shoulder bones turn forward, as the shoulder blades of a real player
    slide forward. The lower end of the tuba turns to the right, so that the bell stands at the left
    of the horn on the muzzle. The elbows point out, down, and forward, and the right elbow more
    out than down, so that the right upper arm stays out of the body, as the arms of a real player
    stay away from the rib cage. The right paw lies on the
    valve tops at the front right of the valve branch, so that a paw shows from the front. The
    left palm lies on the back left of the main branch, as the left hand of a real tubist grips
    the tubing at the side of a rotary tuba. Both paws keep the hold of the play at rest, so that the lowering
    does not turn the left paw over its forearm.
  - The panda holds the trombone as a real trombonist (`PANDA_TROMBONE` of `SPECIES_WIND_HOLDS`,
    pBone and Western Carolina University): the left paw holds the weight at the grip near the
    mouthpiece, and the right paw holds the slide brace. Its big round head puts the mouth far in
    front of the shoulders, so while it plays, the slide turns to its right around the mouthpiece,
    toward the right shoulder, and the right arm reaches the first part of the travel. The slide
    reach takes this turn and the turned head (`slideReachOf()`). A real trombonist points the
    slide toward the audience and never down to the floor (`docs/reference/wind-technique.md` 1.1),
    and the pandas of `orchestra-latest.png` hold it forward and about level. The slide stays a
    little below the level, and turns as far to the right as the reach of the slide travel needs:
    straight ahead, the right paw reached the first position but almost no travel (`PANDA_PLAY`,
    `docs/decisions/2026-10-25-grips.md`). The left palm faces the inner slide tubes. The right paw
    holds the slide brace from the right of the slide with its finger tips, as the tips of the
    thumb and the first two fingers of a real player hold it. The middle of the paw thus stays
    behind the brace, nearer to the shoulder, and the arm reaches more of the travel
    (`docs/decisions/2026-10-25-open-grips.md`). The left shoulder turns
    forward, as the shoulder blade of a real player slides forward when the arm reaches forward
    (`WindHold.reachL`, `docs/research/2026-10-18-panda-folds.md`). Thus the left upper arm does
    not take the whole turn to the grip, and the front of the left shoulder does not fold. The left
    grip turns with the slide, so the left turn changes with the slide turn.
  - The pig holds the horn as a real hornist (`PIG_HORN` of `SPECIES_WIND_HOLDS`,
    `docs/reference/wind-technique.md` 2.2): the left paw holds the valves at the middle of the
    body, the right paw is in the bell, and the horn lies across the body from the mouth to the
    bell at the right of the torso and in front of it. The middle of the right palm lies on the
    axis of the bell just inside its opening (`HORN_PALM_DEPTH` of `models/instruments/brass.ts`).
    The paw points along the line from the shoulder, far across the axis, so a deeper palm puts
    the wrist through the wall of the bell. The long snout puts the mouthpiece far in
    front of the shoulders, so the horn turns its lower end back toward the body around the
    mouthpiece, and the left shoulder turns forward (`PIG_TURNS`, `WindHold.reachL`). Thus the left
    paw reaches the valves with the arms that the user chose.
  - The wolf holds the clarinet as a real clarinetist (`WOLF_CLARINET` of `SPECIES_WIND_HOLDS`,
    `docs/reference/wind-technique.md` 3): the clarinet is at the middle of the body, 30° from the
    vertical, as the wolf of the newest reference images, with the bell in front of the knees. At
    the 45° of the source, the long muzzle put the bell far in front of the knees
    (`docs/decisions/2026-10-25-wind-angle.md`). The mouthpiece sits
    back and low under the muzzle, in the mouth (`WindHold.lipShift`), and both shoulder bones
    turn forward. The elbows point down and a little out, which gave the smallest paw turns on the
    forearms. A paw on its grip aims across the tube (`WindHold.aimAcross`), so that its fingers
    wrap the tube, on the wolf, the mouse, and the tan fox. The paws of the wolf and the mouse
    also turn half toward the side across the tube (`WindHold.aimSide`), their palms face the tube
    from the side of the body, and their fingers curl over its front, as the fingers of a real
    clarinetist come around the tube. The left grip of the wolf is low on the upper joint: higher,
    the forearm rose steeply, and the retarget turned the paw up along the tube.
  - A woodwind player closes the holes with both hands, and up the octave the right hand opens
    first. A brass player presses the valves with one hand: none on a partial of the tube, and 1
    to 3 valves for 1 to 6 semitones below it (`BRASS_FUNDAMENTALS`). Each tube has the
    fundamental of its real length. The horn is a single F horn with no B♭ side, so its written
    C4 is the fourth partial, as on a real F horn (`docs/reference/wind-technique.md` 2.2). The
    partials skip the seventh partial, because it is flat and real players do not use it
    (`PARTIALS`). Above the written C5, the horn takes only the 10th, 12th, and 16th partials, as
    the single F horn chart does (`HORN_PARTIALS`). The trombone slide takes the position of the
    pitch, mapped into the part of the travel that the arm reaches. The steps keep the ratio of
    the real distances, so each step is longer than the step before (`slideTravel()`).
  - In the rest pose, the head lifts, and the instrument moves off the mouth and tilts. The pig
    rests the horn on its belly with the bell at the right (5.2). A hold that frees the left paw (`WindHold.restFreeL`) puts it on
    or beside the left thigh (`lapHand()` of `pose/lap.ts`) on a path in front of the belly
    (`FreePaw.arc`).
- Mallets and percussion: the mallet lifts before the note and strikes at the note start.
- **Percussion in detail** (`pose/strikes.ts`, `pose/percussion-rig.ts`, `pose/percussion.ts`):
  - The notes that start within 50 ms of each other strike together. A drum player strikes its
    own instrument for each note, also for another key group (3.8).
  - A timpani note plays on the kettle whose key range has its middle nearest to the key. A
    xylophone note strikes the bar of its key (4.6). A xylophone part outside the bars moves by
    octaves, so that its highest key is in the highest octave of the bars (`xylophoneShift()`),
    because each note below the bars struck the lowest bar, out of reach. The short bars of the
    high keys stand nearest to the player. The small percussion player strikes the tambourine for
    key 54 and the triangle for the other keys.
  - With two mallets, a chord takes both hands, a fast repeat takes the other hand (a roll), and
    a hand does not cross the other. On the xylophone, a repeat on one bar or a near bar stays in
    one hand (`PercussionHold.gap`), and a run that leaves the reach of one paw goes on in the
    other paw, as the double strokes of a real player (`PercussionHold.reach`). The right paw
    thus does not reach across the body to the lowest bars. A real player alternates the hands in
    a scale, but there the heads pass each other at one height, and the shafts touch (open). The
    left mallet strikes a little nearer to the player than the
    middle of the bar and the right mallet a little farther (`offsetL`, `offsetR`). Between
    strikes, each xylophone mallet keeps its strike direction, and the wrist lifts the head over
    its bar (`MalletAcross.pitch`), so that two heads on near bars keep apart. A mallet lifts before a strike, comes down at its full speed
    at the note start, and rebounds (`STRIKE_MOTION`). The elbows point down and near the body
    (user decision of 2026-10-10). The hand cymbals meet in front of the shoulders, with one turn of
    both plates (`PERCUSSION_PLACES`).
  - The timpani elephant has short arms behind a deep belly, and its trunk hangs between its two
    front kettles. So each hand strikes only the kettles on its side (`sides` of `HandsRule`), and
    a roll stays in one hand, because the other hand cannot reach across the trunk. Each note
    plays on one of the two front kettles (`PercussionHold.pair`), because the outer kettles of
    the real size stand beyond the reach of the arms. The paws rest above the near rims, as in
    the reference images, and each mallet strikes 0.25 m in from the near rim, as the user chose
    (`PercussionHold.rim`). A real timpanist strikes about 3 inches in. The paw holds each mallet
    as a real timpanist holds it: the head leaves the front of the fist, and the shaft lies along
    the thumb, near the line of the forearm (`TIMPANI.malletTilt`,
    `docs/reference/percussion-technique.md`). Each mallet points to its target from a place
    below, in front of, and out from its shoulder (`PercussionHold.home`), so that it points
    forward at a strike. Between strikes, the paw holds the mallet forward and in, at the angle of
    no twist of the paw on the forearm, and the wrist lifts the head a little above the level
    (`PercussionHold.across`). The head comes down for the strike. The studio skin twists badly
    when a paw turns far on its forearm (4.4), so the hold takes the real direction with the
    smallest turn of the paw. The elbows of the timpani point down and
    a little out from the body, as a real timpanist holds them (`poleL`, `poleR`). The thick upper
    arms then go less far into the round belly near the elbows. Elbows out at the height
    of the shoulders roll the upper arms far, and the skin twists at the shoulder (4.4). The
    upper arms touch the side of the body, as the user rule of 2026-10-10 asks, so that no gap
    shows between each upper arm and the trunk from the back. The kettles leave a
    gap at the front of the player for the trunk (`TIMPANI.front`, 4.6). The other holds keep the
    top of each grip up (`PercussionHold.top`).
  - The badger mesh has short arms (0.27 m from the shoulder joint to the palm) and a round belly,
    so its instruments stand nearer than for the parametric badger (4.6), and its upper arms touch
    the side of the body. The holds follow real players
    (`docs/reference/percussion-technique.md` 5 to 9, `docs/decisions/2026-10-20-mesh-badger.md`):
    - The bass drum player stands behind the drum, and the beater strikes below the middle of the
      head, off the middle, as a real player strikes. Between strikes, the beater keeps the angle
      of no twist of the paw on the forearm (`across`). The paw holds the beater over the drum also
      at rest (`ready`), so that the beater does not sweep through the body in the lift.
    - The snare drum stands at the height of the wrists, near enough for the short arms. The
      sticks leave the front of the fists, along the thumbs (`SNARE_DRUM.malletTilt`), and point
      from homes out from the shoulders, so that they make a V at a strike and are almost level,
      as in the matched grip of a real player. Between strikes, each stick keeps its strike
      direction, and the wrist lifts the tip over the head (`MalletAcross.pitch`), so that the
      tip stays over its spot, as with a real player. A turn of the stick across the forearm
      swung the tips out over the rim (`docs/decisions/2026-10-25-percussion-tips.md`).
    - The small percussion player holds the triangle up by its clip at the height of the mouth, as
      near to the eye level of a real player as the short arm reaches, with a turn of the paw that
      bends it little on the forearm (`PERCUSSION_PLACES.triangleHand`). The clip lies in the palm
      under the curled fingers and leaves the heel of the paw, and the triangle hangs from it in a
      loop of cord, as a real player holds it (`TRIANGLE_CLIP`). It keeps the triangle up
      also at rest (`ready`). The beater leaves the front of the right fist and strikes the
      triangle, or the tambourine on its stand at the front right, within the reach of the arm.
    - The short arms cannot hold hand cymbals of a real size out of the round body, at any crash
      place in reach or tilt of the plates. So the badger plays a suspended cymbal on a stand in
      front of it, as an orchestra plays a part "with mallet" (`SpeciesParams.cymbalForm`). The
      yarn mallets take the grip of the snare sticks, and the paws strike in turn near the edge,
      opposite each other, as a real suspended cymbal roll (`SUSPENDED_CYMBAL_HOLD`,
      `docs/decisions/2026-10-20-badger-cymbals.md`). Between strikes, each mallet keeps its
      strike direction, and the wrist lifts the head over its spot near the edge, as with the
      snare sticks.
    - The xylophone mallets take the grip of the snare sticks, as a real player holds them. The
      badger moves its body from side to side behind the notes, as a real player does, with the
      feet in place (`PercussionHold.side`, `pose/side-move.ts`). The body moves toward the mean
      side place of the notes in a time before each note, so near notes give a mean place, and
      the pose stays a function of the score and the time. The spine leans toward the notes. A
      side move of the hips (`SideMove.hips`) keeps the feet on the floor: each leg reaches its
      bind ankle, and the hips drop so that no leg is longer than in the bind pose. The short
      legs of the badger tilt far with a small move of the hips, and the foot skin then follows
      the shin into the floor, so its hips keep their place, and the spine takes the whole move.
      The neck and the head turn back by the side lean, and
      the look to the side turns the head around the vertical of the world over the leaned spine,
      so that the eyes stay level, as a real player looks at the bars. The spine also leans forward over the bars while the
      badger plays (`PercussionHold.lean`), because the short arms do not reach the bars from an
      upright body. The center of mass stays over the soles. The short arms reach the bars only in
      a band about 0.12 m deep: nearer bars put the paws into the belly, and the arms do not
      reach farther bars. So the bars are smaller than real bars, and stand near the badger
      (4.6). A mallet strikes a sharp bar near its edge on the side of the player, as a real
      player does.
- Piano: the hands move to the key position. The left hand plays low notes and the right hand
  plays high notes.
- **Piano and harp in detail** (`pose/hand-notes.ts`, `pose/hands.ts`):
  - The notes that start within 50 ms of each other form a chord. A chord wider than one octave
    splits at its largest interval that keeps each hand in its reach. A narrower chord goes to the
    nearer hand, so that a melody stays in one hand. A chord past the reach of a hand (`reach` of
    `HANDS_HOLDS`) goes to the other hand. The piano keys do not move, because they are not
    separate meshes.
  - The paws of the polar bear are wide and point in along the forearms, so the middles of the
    keys of the two paws stay at least two octaves apart (`apart` of `HANDS_HOLDS`). A chord
    wider than one octave splits only when its two parts are that far apart, and else one paw
    plays it. When a paw plays nearer to the other paw, the other paw moves out of its way with no
    sound, and both moves take the same time (`splitHands()`). Nearer paws went into each other.
  - The pianist sits as a professional pianist (`docs/reference/piano-technique.md`): the trunk
    upright with a small lean, the forearms about level with the keys, the elbows bent a little
    more than a right angle, and the shoulders low. The long trunk of the polar bear sits on short legs, so the piano is
    larger than a real piano (`PIANO_SCALE`), and the keys reach its forearms. The keys stand as
    near as the forearms allow over the round belly (`PIANO_FRONT_H`). The trunk leans to the side
    toward the keys of the two paws, as a pianist leans toward the far keys (`sideLeanOf()`,
    `docs/decisions/2026-10-24-pianist-pose.md`).
  - The piano palm faces down in front of the keys (`pianoKeyFront()`), because the paw of the
    polar bear is longer than a white key. The curled claws lie on the key tops at each strike.
  - In the play, the right heel of the pianist stays on the floor, and the ball of the foot lies
    on the damper pedal, as a pianist pedals (`docs/reference/piano-technique.md`). The foot turns
    up around the heel, and a two-bone solve of the thigh and the shin brings the ankle there
    (`posePedalFoot()` of `pose/pedal.ts`). A wide paw keeps its inner edge right of the sostenuto
    pedal. The left foot stays flat on the floor near the soft pedal. In the lift, the foot first
    turns up in place, then moves onto the pedal, so that the sole does not go through its edge.
  - The sustain pedal of the score (CC 64, `sustainPedals()` of `score/pedal.ts`) presses the
    damper pedal, and the ball of the foot follows it. The synth reads the same events, so the
    sound and the foot agree. Each change ramps the pedal in a short time from the level that it
    finds, so the level is a pure function of the score and the song time (`pedalLevelAt()`). A
    score with no pedal data keeps the pedal up, with the foot resting on it.
  - The harp palm faces the strings at the string of its note and pulls away to pluck. The left
    palm lies above the middle of the bass strings and its fingers point up along the strings
    (`aimL` of `HANDS_HOLDS`), so that the short left arm of the deer reaches the far strings with
    the paw in line with the forearm (`docs/decisions/2026-10-21-mesh-deer.md`). A harpist holds
    both hands at almost one level (`docs/reference/harp-technique.md`, section 3), so this is an
    adjustment to the short arms. The elbows point out to the sides, as a harpist raises the
    elbows, so that the left upper arm keeps off the chest when it reaches across to the strings.
    The spine leans only a little forward, as a harpist sits erect, so that the muzzle keeps off
    the neck of the leaned harp (`docs/decisions/2026-10-25-harp-lean.md`).
  - In the rest pose, the pianist rests its paws on its thighs with the palms down, and its
    elbows bend by its sides, as a seated pianist rests the hands on the thighs. The wrists go up
    over the case between the rest and the play (`restArc`). The top of the
    lap of a studio body is the top of its hips, its belly, and its legs (`pose/lap.ts`). The harp
    player rests each hand on a string, a little away from it, because a left palm on the thigh
    twisted the short left arm of the deer in the lift.
- Choir: the beak or mouth opens with each note, the singer breathes in before a phrase, and it
  sways.
- **Choir in detail** (`pose/choir-notes.ts`, `pose/choir.ts`):
  - A singer sings one note at a time. The `jaw` bone opens the lower beak for each note and
    closes it to half between two notes, so that each note shows (`CHOIR_MOTION`). The neck and
    the head lift a little with the jaw, because the beak is a few pixels long in the default
    view. The penguin mesh opens its split beak on its jaw bone (4.4, 4.7), as wide as the singing
    penguins of `orchestra-side.png` (`docs/decisions/2026-10-21-penguin-beak.md`).
  - In a phrase, the chest turns from side to side every 2 beats, and neighbor voices turn to
    opposite sides, so that the choir does not move as one block.
  - The flippers hold the folder close, with the upper arms at the sides, as in the reference
    images (`CHOIR_HOLD`, user decision of 2026-10-10). The flippers of the penguin mesh keep
    their length, so the folder hangs within their reach in front of the chest (`CHOIR_FOLDER`,
    4.6), and each palm holds a lower corner of the folder.
- The motion starts 100 to 400 ms before the note, by the action, because the app reads the full
  file first. Each note event happens at the note start, and the motion before it ends there.
- Each player has a small seeded offset in timing (up to 20 ms) and in amplitude
  (`PLAYER_OFFSETS` of `pose/plan.ts`), so that players in unison do not move as copies.
- The loudness for the size of a gesture is the velocity, multiplied by CC 7 (volume) and CC 11
  (expression), each as a part of 127, at the start of the note, with the defaults of General
  MIDI. `pose/` reads the controllers from `Score.synthEvents`, so the sound and the gestures use
  the same events.
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
  | 4/x | 1 if the beat tempo is 336 or more, 2 (alla breve) if it is 168 or more, else 4 |
  | 6/8 | 2 (dotted beats) if the eighth tempo is 150 or more, else 6 |
  | 9/8, 12/8 | 1 or 2 if the dotted tempo is 168 or more, else 3 or 4 (dotted beats) |
  | 6/4 | 2 if the quarter tempo is 150 or more, else 6 |
  | all others, for example 5/4 and 7/8 | `generic`: one down-up motion for each beat unit, larger on the downbeat |

- A conductor beats a fast 4/4 in 2, and a faster one in 1, so that the baton does not beat
  more than about 168 times in a minute (`ONE_BEAT_TEMPO` of `score/beats.ts`). A file can
  notate a slow song at two or four times its felt beat, and this rule then gives a conducted beat
  of a natural tempo (`docs/research/2026-10-21-beat-fold.md`).
- The first bar starts at tick 0. Each time signature event starts a new bar, also inside a bar.
  The tempo at the downbeat of a bar selects its pattern. The tempo is rounded to 0.01 BPM
  before the comparison, because a file stores whole microseconds: 168 BPM reads as 167.99997.
- The beats end before the last note-off (`Score.durationSec`). A file with no time signature or
  tempo events takes the MIDI defaults: 4/4 at 120 BPM.
- The size of the gestures follows the loudness of the notes in each beat (`CONDUCTOR_MOTION` of
  `pose/conductor-notes.ts`).
- The conductor cues each section entry, as a real conductor does (user decision of 2026-10-05),
  and between the cues the left hand shows the dynamics and the held chords ("Cues" and "Left
  hand between the cues" below).
- **Conductor in detail** (`pose/conductor-notes.ts`, `pose/cues.ts`, `pose/conductor.ts`):
  - At each beat time, the tip of the baton is at the point of the beat in the beat plane, as
    the conductor sees it (`BEAT_PATTERNS`). Beat 1 comes down at the bottom, the middle beats go
    inward and then outward, and the last beat goes up. Between two beats, the tip rises in an arc
    and comes down with its full speed, so that each beat is the low point of a bounce.
  - **Count-in.** The user decided that a click on play does not start the music at once: the
    conductor first signals the players to get ready. The transport starts at a song time before
    the start point (6.5), so the count-in is a set of poses at those song times, and the pose
    keeps no state (`COUNT_IN` of `pose/count-in.ts`). From the song start, it is a ready pause,
    in which the players lift their instruments (5.2), then one preparatory beat: the first
    conducted beat of the score, with a limit, as a conductor gives a slow beat in two. After a
    pause in the song, it is one preparatory beat at the pause point (`resumeLift()`).
  - **Ready gesture.** In the ready pause, both paws rise a little above the chin, as in
    `bear-views.png`. In the preparatory beat, the tip comes down into beat 1 at the song time 0,
    where the first note sounds (6.5).
  - **Hold of the baton.** The places of the hands are in head heights `H` of the bear (4.4), in
    `CONDUCTOR_HOLD` and `LEFT_HAND_PLACES` of `pose/conductor.ts`
    (`docs/research/2026-10-22-studio-bears.md`). The baton lies along the index finger with its
    grip in the palm, as a conductor holds it (4.6), and the palm faces the floor. The baton
    points forward, a little up, and in, and turns around `batonPivot` behind the wrist, so the
    arm beats with the baton. At beat 1, the wrist is a little below the chin and out beside the
    head from behind, as in `mockup.png` and in views 02 and 05 of `scene.png`.
  - The beat plane turns with a part of a turn of the upper body, so that the long muzzle keeps
    off the right paw. In the lift and the lowering, the baton turns out to the right, so that it
    does not sweep through the desk (`pose/test-conductor-clearance.ts`). The paw twists on its
    forearm by at most `CONDUCTOR_HOLD.liftTwist` for this turn, because the full turn twisted it
    past 180° (5.2).
  - **Bow at the song end.** At the pause at the song end (6.5), the bear bows to the orchestra
    while the instruments are still up. A hanging arm follows half of the bend (`HANG_FOLLOW`),
    so that the paws touch neither the belly nor the stand. The bow is a function of the wall
    time since the pause, so it keeps no state. The bear does not turn to the audience, because
    the transport does not tell a pause at the end from a later play.
- **Chamber group.** A chamber group of 4.2 has no conductor (user decision of 2026-10-06), so
  its players give the count-in, as a string quartet does, and it has no cues and no bow.
  - The leader is the principal player of the first seat of the first section of this list: the
    violins, the piano, the flutes, the oboes, the clarinets, the trumpets, and the horns, else
    of the first seat (`leaderOf()` of `pose/plan.ts`).
  - In the preparatory beat, the leader breathes in with a small lean back, then nods forward
    with its full speed on the downbeat (`leaderNodAt()` and `LEADER_NOD` of `pose/count-in.ts`).
    A pianist, a harpist, a percussion player, and a singer also nod the head. A string player
    under the chin and a wind player do not nod the head. The leader of a cello or a contrabass
    does not lean, because the head came too near the neck of the instrument.
  - The nod follows the playing pose of the leader (5.2, 5.5), so a muted leader does not nod.
- **Cues** (`pose/cues.ts`). The user asked for "a more realistic conductor that cues each
  section before it plays". `findCues()` calculates the cues of a score one time, and
  `cueStateAt()` gives the motion at a song time (`CUE_RULES`, `CUE_MOTION`). The diagram shows
  one cue of the left hand that lands at 0 s, with a beat of 0.5 s.

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

  - **Entries and choice.** An entry is the first note of a seat, or a note after a rest of about
    one bar or more. The entries of a moment form groups by motion family (5.1). In dense music,
    the moment gets no cue. Else the group with the highest priority (its loudness, its exposure,
    a first entry, a tutti) gets the cue.
  - **Gesture.** The first entries of the song land on the downbeat of the count-in. A strong
    entry, or an entry far to the right, gets the baton with a higher arc when it starts on a
    beat. Each other entry gets the left hand.
  - **Direction and times.** The head and the upper body turn to the group one beat before the
    entry, within limits, and stay on it after the landing. The left hand comes down to the cue
    point along the direction of the section, so that it lands at its full speed at the entry. It
    points no further right than the front of the upper body, so that the forearm does not cross
    the head, and far enough left to show beside the head from behind.
  - Cues that overlap mix by their weights, with no jump. A cue to silent seats does not show
    (5.5). The cues follow the song time and the weight of the playing pose, so they keep no
    state, and the rest pose has no turn.
- **Left hand between the cues** (`pose/conductor-left.ts`, `pose/conductor.ts`). A real
  conductor uses the left hand for the dynamics, for held notes, and for a mirror of the beat,
  and in `scene.png` (02, 05) both arms of the bear are up. The rules come from the score, so the
  pose keeps no state. `buildLeftHandTrack()` calculates the data one time, `leftHandAt()` gives
  the weights at a song time, and `LEFT_HAND_RULES` holds the values.

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

  - **Level and trend.** The level of a beat grows with the count and the loudness of its notes,
    relative to the song. The mirror grows with a high level, the swell with a rising level, and
    the fade with a falling level, each at a limited speed.
  - **Held chord.** A sound with no new note for a long time is a held chord: the open palm holds
    it, and when the sound stops before the next notes, the fingers close to cut it off.
  - **Places** (`LEFT_HAND_PLACES`). The places are out at the left of the head, and all but the
    fade are above the shoulder, so that from behind the hand shows beside the head, as in
    `mockup.png`.

    | Place | Wrist and fingers | Shows |
    |---|---|---|
    | `quiet` | out beside the head and above the shoulder, with the fingers forward and a loose curl | the hand raised and ready beside the head, as in `mockup.png` |
    | `mirror` | out beside the head and above the shoulder at beat 1, with the fingers forward | the beat in a loud passage |
    | `swell` | high above the shoulder, with the fingers forward and up and the hand open | a crescendo: the open hand rises |
    | `fade` | out at the side at the height of the shoulder, with the fingers forward and down and the hand open | a diminuendo: the palm presses down at the side |
    | `hold` | above the shoulder and furthest forward, with the fingers forward and up and the hand open | the open palm holds the chord |

  - **Mirror.** The wrist moves by a part of the motion of the tip of the baton, mirrored from the
    right to the left (`MIRROR_SCALE`).
  - The places turn with the upper body to the left and stay in a turn to the right, because a
    turn to the right brought the fade into the desk. A cue and the ready gesture mix in after the
    places. In the rest pose and in the bow, the left arm hangs.

## 5.5 Silent seats

A muted seat, or a seat that a solo makes silent, rests: its instruments go down, and only the
idle motion continues. Thus what the user sees agrees with what the user hears. Each player
lowers its instruments with its seeded lowering after the change, and lifts them with its seeded
lift when the seat sounds again, with no hold and no scale (5.2). The pose function reads the
change time from `SeatAudibility`. As in 5.2, a change starts from the height of each player at
the change, from `before`, which `changeAudibility()` of `app/transport.ts` sets. A seat with no
change sounds.

## 5.6 Camera shots

The automatic camera of 2.5 films the piece as a concert film does. The pure module `shots/`
holds the rules and the values (`SHOT_TIMES`, `CUT_BONUS`, `CHOICE_WEIGHTS`, `SHOT_KEYS`,
`KEY_SEARCH`, and `BLEND_RULES` of `shots/prepare.ts`, `CLEARANCE` of `shots/clearance.ts`, and
`FOREGROUND` of `shots/foreground.ts`).
[`research/cinematic-camera.md`](../research/cinematic-camera.md) gives the practice of concert
films with sources, the prototype, and its faults.

The camera is a pure function of the song time, as the pose is (5.1). `prepareShots()` makes a
shot plan one time for each score, and `cameraAt()` gives the camera of each frame. Thus a seek,
a pause, and a speed change are always correct, and the same piece gives the same film.
`traceShots()` gives the choice at each cut as plain data: the candidates that each rule drops,
and each tested camera with the test that refuses it. `pnpm shot-trace` prints it.

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
the factor of the beam opacity, and the weights of the shot light) for a `CameraView` (the
aspect, and `still` for reduced motion).

**Camera key.** Each shot keeps its camera on a sphere around its target, as the default view of
4.5 does: `position = target + d × (sin az × cos el, sin el, cos az × cos el)`. The distance `d`
is the fit distance of the subject sphere at the current aspect, times the zoom. The fit distance
is `radius / sin(min(v, h)) × FIT_MARGIN`, where `v` is half the vertical field of view and
`h = atan(tan(v) × aspect)`. A phone in portrait thus gets a camera farther away. A wide shot and
a high shot use the default distance of 4.5.

**Kinds.** Each decision of the plan has its own seeded numbers, from a hash of the seed, the time
of the cut, and the name of the decision. Thus a change of one search does not change the other
decisions, and a small move of the players keeps most of the plan.

| Kind | Target | Camera | Move in the shot |
|---|---|---|---|
| wide | the target of the default view (4.5) | the default view, or a variant from a side or lower (`WIDE_VARIANTS`) | a push-in, or an arc for the variants from the sides |
| high | a little behind the stage center | high, near the front | an arc to the middle and past it, and a rise |
| conductor, close | the shoulders of the bear | low, behind the bear | a push-in |
| conductor, over the shoulder | in front of the head of the bear, toward the players who play | behind the bear | a push-in |
| side | above the players of the seats of one side | low, from the front of that side | an arc and a push-in |
| section | above the players of the group | low, from the front of the group | an arc and a push-in |
| solo | above the principal player of the seat | low, from the front of the player to one side | a push-in and an arc |

- Each wide shot follows the landscape rule and the portrait rule of 4.5, and the first one is
  the default view. Its push-in stops before the beam fade of Free mode (4.5).
- The conductor shots take turns between two framings from the audience side. The first one is
  view 02 of `scene.png`: over the shoulder of the bear at the orchestra, with the bear at the
  bottom middle of the frame. The other one is view 05: the back, the head, and the raised arms of
  the bear, close, with the players out of focus behind it (4.5). The reference images show the
  conductor only from behind (1).
- The side views are views 03 and 04 of `scene.png`: one side of the stage from the front of that
  side and low, with 2 or more seats of the side that play or enter. The camera stays near the
  front of the side, so it never looks along the side from behind.
- The front of a group is the mean of the facings of its players. The front of a piano subject
  turns to the right of the pianist, because a camera in front looked into the black case. The
  section and solo cameras start low, as the close shots of `scene.png` (06 to 08), and rise for a
  back row.
- The section groups (`SECTION_GROUPS` of `shots/subjects.ts`): violins, low strings, woodwinds,
  brass, percussion, harp, piano, and choir. A group holds its active seats and the seats that
  enter at the cut. When its sphere is too large, it keeps the most active seats, so that a
  section shot does not look like a high wide shot.
- A part shot is a section shot of the part of a choir seat that sings the tune, for example the
  sopranos. Its group is `choir`, so rules 1 and 2 keep it apart from a shot of the full choir.
- Each move blends the keys with a smoothstep over the full shot, so the move starts and ends at
  rest. The move turns around the target, so it never cuts through the subject.

**Cut points.**

- A cut falls on a downbeat, or on the middle beat of a bar with an even number of beats, in song
  seconds. The planner scores each such beat by the distance to a seeded wanted length, with a
  bonus for a phrase line and a penalty for a repeat of the last length, so that the cuts do not
  fall on a grid (`CUT_BONUS`).
- The user asked that the camera films the player who just started to play. A cut near an entry
  (`ENTRY_REACH`) gets the largest bonus, and the first entry in reach ends the shot.
- The first shot is a wide shot of the default view from `-Infinity` to the first cut, so the
  first screen, the count-in, and the first phrase show one view with no cut, as the establishing
  shot of a concert film. The last shot is a wide shot of the default view that pulls out until
  the song end and holds after it. The end of each shot leaves room for the shots that rule 3
  needs before the last shot.

**Choice of the next shot.** The planner reads the music of a window after the cut from the
`Score` (`MUSIC_RULES` of `shots/music.ts`):

- An active seat covers a part of the window with its notes. The share of a group is its
  activity, from the coverage and the loudness (5.3), divided by the activity of all seats.
- An entry is the first note of a seat after a rest of at least two full bars and 4 s, with a
  passage after it (`findEntries()` of `shots/entries.ts`). A seat that rests at the cut and
  enters later in the window is no subject of the cut: its entry gets its own cut. The cues of the
  conductor (5.4) have their own rule, so a change of the cues does not change the shots.
- A tutti: most of the seats with players are active and loud.
- The lead: an active pitched seat carries the lead when it holds the top line in half the window
  or more, or when it is clearly louder than the others. A concert film follows the melody. A
  choir seat sings the tune when its top voice has the top line or that key an octave or more
  lower, because the flutes and the violins can double the sopranos. Its players on the top voice
  are the part of the tune (divisi, 3.8).
- The first voice: at the first cut, each seat that started in the opening counts as an entry
  (`score/test-first-voice.ts`).

Each candidate gets a score (`CHOICE_WEIGHTS`):

| Candidate | Score rises with | Only with |
|---|---|---|
| wide | a tutti, and a due wide view | |
| high | a tutti, many active seats, and a due wide view | 3 or more seats |
| conductor | many active seats | a conductor and 3 or more seats |
| side view of a side | the share of the side, an entry at the cut, and the piano | 3 or more seats, and 2 or more seats of the side in the window |
| section of a group | the share, an entry at the cut, and the lead. It falls in a tutti | |
| part of a choir seat that sings the tune | the score of a section shot of that seat alone | 3 or more seats, and fewer players in the part than in the seat |
| solo of a seat (its player 0) | the share, few active seats, its own entry, the lead, and the piano and the harp. It falls in a tutti | |

Before the scores, each candidate has a rank: first a wide or a high shot that cannot wait, so
that a wide view comes at least every 60 s, then the solo of a soloist that enters at the cut,
then each other candidate with an entering seat, then the others. Thus the entering seat wins
the cut over a tutti and over a wide view that is only due. Then these rules apply, in this
order:

1. No repeat: the kind and the subject of the previous shot get no score.
2. No same group: a section or solo shot of the group of the previous shot gets no score, so the
   film does not show four woodwind shots in a row.
3. Spacing (`SHOT_TIMES`):
   - 3a. A wide or high shot needs at least three other shots since the last one, and room for
     three shots before the last shot.
   - 3b. A conductor shot needs at least five other shots since the last one, as the share of S1
     in the report.
   - 3c. A side view needs at least three other shots since the last one.
4. Variety: a subject of the last shots, and each earlier use of a subject, lose score.
5. Seeded jitter: each score gets a small seeded value.
6. Clear camera: the best candidate with a clear camera wins. With no clear camera, the previous
   shot holds within its longest length, else a conductor shot fills the time, also against rule
   3b, because the bear conducts the rest, else a wide shot.

**Chamber groups and small groups.** The user decided that a chamber group (4.2) has no conductor,
and that a group with fewer than 3 seats gets no conductor shot, because the back of the bear
gave the weakest frames of a piano solo.

- A score with fewer than 3 seats with players (`SMALL_GROUP_SEATS`) gets only the solo shots,
  a two-shot of all players (the group `ensemble`, `SUBJECT_SIZES.twoShotMargin`), and the wide
  shots. With one seat, rules 1 and 2 do not stop a solo shot of that seat, so a piano solo shows
  the pianist from several sides.

Mute and solo do not change the plan. The plan is made one time for each score, and a solo would
need a new plan (choice C of the report).

**Clearance.** The camera must never stand inside a player, and the subject must not hide behind
an item. The obstacles are the boxes of `layoutObstacles()`: the footprints of 4.5, with one box
for the parts of each bone in each height band. The planner tests many points along each move
and each sight line, in a desktop view (aspect 1.6) and in a phone view in portrait (aspect
0.46), because the plan is the same for all views.

- The line of sight from 0.3 m outside the target to the camera crosses no box, except the boxes
  within 0.4 m of the target (the subject). A far part of a large instrument, such as the piano
  case, still counts. A solo or a conductor shot also has sight points: the head, which no box
  hides, and the palms and the instrument, of which at most one is hidden.
- No head of another player stands in the foreground of a close shot (`FOREGROUND`). A near head
  counts when its radius on the screen is more than 0.24 of half the frame height, or of the
  geometric mean of the half sides of a portrait frame, because the area of the frame sets how
  large a head looks. A choir shot skips the heads below the chests of the singers on the screen,
  because they cover no face and no folder.
- No other object nearer than 0.9 of the depth of the focus covers more than 15% of the frame,
  measured on a grid of 20 × 20 cells. The body of the bear stays out of a solo shot of the
  soloist.
- Each close camera stays nearer to the stage center than `CLOSE_DISTANCE_SHARE` of the default
  distance, so that a change to Free mode keeps the beam of the shot (4.5). Each camera keeps
  0.6 m from each box and 1.0 m from the podium and the conductor, whose arms reach out of the
  footprint, and stays 0.6 m above the stage top.
- The camera stays inside or outside the cone of the visible beam (4.5) for a full shot, because
  the beam draws only its outer faces and a crossing darkens the image at once
  (`models/beam.ts`). A cut or a blend that changes the side is a hard cut.
- The search tries the wanted azimuth, then steps to each side and up (`KEY_SEARCH`). The camera
  stays within 75° of the front of the subject (30° for a side view), so it never shows the back
  of a player.
- The elevation bands are up to 30°, 30° to 40°, and 40° to 50°, higher for the piano. Each
  candidate first gets the lowest band, so a lower camera wins over a higher camera of a better
  candidate. A candidate with an entering seat, or near the best score, also gets the band up to
  40° and a full search of the grid, so that an entry or the lead keeps its shot. Where no player
  blocks a camera, at least 60% of the section and solo cameras are at 30° or lower, and at most
  15% above 40° (`shots/prepare.test.ts`).
- The seeded offset of the wanted azimuth is a multiple of the grid step, so the planner keeps the
  test result of each camera of each subject for the later cuts.
- A wide or a high shot needs no test. Each player stays in its frame, and in a landscape view the
  4 top corners of the stage too. With the drawer open (2.8), each player of the opening stays in
  the free area left of the drawer.

**Jump cuts.** Two neighbor shots differ by at least 30° in the view direction, or by a factor of
1.5 in the size of the subject (`JUMP_CUT`). The two conductor framings differ in size by more than
1.5 times.

**No repeat of a framing.** The camera of a side, section, or solo shot stays at least 20° in
azimuth from the camera of the last shot of the same subject. A part shot of a choir seat has the
section group of its seat, `choir`.

**Transitions.** A hard cut is the default. A blend is a short camera move over one beat after the
downbeat, in place of the dissolve of a concert film, because a true dissolve needs two renders
for each frame. A blend applies only between two conductor, section, or solo shots in a slow or
quiet window, when the cameras are near each other and the path between them passes the
clearance and stays on one side of the beam (`BLEND_RULES`). With reduced motion, each cut is
hard.

**Frame.** `cameraAt()` marks a close shot with `close`, and the frame of a close shot fits into
the free area above the bar and left of the open drawer (4.5). The planner tests the full frame.

**Beam.** The visible beam (4.5) fades in the close shots, because a close camera saw the
additive beam over the full image. The factor comes from the kind of the shot, so the beam never
changes in a shot (`shots/beam-opacity.ts`). Free mode reads it from the camera distance (2.5).

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

**Shot light.** On a film set, the crew lights each setup again. A close shot gets its own soft
key, a kicker, a little more exposure, and a stronger vignette (4.5), and a solo shot turns its
key into a follow-spot. The weights come from the kind of the shot, as the factor of the beam,
and a blend blends them (`SHOT_LIGHT` and `SHOT_SPOT` of `shots/shot-light.ts`). `shotRig()`
places the lamps from the camera alone, so a seek gives the light of the shot at once. Free mode
reads the weight from the camera distance (2.5).

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

**Entry statistics.** `shots/entry-cuts.test.ts` counts the entry events (the first note of one or
more seats after a rest of two full bars and 4 s, with a passage after it), and needs a cut to an
entering seat at 50% of them. The stability tests of `shots/prepare.test.ts` keep most of the
shots and the cuts when each player moves by 2 cm.
