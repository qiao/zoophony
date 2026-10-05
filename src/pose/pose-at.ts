import { DEG, axisAngle, multiply } from '../models/math.ts';
import { boneIndex } from '../models/rig.ts';
import { lastAtOrBefore } from './blend.ts';
import { poseBowed } from './bowed.ts';
import { createIdleState, idleAt } from './idle.ts';
import { poseChoir } from './choir.ts';
import { CHOIR_MOTION, choirStateAt, createChoirState } from './choir-notes.ts';
import type { ChoirState } from './choir-notes.ts';
import { boneRotation, BIND_ROTATIONS, chainFrames, setBoneRotation } from './frames.ts';
import { createHandState, handStateAt } from './hand-notes.ts';
import { poseHands } from './hands.ts';
import type { HandsState } from './hands.ts';
import { gestureSize } from './loudness.ts';
import { activityAt } from './passages.ts';
import type { IdleState } from './idle.ts';
import type { PlayerPlan, PosePlan } from './plan.ts';
import { seatWeight, smoothstep, transportWeight } from './rest.ts';
import { bowStateAt, createBowState } from './strokes.ts';
import type { BowState } from './strokes.ts';
import { createWindState, windStateAt } from './wind-notes.ts';
import type { WindState } from './wind-notes.ts';
import { WIND_BODY, poseWind } from './winds.ts';
import type { AnimalPose, ScenePose, SeatAudibility, Transport } from './types.ts';

/** An animal pose that `poseAt()` writes in place, so that a frame makes no new pose buffers. */
export interface WritablePose extends AnimalPose {
  readonly rotations: Float32Array;
  rootOffset: [number, number, number];
  slideOffset: [number, number, number];
  blink: number;
}

/** The poses of a scene that `poseAt()` writes in place. */
export interface ScenePoseBuffer extends ScenePose {
  readonly players: readonly WritablePose[];
  readonly conductor: WritablePose;
}

/** The angles of the body layer (design 5.1). */
export const BODY_MOTION = {
  /** The turn of the spine and of the chest at the top of a breath. */
  breathSpine: 0.6 * DEG,
  breathChest: 1 * DEG,
  /** The largest side sway of the spine with the beat, for a gesture size of 1. */
  sway: 2 * DEG,
  /** The part of a look that the neck turns. The head turns the rest. */
  lookNeck: 0.4,
  /** The turn of each ear at the top of a twitch. */
  ear: 12 * DEG,
  /** The turns of the two tail bones at the end of a sway. */
  tail1: 8 * DEG,
  tail2: 12 * DEG,
} as const;

const BONES = {
  spine: boneIndex('spine'),
  chest: boneIndex('chest'),
  neck: boneIndex('neck'),
  head: boneIndex('head'),
  earL: boneIndex('earL'),
  earR: boneIndex('earR'),
  tail1: boneIndex('tail1'),
  tail2: boneIndex('tail2'),
  jaw: boneIndex('jaw'),
} as const;

/**
 * Makes the pose of one animal in the bind pose.
 *
 * @returns The pose.
 */
function createPose(): WritablePose {
  return {
    rotations: Float32Array.from(BIND_ROTATIONS),
    rootOffset: [0, 0, 0],
    slideOffset: [0, 0, 0],
    blink: 0,
  };
}

/**
 * Makes the poses of a scene for {@link poseAt}, in the bind pose.
 *
 * @param plan The plan of the score.
 * @returns One pose for each player and one for the conductor.
 */
export function createScenePose(plan: PosePlan): ScenePoseBuffer {
  return { players: plan.players.map(createPose), conductor: createPose() };
}

/**
 * Gives the side sway of the beat layer at a song time (design 5.1). The sway goes to one side
 * on one beat and to the other side on the next beat, with no jump at a beat. It is 0 before the
 * first beat and after the last beat.
 *
 * @param beats The times of the beats, sorted.
 * @param time The song time.
 * @param beatsPerSide The number of beats of the sway to one side. A singer sways to each side
 *   in 2 beats (design 5.3).
 * @returns The sway, from -1 to 1.
 */
export function beatSway(beats: Float64Array, time: number, beatsPerSide = 1): number {
  const b = lastAtOrBefore(beats, time);
  const start = beats[b];
  const end = beats[b + 1];
  if (start === undefined || end === undefined || end <= start) {
    return 0;
  }
  return Math.sin((Math.PI * (b + (time - start) / (end - start))) / beatsPerSide);
}

/**
 * Writes the body layer of one animal: the breath and the sway of the spine, the look at the
 * conductor, the ears, the tail, and the blink (design 5.1). The legs keep the bind pose (4.7).
 *
 * @param pose The pose to write.
 * @param player The plan of the animal.
 * @param idle The idle motion at the wall clock time.
 * @param sway The side sway of the spine, in radians.
 * @param lean The forward lean of the spine, in radians.
 * @param look The part of the idle look at the conductor that the head turns. A wind player
 *   does not turn the head from the mouthpiece while it plays.
 * @param lift The upward turn of the neck and the head, in radians.
 */
function writeBody(
  pose: WritablePose,
  player: PlayerPlan,
  idle: IdleState,
  sway: number,
  lean = 0,
  look = 1,
  lift = 0,
): void {
  const m = BODY_MOTION;
  const r = pose.rotations;
  setBoneRotation(
    r,
    BONES.spine,
    multiply(axisAngle([0, 0, 1], sway), axisAngle([1, 0, 0], -lean - idle.breath * m.breathSpine)),
  );
  setBoneRotation(r, BONES.chest, axisAngle([1, 0, 0], -idle.breath * m.breathChest));
  const yaw = player.lookYaw * idle.look * look;
  const pitch = player.lookPitch * idle.look * look + lift;
  for (const [bone, part] of [
    [BONES.neck, m.lookNeck],
    [BONES.head, 1 - m.lookNeck],
  ] as const) {
    setBoneRotation(
      r,
      bone,
      multiply(axisAngle([0, 1, 0], yaw * part), axisAngle([1, 0, 0], pitch * part)),
    );
  }
  setBoneRotation(r, BONES.earL, axisAngle([0, 0, 1], idle.ear * m.ear));
  setBoneRotation(r, BONES.earR, axisAngle([0, 0, 1], -idle.ear * m.ear));
  setBoneRotation(r, BONES.tail1, axisAngle([0, 1, 0], idle.tail * m.tail1));
  setBoneRotation(r, BONES.tail2, axisAngle([0, 1, 0], idle.tail * m.tail2));
  pose.blink = idle.blink;
}

/**
 * Gives the side sway of the spine of a player (design 5.1, the beat layer). The player sways
 * with the beat while it plays, and the gesture size follows the loudness of its passage (5.3).
 *
 * @param plan The plan of the score.
 * @param player The plan of the player.
 * @param noteTime The song time of the note layer.
 * @param weight The eased weight of the playing pose.
 * @returns The sway angle, in radians.
 */
function swayOf(plan: PosePlan, player: PlayerPlan, noteTime: number, weight: number): number {
  const activity = activityAt(player.passages, noteTime);
  if (activity.weight === 0 || weight === 0) {
    return 0;
  }
  const gesture = gestureSize(activity.loudness, player.amplitude);
  return BODY_MOTION.sway * gesture * activity.weight * weight * beatSway(plan.beats, noteTime);
}

/**
 * The states that `poseAt()` writes for each player. Each call of `poseAt()` makes them one time,
 * so that the players share them.
 */
interface FrameScratch {
  /** The idle motion of the current animal at the wall clock time. */
  readonly idle: IdleState;
  readonly bow: BowState;
  readonly wind: WindState;
  readonly hands: HandsState;
  readonly choir: ChoirState;
}

/**
 * Calculates the pose of one animal.
 *
 * @param plan The plan of the score.
 * @param player The plan of the animal.
 * @param noteTime The song time of the note layer: the song time minus the seeded offset.
 * @param weight The eased weight of the playing pose: 0 is the rest pose (design 5.2, 5.5).
 * @param scratch The states of the frame, with the idle motion of the animal.
 * @param pose The pose to write.
 */
function poseAnimal(
  plan: PosePlan,
  player: PlayerPlan,
  noteTime: number,
  weight: number,
  scratch: FrameScratch,
  pose: WritablePose,
): void {
  pose.rotations.set(BIND_ROTATIONS);
  const { idle } = scratch;
  const note = player.note;
  switch (note.family) {
    case 'bowed': {
      const { bow } = scratch;
      writeBody(
        pose,
        player,
        idle,
        swayOf(plan, player, noteTime, weight),
        note.rig.hold.lean * weight,
      );
      const [root, , , chest] = chainFrames(player.skeleton, pose.rotations, 4);
      if (root && chest) {
        bowStateAt(note.strokes, note.starts, noteTime, bow);
        poseBowed(note.rig, { root, chest }, bow, weight, pose.rotations);
      }
      break;
    }
    case 'woodwind':
    case 'brass': {
      const { wind } = scratch;
      windStateAt(note.track, noteTime, wind);
      const breath = wind.breath * WIND_BODY.breath * player.amplitude * weight;
      // The head lifts off the mouthpiece in the rest pose, and keeps still while it plays.
      writeBody(
        pose,
        player,
        idle,
        swayOf(plan, player, noteTime, weight),
        -breath,
        1 - weight,
        WIND_BODY.headLift * (1 - weight),
      );
      const [root, , , chest] = chainFrames(player.skeleton, pose.rotations, 4);
      if (root && chest) {
        poseWind(note.rig, { root, chest }, wind, weight, pose);
      }
      break;
    }
    case 'keyboard':
    case 'harp': {
      const { hands } = scratch;
      handStateAt(note.left, noteTime, hands.left);
      handStateAt(note.right, noteTime, hands.right);
      writeBody(
        pose,
        player,
        idle,
        swayOf(plan, player, noteTime, weight),
        note.rig.hold.lean * weight,
      );
      const [root, , , chest] = chainFrames(player.skeleton, pose.rotations, 4);
      if (root && chest) {
        poseHands(note.rig, { root, chest }, hands, weight, pose.rotations);
      }
      break;
    }
    case 'choir': {
      const { choir } = scratch;
      choirStateAt(note.track, noteTime, choir);
      writeBody(pose, player, idle, swayOf(plan, player, noteTime, weight));
      // The chest turns from side to side with the phrase, and the jaw opens with the notes.
      const twist =
        CHOIR_MOTION.sway *
        choir.sway *
        weight *
        beatSway(plan.beats, noteTime, CHOIR_MOTION.swayBeats);
      const r = pose.rotations;
      setBoneRotation(
        r,
        BONES.chest,
        multiply(axisAngle([0, 1, 0], twist), boneRotation(r, BONES.chest)),
      );
      setBoneRotation(r, BONES.jaw, axisAngle([1, 0, 0], -choir.jaw * weight));
      const [root, , , chest] = chainFrames(player.skeleton, r, 4);
      if (root && chest) {
        poseChoir(note.rig, { root, chest }, r);
      }
      break;
    }
    case 'percussion':
    case 'conductor':
      // The note layer of these families comes in later tasks of step 5. Until then, they keep
      // the rest pose with the idle layer and the beat layer.
      writeBody(pose, player, idle, swayOf(plan, player, noteTime, weight));
      break;
    default: {
      const unhandled: never = note;
      throw new Error(`The note layer ${JSON.stringify(unhandled)} has no known motion family.`);
    }
  }
}

/**
 * Calculates the poses of all players and of the conductor for one frame (design 5.1). The
 * pose is a pure function of the plan of the score, the song time, the wall clock time, the
 * transport, and the audibility of the seats. Thus seek, pause, speed, mute, and solo changes
 * are always correct.
 *
 * The pose has three layers. The note layer and the beat layer follow the song time, with the
 * seeded offset of each player. The idle layer follows the wall clock time. The transport and
 * the audibility of the seat lift or lower the instruments (5.2, 5.5).
 *
 * @param plan The plan of the score, from `preparePoses()`.
 * @param songTime The song time, in seconds.
 * @param wallTime The wall clock time, in seconds.
 * @param transport The play state.
 * @param audibility One entry for each seat of the score. A missing entry sounds.
 * @param out The poses to write, from {@link createScenePose}. A new buffer by default.
 * @returns `out`, with the poses of the frame.
 */
export function poseAt(
  plan: PosePlan,
  songTime: number,
  wallTime: number,
  transport: Transport,
  audibility: readonly SeatAudibility[],
  out: ScenePoseBuffer = createScenePose(plan),
): ScenePose {
  const playing = smoothstep(transportWeight(transport, wallTime));
  const scratch: FrameScratch = {
    idle: createIdleState(),
    bow: createBowState(),
    wind: createWindState(),
    hands: { left: createHandState(), right: createHandState() },
    choir: createChoirState(),
  };
  for (const [i, player] of plan.players.entries()) {
    const pose = out.players[i];
    if (!pose) {
      continue;
    }
    const seat = audibility[player.seatIndex];
    const weight = playing * (seat ? smoothstep(seatWeight(seat, wallTime)) : 1);
    idleAt(player.idle, wallTime, scratch.idle);
    poseAnimal(plan, player, songTime - player.timeOffset, weight, scratch, pose);
  }
  idleAt(plan.conductor.idle, wallTime, scratch.idle);
  poseAnimal(plan, plan.conductor, songTime, playing, scratch, out.conductor);
  return out;
}
